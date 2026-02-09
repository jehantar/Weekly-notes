import {
  discoverOAuthProtectedResourceMetadata,
  discoverAuthorizationServerMetadata,
  registerClient,
  startAuthorization,
  exchangeAuthorization,
  refreshAuthorization,
} from "@modelcontextprotocol/sdk/client/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const MCP_SERVER_URL = new URL("https://mcp.granola.ai/mcp");

const CLIENT_METADATA = {
  redirect_uris: [] as string[], // filled at call time
  client_name: "Weekly Notes",
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "client_secret_post",
};

/**
 * Discover the authorization server URL for the Granola MCP resource.
 */
async function discoverAuthServer() {
  const resourceMeta =
    await discoverOAuthProtectedResourceMetadata(MCP_SERVER_URL);
  const authServerUrl = resourceMeta.authorization_servers?.[0];
  if (!authServerUrl) {
    throw new Error("Granola MCP did not advertise an authorization server");
  }
  const authServerUrlObj = new URL(authServerUrl);
  const metadata = await discoverAuthorizationServerMetadata(authServerUrlObj);
  if (!metadata) {
    throw new Error("Could not discover authorization server metadata");
  }
  return { authServerUrl: authServerUrlObj, metadata };
}

/**
 * Initiate the Granola OAuth flow. Returns the URL to redirect the user to.
 * Stores PKCE code_verifier and client registration in the DB.
 */
export async function initiateGranolaAuth(
  redirectUri: string,
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string> {
  const { authServerUrl, metadata } = await discoverAuthServer();

  // Always register a fresh client to ensure redirect_uri matches
  const registered = await registerClient(authServerUrl, {
    metadata,
    clientMetadata: {
      ...CLIENT_METADATA,
      redirect_uris: [redirectUri],
    },
  });
  // Save client registration
  await supabase.from("granola_tokens").upsert(
    {
      user_id: userId,
      client_id: registered.client_id,
      client_secret: registered.client_secret ?? null,
      access_token: "", // placeholder until we get real tokens
    },
    { onConflict: "user_id" }
  );
  const clientInfo = {
    client_id: registered.client_id,
    client_secret: registered.client_secret,
  };

  const { authorizationUrl, codeVerifier } = await startAuthorization(
    authServerUrl,
    {
      metadata,
      clientInformation: clientInfo,
      redirectUrl: new URL(redirectUri),
      resource: MCP_SERVER_URL,
    }
  );

  // Save code_verifier for the callback
  await supabase
    .from("granola_tokens")
    .update({ code_verifier: codeVerifier, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return authorizationUrl.toString();
}

/**
 * Complete the OAuth flow after the user is redirected back with a code.
 */
export async function completeGranolaAuth(
  code: string,
  redirectUri: string,
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { authServerUrl, metadata } = await discoverAuthServer();

  // Load client info and code_verifier from DB
  const { data: row } = await supabase
    .from("granola_tokens")
    .select("client_id, client_secret, code_verifier")
    .eq("user_id", userId)
    .single();

  if (!row?.client_id || !row.code_verifier) {
    throw new Error("Missing client registration or code verifier");
  }

  const tokens = await exchangeAuthorization(authServerUrl, {
    metadata,
    clientInformation: {
      client_id: row.client_id,
      client_secret: row.client_secret ?? undefined,
    },
    authorizationCode: code,
    codeVerifier: row.code_verifier,
    redirectUri: new URL(redirectUri),
    resource: MCP_SERVER_URL,
  });

  // Store tokens, clear code_verifier
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  await supabase
    .from("granola_tokens")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_type: tokens.token_type,
      expires_at: expiresAt,
      scope: tokens.scope ?? null,
      code_verifier: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

/**
 * Get a valid access token for the current user, refreshing if needed.
 * Returns null if the user hasn't connected Granola.
 */
export async function getGranolaAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data: row } = await supabase
    .from("granola_tokens")
    .select("access_token, refresh_token, token_type, expires_at, client_id, client_secret")
    .eq("user_id", userId)
    .single();

  if (!row || !row.access_token) return null;

  // Check if token is expired (with 60s buffer)
  if (row.expires_at) {
    const expiresAt = new Date(row.expires_at).getTime();
    const isExpired = Date.now() > expiresAt - 60_000;

    if (isExpired && row.refresh_token && row.client_id) {
      try {
        const { authServerUrl, metadata } = await discoverAuthServer();
        const tokens = await refreshAuthorization(authServerUrl, {
          metadata,
          clientInformation: {
            client_id: row.client_id,
            client_secret: row.client_secret ?? undefined,
          },
          refreshToken: row.refresh_token,
          resource: MCP_SERVER_URL,
        });

        const newExpiresAt = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null;

        await supabase
          .from("granola_tokens")
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? row.refresh_token,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        return tokens.access_token;
      } catch {
        // Refresh failed — token is stale
        return null;
      }
    }

    if (isExpired) return null;
  }

  return row.access_token;
}

/**
 * Check if the user has a Granola connection (tokens stored).
 */
export async function hasGranolaConnection(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("granola_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .single();

  return !!data?.access_token;
}

// --- Internal helpers ---

async function loadClientInfo(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data } = await supabase
    .from("granola_tokens")
    .select("client_id, client_secret")
    .eq("user_id", userId)
    .single();

  if (!data?.client_id) return null;
  return {
    client_id: data.client_id,
    client_secret: data.client_secret ?? undefined,
  };
}

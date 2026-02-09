declare module "@modelcontextprotocol/sdk/client/streamableHttp" {
  import type { Transport } from "@modelcontextprotocol/sdk/client";
  export class StreamableHTTPClientTransport implements Transport {
    constructor(
      url: URL,
      opts?: {
        requestInit?: RequestInit;
        authProvider?: unknown;
        reconnectionOptions?: unknown;
        sessionId?: string;
      }
    );
    start(): Promise<void>;
    close(): Promise<void>;
    send(message: unknown): Promise<void>;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: unknown) => void;
    sessionId?: string;
  }
}

declare module "@modelcontextprotocol/sdk/client/sse" {
  import type { Transport } from "@modelcontextprotocol/sdk/client";
  export class SSEClientTransport implements Transport {
    constructor(
      url: URL,
      opts?: {
        requestInit?: RequestInit;
        eventSourceInit?: {
          fetch?: typeof fetch;
        };
        authProvider?: unknown;
        reconnectionOptions?: unknown;
      }
    );
    start(): Promise<void>;
    close(): Promise<void>;
    send(message: unknown): Promise<void>;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: unknown) => void;
  }
}

declare module "@modelcontextprotocol/sdk/client/auth" {
  import type {
    OAuthClientMetadata,
    OAuthTokens,
    OAuthClientInformationFull,
    OAuthClientInformationMixed,
    OAuthProtectedResourceMetadata,
    AuthorizationServerMetadata,
  } from "@modelcontextprotocol/sdk/shared/auth";

  export function discoverOAuthProtectedResourceMetadata(
    serverUrl: URL,
    opts?: unknown,
    fetchFn?: typeof fetch
  ): Promise<OAuthProtectedResourceMetadata>;

  export function discoverAuthorizationServerMetadata(
    authorizationServerUrl: URL,
    options?: { fetchFn?: typeof fetch; protocolVersion?: string }
  ): Promise<AuthorizationServerMetadata | undefined>;

  export function registerClient(
    authorizationServerUrl: URL,
    options: {
      metadata?: AuthorizationServerMetadata;
      clientMetadata: OAuthClientMetadata;
      fetchFn?: typeof fetch;
    }
  ): Promise<OAuthClientInformationFull>;

  export function startAuthorization(
    authorizationServerUrl: URL,
    options: {
      metadata?: AuthorizationServerMetadata;
      clientInformation: OAuthClientInformationMixed;
      redirectUrl: URL;
      scope?: string;
      state?: string;
      resource?: URL;
    }
  ): Promise<{ authorizationUrl: URL; codeVerifier: string }>;

  export function exchangeAuthorization(
    authorizationServerUrl: URL,
    options: {
      metadata?: AuthorizationServerMetadata;
      clientInformation: OAuthClientInformationMixed;
      authorizationCode: string;
      codeVerifier: string;
      redirectUri: URL;
      resource?: URL;
      addClientAuthentication?: unknown;
      fetchFn?: typeof fetch;
    }
  ): Promise<OAuthTokens>;

  export function refreshAuthorization(
    authorizationServerUrl: URL,
    options: {
      metadata?: AuthorizationServerMetadata;
      clientInformation: OAuthClientInformationMixed;
      refreshToken: string;
      resource?: URL;
      addClientAuthentication?: unknown;
      fetchFn?: typeof fetch;
    }
  ): Promise<OAuthTokens>;
}

declare module "@modelcontextprotocol/sdk/shared/auth" {
  export type OAuthClientMetadata = {
    redirect_uris: string[];
    client_name?: string;
    client_uri?: string;
    logo_uri?: string;
    scope?: string;
    grant_types?: string[];
    response_types?: string[];
    token_endpoint_auth_method?: string;
    [key: string]: unknown;
  };

  export type OAuthTokens = {
    access_token: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
    refresh_token?: string;
    id_token?: string;
  };

  export type OAuthClientInformation = {
    client_id: string;
    client_secret?: string;
    client_id_issued_at?: number;
    client_secret_expires_at?: number;
  };

  export type OAuthClientInformationFull = OAuthClientInformation &
    OAuthClientMetadata;

  export type OAuthClientInformationMixed =
    | OAuthClientInformation
    | OAuthClientInformationFull;

  export type OAuthProtectedResourceMetadata = {
    resource: string;
    authorization_servers?: string[];
    bearer_methods_supported?: string[];
    resource_signing_alg_values_supported?: string[];
    [key: string]: unknown;
  };

  export type AuthorizationServerMetadata = {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    registration_endpoint?: string;
    scopes_supported?: string[];
    response_types_supported?: string[];
    grant_types_supported?: string[];
    [key: string]: unknown;
  };
}

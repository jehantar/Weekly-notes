import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UPLOAD_ALLOWED_TYPES, SCREENSHOT_UPLOAD_MAX_SIZE } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const weekId = formData.get("weekId") as string | null;
  const caption = formData.get("caption") as string | null;

  if (!file || !weekId) {
    return NextResponse.json({ error: "Missing file or weekId" }, { status: 400 });
  }

  const { data: week } = await supabase
    .from("weeks")
    .select("id")
    .eq("id", weekId)
    .eq("user_id", user.id)
    .single();

  if (!week) {
    return NextResponse.json({ error: "Week not found" }, { status: 404 });
  }

  if (!UPLOAD_ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > SCREENSHOT_UPLOAD_MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/screenshots/${weekId}/${timestamp}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("task-images")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("task-images")
    .getPublicUrl(storagePath);

  const { data: screenshot, error: insertError } = await supabase
    .from("screenshots")
    .insert({
      week_id: weekId,
      user_id: user.id,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      caption: caption || null,
    })
    .select()
    .single();

  if (insertError || !screenshot) {
    // Clean up uploaded file if DB insert fails
    await supabase.storage.from("task-images").remove([storagePath]);
    return NextResponse.json({ error: "Failed to save screenshot" }, { status: 500 });
  }

  return NextResponse.json(screenshot);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, caption } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("screenshots")
    .update({ caption })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update caption" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { data: screenshot } = await supabase
    .from("screenshots")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!screenshot) {
    return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
  }

  // Delete DB row first — orphaned blobs are harmless, broken URLs are not
  const { error } = await supabase
    .from("screenshots")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete screenshot" }, { status: 500 });
  }

  // Best-effort storage cleanup
  await supabase.storage.from("task-images").remove([screenshot.storage_path]);

  return NextResponse.json({ ok: true });
}

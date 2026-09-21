import { supabase } from "./supabaseClient";

export async function uploadBusinessImage(file, folder = "misc") {
  if (!file) return { error: "No file selected" };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Please sign in again to upload." };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userData.user.id}/${folder}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("menu-photos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return {
      error: uploadError.message.includes("Bucket not found")
        ? "Photo storage missing. Re-run supabase/schema.sql."
        : uploadError.message,
    };
  }

  const { data } = supabase.storage.from("menu-photos").getPublicUrl(path);
  return { url: data.publicUrl };
}

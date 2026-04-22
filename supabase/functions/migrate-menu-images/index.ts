import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One-time migration function: converts all base64 images in menu_items
 * to files in the menu-images storage bucket and updates the image column
 * with the public URL.
 *
 * Should only be callable by admins.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all items with base64 images (id + image only — small payload)
    const { data: items, error: fetchErr } = await admin
      .from("menu_items")
      .select("id, name, image")
      .like("image", "data:%");

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; name: string; status: string; url?: string; error?: string }> = [];

    for (const item of items ?? []) {
      try {
        const dataUrl = item.image as string;
        const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (!match) {
          results.push({ id: item.id, name: item.name, status: "skipped_invalid_format" });
          continue;
        }
        const mime = match[1];
        const base64 = match[2];
        const ext = mime.split("/")[1].replace("jpeg", "jpg");

        // Decode base64 to bytes
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const path = `${item.id}.${ext}`;

        const { error: uploadErr } = await admin.storage
          .from("menu-images")
          .upload(path, bytes, {
            contentType: mime,
            upsert: true,
          });

        if (uploadErr) {
          results.push({ id: item.id, name: item.name, status: "upload_failed", error: uploadErr.message });
          continue;
        }

        const { data: urlData } = admin.storage.from("menu-images").getPublicUrl(path);
        const publicUrl = urlData.publicUrl;

        const { error: updateErr } = await admin
          .from("menu_items")
          .update({ image: publicUrl })
          .eq("id", item.id);

        if (updateErr) {
          results.push({ id: item.id, name: item.name, status: "db_update_failed", error: updateErr.message });
          continue;
        }

        results.push({ id: item.id, name: item.name, status: "migrated", url: publicUrl });
      } catch (e) {
        results.push({
          id: item.id,
          name: item.name,
          status: "exception",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const summary = {
      total: results.length,
      migrated: results.filter((r) => r.status === "migrated").length,
      failed: results.filter((r) => r.status !== "migrated").length,
      results,
    };

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
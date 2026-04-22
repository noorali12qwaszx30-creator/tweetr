import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
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

    // List all files in bucket (recursive via folders)
    const allPaths: string[] = [];
    async function listFolder(prefix: string) {
      let offset = 0;
      while (true) {
        const { data, error } = await admin.storage
          .from("menu-images")
          .list(prefix, { limit: 1000, offset });
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const item of data) {
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id === null) {
            // folder
            await listFolder(fullPath);
          } else {
            allPaths.push(fullPath);
          }
        }
        if (data.length < 1000) break;
        offset += 1000;
      }
    }
    await listFolder("");

    let deletedCount = 0;
    if (allPaths.length > 0) {
      // Delete in chunks
      for (let i = 0; i < allPaths.length; i += 100) {
        const chunk = allPaths.slice(i, i + 100);
        const { data: del, error: delErr } = await admin.storage
          .from("menu-images")
          .remove(chunk);
        if (delErr) throw delErr;
        deletedCount += del?.length ?? 0;
      }
    }

    // Also clear image column in menu_items
    const { error: updErr } = await admin
      .from("menu_items")
      .update({ image: null })
      .not("image", "is", null);
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ success: true, deletedFiles: deletedCount, totalFound: allPaths.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("clear-menu-images error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (roleData?.role !== "admin") return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "missing user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Strategy: rotate password to a random temporary value to invalidate refresh tokens,
    // then immediately set it back is not possible without knowing original. Instead,
    // we update user's app_metadata with a "session_revoked_at" timestamp; clients check this
    // on each request and force logout if their token was issued before this timestamp.
    const revokedAt = new Date().toISOString();
    const { error: updErr } = await admin.auth.admin.updateUserById(user_id, {
      app_metadata: { session_revoked_at: revokedAt },
    });
    if (updErr) throw updErr;

    // Also delete all sessions via the GoTrue REST endpoint
    // Try multiple known endpoints for compatibility
    const headers = {
      "Authorization": `Bearer ${serviceKey}`,
      "apikey": serviceKey,
      "Content-Type": "application/json",
    };

    const attempts: Array<{ url: string; method: string; status?: number }> = [];
    for (const [path, method] of [
      [`/auth/v1/admin/users/${user_id}/sessions`, "DELETE"],
      [`/auth/v1/admin/users/${user_id}/logout`, "POST"],
    ] as const) {
      try {
        const r = await fetch(`${supabaseUrl}${path}`, { method, headers });
        attempts.push({ url: path, method, status: r.status });
      } catch (e) {
        attempts.push({ url: path, method, status: -1 });
      }
    }

    return new Response(JSON.stringify({ success: true, revoked_at: revokedAt, attempts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profiles } = await admin.from("profiles").select("user_id");
  const revokedAt = new Date().toISOString();
  let ok = 0, fail = 0;
  for (const p of (profiles ?? [])) {
    const { error } = await admin.auth.admin.updateUserById(p.user_id, { app_metadata: { session_revoked_at: revokedAt } });
    if (error) fail++; else ok++;
  }
  return new Response(JSON.stringify({ ok, fail, revokedAt, total: (profiles ?? []).length }), { headers: { ...cors, "Content-Type": "application/json" } });
});

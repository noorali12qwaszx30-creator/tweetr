// Dispatches any pending scheduled_notifications whose scheduled_at <= now().
// Triggered by a pg_cron job every minute, or invoked manually by admins.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: pending, error } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (error) throw error;

    const results: any[] = [];
    for (const n of pending ?? []) {
      try {
        const { data: sendRes, error: sendErr } = await supabase.functions.invoke(
          "send-push-notification",
          {
            body: {
              target_roles: n.target_roles,
              title: n.title,
              body: n.body ?? "",
              data: { source: "scheduled", notification_id: String(n.id) },
            },
          },
        );
        if (sendErr) throw sendErr;

        const sent = (sendRes as any)?.sent ?? 0;
        await supabase
          .from("scheduled_notifications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_count: sent,
            error_message: null,
          })
          .eq("id", n.id);

        results.push({ id: n.id, ok: true, sent });
      } catch (e: any) {
        await supabase
          .from("scheduled_notifications")
          .update({
            status: "failed",
            error_message: e?.message ?? "Unknown error",
          })
          .eq("id", n.id);
        results.push({ id: n.id, ok: false, error: e?.message });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
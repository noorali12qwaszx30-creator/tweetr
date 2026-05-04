// Scans for orders stuck in the kitchen ("pending" or "preparing") for more
// than 30 minutes and pushes a one-time notification to admin devices.
// Designed to be called every minute by pg_cron.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DELAY_THRESHOLD_MINUTES = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const cutoff = new Date(Date.now() - DELAY_THRESHOLD_MINUTES * 60 * 1000).toISOString();

    // Find orders still in the kitchen older than the threshold
    const { data: delayed, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, status, created_at")
      .in("status", ["pending", "preparing"])
      .eq("is_archived", false)
      .lt("created_at", cutoff);

    if (ordersError) throw ordersError;
    if (!delayed || delayed.length === 0) {
      return new Response(JSON.stringify({ checked: 0, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out orders already alerted
    const ids = delayed.map((o) => o.id);
    const { data: existingAlerts } = await supabase
      .from("delayed_order_alerts")
      .select("order_id")
      .in("order_id", ids);

    const alreadyAlerted = new Set((existingAlerts ?? []).map((a) => a.order_id));
    const toAlert = delayed.filter((o) => !alreadyAlerted.has(o.id));

    if (toAlert.length === 0) {
      return new Response(JSON.stringify({ checked: delayed.length, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send a push for each delayed order, then record it
    let notified = 0;
    for (const order of toAlert) {
      const ageMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
      const statusLabel = order.status === "pending" ? "قيد الانتظار" : "قيد التجهيز";

      const pushRes = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          target_roles: ["admin"],
          title: `⚠️ تأخير طلب #${order.order_number}`,
          body: `${statusLabel} منذ ${ageMinutes} دقيقة - ${order.customer_name ?? ""}`,
          data: {
            order_id: order.id,
            order_number: String(order.order_number),
            type: "delayed_order",
          },
        }),
      });

      if (pushRes.ok) {
        await supabase.from("delayed_order_alerts").insert({
          order_id: order.id,
          order_number: order.order_number,
        });
        notified++;
      } else {
        console.error("Push failed for order", order.id, await pushRes.text());
      }
    }

    return new Response(
      JSON.stringify({ checked: delayed.length, notified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("check-delayed-orders error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
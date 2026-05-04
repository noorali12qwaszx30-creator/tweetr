// Sends push notifications for new chat messages and incoming calls.
// Body for messages: { conversation_id, sender_id, sender_name, content }
// Body for calls:    { type: 'call', call_id, callee_id, caller_name }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUSH_URL = `${SUPABASE_URL}/functions/v1/send-push-notification`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // INCOMING CALL
    if (body.type === "call") {
      const { callee_id, caller_name, call_id } = body;
      await fetch(PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_ids: [String(callee_id)],
          target_roles: [],
          title: "📞 مكالمة واردة",
          body: `${caller_name} يتصل بك`,
          data: { type: "incoming_call", call_id: String(call_id) },
        }),
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NEW MESSAGE
    const { conversation_id, sender_id, sender_name, content } = body;
    if (!conversation_id || !sender_id) {
      return new Response(JSON.stringify({ error: "missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get conversation
    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("id", conversation_id)
      .maybeSingle();
    if (!conv) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    // Resolve target user ids
    let targetUserIds: string[] = [];
    let targetRoles: string[] = [];

    if (conv.type === "role_group") {
      if (conv.role_filter === "all") {
        targetRoles = ["admin", "cashier", "kitchen", "delivery", "field", "takeaway"];
      } else if (conv.role_filter === "kitchen_cashier") {
        targetRoles = ["kitchen", "cashier"];
      } else if (conv.role_filter) {
        targetRoles = [conv.role_filter];
      }
    } else {
      const { data: parts } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("conversation_id", conversation_id)
        .neq("user_id", sender_id);
      targetUserIds = (parts ?? []).map((p) => p.user_id);
    }

    const title = conv.type === "private" ? `💬 ${sender_name}` : `💬 ${sender_name} في ${conv.name ?? "المجموعة"}`;
    const preview = String(content ?? "").slice(0, 120);

    await fetch(PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_user_ids: targetUserIds,
        target_roles: targetRoles,
        title,
        body: preview,
        data: { type: "chat_message", conversation_id: String(conversation_id) },
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
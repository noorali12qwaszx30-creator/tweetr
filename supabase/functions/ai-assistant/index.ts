import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch restaurant context data
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [ordersRes, menuRes, statsRes, areasRes, profilesRes, rolesRes] = await Promise.all([
      serviceClient.from("orders").select("id, order_number, customer_name, customer_phone, customer_address, status, type, total_price, delivery_fee, cashier_name, delivery_person_name, cancellation_reason, has_issue, issue_reason, notes, created_at, delivered_at, cancelled_at").order("created_at", { ascending: false }).limit(200),
      serviceClient.from("menu_items").select("name, price, category, is_available").order("display_order"),
      serviceClient.from("menu_item_statistics").select("menu_item_name, category, total_quantity_sold, total_revenue, delivery_quantity, takeaway_quantity"),
      serviceClient.from("delivery_areas").select("name, delivery_fee, order_count, is_active"),
      serviceClient.from("profiles").select("username, full_name, is_active, user_id"),
      serviceClient.from("user_roles").select("user_id, role"),
    ]);

    // Build context summary
    const orders = ordersRes.data || [];
    const completedOrders = orders.filter(o => o.status === "delivered");
    const cancelledOrders = orders.filter(o => o.status === "cancelled");
    const pendingOrders = orders.filter(o => o.status === "pending");
    const preparingOrders = orders.filter(o => o.status === "preparing");
    const deliveringOrders = orders.filter(o => o.status === "delivering");
    const totalRevenue = completedOrders.reduce((s, o) => s + (Number(o.total_price) - Number(o.delivery_fee || 0)), 0);

    // Staff mapping
    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const staff = profiles.map(p => {
      const r = roles.find(r => r.user_id === p.user_id);
      return { name: p.full_name || p.username, role: r?.role || "unknown", active: p.is_active };
    });

    const contextData = `
=== بيانات المطعم الحالية ===
التاريخ: ${new Date().toISOString().split("T")[0]}

📊 ملخص الطلبات (آخر 200 طلب):
- إجمالي: ${orders.length}
- مكتملة: ${completedOrders.length}
- ملغية: ${cancelledOrders.length}
- معلقة: ${pendingOrders.length}
- قيد التحضير: ${preparingOrders.length}
- قيد التوصيل: ${deliveringOrders.length}
- إجمالي الإيرادات (بدون أجور التوصيل): ${totalRevenue.toLocaleString()} د.ع
- متوسط قيمة الطلب: ${completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length).toLocaleString() : 0} د.ع

🍽️ القائمة:
${(menuRes.data || []).map(m => `- ${m.name} (${m.category}) - ${m.price} د.ع - ${m.is_available ? "متوفر" : "غير متوفر"}`).join("\n")}

📈 إحصائيات المبيعات التراكمية:
${(statsRes.data || []).map(s => `- ${s.menu_item_name}: ${s.total_quantity_sold} قطعة، ${Number(s.total_revenue).toLocaleString()} د.ع (توصيل: ${s.delivery_quantity}, سفري: ${s.takeaway_quantity})`).join("\n")}

📍 مناطق التوصيل:
${(areasRes.data || []).map(a => `- ${a.name}: رسوم ${a.delivery_fee} د.ع، طلبات: ${a.order_count} ${a.is_active ? "" : "(معطلة)"}`).join("\n")}

👥 الموظفون:
${staff.map(s => `- ${s.name} (${s.role}) ${s.active ? "" : "- معطل"}`).join("\n")}

❌ أسباب الإلغاء:
${cancelledOrders.reduce((acc, o) => { const r = o.cancellation_reason || "بدون سبب"; acc[r] = (acc[r] || 0) + 1; return acc; }, {} as Record<string, number>).__entries ? "" : Object.entries(cancelledOrders.reduce((acc: Record<string, number>, o) => { const r = o.cancellation_reason || "بدون سبب"; acc[r] = (acc[r] || 0) + 1; return acc; }, {})).map(([r, c]) => `- ${r}: ${c}`).join("\n")}

⚠️ طلبات بها مشاكل:
${orders.filter(o => o.has_issue).map(o => `- طلب #${o.order_number}: ${o.issue_reason || "بدون تفاصيل"}`).join("\n") || "لا توجد"}
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `أنت "جمناي" مساعد ذكاء اصطناعي متقدم لإدارة مطعم. تتحدث بالعربية بشكل احترافي ومختصر.

لديك صلاحيات كاملة للاطلاع على جميع بيانات المطعم وتحليلها.

مهامك:
1. تحليل أداء المطعم (الطلبات، الإيرادات، أوقات التوصيل)
2. تقييم أداء الموظفين (الكاشير، السائقين، المطبخ)
3. تحليل القائمة (أفضل الأصناف، الأقل مبيعاً، توصيات)
4. تحليل المناطق (أكثر المناطق طلباً، توزيع الطلبات)
5. تحليل العملاء (عملاء متكررين، سلوك الشراء)
6. تقديم توصيات لتحسين الأداء والأرباح
7. الإجابة على أي سؤال يتعلق بإدارة المطعم

قواعد:
- أجب بالعربية دائماً
- استخدم الأرقام الإنجليزية
- كن مختصراً ودقيقاً
- استخدم الإيموجي للتوضيح
- قدم أرقام وإحصائيات محددة عند الإمكان
- إذا طُلب منك توصية، قدمها بشكل عملي وقابل للتنفيذ

${contextData}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

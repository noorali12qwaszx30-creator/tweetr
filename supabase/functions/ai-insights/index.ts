import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, message, ordersData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt based on request type
    let systemPrompt = `أنت مساعد ذكي متخصص في تحليل بيانات المطاعم وإدارة الطلبات. تتحدث بالعربية بطلاقة.
    
معلومات عن النظام:
- نظام إدارة طلبات مطعم
- أنواع الطلبات: توصيل (delivery) واستلام (takeaway)
- حالات الطلب: pending (قيد الانتظار), preparing (قيد التحضير), ready (جاهز), delivering (قيد التوصيل), delivered (تم التوصيل), cancelled (ملغي)

مهامك:
1. تحليل البيانات وتقديم رؤى مفيدة
2. اكتشاف الأنماط والمشاكل
3. تقديم اقتراحات لتحسين الأداء
4. التنبؤ بالمشاكل قبل حدوثها
5. الإجابة على أسئلة المستخدم حول البيانات

قواعد الرد:
- كن موجزاً ومفيداً
- استخدم الأرقام والإحصائيات عند الإمكان
- قدم اقتراحات عملية قابلة للتنفيذ
- استخدم الإيموجي للتوضيح
- نبه على المشاكل الحرجة بوضوح`;

    let userPrompt = "";

    switch (type) {
      case "daily_report":
        userPrompt = `بيانات الطلبات اليوم:
${JSON.stringify(ordersData, null, 2)}

قدم تقريراً يومياً شاملاً يتضمن:
1. ملخص الأداء (عدد الطلبات، نسبة الإكمال، الإيرادات)
2. أفضل الأصناف مبيعاً
3. أداء التوصيل (متوسط الوقت، التأخيرات)
4. المشاكل الملحوظة
5. اقتراحات للتحسين`;
        break;

      case "predict_issues":
        userPrompt = `بيانات الطلبات الحالية والسابقة:
${JSON.stringify(ordersData, null, 2)}

حلل البيانات وتنبأ بالمشاكل المحتملة:
1. هل هناك ضغط متوقع على المطبخ؟
2. هل التوصيل سيتأخر؟
3. أي أنماط مقلقة في الإلغاءات؟
4. توقعات الساعات القادمة
5. تنبيهات عاجلة إن وجدت`;
        break;

      case "analyze_cancellations":
        userPrompt = `بيانات الطلبات الملغية:
${JSON.stringify(ordersData, null, 2)}

حلل أسباب الإلغاء:
1. الأسباب الأكثر شيوعاً
2. أنماط الإلغاء (وقت، نوع، منطقة)
3. تأثير الإلغاءات على الإيرادات
4. اقتراحات لتقليل الإلغاءات`;
        break;

      case "smart_alerts":
        userPrompt = `البيانات الحالية:
${JSON.stringify(ordersData, null, 2)}

افحص البيانات وأعطني تنبيهات ذكية:
- 🔴 تنبيهات عاجلة (تحتاج تدخل فوري)
- 🟡 تحذيرات (قد تصبح مشكلة)
- 🟢 إيجابيات (أداء جيد)

كن محدداً وعملياً.`;
        break;

      case "chat":
      default:
        userPrompt = `بيانات الطلبات:
${JSON.stringify(ordersData, null, 2)}

سؤال المستخدم: ${message}

أجب على السؤال بناءً على البيانات المتوفرة.`;
        break;
    }

    console.log(`AI Insights request type: ${type}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار في استخدام الذكاء الاصطناعي" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "عذراً، لم أتمكن من معالجة طلبك";

    return new Response(
      JSON.stringify({ response: aiResponse, type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

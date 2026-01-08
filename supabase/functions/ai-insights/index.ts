import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, message, ordersData, additionalContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build comprehensive system prompt for Executive AI Assistant
    const systemPrompt = `أنت "المساعد الذكي للمدير التنفيذي" - العقل المركزي لنظام إدارة المطعم.

## دورك الوظيفي:
- مراقبة النظام بشكل مستمر وصامت
- تحليل الأنماط والسلوكيات التشغيلية
- اكتشاف الأخطاء والتأخيرات قبل تفاقمها
- دعم المدير التنفيذي بقرارات واضحة وسريعة

## صلاحياتك:
- قراءة كاملة على: قاعدة البيانات، الطلبات، سجلات المستخدمين، الأحداث، بيانات الأداء
- لا تنفيذ مباشر - فقط تحليل واقتراحات

## معلومات النظام:
- أنواع الطلبات: توصيل (delivery)، استلام (takeaway)
- حالات الطلب: pending (انتظار), preparing (تحضير), ready (جاهز), delivering (توصيل), delivered (تم), cancelled (ملغي)
- الأقسام: كاشير، مطبخ، ميدان، دلفري، سفري

## قواعد الرد الصارمة:
1. كن موجزاً جداً - لا نصوص طويلة
2. ركز على القرار وليس التفاصيل التقنية
3. لا تعرض أرقام خام فقط - قدم:
   - ماذا حدث؟
   - لماذا حدث غالباً؟
   - ماذا يُنصح به الآن؟
4. استخدم الإيموجي للتوضيح السريع
5. صنف التنبيهات: 🔴 حرج | 🟡 متوسط | 🟢 معلوماتي
6. كل اقتراح يجب أن يكون عملي وقابل للتنفيذ فوراً
7. تحدث بالعربية فقط بلغة بسيطة واحترافية`;

    let userPrompt = "";

    switch (type) {
      case "daily_report":
        userPrompt = `## بيانات اليوم:
${JSON.stringify(ordersData, null, 2)}

## المطلوب: تقرير يومي تنفيذي مختصر

قدم تقريراً بهذا الهيكل:
1. **ملخص الأداء** (جملة واحدة عن الحالة العامة)
2. **أرقام اليوم** (طلبات، إكمال، إلغاء، إيرادات)
3. **أبرز 3 نجاحات** 
4. **أخطر 3 مشاكل**
5. **توصية واحدة للغد**

اجعله قصيراً ومباشراً.`;
        break;

      case "health_score":
        userPrompt = `## بيانات الطلبات:
${JSON.stringify(ordersData, null, 2)}

## المطلوب: حساب مؤشر صحة المطعم

احسب النتيجة من 0 إلى 100 بناءً على:
- سرعة المطبخ (وقت من pending إلى ready)
- كفاءة التوصيل (وقت من ready إلى delivered)
- نسبة عدم الإلغاء
- استقرار سير الطلبات

أجب بهذا الشكل بالضبط (JSON):
{
  "score": [رقم],
  "factors": {
    "kitchenSpeed": [رقم],
    "deliveryEfficiency": [رقم],
    "cancellationRate": [رقم],
    "orderFlow": [رقم]
  },
  "explanation": "[جملة واحدة تفسر النتيجة]"
}`;
        break;

      case "smart_alerts":
        userPrompt = `## بيانات الطلبات الحالية:
${JSON.stringify(ordersData, null, 2)}

## المطلوب: تنبيهات ذكية مصنفة

افحص البيانات وأنشئ تنبيهات بهذا الشكل (JSON array):
[
  {
    "level": "critical|warning|info",
    "title": "[عنوان قصير]",
    "description": "[وصف مختصر]",
    "cause": "[السبب المحتمل]",
    "suggestion": "[إجراء مقترح]"
  }
]

قواعد:
- 🔴 critical: تحتاج تدخل فوري (تأخير شديد، إلغاءات متتالية، ضغط حرج)
- 🟡 warning: قد تصبح مشكلة (تأخير بسيط، نمط مقلق)
- 🟢 info: إيجابيات أو معلومات مفيدة

أعطني 3-5 تنبيهات كحد أقصى، الأهم أولاً.`;
        break;

      case "shift_summary":
        userPrompt = `## بيانات الشفت:
${JSON.stringify(ordersData, null, 2)}

## المطلوب: ملخص نهاية الشفت

قدم الملخص بهذا الشكل (JSON):
{
  "shiftName": "[صباحي/مسائي/ليلي]",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
  "problems": ["مشكلة 1", "مشكلة 2", "مشكلة 3"],
  "recommendation": "[توصية واحدة واضحة للشفت القادم]",
  "stats": {
    "totalOrders": [رقم],
    "completedOrders": [رقم],
    "cancelledOrders": [رقم],
    "avgDeliveryTime": [رقم بالدقائق]
  }
}`;
        break;

      case "analyze_cancellations":
        userPrompt = `## بيانات الطلبات الملغية:
${JSON.stringify(ordersData.filter((o: any) => o.status === 'cancelled'), null, 2)}

## المطلوب: تحليل الإلغاءات

قدم تحليلاً مختصراً:
1. **عدد الإلغاءات ونسبتها**
2. **أكثر 3 أسباب شيوعاً**
3. **نمط الإلغاء** (وقت، نوع، منطقة)
4. **التأثير المالي المقدر**
5. **3 إجراءات لتقليل الإلغاءات**

كن مختصراً ومباشراً.`;
        break;

      case "predict_issues":
        userPrompt = `## البيانات الحالية:
${JSON.stringify(ordersData, null, 2)}

## المطلوب: توقع المشاكل القادمة

بناءً على الأنماط الحالية، توقع:
1. **الساعة القادمة**: ماذا قد يحدث؟
2. **ضغط المطبخ**: هل سيزيد؟
3. **التوصيل**: هل سيتأخر؟
4. **تنبيهات وقائية**: ما الذي يجب فعله الآن؟

أجب بنقاط قصيرة ومحددة.`;
        break;

      case "order_timeline":
        const problematicOrder = additionalContext?.order;
        userPrompt = `## بيانات الطلب المشكل:
${JSON.stringify(problematicOrder, null, 2)}

## المطلوب: تحليل زمني للطلب

أنشئ تسلسل زمني للأحداث واستنتج السبب الجذري:
{
  "orderNumber": ${problematicOrder?.order_number || 0},
  "events": [
    {"time": "[وقت]", "event": "[حدث]", "status": "success|warning|error|neutral", "duration": [دقائق]}
  ],
  "rootCause": "[السبب الجذري للمشكلة]",
  "isProblematic": true
}`;
        break;

      case "chat":
      default:
        userPrompt = `## بيانات النظام:
${JSON.stringify(ordersData, null, 2)}

## سؤال المدير التنفيذي:
${message}

## المطلوب:
أجب بشكل مختصر، واضح، وقابل للتنفيذ.
- إذا سأل "لماذا" - حلل السبب الجذري
- إذا سأل "من" - حدد المسؤول بالبيانات
- إذا سأل "ماذا أفعل" - أعطه خطوات محددة
- إذا سأل عن أداء - أعطه أرقام ومقارنات

لا تطل في الشرح. جملتين إلى ثلاث جمل كافية.`;
        break;
    }

    console.log(`AI Executive Assistant request type: ${type}`);

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
    console.error("AI Executive Assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

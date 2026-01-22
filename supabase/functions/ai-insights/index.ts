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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { analysisType = "comprehensive" } = await req.json();

    // Fetch all data from database
    const today = new Date().toISOString().split("T")[0];
    
    // Get orders with items
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .order("created_at", { ascending: false });

    if (ordersError) throw ordersError;

    // Get menu items
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("*");

    // Get delivery areas
    const { data: deliveryAreas } = await supabase
      .from("delivery_areas")
      .select("*");

    // Get profiles for driver/cashier names
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    // Calculate comprehensive statistics
    const completedOrders = orders?.filter((o: any) => o.status === "delivered") || [];
    const cancelledOrders = orders?.filter((o: any) => o.status === "cancelled") || [];
    const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
    const takeawayOrders = orders?.filter((o: any) => o.type === "takeaway") || [];
    const deliveryOrders = orders?.filter((o: any) => o.type === "delivery") || [];

    // Revenue calculations (excluding delivery fees)
    const totalRevenue = completedOrders.reduce((sum: number, o: any) => 
      sum + (Number(o.total_price) - Number(o.delivery_fee || 0)), 0);
    const deliveryFeesTotal = completedOrders.reduce((sum: number, o: any) => 
      sum + Number(o.delivery_fee || 0), 0);
    const cancelledRevenue = cancelledOrders.reduce((sum: number, o: any) => 
      sum + (Number(o.total_price) - Number(o.delivery_fee || 0)), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Cashier stats
    const cashierStats: Record<string, any> = {};
    orders?.forEach((o: any) => {
      const name = o.cashier_name || "غير محدد";
      if (!cashierStats[name]) {
        cashierStats[name] = { name, orders: 0, edits: 0, cancellations: 0 };
      }
      cashierStats[name].orders++;
      if (o.is_edited) cashierStats[name].edits++;
      if (o.status === "cancelled") cashierStats[name].cancellations++;
    });

    // Delivery stats
    const deliveryStats: Record<string, any> = {};
    deliveryOrders.forEach((o: any) => {
      const name = o.delivery_person_name || "غير محدد";
      if (!deliveryStats[name]) {
        deliveryStats[name] = { name, deliveries: 0, returns: 0, totalTime: 0, deliveredCount: 0 };
      }
      if (o.status === "delivered") {
        deliveryStats[name].deliveries++;
        if (o.delivered_at && o.created_at) {
          const deliveryTime = (new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime()) / 60000;
          deliveryStats[name].totalTime += deliveryTime;
          deliveryStats[name].deliveredCount++;
        }
      }
      if (o.status === "cancelled") deliveryStats[name].returns++;
    });

    // Calculate average delivery time for each driver
    Object.values(deliveryStats).forEach((driver: any) => {
      driver.avgTime = driver.deliveredCount > 0 ? Math.round(driver.totalTime / driver.deliveredCount) : 0;
    });

    // Customer stats
    const customerMap: Record<string, any> = {};
    orders?.forEach((o: any) => {
      const phone = o.customer_phone;
      if (!customerMap[phone]) {
        customerMap[phone] = { 
          name: o.customer_name, 
          phone, 
          address: o.customer_address,
          orders: 0, 
          totalSpent: 0,
          firstOrder: o.created_at
        };
      }
      customerMap[phone].orders++;
      if (o.status === "delivered") {
        customerMap[phone].totalSpent += Number(o.total_price);
      }
    });

    const customers = Object.values(customerMap);
    const totalCustomers = customers.length;
    const newCustomers = customers.filter((c: any) => c.orders === 1).length;
    const returningCustomers = customers.filter((c: any) => c.orders > 1).length;
    const topCustomers = customers
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Item stats
    const itemStats: Record<string, any> = {};
    completedOrders.forEach((o: any) => {
      o.order_items?.forEach((item: any) => {
        const name = item.menu_item_name;
        if (!itemStats[name]) {
          itemStats[name] = { name, quantity: 0, revenue: 0 };
        }
        itemStats[name].quantity += item.quantity;
        itemStats[name].revenue += Number(item.menu_item_price) * item.quantity;
      });
    });

    const sortedItems = Object.values(itemStats).sort((a: any, b: any) => b.quantity - a.quantity);
    const topSellingItems = sortedItems.slice(0, 10);
    const leastSellingItems = sortedItems.slice(-5).reverse();

    // Area stats
    const areaStats: Record<string, any> = {};
    deliveryOrders.forEach((o: any) => {
      const areaId = o.delivery_area_id;
      const area = deliveryAreas?.find((a: any) => a.id === areaId);
      const areaName = area?.name || "منطقة غير محددة";
      
      if (!areaStats[areaName]) {
        areaStats[areaName] = { name: areaName, orders: 0, revenue: 0, fee: area?.delivery_fee || 0 };
      }
      areaStats[areaName].orders++;
      if (o.status === "delivered") {
        areaStats[areaName].revenue += Number(o.total_price);
      }
    });

    // Cancellation reasons
    const cancellationReasons: Record<string, number> = {};
    cancelledOrders.forEach((o: any) => {
      const reason = o.cancellation_reason || "بدون سبب";
      cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;
    });

    // Issue reasons
    const issueReasons: Record<string, number> = {};
    orders?.filter((o: any) => o.has_issue).forEach((o: any) => {
      const reason = o.issue_reason || "غير محدد";
      issueReasons[reason] = (issueReasons[reason] || 0) + 1;
    });

    // Hourly distribution
    const hourlyDistribution: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyDistribution[i] = 0;
    orders?.forEach((o: any) => {
      const hour = new Date(o.created_at).getHours();
      hourlyDistribution[hour]++;
    });

    const peakHour = Object.entries(hourlyDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    // Delivery time calculations
    const deliveryTimes = completedOrders
      .filter((o: any) => o.type === "delivery" && o.delivered_at && o.created_at)
      .map((o: any) => (new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime()) / 60000);
    
    const avgDeliveryTime = deliveryTimes.length > 0 
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length 
      : 0;

    // Delayed orders (more than 45 minutes)
    const delayedOrdersCount = deliveryTimes.filter(t => t > 45).length;
    const delayRate = deliveryTimes.length > 0 ? (delayedOrdersCount / deliveryTimes.length) * 100 : 0;

    // Menu summary
    const menuSummary = {
      totalItems: menuItems?.length || 0,
      categories: [...new Set(menuItems?.map((i: any) => i.category) || [])].length,
      unavailableItems: menuItems?.filter((i: any) => !i.is_available).length || 0
    };

    // Congestion status
    const activeOrders = orders?.filter((o: any) => 
      ["pending", "preparing", "ready", "delivering"].includes(o.status)
    ).length || 0;
    
    const congestionStatus = {
      kitchen: activeOrders > 20 ? "high" : activeOrders > 10 ? "medium" : "low",
      delivery: deliveryOrders.filter((o: any) => o.status === "delivering").length > 5 ? "high" : "low",
      waiting: pendingOrders.length > 5 ? "high" : "low"
    };

    // Create snapshot data
    const snapshotData = {
      snapshot_date: today,
      analysis_period: "all_time",
      total_orders: orders?.length || 0,
      completed_orders: completedOrders.length,
      cancelled_orders: cancelledOrders.length,
      pending_orders: pendingOrders.length,
      takeaway_orders: takeawayOrders.length,
      delivery_orders: deliveryOrders.length,
      total_revenue: totalRevenue,
      delivery_fees_total: deliveryFeesTotal,
      cancelled_revenue: cancelledRevenue,
      average_order_value: avgOrderValue,
      cashier_stats: Object.values(cashierStats),
      delivery_stats: Object.values(deliveryStats),
      total_customers: totalCustomers,
      new_customers: newCustomers,
      returning_customers: returningCustomers,
      top_customers: topCustomers,
      top_selling_items: topSellingItems,
      least_selling_items: leastSellingItems,
      area_stats: Object.values(areaStats),
      cancellation_reasons: Object.entries(cancellationReasons).map(([reason, count]) => ({ reason, count })),
      issue_reasons: Object.entries(issueReasons).map(([reason, count]) => ({ reason, count })),
      avg_delivery_time_minutes: avgDeliveryTime,
      delayed_orders_count: delayedOrdersCount,
      delay_rate: delayRate,
      hourly_distribution: Object.entries(hourlyDistribution).map(([hour, count]) => ({ hour: parseInt(hour), count })),
      peak_hour: parseInt(peakHour || "0"),
      congestion_status: congestionStatus,
      menu_summary: menuSummary,
      created_by: user.id
    };

    // Save snapshot to database
    const { data: snapshot, error: snapshotError } = await supabase
      .from("ai_analysis_snapshots")
      .insert(snapshotData)
      .select()
      .single();

    if (snapshotError) throw snapshotError;

    // Prepare data for AI
    const aiData = {
      orders: {
        total: orders?.length || 0,
        completed: completedOrders.length,
        cancelled: cancelledOrders.length,
        pending: pendingOrders.length,
        inProgress: orders?.filter((o: any) => ["preparing", "ready", "delivering"].includes(o.status)).length || 0,
        takeaway: takeawayOrders.length,
        delivery: deliveryOrders.length,
        delayedCount: delayedOrdersCount
      },
      revenue: {
        total: totalRevenue,
        deliveryFees: deliveryFeesTotal,
        cancelled: cancelledRevenue,
        avgOrderValue
      },
      cashiers: Object.values(cashierStats),
      drivers: Object.values(deliveryStats),
      customers: {
        total: totalCustomers,
        new: newCustomers,
        returning: returningCustomers,
        top: topCustomers.slice(0, 5)
      },
      items: {
        topSelling: topSellingItems.slice(0, 5),
        leastSelling: leastSellingItems
      },
      areas: Object.values(areaStats).slice(0, 10),
      cancellationReasons: Object.entries(cancellationReasons).map(([reason, count]) => ({ reason, count })),
      issueReasons: Object.entries(issueReasons).map(([reason, count]) => ({ reason, count })),
      performance: {
        avgDeliveryTime: Math.round(avgDeliveryTime),
        delayRate: Math.round(delayRate),
        completionRate: orders?.length ? Math.round((completedOrders.length / orders.length) * 100) : 0
      },
      congestion: congestionStatus,
      menu: menuSummary,
      hourlyPeak: parseInt(peakHour || "0")
    };

    // Send to Gemini 3 for analysis
    const systemPrompt = `أنت محلل أعمال خبير لمطعم توصيل عراقي. لديك وصول كامل لجميع بيانات المطعم.

المهمة: حلل البيانات التالية وقدم تقريراً شاملاً بصيغة JSON يتضمن:

1. "summary": ملخص تنفيذي (3 جمل)
2. "overall_score": تقييم الأداء العام (رقم من 1-100)
3. "performance_grade": تصنيف (A, B, C, D, F)
4. "insights": مصفوفة من 5 رؤى مهمة، كل واحدة تحتوي:
   - "title": عنوان قصير
   - "description": وصف مختصر
   - "priority": الأولوية (high, medium, low)
   - "category": التصنيف (orders, revenue, staff, customers, menu, delivery)
5. "recommendations": مصفوفة من 5 توصيات عملية، كل واحدة تحتوي:
   - "title": عنوان
   - "action": الإجراء المطلوب
   - "impact": التأثير المتوقع
   - "urgency": الاستعجال (immediate, soon, later)
6. "warnings": مصفوفة من التحذيرات (أقصى 3)، كل واحدة تحتوي:
   - "title": عنوان
   - "severity": الخطورة (critical, warning, info)
   - "description": وصف
7. "opportunities": مصفوفة من الفرص (أقصى 3)، كل واحدة تحتوي:
   - "title": عنوان
   - "description": وصف
   - "potential": الإمكانية (high, medium)

التحليلات المطلوبة:
- أداء الكاشير: من يحتاج تدريب؟ من الأفضل؟
- أداء الدلفري: من الأسرع؟ من لديه مشاكل؟
- الأصناف: ما الذي يجب الترويج له؟ ما الذي يجب مراجعته؟
- المناطق: أين التركيز؟ أين المشاكل؟
- العملاء: كيف نحافظ على العائدين؟
- التشغيل: هل هناك اختناقات؟

أجب باللغة العربية فقط وبصيغة JSON صالحة.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `البيانات للتحليل:\n${JSON.stringify(aiData, null, 2)}` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد لحساب Lovable AI" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResult = await aiResponse.json();
    const rawResponse = aiResult.choices?.[0]?.message?.content || "";
    const tokensUsed = aiResult.usage?.total_tokens || 0;

    // Parse AI response
    let parsedAnalysis: any = {};
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = rawResponse;
      if (rawResponse.includes("```json")) {
        jsonStr = rawResponse.split("```json")[1]?.split("```")[0] || rawResponse;
      } else if (rawResponse.includes("```")) {
        jsonStr = rawResponse.split("```")[1]?.split("```")[0] || rawResponse;
      }
      parsedAnalysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      parsedAnalysis = {
        summary: rawResponse.slice(0, 500),
        overall_score: 70,
        performance_grade: "B",
        insights: [],
        recommendations: [],
        warnings: [],
        opportunities: []
      };
    }

    // Save AI insights to database
    const insightData = {
      snapshot_id: snapshot.id,
      analysis_type: analysisType,
      summary: parsedAnalysis.summary || "",
      insights: parsedAnalysis.insights || [],
      recommendations: parsedAnalysis.recommendations || [],
      warnings: parsedAnalysis.warnings || [],
      opportunities: parsedAnalysis.opportunities || [],
      overall_score: parsedAnalysis.overall_score || 0,
      performance_grade: parsedAnalysis.performance_grade || "N/A",
      raw_response: rawResponse,
      model_used: "google/gemini-3-flash-preview",
      tokens_used: tokensUsed,
      requested_by: user.id
    };

    const { data: insight, error: insightError } = await supabase
      .from("ai_insights")
      .insert(insightData)
      .select()
      .single();

    if (insightError) throw insightError;

    return new Response(JSON.stringify({
      success: true,
      snapshot: snapshot,
      insight: insight,
      analysis: parsedAnalysis
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI insights error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

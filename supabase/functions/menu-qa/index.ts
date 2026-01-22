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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { question, menuData, chatHistory } = await req.json();

    if (!question || !menuData) {
      return new Response(
        JSON.stringify({ error: "Missing question or menu data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare context for AI
    const menuContext = menuData.map((item: any) => 
      `- ${item.name} (${item.category}): بيعت ${item.total_sold} قطعة، الإيرادات ${item.revenue} دينار، توصيل: ${item.delivery}، استلام: ${item.takeaway}${item.top_areas.length > 0 ? `، أفضل المناطق: ${item.top_areas.join(', ')}` : ''}`
    ).join('\n');

    const systemPrompt = `أنت مساعد ذكي متخصص في تحليل إحصائيات مبيعات الأكلات في مطعم.

بيانات الأصناف الحالية:
${menuContext}

التعليمات:
- أجب على أسئلة المستخدم بناءً على البيانات المتوفرة فقط
- استخدم الأرقام الدقيقة من البيانات
- كن مختصراً ومباشراً في إجاباتك
- إذا طُلب مقارنة، قدم الأرقام بوضوح
- استخدم اللغة العربية فقط
- إذا لم تجد معلومات كافية، أخبر المستخدم بذلك`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add chat history for context
    if (chatHistory && chatHistory.length > 0) {
      messages.push(...chatHistory);
    }

    messages.push({ role: "user", content: question });

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to get AI response");
    }

    const aiResult = await aiResponse.json();
    const answer = aiResult.choices?.[0]?.message?.content || "لم أتمكن من الإجابة";

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in menu-qa function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

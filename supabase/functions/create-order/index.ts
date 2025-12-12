import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  menu_item_id?: string;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  notes?: string;
}

interface OrderRequest {
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  delivery_area_id?: string;
  type: 'delivery' | 'takeaway';
  notes?: string;
  cashier_id?: string;
  cashier_name?: string;
  items: OrderItem[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to verify authentication
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData: OrderRequest = await req.json();
    console.log('Received order request:', JSON.stringify(orderData, null, 2));

    // Validate required fields
    if (!orderData.customer_name || orderData.customer_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'اسم العميل مطلوب (حرفان على الأقل)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Phone validation only for delivery orders - must be exactly 11 digits
    if (orderData.type === 'delivery') {
      const phoneDigits = orderData.customer_phone?.replace(/\D/g, '') || '';
      if (phoneDigits.length !== 11) {
        return new Response(
          JSON.stringify({ error: 'رقم الهاتف يجب أن يكون 11 رقم بالضبط' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!orderData.items || orderData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'الطلب يجب أن يحتوي على عنصر واحد على الأقل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['delivery', 'takeaway'].includes(orderData.type)) {
      return new Response(
        JSON.stringify({ error: 'نوع الطلب غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate item quantities
    for (const item of orderData.items) {
      if (!item.quantity || item.quantity < 1 || item.quantity > 100) {
        return new Response(
          JSON.stringify({ error: 'كمية غير صالحة للعنصر: ' + item.menu_item_name }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get menu item IDs from the order
    const menuItemIds = orderData.items
      .map(item => item.menu_item_id)
      .filter((id): id is string => !!id);

    // Fetch actual menu item prices from database
    let serverCalculatedTotal = 0;
    const validatedItems: OrderItem[] = [];

    if (menuItemIds.length > 0) {
      const { data: menuItems, error: menuError } = await supabaseAdmin
        .from('menu_items')
        .select('id, name, price, is_available')
        .in('id', menuItemIds);

      if (menuError) {
        console.error('Error fetching menu items:', menuError);
        return new Response(
          JSON.stringify({ error: 'خطأ في جلب بيانات القائمة' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create a map of menu items for quick lookup
      const menuItemMap = new Map(menuItems?.map(m => [m.id, m]) || []);

      // Validate each item and calculate server-side total
      for (const item of orderData.items) {
        if (item.menu_item_id) {
          const menuItem = menuItemMap.get(item.menu_item_id);
          
          if (!menuItem) {
            return new Response(
              JSON.stringify({ error: 'عنصر القائمة غير موجود: ' + item.menu_item_name }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!menuItem.is_available) {
            return new Response(
              JSON.stringify({ error: 'العنصر غير متوفر حالياً: ' + menuItem.name }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Use server-side price, NOT client-provided price
          const serverPrice = Number(menuItem.price);
          serverCalculatedTotal += serverPrice * item.quantity;
          
          validatedItems.push({
            menu_item_id: item.menu_item_id,
            menu_item_name: menuItem.name, // Use server-side name
            menu_item_price: serverPrice,  // Use server-side price
            quantity: item.quantity,
            notes: item.notes?.trim().slice(0, 500) || undefined,
          });
        } else {
          // For items without menu_item_id, validate the price is reasonable
          const price = Number(item.menu_item_price);
          if (isNaN(price) || price < 0 || price > 1000000) {
            return new Response(
              JSON.stringify({ error: 'سعر غير صالح للعنصر: ' + item.menu_item_name }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          serverCalculatedTotal += price * item.quantity;
          validatedItems.push({
            menu_item_name: item.menu_item_name.trim().slice(0, 200),
            menu_item_price: price,
            quantity: item.quantity,
            notes: item.notes?.trim().slice(0, 500) || undefined,
          });
        }
      }
    } else {
      // All items without menu_item_id - validate prices
      for (const item of orderData.items) {
        const price = Number(item.menu_item_price);
        if (isNaN(price) || price < 0 || price > 1000000) {
          return new Response(
            JSON.stringify({ error: 'سعر غير صالح للعنصر: ' + item.menu_item_name }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        serverCalculatedTotal += price * item.quantity;
        validatedItems.push({
          menu_item_name: item.menu_item_name.trim().slice(0, 200),
          menu_item_price: price,
          quantity: item.quantity,
          notes: item.notes?.trim().slice(0, 500) || undefined,
        });
      }
    }

    console.log('Server calculated total:', serverCalculatedTotal);

    // Create the order with server-calculated total
    // Use authenticated user's ID as cashier_id for RLS policies
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: orderData.customer_name.trim().slice(0, 100),
        customer_phone: orderData.customer_phone.trim().slice(0, 20),
        customer_address: orderData.customer_address?.trim().slice(0, 500) || null,
        delivery_area_id: orderData.delivery_area_id || null,
        type: orderData.type,
        notes: orderData.notes?.trim().slice(0, 500) || null,
        total_price: serverCalculatedTotal, // Use server-calculated total
        cashier_id: user.id, // Always use the authenticated user's ID
        cashier_name: orderData.cashier_name?.trim().slice(0, 100) || null,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'خطأ في إنشاء الطلب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert order items
    const orderItems = validatedItems.map(item => ({
      order_id: newOrder.id,
      menu_item_id: item.menu_item_id || null,
      menu_item_name: item.menu_item_name,
      menu_item_price: item.menu_item_price,
      quantity: item.quantity,
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback: delete the order if items insertion failed
      await supabaseAdmin.from('orders').delete().eq('id', newOrder.id);
      return new Response(
        JSON.stringify({ error: 'خطأ في إضافة عناصر الطلب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created successfully:', newOrder.id, 'Total:', serverCalculatedTotal);

    return new Response(
      JSON.stringify({ order: newOrder }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'خطأ غير متوقع في الخادم' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

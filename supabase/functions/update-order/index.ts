import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

// Sanitize text input: strip HTML tags and trim
function sanitizeText(input: string, maxLength: number): string {
  return input.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim().slice(0, maxLength);
}
interface OrderItem {
  menu_item_id?: string;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  notes?: string;
}

interface UpdateOrderRequest {
  order_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  delivery_area_id?: string;
  notes?: string;
  items?: OrderItem[];
  order_source?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const requestData: UpdateOrderRequest = await req.json();
    console.log('Update order request for:', requestData.order_id);

    const { order_id, customer_name, customer_phone, customer_address, delivery_area_id, notes, items } = requestData;

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number if provided
    if (customer_phone && customer_phone.length !== 11) {
      return new Response(
        JSON.stringify({ error: 'رقم الهاتف يجب أن يكون 11 رقماً' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing order
    const { data: existingOrder, error: orderFetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderFetchError || !existingOrder) {
      console.error('Error fetching order:', orderFetchError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object for order
    const orderUpdate: Record<string, unknown> = {
      is_edited: true,
      edited_at: new Date().toISOString(),
    };

    if (customer_name) orderUpdate.customer_name = sanitizeText(customer_name, 100);
    if (customer_phone) orderUpdate.customer_phone = customer_phone.replace(/\D/g, '').slice(0, 20);
    if (customer_address !== undefined) orderUpdate.customer_address = customer_address ? sanitizeText(customer_address, 500) : null;
    if (delivery_area_id) orderUpdate.delivery_area_id = delivery_area_id;
    if (notes !== undefined) orderUpdate.notes = notes ? sanitizeText(notes, 500) : null;
    if (orderData.order_source !== undefined) orderUpdate.order_source = orderData.order_source ? sanitizeText(orderData.order_source, 50) : null;

    // Get delivery fee if delivery_area_id changed or exists
    let deliveryFee = existingOrder.delivery_fee || 0;
    const areaIdToUse = delivery_area_id || existingOrder.delivery_area_id;
    
    if (areaIdToUse && existingOrder.type === 'delivery') {
      const { data: deliveryArea } = await supabaseAdmin
        .from('delivery_areas')
        .select('delivery_fee')
        .eq('id', areaIdToUse)
        .single();
      
      if (deliveryArea) {
        deliveryFee = Number(deliveryArea.delivery_fee) || 0;
        orderUpdate.delivery_fee = deliveryFee;
      }
    }

    // If items are provided, recalculate total price
    if (items && items.length > 0) {
      // Get menu items to validate prices
      const menuItemIds = items.filter(i => i.menu_item_id).map(i => i.menu_item_id);
      
      let serverCalculatedTotal = 0;
      
      if (menuItemIds.length > 0) {
        const { data: menuItems, error: menuError } = await supabaseAdmin
          .from('menu_items')
          .select('id, price, name')
          .in('id', menuItemIds);

        if (menuError) {
          console.error('Error fetching menu items:', menuError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch menu items' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculate server-side total using database prices
        for (const item of items) {
          const menuItem = menuItems?.find(m => m.id === item.menu_item_id);
          const price = menuItem ? Number(menuItem.price) : Number(item.menu_item_price);
          serverCalculatedTotal += price * item.quantity;
        }
      } else {
        // No menu item IDs, use provided prices
        for (const item of items) {
          serverCalculatedTotal += Number(item.menu_item_price) * item.quantity;
        }
      }

      console.log('Total recalculated for order:', order_id);
      orderUpdate.total_price = serverCalculatedTotal + deliveryFee; // Include delivery fee

      // Delete existing order items
      const { error: deleteError } = await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('order_id', order_id);

      if (deleteError) {
        console.error('Error deleting order items:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete existing items' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert new order items
      const orderItems = items.map(item => ({
        order_id,
        menu_item_id: item.menu_item_id || null,
        menu_item_name: sanitizeText(item.menu_item_name, 200),
        menu_item_price: item.menu_item_price,
        quantity: item.quantity,
        notes: item.notes ? sanitizeText(item.notes, 500) : null,
      }));

      const { error: itemsInsertError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems);

      if (itemsInsertError) {
        console.error('Error inserting order items:', itemsInsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to insert order items' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(orderUpdate)
      .eq('id', order_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order updated:', order_id);

    return new Response(
      JSON.stringify({ success: true, order: updatedOrder }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

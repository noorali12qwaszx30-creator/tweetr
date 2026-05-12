import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface OrderItem {
  menu_item_id?: string;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  notes?: string;
}

interface OrderRequest {
  request_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  delivery_area_id?: string;
  type: 'delivery' | 'takeaway' | 'pickup';
  notes?: string;
  cashier_id?: string;
  cashier_name?: string;
  items: OrderItem[];
  order_source?: string;
}

function sanitizeText(input: string, maxLength: number): string {
  return input.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim().slice(0, maxLength);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(error: any): boolean {
  const message = `${error?.message || error?.name || error || ''}`.toLowerCase();
  const status = Number(error?.status || error?.code || 0);
  return (
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    message.includes('internal server error') ||
    message.includes('unexpected token') ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('authunknownerror')
  );
}

async function runQueryWithRetry<T extends { error?: any }>(
  label: string,
  queryFactory: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastResult: T | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await queryFactory();
    lastResult = result;

    if (!result?.error) {
      return result;
    }

    if (!isTransientError(result.error) || attempt === attempts - 1) {
      return result;
    }

    console.warn(`${label} attempt ${attempt + 1} failed:`, result.error);
    await delay(250 * (attempt + 1));
  }

  return lastResult as T;
}

async function getUserWithRetry(client: ReturnType<typeof createClient>, attempts = 3) {
  let lastResponse: Awaited<ReturnType<typeof client.auth.getUser>> | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await client.auth.getUser();
    lastResponse = response;

    if (response.data.user && !response.error) {
      return response;
    }

    if (!isTransientError(response.error) || attempt === attempts - 1) {
      return response;
    }

    console.warn(`getUser attempt ${attempt + 1} failed:`, response.error);
    await delay(300 * (attempt + 1));
  }

  return lastResponse!;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await getUserWithRetry(supabaseUser);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData: OrderRequest = await req.json();
    const orderId = orderData.request_id?.trim() || crypto.randomUUID();

    if (!orderData.customer_name || orderData.customer_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'اسم العميل مطلوب (حرفان على الأقل)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    if (!['delivery', 'takeaway', 'pickup'].includes(orderData.type)) {
      return new Response(
        JSON.stringify({ error: 'نوع الطلب غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const item of orderData.items) {
      if (!item.quantity || item.quantity < 1 || item.quantity > 100) {
        return new Response(
          JSON.stringify({ error: 'كمية غير صالحة لأحد العناصر' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const menuItemIds = orderData.items
      .map(item => item.menu_item_id)
      .filter((id): id is string => !!id);

    let serverCalculatedTotal = 0;
    const validatedItems: OrderItem[] = [];

    if (menuItemIds.length > 0) {
      // Retry transient backend errors (up to 3 attempts) before giving up
      const menuRes = await runQueryWithRetry(
        'menu_items fetch',
        () => supabaseAdmin
          .from('menu_items')
          .select('id, name, price, is_available')
          .in('id', menuItemIds),
      );

      const menuItems = menuRes.data as Array<{ id: string; name: string; price: number; is_available: boolean }> | null;
      const menuError = menuRes.error;

      const menuItemMap = new Map((menuItems || []).map((m) => [m.id, m]));
      // If fetch failed entirely, fall back to client-provided values (still bounded by price validation below)
      const fallbackToClient = !!menuError && menuItemMap.size === 0;
      if (fallbackToClient) {
        console.error('menu_items fetch failed after retries, falling back to client values:', menuError);
      }

      for (const item of orderData.items) {
        if (item.menu_item_id) {
          const menuItem = menuItemMap.get(item.menu_item_id);

          if (!menuItem && !fallbackToClient) {
            return new Response(
              JSON.stringify({ error: 'عنصر القائمة غير موجود: ' + item.menu_item_name }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (menuItem && !menuItem.is_available) {
            return new Response(
              JSON.stringify({ error: 'العنصر غير متوفر حالياً: ' + menuItem.name }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const serverPrice = menuItem ? Number(menuItem.price) : Number(item.menu_item_price);
          if (isNaN(serverPrice) || serverPrice < 0 || serverPrice > 1000000) {
            return new Response(
              JSON.stringify({ error: 'سعر غير صالح للعنصر' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          serverCalculatedTotal += serverPrice * item.quantity;

          validatedItems.push({
            menu_item_id: item.menu_item_id,
            menu_item_name: menuItem ? menuItem.name : sanitizeText(item.menu_item_name, 200),
            menu_item_price: serverPrice,
            quantity: item.quantity,
            notes: item.notes ? sanitizeText(item.notes, 500) : undefined,
          });
        } else {
          const price = Number(item.menu_item_price);
          if (isNaN(price) || price < 0 || price > 1000000) {
            return new Response(
              JSON.stringify({ error: 'سعر غير صالح للعنصر' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          serverCalculatedTotal += price * item.quantity;
          validatedItems.push({
            menu_item_name: sanitizeText(item.menu_item_name, 200),
            menu_item_price: price,
            quantity: item.quantity,
            notes: item.notes ? sanitizeText(item.notes, 500) : undefined,
          });
        }
      }
    } else {
      for (const item of orderData.items) {
        const price = Number(item.menu_item_price);
        if (isNaN(price) || price < 0 || price > 1000000) {
          return new Response(
            JSON.stringify({ error: 'سعر غير صالح للعنصر' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        serverCalculatedTotal += price * item.quantity;
        validatedItems.push({
          menu_item_name: sanitizeText(item.menu_item_name, 200),
          menu_item_price: price,
          quantity: item.quantity,
          notes: item.notes ? sanitizeText(item.notes, 500) : undefined,
        });
      }
    }

    let deliveryFee = 0;
    if (orderData.delivery_area_id && orderData.type === 'delivery') {
      const { data: deliveryArea, error: areaError } = await runQueryWithRetry(
        'delivery area fetch',
        () => supabaseAdmin
          .from('delivery_areas')
          .select('delivery_fee')
          .eq('id', orderData.delivery_area_id)
          .single(),
      );

      if (!areaError && deliveryArea) {
        deliveryFee = Number(deliveryArea.delivery_fee) || 0;
      }
    }

    let customerId: string | null = null;
    const customerPhone = orderData.customer_phone.trim();

    if (customerPhone) {
      const { data: existingCustomer } = await runQueryWithRetry(
        'customer lookup',
        () => supabaseAdmin
          .from('customers')
          .select('id')
          .eq('phone', customerPhone)
          .maybeSingle(),
      );

      if (existingCustomer) {
        customerId = existingCustomer.id;
        await runQueryWithRetry(
          'customer update',
          () => supabaseAdmin
            .from('customers')
            .update({
              name: sanitizeText(orderData.customer_name, 100),
              address: orderData.customer_address ? sanitizeText(orderData.customer_address, 500) : null,
            })
            .eq('id', customerId),
        );
      } else {
        const { data: newCustomer, error: customerError } = await runQueryWithRetry(
          'customer insert',
          () => supabaseAdmin
            .from('customers')
            .insert({
              name: sanitizeText(orderData.customer_name, 100),
              phone: customerPhone.slice(0, 20),
              address: orderData.customer_address ? sanitizeText(orderData.customer_address, 500) : null,
            })
            .select('id')
            .single(),
        );

        if (!customerError && newCustomer) {
          customerId = newCustomer.id;
        }
      }
    }

    const { data: existingOrder } = await runQueryWithRetry(
      'existing order lookup',
      () => supabaseAdmin
        .from('orders')
        .select('id, order_number, customer_id, customer_name, customer_phone, customer_address, delivery_area_id, type, notes, total_price, delivery_fee, cashier_id, cashier_name, delivery_person_id, delivery_person_name, pending_delivery_acceptance, cancellation_reason, created_at, updated_at, delivered_at, cancelled_at, is_edited, edited_at, has_issue, issue_reason, issue_reported_at, issue_reported_by, order_source, status')
        .eq('id', orderId)
        .maybeSingle(),
    );

    if (existingOrder) {
      const { data: existingItems } = await runQueryWithRetry(
        'existing order items lookup',
        () => supabaseAdmin
          .from('order_items')
          .select('id')
          .eq('order_id', orderId)
          .limit(1),
      );

      if ((existingItems?.length || 0) > 0) {
        console.log('Order already created, returning existing order:', orderId);
        return new Response(
          JSON.stringify({ order: existingOrder }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: insertedOrder, error: orderError } = await runQueryWithRetry(
      'create order',
      () => supabaseAdmin
        .from('orders')
        .insert({
          id: orderId,
          customer_id: customerId,
          customer_name: sanitizeText(orderData.customer_name, 100),
          customer_phone: orderData.customer_phone.replace(/\D/g, '').slice(0, 20),
          customer_address: orderData.customer_address ? sanitizeText(orderData.customer_address, 500) : null,
          delivery_area_id: orderData.delivery_area_id || null,
          type: orderData.type,
          notes: orderData.notes ? sanitizeText(orderData.notes, 500) : null,
          total_price: serverCalculatedTotal + deliveryFee,
          delivery_fee: deliveryFee,
          cashier_id: user.id,
          cashier_name: orderData.cashier_name ? sanitizeText(orderData.cashier_name, 100) : null,
          order_source: orderData.order_source ? sanitizeText(orderData.order_source, 50) : null,
          status: 'pending',
        })
        .select()
        .single(),
    );

    let newOrder = insertedOrder;

    if (orderError) {
      if (String(orderError?.code || '') === '23505') {
        const { data: duplicateOrder } = await runQueryWithRetry(
          'duplicate order lookup',
          () => supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single(),
        );

        if (duplicateOrder) {
          newOrder = duplicateOrder;
        }
      }
    }

    if (!newOrder) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'خطأ في إنشاء الطلب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderItems = validatedItems.map(item => ({
      id: crypto.randomUUID(),
      order_id: newOrder.id,
      menu_item_id: item.menu_item_id || null,
      menu_item_name: item.menu_item_name,
      menu_item_price: item.menu_item_price,
      quantity: item.quantity,
      notes: item.notes || null,
    }));

    const { data: existingOrderItems } = await runQueryWithRetry(
      'pre-insert order items lookup',
      () => supabaseAdmin
        .from('order_items')
        .select('id')
        .eq('order_id', newOrder.id)
        .limit(1),
    );

    if ((existingOrderItems?.length || 0) === 0) {
      const { error: itemsError } = await runQueryWithRetry(
        'create order items',
        () => supabaseAdmin
          .from('order_items')
          .insert(orderItems)
          .select('id'),
      );

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        await runQueryWithRetry(
          'rollback order after items failure',
          () => supabaseAdmin.from('orders').delete().eq('id', newOrder.id),
        );
        return new Response(
          JSON.stringify({ error: 'خطأ في إضافة عناصر الطلب' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Order created:', newOrder.id);

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

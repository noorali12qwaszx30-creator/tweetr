
## التشخيص الحالي

من فحص قاعدة البيانات والكود:

- **6,667 طلب** في الجدول (54 نشط + 6,613 مؤرشف)، **10,441 عنصر طلب**.
- كل شاشة تشغيلية (Kitchen / Field / Cashier / Delivery / Admin) تستدعي **`useSupabaseOrders`** الذي يجلب **كل** الطلبات غير المؤرشفة (`is_archived=false`) بصفحات 1000 — وحتى لو فعلياً اليوم 54 طلب فقط، فإن أي تأخر في الـ daily_reset يُضخّم الحمل. كل عميل أيضاً يجلب كل `order_items` المرتبطة.
- **Realtime** مشترك على `*` لكامل جدول `orders` و `order_items` بدون فلتر — كل جهاز يستلم كل تغيير لأي طلب لأي مستخدم.
- **Polling احتياطي كل 8–30 ثانية** يعيد جلب آلاف الصفوف عند انقطاع Realtime.
- إحصائيات الأدمن (`AdminStatsTab`, `FinanceBreakdown`, `CustomerAnalytics`) تشتغل على `orders` المحلية في الذاكرة — أي تحسب من طلبات اليوم فقط، ومع ذلك تُحمّل كل الطلبات النشطة دفعة واحدة.
- لا توجد فهرسة على `(delivered_at)` ولا فهرس مركّب يخدم `WHERE is_archived=false AND status IN (...)`.

السبب الرئيسي للاستهلاك المرتفع: **جميع الأجهزة تجلب نفس البيانات بالكامل، باستمرار، بدون فلترة من جهة السيرفر، ومع Realtime واسع النطاق**.

---

## الهيكل المقترح: Hot / Warm / Cold

```text
┌──────────────────────────────────────────────────┐
│ HOT  : orders (active فقط)                       │
│        - is_archived=false                       │
│        - فلترة بالـ status للشاشات التشغيلية      │
│        - أرشفة تلقائية بعد 6h من delivered/cancel │
├──────────────────────────────────────────────────┤
│ WARM : orders_history (نفس الأعمدة، مفهرسة)      │
│        - الطلبات المؤرشفة                        │
│        - تُقرأ فقط من الإحصائيات والمحاسبة       │
├──────────────────────────────────────────────────┤
│ COLD : daily_statistics + driver_daily_stats     │
│        - أرقام مجمّعة جاهزة (لا حاجة لقراءة      │
│          ملايين الصفوف للإحصائيات)               │
└──────────────────────────────────────────────────┘
```

كل شاشة تقرأ فقط من الطبقة التي تحتاجها.

---

## الخطوات

### 1) فصل الطلبات المؤرشفة في جدول مستقل
- إنشاء `orders_history` و `order_items_history` بنفس البنية + فهارس على `(delivered_at)`, `(delivery_person_id, delivered_at)`, `(delivery_area_id)`, `(cashier_id)`.
- تعديل `daily_reset_orders()` لتقوم بـ **`INSERT … SELECT` ثم `DELETE`** بدلاً من `UPDATE is_archived=true`. النتيجة: جدول `orders` يبقى صغيراً جداً (عشرات إلى مئات الصفوف فقط).
- ترحيل البيانات الحالية المؤرشفة إلى `orders_history` دفعة واحدة.

**النتيجة:** كل استعلام تشغيلي يصبح على جدول صغير → سرعة قصوى وحمل I/O أدنى.

### 2) فلترة من جهة السيرفر لكل شاشة (Server-side scoping)

تعديل `useOrdersQuery` ليمرّر فلتر بحسب الدور:

| الدور      | ما يحتاجه فعلاً                                                                 |
|------------|--------------------------------------------------------------------------------|
| Kitchen    | `status IN ('pending','preparing','ready')`                                    |
| Cashier    | `cashier_id = me OR (status='pending' AND created today)` — مع Pagination     |
| Field      | `type IN ('delivery','pickup') AND status != 'delivered'` (live)              |
| Delivery   | موجود فعلاً (`delivery_person_id=me OR ready unassigned`)                      |
| Takeaway   | `type IN ('takeaway','pickup')`                                                |
| Admin      | لا يجلب طلبات مباشرة — يقرأ من `daily_statistics` (راجع البند 4)              |

كذلك جلب `order_items` فقط للطلبات الـ N الأحدث المرئية، واستخدام `select` محدود للأعمدة (لا `select *`).

### 3) تقليل Realtime + إيقاف Polling الزائد
- قنوات Realtime مفلترة بـ `filter` (مثلاً `status=in.(pending,preparing,ready)` للمطبخ، و `delivery_person_id=eq.<uid>` للسائق).
- إلغاء قناة `order_items` العامة، والاكتفاء بإعادة جلب عناصر الطلب فقط عند `INSERT` لطلب جديد أو فتح تفاصيل طلب.
- رفع `FALLBACK_POLLING_INTERVAL` إلى 60s، و `SILENT_REFRESH_INTERVAL` يُحذف نهائياً ما دام Realtime يعمل.

### 4) إحصائيات بدون تحميل الطلبات
- إضافة جدول `driver_daily_stats(driver_id, stat_date, delivered_count, total_collected, delivery_fees, cancelled_count)` يُحدَّث بـ trigger على تغيّر `status='delivered'/'cancelled'`.
- تعديل لوحة الأدمن لتقرأ مباشرة من `daily_statistics` و `driver_daily_stats` لأي نطاق زمني (يوم/أسبوع/شهر) — **بدون** جلب الطلبات الأصلية.
- محاسبة السائق (`DeliveryAccountingDialog` و `DriverStatsTab`):
  - "مستحقات اليوم" → استعلام مفلتر من `orders` الحية (صغير جداً).
  - "الإجمالي/الأسبوع/الشهر" → استعلام مجمّع من `orders_history` عبر RPC تُرجع رقماً واحداً، لا قائمة طلبات.

### 5) أرشفة دورية ذكية بدلاً من اليدوية فقط
- Cron (pg_cron) كل ساعة: نقل الطلبات `delivered`/`cancelled` التي مرّ على إنهائها > 6 ساعات من `orders` إلى `orders_history`.
- يبقى `daily_reset_orders` للـ snapshot اليومي وتصفير عدّاد الطلبات، لكن لن يكون مسؤولاً وحده عن الترحيل.

### 6) فهرسة وتنظيف
- فهرس مركّب على `orders(is_archived, status, created_at DESC)`.
- فهرس جزئي على `orders_history(delivery_person_id, delivered_at DESC) WHERE status='delivered'`.
- إزالة فهرس `idx_orders_is_archived` الزائد بعد فصل الجدول.
- `VACUUM FULL` بعد الترحيل لاسترجاع المساحة.

### 7) تحسينات واجهة (Frontend)
- ترقيم صفحات (Pagination) لأي قائمة طلبات أكبر من 50.
- التخلص من `order_items` المحمّلة في كل مكان: لا تُجلب إلا عند فتح بطاقة الطلب أو عند تغيير حالته للمطبخ.
- إزالة `useDriverArchivedOrders` (يجلب 2000 صف) واستبداله باستعلام مجمّع.

---

## التفاصيل التقنية (للمراجعة)

**Migrations المطلوبة:**
1. `CREATE TABLE orders_history (LIKE orders INCLUDING ALL)` + `order_items_history`.
2. ترحيل: `INSERT INTO orders_history SELECT * FROM orders WHERE is_archived=true; DELETE …`.
3. فهارس جديدة + RLS مماثلة لجدول `orders` (Admin/Field/Driver-own للقراءة فقط).
4. RPC: `get_driver_accounting(_driver_id uuid, _from date, _to date) RETURNS jsonb` — تُرجع المجاميع.
5. RPC: `get_admin_dashboard_stats(_from date, _to date) RETURNS jsonb`.
6. Trigger على `orders` لتحديث `driver_daily_stats` عند `delivered`/`cancelled`.
7. Cron job ساعي للأرشفة التلقائية (6h grace).
8. تحديث `daily_reset_orders` للترحيل بدل وضع علامة.

**Frontend:**
- `useOrdersQuery`: قبول `statusIn`, `typeIn`, `selectColumns` وتمريرها للـ select/realtime filter.
- إنشاء `useDriverAccounting(driverId, range)` و `useAdminStats(range)` يعتمدان على RPCs.
- تخفيض الـ polling/silent refresh.
- إزالة قناة `order_items` العامة.

---

## النتيجة المتوقعة

- **قراءات السيرفر**: من ~10K صف/دقيقة لكل جهاز إلى < 100 صف/دقيقة.
- **حجم Payload الأولي** للشاشة التشغيلية: من ~3MB إلى < 100KB.
- **Realtime events** المستلمة لكل جهاز: انخفاض > 80%.
- **محاسبة السائق والإحصائيات**: استعلام واحد بمجاميع، لا قوائم طلبات.
- **قاعدة البيانات**: جدول `orders` يبقى < 200 صف دائماً → سرعة استعلام ثابتة مهما كبر التاريخ.
- **بدون فقدان أي بيانات** — كل شيء محفوظ في `orders_history` + snapshots.

هل أبدأ التنفيذ؟

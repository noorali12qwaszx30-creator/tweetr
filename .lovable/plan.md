# خطة إعادة تصميم لوحة إحصائيات الدلفري

## الهدف
تحويل تبويب `إحصائياتي` في واجهة الدلفري من شاشة بسيطة إلى لوحة تحكم احترافية متكاملة (Dashboard) بأسلوب تطبيقات شركات التوصيل الكبرى، مع حفاظ تام على منطق الـ Shift (11ص–11ص) ومنطق احتساب أرباح الدلفري من `delivery_fee` ومستحقات المطعم من `total_price - delivery_fee`.

---

## البنية الجديدة للملفات

سيتم تقسيم `DriverStatsTab.tsx` الضخم إلى مكونات modular تحت مجلد جديد:

```text
src/components/delivery/stats/
├── DriverStatsTab.tsx          (الحاوية الرئيسية + التبويبات + الفلترة)
├── hooks/
│   └── useDriverStats.ts       (كل حسابات الإحصائيات في hook واحد)
├── shared/
│   ├── StatCard.tsx            (بطاقة إحصائية فاخرة + glassmorphism + animated counter)
│   ├── AnimatedCounter.tsx     (عداد أرقام متحرك)
│   ├── ProgressRing.tsx        (حلقة تقدم دائرية SVG)
│   ├── MiniBarChart.tsx        (مخطط أعمدة بسيط بدون مكتبات إضافية)
│   ├── MiniLineChart.tsx       (خط بياني SVG خفيف)
│   ├── HeatMapHours.tsx        (24 خانة لساعات الذروة)
│   ├── PeriodFilter.tsx        (يوم/أسبوع/شهر/سنة/مخصص)
│   └── SkeletonStats.tsx
├── sections/
│   ├── QuickSummaryWidget.tsx  (ملخص أعلى الصفحة)
│   ├── EarningsSection.tsx     (يوم/أسبوع/شهر/سنة/كلي + مقارنات)
│   ├── RestaurantDuesSection.tsx (مستحقات + سجل تسليم + نسبة الالتزام)
│   ├── PerformanceSection.tsx  (نجاح/إلغاء/أوقات/تقييم/ساعات عمل)
│   └── SmartAnalyticsSection.tsx (مناطق/ذروة/Heatmap/معدلات/توقعات)
└── utils/
    ├── shiftTime.ts            (نقل دوال SHIFT_START_HOUR هنا)
    └── periodFilters.ts        (today/yesterday/week/month/year/custom)
```

تبقى الواجهة العامة لـ `DriverStatsTab` كما هي (نفس Props) كي لا نكسر `DeliveryDashboard`.

---

## الأقسام والمحتوى

### 1) Header + Quick Summary Widget
- عنوان + حالة (Online/Offline) + زر Refresh + Pull-to-Refresh.
- Widget أفقي يعرض 4 أرقام لحظية: أرباح اليوم، طلبات اليوم، نسبة النجاح، مستحقات المطعم — بأسلوب glass + animated counters.

### 2) فلترة الفترة (PeriodFilter)
- Tabs: اليوم / الأسبوع / الشهر / السنة / مخصص (Date Range).
- جميع الأقسام أدناه تتفاعل مع الفلتر.

### 3) قسم الأرباح المالية (EarningsSection)
- بطاقات احترافية لكل فترة: إجمالي، عدد طلبات، متوسط ربح/طلب، مقارنة % مع الفترة السابقة (سهم أخضر/أحمر).
- مخطط أعمدة (MiniBarChart) لأرباح الأسبوع اليومية + إبراز أفضل يوم.
- مخطط شهري للسنة عند اختيار "السنة".
- بطاقة "الإجمالي الكلي" مع أيقونة Trophy ومتوسط شهري وعدد ساعات عمل تقريبية.

### 4) قسم مستحقات المطعم (RestaurantDuesSection)
- مبلغ مستحق حالي (كبير، أحمر) + مبلغ مُسلَّم + متبقي.
- Progress Ring لنسبة الالتزام بالتسليم.
- سجل تسليمات سابقة (mock حالياً — جدول مستقبلي).
- وقت آخر تسليم + تنبيه Pulse عند تجاوز عتبة (مثلاً > 200,000 د.ع متراكم).

### 5) قسم الأداء (PerformanceSection)
- Grid 2×N: نسبة نجاح، طلبات مكتملة، ملغاة، مرفوضة (pending_delivery_acceptance المرفوض)، أسرع وقت، متوسط، أطول وقت، تقييم عام (نجوم محسوبة من النجاح + الوقت).
- ساعات العمل اليوم/الأسبوع — تُحسب من فارق `created_at` بين أول وآخر طلب في كل يوم.

### 6) قسم التحليلات الذكية (SmartAnalyticsSection)
- أكثر منطقة طلبات (تجميع حسب `delivery_area_id` + `delivery_areas` lookup).
- أكثر وقت نشاط (peak hour).
- أفضل يوم عمل (أعلى أرباح).
- معدل الطلبات بالساعة، معدل التأخير (طلبات > 45 دقيقة).
- HeatMap لساعات اليوم (24 خانة بتدرج لوني).
- مخطط تفاعلي للأرباح والطلبات معاً.
- "أفكار ذكية": إنجازات (Badges)، تقييم يومي تلقائي، توقع أرباح اليوم (linear projection بناءً على الساعة الحالية مقابل متوسط الأسبوع).

> ملاحظات تم استبعادها لعدم توفر بيانات: الكيلومترات المقطوعة واستهلاك البنزين — لا يوجد مصدر بيانات GPS تراكمي per-order. سأضيف Placeholder "قريباً" بدلاً من اختراع أرقام.

---

## التصميم البصري

- **النظام اللوني**: استخدام الـ semantic tokens (`primary`, `success`, `destructive`, `warning`, `info`) المعرّفة في `index.css` فقط — مع fallback صريح بألوان Tailwind palette (emerald/sky/amber/rose) داخل `StatCard` لضمان عمل WebView على Android (مثل الإصلاح السابق).
- **Glassmorphism**: `bg-card/60 backdrop-blur-xl border border-white/10` على البطاقات الكبرى.
- **Shadows**: `shadow-soft` و `shadow-elevated` من نظام التصميم الحالي.
- **Animations**:
  - `animate-fade-in` و `animate-scale-in` عند ظهور البطاقات (staggered).
  - `AnimatedCounter` يعتمد `requestAnimationFrame` (بدون مكتبة).
  - Progress Rings بـ SVG + transition على `stroke-dashoffset`.
- **Dark Mode**: كل التوكنز تدعم الداكن أصلاً، مع تأكيد التباين.
- **Responsive**: Grid 2 أعمدة موبايل، 3-4 أعمدة على ≥sm.
- **RTL**: محافظة كاملة على الاتجاه العربي والأرقام الإنجليزية عبر `toEnglishNumbers`.

---

## الأداء

- كل الحسابات داخل `useDriverStats` بـ `useMemo` واحد يُرجع object مُجمّع.
- لا مكتبات Charts ثقيلة — رسومات SVG يدوية صغيرة.
- `Skeleton` أثناء أول تحميل.
- التحديثات تأتي من نفس `useSupabaseOrders` الحالي (Realtime موجود) — بدون polling إضافي.

---

## نقاط تقنية

- يتم نقل دوال `startOfCurrentShift` / `isToday` / `isYesterday` إلى `utils/shiftTime.ts` بدون تغيير منطقها.
- `OrderWithItems` تحتوي `delivery_area_id` فقط دون اسم — سأستخدم `useDeliveryAreas` لجلب lookup الأسماء داخل `SmartAnalyticsSection`.
- نفس Props لـ `DriverStatsTab` (`deliveredOrders`, `cancelledOrders`, `historicalDelivered`, `historicalCancelled`) — لا تغيير على `DeliveryDashboard.tsx`.
- لا تغييرات قاعدة بيانات في هذه الجولة (سجل تسليمات المطعم سيكون UI mock مع TODO لجدول مستقبلي عند طلب المستخدم).

---

## ما هو خارج النطاق (يحتاج تأكيد لاحقاً)
- جدول `restaurant_handovers` لتسجيل تسليمات المال للمطعم فعلياً.
- تتبع GPS تراكمي لحساب الكيلومترات والبنزين.
- نظام الإنجازات (Achievements) كجدول DB — حالياً مشتقّ من الأرقام فقط.

عند الموافقة سأبدأ التنفيذ مباشرة بهذا الترتيب: utils → hook → shared components → sections → الحاوية الرئيسية.



## المشكلة

رغم إضافة `pb-36` لجميع الأقسام، المشكلة مستمرة لأن الشريط السفلي (`fixed bottom-0`) يطفو فوق المحتوى بغض النظر عن الـ padding. الحل الجذري هو تغيير التخطيط الهيكلي.

## الحل - تغيير هيكل التخطيط

بدلاً من استخدام `fixed` للشريط السفلي، سنستخدم تخطيط Flexbox حيث:
- الصفحة تكون `flex flex-col h-dvh` (تملأ كامل الشاشة)
- المحتوى الرئيسي يكون `flex-1 overflow-auto` (يتمدد ويسمح بالتمرير)
- الشريط السفلي يكون في نهاية الـ flex (بدون `fixed`)

### التعديلات:

1. **`BottomNavigation.tsx`**: إزالة `fixed bottom-0 left-0 right-0` وجعله عنصر عادي في نهاية الصفحة (يبقى `z-50` و`bg-card` و`border-t`)

2. **جميع الأقسام الستة** (`CashierDashboard`, `FieldDashboard`, `DeliveryDashboard`, `TakeawayDashboard`, `AdminDashboard`, `KitchenDashboard`):
   - لف المحتوى بـ `div className="flex flex-col h-dvh"`
   - جعل `<main>` يحتوي على `flex-1 overflow-auto`
   - إزالة `pb-36` (لم نعد نحتاجه)
   - نقل `<BottomNavigation>` ليكون آخر عنصر داخل الـ flex container

هذا الحل يضمن أن المحتوى ينتهي قبل الشريط السفلي تماماً بدون أي تداخل.




## المشكلة

الشريط السفلي ثابت (`fixed bottom-0`) ويغطي المحتوى. بعض الأقسام تحتوي على `pb-36` كافٍ لكن:
- **المطبخ**: `p-3` فقط بدون padding سفلي
- **المدير**: `pb-24` غير كافٍ

## الحل

إضافة `pb-36` لجميع الأقسام التي تفتقر إليه:

1. **`KitchenDashboard.tsx`**: تغيير `className="container p-3"` إلى `className="container p-3 pb-36"`
2. **`AdminDashboard.tsx`**: تغيير `pb-24` إلى `pb-36`

الأقسام الأخرى (Cashier, Field, Delivery, Takeaway) تحتوي بالفعل على `pb-36`.


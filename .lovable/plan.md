

## خطة إضافة دور المطبخ (نسخة مبسطة)

### نظرة عامة
إضافة دور المطبخ بواجهة عرض فقط (بدون تعديل) مع زر تحديث وتسجيل خروج فقط.

### التأثير على استقرار النظام: منخفض جداً ✅

---

### المرحلة الأولى: تحديث تعريفات الأنواع

**الملف: `src/types/index.ts`**

```typescript
// إضافة kitchen للأدوار
export type UserRole = 'cashier' | 'field' | 'delivery' | 'takeaway' | 'kitchen' | 'admin';

// إضافة تسمية المطبخ
export const ROLE_LABELS: Record<UserRole, string> = {
  cashier: 'كاشير',
  field: 'الميدان',
  delivery: 'موظف توصيل',
  takeaway: 'السفري',
  kitchen: 'المطبخ',
  admin: 'المدير التنفيذي',
};
```

---

### المرحلة الثانية: إنشاء لوحة المطبخ

**ملف جديد: `src/pages/dashboard/KitchenDashboard.tsx`**

تصميم مُحسّن لشاشة 32 بوصة:

```text
┌─────────────────────────────────────────────────────────────────┐
│  [🔄 تحديث]              المطبخ - قيد التجهيز (5)    [🚪 خروج] │
├──────────────────┬──────────────────┬──────────────────┬────────┤
│   ┌──────────┐   │   ┌──────────┐   │   ┌──────────┐   │        │
│   │ ⏱ 12:34  │   │   │ ⏱ 08:45  │   │   │ ⏱ 05:21  │   │   ...  │
│   │ ────────-│   │   │ ────────-│   │   │ ────────-│   │        │
│   │ • 2× دجاج│   │   │ • 3× برجر│   │   │ • 1× شاو.│   │        │
│   │ • 1× بطاط│   │   │   بدون خس│   │   │ • 2× مكس │   │        │
│   │          │   │   │ • 2× كول │   │   │   حار زيا│   │        │
│   │ ⚠️ حار   │   │   └──────────┘   │   └──────────┘   │        │
│   └──────────┘   │                   │                   │        │
└──────────────────┴──────────────────┴──────────────────┴────────┘
```

**المميزات:**
- **عرض فقط** - بدون أي أزرار تعديل على الطلبات
- زر **تحديث** لإعادة تحميل الطلبات يدوياً
- زر **تسجيل خروج** مع تأكيد
- خط كبير وواضح للقراءة من مسافة
- عداد زمني بارز لكل طلب
- عرض المكونات والكميات فقط
- الملاحظات مُبرزة بلون مميز
- شبكة عرض 3-4 أعمدة تناسب الشاشة الكبيرة
- تحديث تلقائي في الوقت الحقيقي (Realtime)

---

### المرحلة الثالثة: تحديث شاشة اختيار الدور

**الملف: `src/pages/RoleSelector.tsx`**

- إضافة زر المطبخ مع أيقونة `ChefHat`
- نفس نمط تسجيل الدخول كبقية الأدوار

---

### المرحلة الرابعة: تحديث موجه لوحة التحكم

**الملف: `src/pages/Dashboard.tsx`**

```typescript
case 'kitchen':
  return <KitchenDashboard />;
```

---

### القسم الفني

#### هيكل KitchenDashboard:

```typescript
const KitchenDashboard = () => {
  const { orders, loading, refetch } = useSupabaseOrders();
  
  // فلترة الطلبات قيد التجهيز فقط
  const preparingOrders = orders
    .filter(o => o.status === 'preparing')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // الأقدم أولاً

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header مع زر التحديث والخروج */}
      <header className="flex justify-between items-center mb-8">
        <Button onClick={refetch}>
          <RefreshCw /> تحديث
        </Button>
        <h1>المطبخ - قيد التجهيز ({preparingOrders.length})</h1>
        <LogoutConfirmButton variant="compact" />
      </header>

      {/* شبكة الطلبات */}
      <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {preparingOrders.map(order => (
          <KitchenOrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
};
```

#### مكون بطاقة الطلب للمطبخ:

```typescript
const KitchenOrderCard = ({ order }) => (
  <Card className="p-6 text-xl">
    {/* رقم الطلب والعداد */}
    <div className="flex justify-between mb-4">
      <span className="text-3xl font-bold">#{order.order_number}</span>
      <OrderTimer createdAt={order.created_at} className="text-3xl" />
    </div>
    
    {/* المكونات */}
    <ul className="space-y-2 text-lg">
      {order.items.map(item => (
        <li key={item.id}>
          <span className="font-bold">{item.quantity}×</span> {item.name}
          {item.notes && <p className="text-warning text-sm">{item.notes}</p>}
        </li>
      ))}
    </ul>
    
    {/* ملاحظات الطلب */}
    {order.notes && (
      <div className="mt-4 p-3 bg-warning/20 rounded-lg text-warning">
        ⚠️ {order.notes}
      </div>
    )}
  </Card>
);
```

---

### ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/types/index.ts` | إضافة `kitchen` للأنواع و `ROLE_LABELS` |
| `src/pages/Dashboard.tsx` | إضافة case للمطبخ |
| `src/pages/RoleSelector.tsx` | إضافة زر المطبخ |
| `src/pages/dashboard/KitchenDashboard.tsx` | **ملف جديد** |

### لا حاجة لتعديل قاعدة البيانات ✅
- دور `kitchen` موجود مسبقاً في `app_role` enum
- سياسات RLS للعرض موجودة مسبقاً
- لا نحتاج سياسة UPDATE لأن الواجهة للعرض فقط


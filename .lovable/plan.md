
## الهدف
تحويل نظام "تويتر" إلى تطبيق Android حقيقي (.apk) يفتح كتطبيق native (بدون شريط متصفح)، ويستقبل إشعارات فورية لكل طلب جديد حتى لو كان التطبيق مغلق تماماً.

## الحل التقني
- **Capacitor**: لتغليف تطبيق React الحالي كتطبيق Android native.
- **Firebase Cloud Messaging (FCM)**: لإرسال إشعارات Push تصل في كل الحالات (مفتوح/خلفية/مغلق).
- **Edge Function**: ترسل إشعار FCM تلقائياً عند إنشاء طلب جديد في قاعدة البيانات.

---

## مراحل التنفيذ

### المرحلة 1: تجهيز المشروع لـ Capacitor
- تثبيت حزم Capacitor:
  - `@capacitor/core`, `@capacitor/cli`
  - `@capacitor/android`
  - `@capacitor/push-notifications` (للإشعارات)
  - `@capacitor/local-notifications` (إشعارات داخلية احتياطية)
  - `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`
- إنشاء `capacitor.config.ts` بالإعدادات الصحيحة:
  - `appId: app.lovable.ffbc149befc04553bf78cf970abd94af`
  - `appName: tweetr`
  - تفعيل hot-reload من sandbox للتجربة قبل البناء النهائي
  - إعداد splash screen وStatus bar بلون البراند البرتقالي

### المرحلة 2: دمج إشعارات Push في الكود
- إنشاء جدول `device_tokens` في قاعدة البيانات لحفظ توكنات FCM لكل مستخدم/جهاز:
  - `user_id`, `device_token`, `role`, `platform`, `created_at`
  - مع RLS صارم
- Hook جديد `usePushNotifications.ts`:
  - يطلب صلاحية الإشعارات عند تشغيل التطبيق على Android
  - يسجل توكن الجهاز في قاعدة البيانات
  - يستمع للإشعارات الواردة (foreground/background/tap)
  - يفتح الصفحة المناسبة عند الضغط (مثلاً: طلب جديد → CashierDashboard)
- تشغيله تلقائياً بعد تسجيل الدخول حسب الدور

### المرحلة 3: Edge Function لإرسال الإشعارات
- إنشاء edge function `send-push-notification`:
  - تستقبل: `target_role` (cashier/kitchen/...), `title`, `body`, `data`
  - تجلب جميع `device_tokens` للأدوار المستهدفة
  - ترسل عبر Firebase HTTP v1 API (يحتاج Service Account JSON كـ secret)
- Database Trigger على جدول `orders`:
  - عند `INSERT` → ينادي الـ edge function لإشعار الكاشير والمطبخ
  - عند `UPDATE` (تغيير حالة) → إشعار للسائق المعني
- استخدام `pg_net` extension لاستدعاء HTTP من trigger

### المرحلة 4: إعدادات Android Native
- إعداد ملف `AndroidManifest.xml`:
  - صلاحية `POST_NOTIFICATIONS` (Android 13+)
  - صلاحية `WAKE_LOCK` و `VIBRATE`
  - `android:usesCleartextTraffic` للتطوير فقط
- أيقونة التطبيق وSplash Screen ببراند تويتر البرتقالي
- إعداد قناة إشعارات Android (notification channel) بصوت تنبيه مخصص

### المرحلة 5: ربط Firebase
المستخدم يحتاج:
1. إنشاء مشروع Firebase مجاني (5 دقائق)
2. تنزيل ملف `google-services.json` ووضعه في `android/app/`
3. تنزيل Service Account JSON وإضافته كـ secret في Lovable Cloud باسم `FIREBASE_SERVICE_ACCOUNT`

سأقدم له شرح مصور خطوة بخطوة عند الوصول لهذه المرحلة.

### المرحلة 6: بناء ملف APK
بعد انتهاء كل ما سبق، يحتاج المستخدم تنفيذ هذه الخطوات على حاسوبه (مرة واحدة فقط):
1. تصدير المشروع من Lovable إلى GitHub (زر Export to GitHub).
2. سحب المشروع: `git clone <repo>`
3. تثبيت: `npm install`
4. إضافة Android: `npx cap add android`
5. مزامنة: `npx cap sync android`
6. فتح المشروع: `npx cap open android` (يفتح Android Studio)
7. من Android Studio: Build → Build Bundle(s)/APK(s) → Build APK
8. الملف الناتج: `android/app/build/outputs/apk/debug/app-debug.apk`

التحديثات المستقبلية: فقط `git pull && npm run build && npx cap sync` ثم إعادة البناء — أي تغيير في الكود لا يحتاج إعادة بناء كاملة طالما الجهاز متصل بالإنترنت (الكود يحدث online).

---

## ما يجب تحضيره من طرفك
1. **حساب Google** (إن لم يكن لديك) لإنشاء مشروع Firebase مجاني.
2. **حاسوب Windows/Mac/Linux** مع 8GB RAM على الأقل لتشغيل Android Studio (مجاني، حجمه ~5GB).
3. **حساب GitHub** (مجاني) لتصدير المشروع.

---

## ما لن أحتاجه منك الآن
لن أطلب أي مفاتيح أو ملفات حالياً. سأنفذ المراحل 1-4 بالكامل أولاً، ثم في المرحلة 5 أعطيك دليل مصور لإعداد Firebase وأطلب الـ Service Account.

---

## نقاط مهمة
- **التطبيق سيفتح كتطبيق native كامل** — بدون شريط عنوان أو أزرار متصفح.
- **الإشعارات تصل في كل الحالات**: تطبيق مفتوح، في الخلفية، مغلق تماماً، الجهاز نائم.
- **الكود يبقى موحداً**: نفس الكود يعمل في الويب وعلى الموبايل، لا حاجة لصيانة نسختين.
- **لا يحتاج Google Play Store**: الـ APK يُثبت مباشرة على أي جهاز Android (مع تفعيل "تثبيت من مصادر غير معروفة").
- **التحديثات سريعة**: تغييرات الواجهة تصل فوراً عبر الإنترنت بدون إعادة بناء APK، فقط التغييرات التي تمس الكود الـ native تحتاج بناء جديد.

هل تريد المتابعة بهذه الخطة؟

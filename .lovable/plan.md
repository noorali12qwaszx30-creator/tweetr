# خطة: نظام تحديث إجباري للتطبيق عبر GitHub Releases

## الفكرة العامة
كل بناء جديد على GitHub Actions يُنشئ Release برقم متزايد (`build-N`) ويرفع ملف APK كأصل (asset). التطبيق يحمل داخله رقم البناء الذي بُني به (`VITE_APP_BUILD`)، ويستعلم من GitHub API عن أحدث Release. إذا كان رقم Release أكبر من رقمه → تظهر **شاشة كاملة تمنع الاستخدام** بها زر "تحميل التحديث" يفتح رابط APK مباشرة.

---

## التغييرات المطلوبة

### 1) GitHub Actions Workflow (`.github/workflows/build-android-apk.yml`)
- حقن متغيرات بيئة Vite قبل خطوة `npm run build`:
  - `VITE_APP_BUILD=${{ github.run_number }}`
  - `VITE_GITHUB_REPO=<owner>/<repo>` (يُحفظ كـ Repository Variable أو يُكتشف تلقائياً من `${{ github.repository }}`)
- إنشاء Release **في كل push إلى main** (وليس فقط عند `workflow_dispatch`) مع:
  - `tag_name: build-${{ github.run_number }}`
  - رفع `app-debug.apk` كأصل باسم ثابت `tweetr.apk` ليصبح رابط التحميل قابلاً للتنبؤ.
- اختياري: إضافة ملف `latest.json` كأصل يحتوي `{ build, version, apkUrl, mandatory: true, notes }`.

### 2) ملف جديد: `src/hooks/useForceUpdateCheck.ts`
- يقرأ `import.meta.env.VITE_APP_BUILD` و `VITE_GITHUB_REPO`.
- عند بدء التطبيق وكل 5 دقائق + عند العودة للتبويب:
  - `GET https://api.github.com/repos/{repo}/releases/latest`
  - يستخرج رقم البناء من `tag_name` (مثل `build-42`).
  - يستخرج رابط الـ APK من `assets[].browser_download_url`.
- يخزن النتيجة في حالة عامة (Zustand بسيط أو Context) ليستهلكها overlay.
- يميّز بين بيئة الويب وبيئة Capacitor عبر `Capacitor.isNativePlatform()`:
  - **على Android فقط**: تحديث إجباري بشاشة حجب + رابط APK.
  - **على الويب**: يبقى توست `useVersionCheck` الحالي (إعادة تحميل الصفحة).

### 3) ملف جديد: `src/components/ForceUpdateOverlay.tsx`
شاشة `fixed inset-0 z-[100]` (أعلى من `OfflineOverlay`) تظهر فقط حين يوجد إصدار أحدث على Android:
- خلفية برتقالية بهوية Twitter
- أيقونة تحديث + عنوان "يتوفر تحديث جديد إلزامي"
- النسخة الحالية / النسخة الجديدة
- ملاحظات الإصدار (من حقل `body` في GitHub Release)
- زر كبير: **"تحميل التحديث الآن"** → يفتح رابط APK عبر:
  - `Browser.open({ url })` من `@capacitor/browser` (لتجنّب فتح WebView داخلي)
- لا يوجد زر إغلاق ولا تجاوز.

### 4) دمج في `src/App.tsx`
- تفعيل `useForceUpdateCheck()` بجانب `useVersionCheck()`.
- إضافة `<ForceUpdateOverlay />` بعد `<OfflineOverlay />`.

### 5) إضافة تبعية
- `@capacitor/browser` لفتح رابط التحميل في المتصفح الافتراضي بدلاً من WebView.

---

## التفاصيل التقنية

### كيف يحصل التطبيق على رقم بنائه؟
عبر متغير Vite يُحقن وقت البناء في GitHub Actions:
```
env:
  VITE_APP_BUILD: ${{ github.run_number }}
  VITE_GITHUB_REPO: ${{ github.repository }}
```
يُقرأ في الكود: `Number(import.meta.env.VITE_APP_BUILD ?? 0)`.

### مقارنة الإصدارات
```text
tag_name: "build-42"  →  latestBuild = 42
currentBuild = VITE_APP_BUILD (e.g. 40)
if (latestBuild > currentBuild)  → فرض التحديث
```

### رابط APK مستقر
داخل خطوة Release في الـ workflow، نعيد تسمية الأصل:
```
files: android/app/build/outputs/apk/debug/tweetr.apk
```
ليصبح الرابط دائماً:
`https://github.com/<owner>/<repo>/releases/download/build-N/tweetr.apk`

### حالات الفشل
- لا إنترنت → لا يحدث شيء (شاشة `OfflineOverlay` تتولى الأمر).
- GitHub API rate limit (60/ساعة للـ unauthenticated) → الفحص كل 5 دقائق + cache في الذاكرة كافٍ ولا يتجاوز الحد.
- المستودع خاص → يجب عمل Release عام أو إضافة token (نتجنب هذا — يفترض المستودع عام).

---

## ما أحتاج تأكيده منك
1. ما **owner/name مستودع GitHub**؟ (مثلاً `username/tweetr`) — لأستطيع وضعه كقيمة افتراضية في حال غياب متغير البيئة.
2. هل تريد **التحديث الإجباري على الويب أيضاً** (مع زر إعادة تحميل) أم يكفي السلوك الحالي (توست + إعادة تحميل تلقائية بعد 8 ثوانٍ)؟
3. هل تريد إنشاء Release **تلقائياً عند كل push** أم فقط عند تشغيل يدوي (`workflow_dispatch`) كما هو الآن؟ — التحديث الإجباري لا يعمل إلا إذا أصبح هناك Release جديد فعلاً.

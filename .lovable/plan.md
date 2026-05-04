# إصلاح المكالمات الصوتية

المكالمة تبقى "جارٍ الاتصال..." لثلاثة أسباب جوهرية في `useWebRTC.ts`:

1. **سباق على ICE candidates**: الطرفان يقرآن `ice_candidates` ثم يكتبانه عبر `update` — كل طرف يدوس على مرشحات الطرف الآخر، فلا يصل الاتصال لمرحلة `connected`.
2. **لا يوجد TURN server**: حاليًا فقط STUN من Google. على شبكات الجوال/NAT المتماثل لا يمر الصوت ويبقى الاتصال معلقًا.
3. **لا يوجد تحقق من حياة الاتصال (بصمة)**: لا توجد طريقة لإسقاط مكالمة معطّلة ولا للتأكد أن الطرف الآخر مايزال مرتبطًا.

## الخطة

### 1. جدول مستقل لـ ICE Candidates
- إنشاء جدول `chat_ice_candidates` (call_id, from_role caller/callee, candidate jsonb, created_at) مع RLS وتفعيل Realtime.
- بدل update المتسلسل، كل طرف يعمل INSERT مباشرة عند `onicecandidate`.
- كل طرف يشترك في INSERT events للمكالمة، ويضيف فقط مرشحات الطرف الآخر مع تتبع `appliedIds` لتجنب التكرار.

### 2. إضافة خوادم TURN عمومية مجانية
- إضافة `openrelay.metered.ca` (UDP/TCP/TLS على بورتات 80/443) إلى `ICE_SERVERS` بجانب STUN الحالي.
- هذا يحل مشكلة عدم الاتصال على شبكات NAT الصارمة (4G/LTE).

### 3. بصمة الاتصال (Heartbeat)
- أثناء المكالمة النشطة، كل طرف يحدّث `chat_calls.last_ping_at` كل 3 ثواني.
- إذا لم تتحدث البصمة من الطرف الآخر لمدة 10 ثواني → إنهاء تلقائي مع رسالة "انقطع الاتصال".
- في `ActiveCallScreen` و`useCallSession` نراقب `connectionState`/`iceConnectionState` ونعرض الحالة فعليًا (يتصل / متصل / إعادة محاولة / انقطع).

### 4. تحسينات إضافية على `useCallSession`
- إصلاح ترتيب: الاشتراك على القناة **قبل** كتابة الـ offer (موجود لكن سيتم تأكيده).
- المتصل: عند وصول `webrtc_answer` نفحص `signalingState !== 'stable'` قبل `setRemoteDescription` لتجنّب أخطاء.
- تطبيق `pc.oniceconnectionstatechange` لإظهار "إعادة المحاولة..." عند `disconnected` و`onEnd` فقط عند `failed/closed`.
- المتلقّي: ضمان عدم استدعاء `setRemoteDescription` للأوفر مرتين (تتبع علم).

## الملفات المتأثرة

- **جديد**: `supabase/migrations/...` — جدول `chat_ice_candidates` + RLS + إضافته إلى `supabase_realtime` + عمود `last_ping_at` في `chat_calls`.
- **تعديل**: `src/hooks/useWebRTC.ts` — منطق ICE الجديد + TURN + heartbeat + حالات.
- **تعديل**: `src/components/chat/ActiveCallScreen.tsx` — عرض حالة الاتصال (connecting/connected/reconnecting) وزر إعادة المحاولة.

## نتيجة متوقعة
بعد التطبيق: المكالمة تنتقل من "جارٍ الاتصال..." إلى "متصل" خلال 2-5 ثواني حتى على شبكات الجوال، ويتم اكتشاف الانقطاع تلقائيًا خلال 10 ثواني.

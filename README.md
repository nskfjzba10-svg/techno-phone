# تكنو فون — Techno Phone (العراق)

منصة متكاملة لبيع الأجهزة الذكية، خدمات الصيانة وتتبع التذاكر، التقييمات الموثّقة، بطاقات الضمان الإلكترونية (QR)، واستبدال الأجهزة (Trade-In) في المحافظات العراقية.

## المتطلبات الأساسية
- **Node.js v22+**
- حساب **Firebase** (مربوط بإعدادات `firebase-applet-config.json` وقواعد `firestore.rules`)

## قاعدة البيانات والتخزين
يعتمد المشروع على نظامين متكاملين لقواعد البيانات:
1. **قاعدة بيانات علائقية SQLite حقيقية (ACID Relational DB):**
   - تعمل مباشرة عبر المحرك المدمج في Node.js (`node:sqlite`).
   - تُحفظ البيانات في الملف الدائم: `data/technophone.sqlite`.
   - تدعم نمط الأداء الفائق والوصول المتزامن `WAL Mode`.
   - تحتوي على جداول مهيكلة بالكامل: `users`, `stores`, `products`, `bookings`, `messages`, `reviews`, `wishlists`, `notifications`, `tradeins`.
   - يتم حفظ نسخة احتياطية فورية تلقائياً بصيغة JSON في `data/technophone-db.json`.

2. **قاعدة بيانات سحابية Google Firebase Firestore:**
   - تستخدم لمزامنة حسابات المستخدمين والمتاجر وتذاكر الصيانة والتقييمات سحابياً.
   - محمية بقواعد أمان مشددة في `firestore.rules`.

## التشغيل المحلي
```bash
npm install --legacy-peer-deps
npm run dev
```
يعمل التطبيق محلياً على المنفذ `3000`: `http://localhost:3000`

## البناء والتشغيل للإنتاج
```bash
npm install
npm run build
npm start
```

## النشر الموصى به (بدون فقدان البيانات)
يحفظ الخادم الخلفي (`server.ts`) قاعدة المتاجر والمنتجات والملفات المرفوعة في مجلد `data/` بجانب المزامنة السحابية مع Firestore. لضمان بقاء البيانات دائماً:

### 1. النشر على Railway
1. ارفع المشروع إلى مستودع **GitHub**.
2. أنشئ مشروعاً جديداً في **Railway** واختر **Deploy from GitHub repo**.
3. أضف **Volume** من إعدادات الخدمة واربطه بالمسار: `/app/data`.
4. أضف متغيرات البيئة التالية في قسم **Variables**:
   - `NODE_ENV=production`
   - `AUTH_SECRET=` (أدخل نصاً سرياً طويلاً وعشوائياً)

### 2. النشر على VPS (Ubuntu / Coolify / Docker)
يمكنك بناء الحاوية مباشرة عبر ملف `Dockerfile` المرفق مع ربط مجلد `/app/data` بـ Volume دائم، أو التشغيل عبر `pm2`:
```bash
npm install
npm run build
NODE_ENV=production AUTH_SECRET="your-secret" npm start
```

### 3. إعداد Firebase بعد النشر
بعد الحصول على رابط الموقع النهائي:
1. افتح **Firebase Console** ← **Authentication** ← **Settings** ← **Authorized domains**.
2. أضف رابط النطاق الجديد ليعمل تسجيل الدخول بحساب Google.
3. تأكد من مراجعة قواعد `firestore.rules` ونشرها عند أي تعديل مستقبلي.

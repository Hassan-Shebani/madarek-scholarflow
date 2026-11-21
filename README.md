# مدارك | ScholarFlow - منصة بحث علمية ذكية

## 📖 وصف المشروع
منصة مدارك (ScholarFlow) هي منصة بحث علمية ذكية مصممة لمساعدة researchers and academics على اكتشاف، تحليل، وإدارة الأدبيات العلمية بفعالية. المنصة تجمع بين عدة محركات بحث أكاديمية وتوفر أدوات لتصنيف、评价، and synthesis of research papers.

## 🛠️ المتطلبات التقنية
- متصفح حديث (Chrome, Firefox, Safari, Edge)
- اتصال إنترنت (للحصول على نتائج من محركات البحث)
- دعم JavaScript

## 🚀 طريقة التشغيل

### الخيار 1: التشغيل المحلي (تطوير واختبار)
1. cloned أو انسخ المجلد إلى جهازك
2. افتح Terminal في المجلد
3. شغل الأمر: `python -m http.server`
4. افتح المتصفح على: `http://localhost:8000`
5. أو استخدم Live Server في VS Code (F1 → "Live Server: Open with Live Server")

### الخيار 2: النشر على GitHub Pages
1. ارفع المجلد إلى repository على GitHub
2. اذهب إلى Settings → Pages
3. وحدد المصدر: `main branch / (root)`
4. الموقع will be published at `https://yourusername.github.io/reponame/`

### الخيار 3: الملف الثابت (بصفه محدودة)
يمكن فتح `index.html` مباشرة، لكن some features (API search) will be limited due to CORS and file:// restrictions.

## 🔧 التخصيص

### إضافة مفاتيح API
لرخص true search functionality، أضف مفاتيح API في ملف `api/config.js`:
- OpenAlex: مفتاح اختياري (التشغيل يعمل بدون مفتاح)
- Crossref: لا requires key للعمليات الأساسية
- CORE: مفتاح اختياري

### تغيير الثيمات
المنصة تدعم 7 ثيمات يمكن تبديلها عبر زر "المظهر" في شريط العلويات:
- default (الافتراضي)
- v5 (أزرق فاتح)
- v6 (أزرق داكن)
- v7 (يستخدم أنماط الدوائح الحالية)
- v8 (أنماط المشروع)
- v10 (أنماط الهيرو)
- v11 (أنماط المشروع/النظام)

لإضافة ثيم جديد، أضف قواعد CSS داخل `styles.css` within `[data-theme="اسم_الثيم"] { ... }` block.

## 📁 هيكل المشروع
```
Madarek_ScholarFlow_Smart_Query/
├── index.html           # الصفحة الهيكلية
├── styles.css           # الأنماط (includes theme system)
├── app.js             # التطبيق الرئيسي (ES6 modules)
├── api/               # مجلد المفاتيح والإعدادات
│   └── config.js       # إعدادات المحركات
├── data/              # قاعدة البيانات (اختياري)
└── README.md           # هذه الصفحة
```

## ✨ الميزات
- 🔍 البحث المتعدد المحركات (OpenAlex, Crossref, CORE)
- 📚 إدارة المكتبة الشخصية (حفظ الدراسات)
- 📋 تنسيق الاستشارات (APA, MLA, IEEE, BibTeX)
- 🎨 نظام الثيمات (7 ثيمات قابلة للتبديل)
- 📊 مصفوفة الأدبيات (Matrix view)
- 📈 تدفق PRISMA (لتقييمات الأدبيات)
- ⬡ синтеز للدراسات (Synthesis tool)
- ♿ دعم إمكانية الوصول (ARIA labels)
- ⏱ debounce على حقل البحث (300ms)
- 💾 persistence (localStorage للمكتبة والتاريخ)

## 🛣 roadmap (المستقبل القريب)
- [x] هيكل المشروع الأساسي
- [x] التكامل مع OpenAlex API
- [x] نظام الثيمات
- [x] تصدير الاستشارات
- [ ] التكامل مع Crossref full API
- [ ] CORE full integration
- [ ] Google Scholar scraper
- [ ] PDF download links
- [ ] Collaborative features (shared libraries)
- [ ] Advanced filters and metadata

## 👥 المساهمة
يمكنك المساهمة في المنصة من خلال:
1. الإبلاغ عن الأخطاء (issue)
2. اقتراح الميزات (feature request)
3. إضافة محركات بحث جديدة
4. تحسين UI/UX
5. إضافة ترجمات لغات أخرى

## 📄 الترخيص
هذا المشروع لأغراض أكاديمية وبحثية. designed by د. حسن الشيباني.

## 📞 الاتصال
للاستفسارات، يرجى التواصل مع: Dr. Hassan Al-Shibani
import React from 'react';
import { WORKSHOP_IMAGE } from '../data/catalog';
import { SafeImage } from './SafeImage';

const STANDARDS = [
  {
    index: '01.',
    title: 'تشخيص مجهري بدون فتح عشوائي',
    description:
      'تُفحص جميع الأجهزة بأجهزة قياس تيار ومجاهر إلكترونية دقيقة لتحديد العطل الفعلي خلال دقائق وتقديم عرض سعر ثابت قبل بدء العمل.',
  },
  {
    index: '02.',
    title: 'قطع غيار أصلية مع نقل البيانات والختم',
    description:
      'نلتزم بتركيب الشاشات والبطاريات المعتمدة مع الحفاظ على بيانات الخصوصية ونقل مستشعرات True Tone وإعادة الختم المقاوم للرطوبة.',
  },
  {
    index: '03.',
    title: 'اختبار جودة من 18 نقطة بعد الإصلاح',
    description:
      'لا يغادر أي جهاز المختبر قبل اجتياز اختبارات الكاميرا والشبكة والشحن السريع وجودة اللمس مع توثيق الضمان برقم التذكرة.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'استبدلت شاشة آيفون 15 برو خلال 50 دقيقة فقط، مع عمل True Tone بشكل مطابق للأصل تماماً وبضمان سنة كاملة في الفاتورة.',
    author: 'عمار العبيدي',
    role: 'مهندس معماري · بغداد',
  },
  {
    quote:
      'اشتريت ماك بوك برو M3 عبر المتجر ووصلني في نفس اليوم مغلفاً بختم المصنع مع فاتورة رسمية، وتجربة التتبع كانت واضحة جداً.',
    author: 'زينب الموسوي',
    role: 'مصممة منتجات رقمية · البصرة',
  },
  {
    quote:
      'أنقذوا جهاز جالاكسي S24 بعد تعرضه لسوائل في اللوحة الأم في وقت قياسي مع استعادة كافة ملفات العمل دون أي فقدان.',
    author: 'هلكوت بارزاني',
    role: 'مدير عمليات تقنية · أربيل',
  },
];

export const WorkshopAboutSection: React.FC = () => {
  return (
    <section
      id="about"
      className="py-14 lg:py-20 bg-white border-t border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Lab Standards Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-5">
            <div className="h-full min-h-[260px] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <SafeImage
                src={WORKSHOP_IMAGE}
                alt="مختبر صيانة تكنو فون المجهز بالمجاهر والأدوات الهندسية"
                fallbackTitle="مختبر تكنو فون للصيانة"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                معايير مختبر تكنو فون الهندسية
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                أكثر من 14,500 عملية صيانة ناجحة خلال السنوات الثلاث الماضية بنسبة رضا 98.4% بفضل الشفافية التامة في الأسعار وقطع الغيار.
              </p>
            </div>

            <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
              {STANDARDS.map((item) => (
                <div key={item.index} className="py-4 flex items-start gap-4">
                  <span className="font-mono text-sm font-semibold text-blue-700 tabular-nums pt-0.5 shrink-0">
                    {item.index}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Attributable Customer Reviews (Adjacent to claims) */}
        <div className="pt-4">
          <h3 className="font-display text-xl font-bold text-slate-900 mb-6">
            تجارب عملائنا في البيع والصيانة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item) => (
              <blockquote
                key={item.author}
                className="bg-[#F8F9FA] border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4"
              >
                <p className="text-sm text-slate-700 leading-relaxed">
                  «{item.quote}»
                </p>
                <footer className="pt-3 border-t border-slate-200">
                  <div className="text-sm font-semibold text-slate-900">
                    {item.author}
                  </div>
                  <div className="text-xs text-slate-500">{item.role}</div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

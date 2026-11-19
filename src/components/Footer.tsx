import React from 'react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 dark:bg-slate-900/95 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          <div className="space-y-3">
            <div className="font-display text-xl font-extrabold text-white">
              تكنو فون
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              وجهتك الموثوقة لشراء أحدث الأجهزة الذكية وخدمات الصيانة المعتمدة بقطع غيار أصلية وضمان موثق.
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-sm font-semibold text-white">الأقسام الرئيسية</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('store')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  متجر الأجهزة
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('repair')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  حجز صيانة وحاسبة التكلفة
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('track')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  تتبع حالة الطلبات
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-sm font-semibold text-white">ساعات العمل</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              السبت — الخميس: 09:30 صباحاً حتى 11:00 مساءً
              <br />
              الجمعة: 04:00 عصراً حتى 11:00 مساءً
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-sm font-semibold text-white">التواصل والموقع</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              المنصور، شارع 14 رمضان — بغداد، العراق
              <br />
              <span dir="ltr" className="font-mono tabular-nums text-slate-300">
                0770 148 2020
              </span>
              <br />
              support@technophone.iq
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>© 2026 تكنو فون. جميع الحقوق محفوظة.</span>
          <span>بيع الأجهزة الذكية · الصيانة الهندسية المعتمدة</span>
        </div>
      </div>
    </footer>
  );
};

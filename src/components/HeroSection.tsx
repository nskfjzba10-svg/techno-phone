import React from 'react';
import { ArrowLeft, Wrench } from 'lucide-react';
import { HERO_IMAGE } from '../data/catalog';
import { SafeImage } from './SafeImage';

interface HeroSectionProps {
  onExploreStore: () => void;
  onStartRepair: () => void;
}

const COMMITMENTS = [
  {
    value: 'حتى 24 شهراً',
    label: 'ضمان رسمي على الأجهزة الجديدة والمجددة',
  },
  {
    value: '100% أصلية',
    label: 'قطع غيار معتمدة بفحص معملي دقيق',
  },
  {
    value: '30 - 60 دقيقة',
    label: 'إنجاز أغلب عمليات استبدال الشاشة والبطارية',
  },
  {
    value: 'شحن وتوصيل',
    label: 'مجاني للطلبات فوق 150,000 د.ع مع الدفع عند الاستلام',
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreStore,
  onStartRepair,
}) => {
  return (
    <section id="top" className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Copy Column */}
          <div className="lg:col-span-6 flex flex-col justify-center py-2">
            <p className="text-sm font-medium text-blue-700 mb-3">
              منصة المتاجر المعتمدة لبيع وصيانة الأجهزة الذكية
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-slate-900 leading-[1.22] [text-wrap:balance] max-w-xl mb-5">
              تصفح المتاجر المعتمدة، قارن الأجهزة، واحجز الصيانة أو الشراء مباشرة
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
              في تكنو فون يمكنك استكشاف عشرات المتاجر المتخصصة، المقارنة بين الأجهزة، التواصل الفوري مع أي متجر، وحجز موعد صيانة أو شراء بضمان رسمي.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onExploreStore}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <span>تصفح المتاجر والمنتجات</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onStartRepair}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <Wrench className="w-4 h-4 text-slate-700" />
                <span>طلب صيانة جهاز</span>
              </button>
            </div>
          </div>

          {/* Media Column */}
          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[260px] lg:min-h-[400px] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <SafeImage
                src={HERO_IMAGE}
                alt="مجموعة أجهزة تكنو فون الذكية وأدوات الصيانة الدقيقة"
                fallbackTitle="تكنو فون — الأجهزة والصيانة"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Full-width 4-column commitment strip below hero split */}
        <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {COMMITMENTS.map((item) => (
            <div key={item.value} className="space-y-1">
              <div className="font-display text-lg font-bold text-slate-900 tabular-nums">
                {item.value}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

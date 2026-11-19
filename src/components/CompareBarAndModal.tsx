import React, { useEffect } from 'react';
import { GitCompare, ShoppingBag, CalendarCheck, X } from 'lucide-react';
import { formatCurrency } from '../data/catalog';
import { Product } from '../types';
import { SafeImage } from './SafeImage';

interface CompareBarAndModalProps {
  compareItems: Product[];
  isModalOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onRemoveFromCompare: (productId: string) => void;
  onClearCompare: () => void;
  onAddToCart: (product: Product) => void;
  onReserveProduct: (product: Product) => void;
}

export const CompareBarAndModal: React.FC<CompareBarAndModalProps> = ({
  compareItems,
  isModalOpen,
  onOpenModal,
  onCloseModal,
  onRemoveFromCompare,
  onClearCompare,
  onAddToCart,
  onReserveProduct,
}) => {
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, onCloseModal]);

  if (compareItems.length === 0 && !isModalOpen) return null;

  const [firstProduct, secondProduct] = compareItems;

  const allSpecLabels = Array.from(
    new Set([
      ...(firstProduct?.specs.map((s) => s.label) || []),
      ...(secondProduct?.specs.map((s) => s.label) || []),
    ])
  );

  return (
    <>
      {/* Slim bottom compare bar */}
      {compareItems.length > 0 && !isModalOpen && (
        <div className="fixed bottom-4 inset-x-4 z-40 max-w-4xl mx-auto bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-xl border border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <GitCompare className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
              <span className="font-semibold truncate max-w-[140px] sm:max-w-[200px]">
                {firstProduct?.name}
              </span>
              {secondProduct ? (
                <>
                  <span className="text-slate-400">مقابل</span>
                  <span className="font-semibold truncate max-w-[140px] sm:max-w-[200px]">
                    {secondProduct.name}
                  </span>
                </>
              ) : (
                <span className="text-slate-300">
                  — اختر منتجاً ثانياً للمقارنة (1/2)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={compareItems.length < 2}
              onClick={onOpenModal}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 rounded-lg transition-colors cursor-pointer whitespace-nowrap min-h-[36px]"
            >
              مقارنة المنتجين
            </button>
            <button
              type="button"
              onClick={onClearCompare}
              aria-label="مسح المقارنة"
              className="px-2.5 py-2 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              مسح
            </button>
          </div>
        </div>
      )}

      {/* Full Side-by-Side Comparison Modal */}
      {isModalOpen && firstProduct && secondProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 dark:bg-black/70 backdrop-blur-[2px]"
          onClick={onCloseModal}
          role="dialog"
          aria-modal="true"
          aria-label="مقارنة المنتجين"
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  مقارنة تفصيلية بين المنتجين
                </h2>
              </div>
              <button
                type="button"
                onClick={onCloseModal}
                aria-label="إغلاق نافذة المقارنة"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-sm text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 pl-4 text-xs font-semibold text-slate-500 dark:text-slate-400 w-36 align-top">
                      المعيار
                    </th>
                    {[firstProduct, secondProduct].map((item) => (
                      <th key={item.id} className="py-3 px-4 align-top w-1/2">
                        <div className="space-y-3">
                          <div className="aspect-[4/3] w-full max-w-[240px] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <SafeImage
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
                              {item.storeName}
                            </div>
                            <div className="font-display text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                              {item.name}
                            </div>
                            <div className="text-lg font-extrabold text-blue-700 dark:text-blue-400 tabular-nums mt-1">
                              {formatCurrency(item.price)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveFromCompare(item.id)}
                            className="text-xs font-normal text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 underline cursor-pointer"
                          >
                            إزالة من المقارنة
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-3 pl-4 text-slate-500 dark:text-slate-400 font-medium">
                      العلامة التجارية
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {firstProduct.brand}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {secondProduct.brand}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pl-4 text-slate-500 dark:text-slate-400 font-medium">
                      الحالة
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                      {firstProduct.condition}
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                      {secondProduct.condition}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pl-4 text-slate-500 dark:text-slate-400 font-medium">
                      مدة الضمان
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100 tabular-nums">
                      {firstProduct.warrantyMonths} شهراً
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100 tabular-nums">
                      {secondProduct.warrantyMonths} شهراً
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pl-4 text-slate-500 dark:text-slate-400 font-medium">
                      السعات المتوفرة
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {firstProduct.storageOptions.map((o) => o.label).join(' · ')}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {secondProduct.storageOptions.map((o) => o.label).join(' · ')}
                    </td>
                  </tr>
                  {allSpecLabels.map((label) => {
                    const val1 =
                      firstProduct.specs.find((s) => s.label === label)?.value || '—';
                    const val2 =
                      secondProduct.specs.find((s) => s.label === label)?.value || '—';
                    return (
                      <tr key={label}>
                        <td className="py-3 pl-4 text-slate-500 dark:text-slate-400 font-medium">
                          {label}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {val1}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                          {val2}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-4 pl-4 text-slate-500 dark:text-slate-400 font-medium">
                      الإجراء
                    </td>
                    {[firstProduct, secondProduct].map((item) => (
                      <td key={item.id} className="py-4 px-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onCloseModal();
                              onReserveProduct(item);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>حجز للشراء</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddToCart(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>أضف للسلة</span>
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

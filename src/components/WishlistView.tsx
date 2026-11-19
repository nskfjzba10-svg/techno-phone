import React from 'react';
import {
  BellRing,
  CalendarCheck,
  Heart,
  Plus,
  ShoppingBag,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import { formatCurrency } from '../data/catalog';
import { Product, WishlistItem } from '../types';
import { SafeImage } from './SafeImage';

interface WishlistViewProps {
  wishlistItems: WishlistItem[];
  products: Product[];
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onReserveProduct: (product: Product) => void;
  onGoToProducts: () => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  wishlistItems,
  products,
  onToggleWishlist,
  onSelectProduct,
  onQuickAdd,
  onReserveProduct,
  onGoToProducts,
}) => {
  const paired = wishlistItems
    .map((w) => ({
      wish: w,
      product: products.find((p) => p.id === w.productId) || null,
    }))
    .filter(
      (x): x is { wish: WishlistItem; product: Product } => x.product !== null
    );

  return (
    <section className="py-10 lg:py-14 bg-[#F8F9FA] dark:bg-slate-950 min-h-[75vh] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
              المفضلة وتنبيهات انخفاض السعر ({paired.length})
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              احفظ الأجهزة للمراجعة لاحقاً، وسيتم تنبيهك فور انخفاض سعر أي جهاز محفوظ في قائمتك.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToProducts}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>استعراض جميع الأجهزة</span>
          </button>
        </div>

        {paired.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
            <Heart className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
              قائمة المفضلة فارغة حالياً
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              اضغط على أيقونة القلب في أي بطاقة جهاز لحفظه هنا وتفعيل تنبيه انخفاض السعر.
            </p>
            <button
              type="button"
              onClick={onGoToProducts}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paired.map(({ wish, product }) => {
              const dropped = product.price < wish.savedPrice;
              const dropAmount = wish.savedPrice - product.price;
              return (
                <article
                  key={wish.id}
                  onClick={() => onSelectProduct(product)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    <SafeImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(product.id);
                      }}
                      aria-label="إزالة من المفضلة"
                      className="absolute top-3 left-3 w-9 h-9 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{product.categoryLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {product.storeName}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {product.name}
                      </h2>

                      {dropped ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 font-semibold">
                          <TrendingDown className="w-4 h-4 shrink-0" />
                          <span className="tabular-nums">
                            انخفض السعر بمقدار {formatCurrency(dropAmount)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <BellRing className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                          <span>تنبيه انخفاض السعر مُفعّل</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatCurrency(product.price)}
                        </div>
                        {wish.savedPrice > product.price && (
                          <div className="text-xs text-slate-400 line-through tabular-nums">
                            {formatCurrency(wish.savedPrice)}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReserveProduct(product);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer"
                        >
                          <CalendarCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                          <span>حجز</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAdd(product);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 text-white cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>للسلة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BatteryCharging,
  CalendarCheck,
  Check,
  GitCompare,
  Heart,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Star,
  X,
} from 'lucide-react';
import { formatCurrency } from '../data/catalog';
import { Product, VerifiedReview } from '../types';
import { SafeImage } from './SafeImage';

interface ProductModalProps {
  product: Product | null;
  reviews?: VerifiedReview[];
  isCompared: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    selectedStorage: string,
    selectedColor: string,
    unitPrice: number
  ) => void;
  onReserveProduct: (product: Product) => void;
  onToggleCompare: (product: Product) => void;
  onChatWithStoreId: (storeId: string) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  reviews = [],
  isCompared,
  isWishlisted = false,
  onToggleWishlist,
  onClose,
  onAddToCart,
  onReserveProduct,
  onToggleCompare,
  onChatWithStoreId,
}) => {
  const [storageIndex, setStorageIndex] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const gallery = useMemo(() => {
    if (!product) return [];
    const list = [product.image, ...(product.extraImages || [])].filter(Boolean);
    return Array.from(new Set(list));
  }, [product]);

  const storeReviews = useMemo(() => {
    if (!product) return [];
    return reviews.filter((r) => r.storeId === product.storeId);
  }, [reviews, product]);

  useEffect(() => {
    setStorageIndex(0);
    setColorIndex(0);
    setActiveImageIdx(0);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const activeStorage =
    product.storageOptions[storageIndex] || product.storageOptions[0];
  const activeColor = product.colors[colorIndex] || product.colors[0];
  const finalPrice = product.price + (activeStorage?.priceDelta ?? 0);
  const activeImage = gallery[activeImageIdx] || product.image;
  const hasDiscount =
    typeof product.oldPrice === 'number' && product.oldPrice > product.price;

  const handleAdd = () => {
    onAddToCart(product, activeStorage.label, activeColor.name, finalPrice);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>{product.categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              {product.storeName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onToggleWishlist && (
              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                aria-label="حفظ في المفضلة"
                className={`w-10 h-10 inline-flex items-center justify-center rounded-lg border cursor-pointer ${
                  isWishlisted
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`}
                />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق تفاصيل المنتج"
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6">
          <div className="md:col-span-6 space-y-4">
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
              <SafeImage
                src={activeImage}
                alt={product.name}
                fallbackTitle={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {gallery.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {gallery.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                      activeImageIdx === idx
                        ? 'border-blue-700 dark:border-blue-400'
                        : 'border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <SafeImage
                      src={imgUrl}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* IMEI & Used Device Inspection Report */}
            {(product.condition !== 'جديد' ||
              product.imei ||
              typeof product.batteryHealth === 'number') && (
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 space-y-2.5 text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>تقرير الفحص الهندسي ورقم IMEI</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {typeof product.batteryHealth === 'number' && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-500 dark:text-slate-400">
                        صحة البطارية
                      </div>
                      <div className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5 flex items-center gap-1">
                        <BatteryCharging className="w-3.5 h-3.5" />
                        <span>{product.batteryHealth}%</span>
                      </div>
                    </div>
                  )}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400">
                      حالة الفتح والصيانة
                    </div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {product.previouslyOpened
                        ? 'مُصان/مجدد بقطع أصلية'
                        : 'غير مفتوح (بحالة المصنع)'}
                    </div>
                  </div>
                  {product.imei && (
                    <div className="col-span-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400">
                        رقم IMEI المفحوص
                      </span>
                      <span
                        dir="ltr"
                        className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums"
                      >
                        {product.imei}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
                المواصفات الفنية
              </h4>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {product.specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="py-2 flex items-center justify-between gap-4"
                  >
                    <dt className="text-slate-500 dark:text-slate-400">
                      {spec.label}
                    </dt>
                    <dd className="text-slate-900 dark:text-slate-100 font-medium text-left">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="md:col-span-6 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {product.condition} · متوفر لدى {product.storeName}
                </div>
                <h2
                  id="pdp-title"
                  className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-2"
                >
                  {product.name}
                </h2>
                <div className="flex items-baseline gap-3">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatCurrency(finalPrice)}
                  </div>
                  {hasDiscount && (
                    <div className="text-sm text-slate-400 line-through tabular-nums">
                      {formatCurrency(
                        product.oldPrice! + (activeStorage?.priceDelta ?? 0)
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
                  {product.summary}
                </p>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  السعة / الإصدار
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.storageOptions.map((opt, idx) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setStorageIndex(idx)}
                      className={`px-3.5 py-2.5 text-sm rounded-lg border text-right transition-colors cursor-pointer flex items-center justify-between gap-2 min-h-[44px] ${
                        storageIndex === idx
                          ? 'border-blue-700 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/60 text-slate-900 dark:text-slate-100 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.priceDelta > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          +{opt.priceDelta.toLocaleString('en-US')} د.ع
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  اللون المختار:{' '}
                  <span className="font-normal text-slate-600 dark:text-slate-400">
                    {activeColor.name}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {product.colors.map((color, idx) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setColorIndex(idx)}
                      aria-label={color.name}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer min-h-[40px] ${
                        colorIndex === idx
                          ? 'border-blue-700 dark:border-blue-500 bg-slate-50 dark:bg-blue-950/50 text-slate-900 dark:text-slate-100'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span>{color.name}</span>
                      {colorIndex === idx && (
                        <Check className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  يشمل ضمان المتجر المعتمد لمدة{' '}
                  <strong className="text-slate-900 dark:text-slate-100 tabular-nums">
                    {product.warrantyMonths} شهراً
                  </strong>{' '}
                  مع بطاقة ضمان إلكترونية بـ QR.
                </span>
              </div>

              {/* Verified Reviews for this Store */}
              {storeReviews.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>تقييمات الزبائن الموثّقة للمتجر ({storeReviews.length})</span>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {storeReviews.slice(0, 3).map((rev) => (
                      <div
                        key={rev.id}
                        className="p-2.5 rounded-lg bg-[#F8F9FA] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {rev.customerName}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                            {rev.rating} / 5 ★
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {rev.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors duration-150 cursor-pointer min-h-[48px]"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>أضف إلى السلة — {formatCurrency(finalPrice)}</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReserveProduct(product);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[42px]"
                >
                  <CalendarCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>حجز للشراء</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCompare(product)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg border cursor-pointer min-h-[42px] ${
                    isCompared
                      ? 'border-blue-700 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <GitCompare className="w-4 h-4" />
                  <span>{isCompared ? 'مختار للمقارنة' : 'مقارنة'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onChatWithStoreId(product.storeId);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[42px]"
                >
                  <MessageSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>تواصل مع المتجر</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

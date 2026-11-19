import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  IRAQ_GOVERNORATES,
  estimateDeliveryBetweenGovernorates,
  formatCurrency,
  getGovernorateDistricts,
} from '../data/catalog';
import { apiRequest } from '../lib/api';
import {
  AuthUser,
  CartItem,
  PromoCode,
  StoreProfile,
  TrackingRecord,
} from '../types';
import { SafeImage } from './SafeImage';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  stores?: StoreProfile[];
  currentUser?: AuthUser | null;
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  onCompleteOrder: (order: TrackingRecord) => void;
  onTrackOrder: (orderId: string) => void;
  onOpenWarrantyCard?: (record: TrackingRecord) => void;
}

const FREE_SHIPPING_THRESHOLD = 350000;

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  items,
  stores = [],
  currentUser,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onCompleteOrder,
  onTrackOrder,
  onOpenWarrantyCard,
}) => {
  const defaultGov = currentUser?.city || 'بغداد';
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState(defaultGov);
  const [district, setDistrict] = useState(
    currentUser?.district || getGovernorateDistricts(defaultGov)[0] || ''
  );
  const [streetAddress, setStreetAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [completedOrder, setCompletedOrder] = useState<TrackingRecord | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && step === 'success' && items.length > 0) {
      setStep('cart');
    }
  }, [isOpen, items.length, step]);

  useEffect(() => {
    if (currentUser?.name && !fullName) {
      setFullName(currentUser.name);
    }
  }, [currentUser?.name, fullName]);

  const districts = useMemo(
    () => getGovernorateDistricts(governorate),
    [governorate]
  );

  const primaryStoreId = items[0]?.product.storeId || 'store-techno-baghdad';
  const primaryStore = stores.find((s) => s.id === primaryStoreId);
  const primaryStoreCity = primaryStore?.city || 'بغداد';

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const discountAmount = appliedPromo
    ? Math.round((subtotal * appliedPromo.discountPercent) / 100)
    : 0;

  const deliveryEstimate = estimateDeliveryBetweenGovernorates(
    primaryStoreCity,
    governorate
  );
  const shippingCost =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : deliveryEstimate.fee;
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  if (!isOpen) return null;

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoMsg('');
    try {
      const res = await apiRequest<{ promo: PromoCode }>('/api/promo-validate', {
        method: 'POST',
        body: JSON.stringify({
          storeId: primaryStoreId,
          code: promoInput.trim(),
        }),
      });
      setAppliedPromo(res.promo);
      setPromoMsg(`تم تطبيق خصم ${res.promo.discountPercent}% بنجاح`);
    } catch (err) {
      setAppliedPromo(null);
      setPromoMsg(
        err instanceof Error ? err.message : 'كود الخصم غير صالح لهذا المتجر'
      );
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!fullName.trim() || !phone.trim() || !streetAddress.trim()) {
      setErrorMsg('يرجى استكمال الاسم ورقم الجوال والعنوان التفصيلي.');
      return;
    }

    const orderNum = Math.floor(1000 + Math.random() * 8999);
    const orderId = `ORD-2026-${orderNum}`;
    const summaryTitle =
      items.length === 1
        ? `${items[0].product.name} (${items[0].selectedStorage})`
        : `${items[0].product.name} و ${items.length - 1} منتجات أخرى`;

    const primaryStoreName =
      items[0]?.product.storeName ||
      primaryStore?.name ||
      'تكنو فون — فرع المنصور الرئيسي';
    const maxWarranty = items.reduce(
      (max, it) => Math.max(max, it.product.warrantyMonths || 12),
      12
    );

    const orderRecord: TrackingRecord = {
      id: orderId,
      kind: 'order',
      storeId: primaryStoreId,
      storeOwnerId: primaryStore?.ownerId,
      storeName: primaryStoreName,
      customerId: currentUser?.id,
      customerName: fullName.trim(),
      phone: phone.trim(),
      governorate,
      district,
      title: summaryTitle,
      subtitle: `${primaryStoreName} · ${paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'دفع إلكتروني'} · ${governorate} - ${district}`,
      createdAt: 'الآن',
      stage: 1,
      stageLabels: [
        'تم تأكيد الطلب',
        'تجهيز وتغليف الشحنة',
        'مع مندوب التوصيل',
        'تم التسليم',
      ],
      estimatedReady: deliveryEstimate.etaLabel,
      totalPrice: total,
      deliveryFee: shippingCost,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      promoCode: appliedPromo?.code,
      notes: `عنوان التوصيل: ${governorate}، ${district}، ${streetAddress.trim()}. جارٍ مطابقة الأرقام التسلسلية وإصدار شهادة الضمان.`,
      warrantyLabel: `ضمان ${maxWarranty} شهراً + بطاقة ضمان QR`,
      warrantyMonths: maxWarranty,
      imei: items[0]?.product.imei,
    };

    onCompleteOrder(orderRecord);
    setCompletedOrder(orderRecord);
    onClearCart();
    setStep('success');
    setStreetAddress('');
    setPromoInput('');
    setAppliedPromo(null);
    setPromoMsg('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 dark:bg-black/70 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="سلة المشتريات"
    >
      <aside
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl border-r border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              {step === 'cart'
                ? 'سلة المشتريات'
                : step === 'checkout'
                  ? 'إتمام الطلب والتوصيل'
                  : 'تأكيد الطلب'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق السلة"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'success' && completedOrder ? (
            <div className="py-6 space-y-5">
              <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                  <span>تم تأكيد طلبك بنجاح</span>
                </div>
                <p className="text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  رقم الطلب:{' '}
                  <strong className="font-mono tabular-nums">
                    {completedOrder.id}
                  </strong>
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">العميل</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {completedOrder.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">الطلب</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 text-left">
                    {completedOrder.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">التوصيل</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {completedOrder.governorate} · {completedOrder.district}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    الإجمالي النهائي
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatCurrency(completedOrder.totalPrice)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {onOpenWarrantyCard && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenWarrantyCard(completedOrder);
                      onClose();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer min-h-[46px]"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>عرض الفاتورة وبطاقة الضمان QR</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onTrackOrder(completedOrder.id);
                    onClose();
                  }}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer min-h-[46px]"
                >
                  تتبع حالة الطلب الآن
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
              <ShoppingBag
                className="w-10 h-10 text-slate-300 dark:text-slate-600"
                strokeWidth={1.5}
              />
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  السلة فارغة حالياً
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  تصفح أحدث الهواتف والحواسيب وأضف ما يناسبك إلى السلة.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg cursor-pointer"
              >
                متابعة التصفح
              </button>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-4">
              {subtotal < FREE_SHIPPING_THRESHOLD ? (
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                  أضف منتجات بقيمة{' '}
                  <strong className="tabular-nums text-slate-900 dark:text-slate-100">
                    {formatCurrency(FREE_SHIPPING_THRESHOLD - subtotal)}
                  </strong>{' '}
                  للحصول على توصيل مجاني في كافة محافظات العراق.
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 font-medium">
                  طلبك مؤهل للتوصيل المجاني السريع.
                </div>
              )}

              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((item) => (
                  <li key={item.key} className="py-4 flex gap-3.5">
                    <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                      <SafeImage
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.product.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.key)}
                          aria-label={`حذف ${item.product.name}`}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.selectedStorage} · {item.selectedColor}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.key, -1)}
                            aria-label="إنقاص الكمية"
                            className="w-8 h-8 inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.key, 1)}
                            aria-label="زيادة الكمية"
                            className="w-8 h-8 inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <form
              id="checkout-form"
              onSubmit={handleCheckoutSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="order-name"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                >
                  الاسم الكامل
                </label>
                <input
                  id="order-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الثلاثي"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="order-phone"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                >
                  رقم الجوال للتواصل والتوصيل
                </label>
                <input
                  id="order-phone"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="077XXXXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-right font-mono tabular-nums focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    المحافظة
                  </label>
                  <select
                    value={governorate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setGovernorate(next);
                      setDistrict(getGovernorateDistricts(next)[0] || '');
                    }}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg cursor-pointer"
                  >
                    {IRAQ_GOVERNORATES.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    القضاء / المنطقة
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg cursor-pointer"
                  >
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="order-address"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                >
                  العنوان التفصيلي وأقرب نقطة دالة
                </label>
                <textarea
                  id="order-address"
                  rows={2}
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="الحي، الشارع، أقرب نقطة دالة"
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 resize-none"
                />
              </div>

              {/* Promo Code Validation */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Tag className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>كود الخصم (إن وجد لدى المتجر)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="BAGHDAD10"
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    {promoLoading ? 'جاري الفحص...' : 'تطبيق'}
                  </button>
                </div>
                {promoMsg && (
                  <p
                    className={`text-xs font-medium ${
                      appliedPromo
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {promoMsg}
                  </p>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  طريقة الدفع
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`py-2.5 px-3 text-xs font-medium rounded-lg border cursor-pointer min-h-[42px] ${
                      paymentMethod === 'cod'
                        ? 'border-blue-700 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    الدفع عند الاستلام
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2.5 px-3 text-xs font-medium rounded-lg border cursor-pointer min-h-[42px] ${
                      paymentMethod === 'card'
                        ? 'border-blue-700 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    زين كاش / ماستر كارد
                  </button>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs font-medium text-red-700 dark:text-red-400">
                  {errorMsg}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Footer Totals & Action */}
        {items.length > 0 && step !== 'success' && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-[#F8F9FA] dark:bg-slate-950 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>المجموع الفرعي</span>
                <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>خصم الكود ({appliedPromo?.code})</span>
                  <span className="tabular-nums font-semibold">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>التوصيل ({governorate})</span>
                <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                  {shippingCost === 0 ? 'مجاني' : formatCurrency(shippingCost)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-base font-bold text-slate-900 dark:text-slate-100">
                <span>الإجمالي</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3.5 px-5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer min-h-[48px]"
              >
                متابعة لإتمام الطلب
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[48px]"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  className="flex-1 py-3 px-5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer min-h-[48px]"
                >
                  تأكيد الطلب ({formatCurrency(total)})
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

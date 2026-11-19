import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, QrCode, Tag, X } from 'lucide-react';
import {
  IRAQ_GOVERNORATES,
  estimateDeliveryBetweenGovernorates,
  formatCurrency,
  getGovernorateDistricts,
} from '../data/catalog';
import { apiRequest } from '../lib/api';
import {
  AuthUser,
  Product,
  PromoCode,
  StoreProfile,
  TrackingRecord,
} from '../types';
import { SafeImage } from './SafeImage';

interface ReserveProductModalProps {
  product: Product | null;
  stores?: StoreProfile[];
  currentUser: AuthUser | null;
  onClose: () => void;
  onSubmitReservation: (record: TrackingRecord) => Promise<void>;
  onTrackReservation: (code: string) => void;
  onOpenWarrantyCard?: (record: TrackingRecord) => void;
}

export const ReserveProductModal: React.FC<ReserveProductModalProps> = ({
  product,
  stores = [],
  currentUser,
  onClose,
  onSubmitReservation,
  onTrackReservation,
  onOpenWarrantyCard,
}) => {
  const defaultGov = currentUser?.city || 'بغداد';
  const [storageIdx, setStorageIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [handover, setHandover] = useState<'pickup_store' | 'delivery'>(
    'pickup_store'
  );
  const [preferredDay, setPreferredDay] = useState('اليوم');
  const [governorate, setGovernorate] = useState(defaultGov);
  const [district, setDistrict] = useState(
    currentUser?.district || getGovernorateDistricts(defaultGov)[0] || ''
  );
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdRecord, setCreatedRecord] = useState<TrackingRecord | null>(
    null
  );

  useEffect(() => {
    setStorageIdx(0);
    setColorIdx(0);
    setQuantity(1);
    setError('');
    setCreatedRecord(null);
    setPromoInput('');
    setAppliedPromo(null);
    setPromoMsg('');
    if (currentUser?.name) setCustomerName(currentUser.name);
    if (currentUser?.city) {
      setGovernorate(currentUser.city);
      setDistrict(
        currentUser.district || getGovernorateDistricts(currentUser.city)[0] || ''
      );
    }
  }, [product?.id, currentUser?.name, currentUser?.city, currentUser?.district]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  const districts = useMemo(
    () => getGovernorateDistricts(governorate),
    [governorate]
  );

  if (!product) return null;

  const store = stores.find((s) => s.id === product.storeId);
  const storeCity = store?.city || 'بغداد';

  const activeStorage =
    product.storageOptions[storageIdx] || product.storageOptions[0];
  const activeColor = product.colors[colorIdx] || product.colors[0];
  const unitPrice = product.price + (activeStorage?.priceDelta ?? 0);
  const subtotal = unitPrice * quantity;
  const discountAmount = appliedPromo
    ? Math.round((subtotal * appliedPromo.discountPercent) / 100)
    : 0;
  const deliveryEstimate = estimateDeliveryBetweenGovernorates(
    storeCity,
    governorate
  );
  const deliveryFee = handover === 'delivery' ? deliveryEstimate.fee : 0;
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoMsg('');
    try {
      const res = await apiRequest<{ promo: PromoCode }>('/api/promo-validate', {
        method: 'POST',
        body: JSON.stringify({
          storeId: product.storeId,
          code: promoInput.trim(),
        }),
      });
      setAppliedPromo(res.promo);
      setPromoMsg(`تم تطبيق خصم ${res.promo.discountPercent}%`);
    } catch (err) {
      setAppliedPromo(null);
      setPromoMsg(err instanceof Error ? err.message : 'كود الخصم غير صالح');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!customerName.trim() || !phone.trim()) {
      setError('يرجى إدخال الاسم الكامل ورقم الجوال لتأكيد حجز المنتج.');
      return;
    }

    const code = `RES-${Math.floor(1000 + Math.random() * 8999)}`;
    const record: TrackingRecord = {
      id: code,
      kind: 'reservation',
      storeId: product.storeId,
      storeOwnerId: product.ownerId || store?.ownerId,
      storeName: product.storeName,
      customerId: currentUser?.id,
      customerName: customerName.trim(),
      phone: phone.trim(),
      governorate,
      district,
      title: `حجز شراء: ${product.name} (${activeStorage.label} · ${activeColor.name}) × ${quantity}`,
      subtitle:
        handover === 'pickup_store'
          ? `${product.storeName} · حجز للاستلام من الفرع (${preferredDay})`
          : `${product.storeName} · توصيل إلى ${governorate} - ${district}`,
      createdAt: 'الآن',
      stage: 1,
      stageLabels: [
        'تم تسجيل الحجز',
        'تجهيز الجهاز بالمخزن',
        'جاهز للاستلام / التوصيل',
        'تم إتمام الشراء',
      ],
      estimatedReady:
        handover === 'pickup_store'
          ? `محجوز للاستلام ${preferredDay}`
          : deliveryEstimate.etaLabel,
      totalPrice: total,
      deliveryFee,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      promoCode: appliedPromo?.code,
      notes: `تم حجز المنتج لدى ${product.storeName} باسم ${customerName.trim()} (${governorate} - ${district}).`,
      warrantyLabel: `ضمان ${product.warrantyMonths} شهراً`,
      warrantyMonths: product.warrantyMonths,
      imei: product.imei,
    };

    setSubmitting(true);
    try {
      await onSubmitReservation(record);
      setCreatedRecord(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الحجز');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="حجز منتج للشراء"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              حجز منتج للشراء
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {createdRecord ? (
            <div className="space-y-5 py-4">
              <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                  <span>تم حجز المنتج بنجاح لدى {product.storeName}</span>
                </div>
                <p className="text-sm text-emerald-900 dark:text-emerald-200">
                  رقم الحجز:{' '}
                  <strong className="font-mono tabular-nums">
                    {createdRecord.id}
                  </strong>
                </p>
              </div>
              <div className="space-y-2.5">
                {onOpenWarrantyCard && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenWarrantyCard(createdRecord);
                      onClose();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer min-h-[46px]"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>عرض إيصال الحجز وبطاقة الضمان QR</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onTrackReservation(createdRecord.id);
                    onClose();
                  }}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer min-h-[46px]"
                >
                  متابعة حالة الحجز
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3.5 p-3 rounded-lg bg-[#F8F9FA] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-12 rounded-md overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                  <SafeImage
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {product.storeName}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {product.name}
                  </div>
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                    {formatCurrency(total)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    السعة / الإصدار
                  </label>
                  <select
                    value={storageIdx}
                    onChange={(e) => setStorageIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  >
                    {product.storageOptions.map((opt, idx) => (
                      <option key={opt.label} value={idx}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    اللون
                  </label>
                  <select
                    value={colorIdx}
                    onChange={(e) => setColorIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  >
                    {product.colors.map((c, idx) => (
                      <option key={c.name} value={idx}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    طريقة الاستلام
                  </label>
                  <select
                    value={handover}
                    onChange={(e) =>
                      setHandover(e.target.value as 'pickup_store' | 'delivery')
                    }
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  >
                    <option value="pickup_store">استلام من المتجر والدفع هناك</option>
                    <option value="delivery">
                      توصيل للمنزل (+{formatCurrency(deliveryEstimate.fee)})
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    موعد الاستلام المفضل
                  </label>
                  <select
                    value={preferredDay}
                    onChange={(e) => setPreferredDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  >
                    <option value="اليوم">اليوم</option>
                    <option value="غداً">غداً</option>
                    <option value="خلال 48 ساعة">خلال 48 ساعة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    المحافظة
                  </label>
                  <select
                    value={governorate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setGovernorate(next);
                      setDistrict(getGovernorateDistricts(next)[0] || '');
                    }}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                  >
                    {IRAQ_GOVERNORATES.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    القضاء / المنطقة
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                  >
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="الاسم الثلاثي"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    رقم الجوال *
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="077XXXXXXXX"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-right font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Promo Code */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Tag className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>كود خصم المتجر (اختياري)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="BAGHDAD10"
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono uppercase text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    {promoLoading ? '...' : 'تطبيق'}
                  </button>
                </div>
                {promoMsg && (
                  <p
                    className={`text-[11px] font-medium ${
                      appliedPromo
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {promoMsg}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg cursor-pointer min-h-[46px]"
              >
                {submitting
                  ? 'جاري تأكيد الحجز...'
                  : `تأكيد حجز المنتج (${formatCurrency(total)})`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

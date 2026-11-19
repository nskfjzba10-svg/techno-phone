import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '../data/catalog';
import { uploadMediaFile } from '../lib/api';
import {
  AuthUser,
  Product,
  RepairDeviceType,
  StoreProfile,
  TradeInRequest,
} from '../types';
import { SafeImage } from './SafeImage';

interface TradeInViewProps {
  currentUser: AuthUser;
  stores: StoreProfile[];
  products: Product[];
  tradeIns: TradeInRequest[];
  onSubmitTradeIn: (payload: Partial<TradeInRequest>) => Promise<void>;
  onRespondTradeIn: (
    id: string,
    status: 'accepted' | 'rejected'
  ) => Promise<void>;
}

const BASE_ESTIMATES: Record<string, number> = {
  'iPhone 15 Pro Max': 980000,
  'iPhone 15 Pro': 850000,
  'iPhone 14 Pro': 690000,
  'iPhone 13 Pro': 560000,
  'Galaxy S24 Ultra': 860000,
  'Galaxy S23 Ultra': 650000,
  'MacBook Pro M2': 1450000,
  'iPad Pro M2': 740000,
};

export const TradeInView: React.FC<TradeInViewProps> = ({
  currentUser,
  stores,
  products,
  tradeIns,
  onSubmitTradeIn,
  onRespondTradeIn,
}) => {
  const [storeId, setStoreId] = useState(stores[0]?.id || 'store-techno-baghdad');
  const [deviceType, setDeviceType] = useState<RepairDeviceType>('smartphone');
  const [model, setModel] = useState('iPhone 14 Pro');
  const [storage, setStorage] = useState('256 جيجابايت');
  const [batteryHealth, setBatteryHealth] = useState<number>(89);
  const [cosmeticScore, setCosmeticScore] = useState<
    'excellent' | 'good' | 'fair'
  >('excellent');
  const [imei, setImei] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [targetProductId, setTargetProductId] = useState<string>(
    products[0]?.id || ''
  );
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const storeProducts = useMemo(() => {
    const list = products.filter((p) => p.storeId === storeId);
    return list.length > 0 ? list : products;
  }, [products, storeId]);

  const targetProduct = useMemo(
    () => products.find((p) => p.id === targetProductId) || null,
    [products, targetProductId]
  );

  const estimatedValue = useMemo(() => {
    const base = BASE_ESTIMATES[model] || 480000;
    const batteryFactor =
      batteryHealth >= 90 ? 1 : batteryHealth >= 82 ? 0.92 : 0.82;
    const conditionFactor =
      cosmeticScore === 'excellent'
        ? 1
        : cosmeticScore === 'good'
          ? 0.88
          : 0.72;
    const storageBonus = storage.includes('512')
      ? 90000
      : storage.includes('1 تيرا')
        ? 160000
        : 0;
    return (
      Math.round(((base + storageBonus) * batteryFactor * conditionFactor) / 5000) *
      5000
    );
  }, [model, batteryHealth, cosmeticScore, storage]);

  const netPayDifference = targetProduct
    ? Math.max(0, targetProduct.price - estimatedValue)
    : 0;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadMediaFile(file);
      setPhotoUrl(uploaded.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'تعذر رفع صورة الجهاز القديم'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!model.trim() || !phone.trim()) {
      setError('يرجى إدخال موديل الجهاز ورقم الجوال للتواصل.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitTradeIn({
        storeId,
        customerName: currentUser.name,
        phone: phone.trim(),
        deviceType,
        model: model.trim(),
        storage,
        batteryHealth,
        conditionNotes:
          conditionNotes.trim() ||
          `الحالة: ${cosmeticScore === 'excellent' ? 'نظيف جداً' : cosmeticScore === 'good' ? 'جيد' : 'يحتاج صيانة خفيفة'}`,
        imei: imei.trim() || undefined,
        photoUrl: photoUrl || undefined,
        estimatedValue,
        targetProductId: targetProductId || undefined,
        targetProductName: targetProduct?.name,
      });
      setSuccessMsg(
        'تم إرسال طلب تقييم الجهاز للمتجر بنجاح! سيصلك إشعار فور تثبيت عرض السعر النهائي.'
      );
      setConditionNotes('');
      setImei('');
      setPhotoUrl('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'تعذر إرسال طلب الاستبدال'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-10 lg:py-14 bg-[#F8F9FA] dark:bg-slate-950 min-h-[75vh] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
            سوم واستبدل جهازك القديم (Trade-In)
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            قيّم جهازك القديم فوراً واختر الجهاز الأحدث الذي ترغب به لدى أحد متاجر العراق المعتمدة مع دفع الفرق فقط.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Valuation Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
          >
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              بيانات جهازك الحالي
            </h2>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  المتجر المستلم للاستبدال *
                </label>
                <select
                  value={storeId}
                  onChange={(e) => {
                    const nextStore = e.target.value;
                    setStoreId(nextStore);
                    const firstProd = products.find(
                      (p) => p.storeId === nextStore
                    );
                    if (firstProd) setTargetProductId(firstProd.id);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  الجهاز الجديد المطلوب الاستبدال به
                </label>
                <select
                  value={targetProductId}
                  onChange={(e) => setTargetProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700"
                >
                  <option value="">تقييم نقدي / غير محدد بعد</option>
                  {storeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  نوع الجهاز
                </label>
                <select
                  value={deviceType}
                  onChange={(e) =>
                    setDeviceType(e.target.value as RepairDeviceType)
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                >
                  <option value="smartphone">هاتف ذكي</option>
                  <option value="tablet">تابلت / آيباد</option>
                  <option value="laptop">لابتوب</option>
                  <option value="smartwatch">ساعة ذكية</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  موديل جهازك القديم *
                </label>
                <input
                  type="text"
                  list="tradein-models"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="مثال: iPhone 14 Pro"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                />
                <datalist id="tradein-models">
                  {Object.keys(BASE_ESTIMATES).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  السعة التخزينية
                </label>
                <select
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                >
                  <option value="128 جيجابايت">128 جيجابايت</option>
                  <option value="256 جيجابايت">256 جيجابايت</option>
                  <option value="512 جيجابايت">512 جيجابايت</option>
                  <option value="1 تيرابايت">1 تيرابايت</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  صحة البطارية (%)
                </label>
                <input
                  type="number"
                  min={40}
                  max={100}
                  value={batteryHealth}
                  onChange={(e) =>
                    setBatteryHealth(
                      Math.min(100, Math.max(40, Number(e.target.value) || 85))
                    )
                  }
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono tabular-nums rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  النظافة الخارجية
                </label>
                <select
                  value={cosmeticScore}
                  onChange={(e) =>
                    setCosmeticScore(
                      e.target.value as 'excellent' | 'good' | 'fair'
                    )
                  }
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                >
                  <option value="excellent">نظيف جداً (بدون خدوش)</option>
                  <option value="good">جيد جداً (خدوش خفيفة)</option>
                  <option value="fair">مقبول / يحتاج صيانة</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  رقم الـ IMEI (اختياري — يسرّع التقييم)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  placeholder="35XXXXXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-right rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  رقم الهاتف للتواصل *
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="077XXXXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-right rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                ملاحظات الحالة والملحقات (الكرتونة، الشاحن، أي صيانة سابقة)
              </label>
              <textarea
                rows={2}
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="مثال: الجهاز مفتوح أم لا، يتوفر معه الكرتونة الأصلية..."
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>
                  {uploadingPhoto ? 'جاري الرفع...' : 'رفع صورة حقيقية للجهاز'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
              </label>
              {photoUrl && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <SafeImage
                    src={photoUrl}
                    alt="صورة الجهاز"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg cursor-pointer min-h-[46px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>
                {submitting
                  ? 'جاري إرسال الطلب للمتجر...'
                  : 'إرسال طلب التقييم والاستبدال'}
              </span>
            </button>
          </form>

          {/* Live Estimation Card & Past Requests */}
          <div className="lg:col-span-5 space-y-6">
            <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                التقدير التلقائي الفوري
              </div>
              <div className="font-display text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatCurrency(estimatedValue)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                القيمة التقديرية لجهازك ({model} · {storage} · بطارية {batteryHealth}%).
              </p>

              {targetProduct && (
                <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      سعر {targetProduct.name}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(targetProduct.price)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                    <span>يُخصم قيمة جهازك</span>
                    <span className="font-semibold tabular-nums">
                      -{formatCurrency(estimatedValue)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-2 font-extrabold text-slate-900 dark:text-slate-100">
                    <span>صافي الفرق المتوقع دفعه</span>
                    <span className="tabular-nums text-blue-700 dark:text-blue-400">
                      {formatCurrency(netPayDifference)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  الفحص النهائي يتم أمامك في المتجر خلال 10 دقائق مع استبدال فوري وفاتورة ضمان.
                </span>
              </div>
            </aside>

            {/* Existing Customer Trade-Ins */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                طلبات الاستبدال السابقة ({tradeIns.length})
              </h3>
              {tradeIns.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  لا توجد طلبات استبدال مرسلة بعد.
                </p>
              ) : (
                <div className="space-y-3">
                  {tradeIns.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {tr.model} ({tr.storage})
                        </span>
                        <span
                          className={`font-semibold ${
                            tr.status === 'accepted'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : tr.status === 'quoted'
                                ? 'text-blue-700 dark:text-blue-400'
                                : tr.status === 'rejected'
                                  ? 'text-red-700 dark:text-red-400'
                                  : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {tr.status === 'pending'
                            ? 'قيد مراجعة المتجر'
                            : tr.status === 'quoted'
                              ? 'وصل عرض المتجر'
                              : tr.status === 'accepted'
                                ? 'تم القبول'
                                : 'مرفوض'}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        {tr.storeName} · التقدير:{' '}
                        <strong className="tabular-nums text-slate-900 dark:text-slate-100">
                          {formatCurrency(tr.offeredValue ?? tr.estimatedValue)}
                        </strong>
                      </div>
                      {tr.storeNotes && (
                        <p className="text-slate-600 dark:text-slate-300">
                          {tr.storeNotes}
                        </p>
                      )}
                      {tr.status === 'quoted' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onRespondTradeIn(tr.id, 'accepted')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>قبول العرض</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRespondTradeIn(tr.id, 'rejected')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>رفض</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

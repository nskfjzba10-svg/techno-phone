import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Crosshair,
  FileCheck2,
  Film,
  Lock,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Star,
  Tag,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import {
  IRAQ_GOVERNORATES,
  STORE_LOGO_PRESETS,
  formatCurrency,
  getGovernorateDistricts,
} from '../data/catalog';
import { apiRequest, readImageFileAsDataUrl, uploadMediaFile } from '../lib/api';
import {
  AuthUser,
  ChatMessage,
  ConversationThread,
  Product,
  PromoCode,
  StoreAnalytics,
  StoreProfile,
  StoreTechnician,
  TicketStage,
  TrackingRecord,
  TradeInRequest,
  VerifiedReview,
} from '../types';
import { SafeImage } from './SafeImage';

interface StoreOwnerPortalProps {
  currentUser: AuthUser;
  store: StoreProfile;
  onStoreUpdated: (store: StoreProfile) => void;
  onProductsChanged: () => void;
  onLogout: () => void;
}

type PortalTab =
  | 'analytics'
  | 'profile'
  | 'products'
  | 'bookings'
  | 'tradeins'
  | 'messages';

function isVideoMediaUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.startsWith('data:video/');
}

export const StoreOwnerPortal: React.FC<StoreOwnerPortalProps> = ({
  currentUser,
  store,
  onStoreUpdated,
  onProductsChanged,
  onLogout,
}) => {
  const [tab, setTab] = useState<PortalTab>('analytics');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [bookings, setBookings] = useState<TrackingRecord[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [reviews, setReviews] = useState<VerifiedReview[]>([]);
  const [tradeins, setTradeins] = useState<TradeInRequest[]>([]);
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Store profile & verification edit state
  const [name, setName] = useState(store.name);
  const [logo, setLogo] = useState(store.logo);
  const [city, setCity] = useState(store.city || 'بغداد');
  const [district, setDistrict] = useState(
    store.district || getGovernorateDistricts(store.city || 'بغداد')[0] || ''
  );
  const [address, setAddress] = useState(store.address);
  const [phone, setPhone] = useState(store.phone);
  const [workingHours, setWorkingHours] = useState(store.workingHours);
  const [description, setDescription] = useState(store.description);
  const [specialtiesText, setSpecialtiesText] = useState(
    store.specialties.join('، ')
  );
  const [licenseDocUrl, setLicenseDocUrl] = useState(store.licenseDocUrl || '');
  const [lat, setLat] = useState<number>(store.lat);
  const [lng, setLng] = useState<number>(store.lng);
  const [profileSaved, setProfileSaved] = useState(false);

  // Technicians & Promo Codes
  const [technicians, setTechnicians] = useState<StoreTechnician[]>(
    store.technicians || []
  );
  const [newTechName, setNewTechName] = useState('');
  const [newTechSpec, setNewTechSpec] = useState('');

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(
    store.promoCodes || []
  );
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPercent, setNewPromoPercent] = useState('10');

  // Add Product form state
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodCategory, setProdCategory] =
    useState<Product['category']>('smartphones');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOldPrice, setProdOldPrice] = useState('');
  const [prodCondition, setProdCondition] = useState<
    'جديد' | 'مستعمل' | 'مجدد معتمد'
  >('جديد');
  const [prodWarranty, setProdWarranty] = useState('12');
  const [prodImage, setProdImage] = useState(STORE_LOGO_PRESETS[0].url);
  const [prodExtraImages, setProdExtraImages] = useState<string[]>([]);
  const [prodImei, setProdImei] = useState('');
  const [prodBatteryHealth, setProdBatteryHealth] = useState('92');
  const [prodPreviouslyOpened, setProdPreviouslyOpened] = useState(false);
  const [prodSummary, setProdSummary] = useState('');
  const [prodScreen, setProdScreen] = useState('');
  const [prodProcessor, setProdProcessor] = useState('');
  const [prodBattery, setProdBattery] = useState('');
  const [prodStorage, setProdStorage] = useState('256 جيجابايت');
  const [prodColor, setProdColor] = useState('أسود تيتانيوم');

  // Quick price-drop discount state per product
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState('');

  // Booking technician/report drafts
  const [techDrafts, setTechDrafts] = useState<Record<string, string>>({});
  const [reportDrafts, setReportDrafts] = useState<Record<string, string>>({});
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);

  // Trade-In offer drafts
  const [tradeOfferDrafts, setTradeOfferDrafts] = useState<
    Record<string, string>
  >({});
  const [tradeNotesDrafts, setTradeNotesDrafts] = useState<
    Record<string, string>
  >({});

  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');

  const cityDistricts = useMemo(() => getGovernorateDistricts(city), [city]);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiRequest<{
        store: StoreProfile;
        products: Product[];
        bookings: TrackingRecord[];
        threads: ConversationThread[];
        reviews?: VerifiedReview[];
        tradeins?: TradeInRequest[];
        analytics?: StoreAnalytics;
      }>(`/api/stores/${encodeURIComponent(store.id)}/dashboard`);
      setProducts(Array.isArray(data.products) ? data.products : []);
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      const nextThreads = Array.isArray(data.threads) ? data.threads : [];
      setThreads(nextThreads);
      if (Array.isArray(data.reviews)) setReviews(data.reviews);
      if (Array.isArray(data.tradeins)) setTradeins(data.tradeins);
      if (data.analytics) setAnalytics(data.analytics);
      if (Array.isArray(data.store?.technicians)) setTechnicians(data.store.technicians);
      if (Array.isArray(data.store?.promoCodes)) setPromoCodes(data.store.promoCodes);
      if (nextThreads.length > 0 && !selectedThreadId) {
        setSelectedThreadId(nextThreads[0].customerSessionId);
      }
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'تعذر تحميل لوحة التحكم'
      );
    } finally {
      setLoading(false);
    }
  }, [store.id, selectedThreadId]);

  useEffect(() => {
    fetchDashboard();
    const timer = window.setInterval(fetchDashboard, 6000);
    return () => window.clearInterval(timer);
  }, [fetchDashboard]);

  const showTempSuccess = (msg: string) => {
    setStatusSuccess(msg);
    window.setTimeout(() => setStatusSuccess(''), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError('');
    setProfileSaved(false);
    try {
      const specialties = specialtiesText
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await apiRequest<{ store: StoreProfile }>(
        `/api/stores/${encodeURIComponent(store.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name,
            logo,
            city,
            district,
            address,
            phone,
            workingHours,
            description,
            specialties,
            licenseDocUrl: licenseDocUrl || undefined,
            lat,
            lng,
          }),
        }
      );
      onStoreUpdated(res.store);
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'فشل تحديث بيانات المتجر'
      );
    }
  };

  const handleUploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusError('');
    try {
      const url = await readImageFileAsDataUrl(file);
      setter(url);
    } catch {
      setStatusError('تعذر قراءة ملف الصورة');
    }
  };

  const handleUploadMediaUrl = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusError('');
    try {
      const res = await uploadMediaFile(file);
      onUploaded(res.url);
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'تعذر رفع الملف'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError('');
    try {
      const isUsedOrRefurb = prodCondition !== 'جديد';
      const res = await apiRequest<{ product: Product }>(
        `/api/stores/${encodeURIComponent(store.id)}/products`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: prodName,
            brand: prodBrand,
            category: prodCategory,
            price: Number(prodPrice),
            oldPrice: prodOldPrice ? Number(prodOldPrice) : undefined,
            condition: prodCondition,
            warrantyMonths: Number(prodWarranty) || 12,
            image: prodImage,
            extraImages:
              prodExtraImages.length > 0 ? prodExtraImages : undefined,
            imei: prodImei.trim() || undefined,
            batteryHealth: isUsedOrRefurb
              ? Number(prodBatteryHealth) || 90
              : 100,
            previouslyOpened: isUsedOrRefurb ? prodPreviouslyOpened : false,
            summary: prodSummary,
            screenSpec: prodScreen,
            processorSpec: prodProcessor,
            batterySpec: prodBattery,
            storageLabel: prodStorage,
            colorName: prodColor,
          }),
        }
      );
      setProducts((prev) => [res.product, ...prev]);
      onProductsChanged();
      setProdName('');
      setProdBrand('');
      setProdPrice('');
      setProdOldPrice('');
      setProdImei('');
      setProdExtraImages([]);
      setProdSummary('');
      setProdScreen('');
      setProdProcessor('');
      setProdBattery('');
      showTempSuccess('تم نشر المنتج في متجرك بنجاح.');
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'تعذر إضافة المنتج'
      );
    }
  };

  const handleSaveQuickPrice = async (prod: Product) => {
    const nextPrice = Number(priceDraft);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      setStatusError('يرجى إدخال سعر صالح.');
      return;
    }
    setStatusError('');
    try {
      const res = await apiRequest<{ product: Product }>(
        `/api/stores/${encodeURIComponent(store.id)}/products/${encodeURIComponent(prod.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            price: nextPrice,
            oldPrice:
              nextPrice < prod.price
                ? prod.oldPrice && prod.oldPrice > prod.price
                  ? prod.oldPrice
                  : prod.price
                : undefined,
          }),
        }
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? res.product : p))
      );
      setEditingPriceId(null);
      setPriceDraft('');
      onProductsChanged();
      showTempSuccess(
        nextPrice < prod.price
          ? 'تم تحديث السعر وإرسال تنبيه انخفاض السعر للزبائن المهتمين.'
          : 'تم تحديث سعر المنتج.'
      );
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'تعذر تعديل السعر'
      );
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await apiRequest(
        `/api/stores/${encodeURIComponent(store.id)}/products/${encodeURIComponent(productId)}`,
        { method: 'DELETE' }
      );
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      onProductsChanged();
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'تعذر حذف المنتج'
      );
    }
  };

  const persistStoreTeamOrPromos = async (payload: {
    technicians?: StoreTechnician[];
    promoCodes?: PromoCode[];
  }) => {
    try {
      const res = await apiRequest<{ store: StoreProfile }>(
        `/api/stores/${encodeURIComponent(store.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      );
      onStoreUpdated(res.store);
      if (res.store.technicians) setTechnicians(res.store.technicians);
      if (res.store.promoCodes) setPromoCodes(res.store.promoCodes);
      showTempSuccess('تم تحديث الإعدادات وحفظها.');
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'تعذر حفظ التعديلات'
      );
    }
  };

  const handleAddTechnician = async () => {
    if (!newTechName.trim()) return;
    const next: StoreTechnician[] = [
      ...technicians,
      {
        id: `tech-${Date.now().toString(36)}`,
        name: newTechName.trim(),
        specialty: newTechSpec.trim() || 'صيانة شاملة',
      },
    ];
    setTechnicians(next);
    setNewTechName('');
    setNewTechSpec('');
    await persistStoreTeamOrPromos({ technicians: next });
  };

  const handleRemoveTechnician = async (id: string) => {
    const next = technicians.filter((t) => t.id !== id);
    setTechnicians(next);
    await persistStoreTeamOrPromos({ technicians: next });
  };

  const handleAddPromoCode = async () => {
    const code = newPromoCode.trim().toUpperCase();
    const pct = Math.min(80, Math.max(1, Number(newPromoPercent) || 10));
    if (!code) return;
    const next: PromoCode[] = [
      ...promoCodes.filter((p) => p.code !== code),
      { code, discountPercent: pct, active: true, expiresAt: '2026-12-31' },
    ];
    setPromoCodes(next);
    setNewPromoCode('');
    await persistStoreTeamOrPromos({ promoCodes: next });
  };

  const handleTogglePromo = async (code: string) => {
    const next = promoCodes.map((p) =>
      p.code === code ? { ...p, active: !p.active } : p
    );
    setPromoCodes(next);
    await persistStoreTeamOrPromos({ promoCodes: next });
  };

  const handleRemovePromo = async (code: string) => {
    const next = promoCodes.filter((p) => p.code !== code);
    setPromoCodes(next);
    await persistStoreTeamOrPromos({ promoCodes: next });
  };

  const handleUpdateBooking = async (
    bookingId: string,
    payload: {
      stage?: TicketStage;
      assignedTechnician?: string;
      technicianReport?: string;
    }
  ) => {
    setSavingBookingId(bookingId);
    setStatusError('');
    try {
      const res = await apiRequest<{ booking: TrackingRecord }>(
        `/api/stores/${encodeURIComponent(store.id)}/bookings/${encodeURIComponent(bookingId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? res.booking : b))
      );
      showTempSuccess('تم تحديث التذكرة وإشعار الزبون تلقائياً.');
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'تعذر تحديث حالة الحجز'
      );
    } finally {
      setSavingBookingId(null);
    }
  };

  const handleRespondTradeIn = async (
    item: TradeInRequest,
    decision: 'quoted' | 'rejected'
  ) => {
    setStatusError('');
    const offeredRaw = tradeOfferDrafts[item.id];
    const offeredNum =
      offeredRaw !== undefined && offeredRaw !== ''
        ? Number(offeredRaw)
        : item.estimatedValue;
    try {
      const res = await apiRequest<{ tradein: TradeInRequest }>(
        `/api/tradeins/${encodeURIComponent(item.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: decision,
            offeredValue: offeredNum,
            storeNotes:
              tradeNotesDrafts[item.id] ??
              (decision === 'quoted'
                ? 'السعر مبدئي ويثبّت بعد الفحص السريع بالمتجر.'
                : 'نعتذر، هذا الموديل غير مطلوب حالياً.'),
          }),
        }
      );
      setTradeins((prev) =>
        prev.map((t) => (t.id === item.id ? res.tradein : t))
      );
      showTempSuccess(
        decision === 'quoted'
          ? 'تم إرسال عرض الاستبدال للزبون وإشعاره.'
          : 'تم تحديث حالة طلب الاستبدال.'
      );
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'تعذر تحديث طلب الاستبدال'
      );
    }
  };

  const activeThread = (threads || []).find(
    (t) => t.customerSessionId === selectedThreadId
  );

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    try {
      const res = await apiRequest<{ message: ChatMessage }>(
        `/api/conversations/${encodeURIComponent(store.id)}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            customerSessionId: activeThread.customerSessionId,
            customerName: activeThread.customerName,
            text: replyText.trim(),
          }),
        }
      );
      setThreads((prev) =>
        prev.map((t) =>
          t.customerSessionId === activeThread.customerSessionId
            ? {
                ...t,
                messages: [...t.messages, res.message],
                lastMessageAt: res.message.createdAt,
              }
            : t
        )
      );
      setReplyText('');
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'فشل إرسال الرد'
      );
    }
  };

  const pendingTradeInsCount = tradeins.filter(
    (t) => t.status === 'pending'
  ).length;

  return (
    <section className="py-10 lg:py-14 bg-[#F8F9FA] dark:bg-slate-950 min-h-[75vh] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Strict Store Isolation Banner */}
        <div className="bg-slate-900 dark:bg-slate-900/95 border border-slate-800 text-white rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-bold flex flex-wrap items-center gap-2">
                <span>بوابة إدارة متجرك الحصرية — {store.name}</span>
                {store.verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <BadgeCheck className="w-4 h-4" />
                    <span>متجر موثّق</span>
                  </span>
                ) : (
                  <span className="text-xs text-amber-300 font-medium">
                    (
                    {store.verificationStatus === 'pending'
                      ? 'بانتظار مراجعة الإجازة التجارية'
                      : 'يرجى رفع إجازة المحل لتوثيق الشارة'}
                    )
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                أهلاً {currentUser.name}. هذا الحساب مخصص لإدارة متجرك فقط: الإحصائيات، العروض، فريق الفنيين، الحجوزات، واستبدال الأجهزة.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer self-start md:self-center transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>

        {/* Store Header Overview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
              <SafeImage
                src={store.logo}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {store.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {store.city}
                {store.district ? ` (${store.district})` : ''} — {store.address} ·{' '}
                <span dir="ltr" className="font-mono tabular-nums">
                  {store.phone}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 sm:gap-6 text-center border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {products.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">المنتجات</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {bookings.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">الحجوزات</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {tradeins.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">الاستبدال</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums inline-flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-current" />
                <span>{(analytics?.avgRating ?? store.avgRating ?? 5).toFixed(1)}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">التقييم</div>
            </div>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl overflow-x-auto w-fit max-w-full">
          {[
            { id: 'analytics' as PortalTab, label: 'التقارير والإحصائيات', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'bookings' as PortalTab, label: 'الصيانة والطلبات', icon: <Wrench className="w-4 h-4" /> },
            { id: 'products' as PortalTab, label: 'المنتجات والخصومات', icon: <Package className="w-4 h-4" /> },
            {
              id: 'tradeins' as PortalTab,
              label: `طلبات الاستبدال${pendingTradeInsCount > 0 ? ` (${pendingTradeInsCount})` : ''}`,
              icon: <RefreshCw className="w-4 h-4" />,
            },
            { id: 'profile' as PortalTab, label: 'بيانات المتجر والتوثيق', icon: <Settings className="w-4 h-4" /> },
            { id: 'messages' as PortalTab, label: 'رسائل الزبائن', icon: <MessageSquare className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                tab === item.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {statusError && (
          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs sm:text-sm text-red-800 dark:text-red-300">
            {statusError}
          </div>
        )}
        {statusSuccess && (
          <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusSuccess}</span>
          </div>
        )}

        {/* TAB 0: Analytics & Reports */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  إجمالي الطلبات والتذاكر
                </div>
                <div className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                  {analytics?.totalOrders ?? bookings.length}
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                  {analytics?.completedOrders ??
                    bookings.filter((b) => b.stage === 4).length}{' '}
                  عملية مكتملة
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  تذاكر صيانة قيد التنفيذ
                </div>
                <div className="font-display text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
                  {analytics?.pendingRepairs ??
                    bookings.filter((b) => b.kind === 'repair' && b.stage < 4)
                      .length}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  بانتظار الإغلاق وإصدار QR
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  إيرادات المبيعات والصيانة
                </div>
                <div className="font-display text-xl font-extrabold text-blue-700 dark:text-blue-400 tabular-nums mt-1">
                  {formatCurrency(
                    analytics?.totalRevenue ??
                      bookings.reduce((s, b) => s + b.totalPrice, 0)
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                  مبيعات:{' '}
                  {formatCurrency(analytics?.salesRevenue ?? 0)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  تقييم المتجر الموثّق
                </div>
                <div className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-1 flex items-center gap-1.5">
                  <Star className="w-5 h-5 text-amber-500 fill-current" />
                  <span>
                    {(analytics?.avgRating ?? store.avgRating ?? 5).toFixed(1)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                  بناءً على {analytics?.reviewCount ?? reviews.length} مراجعة موثّقة
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Revenue comparison & Top Products */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  توزيع الإيرادات وأكثر الأجهزة والخدمات طلباً
                </h2>

                {(() => {
                  const totalRev = Math.max(1, analytics?.totalRevenue ?? 1);
                  const salesPct = Math.round(
                    ((analytics?.salesRevenue ?? 0) / totalRev) * 100
                  );
                  const repairPct = 100 - salesPct;
                  return (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            المبيعات والحجوزات ({salesPct}%)
                          </span>
                          <span className="font-bold tabular-nums text-blue-700 dark:text-blue-400">
                            {formatCurrency(analytics?.salesRevenue ?? 0)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-blue-700 dark:bg-blue-500 rounded-full"
                            style={{ width: `${salesPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            إيرادات مختبر الصيانة ({repairPct}%)
                          </span>
                          <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(analytics?.repairRevenue ?? 0)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                            style={{ width: `${repairPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {analytics?.topProducts && analytics.topProducts.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      الأكثر طلباً في متجرك
                    </div>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {analytics.topProducts.map((tp) => (
                        <li
                          key={tp.name}
                          className="py-2 flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {tp.name}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                            {tp.count} طلب ·{' '}
                            <strong className="text-slate-900 dark:text-slate-100">
                              {formatCurrency(tp.revenue)}
                            </strong>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Verified Reviews Feed */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  أحدث التقييمات الموثّقة ({reviews.length})
                </h2>
                {reviews.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                    لا توجد مراجعات بعد. ستظهر هنا آراء الزبائن فور إتمام طلباتهم.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[340px] overflow-y-auto">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3.5 rounded-lg bg-[#F8F9FA] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {rev.customerName}
                          </span>
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {rev.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {rev.comment}
                        </p>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                          {rev.bookingId} · {rev.createdAt}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Store Profile, Verification License & Location */}
        {tab === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                تحديث شعار المتجر والموقع ووثائق التوثيق
              </h2>
              {profileSaved && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ التعديلات</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                <SafeImage
                  src={logo}
                  alt="شعار المتجر"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2.5">
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>تغيير الشعار من جهازك</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadImage(e, setLogo)}
                    className="sr-only"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {STORE_LOGO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setLogo(preset.url)}
                      className={`w-9 h-9 rounded-lg overflow-hidden border-2 cursor-pointer ${
                        logo === preset.url
                          ? 'border-blue-700 dark:border-blue-500'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <SafeImage
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  اسم المتجر
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  المحافظة
                </label>
                <select
                  value={city}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCity(next);
                    setDistrict(getGovernorateDistricts(next)[0] || '');
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  {cityDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  الموقع والعنوان التفصيلي
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    navigator.geolocation.getCurrentPosition((pos) => {
                      setLat(Number(pos.coords.latitude.toFixed(5)));
                      setLng(Number(pos.coords.longitude.toFixed(5)));
                    });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>تحديث الموقع الجغرافي التلقائي للمتجر</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  رقم الهاتف / الجوال
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-right font-mono tabular-nums focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  ساعات العمل
                </label>
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                التخصصات (افصل بفاصلة)
              </label>
              <input
                type="text"
                value={specialtiesText}
                onChange={(e) => setSpecialtiesText(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                نبذة عن المتجر
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 resize-none"
              />
            </div>

            {/* Store Verification Document Box */}
            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    توثيق المتجر (إجازة المحل أو الهوية التجارية للحصول على الشارة الزرقاء)
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    store.verified
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : store.verificationStatus === 'pending'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  الحالة:{' '}
                  {store.verified
                    ? 'متجر موثّق'
                    : store.verificationStatus === 'pending'
                      ? 'قيد المراجعة'
                      : 'غير موثّق'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700">
                  <Upload className="w-4 h-4" />
                  <span>
                    {licenseDocUrl ? 'تحديث صورة الإجازة/الهوية' : 'رفع صورة الإجازة التجارية'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleUploadMediaUrl(e, (url) => setLicenseDocUrl(url))
                    }
                    className="sr-only"
                  />
                </label>
                {licenseDocUrl && (
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    تم إرفاق الوثيقة بنجاح (اضغط حفظ لإرسالها للمراجعة)
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg cursor-pointer min-h-[44px] transition-colors"
            >
              حفظ بيانات المتجر والتوثيق
            </button>
          </form>
        )}

        {/* TAB 2: Products, Used Inspection Details, Discounts & Promo Codes */}
        {tab === 'products' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddProduct}
                className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  إضافة جهاز أو منتج جديد لمتجرك
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      اسم المنتج *
                    </label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="مثال: آيفون 15 برو"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      العلامة التجارية *
                    </label>
                    <input
                      type="text"
                      required
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      placeholder="Apple / Samsung"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      القسم
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) =>
                        setProdCategory(e.target.value as Product['category'])
                      }
                      className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="smartphones">هواتف ذكية</option>
                      <option value="laptops_tablets">لابتوب وتابلت</option>
                      <option value="audio_watches">ساعات وسماعات</option>
                      <option value="accessories">شواحن وإكسسوارات</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      السعر (د.ع) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="1250000"
                      className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      السعر القديم (للخصم)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={prodOldPrice}
                      onChange={(e) => setProdOldPrice(e.target.value)}
                      placeholder="1400000"
                      className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      الحالة
                    </label>
                    <select
                      value={prodCondition}
                      onChange={(e) =>
                        setProdCondition(
                          e.target.value as 'جديد' | 'مستعمل' | 'مجدد معتمد'
                        )
                      }
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="جديد">جديد</option>
                      <option value="مستعمل">مستعمل</option>
                      <option value="مجدد معتمد">مجدد معتمد</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      الضمان (بالأشهر)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={prodWarranty}
                      onChange={(e) => setProdWarranty(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                    />
                  </div>
                </div>

                {/* IMEI & Used Device Inspection Fields */}
                <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    تقرير الفحص والـ IMEI {prodCondition === 'جديد' ? '(اختياري للجديد)' : '(مهم للمستعمل والمجدد)'}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        رقم IMEI
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={prodImei}
                        onChange={(e) => setProdImei(e.target.value)}
                        placeholder="358491029481024"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    {prodCondition !== 'جديد' && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          صحة البطارية (%)
                        </label>
                        <input
                          type="number"
                          min={50}
                          max={100}
                          value={prodBatteryHealth}
                          onChange={(e) => setProdBatteryHealth(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    )}
                  </div>
                  {prodCondition !== 'جديد' && (
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prodPreviouslyOpened}
                        onChange={(e) => setProdPreviouslyOpened(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span>الجهاز تم فتحه أو صيانته مسبقاً</span>
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      السعة
                    </label>
                    <input
                      type="text"
                      value={prodStorage}
                      onChange={(e) => setProdStorage(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      اللون
                    </label>
                    <input
                      type="text"
                      value={prodColor}
                      onChange={(e) => setProdColor(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    صور المنتج (صورة رئيسية + صور حقيقية إضافية)
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="w-14 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                      <SafeImage
                        src={prodImage}
                        alt="معاينة المنتج"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>الصورة الرئيسية</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadImage(e, setProdImage)}
                        className="sr-only"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      <span>صورة إضافية ({prodExtraImages.length})</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleUploadMediaUrl(e, (url) =>
                            setProdExtraImages((prev) => [...prev.slice(0, 3), url])
                          )
                        }
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={prodScreen}
                    onChange={(e) => setProdScreen(e.target.value)}
                    placeholder="الشاشة"
                    className="px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                  <input
                    type="text"
                    value={prodProcessor}
                    onChange={(e) => setProdProcessor(e.target.value)}
                    placeholder="المعالج"
                    className="px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                  <input
                    type="text"
                    value={prodBattery}
                    onChange={(e) => setProdBattery(e.target.value)}
                    placeholder="البطارية"
                    className="px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    وصف مختصر
                  </label>
                  <textarea
                    rows={2}
                    value={prodSummary}
                    onChange={(e) => setProdSummary(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg cursor-pointer min-h-[44px] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>نشر المنتج في متجري</span>
                </button>
              </form>

              <div className="lg:col-span-7 space-y-6">
                {/* Promo Codes Manager */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      أكواد الخصم الترويجية للمتجر
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={newPromoCode}
                      onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                      placeholder="كود مثال: IRAQ10"
                      className="flex-1 min-w-[140px] px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono uppercase text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      min={1}
                      max={80}
                      value={newPromoPercent}
                      onChange={(e) => setNewPromoPercent(e.target.value)}
                      className="w-24 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleAddPromoCode}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                    >
                      إضافة كود
                    </button>
                  </div>
                  {promoCodes.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {promoCodes.map((pc) => (
                        <div
                          key={pc.code}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F8F9FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {pc.code}
                          </span>
                          <span className="text-blue-700 dark:text-blue-400 font-semibold tabular-nums">
                            {pc.discountPercent}%
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePromo(pc.code)}
                            className={`text-[11px] underline cursor-pointer ${
                              pc.active
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {pc.active ? 'فعّال' : 'معطّل'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePromo(pc.code)}
                            className="text-slate-400 hover:text-red-600 cursor-pointer"
                            aria-label="حذف الكود"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Store Products List with Quick Price Drop */}
                <div className="space-y-4">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    المنتجات المعروضة في متجرك ({products.length})
                  </h2>
                  {products.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      لا توجد منتجات مضافة بعد في متجرك.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map((prod) => (
                        <div
                          key={prod.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                                <SafeImage
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {prod.categoryLabel} · {prod.brand} · {prod.condition}
                                  {typeof prod.batteryHealth === 'number' &&
                                    prod.condition !== 'جديد' &&
                                    ` · بطارية ${prod.batteryHealth}%`}
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {prod.name}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                                  <span>{formatCurrency(prod.price)}</span>
                                  {prod.oldPrice && prod.oldPrice > prod.price && (
                                    <span className="line-through text-slate-400 font-normal">
                                      {formatCurrency(prod.oldPrice)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingPriceId === prod.id) {
                                    setEditingPriceId(null);
                                  } else {
                                    setEditingPriceId(prod.id);
                                    setPriceDraft(String(prod.price));
                                  }
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer"
                              >
                                تخفيض السعر
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(prod.id)}
                                aria-label={`حذف ${prod.name}`}
                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {editingPriceId === prod.id && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                value={priceDraft}
                                onChange={(e) => setPriceDraft(e.target.value)}
                                className="w-40 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums text-slate-900 dark:text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveQuickPrice(prod)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                              >
                                حفظ السعر وإرسال تنبيه انخفاض
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
        )}

        {/* TAB 3: Bookings, Technicians Team & Fault Media Viewer */}
        {tab === 'bookings' && (
          <div className="space-y-6">
            {/* Multi-Technician Team Manager */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  فريق الصيانة في المتجر ({technicians.length})
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  placeholder="اسم المهندس / الفني"
                  className="flex-1 min-w-[160px] px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={newTechSpec}
                  onChange={(e) => setNewTechSpec(e.target.value)}
                  placeholder="التخصص (مثلاً: شاشات، آيسي)"
                  className="flex-1 min-w-[160px] px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleAddTechnician}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>إضافة فني</span>
                </button>
              </div>
              {technicians.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {technicians.map((tech) => (
                    <div
                      key={tech.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F8F9FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {tech.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        · {tech.specialty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTechnician(tech.id)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                        aria-label={`إزالة ${tech.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              طلبات الصيانة وحجوزات الشراء الواردة لمتجرك ({bookings.length})
            </h2>
            {loading ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                جاري تحميل الطلبات...
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                لا توجد حجوزات واردة لمتجرك حتى الآن.
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((bk) => {
                  const techVal =
                    techDrafts[bk.id] ?? bk.assignedTechnician ?? '';
                  const reportVal =
                    reportDrafts[bk.id] ?? bk.technicianReport ?? '';
                  return (
                    <div
                      key={bk.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                              {bk.id}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {bk.kind === 'repair'
                                ? 'حجز صيانة'
                                : bk.kind === 'reservation'
                                  ? 'حجز منتج للشراء'
                                  : 'طلب شراء'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{bk.createdAt}</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {bk.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            العميل: {bk.customerName} (
                            <span dir="ltr" className="font-mono">
                              {bk.phone}
                            </span>
                            ) — {bk.subtitle}
                          </p>
                        </div>
                        <div className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                          {formatCurrency(bk.totalPrice)}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {bk.notes}
                      </p>

                      {bk.faultMediaUrls && bk.faultMediaUrls.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5">
                            <Film className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                            <span>مرفقات العطل المرسلة من الزبون:</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {bk.faultMediaUrls.map((url, idx) => (
                              <div
                                key={`${bk.id}-media-${idx}`}
                                className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-[4/3]"
                              >
                                {isVideoMediaUrl(url) ? (
                                  <video
                                    src={url}
                                    controls
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <img
                                    src={url}
                                    alt={`مرفق عطل ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Technician assignment & report */}
                      <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <select
                            value={techVal}
                            onChange={(e) =>
                              setTechDrafts((prev) => ({
                                ...prev,
                                [bk.id]: e.target.value,
                              }))
                            }
                            className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                          >
                            <option value="">-- تعيين مهندس/فني مسؤول --</option>
                            {technicians.map((t) => (
                              <option key={t.id} value={t.name}>
                                {t.name} ({t.specialty})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={reportVal}
                            onChange={(e) =>
                              setReportDrafts((prev) => ({
                                ...prev,
                                [bk.id]: e.target.value,
                              }))
                            }
                            placeholder="التقرير الفني الذي يظهر للزبون..."
                            className="sm:col-span-2 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={savingBookingId === bk.id}
                          onClick={() =>
                            handleUpdateBooking(bk.id, {
                              assignedTechnician: techVal,
                              technicianReport: reportVal,
                            })
                          }
                          className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                        >
                          حفظ التقرير وتعيين الفني
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          تحديث المرحلة:
                        </span>
                        {(bk.stageLabels || []).map((lbl, idx) => {
                          const stageNum = (idx + 1) as TicketStage;
                          return (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() =>
                                handleUpdateBooking(bk.id, { stage: stageNum })
                              }
                              className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${
                                bk.stage === stageNum
                                  ? 'border-blue-700 dark:border-blue-500 bg-blue-700 dark:bg-blue-600 text-white font-semibold'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              0{stageNum} {lbl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Trade-In Requests */}
        {tab === 'tradeins' && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              طلبات استبدال وتثمين الأجهزة (Trade-In) ({tradeins.length})
            </h2>
            {tradeins.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                لا توجد طلبات استبدال واردة لمتجرك حتى الآن.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tradeins.map((tr) => (
                  <div
                    key={tr.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono text-blue-700 dark:text-blue-400 font-bold">
                          {tr.id} · {tr.createdAt}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {tr.model} ({tr.storage})
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          العميل: {tr.customerName} ·{' '}
                          <span dir="ltr" className="font-mono">
                            {tr.phone}
                          </span>
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {tr.status === 'pending'
                          ? 'بانتظار عرضك'
                          : tr.status === 'quoted'
                            ? 'تم إرسال العرض'
                            : tr.status === 'accepted'
                              ? 'وافق الزبون'
                              : 'مرفوض'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 bg-[#F8F9FA] dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        صحة البطارية:{' '}
                        <strong className="tabular-nums">{tr.batteryHealth}%</strong>
                      </div>
                      <div>
                        التقدير المبدئي:{' '}
                        <strong className="tabular-nums text-blue-700 dark:text-blue-400">
                          {formatCurrency(tr.estimatedValue)}
                        </strong>
                      </div>
                      {tr.imei && (
                        <div className="col-span-2 font-mono">IMEI: {tr.imei}</div>
                      )}
                      {tr.targetProductName && (
                        <div className="col-span-2 text-emerald-700 dark:text-emerald-400">
                          يرغب بالترقية إلى: {tr.targetProductName}
                        </div>
                      )}
                      <div className="col-span-2 text-slate-600 dark:text-slate-400">
                        ملاحظات الزبون: {tr.conditionNotes}
                      </div>
                    </div>

                    {tr.photoUrl && (
                      <div className="w-32 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img
                          src={tr.photoUrl}
                          alt={tr.model}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={
                            tradeOfferDrafts[tr.id] ??
                            String(tr.offeredValue ?? tr.estimatedValue)
                          }
                          onChange={(e) =>
                            setTradeOfferDrafts((prev) => ({
                              ...prev,
                              [tr.id]: e.target.value,
                            }))
                          }
                          placeholder="قيمة العرض النهائي د.ع"
                          className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          value={tradeNotesDrafts[tr.id] ?? tr.storeNotes ?? ''}
                          onChange={(e) =>
                            setTradeNotesDrafts((prev) => ({
                              ...prev,
                              [tr.id]: e.target.value,
                            }))
                          }
                          placeholder="ملاحظات المتجر للزبون..."
                          className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRespondTradeIn(tr, 'quoted')}
                          className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                        >
                          إرسال عرض السعر
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondTradeIn(tr, 'rejected')}
                          className="py-2 px-3 text-xs font-semibold text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                        >
                          رفض
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Customer Messages */}
        {tab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden min-h-[440px]">
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="p-4 bg-[#F8F9FA] dark:bg-slate-950 font-semibold text-sm text-slate-900 dark:text-slate-100">
                محادثات الزبائن ({threads.length})
              </div>
              {threads.length === 0 ? (
                <div className="p-6 text-xs text-slate-500 dark:text-slate-400 text-center">
                  لا توجد رسائل واردة بعد.
                </div>
              ) : (
                threads.map((th) => (
                  <button
                    key={th.customerSessionId}
                    type="button"
                    onClick={() => setSelectedThreadId(th.customerSessionId)}
                    className={`w-full text-right p-4 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer ${
                      selectedThreadId === th.customerSessionId
                        ? 'bg-blue-50/60 dark:bg-blue-950/40'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {th.customerName}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                        {th.lastMessageAt}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                      {th.messages[th.messages.length - 1]?.text}
                    </p>
                  </button>
                ))
              )}
            </div>

            <div className="lg:col-span-8 flex flex-col justify-between bg-[#F8F9FA] dark:bg-slate-950/70">
              {activeThread ? (
                <>
                  <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100">
                    محادثة مع: {activeThread.customerName}
                  </div>
                  <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[340px]">
                    {activeThread.messages.map((msg) => {
                      const isOwner = msg.senderRole === 'store_owner';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isOwner ? 'items-start' : 'items-end'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                              isOwner
                                ? 'bg-blue-700 dark:bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                            {isOwner ? store.name : msg.customerName} ·{' '}
                            {msg.createdAt}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <form
                    onSubmit={handleSendReply}
                    className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2"
                  >
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتب ردك على الزبون..."
                      className="flex-1 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>إرسال</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="h-full flex items-center justify-center p-10 text-sm text-slate-500 dark:text-slate-400">
                  اختر محادثة من القائمة للرد على استفسارات الزبائن.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

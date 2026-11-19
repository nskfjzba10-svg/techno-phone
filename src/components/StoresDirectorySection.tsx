import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  ShoppingBag,
  Star,
  Store as StoreIcon,
  Truck,
  Wrench,
} from 'lucide-react';
import {
  IRAQ_CITY_COORDS,
  IRAQ_GOVERNORATES,
  calculateDistanceKm,
  estimateDeliveryBetweenGovernorates,
  formatCurrency,
  getGovernorateDistricts,
} from '../data/catalog';
import { Product, StoreProfile, VerifiedReview } from '../types';
import { SafeImage } from './SafeImage';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

interface StoresDirectorySectionProps {
  stores: StoreProfile[];
  products: Product[];
  reviews?: VerifiedReview[];
  customerGovernorate?: string;
  selectedStore: StoreProfile | null;
  initialUserLocation?: LatLngPoint | null;
  initialLocationLabel?: string;
  isWelcomeFromRegistration?: boolean;
  onSelectStore: (store: StoreProfile | null) => void;
  onChatWithStore: (store: StoreProfile) => void;
  onBookRepairAtStore: (store: StoreProfile) => void;
  onGoToProducts?: () => void;
}

export const StoresDirectorySection: React.FC<StoresDirectorySectionProps> = ({
  stores,
  products,
  reviews = [],
  customerGovernorate = 'بغداد',
  selectedStore,
  initialUserLocation = null,
  initialLocationLabel = '',
  isWelcomeFromRegistration = false,
  onSelectStore,
  onChatWithStore,
  onBookRepairAtStore,
  onGoToProducts,
}) => {
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const [userLocation, setUserLocation] = useState<LatLngPoint | null>(
    initialUserLocation
  );
  const [locationLabel, setLocationLabel] = useState(initialLocationLabel);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (initialUserLocation) {
      setUserLocation(initialUserLocation);
      setLocationLabel(initialLocationLabel);
    }
  }, [initialUserLocation, initialLocationLabel]);

  const handleRequestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError(
        'المتصفح لا يدعم تحديد الموقع الجغرافي. اختر محافظة مرجعية لترتيب المتاجر الأقرب.'
      );
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationLabel('تم تحديد موقعك بدقة');
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            'تم رفض إذن الموقع من المتصفح. يمكنك اختيار محافظة مرجعية لترتيب المتاجر.'
          );
        } else {
          setLocationError(
            'تعذر تحديد موقعك تلقائياً حالياً. يمكنك اختيار محافظتك المرجعية لترتيب المتاجر الأقرب.'
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleSelectCityReference = useCallback((city: string) => {
    const coords = IRAQ_CITY_COORDS[city];
    if (!coords) return;
    setLocationError('');
    setUserLocation(coords);
    setLocationLabel(`موقع تقريبي: ${city}`);
  }, []);

  const cities = useMemo(() => {
    const set = new Set<string>(IRAQ_GOVERNORATES.map((g) => g.name));
    stores.forEach((s) => {
      if (s.city) set.add(s.city);
    });
    return Array.from(set);
  }, [stores]);

  const availableDistricts = useMemo(() => {
    if (cityFilter === 'all') return [];
    const base = getGovernorateDistricts(cityFilter);
    const set = new Set<string>(base);
    stores.forEach((s) => {
      if (s.city === cityFilter && s.district) set.add(s.district);
    });
    return Array.from(set);
  }, [cityFilter, stores]);

  const filteredStores = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = stores.filter((s) => {
      const matchCity = cityFilter === 'all' || s.city === cityFilter;
      const matchDistrict =
        districtFilter === 'all' ||
        (s.district && s.district.includes(districtFilter)) ||
        s.address.includes(districtFilter);
      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.district || '').toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.specialties.some((sp) => sp.toLowerCase().includes(q));
      return matchCity && matchDistrict && matchQuery;
    });

    if (userLocation) {
      return [...list].sort(
        (a, b) =>
          calculateDistanceKm(userLocation, { lat: a.lat, lng: a.lng }) -
          calculateDistanceKm(userLocation, { lat: b.lat, lng: b.lng })
      );
    }
    return list;
  }, [stores, cityFilter, districtFilter, query, userLocation]);

  if (selectedStore) {
    const storeProductsCount = products.filter(
      (p) => p.storeId === selectedStore.id
    ).length;
    const storeReviews = reviews.filter((r) => r.storeId === selectedStore.id);
    const deliveryEst = estimateDeliveryBetweenGovernorates(
      selectedStore.city,
      customerGovernorate
    );

    return (
      <section
        id="stores"
        className="py-10 lg:py-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <button
            type="button"
            onClick={() => onSelectStore(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة إلى دليل جميع المتاجر</span>
          </button>

          <div className="bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                <SafeImage
                  src={selectedStore.logo}
                  alt={selectedStore.name}
                  fallbackTitle={selectedStore.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {selectedStore.verified ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      <BadgeCheck className="w-4 h-4" />
                      <span>متجر موثّق</span>
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {selectedStore.verificationStatus === 'pending'
                        ? 'قيد مراجعة التوثيق'
                        : 'متجر مسجل'}
                    </span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {(selectedStore.avgRating ?? 5).toFixed(1)} (
                    {selectedStore.reviewCount ?? storeReviews.length} تقييم)
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {storeProductsCount} منتجات متوفرة
                  </span>
                  {userLocation && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                        على بُعد{' '}
                        {calculateDistanceKm(userLocation, {
                          lat: selectedStore.lat,
                          lng: selectedStore.lng,
                        }).toFixed(1)}{' '}
                        كم
                      </span>
                    </>
                  )}
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {selectedStore.name}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  {selectedStore.description}
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>
                      {selectedStore.city}
                      {selectedStore.district ? ` (${selectedStore.district})` : ''}{' '}
                      — {selectedStore.address}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>{selectedStore.workingHours}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span dir="ltr" className="font-mono tabular-nums">
                      {selectedStore.phone}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-medium tabular-nums">
                    <Truck className="w-3.5 h-3.5" />
                    <span>
                      التوصيل إلى {customerGovernorate}:{' '}
                      {formatCurrency(deliveryEst.fee)} ({deliveryEst.etaLabel})
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onChatWithStore(selectedStore)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[44px]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>تواصل مع المتجر</span>
              </button>
              <button
                type="button"
                onClick={() => onBookRepairAtStore(selectedStore)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[44px]"
              >
                <Wrench className="w-4 h-4" />
                <span>حجز صيانة في المتجر</span>
              </button>
            </div>
          </div>

          {storeReviews.length > 0 && (
            <div className="bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  تقييمات الزبائن الموثّقة ({storeReviews.length})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  تُعرض فقط التقييمات المرتبطة بطلبات أو تذاكر صيانة مكتملة
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {storeReviews.slice(0, 4).map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {rev.customerName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {rev.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {rev.comment}
                    </p>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 tabular-nums">
                      عملية شراء/صيانة موثّقة · {rev.createdAt}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      id="stores"
      className="py-12 lg:py-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {isWelcomeFromRegistration && (
          <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-blue-950 dark:text-blue-100">
                مرحباً بك! تم تسجيل حسابك بنجاح — إليك جميع المتاجر المسجلة بالتطبيق
              </div>
              <p className="text-xs text-blue-900 dark:text-blue-300">
                تظهر المتاجر القريبة من موقعك أولاً مع تقدير التوصيل إلى محافظتك ({customerGovernorate}).
              </p>
            </div>
            {onGoToProducts && (
              <button
                type="button"
                onClick={onGoToProducts}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer min-h-[42px]"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>المنتجات المعروضة للبيع</span>
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
              جميع المتاجر المسجلة في العراق ({filteredStores.length})
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
              {userLocation
                ? `مرتبة تلقائياً من الأقرب إلى موقعك (${locationLabel || customerGovernorate}) مع كلفة التوصيل التقديرية بين المحافظات.`
                : 'استخدم فلتر المحافظة والقضاء أو حدّد موقعك للعثور على أقرب متجر موثّق.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم المتجر أو القضاء..."
                aria-label="ابحث في المتاجر"
                className="w-full sm:w-52 pr-10 pl-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              />
            </div>

            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setDistrictFilter('all');
              }}
              aria-label="تصفية حسب المحافظة"
              className="px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer min-h-[42px]"
            >
              <option value="all">جميع المحافظات</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {availableDistricts.length > 0 && (
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                aria-label="تصفية حسب القضاء أو المنطقة"
                className="px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer min-h-[42px]"
              >
                <option value="all">كل الأقضية والمناطق</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            {onGoToProducts && !isWelcomeFromRegistration && (
              <button
                type="button"
                onClick={onGoToProducts}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[42px]"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>المنتجات للبيع</span>
              </button>
            )}
          </div>
        </div>

        {/* Location Proximity Bar (No Maps API required) */}
        <div className="bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
              <span>
                {userLocation
                  ? `الترتيب حسب الأقرب إلى: ${locationLabel || customerGovernorate}`
                  : 'ترتيب المتاجر حسب القرب الجغرافي وكلفة التوصيل'}
              </span>
            </div>
            {locationError && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {locationError}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRequestLocation}
              disabled={isLocating}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[38px]"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Crosshair className="w-3.5 h-3.5" />
              )}
              <span>{isLocating ? 'جاري التحديد...' : 'تحديد موقعي الحالي'}</span>
            </button>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleSelectCityReference(e.target.value);
              }}
              aria-label="اختيار محافظة مرجعية لحساب المسافة"
              className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer min-h-[38px]"
            >
              <option value="">ترتيب من محافظة...</option>
              {IRAQ_GOVERNORATES.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Store Directory Cards Grid */}
        {filteredStores.length === 0 ? (
          <div className="bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              لا توجد متاجر مطابقة في هذا القضاء حالياً
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              جرّب عرض كل الأقضية في المحافظة أو اختيار محافظة أخرى.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredStores.map((store) => {
              const count = products.filter((p) => p.storeId === store.id).length;
              const distanceKm = userLocation
                ? calculateDistanceKm(userLocation, {
                    lat: store.lat,
                    lng: store.lng,
                  })
                : null;
              const deliveryEst = estimateDeliveryBetweenGovernorates(
                store.city,
                customerGovernorate
              );
              const storeRating = store.avgRating ?? 5;
              const storeReviewsCount =
                store.reviewCount ??
                reviews.filter((r) => r.storeId === store.id).length;

              return (
                <article
                  key={store.id}
                  className="bg-[#F8F9FA] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-5 transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                      <SafeImage
                        src={store.logo}
                        alt={store.name}
                        fallbackTitle={store.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {store.city}
                          {store.district ? ` · ${store.district}` : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        {store.verified ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span>موثّق</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            {store.verificationStatus === 'pending'
                              ? 'قيد التوثيق'
                              : 'مسجل'}
                          </span>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {storeRating.toFixed(1)} ({storeReviewsCount})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{count} منتجات</span>
                        {distanceKm !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                              {distanceKm.toFixed(1)} كم
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                        {store.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {store.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="truncate">{store.address}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold whitespace-nowrap shrink-0 tabular-nums">
                        <Truck className="w-3.5 h-3.5" />
                        <span>
                          توصيل إلى {customerGovernorate}:{' '}
                          {formatCurrency(deliveryEst.fee)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span>{store.workingHours}</span>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {store.specialties.join(' · ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectStore(store)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[42px]"
                    >
                      <StoreIcon className="w-4 h-4 shrink-0" />
                      <span>دخول المتجر وتصفح المنتجات</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChatWithStore(store)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[42px]"
                    >
                      <MessageSquare className="w-4 h-4 shrink-0 text-blue-700 dark:text-blue-400" />
                      <span>تواصل</span>
                    </button>
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

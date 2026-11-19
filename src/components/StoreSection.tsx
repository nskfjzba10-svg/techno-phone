import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  BatteryCharging,
  CalendarCheck,
  Check,
  GitCompare,
  Heart,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Store as StoreIcon,
  Truck,
} from 'lucide-react';
import {
  CATEGORY_TABS,
  IRAQ_GOVERNORATES,
  estimateDeliveryBetweenGovernorates,
  formatCurrency,
  getGovernorateDistricts,
} from '../data/catalog';
import { Product, ProductCategory, StoreProfile } from '../types';
import { SafeImage } from './SafeImage';

export type ConditionFilter = 'all' | 'جديد' | 'مستعمل';

interface StoreSectionProps {
  products: Product[];
  stores: StoreProfile[];
  customerGovernorate?: string;
  selectedStore: StoreProfile | null;
  activeCategory: ProductCategory;
  conditionFilter: ConditionFilter;
  onCategoryChange: (category: ProductCategory) => void;
  onConditionChange: (condition: ConditionFilter) => void;
  compareIds: string[];
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleCompare: (product: Product) => void;
  onReserveProduct: (product: Product) => void;
  onClearStoreFilter?: () => void;
  onChatWithStore?: (store: StoreProfile) => void;
  onOpenStoresDirectory?: () => void;
}

type SortOption = 'featured' | 'price_asc' | 'price_desc';
type PricePreset =
  | 'all'
  | 'under_500k'
  | '500k_1500k'
  | '1500k_2500k'
  | 'over_2500k'
  | 'custom';

export const StoreSection: React.FC<StoreSectionProps> = ({
  products,
  stores,
  customerGovernorate = 'بغداد',
  selectedStore,
  activeCategory,
  conditionFilter,
  onCategoryChange,
  onConditionChange,
  compareIds,
  wishlistIds,
  onToggleWishlist,
  onSelectProduct,
  onQuickAdd,
  onToggleCompare,
  onReserveProduct,
  onClearStoreFilter,
  onChatWithStore,
  onOpenStoresDirectory,
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [governorateFilter, setGovernorateFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [pricePreset, setPricePreset] = useState<PricePreset>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const storeMap = useMemo(() => {
    const map = new Map<string, StoreProfile>();
    stores.forEach((s) => map.set(s.id, s));
    return map;
  }, [stores]);

  const districtOptions = useMemo(() => {
    if (governorateFilter === 'all') return [];
    return getGovernorateDistricts(governorateFilter);
  }, [governorateFilter]);

  const storeScopedProducts = useMemo(() => {
    if (!selectedStore) return products;
    return products.filter((item) => item.storeId === selectedStore.id);
  }, [products, selectedStore]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    storeScopedProducts.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [storeScopedProducts]);

  const handlePricePresetChange = (preset: PricePreset) => {
    setPricePreset(preset);
    if (preset === 'all') {
      setMinPrice('');
      setMaxPrice('');
    } else if (preset === 'under_500k') {
      setMinPrice('');
      setMaxPrice('500000');
    } else if (preset === '500k_1500k') {
      setMinPrice('500000');
      setMaxPrice('1500000');
    } else if (preset === '1500k_2500k') {
      setMinPrice('1500000');
      setMaxPrice('2500000');
    } else if (preset === 'over_2500k') {
      setMinPrice('2500000');
      setMaxPrice('');
    }
  };

  const handleMinPriceChange = (val: string) => {
    setMinPrice(val);
    setPricePreset(val || maxPrice ? 'custom' : 'all');
  };

  const handleMaxPriceChange = (val: string) => {
    setMaxPrice(val);
    setPricePreset(minPrice || val ? 'custom' : 'all');
  };

  const hasActiveFilters =
    activeCategory !== 'all' ||
    conditionFilter !== 'all' ||
    selectedBrand !== 'all' ||
    governorateFilter !== 'all' ||
    districtFilter !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    searchQuery.trim() !== '';

  const resetAllFilters = () => {
    onCategoryChange('all');
    onConditionChange('all');
    setSelectedBrand('all');
    setGovernorateFilter('all');
    setDistrictFilter('all');
    setPricePreset('all');
    setMinPrice('');
    setMaxPrice('');
    setSearchQuery('');
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const minVal = minPrice !== '' ? Number(minPrice) : null;
    const maxVal = maxPrice !== '' ? Number(maxPrice) : null;

    const list = storeScopedProducts.filter((item) => {
      const store = storeMap.get(item.storeId);
      const matchesGov =
        governorateFilter === 'all' || store?.city === governorateFilter;
      const matchesDist =
        districtFilter === 'all' || store?.district === districtFilter;
      const matchesCategory =
        activeCategory === 'all' || item.category === activeCategory;
      const matchesCondition =
        conditionFilter === 'all' ||
        (conditionFilter === 'جديد' && item.condition === 'جديد') ||
        (conditionFilter === 'مستعمل' &&
          (item.condition === 'مستعمل' || item.condition === 'مجدد معتمد'));
      const matchesBrand =
        selectedBrand === 'all' || item.brand === selectedBrand;
      const matchesMin =
        minVal === null || Number.isNaN(minVal) || item.price >= minVal;
      const matchesMax =
        maxVal === null || Number.isNaN(maxVal) || item.price <= maxVal;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.storeName.toLowerCase().includes(query) ||
        item.categoryLabel.toLowerCase().includes(query);

      return (
        matchesGov &&
        matchesDist &&
        matchesCategory &&
        matchesCondition &&
        matchesBrand &&
        matchesMin &&
        matchesMax &&
        matchesQuery
      );
    });

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [
    storeScopedProducts,
    storeMap,
    governorateFilter,
    districtFilter,
    activeCategory,
    conditionFilter,
    selectedBrand,
    minPrice,
    maxPrice,
    searchQuery,
    sortBy,
  ]);

  const handleQuickAddClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    onQuickAdd(product);
    setRecentlyAddedId(product.id);
    window.setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === product.id ? null : prev));
    }, 1200);
  };

  const activeCategoryLabel =
    CATEGORY_TABS.find((t) => t.id === activeCategory)?.label || '';

  const dynamicHeading = selectedStore
    ? `منتجات ${selectedStore.name}`
    : conditionFilter === 'جديد'
      ? 'الأجهزة الجديدة المعروضة للبيع'
      : conditionFilter === 'مستعمل'
        ? 'الأجهزة المستعملة والمجددة المفحوصة'
        : activeCategory === 'accessories'
          ? 'الإكسسوارات والشواحن المعروضة للبيع'
          : activeCategory !== 'all'
            ? `${activeCategoryLabel} المعروضة للبيع`
            : 'المنتجات المعروضة للبيع في العراق';

  return (
    <section
      id="store"
      className="py-8 lg:py-12 bg-[#F8F9FA] dark:bg-slate-950 min-h-[75vh] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Selected Store Compact Header */}
        {selectedStore && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                <SafeImage
                  src={selectedStore.logo}
                  alt={selectedStore.name}
                  fallbackTitle={selectedStore.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex flex-wrap items-center gap-2">
                  <span>
                    {selectedStore.city}
                    {selectedStore.district ? ` (${selectedStore.district})` : ''} —{' '}
                    {selectedStore.address}
                  </span>
                  {selectedStore.verified && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span>متجر موثّق</span>
                    </span>
                  )}
                </div>
                <div className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedStore.name}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {onChatWithStore && (
                <button
                  type="button"
                  onClick={() => onChatWithStore(selectedStore)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>تواصل مع المتجر</span>
                </button>
              )}
              {onClearStoreFilter && (
                <button
                  type="button"
                  onClick={onClearStoreFilter}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  عرض منتجات جميع المتاجر
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section Heading & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
              {dynamicHeading}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              تصفح الأجهزة الجديدة والمستعملة المفحوصة بـ IMEI، صفِّ حسب المحافظة والقضاء، وقارن أو احجز مباشرة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {onOpenStoresDirectory && !selectedStore && (
              <button
                type="button"
                onClick={onOpenStoresDirectory}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap cursor-pointer min-h-[42px]"
              >
                <StoreIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>المتاجر القريبة</span>
              </button>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الجهاز أو المتجر..."
                aria-label="ابحث في المنتجات"
                className="w-full sm:w-56 pr-10 pl-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="ترتيب المنتجات"
              className="px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer min-h-[42px]"
            >
              <option value="featured">الأكثر طلباً</option>
              <option value="price_asc">السعر: من الأقل للأعلى</option>
              <option value="price_desc">السعر: من الأعلى للأقل</option>
            </select>
          </div>
        </div>

        {/* Unified Multi-Criteria Filter Bar (including Iraqi Governorates & Districts) */}
        <div
          aria-label="شريط فلترة المنتجات"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <SlidersHorizontal className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>تصفية حسب المحافظة والقضاء والصنف والسعر</span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                عرض{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {filteredProducts.length}
                </strong>{' '}
                من أصل{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {storeScopedProducts.length}
                </strong>{' '}
                منتج
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة ضبط</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Governorate */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                المحافظة
              </label>
              <select
                value={governorateFilter}
                onChange={(e) => {
                  setGovernorateFilter(e.target.value);
                  setDistrictFilter('all');
                }}
                className="w-full px-3 py-2.5 text-sm bg-[#F8F9FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer min-h-[42px]"
              >
                <option value="all">كل محافظات العراق</option>
                {IRAQ_GOVERNORATES.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                القضاء / المنطقة
              </label>
              <select
                value={districtFilter}
                disabled={governorateFilter === 'all'}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-[#F8F9FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-50 cursor-pointer min-h-[42px]"
              >
                <option value="all">جميع الأقضية</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Device Condition */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                حالة الجهاز
              </label>
              <select
                value={conditionFilter}
                onChange={(e) =>
                  onConditionChange(e.target.value as ConditionFilter)
                }
                className="w-full px-3 py-2.5 text-sm bg-[#F8F9FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer min-h-[42px]"
              >
                <option value="all">الكل (جديد ومستعمل)</option>
                <option value="جديد">أجهزة جديدة</option>
                <option value="مستعمل">مستعمل / مجدد معتمد</option>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                العلامة التجارية
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-[#F8F9FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer min-h-[42px]"
              >
                <option value="all">جميع العلامات</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Preset */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                نطاق السعر
              </label>
              <select
                value={pricePreset}
                onChange={(e) =>
                  handlePricePresetChange(e.target.value as PricePreset)
                }
                className="w-full px-3 py-2.5 text-sm bg-[#F8F9FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer min-h-[42px]"
              >
                <option value="all">جميع الأسعار</option>
                <option value="under_500k">أقل من 500,000 د.ع</option>
                <option value="500k_1500k">500,000 – 1,500,000 د.ع</option>
                <option value="1500k_2500k">1,500,000 – 2,500,000 د.ع</option>
                <option value="over_2500k">أكثر من 2,500,000 د.ع</option>
                {pricePreset === 'custom' && (
                  <option value="custom">نطاق مخصص</option>
                )}
              </select>
            </div>

            {/* Custom Min/Max */}
            <div>
              <div className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                السعر يدوياً (د.ع)
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => handleMinPriceChange(e.target.value)}
                  placeholder="من"
                  className="w-full px-2.5 py-2 text-xs bg-[#F8F9FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums min-h-[42px]"
                />
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => handleMaxPriceChange(e.target.value)}
                  placeholder="إلى"
                  className="w-full px-2.5 py-2 text-xs bg-[#F8F9FA] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums min-h-[42px]"
                />
              </div>
            </div>
          </div>

          {/* Quick Segmented Category Tabs */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onCategoryChange(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
                    isActive
                      ? 'bg-slate-900 dark:bg-blue-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3-Column Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              لا توجد منتجات مطابقة لمعايير التصفية المحددة
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              جرّب تغيير المحافظة أو نوع الجهاز أو توسيع نطاق السعر.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              عرض جميع المنتجات المعروضة للبيع
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const isAdded = recentlyAddedId === product.id;
              const isCompared = compareIds.includes(product.id);
              const isWishlisted = wishlistIds.includes(product.id);
              const store = storeMap.get(product.storeId);
              const hasDiscount =
                typeof product.oldPrice === 'number' &&
                product.oldPrice > product.price;
              const discountPct = hasDiscount
                ? Math.round(
                    ((product.oldPrice! - product.price) / product.oldPrice!) *
                      100
                  )
                : 0;
              const deliveryEstimate = store
                ? estimateDeliveryBetweenGovernorates(
                    store.city,
                    customerGovernorate
                  )
                : null;

              return (
                <article
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:hover:border-slate-700"
                >
                  <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    <SafeImage
                      src={product.image}
                      alt={product.name}
                      fallbackTitle={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(product.id);
                      }}
                      aria-label="حفظ في المفضلة"
                      className={`absolute top-3 left-3 w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                        isWishlisted
                          ? 'bg-rose-600 border-rose-600 text-white'
                          : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5 flex-wrap">
                        <span>{product.categoryLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{product.brand}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            product.condition === 'جديد'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {product.condition}
                        </span>
                        {hasDiscount && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                              خصم {discountPct}%
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug mb-1">
                        {product.name}
                      </h3>

                      <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                        <span className="font-medium text-blue-700 dark:text-blue-400 truncate inline-flex items-center gap-1">
                          {store?.verified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {product.storeName}
                            {store ? ` (${store.city})` : ''}
                          </span>
                        </span>
                        {store && typeof store.avgRating === 'number' && (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold tabular-nums shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            {store.avgRating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {product.condition !== 'جديد' && product.batteryHealth && (
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 tabular-nums">
                          <BatteryCharging className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>صحة البطارية {product.batteryHealth}%</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {product.previouslyOpened
                              ? 'صيانة/تبديل موثّق'
                              : 'غير مفتوح'}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {product.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatCurrency(product.price)}
                            </div>
                            {hasDiscount && (
                              <div className="text-xs text-slate-400 line-through tabular-nums">
                                {formatCurrency(product.oldPrice!)}
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums flex items-center gap-2 mt-0.5">
                            <span>ضمان {product.warrantyMonths} شهراً</span>
                            {deliveryEstimate && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1">
                                  <Truck className="w-3 h-3" />
                                  توصيل {formatCurrency(deliveryEstimate.fee)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCompare(product);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer min-h-[36px] ${
                            isCompared
                              ? 'border-blue-700 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 font-semibold'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                          <span>{isCompared ? 'مختار' : 'مقارنة'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReserveProduct(product);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors cursor-pointer min-h-[40px]"
                        >
                          <CalendarCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                          <span>حجز للشراء</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleQuickAddClick(e, product)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[40px] ${
                            isAdded
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>تمت الإضافة</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>أضف للسلة</span>
                            </>
                          )}
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

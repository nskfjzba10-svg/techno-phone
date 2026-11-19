import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { CartDrawer } from './components/CartDrawer';
import { CompareBarAndModal } from './components/CompareBarAndModal';
import { CustomerOrdersAndWarrantyView } from './components/CustomerOrdersAndWarrantyView';
import { Footer } from './components/Footer';
import { CustomerView, Header } from './components/Header';
import { ProductModal } from './components/ProductModal';
import { RepairSection } from './components/RepairSection';
import { ReserveProductModal } from './components/ReserveProductModal';
import { StoreChatDrawer } from './components/StoreChatDrawer';
import { StoreOwnerPortal } from './components/StoreOwnerPortal';
import { ConditionFilter, StoreSection } from './components/StoreSection';
import { StoresDirectorySection } from './components/StoresDirectorySection';
import { ThemeMode } from './components/ThemeToggle';
import { TradeInView } from './components/TradeInView';
import { WarrantyCardModal } from './components/WarrantyCardModal';
import { WishlistView } from './components/WishlistView';
import {
  INITIAL_PRODUCTS,
  INITIAL_REVIEWS,
  INITIAL_STORES,
  INITIAL_TRACKING_RECORDS,
  getCityCoordinates,
} from './data/catalog';
import {
  apiRequest,
  getAuthToken,
  setAuthToken,
  submitVerifiedReviewApi,
} from './lib/api';
import {
  signOutFirebase,
  syncBookingToFirestore,
  syncReviewToFirestore,
  syncTradeInToFirestore,
} from './lib/cloudSync';
import {
  AuthUser,
  CartItem,
  NotificationItem,
  Product,
  ProductCategory,
  StoreProfile,
  TrackingRecord,
  TradeInRequest,
  VerifiedReview,
  WishlistItem,
} from './types';

const CART_STORAGE_KEY = 'technophone_cart_v1';
const THEME_STORAGE_KEY = 'technophone_theme_v1';

function getInitialTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // Ignore storage access errors
  }
  return 'light';
}

function loadInitialCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [authBooting, setAuthBooting] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [ownerStore, setOwnerStore] = useState<StoreProfile | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const [customerView, setCustomerView] = useState<CustomerView>('products');
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('all');
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>('all');
  const [justRegisteredCustomer, setJustRegisteredCustomer] = useState(false);

  const [stores, setStores] = useState<StoreProfile[]>(INITIAL_STORES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>(
    INITIAL_TRACKING_RECORDS
  );
  const [reviews, setReviews] = useState<VerifiedReview[]>(INITIAL_REVIEWS);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tradeIns, setTradeIns] = useState<TradeInRequest[]>([]);

  const [selectedStore, setSelectedStore] = useState<StoreProfile | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reserveTarget, setReserveTarget] = useState<Product | null>(null);
  const [chatStore, setChatStore] = useState<StoreProfile | null>(null);
  const [warrantyCardRecord, setWarrantyCardRecord] =
    useState<TrackingRecord | null>(null);

  const [compareItems, setCompareItems] = useState<Product[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(loadInitialCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string>('TP-1042');
  const [preferredRepairStoreId, setPreferredRepairStoreId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore quota errors
    }
  }, [cart]);

  const loadCustomerExtras = useCallback(async () => {
    if (!getAuthToken()) {
      setWishlistItems([]);
      setNotifications([]);
      setTradeIns([]);
      return;
    }
    try {
      const [wishRes, notifRes, tradeRes] = await Promise.all([
        apiRequest<{ items: WishlistItem[] }>('/api/wishlist'),
        apiRequest<{ notifications: NotificationItem[] }>('/api/notifications'),
        apiRequest<{ tradeins: TradeInRequest[] }>('/api/tradeins'),
      ]);
      setWishlistItems(wishRes.items);
      setNotifications(notifRes.notifications);
      setTradeIns(tradeRes.tradeins);
    } catch {
      // Ignore transient load errors
    }
  }, []);

  const loadMarketplaceData = useCallback(async () => {
    try {
      const [storesRes, trackingRes] = await Promise.all([
        apiRequest<{
          stores: StoreProfile[];
          products: Product[];
          reviews?: VerifiedReview[];
        }>('/api/stores'),
        apiRequest<{ records: TrackingRecord[] }>('/api/tracking'),
      ]);
      setStores(storesRes.stores);
      setProducts(storesRes.products);
      if (storesRes.reviews) setReviews(storesRes.reviews);
      setTrackingRecords(trackingRes.records);
    } catch {
      // Keep initial fallback state if server is momentarily unavailable
    }
  }, []);

  useEffect(() => {
    const boot = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const me = await apiRequest<{
            user: AuthUser;
            store?: StoreProfile | null;
          }>('/api/auth/me');
          setCurrentUser(me.user);
          setOwnerStore(me.store || null);
          if (me.user.role === 'customer') {
            setCustomerView('products');
            await loadCustomerExtras();
          }
        } catch {
          setAuthToken(null);
        }
      }
      setAuthBooting(false);
      await loadMarketplaceData();
    };
    boot();
  }, [loadMarketplaceData, loadCustomerExtras]);

  // Poll customer notifications every 15s for real-time stage/reply/price alerts
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer') return;
    const timer = window.setInterval(() => {
      loadCustomerExtras();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [currentUser, loadCustomerExtras]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAuthSuccess = (
    user: AuthUser,
    store: StoreProfile | null,
    isNewRegistration: boolean
  ) => {
    setCurrentUser(user);
    setOwnerStore(store);
    setSelectedStore(null);
    setCompareItems([]);
    setIsCompareModalOpen(false);
    setChatStore(null);
    setActiveCategory('all');
    setConditionFilter('all');

    if (user.role === 'customer') {
      if (isNewRegistration) {
        setJustRegisteredCustomer(true);
        setCustomerView('stores');
      } else {
        setJustRegisteredCustomer(false);
        setCustomerView('products');
      }
      loadCustomerExtras();
    }

    loadMarketplaceData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setAuthToken(null);
    signOutFirebase();
    setCurrentUser(null);
    setOwnerStore(null);
    setSelectedStore(null);
    setJustRegisteredCustomer(false);
    setCustomerView('products');
    setActiveCategory('all');
    setConditionFilter('all');
    setWishlistItems([]);
    setNotifications([]);
    setTradeIns([]);
    loadMarketplaceData();
  };

  const handleSelectCatalogOption = (opts: {
    view: CustomerView;
    category?: ProductCategory;
    condition?: ConditionFilter;
  }) => {
    setCustomerView(opts.view);
    if (opts.view === 'products') {
      setActiveCategory(opts.category ?? 'all');
      setConditionFilter(opts.condition ?? 'all');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFooterNavigate = (sectionId: string) => {
    if (sectionId === 'repair' || sectionId === 'track') {
      setCustomerView('repair');
      window.setTimeout(() => scrollToSection(sectionId), 80);
    } else if (sectionId === 'stores') {
      setCustomerView('stores');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCustomerView('products');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectStore = async (store: StoreProfile | null) => {
    if (!store) {
      setSelectedStore(null);
      return;
    }
    try {
      const res = await apiRequest<{ store: StoreProfile; products: Product[] }>(
        `/api/stores/${encodeURIComponent(store.id)}`
      );
      setSelectedStore(res.store);
      setPreferredRepairStoreId(res.store.id);
    } catch {
      setSelectedStore(store);
      setPreferredRepairStoreId(store.id);
    }
    setCustomerView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleCompare = (product: Product) => {
    setCompareItems((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 2) {
        return [prev[1], product];
      }
      return [...prev, product];
    });
  };

  const handleToggleWishlist = async (productId: string) => {
    try {
      const res = await apiRequest<{ items: WishlistItem[] }>(
        '/api/wishlist/toggle',
        {
          method: 'POST',
          body: JSON.stringify({ productId }),
        }
      );
      setWishlistItems(res.items);
    } catch {
      // Fallback local toggle when unauthenticated
      setWishlistItems((prev) => {
        const exists = prev.some((w) => w.productId === productId);
        if (exists) return prev.filter((w) => w.productId !== productId);
        const prod = products.find((p) => p.id === productId);
        if (!prod) return prev;
        return [
          {
            id: `wish-${productId}`,
            customerId: currentUser?.id || 'guest',
            productId,
            storeId: prod.storeId,
            savedPrice: prod.price,
            notifyPriceDrop: true,
            createdAt: 'الآن',
          },
          ...prev,
        ];
      });
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
      });
    } catch {
      // Ignore
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
    } catch {
      // Ignore
    }
  };

  const addToCart = (
    product: Product,
    selectedStorage: string,
    selectedColor: string,
    unitPrice: number
  ) => {
    const key = `${product.id}__${selectedStorage}__${selectedColor}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          key,
          product,
          selectedStorage,
          selectedColor,
          unitPrice,
          quantity: 1,
        },
      ];
    });
  };

  const handleQuickAdd = (product: Product) => {
    const defaultStorage = product.storageOptions[0]?.label || 'قياسي';
    const defaultColor = product.colors[0]?.name || 'قياسي';
    addToCart(product, defaultStorage, defaultColor, product.price);
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const handleCreateBookingOrOrder = async (record: TrackingRecord) => {
    try {
      const res = await apiRequest<{ booking: TrackingRecord }>(
        '/api/bookings',
        {
          method: 'POST',
          body: JSON.stringify(record),
        }
      );
      setTrackingRecords((prev) => [res.booking, ...prev]);
      setActiveTicketId(res.booking.id);
      syncBookingToFirestore(res.booking);
    } catch {
      setTrackingRecords((prev) => [record, ...prev]);
      setActiveTicketId(record.id);
    }
  };

  const handleSubmitReview = async (payload: {
    bookingId: string;
    rating: number;
    comment: string;
  }) => {
    const res = await submitVerifiedReviewApi(payload);
    setReviews((prev) => [res.review, ...prev]);
    setTrackingRecords((prev) =>
      prev.map((r) => (r.id === res.booking.id ? res.booking : r))
    );
    syncReviewToFirestore(res.review);
    loadMarketplaceData();
  };

  const handleSubmitTradeIn = async (payload: Partial<TradeInRequest>) => {
    const res = await apiRequest<{ tradein: TradeInRequest }>('/api/tradeins', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setTradeIns((prev) => [res.tradein, ...prev]);
    syncTradeInToFirestore(res.tradein);
  };

  const handleRespondTradeIn = async (
    id: string,
    status: 'accepted' | 'rejected'
  ) => {
    const res = await apiRequest<{ tradein: TradeInRequest }>(
      `/api/tradeins/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
    setTradeIns((prev) => prev.map((t) => (t.id === id ? res.tradein : t)));
  };

  const handleTrackByCode = (code: string) => {
    setActiveTicketId(code);
    setCustomerView('repair');
    window.setTimeout(() => scrollToSection('track'), 120);
  };

  const handleChatWithStoreId = (storeId: string) => {
    const target = stores.find((s) => s.id === storeId);
    if (target) setChatStore(target);
  };

  const customerLocation = useMemo(() => {
    if (!currentUser || currentUser.role !== 'customer') return null;
    if (
      typeof currentUser.lat === 'number' &&
      typeof currentUser.lng === 'number'
    ) {
      return { lat: currentUser.lat, lng: currentUser.lng };
    }
    return getCityCoordinates(currentUser.city || 'بغداد');
  }, [currentUser]);

  const customerLocationLabel = useMemo(() => {
    if (!currentUser || currentUser.role !== 'customer') return '';
    return currentUser.city
      ? `موقعك المسجل: ${currentUser.city}`
      : 'موقعك المسجل';
  }, [currentUser]);

  const wishlistIds = useMemo(
    () => wishlistItems.map((w) => w.productId),
    [wishlistItems]
  );

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isStoreOwner =
    currentUser?.role === 'store_owner' && ownerStore !== null;

  if (authBooting) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
        جاري التحقق من الجلسة...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        cartCount={totalCartCount}
        wishlistCount={wishlistItems.length}
        notifications={notifications}
        currentUser={currentUser}
        customerView={customerView}
        activeCategory={activeCategory}
        conditionFilter={conditionFilter}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenCart={() => setIsCartOpen(true)}
        onLogout={handleLogout}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onSelectCatalogOption={handleSelectCatalogOption}
      />

      <main className="flex-1">
        {isStoreOwner && ownerStore ? (
          <StoreOwnerPortal
            currentUser={currentUser}
            store={ownerStore}
            onStoreUpdated={(updated) => {
              setOwnerStore(updated);
              loadMarketplaceData();
            }}
            onProductsChanged={loadMarketplaceData}
            onLogout={handleLogout}
          />
        ) : customerView === 'stores' ? (
          <StoresDirectorySection
            stores={stores}
            products={products}
            reviews={reviews}
            customerGovernorate={currentUser.city || 'بغداد'}
            selectedStore={null}
            initialUserLocation={customerLocation}
            initialLocationLabel={customerLocationLabel}
            isWelcomeFromRegistration={justRegisteredCustomer}
            onSelectStore={handleSelectStore}
            onChatWithStore={(store) => setChatStore(store)}
            onBookRepairAtStore={(store) => {
              setPreferredRepairStoreId(store.id);
              setCustomerView('repair');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToProducts={() => {
              setJustRegisteredCustomer(false);
              setCustomerView('products');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : customerView === 'repair' ? (
          <RepairSection
            stores={stores}
            currentUser={currentUser}
            preferredStoreId={preferredRepairStoreId}
            trackingRecords={trackingRecords}
            onCreateRepairTicket={handleCreateBookingOrOrder}
            onOpenWarrantyCard={(rec) => setWarrantyCardRecord(rec)}
            activeTicketId={activeTicketId}
            onSelectTicketId={setActiveTicketId}
          />
        ) : customerView === 'orders' ? (
          <CustomerOrdersAndWarrantyView
            currentUser={currentUser}
            trackingRecords={trackingRecords}
            tradeIns={tradeIns}
            reviews={reviews}
            onOpenWarrantyCard={(rec) => setWarrantyCardRecord(rec)}
            onTrackCode={handleTrackByCode}
            onSubmitReview={handleSubmitReview}
            onChatWithStoreId={handleChatWithStoreId}
            onGoToProducts={() => setCustomerView('products')}
            onGoToTradeIn={() => setCustomerView('tradein')}
          />
        ) : customerView === 'wishlist' ? (
          <WishlistView
            wishlistItems={wishlistItems}
            products={products}
            onToggleWishlist={handleToggleWishlist}
            onSelectProduct={(prod) => setSelectedProduct(prod)}
            onQuickAdd={handleQuickAdd}
            onReserveProduct={(prod) => setReserveTarget(prod)}
            onGoToProducts={() => setCustomerView('products')}
          />
        ) : customerView === 'tradein' ? (
          <TradeInView
            currentUser={currentUser}
            stores={stores}
            products={products}
            tradeIns={tradeIns}
            onSubmitTradeIn={handleSubmitTradeIn}
            onRespondTradeIn={handleRespondTradeIn}
          />
        ) : (
          <StoreSection
            products={products}
            stores={stores}
            customerGovernorate={currentUser.city || 'بغداد'}
            selectedStore={selectedStore}
            activeCategory={activeCategory}
            conditionFilter={conditionFilter}
            onCategoryChange={setActiveCategory}
            onConditionChange={setConditionFilter}
            compareIds={compareItems.map((p) => p.id)}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onQuickAdd={handleQuickAdd}
            onToggleCompare={handleToggleCompare}
            onReserveProduct={(product) => setReserveTarget(product)}
            onClearStoreFilter={() => setSelectedStore(null)}
            onChatWithStore={(store) => setChatStore(store)}
            onOpenStoresDirectory={() => {
              setCustomerView('stores');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {!isStoreOwner && <Footer onNavigate={handleFooterNavigate} />}

      {!isStoreOwner && (
        <>
          <ProductModal
            product={selectedProduct}
            reviews={
              selectedProduct
                ? reviews.filter((r) => r.storeId === selectedProduct.storeId)
                : []
            }
            isCompared={
              !!selectedProduct &&
              compareItems.some((p) => p.id === selectedProduct.id)
            }
            isWishlisted={
              !!selectedProduct && wishlistIds.includes(selectedProduct.id)
            }
            onToggleWishlist={handleToggleWishlist}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={(product, storage, color, price) => {
              addToCart(product, storage, color, price);
              setIsCartOpen(true);
            }}
            onReserveProduct={(product) => setReserveTarget(product)}
            onToggleCompare={handleToggleCompare}
            onChatWithStoreId={handleChatWithStoreId}
          />

          <ReserveProductModal
            product={reserveTarget}
            stores={stores}
            currentUser={currentUser}
            onClose={() => setReserveTarget(null)}
            onSubmitReservation={handleCreateBookingOrOrder}
            onTrackReservation={handleTrackByCode}
            onOpenWarrantyCard={(rec) => setWarrantyCardRecord(rec)}
          />

          <CompareBarAndModal
            compareItems={compareItems}
            isModalOpen={isCompareModalOpen}
            onOpenModal={() => setIsCompareModalOpen(true)}
            onCloseModal={() => setIsCompareModalOpen(false)}
            onRemoveFromCompare={(id) =>
              setCompareItems((prev) => prev.filter((p) => p.id !== id))
            }
            onClearCompare={() => {
              setCompareItems([]);
              setIsCompareModalOpen(false);
            }}
            onAddToCart={(prod) => {
              handleQuickAdd(prod);
              setIsCartOpen(true);
            }}
            onReserveProduct={(prod) => setReserveTarget(prod)}
          />

          <StoreChatDrawer
            store={chatStore}
            currentUser={currentUser}
            onClose={() => setChatStore(null)}
          />

          <CartDrawer
            isOpen={isCartOpen}
            items={cart}
            stores={stores}
            currentUser={currentUser}
            onClose={() => setIsCartOpen(false)}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onClearCart={() => setCart([])}
            onCompleteOrder={handleCreateBookingOrOrder}
            onTrackOrder={handleTrackByCode}
            onOpenWarrantyCard={(rec) => setWarrantyCardRecord(rec)}
          />

          <WarrantyCardModal
            record={warrantyCardRecord}
            onClose={() => setWarrantyCardRecord(null)}
          />
        </>
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  Headphones,
  Heart,
  Laptop,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Wrench,
} from 'lucide-react';
import { AuthUser, NotificationItem, ProductCategory } from '../types';
import { ConditionFilter } from './StoreSection';
import { ThemeMode, ThemeToggle } from './ThemeToggle';

export type CustomerView =
  | 'products'
  | 'stores'
  | 'repair'
  | 'orders'
  | 'wishlist'
  | 'tradein';

interface HeaderProps {
  cartCount: number;
  wishlistCount: number;
  notifications: NotificationItem[];
  currentUser: AuthUser;
  customerView: CustomerView;
  activeCategory: ProductCategory;
  conditionFilter: ConditionFilter;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenCart: () => void;
  onLogout: () => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onSelectCatalogOption: (opts: {
    view: CustomerView;
    category?: ProductCategory;
    condition?: ConditionFilter;
  }) => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  wishlistCount,
  notifications,
  currentUser,
  customerView,
  activeCategory,
  conditionFilter,
  theme,
  onToggleTheme,
  onOpenCart,
  onLogout,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onSelectCatalogOption,
}) => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);
  const isStoreOwner = currentUser.role === 'store_owner';
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!categoriesOpen && !notifOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setCategoriesOpen(false);
      }
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCategoriesOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [categoriesOpen, notifOpen]);

  const menuOptions: {
    id: string;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    dividerBefore?: boolean;
  }[] = [
    {
      id: 'all-products',
      label: 'جميع المنتجات للبيع',
      subtitle: 'كافة الأجهزة والإكسسوارات المتوفرة',
      icon: <Package className="w-4 h-4 text-blue-700 dark:text-blue-400" />,
      isActive:
        customerView === 'products' &&
        activeCategory === 'all' &&
        conditionFilter === 'all',
      onClick: () =>
        onSelectCatalogOption({
          view: 'products',
          category: 'all',
          condition: 'all',
        }),
    },
    {
      id: 'new-devices',
      label: 'أجهزة جديدة',
      subtitle: 'أجهزة جديدة مختومة بالضمان الرسمي',
      icon: (
        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      ),
      isActive: customerView === 'products' && conditionFilter === 'جديد',
      onClick: () =>
        onSelectCatalogOption({
          view: 'products',
          category: 'all',
          condition: 'جديد',
        }),
    },
    {
      id: 'used-devices',
      label: 'أجهزة مستعملة ومجددة',
      subtitle: 'فحص IMEI وصحة البطارية وضمان المتجر',
      icon: <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      isActive: customerView === 'products' && conditionFilter === 'مستعمل',
      onClick: () =>
        onSelectCatalogOption({
          view: 'products',
          category: 'all',
          condition: 'مستعمل',
        }),
    },
    {
      id: 'accessories',
      label: 'إكسسوارات',
      subtitle: 'شواحن سريعة، كفرات، قواعد حماية',
      icon: (
        <LayoutGrid className="w-4 h-4 text-slate-700 dark:text-slate-300" />
      ),
      isActive:
        customerView === 'products' && activeCategory === 'accessories',
      onClick: () =>
        onSelectCatalogOption({
          view: 'products',
          category: 'accessories',
          condition: 'all',
        }),
    },
    {
      id: 'smartphones',
      label: 'هواتف ذكية',
      subtitle: 'آيفون، سامسونج، بيكسل وغيرها',
      icon: (
        <Smartphone className="w-4 h-4 text-slate-700 dark:text-slate-300" />
      ),
      isActive:
        customerView === 'products' && activeCategory === 'smartphones',
      onClick: () =>
        onSelectCatalogOption({
          view: 'products',
          category: 'smartphones',
          condition: 'all',
        }),
    },
    {
      id: 'laptops',
      label: 'لابتوب وتابلت',
      subtitle: 'ماك بوك، آيباد، وأجهزة لوحية',
      icon: <Laptop className="w-4 h-4 text-slate-700 dark:text-slate-300" />,
      isActive:
        customerView === 'products' && activeCategory === 'laptops_tablets',
      onClick: () =>
        onSelectCatalogOption({
          view: 'products',
          category: 'laptops_tablets',
          condition: 'all',
        }),
    },
    {
      id: 'audio-watches',
      label: 'ساعات وسماعات',
      subtitle: 'ساعات ذكية وسماعات عزل الضجيج',
      icon: (
        <Headphones className="w-4 h-4 text-slate-700 dark:text-slate-300" />
      ),
      isActive:
        customerView === 'products' && activeCategory === 'audio_watches',
      onClick: () =>
        onSelectCatalogOption({
          view: 'products',
          category: 'audio_watches',
          condition: 'all',
        }),
    },
    {
      id: 'repair',
      label: 'صيانة',
      subtitle: 'حجز صيانة ورفع فيديو العطل وتتبع التذكرة',
      icon: <Wrench className="w-4 h-4 text-blue-700 dark:text-blue-400" />,
      isActive: customerView === 'repair',
      dividerBefore: true,
      onClick: () => onSelectCatalogOption({ view: 'repair' }),
    },
    {
      id: 'tradein',
      label: 'سوم / استبدال جهازك',
      subtitle: 'تقييم جهازك القديم واستبداله بجهاز أحدث',
      icon: (
        <RefreshCw className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
      ),
      isActive: customerView === 'tradein',
      onClick: () => onSelectCatalogOption({ view: 'tradein' }),
    },
    {
      id: 'orders',
      label: 'طلباتي وحجوزاتي والضمان',
      subtitle: 'سجل الطلبات، بطاقات QR، والتقييمات الموثّقة',
      icon: (
        <ClipboardList className="w-4 h-4 text-blue-700 dark:text-blue-400" />
      ),
      isActive: customerView === 'orders',
      onClick: () => onSelectCatalogOption({ view: 'orders' }),
    },
    {
      id: 'wishlist',
      label: `المفضلة (${wishlistCount})`,
      subtitle: 'الأجهزة المحفوظة وتنبيهات انخفاض السعر',
      icon: <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      isActive: customerView === 'wishlist',
      onClick: () => onSelectCatalogOption({ view: 'wishlist' }),
    },
    {
      id: 'stores',
      label: 'المتاجر القريبة من موقعك',
      subtitle: 'جميع المتاجر الموثّقة حسب المحافظة والقضاء',
      icon: <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />,
      isActive: customerView === 'stores',
      onClick: () => onSelectCatalogOption({ view: 'stores' }),
    },
  ];

  const currentMenuLabel =
    menuOptions.find((o) => o.isActive)?.label || 'الأصناف';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Top-Right Corner (الجهة اليمنى العلوية in RTL): Categories Menu Button + Brand */}
        <div className="flex items-center gap-3 sm:gap-4">
          {!isStoreOwner && (
            <div ref={menuContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setCategoriesOpen((prev) => !prev)}
                aria-expanded={categoriesOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                  categoriesOpen
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-slate-900 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white border-slate-900 dark:border-blue-700 hover:border-blue-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>الأصناف</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                    categoriesOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {categoriesOpen && (
                <div
                  role="menu"
                  aria-label="قائمة الأصناف والخدمات"
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50"
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      الأصناف والخدمات المتوفرة
                    </span>
                    <span className="text-blue-700 dark:text-blue-400 font-medium truncate max-w-[130px]">
                      {currentMenuLabel}
                    </span>
                  </div>

                  <div className="py-1 max-h-[75vh] overflow-y-auto">
                    {menuOptions.map((item) => (
                      <React.Fragment key={item.id}>
                        {item.dividerBefore && (
                          <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />
                        )}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setCategoriesOpen(false);
                            item.onClick();
                          }}
                          className={`w-full px-4 py-2.5 text-right flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            item.isActive
                              ? 'bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200'
                              : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-bold truncate">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {item.subtitle}
                              </div>
                            </div>
                          </div>
                          {item.isActive && (
                            <Check className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                          )}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (!isStoreOwner) {
                onSelectCatalogOption({
                  view: 'products',
                  category: 'all',
                  condition: 'all',
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            تكنو فون
          </button>
        </div>

        {/* Center Info */}
        <div className="hidden lg:flex items-center gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {isStoreOwner ? (
            <span className="text-slate-900 dark:text-slate-100 font-semibold whitespace-nowrap">
              لوحة إدارة متجرك الحصرية
            </span>
          ) : (
            <span className="font-medium text-slate-600 dark:text-slate-400">
              المعروض الآن:{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {currentMenuLabel}
              </strong>
            </span>
          )}
        </div>

        {/* Top-Left Actions (Theme Toggle, Notifications, Wishlist, Cart, Logout) */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          {!isStoreOwner && (
            <>
              {/* Notifications Bell */}
              <div ref={notifContainerRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((p) => !p)}
                  aria-label="الإشعارات والتنبيهات"
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono tabular-nums flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        التنبيهات الفورية ({unreadCount} غير مقروءة)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={onMarkAllNotificationsRead}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>تحديد الكل كمقروء</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          لا توجد إشعارات جديدة حالياً.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              onMarkNotificationRead(n.id);
                              setNotifOpen(false);
                              if (n.type === 'price_drop') {
                                onSelectCatalogOption({ view: 'wishlist' });
                              } else if (
                                n.type === 'stage_update' ||
                                n.type === 'tradein_quote'
                              ) {
                                onSelectCatalogOption({ view: 'orders' });
                              }
                            }}
                            className={`w-full text-right p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer space-y-1 ${
                              !n.read
                                ? 'bg-blue-50/50 dark:bg-blue-950/30'
                                : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {n.title}
                              </span>
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {n.body}
                            </p>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                              {n.createdAt}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Wishlist Shortcut */}
              <button
                type="button"
                onClick={() => onSelectCatalogOption({ view: 'wishlist' })}
                title="المفضلة وتنبيهات الأسعار"
                className={`relative inline-flex items-center justify-center w-10 h-10 rounded-lg border transition-colors cursor-pointer ${
                  customerView === 'wishlist'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Heart className="w-4 h-4" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono tabular-nums flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* My Orders Shortcut */}
              <button
                type="button"
                onClick={() => onSelectCatalogOption({ view: 'orders' })}
                title="طلباتي وحجوزاتي"
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                  customerView === 'orders'
                    ? 'border-blue-700 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>طلباتي</span>
              </button>

              <button
                type="button"
                onClick={onOpenCart}
                className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">السلة</span>
                <span className="tabular-nums font-mono text-xs bg-blue-800/80 px-1.5 py-0.5 rounded">
                  {cartCount}
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onLogout}
            title={`تسجيل الخروج (${currentUser.name})`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">
              خروج ({currentUser.name.split(' ')[0]})
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

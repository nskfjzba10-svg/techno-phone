import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  UPLOADS_DIR,
  createSessionToken,
  getDb,
  hashPassword,
  saveDb,
  verifyPassword,
  verifySessionToken,
} from './server/db.ts';
import {
  buildWarrantyQrData,
  getCityCoordinates,
} from './src/data/catalog.ts';
import type {
  AuthUser,
  ChatMessage,
  ConversationThread,
  NotificationItem,
  Product,
  PromoCode,
  StoreAnalytics,
  StoreProfile,
  StoreTechnician,
  TicketStage,
  TrackingRecord,
  TradeInRequest,
  VerifiedReview,
  WishlistItem,
} from './src/types.ts';

interface AuthedRequest extends Request {
  user?: AuthUser | null;
}

const CATEGORY_LABELS: Record<Product['category'], string> = {
  smartphones: 'هواتف ذكية',
  laptops_tablets: 'لابتوب وتابلت',
  audio_watches: 'ساعات وسماعات',
  accessories: 'شواحن وإكسسوارات',
};

const CATEGORY_DEFAULT_IMAGE: Record<Product['category'], string> = {
  smartphones: '/src/assets/images/product_titanium_phone_1794983260872.jpg',
  laptops_tablets: '/src/assets/images/product_pro_laptop_1794983261756.jpg',
  audio_watches: '/src/assets/images/product_smartwatch_audio_1794983264111.jpg',
  accessories: '/src/assets/images/product_gan_accessories_1794983264416.jpg',
};

function parseAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    req.user = verifySessionToken(token);
  } else {
    req.user = null;
  }
  next();
}

function nowTimeLabel(): string {
  const d = new Date();
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function nowDateTimeLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function computeStoreAnalytics(
  storeId: string,
  bookings: TrackingRecord[],
  reviews: VerifiedReview[],
  store?: StoreProfile
): StoreAnalytics {
  const storeBookings = bookings.filter((b) => b.storeId === storeId);
  const completedBookings = storeBookings.filter((b) => b.stage === 4);
  const pendingRepairs = storeBookings.filter(
    (b) => b.kind === 'repair' && b.stage < 4
  ).length;
  const salesRevenue = storeBookings
    .filter((b) => b.kind === 'order' || b.kind === 'reservation')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const repairRevenue = storeBookings
    .filter((b) => b.kind === 'repair')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const productCounter = new Map<string, { count: number; revenue: number }>();
  for (const bk of storeBookings) {
    if (bk.kind !== 'repair') {
      const key = bk.title;
      const prev = productCounter.get(key) || { count: 0, revenue: 0 };
      productCounter.set(key, {
        count: prev.count + 1,
        revenue: prev.revenue + (bk.totalPrice || 0),
      });
    }
  }
  const topProducts = Array.from(productCounter.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const storeReviews = reviews.filter((r) => r.storeId === storeId);
  const reviewCount = storeReviews.length;
  const avgRating =
    reviewCount > 0
      ? Number(
          (
            storeReviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount
          ).toFixed(1)
        )
      : store?.avgRating ?? 4.8;

  return {
    totalOrders: storeBookings.length,
    completedOrders: completedBookings.length,
    pendingRepairs,
    salesRevenue,
    repairRevenue,
    totalRevenue: salesRevenue + repairRevenue,
    avgRating,
    reviewCount,
    topProducts,
  };
}

function pushNotification(
  db: ReturnType<typeof getDb>,
  item: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>
) {
  if (!item.userId) return;
  const notification: NotificationItem = {
    id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: nowDateTimeLabel(),
    ...item,
  };
  db.notifications.unshift(notification);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '14mb' }));
  app.use(parseAuth);

  // Serve uploaded fault media & documents
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/api/uploads', express.static(UPLOADS_DIR));

  // ── Media Upload Endpoint (Images & Short Videos up to ~8MB) ──────────────
  app.post('/api/uploads', (req: Request, res: Response) => {
    const { filename, mimeType, dataUrl } = req.body as {
      filename?: string;
      mimeType?: string;
      dataUrl?: string;
    };
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes('base64,')) {
      res.status(400).json({ error: 'بيانات الملف المرفوع غير صالحة.' });
      return;
    }

    const base64Part = dataUrl.split('base64,')[1];
    const buffer = Buffer.from(base64Part, 'base64');
    if (buffer.length > 8.5 * 1024 * 1024) {
      res.status(413).json({ error: 'حجم الملف يتجاوز 8 ميجابايت.' });
      return;
    }

    const safeMime = (mimeType || '').toLowerCase();
    const isVideo = safeMime.startsWith('video/');
    let ext = isVideo ? 'mp4' : 'jpg';
    if (safeMime.includes('png')) ext = 'png';
    else if (safeMime.includes('webp')) ext = 'webp';
    else if (safeMime.includes('webm')) ext = 'webm';
    else if (safeMime.includes('quicktime') || filename?.toLowerCase().endsWith('.mov'))
      ext = 'mov';

    const outName = `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const targetPath = path.join(UPLOADS_DIR, outName);
    fs.writeFileSync(targetPath, buffer);

    res.status(201).json({
      url: `/api/uploads/${outName}`,
      kind: isVideo ? 'video' : 'image',
    });
  });

  // ── Auth Routes ────────────────────────────────────────────────────────────
  app.get('/api/auth/me', (req: AuthedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'غير مسجل الدخول' });
      return;
    }
    const db = getDb();
    const myStore =
      req.user.role === 'store_owner' && req.user.storeId
        ? db.stores.find((s) => s.id === req.user?.storeId) || null
        : null;
    res.json({ user: req.user, store: myStore });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
      return;
    }
    const db = getDb();
    const found = db.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!found || !verifyPassword(password, found.passwordHash)) {
      res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
      return;
    }

    const authUser: AuthUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      storeId: found.storeId,
      city: found.city,
      district: found.district,
      lat: found.lat,
      lng: found.lng,
      authProvider: 'local',
    };
    const token = createSessionToken(authUser);
    const store =
      found.role === 'store_owner' && found.storeId
        ? db.stores.find((s) => s.id === found.storeId) || null
        : null;

    res.json({ token, user: authUser, store });
  });

  app.post('/api/auth/register-store', (req: Request, res: Response) => {
    const body = req.body as {
      ownerName?: string;
      email?: string;
      password?: string;
      storeName?: string;
      logo?: string;
      city?: string;
      district?: string;
      address?: string;
      phone?: string;
      workingHours?: string;
      description?: string;
      specialties?: string[];
      licenseDocUrl?: string;
      lat?: number;
      lng?: number;
    };

    if (
      !body.ownerName?.trim() ||
      !body.email?.trim() ||
      !body.password ||
      !body.storeName?.trim() ||
      !body.city?.trim() ||
      !body.address?.trim() ||
      !body.phone?.trim()
    ) {
      res.status(400).json({
        error: 'يرجى استكمال جميع البيانات الأساسية لحساب المتجر والشعار والموقع.',
      });
      return;
    }

    const db = getDb();
    const emailNormalized = body.email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === emailNormalized)) {
      res.status(409).json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً.' });
      return;
    }

    const storeId = `store-${Date.now().toString(36)}`;
    const ownerId = `owner-${Date.now().toString(36)}`;
    const defaultCoords = getCityCoordinates(body.city.trim());
    const lat =
      typeof body.lat === 'number' && Number.isFinite(body.lat)
        ? body.lat
        : defaultCoords.lat;
    const lng =
      typeof body.lng === 'number' && Number.isFinite(body.lng)
        ? body.lng
        : defaultCoords.lng;

    const hasLicenseDoc = Boolean(body.licenseDocUrl?.trim());

    const newStore: StoreProfile = {
      id: storeId,
      ownerId,
      name: body.storeName.trim(),
      logo:
        body.logo?.trim() ||
        '/src/assets/images/product_titanium_phone_1794983260872.jpg',
      city: body.city.trim(),
      district: body.district?.trim() || '',
      address: body.address.trim(),
      phone: body.phone.trim(),
      workingHours:
        body.workingHours?.trim() || '10:00 صباحاً – 10:30 مساءً',
      description:
        body.description?.trim() ||
        'متجر متخصص في بيع وصيانة الأجهزة الذكية بضمان معتمد.',
      specialties:
        Array.isArray(body.specialties) && body.specialties.length > 0
          ? body.specialties
          : ['بيع الأجهزة الذكية', 'صيانة فورية'],
      lat,
      lng,
      verified: false,
      verificationStatus: hasLicenseDoc ? 'pending' : 'unverified',
      licenseDocUrl: body.licenseDocUrl?.trim() || undefined,
      avgRating: 5.0,
      reviewCount: 0,
      technicians: [{ id: `tech-${Date.now().toString(36)}`, name: body.ownerName.trim(), specialty: 'الإدارة والصيانة العامة' }],
      promoCodes: [],
      createdAt: nowDateTimeLabel(),
    };

    const newUser = {
      id: ownerId,
      name: body.ownerName.trim(),
      email: emailNormalized,
      passwordHash: hashPassword(body.password),
      role: 'store_owner' as const,
      storeId,
    };

    db.users.push(newUser);
    db.stores.unshift(newStore);
    saveDb(db);

    const authUser: AuthUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: 'store_owner',
      storeId,
      authProvider: 'local',
    };
    const token = createSessionToken(authUser);

    res.status(201).json({ token, user: authUser, store: newStore });
  });

  app.post('/api/auth/register-customer', (req: Request, res: Response) => {
    const { name, email, password, city, district, lat, lng } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      city?: string;
      district?: string;
      lat?: number;
      lng?: number;
    };
    if (!name?.trim() || !email?.trim() || !password) {
      res.status(400).json({ error: 'يرجى إدخال الاسم والبريد وكلمة المرور' });
      return;
    }
    const db = getDb();
    const emailNorm = email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === emailNorm)) {
      res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
      return;
    }
    const customerCity = city?.trim() || 'بغداد';
    const defaultCoords = getCityCoordinates(customerCity);
    const resolvedLat =
      typeof lat === 'number' && Number.isFinite(lat) ? lat : defaultCoords.lat;
    const resolvedLng =
      typeof lng === 'number' && Number.isFinite(lng) ? lng : defaultCoords.lng;

    const newUser = {
      id: `cust-${Date.now().toString(36)}`,
      name: name.trim(),
      email: emailNorm,
      passwordHash: hashPassword(password),
      role: 'customer' as const,
      city: customerCity,
      district: district?.trim() || '',
      lat: resolvedLat,
      lng: resolvedLng,
    };
    db.users.push(newUser);
    saveDb(db);

    const authUser: AuthUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: 'customer',
      city: newUser.city,
      district: newUser.district,
      lat: newUser.lat,
      lng: newUser.lng,
      authProvider: 'local',
    };
    const token = createSessionToken(authUser);
    res.status(201).json({ token, user: authUser });
  });

  // ── Stores & Products Directory ────────────────────────────────────────────
  app.get('/api/stores', (req: AuthedRequest, res: Response) => {
    const db = getDb();
    if (req.user?.role === 'store_owner') {
      const ownStore = db.stores.filter((s) => s.id === req.user?.storeId);
      const ownProducts = db.products.filter(
        (p) => p.storeId === req.user?.storeId
      );
      res.json({
        stores: ownStore,
        products: ownProducts,
        reviews: db.reviews.filter((r) => r.storeId === req.user?.storeId),
        restrictedToOwnStore: true,
      });
      return;
    }

    res.json({
      stores: db.stores,
      products: db.products,
      reviews: db.reviews,
      restrictedToOwnStore: false,
    });
  });

  app.get('/api/stores/:storeId', (req: AuthedRequest, res: Response) => {
    const { storeId } = req.params;
    if (req.user?.role === 'store_owner' && req.user.storeId !== storeId) {
      res.status(403).json({
        error:
          'غير مصرح لصاحب المتجر بالدخول إلى المتاجر الأخرى. حسابك مخصص لإدارة متجرك فقط.',
      });
      return;
    }

    const db = getDb();
    const store = db.stores.find((s) => s.id === storeId);
    if (!store) {
      res.status(404).json({ error: 'المتجر غير موجود' });
      return;
    }
    const products = db.products.filter((p) => p.storeId === storeId);
    const reviews = db.reviews.filter((r) => r.storeId === storeId);
    res.json({ store, products, reviews });
  });

  // Update Own Store Profile (Logo, Name, Location, Verification Docs, Technicians, PromoCodes)
  app.put('/api/stores/:storeId', (req: AuthedRequest, res: Response) => {
    const { storeId } = req.params;
    if (!req.user || req.user.role !== 'store_owner') {
      res.status(401).json({ error: 'يجب تسجيل الدخول بحساب متجر' });
      return;
    }
    if (req.user.storeId !== storeId) {
      res.status(403).json({
        error: 'غير مصرح لك بتعديل بيانات متجر آخر.',
      });
      return;
    }

    const db = getDb();
    const idx = db.stores.findIndex((s) => s.id === storeId);
    if (idx === -1) {
      res.status(404).json({ error: 'المتجر غير موجود' });
      return;
    }

    const body = req.body as Partial<StoreProfile> & {
      submitVerification?: boolean;
    };
    const nextCity = body.city?.trim() || db.stores[idx].city;
    const cityChanged = nextCity !== db.stores[idx].city;
    const cityFallbackCoords = getCityCoordinates(nextCity);

    let nextVerificationStatus = db.stores[idx].verificationStatus || 'unverified';
    let nextVerified = db.stores[idx].verified;
    if (body.licenseDocUrl && body.licenseDocUrl !== db.stores[idx].licenseDocUrl) {
      nextVerificationStatus = 'pending';
      nextVerified = false;
    }

    const updated: StoreProfile = {
      ...db.stores[idx],
      name: body.name?.trim() || db.stores[idx].name,
      logo: body.logo?.trim() || db.stores[idx].logo,
      city: nextCity,
      district:
        body.district !== undefined
          ? body.district.trim()
          : db.stores[idx].district,
      address: body.address?.trim() || db.stores[idx].address,
      phone: body.phone?.trim() || db.stores[idx].phone,
      workingHours: body.workingHours?.trim() || db.stores[idx].workingHours,
      description: body.description?.trim() || db.stores[idx].description,
      specialties:
        Array.isArray(body.specialties) && body.specialties.length > 0
          ? body.specialties
          : db.stores[idx].specialties,
      licenseDocUrl:
        body.licenseDocUrl !== undefined
          ? body.licenseDocUrl
          : db.stores[idx].licenseDocUrl,
      verificationStatus: nextVerificationStatus,
      verified: nextVerified,
      technicians: Array.isArray(body.technicians)
        ? (body.technicians as StoreTechnician[])
        : db.stores[idx].technicians,
      promoCodes: Array.isArray(body.promoCodes)
        ? (body.promoCodes as PromoCode[])
        : db.stores[idx].promoCodes,
      lat:
        typeof body.lat === 'number' && Number.isFinite(body.lat)
          ? body.lat
          : cityChanged
            ? cityFallbackCoords.lat
            : db.stores[idx].lat,
      lng:
        typeof body.lng === 'number' && Number.isFinite(body.lng)
          ? body.lng
          : cityChanged
            ? cityFallbackCoords.lng
            : db.stores[idx].lng,
    };

    db.stores[idx] = updated;
    db.products = db.products.map((p) =>
      p.storeId === storeId ? { ...p, storeName: updated.name } : p
    );
    saveDb(db);
    res.json({ store: updated });
  });

  // Add Product to Own Store
  app.post(
    '/api/stores/:storeId/products',
    (req: AuthedRequest, res: Response) => {
      const { storeId } = req.params;
      if (!req.user || req.user.role !== 'store_owner') {
        res.status(401).json({ error: 'يجب تسجيل الدخول بحساب متجر' });
        return;
      }
      if (req.user.storeId !== storeId) {
        res.status(403).json({
          error: 'غير مصرح لك بإضافة منتجات لمتجر آخر.',
        });
        return;
      }

      const db = getDb();
      const store = db.stores.find((s) => s.id === storeId);
      if (!store) {
        res.status(404).json({ error: 'المتجر غير موجود' });
        return;
      }

      const body = req.body as {
        name?: string;
        brand?: string;
        category?: Product['category'];
        price?: number;
        oldPrice?: number;
        condition?: 'جديد' | 'مستعمل' | 'مجدد معتمد';
        warrantyMonths?: number;
        image?: string;
        extraImages?: string[];
        imei?: string;
        batteryHealth?: number;
        previouslyOpened?: boolean;
        summary?: string;
        screenSpec?: string;
        processorSpec?: string;
        batterySpec?: string;
        storageLabel?: string;
        colorName?: string;
      };

      if (!body.name?.trim() || !body.brand?.trim() || !body.price) {
        res.status(400).json({ error: 'يرجى إدخال اسم المنتج والعلامة والسعر.' });
        return;
      }

      const category: Product['category'] =
        body.category && CATEGORY_LABELS[body.category]
          ? body.category
          : 'smartphones';

      const normalizedCondition: Product['condition'] =
        body.condition === 'مستعمل'
          ? 'مستعمل'
          : body.condition === 'مجدد معتمد'
            ? 'مجدد معتمد'
            : 'جديد';

      const numericPrice = Number(body.price);
      const numericOldPrice =
        body.oldPrice && Number(body.oldPrice) > numericPrice
          ? Number(body.oldPrice)
          : undefined;

      const newProduct: Product = {
        id: `prod-${Date.now().toString(36)}`,
        storeId: store.id,
        ownerId: store.ownerId,
        storeName: store.name,
        name: body.name.trim(),
        brand: body.brand.trim(),
        category,
        categoryLabel: CATEGORY_LABELS[category],
        price: numericPrice,
        oldPrice: numericOldPrice,
        condition: normalizedCondition,
        inStock: true,
        warrantyMonths: Number(body.warrantyMonths) || 12,
        image: body.image?.trim() || CATEGORY_DEFAULT_IMAGE[category],
        extraImages: Array.isArray(body.extraImages)
          ? body.extraImages.filter(Boolean)
          : undefined,
        imei: body.imei?.trim() || undefined,
        batteryHealth:
          typeof body.batteryHealth === 'number' &&
          body.batteryHealth >= 1 &&
          body.batteryHealth <= 100
            ? body.batteryHealth
            : undefined,
        previouslyOpened:
          typeof body.previouslyOpened === 'boolean'
            ? body.previouslyOpened
            : undefined,
        summary:
          body.summary?.trim() ||
          'جهاز متوفر لدى المتجر مع فحص جودة وضمان رسمي.',
        specs: [
          {
            label: 'الشاشة',
            value: body.screenSpec?.trim() || 'شاشة عالية الدقة',
          },
          {
            label: 'المعالج',
            value: body.processorSpec?.trim() || 'معالج رائد عالي الأداء',
          },
          {
            label: 'البطارية والشحن',
            value:
              body.batterySpec?.trim() ||
              (body.batteryHealth
                ? `صحة البطارية ${body.batteryHealth}%`
                : 'شحن سريع · صحة 100%'),
          },
        ],
        storageOptions: [
          { label: body.storageLabel?.trim() || '256 جيجابايت', priceDelta: 0 },
        ],
        colors: [
          { name: body.colorName?.trim() || 'أسود / قياسي', hex: '#334155' },
        ],
      };

      db.products.unshift(newProduct);
      saveDb(db);
      res.status(201).json({ product: newProduct });
    }
  );

  // Update Product (triggers Price Drop notifications to wishlisted customers!)
  app.patch(
    '/api/stores/:storeId/products/:productId',
    (req: AuthedRequest, res: Response) => {
      const { storeId, productId } = req.params;
      if (!req.user || req.user.role !== 'store_owner') {
        res.status(401).json({ error: 'يجب تسجيل الدخول بحساب متجر' });
        return;
      }
      if (req.user.storeId !== storeId) {
        res.status(403).json({ error: 'غير مصرح لك بتعديل منتجات متجر آخر.' });
        return;
      }
      const db = getDb();
      const idx = db.products.findIndex(
        (p) => p.id === productId && p.storeId === storeId
      );
      if (idx === -1) {
        res.status(404).json({ error: 'المنتج غير موجود' });
        return;
      }
      const existing = db.products[idx];
      const { price, oldPrice, inStock } = req.body as {
        price?: number;
        oldPrice?: number;
        inStock?: boolean;
      };

      const nextPrice =
        typeof price === 'number' && price > 0 ? price : existing.price;
      const computedOldPrice =
        typeof oldPrice === 'number' && oldPrice > nextPrice
          ? oldPrice
          : nextPrice < existing.price
            ? existing.price
            : existing.oldPrice;

      db.products[idx] = {
        ...existing,
        price: nextPrice,
        oldPrice:
          computedOldPrice && computedOldPrice > nextPrice
            ? computedOldPrice
            : undefined,
        inStock: typeof inStock === 'boolean' ? inStock : existing.inStock,
      };

      // Emit price drop notification to wishlisting customers
      if (nextPrice < existing.price) {
        const watchers = db.wishlists.filter(
          (w) => w.productId === productId && w.notifyPriceDrop
        );
        for (const w of watchers) {
          pushNotification(db, {
            userId: w.customerId,
            senderId: req.user.id,
            title: `تنبيه انخفاض سعر: ${existing.name}`,
            body: `انخفض السعر إلى ${nextPrice.toLocaleString('en-US')} د.ع بدلاً من ${existing.price.toLocaleString('en-US')} د.ع في ${existing.storeName}.`,
            type: 'price_drop',
            relatedId: existing.id,
          });
        }
      }

      saveDb(db);
      res.json({ product: db.products[idx] });
    }
  );

  // Delete Product from Own Store
  app.delete(
    '/api/stores/:storeId/products/:productId',
    (req: AuthedRequest, res: Response) => {
      const { storeId, productId } = req.params;
      if (!req.user || req.user.role !== 'store_owner') {
        res.status(401).json({ error: 'يجب تسجيل الدخول بحساب متجر' });
        return;
      }
      if (req.user.storeId !== storeId) {
        res.status(403).json({
          error: 'غير مصرح لك بحذف منتجات متجر آخر.',
        });
        return;
      }
      const db = getDb();
      db.products = db.products.filter(
        (p) => !(p.id === productId && p.storeId === storeId)
      );
      saveDb(db);
      res.json({ ok: true });
    }
  );

  // Validate Promo Code for a Store
  app.post('/api/promo-validate', (req: Request, res: Response) => {
    const { storeId, code } = req.body as { storeId?: string; code?: string };
    if (!storeId || !code?.trim()) {
      res.status(400).json({ error: 'يرجى إدخال كود الخصم.' });
      return;
    }
    const db = getDb();
    const store = db.stores.find((s) => s.id === storeId);
    const normalized = code.trim().toUpperCase();
    const found = store?.promoCodes?.find(
      (p) => p.active && p.code.toUpperCase() === normalized
    );
    if (!found) {
      res.status(404).json({ error: 'كود الخصم غير صالح أو منتهي الصلاحية لهذا المتجر.' });
      return;
    }
    res.json({ promo: found });
  });

  // Store Owner Dashboard (Own Bookings + Conversations + Analytics + Reviews + Trade-ins)
  app.get(
    '/api/stores/:storeId/dashboard',
    (req: AuthedRequest, res: Response) => {
      const { storeId } = req.params;
      if (!req.user || req.user.role !== 'store_owner') {
        res.status(401).json({ error: 'يجب تسجيل الدخول بحساب متجر' });
        return;
      }
      if (req.user.storeId !== storeId) {
        res.status(403).json({
          error:
            'غير مصرح لصاحب المتجر بالدخول إلى لوحة تحكم المتاجر الأخرى.',
        });
        return;
      }

      const db = getDb();
      const store = db.stores.find((s) => s.id === storeId);
      const products = db.products.filter((p) => p.storeId === storeId);
      const bookings = db.bookings.filter((b) => b.storeId === storeId);
      const storeMessages = db.messages.filter((m) => m.storeId === storeId);
      const reviews = db.reviews.filter((r) => r.storeId === storeId);
      const tradeins = db.tradeins.filter((t) => t.storeId === storeId);
      const analytics = computeStoreAnalytics(
        storeId,
        db.bookings,
        db.reviews,
        store
      );

      const threadMap = new Map<string, ConversationThread>();
      for (const msg of storeMessages) {
        const existing = threadMap.get(msg.customerSessionId);
        if (existing) {
          existing.messages.push(msg);
          existing.lastMessageAt = msg.createdAt;
        } else {
          threadMap.set(msg.customerSessionId, {
            customerSessionId: msg.customerSessionId,
            customerName: msg.customerName,
            storeId,
            lastMessageAt: msg.createdAt,
            messages: [msg],
          });
        }
      }

      res.json({
        store,
        products,
        bookings,
        threads: Array.from(threadMap.values()),
        reviews,
        tradeins,
        analytics,
      });
    }
  );

  // Update Booking Stage / Technician / Report (Store Owner Only for Own Store)
  app.patch(
    '/api/stores/:storeId/bookings/:bookingId',
    (req: AuthedRequest, res: Response) => {
      const { storeId, bookingId } = req.params;
      if (!req.user || req.user.role !== 'store_owner') {
        res.status(401).json({ error: 'يجب تسجيل الدخول بحساب متجر' });
        return;
      }
      if (req.user.storeId !== storeId) {
        res.status(403).json({ error: 'غير مصرح لك بتحديث حجوزات متجر آخر.' });
        return;
      }

      const {
        stage,
        notes,
        estimatedReady,
        assignedTechnician,
        technicianReport,
      } = req.body as {
        stage?: TicketStage;
        notes?: string;
        estimatedReady?: string;
        assignedTechnician?: string;
        technicianReport?: string;
      };

      const db = getDb();
      const idx = db.bookings.findIndex(
        (b) => b.id === bookingId && b.storeId === storeId
      );
      if (idx === -1) {
        res.status(404).json({ error: 'الحجز غير موجود' });
        return;
      }

      const existing = db.bookings[idx];
      const nextStage = stage ?? existing.stage;
      let qrData = existing.warrantyQrCodeData;
      if (nextStage === 4 && !qrData) {
        qrData = buildWarrantyQrData({
          id: existing.id,
          storeName: existing.storeName,
          customerName: existing.customerName,
          title: existing.title,
          warrantyLabel: existing.warrantyLabel,
          createdAt: existing.createdAt,
        });
      }

      db.bookings[idx] = {
        ...existing,
        stage: nextStage,
        notes: notes !== undefined ? notes.trim() : existing.notes,
        estimatedReady:
          estimatedReady !== undefined
            ? estimatedReady.trim()
            : nextStage === 4
              ? 'مكتمل — بطاقة الضمان مفعّلة'
              : existing.estimatedReady,
        assignedTechnician:
          assignedTechnician !== undefined
            ? assignedTechnician.trim()
            : existing.assignedTechnician,
        technicianReport:
          technicianReport !== undefined
            ? technicianReport.trim()
            : existing.technicianReport,
        warrantyQrCodeData: qrData,
      };

      // Send notification to customer if stage changed
      if (nextStage !== existing.stage && existing.customerId) {
        const stageText = existing.stageLabels[nextStage - 1] || `المرحلة ${nextStage}`;
        pushNotification(db, {
          userId: existing.customerId,
          senderId: req.user.id,
          title: `تحديث حالة ${existing.id}: ${stageText}`,
          body:
            nextStage === 4
              ? `أصبح طلبك "${existing.title}" مكتملاً وجاهزاً مع بطاقة الضمان الإلكترونية QR.`
              : `انتقل طلبك "${existing.title}" في ${existing.storeName} إلى مرحلة: ${stageText}.`,
          type: 'stage_update',
          relatedId: existing.id,
        });
      }

      saveDb(db);
      res.json({ booking: db.bookings[idx] });
    }
  );

  // ── Verified Reviews (Strictly after stage === 4) ──────────────────────────
  app.get('/api/reviews', (req: Request, res: Response) => {
    const storeId = String(req.query.storeId || '').trim();
    const db = getDb();
    const reviews = storeId
      ? db.reviews.filter((r) => r.storeId === storeId)
      : db.reviews;
    res.json({ reviews });
  });

  app.post('/api/reviews', (req: AuthedRequest, res: Response) => {
    if (!req.user || req.user.role !== 'customer') {
      res.status(401).json({ error: 'يجب تسجيل الدخول كزبون لتقييم الخدمة.' });
      return;
    }

    const { bookingId, rating, comment, productId } = req.body as {
      bookingId?: string;
      rating?: number;
      comment?: string;
      productId?: string;
    };

    if (!bookingId?.trim() || !rating || !comment?.trim() || comment.trim().length < 3) {
      res.status(400).json({ error: 'يرجى تحديد التقييم بالنجوم وكتابة تعليق لا يقل عن 3 أحرف.' });
      return;
    }
    const clampedRating = Math.min(5, Math.max(1, Number(rating)));

    const db = getDb();
    const bookingIdx = db.bookings.findIndex(
      (b) => b.id.toUpperCase() === bookingId.trim().toUpperCase()
    );
    if (bookingIdx === -1) {
      res.status(404).json({ error: 'الحجز غير موجود.' });
      return;
    }
    const booking = db.bookings[bookingIdx];
    if (booking.customerId && booking.customerId !== req.user.id) {
      res.status(403).json({ error: 'يمكن تقييم الحجوزات الخاصة بحسابك فقط.' });
      return;
    }
    if (booking.stage !== 4) {
      res.status(400).json({
        error: 'التقييم متاح فقط بعد إتمام الحجز أو الصيانة بشكل كامل (المرحلة الرابعة).',
      });
      return;
    }
    if (
      booking.reviewed ||
      db.reviews.some((r) => r.bookingId.toUpperCase() === booking.id.toUpperCase())
    ) {
      res.status(409).json({ error: 'تم تقييم هذا الطلب مسبقاً.' });
      return;
    }

    const newReview: VerifiedReview = {
      id: `rev-${booking.id}`,
      storeId: booking.storeId,
      bookingId: booking.id,
      productId: productId || undefined,
      customerId: req.user.id,
      customerName: req.user.name,
      rating: clampedRating,
      comment: comment.trim(),
      verifiedPurchase: true,
      createdAt: nowDateTimeLabel(),
    };

    db.reviews.unshift(newReview);
    db.bookings[bookingIdx] = { ...booking, reviewed: true };

    // Update store rating aggregates
    const storeReviews = db.reviews.filter((r) => r.storeId === booking.storeId);
    const avg = Number(
      (
        storeReviews.reduce((acc, r) => acc + r.rating, 0) / storeReviews.length
      ).toFixed(1)
    );
    db.stores = db.stores.map((s) =>
      s.id === booking.storeId
        ? { ...s, avgRating: avg, reviewCount: storeReviews.length }
        : s
    );

    saveDb(db);
    res.status(201).json({ review: newReview, booking: db.bookings[bookingIdx] });
  });

  // ── Customer Wishlist & Price-Drop Alerts ──────────────────────────────────
  app.get('/api/wishlist', (req: AuthedRequest, res: Response) => {
    if (!req.user) {
      res.json({ items: [] });
      return;
    }
    const db = getDb();
    const items = db.wishlists.filter((w) => w.customerId === req.user?.id);
    res.json({ items });
  });

  app.post('/api/wishlist/toggle', (req: AuthedRequest, res: Response) => {
    if (!req.user || req.user.role !== 'customer') {
      res.status(401).json({ error: 'يرجى تسجيل الدخول كزبون لحفظ المفضلة.' });
      return;
    }
    const { productId } = req.body as { productId?: string };
    if (!productId) {
      res.status(400).json({ error: 'معرف المنتج مطلوب' });
      return;
    }
    const db = getDb();
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'المنتج غير موجود' });
      return;
    }
    const existingIdx = db.wishlists.findIndex(
      (w) => w.customerId === req.user?.id && w.productId === productId
    );
    if (existingIdx !== -1) {
      db.wishlists.splice(existingIdx, 1);
      saveDb(db);
      res.json({ saved: false, items: db.wishlists.filter((w) => w.customerId === req.user?.id) });
      return;
    }

    const newItem: WishlistItem = {
      id: `wish-${Date.now().toString(36)}`,
      customerId: req.user.id,
      productId: product.id,
      storeId: product.storeId,
      savedPrice: product.oldPrice && product.oldPrice > product.price ? product.oldPrice : product.price,
      notifyPriceDrop: true,
      createdAt: nowDateTimeLabel(),
    };
    db.wishlists.unshift(newItem);
    saveDb(db);
    res.status(201).json({
      saved: true,
      item: newItem,
      items: db.wishlists.filter((w) => w.customerId === req.user?.id),
    });
  });

  // ── Notifications Feed ─────────────────────────────────────────────────────
  app.get('/api/notifications', (req: AuthedRequest, res: Response) => {
    if (!req.user) {
      res.json({ notifications: [] });
      return;
    }
    const db = getDb();
    const notifications = db.notifications.filter(
      (n) => n.userId === req.user?.id
    );
    res.json({ notifications });
  });

  app.patch('/api/notifications/:id/read', (req: AuthedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'غير مصرح' });
      return;
    }
    const db = getDb();
    const idx = db.notifications.findIndex(
      (n) => n.id === req.params.id && n.userId === req.user?.id
    );
    if (idx !== -1) {
      db.notifications[idx].read = true;
      saveDb(db);
    }
    res.json({ ok: true });
  });

  app.post('/api/notifications/read-all', (req: AuthedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'غير مصرح' });
      return;
    }
    const db = getDb();
    db.notifications = db.notifications.map((n) =>
      n.userId === req.user?.id ? { ...n, read: true } : n
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // ── Trade-In ("سوم / استبدال جهازك") ──────────────────────────────────────
  app.get('/api/tradeins', (req: AuthedRequest, res: Response) => {
    if (!req.user) {
      res.json({ tradeins: [] });
      return;
    }
    const db = getDb();
    const tradeins =
      req.user.role === 'store_owner'
        ? db.tradeins.filter((t) => t.storeId === req.user?.storeId)
        : db.tradeins.filter((t) => t.customerId === req.user?.id);
    res.json({ tradeins });
  });

  app.post('/api/tradeins', (req: AuthedRequest, res: Response) => {
    if (!req.user || req.user.role !== 'customer') {
      res.status(401).json({ error: 'يرجى تسجيل الدخول كزبون لإرسال طلب استبدال.' });
      return;
    }
    const body = req.body as Partial<TradeInRequest>;
    if (!body.storeId || !body.model?.trim() || !body.phone?.trim()) {
      res.status(400).json({ error: 'يرجى اختيار المتجر وموديل الجهاز ورقم الجوال.' });
      return;
    }
    const db = getDb();
    const store = db.stores.find((s) => s.id === body.storeId);
    if (!store) {
      res.status(404).json({ error: 'المتجر غير موجود.' });
      return;
    }
    const targetProduct = body.targetProductId
      ? db.products.find((p) => p.id === body.targetProductId)
      : undefined;

    const reqItem: TradeInRequest = {
      id: `TRD-2026-${Math.floor(100 + Math.random() * 899)}`,
      storeId: store.id,
      storeOwnerId: store.ownerId,
      storeName: store.name,
      customerId: req.user.id,
      customerName: body.customerName?.trim() || req.user.name,
      phone: body.phone.trim(),
      deviceType: body.deviceType || 'smartphone',
      model: body.model.trim(),
      storage: body.storage?.trim() || '256 جيجابايت',
      batteryHealth: Number(body.batteryHealth) || 90,
      conditionNotes: body.conditionNotes?.trim() || 'حالة جيدة جداً',
      imei: body.imei?.trim() || undefined,
      photoUrl: body.photoUrl?.trim() || undefined,
      estimatedValue: Number(body.estimatedValue) || 400000,
      targetProductId: targetProduct?.id,
      targetProductName: targetProduct?.name || body.targetProductName,
      status: 'pending',
      createdAt: nowDateTimeLabel(),
    };

    db.tradeins.unshift(reqItem);
    saveDb(db);
    res.status(201).json({ tradein: reqItem });
  });

  app.patch('/api/tradeins/:id', (req: AuthedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'يجب تسجيل الدخول.' });
      return;
    }
    const db = getDb();
    const idx = db.tradeins.findIndex((t) => t.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'طلب الاستبدال غير موجود.' });
      return;
    }
    const item = db.tradeins[idx];
    const { offeredValue, status, storeNotes } = req.body as {
      offeredValue?: number;
      status?: TradeInRequest['status'];
      storeNotes?: string;
    };

    if (req.user.role === 'store_owner') {
      if (item.storeId !== req.user.storeId) {
        res.status(403).json({ error: 'غير مصرح لمتجر آخر بتحديث هذا الطلب.' });
        return;
      }
      const nextStatus: TradeInRequest['status'] =
        status === 'rejected' ? 'rejected' : 'quoted';
      db.tradeins[idx] = {
        ...item,
        offeredValue:
          typeof offeredValue === 'number' && offeredValue >= 0
            ? offeredValue
            : item.offeredValue ?? item.estimatedValue,
        status: nextStatus,
        storeNotes: storeNotes?.trim() || item.storeNotes,
      };
      pushNotification(db, {
        userId: item.customerId,
        senderId: req.user.id,
        title:
          nextStatus === 'quoted'
            ? `عرض سعر استبدال من ${item.storeName}`
            : `تحديث طلب استبدال ${item.id}`,
        body:
          nextStatus === 'quoted'
            ? `قدّم ${item.storeName} عرضاً بقيمة ${(db.tradeins[idx].offeredValue || 0).toLocaleString('en-US')} د.ع لجهازك ${item.model}.`
            : `تعذر قبول جهاز ${item.model} حالياً: ${storeNotes || 'راجع تفاصيل الطلب'}.`,
        type: 'tradein_quote',
        relatedId: item.id,
      });
    } else {
      if (item.customerId !== req.user.id) {
        res.status(403).json({ error: 'غير مصرح.' });
        return;
      }
      if (status !== 'accepted' && status !== 'rejected') {
        res.status(400).json({ error: 'حالة غير صالحة.' });
        return;
      }
      db.tradeins[idx] = { ...item, status };
    }

    saveDb(db);
    res.json({ tradein: db.tradeins[idx] });
  });

  // ── In-App Store Messaging ─────────────────────────────────────────────────
  app.get(
    '/api/conversations/:storeId',
    (req: AuthedRequest, res: Response) => {
      const { storeId } = req.params;
      const customerSessionId = String(req.query.customerSessionId || '');

      if (req.user?.role === 'store_owner' && req.user.storeId !== storeId) {
        res.status(403).json({
          error: 'غير مصرح لصاحب المتجر بقراءة محادثات المتاجر الأخرى.',
        });
        return;
      }

      const db = getDb();
      const messages = db.messages.filter(
        (m) =>
          m.storeId === storeId &&
          (!customerSessionId || m.customerSessionId === customerSessionId)
      );
      res.json({ messages });
    }
  );

  app.post(
    '/api/conversations/:storeId/messages',
    (req: AuthedRequest, res: Response) => {
      const { storeId } = req.params;
      const { customerSessionId, customerName, text } = req.body as {
        customerSessionId?: string;
        customerName?: string;
        text?: string;
      };

      if (!text?.trim() || !customerSessionId?.trim()) {
        res.status(400).json({ error: 'نص الرسالة ومعرف الجلسة مطلوبان' });
        return;
      }

      if (req.user?.role === 'store_owner' && req.user.storeId !== storeId) {
        res.status(403).json({
          error: 'غير مصرح لصاحب المتجر بإرسال رسائل باسم متجر آخر.',
        });
        return;
      }

      const db = getDb();
      const store = db.stores.find((s) => s.id === storeId);
      if (!store) {
        res.status(404).json({ error: 'المتجر غير موجود' });
        return;
      }

      const senderRole: 'customer' | 'store_owner' =
        req.user?.role === 'store_owner' ? 'store_owner' : 'customer';

      const message: ChatMessage = {
        id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        storeId,
        customerSessionId: customerSessionId.trim(),
        customerName:
          customerName?.trim() ||
          (senderRole === 'customer' ? 'زبون' : store.name),
        senderRole,
        text: text.trim(),
        createdAt: nowTimeLabel(),
      };

      db.messages.push(message);

      if (senderRole === 'store_owner' && req.user) {
        pushNotification(db, {
          userId: customerSessionId.trim(),
          senderId: req.user.id,
          title: `رد جديد من ${store.name}`,
          body: text.trim().slice(0, 140),
          type: 'store_reply',
          relatedId: store.id,
        });
      }

      saveDb(db);
      res.status(201).json({ message });
    }
  );

  // ── Bookings (Repair Appointments, Product Reservations & Orders) ──────────
  app.post('/api/bookings', (req: AuthedRequest, res: Response) => {
    const record = req.body as TrackingRecord;
    if (!record || !record.id || !record.storeId || !record.customerName) {
      res.status(400).json({ error: 'بيانات الحجز غير مكتملة' });
      return;
    }

    if (
      req.user?.role === 'store_owner' &&
      req.user.storeId !== record.storeId
    ) {
      res.status(403).json({ error: 'غير مصرح بإرسال طلب لمتجر آخر' });
      return;
    }

    const db = getDb();
    const store = db.stores.find((s) => s.id === record.storeId);
    const createdAtResolved =
      record.createdAt === 'الآن' ? nowDateTimeLabel() : record.createdAt;
    const savedRecord: TrackingRecord = {
      ...record,
      storeOwnerId: record.storeOwnerId || store?.ownerId,
      customerId: record.customerId || req.user?.id,
      createdAt: createdAtResolved,
      warrantyQrCodeData:
        record.warrantyQrCodeData ||
        buildWarrantyQrData({
          id: record.id,
          storeName: record.storeName,
          customerName: record.customerName,
          title: record.title,
          warrantyLabel: record.warrantyLabel,
          createdAt: createdAtResolved,
        }),
    };
    db.bookings.unshift(savedRecord);
    saveDb(db);
    res.status(201).json({ booking: savedRecord });
  });

  app.get('/api/tracking', (_req: Request, res: Response) => {
    const db = getDb();
    res.json({ records: db.bookings });
  });

  app.get('/api/tracking/:code', (req: Request, res: Response) => {
    const code = req.params.code.trim().toUpperCase();
    const db = getDb();
    const record = db.bookings.find((b) => b.id.toUpperCase() === code);
    if (!record) {
      res.status(404).json({ error: 'لم يتم العثور على طلب أو تذكرة بهذا الرقم' });
      return;
    }
    res.json({ record });
  });

  // ── Vite / Static Serving ──────────────────────────────────────────────────
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Techno Phone server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

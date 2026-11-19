import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  INITIAL_PRODUCTS,
  INITIAL_REVIEWS,
  INITIAL_STORES,
  INITIAL_TRACKING_RECORDS,
  getCityCoordinates,
} from '../src/data/catalog.ts';
import type {
  AuthUser,
  ChatMessage,
  NotificationItem,
  Product,
  StoreProfile,
  TrackingRecord,
  TradeInRequest,
  VerifiedReview,
  WishlistItem,
} from '../src/types.ts';

export interface StoredUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'store_owner';
  storeId?: string;
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
}

export interface DatabaseState {
  users: StoredUserRecord[];
  stores: StoreProfile[];
  products: Product[];
  bookings: TrackingRecord[];
  messages: ChatMessage[];
  reviews: VerifiedReview[];
  wishlists: WishlistItem[];
  notifications: NotificationItem[];
  tradeins: TradeInRequest[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_JSON_FILE = path.join(DATA_DIR, 'technophone-db.json');
export const SQLITE_FILE = path.join(DATA_DIR, 'technophone.sqlite');

const TOKEN_SECRET =
  process.env.AUTH_SECRET || 'techno-phone-local-session-secret-2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function createSessionToken(user: AuthUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      city: user.city,
      district: user.district,
      lat: user.lat,
      lng: user.lng,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    }),
    'utf-8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payload)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf-8')
    ) as AuthUser & { exp: number };
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      storeId: decoded.storeId,
      city: decoded.city,
      district: decoded.district,
      lat: decoded.lat,
      lng: decoded.lng,
      authProvider: 'local',
    };
  } catch {
    return null;
  }
}

function buildSeedState(): DatabaseState {
  const demoUsers: StoredUserRecord[] = [
    {
      id: 'owner-techno-baghdad',
      name: 'م. حيدر الكاظمي (مدير فرع المنصور)',
      email: 'baghdad@technophone.iq',
      passwordHash: hashPassword('123456'),
      role: 'store_owner',
      storeId: 'store-techno-baghdad',
    },
    {
      id: 'owner-spectrum-basra',
      name: 'أ. مهند التميمي (متجر سبيكتروم)',
      email: 'basra@spectrum.iq',
      passwordHash: hashPassword('123456'),
      role: 'store_owner',
      storeId: 'store-spectrum-basra',
    },
    {
      id: 'customer-demo',
      name: 'كرار الربيعي',
      email: 'customer@technophone.iq',
      passwordHash: hashPassword('123456'),
      role: 'customer',
      city: 'بغداد',
      district: 'المنصور',
      lat: 33.3152,
      lng: 44.3661,
    },
  ];

  const seedMessages: ChatMessage[] = [
    {
      id: 'msg-seed-1',
      storeId: 'store-techno-baghdad',
      customerSessionId: 'demo-thread-1',
      customerName: 'علي الدليمي',
      senderRole: 'customer',
      text: 'السلام عليكم، هل يتوفر آيفون 16 برو تيتانيوم سعة 512 جيجابايت للاستلام اليوم من فرع المنصور؟',
      createdAt: '10:20 ص',
    },
    {
      id: 'msg-seed-2',
      storeId: 'store-techno-baghdad',
      customerSessionId: 'demo-thread-1',
      customerName: 'علي الدليمي',
      senderRole: 'store_owner',
      text: 'وعليكم السلام أهلاً بك، نعم متوفر وجاهز للاستلام الفوري من فرع المنصور أو الحجز عبر صفحة المنتج.',
      createdAt: '10:24 ص',
    },
  ];

  const seedWishlists: WishlistItem[] = [
    {
      id: 'wish-seed-1',
      customerId: 'customer-demo',
      productId: 'tp-iphone-16-pro',
      storeId: 'store-techno-baghdad',
      savedPrice: 1790000,
      notifyPriceDrop: true,
      createdAt: '2026-11-15',
    },
  ];

  const seedNotifications: NotificationItem[] = [
    {
      id: 'notif-seed-1',
      userId: 'customer-demo',
      senderId: 'owner-techno-baghdad',
      title: 'تم إصدار بطاقة الضمان الإلكترونية لطلبك ORD-2026-4120',
      body: 'اكتمل تسليم آيفون 16 برو تيتانيوم بنجاح. يمكنك الآن عرض بطاقة الضمان بـ QR وتقييم المتجر.',
      type: 'stage_update',
      relatedId: 'ORD-2026-4120',
      read: false,
      createdAt: 'اليوم 09:10 ص',
    },
    {
      id: 'notif-seed-2',
      userId: 'customer-demo',
      senderId: 'owner-techno-baghdad',
      title: 'انخفض سعر جهاز في مفضلتك!',
      body: 'انخفض سعر آيفون 16 برو تيتانيوم إلى 1,650,000 د.ع بدلاً من 1,790,000 د.ع.',
      type: 'price_drop',
      relatedId: 'tp-iphone-16-pro',
      read: false,
      createdAt: 'اليوم 10:00 ص',
    },
  ];

  const seedTradeIns: TradeInRequest[] = [
    {
      id: 'TRD-2026-310',
      storeId: 'store-techno-baghdad',
      storeOwnerId: 'owner-techno-baghdad',
      storeName: 'تكنو فون — فرع المنصور الرئيسي',
      customerId: 'customer-demo',
      customerName: 'كرار الربيعي',
      phone: '07714582901',
      deviceType: 'smartphone',
      model: 'iPhone 13 Pro',
      storage: '256 جيجابايت',
      batteryHealth: 87,
      conditionNotes: 'نظيف جداً مع الكرتونة الأصلية، بدون خدوش أو فتح صيانة.',
      imei: '351982047123456',
      estimatedValue: 620000,
      offeredValue: 640000,
      targetProductId: 'tp-iphone-16-pro',
      targetProductName: 'آيفون 16 برو تيتانيوم',
      status: 'quoted',
      storeNotes: 'تقييم ممتاز بعد مراجعة المواصفات؛ العرض سارٍ لمدة 48 ساعة في فرع المنصور.',
      createdAt: '2026-11-16 16:30',
    },
  ];

  return {
    users: demoUsers,
    stores: INITIAL_STORES,
    products: INITIAL_PRODUCTS,
    bookings: INITIAL_TRACKING_RECORDS,
    messages: seedMessages,
    reviews: INITIAL_REVIEWS,
    wishlists: seedWishlists,
    notifications: seedNotifications,
    tradeins: seedTradeIns,
  };
}

let cachedDb: DatabaseState | null = null;
let sqliteDb: DatabaseSync | null = null;

function ensureSqliteInit(): DatabaseSync {
  if (sqliteDb) return sqliteDb;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  sqliteDb = new DatabaseSync(SQLITE_FILE);

  // Enable WAL mode for high concurrency & performance
  sqliteDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT,
      store_id TEXT,
      city TEXT,
      district TEXT,
      lat REAL,
      lng REAL,
      password_hash TEXT,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      name TEXT,
      city TEXT,
      district TEXT,
      address TEXT,
      phone TEXT,
      verified INTEGER,
      verification_status TEXT,
      avg_rating REAL,
      review_count INTEGER,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      brand TEXT,
      category TEXT,
      price REAL,
      condition TEXT,
      in_stock INTEGER,
      warranty_months INTEGER,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      kind TEXT,
      store_id TEXT,
      customer_id TEXT,
      stage INTEGER,
      total_price REAL,
      created_at TEXT,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      customer_session_id TEXT,
      customer_name TEXT,
      sender_role TEXT,
      text TEXT,
      created_at TEXT,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      booking_id TEXT,
      product_id TEXT,
      customer_id TEXT,
      rating INTEGER,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      product_id TEXT,
      store_id TEXT,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT,
      read INTEGER,
      created_at TEXT,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS tradeins (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      customer_id TEXT,
      model TEXT,
      status TEXT,
      estimated_value REAL,
      created_at TEXT,
      payload TEXT
    );
  `);

  console.log(`[SQLITE] Initialized real SQLite database at: ${SQLITE_FILE}`);
  return sqliteDb;
}

function loadStateFromSqlite(sql: DatabaseSync): DatabaseState | null {
  try {
    const userRows = sql.prepare('SELECT payload FROM users').all() as { payload: string }[];
    if (userRows.length === 0) return null;

    const storeRows = sql.prepare('SELECT payload FROM stores').all() as { payload: string }[];
    const productRows = sql.prepare('SELECT payload FROM products').all() as { payload: string }[];
    const bookingRows = sql.prepare('SELECT payload FROM bookings').all() as { payload: string }[];
    const messageRows = sql.prepare('SELECT payload FROM messages').all() as { payload: string }[];
    const reviewRows = sql.prepare('SELECT payload FROM reviews').all() as { payload: string }[];
    const wishlistRows = sql.prepare('SELECT payload FROM wishlists').all() as { payload: string }[];
    const notificationRows = sql.prepare('SELECT payload FROM notifications').all() as { payload: string }[];
    const tradeinRows = sql.prepare('SELECT payload FROM tradeins').all() as { payload: string }[];

    return {
      users: userRows.map((r) => JSON.parse(r.payload)),
      stores: storeRows.map((r) => JSON.parse(r.payload)),
      products: productRows.map((r) => JSON.parse(r.payload)),
      bookings: bookingRows.map((r) => JSON.parse(r.payload)),
      messages: messageRows.map((r) => JSON.parse(r.payload)),
      reviews: reviewRows.map((r) => JSON.parse(r.payload)),
      wishlists: wishlistRows.map((r) => JSON.parse(r.payload)),
      notifications: notificationRows.map((r) => JSON.parse(r.payload)),
      tradeins: tradeinRows.map((r) => JSON.parse(r.payload)),
    };
  } catch (err) {
    console.error('[SQLITE] Error loading state from SQLite:', err);
    return null;
  }
}

function persistStateToSqlite(sql: DatabaseSync, state: DatabaseState): void {
  sql.exec('BEGIN TRANSACTION;');
  try {
    // Clear and rebuild users
    sql.exec('DELETE FROM users;');
    const insUser = sql.prepare(
      'INSERT INTO users (id, name, email, role, store_id, city, district, lat, lng, password_hash, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const u of state.users) {
      insUser.run(
        u.id,
        u.name,
        u.email,
        u.role,
        u.storeId || null,
        u.city || null,
        u.district || null,
        u.lat ?? null,
        u.lng ?? null,
        u.passwordHash,
        JSON.stringify(u)
      );
    }

    // Stores
    sql.exec('DELETE FROM stores;');
    const insStore = sql.prepare(
      'INSERT INTO stores (id, owner_id, name, city, district, address, phone, verified, verification_status, avg_rating, review_count, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const s of state.stores) {
      insStore.run(
        s.id,
        s.ownerId,
        s.name,
        s.city,
        s.district || null,
        s.address,
        s.phone,
        s.verified ? 1 : 0,
        s.verificationStatus || null,
        s.avgRating ?? null,
        s.reviewCount ?? 0,
        JSON.stringify(s)
      );
    }

    // Products
    sql.exec('DELETE FROM products;');
    const insProd = sql.prepare(
      'INSERT INTO products (id, store_id, name, brand, category, price, condition, in_stock, warranty_months, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const p of state.products) {
      insProd.run(
        p.id,
        p.storeId,
        p.name,
        p.brand,
        p.category,
        p.price,
        p.condition,
        p.inStock ? 1 : 0,
        p.warrantyMonths,
        JSON.stringify(p)
      );
    }

    // Bookings
    sql.exec('DELETE FROM bookings;');
    const insBooking = sql.prepare(
      'INSERT INTO bookings (id, kind, store_id, customer_id, stage, total_price, created_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const b of state.bookings) {
      insBooking.run(
        b.id,
        b.kind,
        b.storeId,
        b.customerId || null,
        b.stage,
        b.totalPrice,
        b.createdAt,
        JSON.stringify(b)
      );
    }

    // Messages
    sql.exec('DELETE FROM messages;');
    const insMsg = sql.prepare(
      'INSERT INTO messages (id, store_id, customer_session_id, customer_name, sender_role, text, created_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const m of state.messages) {
      insMsg.run(
        m.id,
        m.storeId,
        m.customerSessionId,
        m.customerName,
        m.senderRole,
        m.text,
        m.createdAt,
        JSON.stringify(m)
      );
    }

    // Reviews
    sql.exec('DELETE FROM reviews;');
    const insRev = sql.prepare(
      'INSERT INTO reviews (id, store_id, booking_id, product_id, customer_id, rating, payload) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const r of state.reviews) {
      insRev.run(
        r.id,
        r.storeId,
        r.bookingId,
        r.productId || null,
        r.customerId,
        r.rating,
        JSON.stringify(r)
      );
    }

    // Wishlists
    sql.exec('DELETE FROM wishlists;');
    const insWish = sql.prepare(
      'INSERT INTO wishlists (id, customer_id, product_id, store_id, payload) VALUES (?, ?, ?, ?, ?)'
    );
    for (const w of state.wishlists) {
      insWish.run(w.id, w.customerId, w.productId, w.storeId, JSON.stringify(w));
    }

    // Notifications
    sql.exec('DELETE FROM notifications;');
    const insNotif = sql.prepare(
      'INSERT INTO notifications (id, user_id, type, read, created_at, payload) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const n of state.notifications) {
      insNotif.run(n.id, n.userId, n.type, n.read ? 1 : 0, n.createdAt, JSON.stringify(n));
    }

    // TradeIns
    sql.exec('DELETE FROM tradeins;');
    const insTrade = sql.prepare(
      'INSERT INTO tradeins (id, store_id, customer_id, model, status, estimated_value, created_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const t of state.tradeins) {
      insTrade.run(
        t.id,
        t.storeId,
        t.customerId || null,
        t.model,
        t.status,
        t.estimatedValue,
        t.createdAt,
        JSON.stringify(t)
      );
    }

    sql.exec('COMMIT;');
  } catch (err) {
    sql.exec('ROLLBACK;');
    console.error('[SQLITE] Transaction failed, rolled back:', err);
    throw err;
  }
}

export function getDb(): DatabaseState {
  if (cachedDb) return cachedDb;

  const sql = ensureSqliteInit();

  // Try loading from SQLite first
  let state = loadStateFromSqlite(sql);

  // If SQLite is empty, check if legacy JSON file exists to migrate
  if (!state && fs.existsSync(DB_JSON_FILE)) {
    try {
      const raw = fs.readFileSync(DB_JSON_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      if (Array.isArray(parsed.stores) && parsed.stores.length > 0) {
        state = parsed;
        console.log('[SQLITE] Migrated existing JSON database to SQLite');
      }
    } catch {
      // Ignore
    }
  }

  // If still empty or fresh install, build seed state
  if (!state) {
    state = buildSeedState();
  }

  // Validate and backfill coordinates or missing seeds
  for (const seedProd of INITIAL_PRODUCTS) {
    const idx = state.products.findIndex((p) => p.id === seedProd.id);
    if (idx === -1) {
      state.products.push(seedProd);
    }
  }

  for (const seedBooking of INITIAL_TRACKING_RECORDS) {
    const idx = state.bookings.findIndex((b) => b.id === seedBooking.id);
    if (idx === -1) {
      state.bookings.push(seedBooking);
    }
  }

  cachedDb = state;
  persistStateToSqlite(sql, cachedDb);

  // Also write JSON snapshot for portability
  try {
    fs.writeFileSync(DB_JSON_FILE, JSON.stringify(cachedDb, null, 2), 'utf-8');
  } catch {
    // Ignore snapshot write errors
  }

  return cachedDb;
}

export function saveDb(next: DatabaseState): void {
  cachedDb = next;
  const sql = ensureSqliteInit();
  persistStateToSqlite(sql, next);

  // Write snapshot for backup
  try {
    fs.writeFileSync(DB_JSON_FILE, JSON.stringify(next, null, 2), 'utf-8');
  } catch {
    // Ignore snapshot write errors
  }
}

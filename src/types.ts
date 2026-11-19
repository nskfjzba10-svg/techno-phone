export type ProductCategory =
  | 'all'
  | 'smartphones'
  | 'laptops_tablets'
  | 'audio_watches'
  | 'accessories';

export type UserRole = 'customer' | 'store_owner';

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string;
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  authProvider?: 'local' | 'firebase';
}

export interface StoreTechnician {
  id: string;
  name: string;
  specialty: string;
}

export interface PromoCode {
  code: string;
  discountPercent: number;
  active: boolean;
  expiresAt?: string;
}

export interface StoreProfile {
  id: string;
  ownerId: string;
  name: string;
  logo: string;
  city: string;
  district?: string;
  address: string;
  phone: string;
  workingHours: string;
  description: string;
  specialties: string[];
  lat: number;
  lng: number;
  verified: boolean;
  verificationStatus?: VerificationStatus;
  licenseDocUrl?: string;
  avgRating?: number;
  reviewCount?: number;
  technicians?: StoreTechnician[];
  promoCodes?: PromoCode[];
  createdAt: string;
}

export interface ProductVariant {
  label: string;
  priceDelta: number;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  storeId: string;
  ownerId?: string;
  storeName: string;
  name: string;
  brand: string;
  category: Exclude<ProductCategory, 'all'>;
  categoryLabel: string;
  price: number;
  oldPrice?: number;
  condition: 'جديد' | 'مستعمل' | 'مجدد معتمد';
  inStock: boolean;
  warrantyMonths: number;
  image: string;
  extraImages?: string[];
  imei?: string;
  batteryHealth?: number;
  previouslyOpened?: boolean;
  summary: string;
  specs: { label: string; value: string }[];
  storageOptions: ProductVariant[];
  colors: ProductColor[];
}

export interface CartItem {
  key: string;
  product: Product;
  selectedStorage: string;
  selectedColor: string;
  unitPrice: number;
  quantity: number;
}

export type RepairDeviceType = 'smartphone' | 'tablet' | 'laptop' | 'smartwatch';

export interface RepairServiceOption {
  id: string;
  label: string;
  basePrice: number;
  durationLabel: string;
  warrantyMonths: number;
  description: string;
}

export interface RepairDeviceModel {
  id: string;
  name: string;
  brand: string;
  deviceType: RepairDeviceType;
  priceMultiplier: number;
}

export type TicketStage = 1 | 2 | 3 | 4;

export interface TrackingRecord {
  id: string;
  kind: 'repair' | 'order' | 'reservation';
  storeId: string;
  storeOwnerId?: string;
  storeName: string;
  customerId?: string;
  customerName: string;
  phone: string;
  governorate?: string;
  district?: string;
  title: string;
  subtitle: string;
  createdAt: string;
  stage: TicketStage;
  stageLabels: [string, string, string, string];
  estimatedReady: string;
  totalPrice: number;
  deliveryFee?: number;
  discountAmount?: number;
  promoCode?: string;
  notes: string;
  warrantyLabel: string;
  warrantyMonths?: number;
  assignedTechnician?: string;
  technicianReport?: string;
  faultMediaUrls?: string[];
  warrantyQrCodeData?: string;
  imei?: string;
  reviewed?: boolean;
}

export interface VerifiedReview {
  id: string;
  storeId: string;
  bookingId: string;
  productId?: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  verifiedPurchase: true;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  customerId: string;
  productId: string;
  storeId: string;
  savedPrice: number;
  notifyPriceDrop: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  senderId?: string;
  title: string;
  body: string;
  type: 'stage_update' | 'store_reply' | 'price_drop' | 'tradein_quote';
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface TradeInRequest {
  id: string;
  storeId: string;
  storeOwnerId?: string;
  storeName: string;
  customerId: string;
  customerName: string;
  phone: string;
  deviceType: RepairDeviceType;
  model: string;
  storage: string;
  batteryHealth: number;
  conditionNotes: string;
  imei?: string;
  photoUrl?: string;
  estimatedValue: number;
  offeredValue?: number;
  targetProductId?: string;
  targetProductName?: string;
  status: 'pending' | 'quoted' | 'accepted' | 'rejected';
  storeNotes?: string;
  createdAt: string;
}

export interface StoreAnalytics {
  totalOrders: number;
  completedOrders: number;
  pendingRepairs: number;
  salesRevenue: number;
  repairRevenue: number;
  totalRevenue: number;
  avgRating: number;
  reviewCount: number;
  topProducts: { name: string; count: number; revenue: number }[];
}

export interface ChatMessage {
  id: string;
  storeId: string;
  customerSessionId: string;
  customerName: string;
  senderRole: 'customer' | 'store_owner';
  text: string;
  createdAt: string;
}

export interface ConversationThread {
  customerSessionId: string;
  customerName: string;
  storeId: string;
  lastMessageAt: string;
  messages: ChatMessage[];
}

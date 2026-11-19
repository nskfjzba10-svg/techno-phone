import {
  User as FirebaseUser,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getCityCoordinates } from '../data/catalog';
import {
  AuthUser,
  Product,
  StoreProfile,
  TrackingRecord,
  TradeInRequest,
  UserRole,
  VerifiedReview,
} from '../types';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from './firebase';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export async function signInWithGoogleRole(opts: {
  role: UserRole;
  governorate?: string;
  district?: string;
  storeDraft?: {
    storeName: string;
    logo: string;
    city: string;
    district: string;
    address: string;
    phone: string;
    workingHours: string;
    description: string;
    specialties: string[];
    licenseDocUrl?: string;
    lat: number;
    lng: number;
  };
}): Promise<{ user: AuthUser; store: StoreProfile | null; isNew: boolean }> {
  const cred = await signInWithPopup(auth, googleProvider);
  const fbUser = cred.user;
  return ensureFirebaseProfile(fbUser, opts);
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore sign-out errors
  }
}

export async function ensureFirebaseProfile(
  fbUser: FirebaseUser,
  opts: {
    role: UserRole;
    governorate?: string;
    district?: string;
    storeDraft?: {
      storeName: string;
      logo: string;
      city: string;
      district: string;
      address: string;
      phone: string;
      workingHours: string;
      description: string;
      specialties: string[];
      licenseDocUrl?: string;
      lat: number;
      lng: number;
    };
  }
): Promise<{ user: AuthUser; store: StoreProfile | null; isNew: boolean }> {
  const uid = sanitizeId(fbUser.uid);
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  if (existingSnap && existingSnap.exists()) {
    const data = existingSnap.data() as {
      id: string;
      name: string;
      role: UserRole;
      storeId?: string;
      governorate?: string;
      district?: string;
    };
    const city = data.governorate || opts.governorate || 'بغداد';
    const coords = getCityCoordinates(city);
    let storeProfile: StoreProfile | null = null;
    if (data.role === 'store_owner' && data.storeId) {
      try {
        const sSnap = await getDoc(doc(db, 'stores', data.storeId));
        if (sSnap.exists()) {
          storeProfile = sSnap.data() as StoreProfile;
        }
      } catch {
        // Ignore if missing
      }
    }
    return {
      user: {
        id: data.id,
        name: data.name,
        email: fbUser.email || '',
        role: data.role,
        storeId: data.storeId,
        city,
        district: data.district,
        lat: coords.lat,
        lng: coords.lng,
        authProvider: 'firebase',
      },
      store: storeProfile,
      isNew: false,
    };
  }

  const gov = opts.governorate || opts.storeDraft?.city || 'بغداد';
  const dist = opts.district || opts.storeDraft?.district || '';
  const coords = getCityCoordinates(gov);
  const displayName =
    fbUser.displayName || opts.storeDraft?.storeName || 'مستخدم تكنو فون';

  let storeId: string | undefined;
  let createdStore: StoreProfile | null = null;

  if (opts.role === 'store_owner') {
    storeId = sanitizeId(`store-${uid.slice(0, 10)}`);
    const draft = opts.storeDraft;
    const storeName = draft?.storeName?.trim() || `متجر ${displayName}`;
    const hasDoc = Boolean(draft?.licenseDocUrl?.trim());
    const storeDocData = {
      id: storeId,
      ownerId: uid,
      name: storeName,
      logo:
        draft?.logo ||
        '/src/assets/images/product_titanium_phone_1794983260872.jpg',
      city: draft?.city || gov,
      district: draft?.district || dist || 'المركز',
      address: draft?.address?.trim() || `${gov} — المركز التجاري`,
      phone: draft?.phone?.trim() || '07700000000',
      workingHours: draft?.workingHours || '10:00 صباحاً – 10:30 مساءً',
      description:
        draft?.description?.trim() ||
        'متجر متخصص في بيع وصيانة الأجهزة الذكية في العراق.',
      specialties:
        draft?.specialties && draft.specialties.length > 0
          ? draft.specialties
          : ['هواتف ذكية', 'صيانة معتمدة'],
      lat: draft?.lat ?? coords.lat,
      lng: draft?.lng ?? coords.lng,
      verified: false,
      verificationStatus: hasDoc ? 'pending' : 'unverified',
      ...(hasDoc && draft?.licenseDocUrl
        ? { licenseDocUrl: draft.licenseDocUrl }
        : {}),
      avgRating: 5,
      reviewCount: 0,
      technicians: [],
      promoCodes: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'stores', storeId), storeDocData);
      createdStore = {
        ...storeDocData,
        verificationStatus: hasDoc ? 'pending' : 'unverified',
        createdAt: new Date().toISOString().slice(0, 10),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `stores/${storeId}`);
    }
  }

  try {
    await setDoc(userRef, {
      id: uid,
      name: displayName,
      role: opts.role,
      ...(storeId ? { storeId } : {}),
      governorate: gov,
      district: dist,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
  }

  try {
    await setDoc(privateRef, {
      email: fbUser.email || `${uid}@technophone.iq`,
      lat: coords.lat,
      lng: coords.lng,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${uid}/private/info`);
  }

  return {
    user: {
      id: uid,
      name: displayName,
      email: fbUser.email || '',
      role: opts.role,
      storeId,
      city: gov,
      district: dist,
      lat: coords.lat,
      lng: coords.lng,
      authProvider: 'firebase',
    },
    store: createdStore,
    isNew: true,
  };
}

export async function syncBookingToFirestore(
  record: TrackingRecord
): Promise<void> {
  if (!auth.currentUser) return;
  const uid = sanitizeId(auth.currentUser.uid);
  const bookingId = sanitizeId(record.id);
  const storeOwnerId = sanitizeId(record.storeOwnerId || uid);
  try {
    const storeSnap = await getDoc(doc(db, 'stores', sanitizeId(record.storeId)));
    if (!storeSnap.exists()) return; // Seed store lives on local Express DB if not yet created in Firestore
    await setDoc(doc(db, 'bookings', bookingId), {
      id: bookingId,
      kind: record.kind,
      storeId: sanitizeId(record.storeId),
      storeOwnerId: sanitizeId(storeSnap.data().ownerId || storeOwnerId),
      storeName: record.storeName.slice(0, 160),
      customerId: uid,
      customerName: record.customerName.slice(0, 120),
      phone: record.phone.slice(0, 32),
      ...(record.governorate ? { governorate: record.governorate } : {}),
      ...(record.district ? { district: record.district } : {}),
      title: record.title.slice(0, 240),
      subtitle: record.subtitle.slice(0, 320),
      stage: 1,
      stageLabels: record.stageLabels,
      estimatedReady: record.estimatedReady.slice(0, 160),
      totalPrice: record.totalPrice,
      ...(typeof record.deliveryFee === 'number'
        ? { deliveryFee: record.deliveryFee }
        : {}),
      ...(typeof record.discountAmount === 'number'
        ? { discountAmount: record.discountAmount }
        : {}),
      ...(record.promoCode ? { promoCode: record.promoCode } : {}),
      notes: record.notes.slice(0, 1200),
      warrantyLabel: record.warrantyLabel.slice(0, 160),
      ...(Array.isArray(record.faultMediaUrls)
        ? { faultMediaUrls: record.faultMediaUrls.slice(0, 5) }
        : {}),
      ...(record.warrantyQrCodeData
        ? { warrantyQrCodeData: record.warrantyQrCodeData.slice(0, 600) }
        : {}),
      reviewed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore booking mirror skipped:', err);
  }
}

export async function syncReviewToFirestore(
  review: VerifiedReview
): Promise<void> {
  if (!auth.currentUser) return;
  const uid = sanitizeId(auth.currentUser.uid);
  const bookingId = sanitizeId(review.bookingId);
  try {
    const bSnap = await getDoc(doc(db, 'bookings', bookingId));
    if (!bSnap.exists() || bSnap.data().stage !== 4) return;
    await setDoc(doc(db, 'reviews', bookingId), {
      id: bookingId,
      storeId: sanitizeId(review.storeId),
      bookingId,
      ...(review.productId ? { productId: sanitizeId(review.productId) } : {}),
      customerId: uid,
      customerName: review.customerName.slice(0, 120),
      rating: review.rating,
      comment: review.comment.slice(0, 800),
      verifiedPurchase: true,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'bookings', bookingId), {
      reviewed: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore review mirror skipped:', err);
  }
}

export async function syncTradeInToFirestore(
  tradein: TradeInRequest
): Promise<void> {
  if (!auth.currentUser) return;
  const uid = sanitizeId(auth.currentUser.uid);
  const tradeinId = sanitizeId(tradein.id);
  try {
    const storeSnap = await getDoc(doc(db, 'stores', sanitizeId(tradein.storeId)));
    if (!storeSnap.exists()) return;
    await setDoc(doc(db, 'tradeins', tradeinId), {
      id: tradeinId,
      storeId: sanitizeId(tradein.storeId),
      storeOwnerId: sanitizeId(storeSnap.data().ownerId || uid),
      customerId: uid,
      customerName: tradein.customerName.slice(0, 120),
      phone: tradein.phone.slice(0, 32),
      model: tradein.model.slice(0, 140),
      storage: tradein.storage.slice(0, 64),
      batteryHealth: tradein.batteryHealth,
      conditionNotes: tradein.conditionNotes.slice(0, 600),
      ...(tradein.imei ? { imei: tradein.imei.slice(0, 32) } : {}),
      ...(tradein.photoUrl ? { photoUrl: tradein.photoUrl.slice(0, 1000) } : {}),
      estimatedValue: tradein.estimatedValue,
      ...(tradein.targetProductId
        ? { targetProductId: sanitizeId(tradein.targetProductId) }
        : {}),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore trade-in mirror skipped:', err);
  }
}

export async function syncProductToFirestore(product: Product): Promise<void> {
  const prodId = sanitizeId(product.id);
  try {
    const prodRef = doc(db, 'products', prodId);
    await setDoc(
      prodRef,
      {
        id: prodId,
        storeId: sanitizeId(product.storeId),
        ownerId: sanitizeId(product.ownerId || auth.currentUser?.uid || 'merchant'),
        storeName: product.storeName,
        name: product.name,
        brand: product.brand,
        category: product.category,
        categoryLabel: product.categoryLabel,
        price: product.price,
        ...(typeof product.oldPrice === 'number' ? { oldPrice: product.oldPrice } : {}),
        condition: product.condition,
        inStock: product.inStock,
        warrantyMonths: product.warrantyMonths,
        image: product.image,
        extraImages: product.extraImages || [],
        ...(product.imei ? { imei: product.imei } : {}),
        ...(typeof product.batteryHealth === 'number'
          ? { batteryHealth: product.batteryHealth }
          : {}),
        previouslyOpened: Boolean(product.previouslyOpened),
        summary: product.summary,
        specs: product.specs || [],
        storageOptions: product.storageOptions || [],
        colors: product.colors || [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`[Firestore] Synced product ${prodId} successfully`);
  } catch (err) {
    console.warn('[Firestore] Product sync skipped or failed:', err);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  try {
    const prodRef = doc(db, 'products', sanitizeId(productId));
    await deleteDoc(prodRef);
  } catch (err) {
    console.warn('[Firestore] Delete product skipped:', err);
  }
}

export function subscribeToLiveProducts(
  onUpdate: (products: Product[]) => void
): () => void {
  try {
    const productsRef = collection(db, 'products');
    const unsub = onSnapshot(
      productsRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: data.id || docSnap.id,
              storeId: data.storeId || 'store-techno-baghdad',
              ownerId: data.ownerId,
              storeName: data.storeName || '',
              name: data.name || '',
              brand: data.brand || '',
              category: data.category || 'smartphones',
              categoryLabel: data.categoryLabel || 'هواتف ذكية',
              price: Number(data.price) || 0,
              oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
              condition: data.condition || 'جديد',
              inStock: data.inStock !== false,
              warrantyMonths: Number(data.warrantyMonths) || 12,
              image: data.image || '/src/assets/images/product_titanium_phone_1794983260872.jpg',
              extraImages: Array.isArray(data.extraImages) ? data.extraImages : [],
              imei: data.imei,
              batteryHealth: data.batteryHealth,
              previouslyOpened: data.previouslyOpened,
              summary: data.summary || '',
              specs: Array.isArray(data.specs) ? data.specs : [],
              storageOptions: Array.isArray(data.storageOptions) ? data.storageOptions : [],
              colors: Array.isArray(data.colors) ? data.colors : [],
            });
          });
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('[Firestore] Realtime products listener offline or restricted:', error.message);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function syncStoreProfileToFirestore(store: StoreProfile): Promise<void> {
  const storeId = sanitizeId(store.id);
  try {
    const storeRef = doc(db, 'stores', storeId);
    await setDoc(
      storeRef,
      {
        ...store,
        id: storeId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] Store sync skipped:', err);
  }
}

export function subscribeToLiveStores(
  onUpdate: (stores: StoreProfile[]) => void
): () => void {
  try {
    const storesRef = collection(db, 'stores');
    const unsub = onSnapshot(
      storesRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: StoreProfile[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: d.id || docSnap.id,
              ownerId: d.ownerId || '',
              name: d.name || '',
              logo: d.logo || '/src/assets/images/product_titanium_phone_1794983260872.jpg',
              city: d.city || 'بغداد',
              district: d.district || '',
              address: d.address || '',
              phone: d.phone || '',
              workingHours: d.workingHours || '',
              description: d.description || '',
              specialties: Array.isArray(d.specialties) ? d.specialties : [],
              lat: Number(d.lat) || 33.3152,
              lng: Number(d.lng) || 44.3661,
              verified: Boolean(d.verified),
              verificationStatus: d.verificationStatus || 'unverified',
              avgRating: typeof d.avgRating === 'number' ? d.avgRating : 4.8,
              reviewCount: typeof d.reviewCount === 'number' ? d.reviewCount : 0,
              technicians: Array.isArray(d.technicians) ? d.technicians : [],
              promoCodes: Array.isArray(d.promoCodes) ? d.promoCodes : [],
              createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString().slice(0, 10),
            });
          });
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('[Firestore] Realtime stores listener error:', error.message);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}


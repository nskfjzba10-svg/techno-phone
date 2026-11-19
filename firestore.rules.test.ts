/**
 * Security TDD Harness — Dirty Dozen Verification Matrix
 * Maps each adversarial payload from security_spec.md to its expected PERMISSION_DENIED invariant.
 */

export interface SecurityTestVector {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_VECTORS: SecurityTestVector[] = [
  {
    id: 1,
    name: 'Unauthenticated Review Spoof',
    collectionPath: 'reviews/rev-unauth-1',
    operation: 'create',
    authUid: null,
    emailVerified: false,
    payload: {
      id: 'rev-unauth-1',
      storeId: 'store-techno-baghdad',
      bookingId: 'TP-1042',
      customerId: 'anon',
      customerName: 'Fake User',
      rating: 5,
      comment: 'Great!',
      verifiedPurchase: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified / Incomplete Booking Review Creation',
    collectionPath: 'reviews/rev-incomplete',
    operation: 'create',
    authUid: 'user-cust-1',
    emailVerified: true,
    payload: {
      id: 'rev-incomplete',
      storeId: 'store-techno-baghdad',
      bookingId: 'TP-STAGE-2',
      customerId: 'user-cust-1',
      customerName: 'كرار',
      rating: 1,
      comment: 'Attempted review before completion',
      verifiedPurchase: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Self-Verifying Store Fraud',
    collectionPath: 'stores/store-1',
    operation: 'update',
    authUid: 'owner-1',
    emailVerified: true,
    payload: {
      verified: true,
      verificationStatus: 'verified',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Ghost Field Injection',
    collectionPath: 'products/prod-ghost',
    operation: 'create',
    authUid: 'owner-1',
    emailVerified: true,
    payload: {
      id: 'prod-ghost',
      storeId: 'store-1',
      ownerId: 'owner-1',
      name: 'Phone',
      isAdminFeatured: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-Store Product Tampering',
    collectionPath: 'products/prod-cross',
    operation: 'create',
    authUid: 'owner-A',
    emailVerified: true,
    payload: {
      id: 'prod-cross',
      storeId: 'store-B',
      ownerId: 'owner-A',
      name: 'Tampered Item',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'PII Cross-User Read',
    collectionPath: 'users/user-A/private/info',
    operation: 'get',
    authUid: 'user-B',
    emailVerified: true,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Role Escalation Update',
    collectionPath: 'users/user-A',
    operation: 'update',
    authUid: 'user-A',
    emailVerified: true,
    payload: {
      role: 'store_owner',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Timestamp Forgery',
    collectionPath: 'bookings/bk-backdated',
    operation: 'create',
    authUid: 'user-cust-1',
    emailVerified: true,
    payload: {
      id: 'bk-backdated',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID Poisoning / Oversized Document ID',
    collectionPath: `stores/${'x'.repeat(200)}`,
    operation: 'create',
    authUid: 'owner-1',
    emailVerified: true,
    payload: {
      id: 'x'.repeat(200),
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal Booking Tampering',
    collectionPath: 'bookings/bk-done',
    operation: 'update',
    authUid: 'owner-1',
    emailVerified: true,
    payload: {
      stage: 1,
      totalPrice: 9999999,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Chat Subcollection Hijacking',
    collectionPath: 'conversations/conv-AB/messages/msg-hijack',
    operation: 'create',
    authUid: 'user-C',
    emailVerified: true,
    payload: {
      id: 'msg-hijack',
      storeId: 'store-B',
      senderId: 'user-C',
      senderRole: 'customer',
      text: 'Injected message',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Blanket List Query Scraping on Private Bookings',
    collectionPath: 'bookings',
    operation: 'list',
    authUid: 'user-B',
    emailVerified: true,
    expectedOutcome: 'PERMISSION_DENIED',
  },
];

export function verifyVectorMatrixCompleteness(): boolean {
  return (
    DIRTY_DOZEN_VECTORS.length === 12 &&
    DIRTY_DOZEN_VECTORS.every((v) => v.expectedOutcome === 'PERMISSION_DENIED')
  );
}

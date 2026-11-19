# Security Specification — Techno Phone Iraq

## Phase 0: Data Invariants
1. **Identity & PII Isolation**: A user's private PII (`email`, `phone`, `address`, `lat`, `lng`) resides under `/users/{userId}/private/info` and may only be read or written by `request.auth.uid == userId`. User `role` (`customer` or `store_owner`) is immutable after creation.
2. **Store Ownership & Verification Integrity**: Only the authenticated `ownerId` matching `request.auth.uid` may create or update their store profile. Store owners cannot self-approve `verified: true` or `verificationStatus: 'verified'` (only platform admin or verified status preservation); owners can only submit `verificationStatus: 'pending'` with `licenseDocUrl`.
3. **Product Referential Integrity**: A `Product` document cannot exist without an existing parent `StoreProfile` (`/stores/{storeId}`) whose `ownerId == request.auth.uid`.
4. **Booking Lifecycle & Terminal State Locking**: A `Booking` cannot be created without an existing target store (`/stores/{storeId}`) and `customerId == request.auth.uid`. Stage transitions may only advance (`1 <= stage <= 4`), and once `stage == 4` and `reviewed == true`, terminal fields cannot be altered by non-admins.
5. **Verified Reviews Only**: A `Review` document can ONLY be created when `exists(/databases/$(database)/documents/bookings/$(bookingId))` AND the booking belongs to `request.auth.uid` (`customerId`) AND `stage == 4` (completed), preventing fake or unverified reviews.
6. **Master Gate on Subcollections**: Messages under `/conversations/{threadId}/messages/{messageId}` must validate via `get()` on parent `/conversations/{threadId}` that `request.auth.uid` is either `customerId` or `storeOwnerId`.
7. **Secure List Queries**: Every `allow list` rule enforces `resource.data` ownership/visibility directly in the rule without delegating security to the client or calling `get()`/`exists()` inside `list`.
8. **Temporal Integrity & Path Hardening**: Every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), every string and array has bounded `.size()`, and `createdAt`/`updatedAt` timestamps strictly require `request.time`.

## The "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Review Spoof**: Unauthenticated write to `/reviews/rev-1`.
2. **Unverified / Fake Review Creation**: Creating `/reviews/rev-fake` referencing a booking at `stage: 2` (not completed) or belonging to another customer.
3. **Self-Verifying Store Fraud**: Store owner updating `/stores/store-1` setting `verified: true, verificationStatus: 'verified'`.
4. **Shadow Ghost Field Injection**: Creating `/products/prod-1` with an extra unallowed key `isAdminFeatured: true`.
5. **Cross-Store Product Tampering**: Store owner A creating or deleting a product with `storeId: 'store-B'`.
6. **PII Cross-User Read**: Signed-in User B reading `/users/userA/private/info`.
7. **Role Escalation Update**: Updating `/users/userA` changing `role` from `'customer'` to `'store_owner'`.
8. **Timestamp Forgery**: Creating `/bookings/bk-1` with a backdated client timestamp `createdAt` instead of `request.time`.
9. **ID Poisoning / Oversized Document ID**: Writing `/stores/${'a'.repeat(200)}` or path with invalid characters.
10. **Terminal Booking Tampering**: Updating `/bookings/bk-done` after `stage == 4` to change `totalPrice` or revert `stage` to `1`.
11. **Chat Subcollection Hijacking**: User C writing to `/conversations/conv-AB/messages/msg-1` where User C is neither `customerId` nor `storeOwnerId`.
12. **Blanket List Query Scraping**: User B executing a collection list query on `/bookings` or `/notifications` without matching `customerId`/`storeOwnerId`/`userId`.

# Security Specification: GenCraft UGC Platform

## Data Invariants
1. A `User` profile can only be created by the authenticated user with the matching UID.
2. `Content` must have a `creatorId` matching the authenticated user.
3. `moderationStatus` can only be changed by an `admin`.
4. `Transaction` records are immutable once created.
5. `likes` can only be updated by adding/removing the authenticated user's own UID.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Theft**: Attempt to create a user profile with a different UID.
2. **Ghost User**: Attempt to create content while not logged in.
3. **Escalation**: Attempt to set your own role to 'admin'.
4. **Spoofing**: Attempt to create content with someone else's `creatorId`.
5. **State Skipping**: Attempt to create content with `moderationStatus: 'approved'` (must default to 'pending' or be set by admin).
6. **Price Injection**: Attempt to change the price of someone else's content via update.
7. **Phantom Likes**: Attempt to add multiple UIDs to the `likes` array or UIDs not matching the requester.
8. **Shadow Field**: Attempt to add `isFeatured: true` to a Content document (field doesn't exist in schema).
9. **Transaction Forge**: Attempt to create a Transaction where you are the `sellerId` and the `buyerId` is someone else without their consent.
10. **Admin Bypass**: Attempt to update `moderationReason` as a regular user.
11. **Resource Poisoning**: Attempt to use an ID longer than 128 characters or containing harmful characters.
12. **Timestamp Fraud**: Attempt to set a `createdAt` value that is in the future.

## Test Runner Logic
The `firestore.rules.test.ts` will verify these rejections.

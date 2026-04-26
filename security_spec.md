# Security Specification

## Data Invariants
1. A user profile (`/users/{userId}`) can only be created with a `uid` matching the authenticated user's ID.
2. Orders (`/orders/{orderId}`) must contain a `userId` matching the creator's ID.
3. Products (`/products/{productId}`) can only be modified by administrators.
4. Carts (`/carts/{userId}`) are private to the owner.
5. All timestamps (`createdAt`, `updatedAt`) must be set using `request.time`.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a user profile with a different UID.
2. **Privilege Escalation**: Non-admin user trying to create a product.
3. **Price Manipulation**: Normal user trying to update a product's price.
4. **Order Theft**: User A trying to read User B's order.
5. **Shadow Update**: Adding a field `isAdmin: true` to a user profile update.
6. **Orphaned Order**: Creating an order without a valid product reference (verified via `exists`).
7. **Bypassing Invariants**: Creating an order with a past `createdAt` timestamp.
8. **Cart PII Leak**: Anonymous user trying to read a specific user's cart.
9. **Bulk Scrape**: Attempting a collection-wide list query on `orders` without a user filter.
10. **ID Poisoning**: Using a 2KB string as a document ID for a product.
11. **State Shortcutting**: Transitioning an order status directly from `pending` to `delivered` (if business logic forbade it, though rules can enforce immutable fields).
12. **Malicious Review**: Injecting HTML/Script into a product review description field.

## Verification
These payloads will be tested using `firestore.rules.test.ts` (conceptual) and enforced by the rules.

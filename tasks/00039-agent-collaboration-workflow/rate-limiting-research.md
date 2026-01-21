# Rate Limiting Deep Dive: Convex Rate Limiter vs. Token Bucket

This document compares the high-level **Convex Rate Limiter** component with the underlying **Token Bucket** concept/primitive.

## At a Glance

| Feature | `@convex-dev/rate-limiter` | Token Bucket (Algorithm/Primitive) |
| :--- | :--- | :--- |
| **Type** | Full-Stack Component | Algorithm / Low-level Primitive |
| **Scope** | Distributed (Database-backed) | often Local (In-Memory) or Abstract |
| **Persistence** | Yes (Convex Database) | No (unless manually implemented) |
| **Consistency** | Strong (ACID Transactions) | Varies (often eventually consistent or local) |
| **Setup** | Configuration-based | Implementation-based |
| **Scalability** | Sharded (High Throughput) | Single-threaded (unless distributed via Redis/etc) |

---

## 1. What is the Token Bucket?

**Token Bucket** is not primarily a "product" but a standard **algorithm** used for rate limiting.
*   **Concept**: Imagine a bucket that gets filled with tokens at a constant rate (e.g., 10 tokens/minute).
*   **Usage**: When a user wants to perform an action, they must take a token from the bucket.
*   **Bursts**: If the bucket is full (nobody used it for a while), a user can take many tokens at once (burst functionality) until the bucket is empty.
*   **Why a "Product of its own"?**:
    *   You may see `@convex-dev/token-bucket` or generic libraries like `limiter` on NPM. These are **standalone implementations** of the math.
    *   **Use Case**: They are useful when you need the logic *without* the database overhead. For example, limiting client-side UI clicks, or processing an in-memory queue of jobs where server crashes don't matter as much.

## 2. What is `@convex-dev/rate-limiter`?

This is the **Official Convex Component** that *uses* the Token Bucket algorithm (or Fixed Window) but wraps it in the Convex ecosystem capabilities.

### Key Features
*   **Database Integration**: It stores the "tokens" in your Convex database. This means the limit persists even if your server functions restart.
*   **Transactional Integrity**: If your function throws an error (e.g., "Database full"), the rate limit consumption is **rolled back**. You don't "lose" a token for a failed action.
*   **Distributed & Sharded**: It is designed to work across many concurrent Convex function executions without race conditions, using sharding to prevent database hotspots.
*   **Fails Closed**: Designed to deny requests if the system is overwhelmed, protecting your backend.

## 3. When to use which?

### Use `@convex-dev/rate-limiter` when:
*   **Protecting Backend Resources**: You need to limit AI generations, database writes, or email sends across *all* users and instances.
*   **Monetization/Quotas**: You want to enforce "5 free searches per day". This *must* be persistent and accurate.
*   **Concurrency**: You have many users hitting the system simultaneously and need a shared source of truth.

### Use a raw Token Bucket (e.g. generic library) when:
*   **Client-Side Throttling**: Preventing a user from double-clicking a button too fast in the React UI.
*   **Ephemeral/Low-Stakes**: Limiting log output to the console (where persistence doesn't matter).
*   **Extreme Latency Sensitivity**: You cannot afford the small overhead of a database checking the limit (though Convex is very fast).

## Summary
Think of **Token Bucket** as the *engine*, and **Convex Rate Limiter** as the *car*.
*   The **engine** (Token Bucket) provides the physics of how limits work (rates, bursts).
*   The **car** (Convex Rate Limiter) provides the chassis (storage), safety systems (transactions), and transmission (sharding) needed to drive it in a real production environment.

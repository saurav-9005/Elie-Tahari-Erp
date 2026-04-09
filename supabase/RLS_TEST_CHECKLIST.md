# RLS policy test checklist (`20250407180000_erp_rls_complete.sql`)

Use the **Supabase SQL Editor** with “Run as user” / JWT, or a small test page that uses the **anon key + user session** (not the service role key, which bypasses RLS).

**Setup for each role**

1. In `profiles`, set `role` to `admin` | `finance` | `warehouse` | `viewer` for a test user, and ensure `status = 'active'`.
2. Sign in as that user (Dashboard → Authentication or your app) and obtain a **user access token** (JWT), or use Supabase client logged in as that user.

**Quick SQL session test (Dashboard → SQL)**  
You can impersonate a user with:

```sql
select set_config(
  'request.jwt.claim.sub',
  '<user-uuid>',
  true
);
-- Optionally set email for invite_log tests:
select set_config(
  'request.jwt.claim.email',
  'test@example.com',
  true
);
```

Then run `select * from orders limit 1` etc. **Note:** `set_config` behavior for JWT claims can differ by Supabase version; the most reliable check is the **client with a real logged-in user**.

---

## Admin

| Check | How |
|--------|-----|
| Read own profile | `select * from profiles where id = auth.uid()` — returns 1 row |
| Read all profiles | `select count(*) from profiles` — matches full table count |
| Update another user’s role | `update profiles set role = 'viewer' where email = 'other@…'` — succeeds; revert after |
| Insert profile (if your app does this) | Insert with `id` = new `auth.users` id — succeeds when done as admin flow |
| Orders CRUD | `select/insert/update/delete` on `orders` as needed — all allowed |
| Customers CRUD | same on `customers` |
| Inventory CRUD | same on `inventory` |
| `shopify_events` | `select * from shopify_events limit 1` — allowed |
| `sync_logs` | `select * from sync_logs limit 1` — allowed |
| `invite_log` | full read/write — allowed |

---

## Finance

| Check | Expected |
|--------|----------|
| `select * from orders limit 5` | **Allowed** |
| `insert/update/delete` on `orders` | **Denied** (no policy) |
| `select * from customers limit 5` | **Allowed** |
| `insert/update/delete` on `customers` | **Denied** |
| `select * from inventory limit 5` | **Denied** (0 rows / permission error) |
| `select * from shopify_events` | **Denied** |
| `select * from sync_logs` | **Denied** |
| `select * from invite_log` | **Denied** unless row email matches JWT (see below) |
| Own profile `select` | **Allowed** for own row only |

---

## Warehouse

| Check | Expected |
|--------|----------|
| `select * from inventory limit 5` | **Allowed** |
| `insert/update/delete` on `inventory` | **Denied** |
| `select * from orders` | **Denied** |
| `select * from customers` | **Denied** |
| `shopify_events` / `sync_logs` | **Denied** |
| Own profile `select` | **Allowed** |

---

## Viewer

| Check | Expected |
|--------|----------|
| `select count(*) from orders` | **Allowed** (dashboard-style counts) |
| `insert/update/delete` on `orders` | **Denied** |
| `select * from customers limit 5` | **Denied** |
| `select * from inventory limit 5` | **Denied** |
| `shopify_events` / `sync_logs` | **Denied** |
| Own profile `select` | **Allowed** |

---

## invite_log (non-admin)

| Check | Expected |
|--------|----------|
| Log in as user whose JWT email matches `invite_log.email` | `select * from invite_log where email = '<that email>'` returns rows |
| Log in as a different user | No rows for other users’ emails |
| `insert` / `update` / `delete` on `invite_log` | **Denied** (only admin policies allow writes) |

---

## Regression: new user / trigger

Confirm `handle_new_user` (or your signup path) still creates `profiles` with **service role** or **security definer** trigger so the first row is created even though only admins may `insert` on `profiles` via RLS for normal clients.

---

## Optional: confirm service role bypasses RLS

Using **service role** key in API or SQL as postgres maintenance: full table access without policies — expected for server-side jobs only; do not expose this key in the browser.

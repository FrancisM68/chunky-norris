# Auth System Design — ChunkyNorris

**Date:** 2026-03-30
**Status:** Approved
**Scope:** NextAuth v5 credentials provider, RBAC middleware, foster page session integration

---

## Problem

The foster page currently identifies the logged-in volunteer via `localStorage.getItem('dar_foster_id')` — a development hack that has no security, no session management, and cannot scale to any other screen. Every future screen needs to know who is logged in and what role they hold.

---

## Goals

- Real login: email + password via Auth.js v5 CredentialsProvider
- Session carries `volunteerId` and `roles` — available server- and client-side
- `/foster/**` routes locked to FOSTER and ADMIN roles via middleware
- `/admin/**` routes locked to ADMIN role via middleware (future-proof)
- Foster page reads volunteer ID from session, not localStorage
- Keep auth simple: credentials only, no OAuth, no magic links

---

## Out of scope

- Password reset / forgot password flow
- Multi-rescue login (rescue slug hardcoded to `dar`)
- Admin UI (no `/admin` routes exist yet — middleware is future-proof only)
- Email verification

---

## Architecture

### 1. Schema change — `passwordHash` on Volunteer

Add `passwordHash String?` to the `Volunteer` model in `prisma/schema.prisma`.

Optional because existing records have no password until explicitly set. Run `prisma migrate dev` to apply.

### 2. Central auth config — `src/auth.ts`

Exports `{ auth, signIn, signOut, handlers }` from Auth.js v5.

**CredentialsProvider logic:**
1. Receive `email` and `password` from login form
2. Query `getTenantClient('dar').volunteer.findUnique({ where: { email } })`
3. If no record or no `passwordHash` → return `null` (auth fails)
4. `bcryptjs.compare(password, volunteer.passwordHash)` → if false, return `null`
5. On success return `{ id: volunteer.id, roles: volunteer.roles }`

**JWT callback:** copies `volunteerId` and `roles` from the returned user object into the JWT token.

**Session callback:** copies `volunteerId` and `roles` from token into `session.user`.

### 3. TypeScript session types — `src/types/next-auth.d.ts`

Extends the Auth.js `Session` and `JWT` interfaces:

```ts
declare module 'next-auth' {
  interface Session {
    user: {
      volunteerId: string
      roles: Role[]
    }
  }
}
```

This makes `session.user.volunteerId` and `session.user.roles` type-safe everywhere.

### 4. Route handlers — `src/app/api/auth/[...nextauth]/route.ts`

Re-exports `handlers` from `src/auth.ts`. Required by Auth.js v5 App Router convention.

### 5. Middleware — `middleware.ts` (project root)

```
/login              → public
/foster/**          → FOSTER or ADMIN required
/admin/**           → ADMIN required
/api/auth/**        → public (Auth.js internals)
everything else     → public for now
```

No session → redirect to `/login?callbackUrl=<path>`
Wrong role → redirect to `/login` (no information leaked about what route required)

### 6. Login page — `src/app/login/page.tsx`

Client component. Email + password fields. Calls `signIn('credentials', { email, password, redirect: false })`. On success, redirects to `callbackUrl` from query string, or `/foster` as default. On failure, shows inline error message without page reload.

Unstyled beyond Tailwind basics — consistent with the rest of the app.

### 7. Session provider — `src/app/layout.tsx`

Wrap `{children}` in Auth.js `SessionProvider` so `useSession()` is available in all client components.

### 8. Foster page — `src/app/foster/page.tsx`

Remove the `localStorage.getItem('dar_foster_id')` block and the associated error state.

Replace with:
```ts
const { data: session, status } = useSession()
```

- `status === 'loading'` → show loading spinner (same as existing loading state)
- `status === 'unauthenticated'` → middleware handles redirect; this branch is a safety fallback only
- `status === 'authenticated'` → use `session.user.volunteerId` where `fosterId` was previously read from localStorage

### 9. Password seed script — `scripts/set-password.ts`

CLI script to set a bcrypt-hashed password for a volunteer:

```
npx tsx scripts/set-password.ts --email lisa@dar.ie --password <password>
```

Uses `getTenantClient('dar')`, hashes with bcrypt cost factor 12, calls `volunteer.update`.

---

## Files created / modified

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `passwordHash String?` to Volunteer |
| `src/auth.ts` | New — Auth.js v5 config |
| `src/types/next-auth.d.ts` | New — session type extensions |
| `src/app/api/auth/[...nextauth]/route.ts` | New — handler re-export |
| `middleware.ts` | New — RBAC route guard |
| `src/app/login/page.tsx` | New — login form |
| `src/app/layout.tsx` | Wrap with SessionProvider |
| `src/app/foster/page.tsx` | Replace localStorage with useSession |
| `scripts/set-password.ts` | New — password seed utility |

---

## Dependencies to install

- `next-auth@5` (Auth.js v5)
- `bcryptjs` + `@types/bcryptjs`

---

## Testing

- Unit test: credentials provider returns null for bad password, correct user for good password
- Unit test: middleware redirects unauthenticated requests to /login
- Manual: Lisa can log in, sees foster page, logs a treatment

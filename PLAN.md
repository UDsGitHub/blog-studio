# Blog Studio: System and Frontend Plan (draft 3)

Status: planning only. The owner is making the API changes manually. Items marked **[open]** need a decision.

## 1. Goals

- The blog API is the single source of truth. This app (the "studio") is one consumer and the only writer.
- Studio capabilities: read, create, edit, delete, publish and unpublish articles.
- Other consumers (e.g. `~/code/apps/portfolio`, Next.js 16) only read published articles.
- Creating or updating a published article must make consumers pick up the change quickly.

## 2. Consumers and change propagation

Consumers pull. The API pushes only to server-side consumers that cache.


| Consumer type                     | Mechanism                                                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-cached (Next portfolio)    | API sends a signed **webhook** on publish-affecting events. Portfolio route handler verifies the signature and calls `revalidateTag('articles')`.   |
| Client apps (studio, future SPAs) | RTK Query cache: tag invalidation after own mutations, refetch on focus.                                                                            |
| Everyone (baseline)               | `ETag` plus `Cache-Control: s-maxage=60, stale-while-revalidate` on `GET /articles`, so a failed webhook is bounded to about 1 minute of staleness. |


Events that fire the webhook:

- create with status `PUBLISHED`
- edit of an article that is `PUBLISHED`
- any status change into or out of `PUBLISHED`
- delete of a `PUBLISHED` article
- slug change of a published article. The payload includes the old and new slug.

Draft saves fire nothing. Consumer URLs come from an env var at first (`WEBHOOK_URLS`). Delivery is fire-and-forget with 1-2 retries. Payload is HMAC-signed.

Not doing: SSE or websockets. Server-side consumers have no live client to notify, and a blog does not need realtime.

## 3. Pagination and search

- **List** uses cursor pagination (`limit`, `cursorId`, `hasMore`), scoped by `status`. The next cursor is the id of the last item in the fetched page.
- **Stale cursor: accepted, no keyset cursor.** If the cursor row is deleted, the next request returns an empty page (unverified, worth a test). The studio avoids this because every mutation invalidates the list tag, which refetches from page one and recomputes cursors. The only gap is a delete made in another tab or device, which is negligible for a single-user tool.
- **Search** is full-text, top-N by relevance, with no cursor (the API rejects `cursorId` with `search`).
- UI consequence: browsing is the list (infinite scroll), and searching is the command palette (top N results, "refine your query" footer). The two are separate tools.
- Search results return a highlighted snippet (`ts_headline`) instead of the body.
- `SearchArticlesResponseDto` **has no** `hasMore` **field** (confirmed intentional, not a side effect of a coverage-driven test pass that briefly removed it): search never paginates, so the field would always be `false` and adds nothing. The studio's search UI should not expect this field — it's an intentional asymmetry with `browse`'s `{data, hasMore}` shape, not an oversight.
- **List ordering [open]:** `PUBLISHED` sorts by `publishedAt desc`. Other statuses sort by `createdAt desc` (or `updatedAt`, for "recently edited" drafts). The API picks the sort key from the `status` filter. `id desc` stays as the tie-breaker.



## 4. Layout and flow

```
┌────────────────────────────────────────────────────────────────┐
│ ✎ Blog Studio        [ 🔍 Search articles…        ⌘K ]  [+ New]│
├───────────────────┬────────────────────────────────────────────┤
│ [Published|Drafts|│  Title ______________________________  [⚙] │
│  Archived]   [⚙]  │  ┌─────────────────────┬─────────────────┐ │
│ ───────────────── │  │ Markdown            │ Preview         │ │
│ ▸ Article title   │  │                     │                 │ │
│   Draft · 2d ago  │  │                     │                 │ │
│ ▸ Article title   │  └─────────────────────┴─────────────────┘ │
│ ▸ …  (infinite    │ ────────────────────────────────────────── │
│      scroll)      │  <actions depend on article state, see 5>  │
└───────────────────┴────────────────────────────────────────────┘
```

- Top bar: app title, wide search trigger (opens the ⌘K palette), New button.
- Left: status tabs plus a filter button. The filter button opens a drawer (side on desktop, bottom sheet on mobile). It is hidden until there is more than one filter. Date range and tags are the planned filters. Below is the infinite-scroll list.
- Right: editor with title, markdown editor with preview toggle, and a sticky action bar.
- **Post settings panel (editor's [⚙]):** a slide-over that holds the non-body fields: excerpt now, and later slug, cover image and tags. This replaces "navigate to another page after saving", which interrupts writing and needs a navigation guard. The same panel is available before the first save.
- Selecting an article sets the route `/articles/:id`. The studio loads the full article by id (list responses have no body). Switching away from unsaved edits prompts save or discard.
- Mobile: list is full screen, tapping opens the editor full screen with a back button, and the palette becomes a full-screen sheet.



## 5. Editor action states (intentional saves, no autosave)


| Article state | Actions                                         | Result                                                      |
| ------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| New (unsaved) | Discard, Save draft, Publish                    | Toast: "Saved to drafts". Publish creates with `PUBLISHED`. |
| Draft         | Discard changes, Save draft, Publish            | Publish sets `PUBLISHED`.                                   |
| Published     | Discard changes, **Update**, Unpublish          | Update saves changes live. Unpublish reverts to `DRAFT`.    |
| Any           | Overflow menu: Archive, Delete (confirm dialog) |                                                             |


"Save draft" is never offered on a published article, because it would silently unpublish it. Feedback is a toast (not a modal), which may carry a "Publish now" action.

**Status transitions, resolved:**


| From → To                     | Allowed           | Notes                                                                                                                       |
| ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Draft → Published             | yes               | sets `publishedAt` if not already set                                                                                       |
| Published → Archived          | yes               |                                                                                                                             |
| Archived → Published          | yes               | `publishedAt` untouched                                                                                                     |
| Published → Draft (Unpublish) | yes               | `publishedAt` untouched, so a re-publish doesn't look "new"                                                                 |
| Draft → Archived              | **blocked** (500) | archived must imply "was once published", which keeps date-ordering (`getFilterDateColumn`) meaningful for the Archived tab |


`Unpublish` was reconsidered against a stricter "archive-only" alternative. Decision: allow it directly, because the same end state (published article back in Drafts) was already reachable via `Published → Archived → Draft` — blocking the direct path added friction without adding safety, and it matches the WordPress/Ghost/Medium convention for "Unpublish". The one real risk this surfaced was fixed alongside it, not worked around: see slug history below.

## 6. Data model and API changes



### Schema additions

- `excerpt` (nullable, `VarChar(300)`): author-written. When null, the API derives one from the body on read (strip markdown, about 160 characters). Never stored, so it cannot go stale.
- `publishedAt` (nullable `timestamptz`): set the first time the status becomes `PUBLISHED`, never cleared or reset by unpublishing or republishing. Uses:
  - public display date and list ordering
  - date-range filter for public consumers
  - decides whether a slug change needs a history row
- `article_slug_history` table (see below).
- Future: `coverImageUrl`, `tags text[]` with a GIN index. See section 9.



### Slug rule: dynamic, with a history table

- The slug always follows the title (`getSlug` on title change).
- History table: `article_slug_history(slug unique, article_id FK on delete cascade, created_at)`.
- When a title edit changes the slug of an article that has ever had `publishedAt` set — regardless of its *current* status — insert the old slug into the history. Slugs of never-published articles are not recorded, since nobody could have linked to them. (Implemented as `if (article.publishedAt)`, not `if (article.status === PUBLISHED)`: the latter missed renames made while an article is unpublished/drafted or archived, silently dropping the redirect for a URL that had genuinely been public. This mattered once `Published → Draft` was allowed, since renaming a draft is normal author behavior — see the status transitions table above.)
- History rows point to the **article id**, not to the next slug, so renames never form redirect chains.
- `GET /articles/:slug`: look up `article.slug`, then fall back to the history table. On a history hit, return the article as normal (200). The response carries the current slug, and the consumer compares it to the requested slug and issues a permanent redirect (Next: `permanentRedirect`).
- `getSlug` uniqueness checks both tables, so a new article cannot claim a slug that an old URL still redirects from. If an article reclaims one of its own old slugs, delete that history row.
- Deleting an article cascades its history, so old URLs 404.



### Endpoint changes

Done (by owner):

- [x] `status` filter on list, no forced default
- [x] `updatedAt` set on update
- [x] search result includes `status`

To do (order: API first, then UI):

- [x] Access guard (section 7), covering list, search and `findBySlug`
- [x] Search SQL filters by `status`
- [x] Remove `console.log('status passed')` in `article.service.ts`
- [x] `GET` article by id for the studio (authed). List has no body, and slugs are not stable route keys. **[open]** path: `/articles/id/:id`, or UUID detection on `:slug`.
- [x] List responses omit `body`. Return `excerpt` (stored or derived).
- [x] Add `excerpt` and `publishedAt` columns and the slug history table (migration)
- [x] Slug history logic in create, update and `findBySlug`
- [x] Date-range filter params (`from`, `to` on `publishedAt`), compatible with cursor pagination
- [ ] Webhook module (section 2)
- [ ] `ETag` and `Cache-Control` on list and detail



## 7. Auth and access

- CORS restricts browsers only. `curl`, server-side fetches and the portfolio's server ignore it, so it is not access control.
- **Single rule, one guard:** requests without the key can only see `PUBLISHED` content (list, search and by-slug; a non-published slug returns 404, not 403). Requests with the key can see everything and can POST, PATCH and DELETE.
- Consumers such as the portfolio never need the key, because public reads are always published-only. Only the studio holds it.
- **Key storage in the studio (a Vite SPA):**
  - `VITE_*` env vars are inlined into the JS bundle at build time, so anyone who opens the studio URL can read the key.
  - Instead: prompt for the key on first load and keep it in localStorage. It never ships in the bundle.
  - Sanitize rendered markdown in the preview (e.g. `rehype-sanitize`), since an XSS on the origin could read localStorage.
  - **[open]** If the studio is only ever run on localhost, a `VITE_` env var is acceptable.



## 8. Frontend stack

- Studio: Vite + React 19 + TypeScript (existing `client/`).
- Data layer: RTK Query. Tags for the list and per-article invalidation, `infiniteQuery` for the scroll list, `setupListeners` for refetch on focus.
- UI: Tailwind plus shadcn/ui (cmdk for the palette, vaul for drawers), markdown editor with preview.



## 9. Future: images and tags

- **Images (Cloudinary):** the browser uploads directly to Cloudinary, using a server-signed upload or an unsigned preset. The article stores the returned `secure_url` (cover image column). Body images are inserted into the markdown as URLs. Consumers can add transformations to the URL (width, format).
- **Tags:** `tags text[]` on `article`, lowercased, with a GIN index. Filtering is `tags @> ARRAY[...]` and works with cursor pagination. Tag filter goes in the same filter drawer as date range. If tag metadata or one-place renames are ever needed, migrate to normalized tables.



## 10. Decisions log

- Single-user tool. Studio is a Vite SPA. Portfolio is Next.js 16 at `~/code/apps/portfolio`.
- Body is markdown, rendered by consumers.
- Pull plus webhook for propagation.
- Intentional drafts (no autosave).
- API fixes before UI.
- Layout approved: top-bar search and ⌘K palette, status tabs, left list, right editor, post settings panel.
- Excerpt column authored in the post settings panel, with a derived fallback.
- Slug is dynamic with a history table and consumer-side redirect.
- Access key guards non-published reads and all writes.
- RTK Query as the data layer.
- Stale cursor accepted, mitigated by tag invalidation.
- Unpublish (`Published → Draft`) is allowed directly; `Draft → Archived` stays blocked. Slug history now keys off `publishedAt` ever having been set, not current status.



## 11a. Redis caching design

Three cache layers exist and are complementary, not redundant, because each protects a different audience:


| Layer                       | Protects against                                       | Who benefits                                                     |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| RTK Query (studio, browser) | Re-fetching within one browser tab                     | Only the studio, only within a session                           |
| HTTP `ETag`/`Cache-Control` | Re-sending a full body to a client that already has it | Any individual repeat client (a browser, a Next.js server fetch) |
| Redis                       | Re-running the same DB query at all                    | Every request that reaches the server, from any client           |


They funnel: RTK Query → HTTP conditional request → Redis → Postgres, each only exercised when the one before it misses. Note: Railway does not turn `Cache-Control` into a shared edge cache — it just runs the container. The header only pays off for a client that itself honors it (a browser, a CDN if one is ever added). The portfolio's real freshness guarantee is the webhook → `revalidateTag`, not this header.

**Invalidation: a single version counter, not key enumeration or pattern deletion.** `ArticleCacheService` (`server/src/article/cache/`) keeps one Redis integer, `articles:version`. Every cache key (`articles:v{n}:browse:...`, `articles:v{n}:search:...`, `articles:v{n}:slug:{slug}`) embeds the current version. A write calls `bumpVersion()`, which changes what key *future* reads compute — old entries aren't deleted, they just become unreachable and expire via TTL. This was chosen over `SCAN`+`UNLINK` pattern deletion (the other valid option — `KEYS` is never safe, it blocks Redis's single event loop) because one `INCR`-style bump invalidates every cache shape (list, search, and detail) in one op, including future ones, versus needing a separate scan per key prefix.

**Scope: broader than originally proposed, and that's fine.** The plan had recommended caching public (unauthenticated) reads only, to sidestep an author seeing their own stale edit. The implementation caches *all* browse/search/slug reads, authenticated or not — but this is safe and consistent because `bumpVersion()` fires on every create/update/delete (not just publish-affecting ones), so an admin's own follow-up read after saving always computes a new, uncached key. Broader caching without narrower invalidation would have been wrong; broader caching *with* broader invalidation is fine, and this is what was built.

`findBySlug` **caching is gated on the article's actual status, not on** `isAuthenticated`**.** Only a `PUBLISHED` result is ever written to or served from cache; a `DRAFT`/`ARCHIVED` result always goes straight to `articleService.findBySlug`, which still does its own 404 gating for unauthenticated callers. This means the cache never holds non-public content, which is a stronger guarantee than gating on the caller's auth would have been.

**Resolved:** the cache layer was later migrated off `@nestjs/cache-manager`/`@keyv/redis` onto a raw `ioredis` client (`RedisService extends Redis`), and `bumpVersion()` now calls `redis.incr()` directly — genuinely atomic, not read-then-write. This closes what was originally logged here as an accepted, low-risk limitation.

**Resolved: Redis-outage resilience.** Every `ArticleCacheService` method (`get`, `set`, `bumpVersion`) is wrapped in try/catch and fails open (treated as a cache miss, falls through to Postgres) — but the underlying `ioredis` calls needed to actually *fail fast* for that to matter in practice. This took real investigation: `maxRetriesPerRequest`, `enableOfflineQueue: false`, and `commandTimeout` were each tried and verified live (stop the Redis container, time a request) with no effect — a request still took ~73.5 seconds before erroring, consistently, across every configuration tried, including one where a hand-rolled `Promise.race`-style timeout independent of `ioredis`'s internals *also* didn't help, which proved the delay wasn't even reaching the cache-service code in the way it appeared to. Root cause (per a separate debugging pass, cross-checked live): `ioredis` was sitting in its offline/reconnect queue rather than rejecting immediately, so none of the fail-fast options got a chance to apply. Fix: `enableOfflineQueue: false` now genuinely rejects immediately while disconnected (`connectTimeout`/`commandTimeout` bound the black-holed-TCP case, `retryStrategy` keeps auto-recovery working). Verified live, repeatedly: outage → next request resolves in **44–68ms** instead of ~73.5s/500, including after Redis had already been down for 8+ seconds; Redis restored → immediate recovery, **no app restart needed**.

**Still open:** `- [ ] figure out appropriate TTLs for cache keys` (todo.md) — currently a flat 60s (`60_000`, confirmed empirically to be milliseconds, not seconds) for every key shape.

## 11. Known follow-ups

- [x] `draftToArchived` now throws `BadRequestException` (400), not 500 — fixed, tests updated (unit + e2e).
- [x] `AuthGuard`'s length short-circuit before `timingSafeEqual`: accepted as-is. It only leaks `API_KEY`'s length, not its contents, which is what `timingSafeEqual` actually protects; not worth the extra complexity for a single-user key.
- [x] `browseArticles`/`searchArticles` deduped: extracted into `ArticleQueryGuard` (`src/article/article-query.guard.ts`), applied via `@UseGuards` on both routes, with its own unit spec. Reads raw `request.query` (pre-`ValidationPipe`, since guards run before pipes) — fine here since it only does string equality/truthiness checks, not date parsing; a repeated query param (`?status=A&status=B`) would slip past this guard as an array but gets rejected by the DTO's `@IsEnum` validation right after, so no real gap.



## 12. Production readiness checklist

Structured around the OWASP API Security Top 10, plus an ops column for concerns that framework doesn't cover. Status is honest, not aspirational — "Open" means genuinely not done, not "low priority so we're calling it done."

This section exists because it should have existed from the start: security and reliability work happened reactively, thread by thread (design the auth guard → fix a bug → add caching → debug an outage), without a standing list run across categories. That's how rate limiting went unmentioned until asked for directly, despite "Broken Authentication" and "Unrestricted Resource Consumption" being adjacent-but-distinct OWASP categories. This list is the fix for that: scan it, don't wait to be asked.

### Security (OWASP API Security Top 10)


| Category                                                                     | Status                        | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API2 Broken Authentication                                                   | Covered                       | API key guard, `timingSafeEqual` comparison, key storage guidance (§7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| API3 Excessive Data Exposure / Mass Assignment                               | Covered                       | `ValidationPipe({ whitelist: true })` blocks unexpected fields on create/update                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| API4 Unrestricted Resource Consumption                                       | **Covered**                   | `@nestjs/throttler`, two named throttlers (`short`/`long`) with route-level `@SkipThrottle` tiers — verified live: exactly the configured limit succeeds, the next request gets `429` with a `Retry-After-{name}` header and a `ThrottlerException` body. Pagination `limit` is separately capped (`@Max(100)`). `app.set('trust proxy', ...)` is now configured via `TRUST_PROXY` env var (`loopback` for local/CI, `1` for real dev) — confirm the correct value is also set as a real Railway env var before deploy. Request body size limits: `title`/`body`/`excerpt` are capped via `@MaxLength` (`MAX_TITLE_LENGTH`/`MAX_BODY_LENGTH`/`MAX_EXCERPT_LENGTH` in `article.constants.ts`), and the wire-level JSON body is capped via `app.useBodyParser('json', { limit: MAX_REQUEST_BODY_BYTES })` — verified live: a 2MB payload gets `413`, a 99k-character legitimate payload still succeeds. |
| API5 Broken Function-Level Authorization                                     | Covered                       | `@AdminOnly` guard on mutating/admin routes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| API6 Unrestricted Access to Sensitive Business Flows                         | Covered                       | same throttler tiers apply to create/update/delete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| API7 SSRF                                                                    | Not yet relevant              | becomes relevant once Cloudinary image upload lands (fetching remote URLs) — revisit then                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| API8 Security Misconfiguration                                               | **Covered**                   | `helmet()` added in `main.ts`, before Swagger setup so `/api` gets it too — verified live: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, a CSP header all present, `X-Powered-By` gone. Checked specifically for the known Helmet-CSP-vs-Swagger-UI conflict (older `swagger-ui-express` inlines its init script, which a strict `script-src 'self'` blocks): this version externalizes all script logic to same-origin files, confirmed by fetching the rendered HTML and each referenced asset — no conflict. CSP is `default-src 'self'`, which will need an `img-src`/`connect-src` addition once Cloudinary URLs are in play; not needed yet. Still open: haven't confirmed Nest suppresses stack traces in production error responses. |
| API1/API9/API10 (object-level authz, inventory mgmt, unsafe API consumption) | Not applicable / low priority | single-tenant, no per-user ownership model; no third-party APIs consumed yet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |




### Ops / reliability


| Area                           | Status                                | Note                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health check                   | **Covered**                           | `/health` now pings both Postgres (Prisma) and Redis (`RedisHealthIndicator`) — verified live, returns `{"database":{"status":"up"},"redis":{"status":"up"}}`                                                                                                                                                                                              |
| DB-outage graceful degradation | **Open, unverified**                  | the Redis-outage investigation proved fail-open works there; nobody has yet tested what happens to a request if *Postgres* — the actual source of truth — is unreachable. Given how wrong the initial assumptions about Redis's default behavior turned out to be, this should be tested the same way (stop the DB container, time a request), not assumed |
| Production migrations          | **Covered**                           | Railway predeploy script runs `prisma migrate deploy`; the `migrate` compose service is for local dev only                                                                                                                                                                                                                                                 |
| Backups                        | **Accepted risk, budget-constrained** | Railway managed Postgres backups require the Pro plan. Deferred deliberately, not overlooked — if this needs relaying to a stakeholder, the answer is "budget constraint, not an oversight," and it should be revisited if/when the plan changes                                                                                                           |
| Error visibility               | Open, deferred                        | no error-tracking service (Sentry or similar); exceptions are only visible via container logs. Fine at current scale, worth naming explicitly rather than leaving unnoticed                                                                                                                                                                                |
| CI                             | Covered                               | `.github/workflows/ci-main.yml` runs lint/typecheck/unit/e2e with real Postgres + Redis services                                                                                                                                                                                                                                                           |




### A note on dev environment hygiene

Unrelated to the app itself, but worth recording: the local dev container (`nest start --watch` under `docker compose`) has intermittently failed to rebind port 3000 on a file-change restart (`EADDRINUSE`), silently leaving a *stale* process serving requests while looking like a healthy, up-to-date container — this cost real debugging time more than once (it's what made the rate limiter look broken during initial verification, before a full `docker compose down && up --build` proved it was working correctly all along). When live-testing anything in this container and the result looks wrong or inconsistent, a full recreate — not just a hot-reload — should be the first troubleshooting step, not the last.
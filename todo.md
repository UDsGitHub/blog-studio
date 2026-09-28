- [ ] start buidling out frontend
- [x] add redis caching to the backend
- [x] update unit tests and e2e tests based on current checked changes for API 
- [x] include excerpt in select for non-search article list and exclude body. derive excerpt from body if excerpt is empty
- [x] env file for container seems to be using my regular env not test env... adding envfilepath in app module gets the test env in for docker, but when i run the app, it uses test env instead of regular env
- [ ] figure out appropriate TTLs for cache keys
- [ ] discuss Redis/cache logging: instance Logger + context vs Logger.error(error); warn vs error; include op/key; avoid noisy reconnect spam
- [x] Redis hardening: enableOfflineQueue false / maxRetriesPerRequest / connectTimeout / commandTimeout / retryStrategy so commands fail fast instead of hanging — verified live, outage now resolves in 44-68ms instead of ~73.5s (see PLAN.md §11a)
- [x] rate limiting: @nestjs/throttler, two-tier (short/long) via @SkipThrottle — verified live, 429 + Retry-After-{name} at the configured limit (see PLAN.md §12)
- [x] set app.set('trust proxy', ...) in main.ts — done via TRUST_PROXY env var (loopback for local/CI, 1 for real dev); confirm the correct value is set as a real Railway env var before relying on rate limiting in production
- [x] add helmet to main.ts — verified live: nosniff/frame-options/HSTS/CSP headers present, X-Powered-By gone; checked Swagger UI specifically against Helmet's CSP (a known historical conflict) and confirmed no issue, this version externalizes all script logic to same-origin files (see PLAN.md §12, API8)
- [x] add a request body size limit — `useBodyParser('json', { limit: MAX_REQUEST_BODY_BYTES })` in main.ts, shared constants in `article.constants.ts` (MAX_TITLE_LENGTH/MAX_BODY_LENGTH/MAX_EXCERPT_LENGTH/MAX_REQUEST_BODY_BYTES) so the DTO char limits and the wire byte limit can't drift apart; verified live, 2MB payload → 413, 99k-char legitimate payload → 201 (see PLAN.md §12, API4)
- [x] test Postgres-outage graceful degradation the same way the Redis outage was tested — no fix needed: fails in 55-190ms across cached/uncached/write/health routes, no hang, no degradation after 8s sustained outage, auto-recovers with no app restart (see PLAN.md §12, ops). Two follow-ups noted, not urgent: map the Prisma "database unreachable" error to 503 instead of a generic 500; investigate a cold-start window where the very first request(s) after container boot can silently skip caching (fail-open swallows it, harmless but worth understanding)
- [x] write dedicated e2e tests for rate limiting — `test/throttle.e2e-spec.ts`; found and fixed 3 real bugs during review (missing async/await meant nothing was actually being tested; malformed UUIDs from a stray `}` in 3 URLs; the search test was hitting the browse route, not /articles/search, and silently sharing its throttle bucket) — all 7 cases now genuinely pass

Plan: see PLAN.md. API first, then UI.

## API
- [x] access key guard: no key = published only (list, search, by-slug 404 for non-published); key required for POST/PATCH/DELETE
- [x] search sql filters by status
- [x] remove console.log in article.service findAll
- [x] migration: add `excerpt` (nullable varchar 300) and `publishedAt` (nullable timestamptz)
- [x] set publishedAt on first transition to PUBLISHED (never reset)
- [x] migration: `article_slug_history` (slug unique, article_id fk cascade, created_at)
- [x] slug history: record old slug when a published article's title changes; getSlug checks both tables; findBySlug falls back to history
- [x] get article by id endpoint for the studio (decide path)
- [x] list responses omit body, return excerpt (stored or derived from markdown)
- [x] search results return ts_headline snippet instead of body
- [x] list ordering: PUBLISHED by publishedAt desc, others by createdAt desc (decide)
- [x] date range filter (from/to on publishedAt)
- [x] allow unpublish (PUBLISHED -> DRAFT) directly; keep DRAFT -> ARCHIVED blocked (500); publishedAt untouched by unpublish
- [x] fix slug history to key off `publishedAt` ever set, not current status === PUBLISHED (was dropping history for renames made while unpublished/archived)
- [x] webhook module: `WebhookService` (`server/src/webhook/`), HMAC-SHA256 signed payload via `@nestjs/http-client`, `WEBHOOK_URLS`/`WEBHOOK_SECRET` env, publish-affecting events only (published/unpublished/updated/deleted, decided from before/after state in `ArticleService`) — see PLAN.md §13
- [x] ETag + Cache-Control on list and detail
- [x] update tests for all of the above
- [x] follow-up: draftToArchived now throws BadRequestException (400) instead of 500
- [x] follow-up: AuthGuard key-length short-circuit reviewed, accepted as-is (only leaks key length, not contents)
- [x] follow-up: deduped browseArticles/searchArticles guard block into ArticleQueryGuard, with its own tests (see PLAN.md §11)

## Portfolio (~/code/apps/portfolio)
- [ ] revalidate route handler: verify HMAC, revalidateTag('articles')
- [ ] blog page: fetch published articles, render markdown, redirect when returned slug differs from requested

## Studio (client, Vite + RTK Query)
- [ ] pick stack: Tailwind, shadcn/ui, router, markdown editor + sanitized preview
- [ ] api key prompt + localStorage (no VITE_ env for the key)
- [ ] top bar + cmd-K search palette
- [ ] left list: status tabs, infinite scroll (RTK infiniteQuery), tag invalidation on every mutation
- [ ] editor pane + action bar (new/draft/published states), toast feedback
- [ ] post settings panel (excerpt now; slug, cover image, tags later)
- [ ] filter drawer (date range, later tags)
- [ ] unsaved changes guard when switching articles
- [ ] mobile layout

## Later
- [ ] cloudinary cover image + body image upload
- [ ] tags (text[] + GIN index) and tag filter

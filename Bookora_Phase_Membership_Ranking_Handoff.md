# Bookora — Membership Ranking & Tier-based Coupon

**STATUS: DONE (VERIFIED) — 22/11/2026.** All mandatory implementation, database, automated, runtime and browser gates are satisfied with the evidence below.

**BOOKORA — MEMBERSHIP RANKING & TIER-BASED COUPON — DONE (VERIFIED)**

## 1. Baseline and preflight

Repositories used were the local working trees, not remote copies:

| Repository | Root | Starting HEAD | Pre-existing changes |
|---|---|---|---|
| Web | `D:/CTU/CT466E/bookora-web/bookora-web` | `ce1d9206d8357c8816ad553e4f4733a16cf22815` | `AGENTS.md`, `CLAUDE.md` only; preserved |
| API | `D:/CTU/CT466E/bookora-api/bookora-api` | `bc54589fe1d92078d0aac9d48278cfd923e9f4b8` | `AGENTS.md`, `CLAUDE.md` only; preserved |

Read the supplied implementation prompt and approved image, RTK instructions, repository instructions/package scripts, relevant Orders/Coupon/Notifications handoffs, and current source. GitNexus indexes initially matched both HEADs. New Membership symbols are not in those baseline indexes; source and tests remain authoritative.

Paths below are relative to the named repository root.

| ID | Actual source audited | Finding / action | Scope and evidence |
|---|---|---|---|
| M-01 | API `prisma/schema/20-auth-users-branches.models.prisma`; authorization SuperAdminGuard; customer-account controller | KEEP identity/guards; CUSTOMER-only Membership | REST role tests; DB trigger rejects BRANCH enrollment |
| M-02 | API `admin-orders.service.ts:transition`, `payments.service.ts:applySuccessfulVnpayTransaction`, `orders/order-status-history.ts` | KEEP status machine; add credit at committed completion transaction | COD sets PAID before history; VNPay pays while PENDING, then Admin completes; both exercised |
| M-03 | API `checkout.service.ts`, `coupon-pricing.ts`, `27-orders-payments.models.prisma` | KEEP pricing; canonical credit = subtotal − ORDER coupon | Header equals SUM(lineTotal − couponDiscountAmount); real DB golden snapshot test |
| M-04 | API source/schema search; account-dashboard `totalSpent` | GAP Membership; existing dashboard total includes a different accounting purpose | New isolated domain; dashboard/reporting formula unchanged |
| M-05 | API historical status history / payment timestamps; PostgreSQL helper | GAP backfill; chronological bounded script | Dry-run/apply/rerun on fixture and verified development DB |
| C-01 | API `coupons.service.ts:publicList/eligibility/resolve/redeem` | Extend shared authority with nullable minimum tier | PUBLIC filtering, PRIVATE rejection, ORDER/SHIPPING and legacy NULL tests |
| C-02 | API `checkout.service.ts:resolveCheckout/revalidateCouponCheckout`; `couponRuleVersion` | Extend fingerprint with current tier and min-tier rule version | Stale preview rejected; final transactional eligibility preserved |
| N-01 | API `notification-intents.ts`, `notification-worker.service.ts`; Web notification bridge/Bell | Reuse durable dispatch, worker and existing `notification.changed` signal | Real WebSocket + durable REST tests; no celebration flow |
| A-01 | Web `AdminCouponListPage.vue`, shared admin DataTable/ColumnHeader, money input behavior | Reuse table, search/filter/sort/page-size and read-only detail patterns | Admin Membership page; new money form rejects malformed input instead of silently truncating it |
| U-01 | Web `CustomerAccountLayout.vue`, `CustomerAccountSidebar.vue`, `client.routes.ts` | Keep header/layout/sidebar self-start behavior | Add Membership route and sidebar item only |
| U-02 | Web `CheckoutCouponDialog.vue`, Coupon form/columns | Keep mixed ORDER/SHIPPING groups | Add small minimum-tier badge and Admin Select |
| X-01 | API OpenAPI exporter; Web sync/Orval/Zod scripts; PostgreSQL fixture helper | Reuse canonical pipeline and test infrastructure | 167 paths / 231 operations / 290 schemas; no hand-edited generated code |

### Impact review

Upstream analysis before integration edits: `recordOrderStatusHistory` HIGH (6 direct callers, Orders/Payments); `eligibility` HIGH (3 direct callers: list/resolve/redeem); `publicList` HIGH (2 direct callers); `couponRuleVersion` HIGH (3); `resolveCheckout` HIGH (3: preview/COD/VNPay). Admin transition LOW (1 caller); Notification worker tick/message/publish LOW; AppModule MEDIUM (11 direct references). Web notification target LOW (3 callers); bridge LOW (1); Coupon form/columns LOW.

Final baseline-index `detect_changes(scope: all)` returned API **critical: 39 mapped symbols / 19 flows / 16 tracked files**, Web **high: 21 symbols / 6 flows / 27 tracked files**. Warnings were reported. It also marks adjacent unchanged symbols because hunks/line positions moved; direct source comparison confirmed `AdminOrdersService.cancel` and menu `isAllowed` unchanged. New/untracked files need the explicit file review below; this scan does not certify them. No commit was made. Browser follow-up impact: router file MEDIUM (9 direct references), DashboardLayout LOW (1 direct), three menu/Select primitive files MEDIUM (1 direct barrel reference each, 36–54 transitive nodes). New fixture/component symbols return UNKNOWN in the baseline index; their actual source scope was reviewed manually.

## 2. Domain and transaction design

- Four fixed enum values: BRONZE/Đồng, SILVER/Bạc, GOLD/Vàng, DIAMOND/Kim cương. Bronze is always 0. A singleton config stores the other three thresholds, initially 2m/5m/10m; API emits four tier metadata entries. No tier CRUD.
- Customer without a persisted profile reads as Bronze/0 without a GET-triggered backfill. Credits provision a row idempotently; backfill enrolls legacy Customers including those with no orders. SYSTEM/BRANCH cannot own a profile.
- A credit requires authoritative `COMPLETED && PAID`, CUSTOMER owner and valid immutable merchandise snapshots. Shipping fees/SHIPPING coupons are excluded. No additional catalog/Flash discount subtraction. Zero net merchandise yields explicit `ZERO_AMOUNT`, no positive ledger row or promotion.
- Credit locks Order, reads a shared config lock, then locks the unique customer profile. Unique Order ledger + serializable retries prevent duplicate/lost credits. Profile, ledger, tier history and notification intent share the outer domain transaction. Database guards reject decreasing spend/tier; history only records actual promotions. Multi-threshold jumps create one transition.
- COD completion and verified VNPay→completion use the existing history point after payment state is persisted. In current source there is no independent operation that pays an already completed COD order: COD completion pays atomically. Reversed eligibility ordering is also tested directly against the same canonical credit function.
- Backfill uses the same credit function, stable business chronology and a bounded keyset scan. Effective date is max(actual completion history, paidAt) when both exist. Unknown dates stay null. If a customer's historic chronology is incomplete, backfill promotion dates stay unknown rather than inferring a false crossing date from placement order.
- Config saves validate/lock the whole triple and compare version, write actor/old/new audit and a durable pending/cursor state. Restartable reevaluation processes 100 profiles per batch, bounded wakes, only raises ranks and emits no notifications. Concurrent saves while pending return conflict. Admin polling runs only while config is pending; Customer Membership has no rank polling.

## 3. Migration, backup and actual backfill

Additive migration: `20261122090000_membership_ranking`. Adds Membership enum/config/profile/ledger/history/audit and nullable Coupon minimum tier. FK deletion is restrictive for financial history. Unique Order credit and user/tier history constraints, relevant history/tier-spend indexes, positive ordered safe-money checks and a CUSTOMER/no-decrease trigger are included. Config is initialized once with `ON CONFLICT DO NOTHING`; normal seeds never overwrite Admin thresholds. Existing migrations were not modified.

Verified development target: `localhost:5432/bookora_db`, NODE_ENV development. Before DDL, generated SQL was reviewed and full migrations applied successfully on separate disposable test databases.

Backup before application DDL:

- `D:/CTU/CT466E/backups/bookora_db_before_membership_1795318827982.backup`
- 346493 bytes; SHA-256 `7bc88949ecabf785ba18f2d07f5a0538881f823831d7d64dc33e73ae7d7bb06b`.
- `pg_restore --list` confirmed a readable archive with 458 entries. No restore/reset/drop/truncate of the application database.

Development migration deployed successfully, **32 migrations up to date**. Counts before/after: users 29, orders 86, payments 86, coupons 19 — unchanged.

| Run / target | Eligible | Existing credits | New credits | VND | Invalid / reconciliation errors |
|---|---:|---:|---:|---:|---:|
| Fixture dry-run | 13 | 0 | 0 | 6500000 | 0 / 0 |
| Fixture apply, batch 4 | 13 | 0 | 13 | 6500000 | 0 / 0 |
| Fixture rerun | 13 | 13 | 0 | 6500000 | 0 / 0 |
| Development dry-run | 24 | 0 | 0 | 3110170 | 0 / 0 |
| Development apply | 24 | 0 | 24 | 3110170 | 0 / 0 |
| Development rerun | 24 | 24 | 0 | 3110170 | 0 / 0 |

Post-backfill audit: 13 CUSTOMER profiles; 24 credits; ledger and profile sums both 3110170; non-CUSTOMER profiles 0; unknown transaction dates 0; historical promotions 0 for this dataset; tier notification dispatches 0. The separate fixture reached GOLD/6500000 with next DIAMOND/10000000 and progress .65. Do not confuse fixture data with application data.

CLI in API root (prefix with `rtk` per local instructions):

```powershell
rtk proxy node -r ts-node/register -r tsconfig-paths/register src/scripts/backfill-membership.ts
rtk proxy node -r ts-node/register -r tsconfig-paths/register src/scripts/backfill-membership.ts --apply --confirmed-local-development=bookora_db
```

The explicit confirmation flag also requires NODE_ENV development and a local host. Disposable test/dev database name prefixes are supported. It refuses remote apply. Do not reuse the application apply command for production/shared targets. An interrupted run can restart from the beginning: committed Order credits are immutable/idempotent; reconciliation reports mismatches rather than rewriting financial history.

## 4. APIs, Coupon and Notifications

Customer: GET `/account/membership`, `/account/membership/coupons`, `/account/membership/transactions`. Identity comes from the session; no arbitrary Customer userId input. Lists have bounded pages/limits and stable tie-breaks. Coupons are PUBLIC, effective, sufficiently ranked and within global/user quota; cart-specific conditions remain explicit.

System Admin only: GET/PATCH `/admin/membership/config`; GET `/admin/membership/members`, `/members/:userId`, `/members/:userId/transactions`, `/members/:userId/history`. CSRF on mutations, backend SUPER_ADMIN guard, sort allowlist, bounded search/filter/pagination. No manual tier/spend mutations or bulk grants.

Existing Coupon save/response/checkout DTOs add nullable `minimumMembershipTier`. NULL retains legacy eligibility. Public suggestions hide higher tiers; PRIVATE lookup, preview and final reservation reject insufficient rank. Rule version includes minimum tier; preview hash also includes authenticated current tier and final transaction compares it again. The unlocking order cannot use the rank earned later at completion.

ORDER promotions enqueue one `MEMBERSHIP_UPGRADED:<historyId>` dispatch in the credit transaction, reference the Order for the existing after-commit wake, and render through the same worker/Bell/inbox. It uses existing PROMOTION category, crown icon and `/account/membership` target. The existing signal adds optional `type`, so Membership refetch happens on tier promotion or Order completion (including credits below the next threshold), reconnect/focus and account reset, rather than every mark-read. Coupon activation invalidates the membership coupon queries. Backfill/threshold changes never enqueue promotion notifications. Coupon broadcasts filter active CUSTOMER recipients by tier histories at the existing audience cutoff; PRIVATE campaigns remain private. No gateway, broker, transport, celebration dialog, confetti or acknowledgement API was added.

## 5. Web implementation

Customer `/account/membership`: existing Account shell/header/sidebar preserved; title/hero, two side-by-side preview sections on desktop and four dynamic tier cards follow the uploaded composition. Values are from generated API contracts. Previews request limit 3; two ScrollArea Dialogs use server pages of 10. Includes Bronze/empty/error/skeleton/retry, Diamond maximum state, nonnegative remaining spend, code copy and Order links. Lucide assets reused. Local Client green tokens are used; global theme is unchanged.

Admin `/super-admin/membership`: System-only menu under customer management, shared DataTable search/name-email, tier filter, header sort, page size, pagination and read-only history detail. Three thresholds edited together with Vietnamese validation, immediate recomputed errors, confirmation of old/new values and truthful pending state. Admin primary remains inherited navy. No checkbox/bulk toolbar because there is no permitted bulk operation in this phase.

Coupon Admin form gains minimum-tier Select/helper and table badge; Checkout keeps its two original ORDER/SHIPPING groups and adds a compact rank badge. Actual browser acceptance verified desktop/tablet/390/320 layouts, bounded Dialog scrolling, text truncation, keyboard and computed pointer/disabled styles. Client primary is `oklch(0.38 0.095 148)`; Admin CTA primary is `rgb(15, 23, 42)`, including portal Dialogs.

Customer threshold/config changes reconcile on a subsequent query/focus/navigation; there is deliberately no Customer rank polling or mass threshold-change socket fanout. Browser verified both threshold directions after reload. New completed Order promotions update the open Customer page through the existing realtime signal without reload.

Browser-discovered fixes: both history Dialog footers now show loading text instead of transient impossible `2/1` page counts; Admin LoginPage is lazy-loaded to break the existing `router → LoginPage → router` initialization cycle observed during HMR; header sidebar/scope triggers and shared DropdownMenuItem/DropdownMenuCheckboxItem/SelectItem use pointer for enabled controls, preserving disabled behavior. These are focused loading/import/CSS changes, not domain or theme changes. HMR and fresh Customer/Admin page loads subsequently produced no Console errors.

## 6. Contract and automated verification

Canonical pipeline actually run: API `npm run docs:openapi` → serve that exact export locally → Web `OPENAPI_URL=<local export> npm run gen:api:local` (sync + Orval + compatibility fixer + Zod verification). No generated files were hand-patched. Final contract: 167 paths, 231 operations, 290 schemas; 38 generated Zod files, 277 `zod.ulid()` occurrences, zero forbidden occurrences.

Semantic comparison against initial Web spec found **only three changed existing schemas** (`CouponResponseDto`, `SaveCouponDto`, `CheckoutCouponDto`), **no changed existing paths**, and eight new Membership paths/nine operations. Large JSON line churn is canonical Swagger component ordering, not unrelated API changes.

All commands below were actually run. These are the latest observed results, including the final successful full reruns.

| Repository | Command/check | Result |
|---|---|---|
| API | `npm test -- --runInBand` | PASS, exit 0, 116 suites / 954 tests |
| API | `npm run type-check` | PASS, exit 0 |
| API | `npm run build` | PASS, exit 0; Nest/SWC + tsc-alias |
| API | `npm run lint` | PASS, exit 0 |
| API | `npm run prisma:generate` / `prisma:validate` | PASS, exit 0 |
| API | `prisma migrate status` / datasource→schema diff `--exit-code` | PASS, up to date / no difference |
| API | `npm run docs:openapi` / `docs:contract` / `docs:lint` | PASS, exit 0; Redocly valid, 2 existing explicit ignores |
| API | `npm run test:e2e -- --runInBand test/membership-postgres.e2e-spec.ts` | PASS, exit 0, 18 tests (final fixed fixture) |
| API | `npm run test:e2e -- --runInBand test/membership-postgres.e2e-spec.ts test/coupon-http.e2e-spec.ts test/flash-sale-http.e2e-spec.ts test/notifications-http.e2e-spec.ts test/order-realtime.e2e-spec.ts` | Final rerun PASS, exit 0, 5 suites / 67 tests; 92.855s |
| Web | `npm run gen:api:local` / generated Zod verification | PASS, exit 0 |
| Web | `npm run build` | PASS, exit 0 after replacing multiline inline event statements with named handlers |
| Web | targeted tests `--maxWorkers=1` for Membership/Coupon/Notifications/router/authorization | PASS, exit 0, 18 files / 153 tests |
| Web | full `npm test -- --maxWorkers=1` | Initial run: exit 1, 211 files / 1106 tests; 208 files / 1097 tests passed, 8 stale Order query mock failures and 1 Flash Sale timeout |
| Web | isolated rerun of the two Order specs + FlashSaleFormDialog | PASS, exit 0, 3 files / 20 tests; two test mocks add `isError: ref(false)`, no Order/Flash Sale application changes |
| Web | final full `npm test -- --maxWorkers=2` | PASS, exit 0, 211 files / 1106 tests; 188.55s |
| Web | browser-fix regression `npm test -- src/router/index.test.ts src/pages/auth/LoginPage.test.ts src/pages/errors/AuthUnavailablePage.test.ts src/features/membership --maxWorkers=2` | PASS, exit 0, 3 matching files / 67 tests; 21.68s; no matching AuthUnavailablePage spec exists |
| Web | final browser-fix `npm run build` | PASS, exit 0, Vue typecheck + Vite production build, 6418 transformed modules; existing chunk-size advisory |
| Web | browser-fix full `npm test -- --maxWorkers=2` | NOT PASS, exit 1: 207 files /1087 tests passed, then Node native OOM +4 Vitest fork/spawn errors; no failed assertion. Fixture servers stopped; sequential rerun required |
| Web | final `rtk npm test -- --maxWorkers=1` after browser/shared cursor fixes | PASS, exit 0, **211 files / 1106 tests**, 345.76s; no unhandled runner errors. This successful complete run supersedes the resource-failed attempt |
| API | browser-audit follow-up `npm run type-check` | PASS, exit 0, including the new fixture/audit scripts |
| API | `node node_modules/eslint/bin/eslint.js test/membership-browser-audit.ts test/membership-browser-server.ts` | PASS, exit 0 after formatting the added profiling block |
| API | `node -r ts-node/register -r tsconfig-paths/register test/membership-browser-audit.ts profile` / `backfill` | PASS, exit 0; actual SELECT counts and final idempotent reconciliation in E logs |
| Both | `git diff --check` | PASS, exit 0 |

Failures corrected during work: old typed Coupon fixtures lacked the new nullable field; an Order unit mock lacked the domain hook; the first notification assertion drained too few existing dispatches; the concurrency fixture tried to place two orders through one cart concurrently; formatting multiline inline Vue event statements caused a template compile error. Membership credits remain tested concurrently after preparing the two Orders sequentially. Two unrelated existing Order specs had stale query mocks lacking `isError`; only the mock field was added. A Flash Sale date-picker timeout passed in isolation unchanged. An initial default multi-worker Web run exhausted host memory; it was not counted as PASS. Verification then used one worker; the final full rerun caps workers at two.

Known toolchain warnings: Vite existing chunk-size warning; PostgreSQL driver query deprecation; VM Modules experimental warning; the combined regression runner reported an open-handle advisory. None is a browser Console/network acceptance result. Web has no lint script.

## 7. Runtime and manual acceptance — completed

The earlier browser-tool blocker was resolved. Actual IAB sessions used Customer `http://localhost:15173` and Admin `http://127.0.0.1:15174`, both calling API18000 and disposable PostgreSQL DB **`bookora_it_auth_hardening_1795320689805_eeb055`**. Separate host cookies kept Customer and Admin authentication independent. Normal UI logins and actual API/socket/worker ran throughout; browser UI was operated through the documented Computer Use API. No browser fetch injection, mocked rendered tier, live payment or external email was used.

Initial fixture: 13 historical credits × 500000 = 6500000, backfill dry/apply/rerun confirmed; Gold crossing date 17/11/2026 from history. Fresh Customer B initially Bronze/0. Later fixture-only historical Orders prepared B at Silver/2500000 and member-00 at Bronze/1500000. Product, names, coupons and all monetary data in screenshots are explicitly synthetic fixture data.

Evidence root **E**: `C:/Users/Admin/.codex/visualizations/2026/11/22/01a20136-429f-7830-97ad-0fc6cff7ee74/membership-acceptance/`. It contains 40 browser JPGs plus `browser-checks.json` and four DB audit logs. `browser-checks.json` includes measured page widths, validation, computed styles, before/after tier/Bell states and final Console. Invalid initial viewport samples were excluded after discovering the browser override applied to the latest-created tab; actual per-tab viewport widths were then measured and screenshots recaptured correctly.

Session shorthand below: **C** = real Customer UI, **S** = System Admin UI, **B** = Branch Admin UI. Desktop = 1440×900 or the measured default 1280px; responsive set = 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 320×740. Every row's expected behavior is the prompt criterion; the observation and evidence below are the actual result.

| Case | Session / viewport; action → observed result | HTTP / DB / socket and evidence under E | Result |
|---|---|---|---|
| M01 | C desktop; guest deep-link/login B → Account shell, selected menu, Bronze/0, empty previews, green | Real authenticated API; `customer-bronze-desktop.jpg` | PASS |
| M02 | C desktop; A after backfill → Gold/6500000, achieved 17/11/2026 | 13-credit reconciliation; `customer-gold-desktop.jpg` | PASS |
| M03 | C desktop + responsive set; next Diamond10m, remaining3.5m, progress65 | API values and DOM progress; `customer-1440.jpg`, `customer-320.jpg` | PASS |
| M04 | C desktop; after live completion → Diamond10m, progress100, max-tier text, no next target | Order credit and real-time query refresh; `customer-diamond-desktop.jpg` | PASS |
| M05 | S desktop; raise Gold5m→9m, C reload → still Gold6.5m, remaining3.5m toward Diamond10m | Actual PATCH and retained profile; `customer-raised-threshold.jpg` | PASS |
| M06 | S320; lower Silver2m→1m, C member-00 reload → Bronze1.5m becomes Silver; Bell stays0 | Truthful pending toast, background completion; `customer-threshold-promotion.jpg`; restored2m retains Silver | PASS |
| M07 | S desktop/320; 0, negative, equal, swapped, 30 digits → Vietnamese errors and disabled save; corrected input clears error immediately | Actual form DOM/CTA/confirmation; `browser-checks.json`, `admin-threshold-320.jpg` | PASS |
| M08 | S desktop; search A email → one matching customer; long fullName truncates with title | Server-filtered URL/query, correct detail; `admin-detail-320.jpg` | PASS |
| M09 | S desktop; Gold filter, header ascending sort, reset, pageSize20 and page2 → 27 customers paged20+7, disabled boundaries | Actual URL/query/state; `admin-paging-desktop.jpg`, computed navy styles | PASS |
| M10 | S desktop/320; A detail → correct spend, historical Silver/Gold + new Diamond transitions, ledger pages10+4 | Bounded protected GETs; `admin-detail-320.jpg`; loading footer fixed and rechecked | PASS |
| M11 | B/Cashier/Staff desktop; direct System Membership route → access-denied, no table/config | Actual browser sessions plus REST403 tests; three `*-membership-forbidden.jpg` | PASS |
| M12 | S desktop; create `SILVER_BROWSER` default NULL→Silver, save, reopen/edit name → Silver persists and badge/helper correct | Actual POST/PATCH and row; Coupon form source/tests + C checkout evidence | PASS |
| M13 | C Silver B desktop; Checkout shows SILVER_BROWSER with Silver badge, no Gold/Diamond suggestions | Server list eligibility, DOM Gold count0; `checkout-silver-eligible.jpg`; legacy NULL compatibility covered in regression tests | PASS |
| M14 | C Diamond A desktop; Checkout includes Silver, Gold and Diamond; select Diamond → preview discount20000 | Real eligibility and preview; `checkout-diamond-eligible.jpg` | PASS |
| M15 | C Gold A desktop; enter PRIVATE_DIAMOND → Vietnamese minimum-Diamond rejection, no applied code/total mutation | Actual server rejection; `checkout-private-rejected.jpg` | PASS |
| M16 | C Gold desktop/320; choose GOLD1 ORDER + GOLD2 SHIPPING → one each; 3500000 +32000 −10000 −11000 =3511000 | Real address/shipping/preview; `checkout-mixed-selected.jpg`, `checkout-totals-desktop.jpg`, `checkout-dialog-320.jpg`; place revalidation covered by DB tests | PASS |
| M17 | C Gold desktop/320; preview3 of5 coupons, View All shows5, pager disabled, copy returns GOLD1 | Real clipboard and GET limit; `customer-coupons-dialog-desktop.jpg`, `customer-coupon-dialog-320.jpg` | PASS |
| M18 | C Gold desktop/320; preview3 of13 credits, Dialog page1 has10/page2 has3, disabled end, actual Order URLs | Server paging/DOM; `customer-history-page2.jpg`, `customer-history-dialog-320.jpg` | PASS |
| M19 | C desktop; Bronze empty states; controlled Membership GET503 → clear error; retry summary and each failed preview restores actual Silver data | Fixture middleware only, auth API stays real; `customer-api-error.jpg`, `customer-api-recovered.jpg`; loading states observed during GET transitions | PASS |
| M20 | B completes COD Order via UI while C A stays open → Gold6.5m→Diamond10m, +3.5m ledger, Bell gets tier-up + existing Order completion, no reload/no popup | Order `01M80Q7S2VHBAX204E71R29HE1`: COMPLETED/PAID3532000, exactly one credit3500000 and one tier notification; `realtime-diamond-bell.jpg` | PASS |
| M21 | C member-01 Bronze0/Bell0 closes all tabs; canonical fixture ORDER credit2.5m while offline; reopen → Silver2.5m/Bell1, inbox durable, click targets Membership | Real DB transaction/dispatch/worker; no live socket needed while closed; `db-offline-credit.log`, `offline-return-bell.jpg`, `offline-inbox.jpg` | PASS |
| M22 | Repeat backfill and both threshold directions → no duplicate credits, no historical/threshold Bell spam, ranks retained | Final eligible17/existing17/new0,16500000 VND,invalid0/reconciliation0; exactly two ORDER promotion notifications for A/member-01; `db-final-backfill.log` | PASS |
| M23 | C guest deep-link, B→A→B→member-00→member-01 logout/login → identity-specific tier/ledger/Bell; no previous Membership data after switch | Actual normal UI auth; expected expired-access401 refreshed once200 after runtime restart, no loop; JSON/role screenshots | PASS |
| M24 | C responsive set → hero stacks, previews stack, tiers adapt4/2/1, sidebar becomes mobile menu, long IDs truncate; no horizontal page overflow | Actual widths1440/1366/1024/768/390/320 and page≤viewport; six `customer-<width>.jpg`, mobile Dialog screenshots | PASS |
| M25 | S desktop/tablet390/320 → toolbar wraps, table scroll is scoped, thresholds/cards stack, detail/config fit viewport | Page≤viewport; `admin-<width>.jpg`, `admin-long-table-320.jpg`, `admin-threshold-320.jpg`, `admin-detail-320.jpg` | PASS |
| M26 | C/S keyboard Enter/Escape, copy, sort/select/filter/header; enabled cursor pointer, disabled not-allowed; green Client/navy Admin | Actual clipboard + computed styles including portal options after shared cursor fix; `browser-checks.json` | PASS |
| M27 | C A receives five eligible PUBLIC Gold campaigns + PUBLIC Silver at activation; other active lower-tier Customers receive none then; PRIVATE/Diamond do not leak. Existing Order event remains in Bell | DB recipient audit maps all six campaign notifications only to eligible A at cutoff; tier/time/active/PRIVATE/Flash Sale regression in 67 real E2E tests | PASS |
| M28 | C/S final fresh reload and HMR → Console empty; controlled failures recovered; stable requests; fixed-count SQL reads | Final JSON logs empty; idle server metrics0 Membership GETs +2 existing Notifications reconciliation GETs304; query profiles below | PASS |

Live completion DB timestamps: A profile update `2026-11-22T04:22:19.826Z`, materialized tier notification `04:22:20.022Z`. Browser observed Diamond and Bell without F5. These are recorded timestamps, not a p95/SLA claim. Final fixture totals: 27 profiles, 17 distinct credits, 16500000 VND; A: 10m Diamond, B: 2.5m Silver, `member-00`: 1.5m permanently Silver after threshold test, `member-01`: 2.5m Silver. Config restored to 2m/5m/10m. Dispatch states: 28 DONE / 1 SKIPPED, none pending/failed.

Runtime commands in API root: `rtk proxy node -r ts-node/register -r tsconfig-paths/register test/membership.browser-runtime.ts` creates a new separate fixture. `test/membership-browser-server.ts` resumes **only the explicitly named existing local fixture DB** and accepts stdin `fail/recover/metrics/clear` for controlled GET503 and sanitized bounded request observations. `test/membership-browser-audit.ts` accepts `cart/profile/backfill/offline-credit`; it rejects non-local hosts and never accepts the application database. `prepare` is fixture-only and now idempotent; its first attempt created two historical test Orders but hit an existing Cart unique constraint, fixed by upsert without touching application data. No test server endpoints or hardcoded fixture values enter production modules.

## 8. Performance and practical limits

Actual instrumented Prisma SELECT counts (`db-query-profile.log`) stayed constant as limits grew3→10→20: transactions3 SELECTs for3/10/14 rows, Membership coupons4 for3/7/7 rows, members3 for3/10/20 rows. Warm measured service calls: transactions11–12ms, coupons13–14ms, members8–11ms; first calls224/91/34ms. These include the safe test DB on this machine and are not production benchmarks. The new read paths batch related rows; no per-result query growth was observed.

Observed browser HTTP samples include summary213ms, transactions204ms, coupons202ms; Admin config116ms/members130ms. Other samples under compilation/concurrent work were slower (Membership summary452–567ms, preview list731–792ms; existing notifications reached3001ms once). Do not infer p95 or an SLA from these samples. Expected503 fault injection, PRIVATE rejection, expired-session401 and forbidden-role tests were deliberate, not unexplained errors. Final Customer/Admin Console arrays were empty. An earlier Cart-only `BranchSelector` extraneous-class warning is pre-existing and recorded; no Cart behavior was changed.

One development history SQL sample (`EXPLAIN ANALYZE`,8 rows) measured planning0.971ms/execution1.297ms. Backfill/config use bounded batches; GETs do not run reevaluation. Idle browser observation returned no Membership GETs and only the existing Notifications list/count reconciliation. Existing checkout per-coupon quota counting is unchanged. Large production-volume lock profiling is outside this fixture acceptance; concurrency/backfill/resume correctness is covered by real PostgreSQL tests. No remaining mandatory browser blocker.

## 9. Changed files and final scope

API additions: `prisma/schema/32-membership.models.prisma`; `prisma/migrations/20261122090000_membership_ranking/migration.sql`; Membership rules, credit, backfill, query service, thresholds service, controllers, DTOs, module and rules spec under `src/modules/membership/`; `src/scripts/backfill-membership.ts`; `test/membership-postgres.e2e-spec.ts`; `test/membership.browser-runtime.ts`. Browser follow-up adds `test/membership-browser-server.ts` for safe fixture resume/fault/HTTP observations and `test/membership-browser-audit.ts` for bounded fixture preparation, reconciliation and SELECT profiling.

API integration edits: schema files `20-auth-users-branches`, `26-coupons`, `27-orders-payments`; `src/app.module.ts`; `orders/order-status-history.ts`; `admin-orders/admin-orders.service.ts` plus its spec; `checkout/checkout.service.ts` plus its spec; `coupons/coupon-pricing.ts`, `coupons.dto.ts`, `coupons.service.ts`; `notifications/notification-worker.service.ts`; canonical `docs/openapi.json`.

Web additions under `src/features/membership/`: `membership-ui.ts`, `membership.css`, `membership-threshold-form.ts` and its spec, `use-membership.ts`, `use-admin-membership.ts`, Customer/Admin Membership pages; `member-columns.ts`, MemberDetailDialog, MembershipThresholdDialog, MembershipListDialog, MembershipCouponCard, MembershipTransactionRow and MembershipTierBadge components.

Web integration edits: Customer sidebar; router `client.routes.ts`/`index.ts`; `authorization/admin-menu.ts`; Coupon form, Checkout Dialog and table columns plus three existing typed fixture specs; notification presentation, API target and realtime bridge. Existing `AccountOrderDetailCancel.test.ts` and `AccountOrderReceiptConfirmation.test.ts` each gain the missing query mock field; their application page is unchanged. Canonical `openapi/bookora.openapi.json`, three existing Coupon model DTOs, model barrel, Coupon Zod, and generated Membership endpoint/model/Zod files were regenerated. Browser follow-up: `MemberDetailDialog.vue`/`MembershipListDialog.vue` loading footer, `router/index.ts` lazy LoginPage, `layouts/DashboardLayout.vue` pointer classes, and pointer/disabled classes only in `DropdownMenuItem.vue`, `DropdownMenuCheckboxItem.vue`, `SelectItem.vue` shared primitives.

Only this new handoff Markdown is added. No Git add/commit/push/pull/rebase/reset/clean/restore, destructive application DB operation, dependency addition or global theme rewrite. Pre-existing AGENTS/CLAUDE edits remain the user's. Temporary API18000/Web15173/Web15174 fixture processes were stopped after acceptance; fixture DB and evidence are retained. The application dev servers/database were not used for synthetic browser writes. **All mandatory gates PASS; no remaining blocker. DONE (VERIFIED).**

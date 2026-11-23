# Bookora — Membership Celebration / Promotion Realtime / Admin Status Sync Hotfix

## 1. STATUS

**BOOKORA — MEMBERSHIP CELEBRATION & PROMOTION REALTIME LATENCY / ADMIN STATUS SYNC HOTFIX — DONE (VERIFIED).**

All three deliverables are implemented and verified: durable deadline-based promotion dispatch, canonical Admin time-boundary auto-refetch on both lists, and live-only Customer Membership Celebration. Relevant automated/real PostgreSQL/API/Socket.IO checks passed. Agent-operated rendered-browser acceptance is complete across the P01–P18, C01–C09 and R01–R04 matrix below, using initial isolated IAB Chromium contexts and final native Chrome Customer + Edge Admin extension sessions. No mandatory acceptance blocker remains.

Healthy small-audience foreground due→REST-backed Bell p95: Coupon **357.24 ms**, Flash **594.04 ms**, ten samples/type. Admin hidden ACTIVE-filter boundary→DOM: **569.79/571.62 ms** at start. These targets do not apply to intentionally suspended/offline tabs or a large fan-out. The actual frozen-tab recovery was approximately **3.8 s after resume**, and the instrumented 203-recipient tail approximately **3.8 s**; neither is presented as a ≤1 s result.

Evidence was collected on 22–23 November 2026, Asia/Ho_Chi_Minh. Final Chrome/Edge acceptance ran on 23 November approximately **10:24–10:48 local**, after the user enabled full CDP. Earlier native URL-confidence/minimized-window stops and unsuccessful reduced-motion attempts are historical setup failures; they were not counted as PASS. Actual final media inspection returned reduce=true with dialog animation/transition 0 s. Temporary emulation/network/lifecycle overrides were reset and owned fixture tabs/servers closed.

Evidence directory **E**: [bookora-promotion-sync](C:/Users/Admin/.codex/visualizations/2026/11/22/01a20425-5878-7e43-8b06-6781436989ac/bookora-promotion-sync). Original JSON samples, clock correlations, screenshots, final browser action records and DB snapshots are retained. All fixture accounts, addresses, Orders and campaigns are synthetic. No credentials/cookies/JWT are included in this handoff. Exactly this one new handoff was created; no commit/push was performed.

## 2. BASELINE / PREFLIGHT

| Item | Verified baseline |
|---|---|
| API working tree | `D:/CTU/CT466E/bookora-api/bookora-api`, HEAD `ac409fc0fd45fff5c96a487c48de01c87d2ebd9f` |
| Web working tree | `D:/CTU/CT466E/bookora-web/bookora-web`, HEAD `743f38fcc9fb699af702904b07430c5f68acf418` |
| Preexisting edits | Both repos already modified `AGENTS.md` and `CLAUDE.md`, one line each. These were preserved; they are not hotfix changes. Initially no other task changes/untracked files. |
| Instructions | Repo AGENTS/CLAUDE/README and `C:/Users/Admin/.codex/RTK.md`; all shell commands routed through `rtk`. GitNexus debugging/impact/CLI skills used. Computer Use skill used for manual UI. |
| Existing design documents | Web Membership Ranking, Realtime Notifications Core, Order Latency/Sync Hotfix, Coupon Upgrade/UI/VNPAY, Flash Sale Upgrade/Admin/Client, Checkout/Orders/Auth handoffs were inspected as historical context; current source/runtime was authority. API root has older phase handoffs, not separate current membership/promotion handoffs. |
| Stack / contract | Existing NestJS 11, Prisma 7/PostgreSQL, Socket.IO; Vue 3, TanStack Vue Query, shadcn-vue/Reka, existing Lucide icons, Orval/Zod generation. No dependency or lockfile change. |
| Time | DB UTC timestamps; API server time for derived status; Vietnamese UI uses Asia/Ho_Chi_Minh. Browser timer uses server delta and `performance.now()`, not local wall clock. |
| Application DB | Local `bookora_db` was inspected, not reset/dropped/truncated/seeded for this task. Runtime writes were confined to uniquely named `bookora_it_auth_hardening_*` disposable test DBs. |
| Real test runtime | PostgreSQL localhost:5432; API/worker/socket port 18000. Initial Customer localhost:15173 / Admin 127.0.0.1:15174; final Chrome Customer + Edge Admin independently authenticated on 127.0.0.1:15174. Test-only Turnstile bypass follows the existing helper; production settings/guards unchanged. |
| Retained browser DBs | Initial before: `bookora_it_auth_hardening_1795382860913_4e538e`; after: `bookora_it_auth_hardening_1795383095549_da4aea`; repeat baseline: `bookora_it_auth_hardening_1795385133804_888dce`; edge/duplicate: `bookora_it_auth_hardening_1795385588511_f4d877`. Final native browser fixture: `bookora_it_auth_hardening_1795404292038_e8a69d`, phase `final-browser`. Runtime shutdown retained these databases. Automated suites use their existing disposable DB lifecycle. |

Baseline reproduction uses `test/prepare-promotion-baseline.cjs`: a new OS temp mirror, node_modules junction, and read-only `git show` of seven original API files. It never checks out/restores/resets the working tree and never copies `.env`. The test Vite config reads the two original Admin composables with `git show` for the before phase. These are reconstructed baseline runs, not a claim that current edited files were old code.

## 3. ROOT CAUSE

| ID | Actual source | Finding / before evidence | Root cause and chosen change |
|---|---|---|---|
| LAT-01 | `notification-intents.ts::schedulePromotion` | KEEP durable eventKey, no-retro policy, transaction-bound intents; GAP post-commit scheduler hint | Transactional PostgreSQL NOTIFY wakes the existing worker after the outermost commit. |
| LAT-02 | `notification-worker.service.ts` | GAP: default 5000 ms interval and one generic locked batch/tick. Initial before Coupon due→emit median 5455 ms, Flash 10478 ms; paired campaigns amplify queue wait. | One nearest-pending-promotion deadline plus the unchanged 5000 ms fallback; shared bounded drain continues batches promptly. |
| LAT-03 | Publisher/Gateway + notification bridge/Bell | FOUND/KEEP. Initial socket median about 14.4 ms Coupon / 5.8 ms Flash; REST-cache median 54.4 / 85 ms. | Socket/render were not the multi-second bottleneck. Existing event, socket manager, rooms, REST reconciliation and ACL retained. |
| UI-01 | `CouponsService::list/response` | FOUND time-derived canonical status; GAP future-boundary metadata | Return consistent `serverNow` plus nearest future start/end over static scope, outside status/page. |
| UI-02 | `useAdminCoupons` | GAP clock-driven refetch; before table stayed “Chưa bắt đầu” across start/end until Tải lại | Shared one-shot boundary hook; normal query refetch + mount/focus/reconnect reconcile. |
| UI-03 | `FlashSalesService::list` | FOUND persisted lifecycle + derived time status; GAP metadata | Same list metadata; no persisted enum rewrite. |
| UI-04 | `useAdminFlashSales` | Same stale-cache observation; screenshots show Scheduled after actual start/end | Same shared hook and existing query key. |
| CE-01 | `notification-realtime.ts`, ClientLayout, membership UI metadata | FOUND new membership event id/type and backend tier endpoint; GAP celebration host | Gate only live typed membership hints; fetch authoritative current tier; one shell host. |
| SEC-01 | Notification audience / Realtime ACL / auth stores | FOUND/KEEP active customer, tier cutoff, branch/session/role rules | No gateway/auth/Origin/room/financial policy change; auth changes clear pending UI. |

Before screenshots: `before-coupon-stale.jpg`, `before-flash-stale.jpg`, `before-flash-stale-later.jpg`, `before-coupon-after-manual-refresh.jpg`, `before-customer-bell.jpg`. They demonstrate a separate Admin cache problem; notification delivery did not update those list queries.

### Clock and cohort integrity

The passive test probe observes actual Socket.IO events, successful TanStack Query cache updates, and DOM/Bell changes. `bell-visible` is recorded in requestAnimationFrame only when the unread count increased and the REST cache contains the delivered notification ID. It does not synthesize a counter or event. Browser epoch uses `performance.timeOrigin + performance.now()`, correlated through seven API clock round trips; the shortest RTT provides offset and half-RTT uncertainty. Server claim/commit/emit traces use one monotonic epoch. DB clock was bracketed with a real SQL call; small wall/monotonic drift was observed (a later edge run was about 4 ms outside its bracket), so values should not be read as sub-millisecond precision. Primary after browser uncertainty is ±6.60 ms; initial before ±5.35 ms. A conservative extra 15 ms does not affect the after target result.

The first before cohort (`before-browser-initial*`) has five calibrated samples/type and actual due→emit/socket/cache/Bell evidence, but no claim/commit instrumentation. A later exact-HEAD baseline repeat (`before-browser*`) adds five claim/commit samples/type. Its Customer clock calibration failed during startup: JSON uncertainty is null. The analyzer deliberately excludes that repeat's cross-process browser latencies (`n=0`) instead of presenting them as calibrated measurements. Its server segments and same-browser socket→REST duration remain usable. No single fabricated T0–T6 trace was assembled from different cohorts.

## 4. DECISION / BOUND / CHANGED FILES

GitNexus upstream impact was run before modifying existing symbols. `schedulePromotion` was HIGH (six references including Coupon save/setActive and Flash control, one process); the risk was reported before editing. Worker class MEDIUM/six references, worker methods LOW; Coupon list/response LOW, Flash list LOW; DTO Coupon MEDIUM/seven refs and Flash LOW/four. Web composables and notification bridge LOW/one direct ref. Shared DialogContent was MEDIUM (barrel plus 81 transitive references), so its addition is optional and defaults are preserved. Newly added test/helper symbols are absent from the index: UNKNOWN, manually bounded to their test entry points; UNKNOWN was not treated as safe zero.

API files (relative to API root):

| Files | Why |
|---|---|
| `src/modules/notifications/notification-worker.service.ts` | One deadline coordinator; coalescing, startup/shutdown, shared fair drain, bounded contention retry. |
| `src/modules/notifications/notification-intents.ts` | Transactional post-commit hint after the durable promotion upsert. |
| `src/modules/notifications/promotion-wake-signal.ts` (new) | Shared constant channel name. |
| `src/modules/notifications/promotion-wake.service.ts` (new) | Existing pg dependency LISTEN connection, reconnect/backoff, recovery hint. |
| `src/modules/notifications/notifications.module.ts` | Registers the listener provider. |
| `src/modules/coupons/coupons.service.ts`, `coupons.dto.ts` | Consistent list time and next transition metadata. |
| `src/modules/flash-sales/flash-sales.service.ts`, `flash-sales.dto.ts` | Canonical list time/transition metadata. |
| `docs/openapi.json` | Exported contract, two response schemas. |
| `test/promotion-sync.e2e-spec.ts` (new) | Seven real PG/socket deadline/metadata/rollback/restart/batch/fairness regressions. |
| `test/helpers/promotion-timing-probe.ts` (new) | Fixture-only claim/commit instrumentation. |
| `test/promotion-sync.browser-runtime.ts` (new) | Safe fixture runtime, scheduled pairs, metrics, worker control and duplicate-hint replay. |
| `test/prepare-promotion-baseline.cjs`, `test/analyze-promotion-latency.cjs` (new) | Read-only baseline mirror and calibration-aware raw-sample analysis. |
| `test/promotion-runtime-control.ts`, `test/helpers/promotion-browser-matrix.ts` (new) | Guarded local fixture setup for real checkout deferral and negative campaign/browser cases. |

Web files (relative to Web root):

| Files | Why |
|---|---|
| `src/composables/use-time-boundary-refetch.ts` (new) | Reusable one-shot timer with monotonic elapsed time, cleanup, error-loop protection and visibility reconcile. |
| `src/features/coupons/use-admin-coupons.ts` | Connect metadata to existing `['admin-coupons', params]` query. |
| `src/features/flash-sales/api/flash-sale-api.ts` | Same for `['admin-flash-sales', params]`. |
| `src/features/membership/membership-celebration.ts` (new) | In-memory live-event dedupe, authoritative tier fetch, cancellation/session reset. |
| `src/features/membership/components/MembershipCelebrationHost.vue` (new) | Shared dialog composition, CTA, route/modal deferral, responsive styling. |
| `src/features/notifications/notification-realtime.ts` | New typed live-event gate and account cleanup; existing invalidations preserved. |
| `src/layouts/ClientLayout.vue` | Mounts one celebration host. |
| `src/components/ui/dialog/DialogContent.vue` | Optional overlayClass prop; allows celebration overlay/content above Bell without changing shared defaults. |
| `openapi/bookora.openapi.json`, two generated `*ListResponseDto.ts` models | Canonical pipeline output only. |
| `src/composables/use-time-boundary-refetch.test.ts`, membership state/host tests, `notification-realtime.test.ts` (new) | Timer drift/error/cleanup and live-only/session/deferral/component tests. |
| `test/promotion-vite.config.ts`, `test/promotion-browser-probe.ts` (new) | Explicit test-only Vite entry and passive browser evidence. Production config/main do not import them. |
| This handoff | The sole new handoff document for this task. |

## 5. API BEHAVIOR / SAFETY

The DB remains authority: existing eventKey uniqueness, recipient uniqueness, `FOR UPDATE SKIP LOCKED`, audience cutoff/cursor, `createMany(skipDuplicates)`, reference locking/revalidation, retry/backoff, persistence-before-publish and no-retro policy are retained. Marketing goes only to active eligible Customers. PRIVATE/disabled/expired/exhausted Coupons and noneligible Flash Sales do not broadcast. No expiration notification was added.

`pg_notify` is executed inside the same transaction as the durable intent. PostgreSQL delivers it only after the outermost commit; rollback produces no wake. The listener sends a best-effort hint to the worker and never emits to Customers. One existing-pg session connection per API instance is added. Disconnection uses 1–30 s reconnect backoff; existing 5000 ms polling remains the recovery path. No Redis/BullMQ/Kafka/new gateway/dependency was introduced.

Worker startup queries the nearest pending promotion deadline. Edits/earlier/later dueAt changes cause a coalesced lookup/rearm. One timeout for all campaigns is capped at the platform maximum, adjusted for monotonic query time and a 5 ms epsilon. Due execution rechecks DB time and eligibility. Shutdown clears interval/deadline/immediate handles and waits for current work/lookup. A missed/failed wake cannot lose durable work.

Generic due work and targeted Order work share the existing running guard, alternate within a drain, and yield after eight batches. A 100-recipient continuation does not wait another poll. No-claim/lock contention applies a 250 ms retry bound; failures retain existing exponential backoff. Two-worker integration verified 203 recipients with dedupe and completion under 3 s; concurrent Order + promotion also under 3 s. This is the original integration upper bound, not a production-scale p95 guarantee. The additional actual Chrome 203-recipient first/tail distribution and concurrent Order are recorded in section 10.

## 6. WEB ADMIN

Both list responses now return `serverNow` and nullable `nextTransitionAt`. Two MIN aggregates use static search/type/visibility/discount scope (Coupon) or search/PUBLISHED scope (Flash), deliberately omitting page and display-status filter. Thus an empty ACTIVE query can still schedule a hidden row's entry. Each response uses one canonical list timestamp; persisted business state is unchanged.

The mounted query owns one timeout, including request elapsed time plus 100 ms epsilon, clamped to 250 ms/platform maximum. Fetching/placeholder/filter/page/unmount changes clear obsolete timers. A failed boundary request cannot immediately rearm the identical metadata snapshot forever; focus/reconnect/visibility and normal Query retries can recover. Mount/windowFocus/reconnect use existing TanStack refetch rules set to always. There is no Admin setInterval or status mutation in the browser. Search/sort/page size/filters continue using existing shared DataTable and query keys.

Foreground hidden-filter measurements are in section 10. Both empty ACTIVE lists entered and left automatically, with canonical total/count/page and state-specific actions. Worker-stopped manual testing also showed ACTIVE rows while notifications remained pending: table status is independent of dispatch success.

Visual checks: Admin primary computed RGB(15,23,42), Client CTA computed oklch(0.38 0.095 148). Coupon and Flash tables were checked at 1024×768, 768×1024, 390×844 and 320×740; document width did not exceed viewport, with horizontal scrolling contained in the table. Initial performance contexts were Customer 718×626, Coupon Admin 1440×900 and Flash Admin 1280×720; later celebration/acceptance views used actual 1440×900/1366×768 and the requested mobile sizes. Dimensions are not retroactively relabelled.

## 7. WEB CUSTOMER

Only a live version-1, authenticated CUSTOMER, branchId-null `notification.changed` carrying a nonempty new ID and type `MEMBERSHIP_UPGRADED` may trigger celebration. Initial REST history/unread hydration, focus/reconcile, mark-read events, unrelated Order/Coupon/Flash hints do not trigger it. The existing backend current-membership endpoint supplies the tier; an unverified/failed fetch leaves Bell durable and opens no popup.

The store remembers up to 256 seen IDs in memory, cancels stale fetches with AbortController/generation checks, keeps dedupe across same-account reconnect reset, and clears pending/seen state when the account changes. Latest genuine event wins; no unbounded queue. There is no localStorage/DB celebration field, ack endpoint, offline popup queue or second socket.

One host in the active ClientLayout or CustomerAccountLayout (Account mount added in the follow-up audit below) uses existing shadcn Dialog/Button and shared tier labels/icons/accents. Green “Khám phá quyền lợi” goes to `/account/membership`; “Để sau”, X and Escape close. Focus/scroll restoration was observed. It defers on `/checkout*` and while another open dialog/alertdialog is present. The actual Checkout case was tested with Customer B completing a real COD lifecycle through Branch Admin UI: Bell updated while Checkout stayed uninterrupted; SPA navigation Home showed exactly one final Gold dialog.

Silver desktop/390/320, Gold after Bronze→Gold jump, and Diamond were observed from real Order events. A reload with old unread Silver produced no popup. Offline Gold completion persisted a Bell notification; reopening showed Gold membership and unread history without popup. Same-account duplicate replay of the exact persisted live membership ID twice after X-close produced zero dialogs and unchanged Bell count. Account A→B login did not retain A's dialog/data. Bronze label/CTA rendering passed the component test; its accent uses the existing mapping. Final Chrome/Edge acceptance additionally verified two simultaneous Customer tabs, account A→B isolation, real backfill and an actual Admin threshold edit without celebration. Chrome reduced-motion=true was measured during a genuine Silver upgrade: one dialog/tab, animation none, duration/transition 0 s. No impossible genuine tier-up *to Bronze* is claimed.

## 8. CONTRACT / MIGRATION

API `docs:openapi` exported the two response metadata fields, then `docs:contract` and `docs:lint` passed (231 operations / 290 schemas). Web canonical `syncOpenApi` was invoked with its existing normalizer/validator and a file-backed fetch implementation reading the exported API JSON; this avoids booting the application DB just to retrieve documentation. `gen:api` and `verify:generated-zod` then passed. Only the two generated response models changed; no Zod diff. Generated files were not edited by hand.

No Prisma schema/migration/index change. Prisma validate passed. Existing `(state,due_at)` dispatch and Coupon/Flash composite time indexes were reused. EXPLAIN evidence in E includes a Coupon future-start MIN using `coupons_is_active_start_at_end_at_idx`: Index Only Scan, 2 shared-hit blocks, planning 0.238 ms, execution 0.193 ms in the small after fixture. This is not a large-dataset benchmark, and not every aggregate/filter combination was EXPLAINed.

## 9. AUTOMATED / STATIC VERIFICATION

Commands below ran in their respective repo with `rtk` prefix. Explicit Node heap variants invoke the same project tools. Exit 0 means actually observed success, not an inferred result.

| Command / scope | Observed result |
|---|---|
| API `node --max-old-space-size=1024 node_modules/typescript/bin/tsc --noEmit` | Final PASS, exit 0, including the executed new runtime/edge helpers and HTTP stop/start branches. |
| API `node --max-old-space-size=2048 node_modules/eslint/bin/eslint.js "{src,apps,libs,test}/**/*.ts"` | PASS, exit 0 after fixture additions; after the final type-only HTTP helper correction, targeted lint of `test/promotion-sync.browser-runtime.ts` also passed, exit 0. |
| API `npm run build` | PASS, exit 0; Nest/SWC compiled 550 files and tsc-alias completed. |
| API `npm run prisma:validate` | PASS, exit 0, multi-file schema valid. No migrate mutation run. |
| API `npm run docs:openapi`, `npm run docs:contract`, `npm run docs:lint` | PASS, exit 0 each; 231 operations, 290 schemas; existing two explicit ignored docs lint rules. |
| API unit `npm test -- --runInBand coupon-pricing flash-sale-pricing membership` | PASS, exit 0; 3 suites / 43 tests. |
| API PG/socket E2E: promotion-sync, notifications-http, order-realtime, membership-postgres, coupon-http, flash-sale-http, runInBand | Final PASS, exit 0; **6 suites / 74 tests**, 139.269 s. Initial combined clean run had 73 tests before the seventh promotion fairness case was added; promotion alone also passed 7/7. |
| Web canonical sync → `npm run gen:api` → `npm run verify:generated-zod` | PASS, exit 0; 38 Zod files, 277 ULID occurrences checked, forbidden 0. |
| Web focused celebration/bridge/timer tests | PASS, exit 0; initially 4 files / 16 tests. Final timer failure-loop test added and passed. |
| Web related regression run (membership, notifications, coupons, flash-sales, orders, routing, boundary helper) | PASS, exit 0; 32 files / 227 tests. Extended checkout/shared table rerun recorded below. |
| Web extended regression, same scope plus Checkout and shared Admin DataTable, `--maxWorkers=1` | Final PASS, exit 0; **43 files / 339 tests**, 172.46 s. |
| Web `npm run build` | PASS, exit 0; vue-tsc -b and Vite, 6423 modules. Existing large-chunk/plugin timing warnings only. |
| Web fixture-only probe/config typecheck | PASS, exit 0: `node --max-old-space-size=1024 node_modules/vue-tsc/bin/vue-tsc.js -p E/fixture-typecheck.json`; uses the real notification module augmentation. |
| Web lint | NOT APPLICABLE: package.json has no lint script. |
| Both `git diff --check`, final status/stat | PASS, exit 0; preexisting instruction edits remain present. Untracked text also checked separately for trailing whitespace. |

Exact final API E2E invocation: `rtk proxy node --max-old-space-size=1024 --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand promotion-sync.e2e-spec.ts notifications-http.e2e-spec.ts order-realtime.e2e-spec.ts membership-postgres.e2e-spec.ts coupon-http.e2e-spec.ts flash-sale-http.e2e-spec.ts`.

Exact final extended Web invocation: `rtk proxy npm test -- src/features/membership src/features/notifications src/features/coupons src/features/flash-sales src/features/orders src/features/checkout src/components/admin/table src/router src/composables/use-time-boundary-refetch.test.ts --maxWorkers=1`.

Initial failures and corrections, retained honestly: machine-wide OOM interrupted API typecheck/dev servers; a later 1024 MB full-lint heap cap also failed, followed by clean 2048 MB reruns. First new E2E fixture spread response-only fields into save input; selecting valid input fields fixed it. Timer tests initially lacked happy-dom annotation; corrected, then passed. Initial lint formatting/require-await errors were fixed. First canonical sync import lacked `process.argv[1]`; the existing script's invocation setup was supplied and sync/generation rerun. First manual edge fixture correctly failed Flash publication due to missing test stock; stock setup was added, a new synthetic Order provided fresh unique quota relations, and the complete second manifest passed. Partial first-attempt fixtures were retained and excluded by exact campaign IDs. Final fixture typecheck caught two unsupported `getHttpServer<Server>()` generic arguments; the typed Server assertion fixed them and a clean full API typecheck/targeted lint passed. A standalone Web probe check initially omitted Vite type resolution and the existing notification event augmentation; its external verification config was corrected, with no production/probe edit, and passed. These were test/tool setup failures, not silently counted as PASS.

## 10. RUNTIME / LATENCY

Primary calibrated **due→REST-backed visible Bell** measurements, ms; nearest-rank p95, per campaign/type, two eligible Customers in the small-audience fixture:

| Cohort / type | n | min | median | p95 | max |
|---|---:|---:|---:|---:|---:|
| Initial before / Coupon | 5 | 1922.95 | 5976.35 | 9480.75 | 9480.75 |
| Initial before / Flash | 5 | 7050.65 | 10599.45 | 14470.25 | 14470.25 |
| After / Coupon | 10 | 212.64 | 263.79 | **357.24** | 357.24 |
| After / Flash | 10 | 345.64 | 418.64 | **594.04** | 594.04 |

After foreground target ≤1000 ms: **PASS for this measured small local audience**. First ten paired campaigns were declared the performance cohort before later hidden-filter, browser replacement and intentional worker-outage scenarios. It includes a 65-second future campaign per type; additional UI-created PUBLIC SHIPPING/minimum-Silver Coupon and PUBLISHED Flash started about 1–2 minutes ahead and were observed live. The ten-pair performance cohort itself used ORDER Coupons; the SHIPPING/tier scenarios are additional acceptance evidence, not relabelled samples.

Server/browser segment p95, ms (full sample arrays and all min/median/max are in `latency-summary.json`):

| Segment | Repeat before Coupon (n5) | Repeat before Flash (n5) | After Coupon (n10) | After Flash (n10) |
|---|---:|---:|---:|---:|
| due→claim | 7726.39 | 12722.58 | 115.32 | 191.07 |
| claim→commit | 106.19 | 89.75 | 94.81 | 291.33 |
| commit→emit | 0.49 | 0.05 | 0.41 | 0.29 |
| due→emit | 7780.37 | 12786.15 | 166.04 | 466.20 |
| emit→socket | excluded: no calibrated Customer clock | excluded | 48.33 | 46.75 |
| socket→REST cache | 431.20 | 98.40 | 205.00 | 154.20 |

T0 committedAt, T1 startAt/endAt, T2 claimedAt, T3 committedAt, T4 event at, T5 socket/cache, T6 Bell-visible are linked by campaign/reference/notification IDs in the raw files. Initial before T2/T3 are NOT RUN, supplemented by the repeat server traces. Persistence precedes publish. No early/duplicate persisted notification was observed in the tested cohorts.

Admin hidden ACTIVE-filter case, no manual reload:

| List | Initially empty + future metadata | start→REST | start→DOM | end→REST | end→DOM |
|---|---|---:|---:|---:|---:|
| Coupon | yes | 474.59 ms | 569.79 ms | 215.19 ms | 235.59 ms |
| Flash | yes | 501.52 ms | 571.62 ms | 160.02 ms | 177.32 ms |

Idle interval: epoch `[1795383416594, 1795383536594]`, full 120 s. Extra successful Admin responses: **0 Coupon / 0 Flash**. No per-second Admin polling was observed. Timer lifecycle/single-timer/error bounds are automated; an exact runtime callback census and idle Notification SQL query census were not captured.

Worker-stop case: while worker was intentionally stopped, both Admin rows became ACTIVE, Bell stayed at 29 and two jobs stayed PENDING. Restart during effectiveness recovered both campaigns, Bell became 31, two recipients/campaign, at most once; jobs reached DONE. This outage cohort is intentionally excluded from healthy latency stats. A separate hidden-case Customer-tab replacement missed one Coupon socket hint; durable REST remained correct. Its Flash Bell was about 862 ms. This is retained in raw evidence, not concealed as a healthy sample.

Latest edge manifest (`manual-edge-matrix-results.json`): PRIVATE/disabled/expired/exhausted/disable-one-second-before-due Coupons each 0 recipients; minimum-Silver SHIPPING exactly 1 (Silver A, Bronze B excluded); earlier/later rescheduled Coupon exactly 2 each at new deadlines; draft/cancelled/inactive-variant/quota-full Flash each 0; valid simultaneous Flash exactly 2. Admin screenshots show correct canonical statuses, including PRIVATE Active and exhausted “Hết lượt”. UI stop then showed “Dừng sớm”. Quota rows were explicitly pre-seeded synthetic authority fixtures, not proof of Checkout consumption.

Evidence groups: `before-browser-initial*.json` (initial calibrated baseline), `before-browser*.json` (repeat server segments, Customer calibration invalid), `after*.json` (performance/hidden/worker/membership/UI runs), `after2*.json` (duplicate and edge run), `manual-edge-matrix*.json`, `latency-summary.json`, `*-boundary-plan.json`, two `*-detect-changes.txt` files. Recompute from original working evidence with `rtk proxy node test/analyze-promotion-latency.cjs`; optionally set `LATENCY_EVIDENCE_DIR` to E.

### Final Chrome + Edge runtime evidence

The user-enabled full CDP was used only for developer media, network and lifecycle testing of the isolated fixture tabs. Real notifications still came from committed application services/worker/publisher/socket; no browser event, Bell count or application state was fabricated. The original user tab at localhost:5173 was left unchanged.

* **C06/C09:** a genuine paid/completed 2.5m COD Order upgraded A Bronze→Silver. Both Chrome tabs received one dialog each. Actual media reduce=true, computed animation=none, animationDuration=0s, transitionDuration=0s. Duplicate publication of the same persisted notification ID twice while open kept exactly one dialog/tab; after closing, two more duplicate publications produced zero dialogs. At 390×844 and 320×740 document width equalled viewport and CTA remained in bounds. After logging out A and logging in B, the actual membership page showed B/Bronze/0 VND, no A identity/data and no popup. Screens: `final-reduced-motion-desktop.jpg`, `final-reduced-motion-390.jpg`, `final-reduced-motion-320.jpg`, `final-two-tab-no-replay.jpg`, `final-account-b-isolated.jpg`.
* **P18:** both Edge list pages were frozen before campaign start `03:30:57.599Z` and kept frozen across end `03:31:42.599Z`. The passive trace showed no newer list response across those boundaries; cached states remained UPCOMING/SCHEDULED. After lifecycle active/focus, canonical EXPIRED/ENDED returned without refresh: resume→REST 3683.88/3756.05 ms; resume→DOM 3725.08/3775.85 ms. This passes recovery, not the foreground ~2 s bound. Raw `final-suspend-before-resume.json`, `final-suspend-analysis.json`; two `final-suspend-*-resumed.jpg` screenshots.
* **C07:** existing backfill apply reconciled one historical qualified Order, A 2.5m Silver→5m Gold, notification count stayed 1→1 and both tabs stayed dialog-free. Through actual Edge Admin membership threshold form/save/confirmation, Gold threshold changed 5m→3m and Diamond 10m→4.5m. A became Diamond; notification count still 1 and no popup. Actual Customer membership UI confirmed Gold, then Diamond. Screens `final-backfill-gold-no-popup.jpg`, `final-threshold-diamond-no-popup.jpg`.
* **R04:** fixture HTTP server was closed before a scheduled boundary, TCP/HTTP ECONNREFUSED verified. Cached rows remained and Vietnamese load errors appeared. Flash CDP recorded two automatic GET failures plus two failures from explicit retry, no fast repeating storm; Coupon capture missed network events, so its exact request count is not asserted. HTTP restart then offline→online restored both canonical ended lists and cleared errors without Tải lại/F5. Customer Bell caught up 7→11 without historical celebration. Screens `final-api-outage-bounded-retries.jpg`, `final-api-recovery.jpg`. Expected connection errors were deliberate. Final Customer console had only the preexisting BranchSelector extraneous-class warning on Cart; Edge console had no unexpected errors.
* **R01:** System membership navigation redirected into System Admin; Staff promo-admin route denied and membership route redirected into branch operational shell. Actual Staff Bell contained operational events. Cashier denial/operational-only Bell is additionally preserved in `native-cashier-promotion-denied.jpg`; earlier Branch/Customer denial evidence remains. Guest membership redirected to login with no Customer Bell, inactive Customer login rejected with Vietnamese error. Screens `final-staff-promo-denied.jpg`, `final-inactive-login-denied.jpg`. Auth/ACL production code was unchanged.
* **R02:** actual Chrome Cart→Checkout selected both PUBLIC codes ACCEPTORDER/ACCEPTSHIPPING with the active Flash price. 80,000 goods −10,000 ORDER +32,000 shipping −5,000 SHIPPING = **97,000 VND**; UI place-order succeeded and detail retained these snapshots. Read-only DB confirmed two CONSUMED coupon redemptions and one CONSUMED Flash allocation. A separate VNPAY Order stayed pending in actual Customer detail; the existing test helper sent a correctly signed local IPN twice. The mounted detail automatically became VNPAY PAID, no popup; DB retained exactly one transaction and one CONSUMED Flash allocation. No external payment was made. Screens `final-checkout-two-coupons-97000.jpg`, `final-cod-97000-success.jpg`, `final-vnpay-pending.jpg`, `final-vnpay-paid-no-replay.jpg`; `final-checkout-db.json`.

### Large audience first/tail and concurrent Order

Added 201 active synthetic Customers to the original two. One 400-ms-future pair had 203 unique recipients/type; commit first/tail Coupon 151.62/3503.76 ms, Flash 1022.46/3536.30 ms. Its Order confirmation occurred before activation, so this pair alone is not the concurrent drain proof. A second due-now pair then overlapped an actual Order PACKING transition while Chrome Orders remained mounted:

| Relative to campaign due, ms | Coupon | Flash |
|---|---:|---:|
| Recipient count / distinct users | 203 / 203 | 203 / 203 |
| First claim | 13.44 | 905.98 |
| First / tail commit | 66.49 / 3728.23 | 1070.15 / 3767.46 |
| First / tail publish | 66.51 / 3742.41 | 1070.23 / 3778.85 |

Exactly six promotion recipient transactions persisted 406 notifications. Order claimed at +1941.79 ms, committed +2004.21, emitted +2004.22, socket +2021.96, REST-backed Bell +3077.96 (clock uncertainty ±7.80 ms). Chrome displayed PACKING without refresh, Bell 21, zero celebration. The Order was handled between promotion continuations, so it was not left until the promotion tail or next 5-second poll. Screen `final-concurrent-packing-promotions.jpg`; raw `final-browser-promotions.json`, `final-browser.json`; analyses `final-batch-analysis.json`, `final-concurrent-batch-analysis.json`.

This constrained fixture synchronously rewrites its whole JSON trace on every recipient publication (1,463 captured events overall), adding substantial diagnostic disk/CPU load. It establishes actual first/tail, unique audience and bounded continuation/fairness, not a large-audience p95 SLA. Whole-fixture PostgreSQL statistics: 15,309 commits, 0 rollbacks/deadlocks/temp files, 399 blocks read and 1,126,736 hits; this includes setup, polling, auth, Orders and all scenarios, not isolated campaign query cost. Original idle two-minute request evidence and one-timer/cleanup automated checks remain the idle evidence; no exact idle SQL/callback census is claimed.

All final actions and sanitized evidence are in `final-browser-actions.json`; the final retained database is `bookora_it_auth_hardening_1795404292038_e8a69d`.

## 11. MANUAL BROWSER MATRIX

PASS observations below come from actual agent-operated rendered UI plus real DB/socket/probe evidence. Initial runs used IAB Chromium; final rows explicitly cite native Chrome Customer / Edge Admin extension sessions. Source/test assertions are distinguished from browser observations. Screenshot names resolve under E. All purchases and signed payment callbacks were isolated fixtures, with no production/live transaction.

| Case | Action / observed result | Evidence / status |
|---|---|---|
| P01 | UI-created future PUBLIC SHIPPING/minimum-Silver Coupon; no create-time send; eligible live Customer received at start. Ten measured ORDER samples separately. | `ui-shipping-silver-scheduled.jpg`, `ui-shipping-silver-active.jpg`, after traces. PASS |
| P02 | Mounted Coupon row changed to Active without click/F5. | active/hidden Coupon images + 569.79 ms DOM. PASS |
| P03 | Coupon ended, left ACTIVE, no expiry marketing. | `after-coupon-hidden-expired-empty.jpg`, traces. PASS |
| P04 | Initially empty ACTIVE list included hidden upcoming row then removed it, canonical count/page. | `after-coupon-hidden-active-empty.jpg`, `after-coupon-hidden-entered.jpg`. PASS |
| P05 | Fixture service edits start earlier/later; agent watched table and live Bell; DB recipients only at revised deadlines. | edge manifest + `manual-edge-coupon-authority.jpg`. PASS (setup scripted, observation manual) |
| P06 | PRIVATE/disabled/expired/exhausted rows displayed truthfully, no broadcast for their exact IDs. | edge manifest/DB + Coupon authority image. PASS |
| P07 | Actual Silver A included, Bronze B excluded; previous Gold/Diamond eligible UI-created SHIPPING campaign had two recipients. All three tiers not simultaneously open. | edge result + UI SHIPPING traces; tier-cutoff PG regressions. PASS for tested tier combinations |
| P08 | UI-created PUBLISHED Flash ~1–2 min ahead; received at start, not publish; measured ten pairs separately. | `ui-flash-scheduled-tablet-1024.jpg`, after traces. PASS |
| P09 | Flash changed Scheduled→Active without reload; actions followed canonical status. | `after-flash-hidden-entered.jpg`, 571.62 ms DOM. PASS |
| P10 | Flash ended, left ACTIVE, enum stayed PUBLISHED; no expiry marketing. | `after-flash-hidden-ended-empty.jpg`, PG test. PASS |
| P11 | Empty ACTIVE Flash query had future boundary and automatically gained row. | `after-flash-hidden-active-empty.jpg` → entered. PASS |
| P12 | Draft/cancelled/inactive-variant/full-quota exact IDs had zero notifications; valid active Flash UI Dừng sớm changed status. | edge results, `manual-edge-flash-authority.jpg`, `manual-flash-stopped.jpg`. PASS |
| P13 | Disabled Coupon one second before due while another eligible tier Coupon/Flash shared due; eligible delivered once, disabled zero. | edge timestamps/results + UI. PASS; Flash reschedule near-boundary separately not manually exercised |
| P14 | Stopped worker while future jobs pending, crossed due, restarted; table independent and durable delivery recovered. | `worker-stopped-admin-still-active.jpg`, `worker-restart-recovered-bell.jpg`; PG rollback/restart. PASS |
| P15 | Customer offline during UI campaign activation, durable notifications persisted; reconnect/reload history available. | after DB/REST traces and Bell; strict promotion reconnect uniqueness covered PG. PASS |
| P16 | Actual Chrome Orders mounted during due-now 203-recipient Coupon+Flash batches and concurrent PACKING; 203 unique/type, six transactions, first/tail and Order/Bell timeline measured. | `final-concurrent-packing-promotions.jpg`, final raw/analysis; automated two-worker dedupe. PASS |
| P17 | Both lists left idle for 120 s with no boundary: zero extra responses. Single timer behavior automated. | after idle trace. PASS for request criterion; callback/SQL census not captured |
| P18 | Edge Coupon+Flash pages truly frozen across start/end; resumed/focused, REST and canonical Expired/Ended recovered without refresh in ~3.8 s. | `final-suspend-analysis.json`, resumed screenshots. PASS recovery; foreground SLA not applied while suspended |
| C01 | Real paid/completed COD Order tier-ups showed Silver/Gold/Diamond on Client UI; Branch Admin UI completed B's Order. | celebration desktop and Gold-after-checkout images. PASS |
| C02 | B Bronze→Gold produced one final Gold dialog; A later Diamond observed. | `celebration-gold-after-checkout.jpg`, `celebration-diamond-cart.jpg`. PASS |
| C03 | CTA navigated actual membership route; secondary, X and Escape closed; focus and body scroll restored. | UI observations, duplicate-hint image; component tests. PASS |
| C04 | Offline Gold upgrade, reopen/login: Gold authority + durable unread Bell, zero dialog. | `offline-gold-no-celebration.jpg`, `offline-gold-bell-durable.jpg`. PASS |
| C05 | Old unread load/reload/read and actual HTTP/reconnect reconciliation produced no popup; Bell remained durable. | Offline/history evidence plus `final-browser-actions.json` R04. PASS |
| C06 | Two Chrome tabs received one genuine Silver dialog each; identical persisted ID replay twice open and twice after close did not stack/reopen. A→B showed Bronze/0 and no A data. | `final-two-tab-no-replay.jpg`, `final-account-b-isolated.jpg`, final action trace. PASS |
| C07 | Real backfill Silver→Gold and actual Edge Admin threshold recalc Gold→Diamond; membership notification count stayed 1, no popup. Unrelated events also stayed dialog-free. | `final-backfill-gold-no-popup.jpg`, `final-threshold-diamond-no-popup.jpg`, final traces. PASS |
| C08 | Actual `/checkout?items=…`, Branch Admin completed B's received COD Order. Bell 25→27, no dialog; router navigation Home revealed one Gold dialog. | `checkout-gold-live-deferred.jpg`, `celebration-gold-after-checkout.jpg`. PASS. Earlier Diamond-on-Cart image is NOT checkout evidence. |
| C09 | Existing four-tier component assertions; actual Silver/Gold/Diamond dialogs, desktop/390/320. Final Chrome genuine Silver under reduce=true: animation none, duration/transition 0 s, no overflow; keyboard/CTA verified. | `final-reduced-motion-{desktop,390,320}.jpg`, earlier Gold/Diamond evidence. PASS |
| R01 | Actual System/Branch/Cashier/Staff/Customer route restrictions; Guest membership→login, inactive login rejected, operational role Bell isolated. No unauthorized celebration. | Earlier denial images + `native-cashier-promotion-denied.jpg`, `final-staff-promo-denied.jpg`, `final-inactive-login-denied.jpg`; ACL tests. PASS |
| R02 | Actual Chrome two-coupon + active Flash COD checkout/detail 97,000 VND; DB consumed quotas. Signed local VNPAY IPN twice changed mounted detail pending→paid, one transaction. Real completion/receipt/tier-up already observed. | Final checkout/payment screenshots and `final-checkout-db.json`, regression suites. PASS |
| R03 | Search/filter/page size/paging/sort and refresh kept existing behavior; tablet/mobile table bounds and navy styles inspected. | Coupon tablet/mobile, Flash tablet/mobile/320 images. PASS |
| R04 | Actual HTTP outage, bounded retries/error, server restart + online reconciliation cleared both list errors and restored canonical rows/Bell without old popup. Final consoles had no unexpected exception; existing Cart BranchSelector warning recorded. | `final-api-outage-bounded-retries.jpg`, `final-api-recovery.jpg`, actions/network summary. PASS |

## 12. FINAL DIFF / RISKS / DONE GATE

All required implementation, automated/runtime and direct browser gates are complete. No unresolved product defect or mandatory browser blocker remains. Final full API typecheck and targeted lint passed after correcting the test-only HTTP typing; full API lint had passed immediately before that type-only correction. Web probe/config passed its explicit typecheck. Earlier API 6/74 and Web 43/339 regression runs, production builds, Prisma and contract/generation checks remain valid: subsequent changes were only diagnostic fixture controls/probe and this handoff. No production source changed during final browser acceptance.

Git operations were read-only inspection plus GitNexus analysis. No add/commit/push/pull/rebase/reset/restore/clean. No application DB reset/drop/truncate/seed, production payment, migration, dependency/lockfile, pricing/order-policy or socket-auth change. Export/sync/generation produced the contract models. Both preexisting AGENTS.md/CLAUDE.md edits remain preserved. Exactly one new handoff Markdown exists for this task.

GitNexus compare against master reported API LOW (10 tracked files/32 mapped symbols/0 processes) and Web MEDIUM (10 tracked files/17 symbols/1 notification→branch-store process), including preexisting instruction files/hunk mapping artifacts. New files remain unindexed and manually scoped. The final test main impact query was UNKNOWN, not safe zero; the two type-only HTTP helper changes have no production caller. Full path inventory/numstat and whitespace checks are in `final-diff.json`; final check outcomes are in `verification-summary.json`.

Operational limits remain explicit: PostgreSQL LISTEN requires a session-capable connection; transaction pooling may rely on the retained 5,000-ms polling fallback. Frozen/offline browsers are outside foreground deadlines; actual resume took ~3.8 s on this RAM-constrained machine. Celebration dedupe is bounded/best effort per active runtime (256 IDs), without cross-device exactly-once or offline popup replay; failed authority fetch safely skips popup. The 203-recipient heavily instrumented first/tail evidence is not a production capacity or p95 promise. Exact idle callback/SQL census was not captured; idle request count, one-timer lifecycle tests, source review and EXPLAIN are reported at their actual scope. These measurement limits do not change the demonstrated foreground small-audience targets.

Owned fixture API/Vite servers were stopped and their synthetic database retained. Temporary Chrome/Edge fixture tabs closed; media/device/network/lifecycle overrides on them were cleared or destroyed with the tabs. The user's original localhost:5173 tab and API8000 were left unchanged. The final port check is recorded in `verification-summary.json`; no permission/security setting or Windows animation preference was changed by the agent.

For isolated reproduction, run the existing API test entry with a distinct LATENCY_PHASE and heap limit, then the explicit test Vite config against API18000 with VITE_TURNSTILE_ENABLED=false. Account definitions are in `test/helpers/notification-environment.ts`. Stdin controls include `schedule 65000`, `audience 201`, `cod` and Order transitions, `backfill`, `checkout-fixture`, `vnpay-create`/`vnpay-paid`, `http-stop`/`http-start`, `metrics`, worker controls and `stop`. The additional standalone controller refuses a database name outside the verified local fixture pattern. Never point these controls at application data.

Earlier browser retries encountered minimized/URL-confidence/physical-Escape stops and media states that remained false despite UI settings. Those attempts were not accepted. Full CDP subsequently enabled genuine reduced-motion and lifecycle checks on the isolated fixture; final Chrome/Edge evidence above supersedes the historical PENDING status. **Final status: DONE (VERIFIED).**

## 13. FOLLOW-UP SOURCE AUDIT — ACCOUNT HOST / HISTORY PREVIEW (23 November 2026)

The user reported that celebration appeared after returning Home and that the Membership history preview had only three rows with blank space. This follow-up inspected current source rather than relying on the earlier acceptance conclusion.

**Confirmed celebration root cause and correction:** `client.routes.ts` mounts shopping pages in `ClientLayout` and `/account/*` in the separate sibling `CustomerAccountLayout`. Only ClientLayout contained MembershipCelebrationHost. The global notification bridge/store could still receive and keep a new pending event in Account, but Account had no host to render it. Moving into any route using ClientLayout supplied the host; Home was not the only supported shopping route. Earlier claims that Account popup placement was already covered were too broad and are corrected here. The fix adds the same shared host to CustomerAccountLayout, without another socket, notification bridge or persistent popup state. App.vue has a single RouterView, so the two sibling layouts are not mounted as nested hosts. The existing `/checkout*` and other-open-dialog deferral conditions remain unchanged.

**Confirmed history root cause and correction:** CustomerMembershipPage explicitly requested page 1 / limit 3 for both coupons and transactions. The API service uses requested skip/take, returns totalItems/totalPages, and does not hard-code a three-entry history cap. The two preview cards used stretching CSS grid and a flex-1 content body; shorter transaction rows therefore left stretched empty content space. Per user clarification, coupon limit remains **3**, transaction preview becomes **5**. Grid items now align at start and content has natural height, so neither card fills unused vertical space merely to match its neighbour. The existing full-history dialog and its 10-entry pagination remain unchanged.

Changed files in this follow-up:

| File | Change |
|---|---|
| `src/layouts/CustomerAccountLayout.vue` | Mount existing Celebration host in the Account shell. |
| `src/layouts/CustomerAccountLayout.test.ts` (new) | Actual Account shell regression at /account/orders and /account/membership; a new pending celebration renders once without navigating Home. |
| `src/features/membership/pages/CustomerMembershipPage.vue` | Five recent transactions, coupons unchanged at three; remove stretched card/content height. |
| This handoff | Correct the earlier Account coverage statement and record the audited fix. |

GitNexus upstream impact for both changed Vue files returned LOW, zero indexed direct references/processes; direct route inspection confirmed the shared Account scope. Final compare against master (including all preceding hotfix changes and preexisting instruction edits) reported MEDIUM, 12 tracked files, 20 mapped symbols, one notification→branch-store process. The new test is unindexed. No API/generated/dependency change, Git staging/commit/push or application data write occurred.

Verification:

* `rtk proxy npm test -- src/features/membership src/features/notifications/notification-realtime.test.ts src/layouts/CustomerAccountLayout.test.ts --maxWorkers=1`: **PASS, 5 files / 23 tests**, exit 0, 16.49 s. New tests mount the actual Account layout and populate its in-memory pending celebration; this is a component regression, not a claim that another real Order was completed in the application DB during this follow-up.
* `rtk proxy node --max-old-space-size=2048 node_modules/vue-tsc/bin/vue-tsc.js -b`: **PASS, exit 0**. The first 1024 MB heap attempt failed with Node heap exhaustion; the clean 2048 MB rerun is the accepted result.
* `rtk proxy node --max-old-space-size=2048 node_modules/vite/bin/vite.js build`: **PASS, exit 0**. Existing chunk/asset warnings remain as emitted; no success is inferred from the failed smaller-heap attempt.
* No Web lint script exists. Final tracked diff whitespace check and new-test whitespace review passed.
* Actual existing Chrome Customer Membership UI on localhost:5173: coupon count **3**, history count **5**, CTA-to-content gap **12 px**; left card stayed 458.35 px and right card fit its five rows at 504.79 px. Full-history dialog showed **11 results**, page 1 contained ten and page 2 one; close returned to the five-row preview. Captured console errors: zero. Browser operations were read-only navigation/dialog actions; the user's account and Orders were not altered. Screenshot: `membership-history-five-orders.jpg`.
* A temporary additional Vite server on 127.0.0.1:5173 was stopped after inspection. The user's existing ::1:5173 server was preserved.

Current behavior: a new eligible live tier event can render in shopping and Account pages; /checkout* and an already open dialog defer it. Historical/offline notifications still do not create pending popup state. This follow-up changes placement/preview UI only.

## 14. FINAL PREVIEW ADJUSTMENT — FOUR TRANSACTIONS / EQUAL CARDS

On 23 November 2026 the user superseded the five-entry preview preference: show four recent transactions and keep both side-by-side cards the same height, allowing a small blank remainder in the history card. CustomerMembershipPage now requests transactions page 1 / limit 4, retains coupon limit 3, and restores grid stretching plus flex-1 content so both bottom actions align. No fixed pixel height or Coupon component change was added.

Actual Chrome inspection: three coupons and four transactions; both cards measured 458.35 px high with identical bottom edges and action top positions. Screenshot: membership-history-four-balanced.jpg. Vite production bundle passed, exit 0 (6423 modules, 15.46 s; existing chunk-size warning). Git diff --check passed. This small limit/CSS adjustment supersedes the five-entry/natural-height design in section 13; prior test/typecheck results there remain historical records.

## 15. CELEBRATION ANIMATION POLISH — MINI HOTFIX (23 November 2026)

Changes are presentation-only: new MembershipCelebrationEffects.vue supplies 12 small confetti pieces, one reserved 64×64 badge pop-in and four existing Lucide Sparkles icons; MembershipCelebrationHost.vue mounts it inside the clipped tier-accent panel. Effects inherit currentColor from existing tierAccents (all four tiers); CTA stays Client green. CSS uses transform/opacity, one iteration, maximum configured span 1,680 ms; reduced-motion hides confetti/sparkles and sets all effect animations to none, keeping the badge visible. No dependency, custom SVG, production timer/listener, trigger/store/notification/offline/API/DB or Coupon/Flash policy change. Existing open/deferral expressions are unchanged.

VERIFY: targeted Membership/notification bridge/Account layout tests passed **5 files / 24 tests**, exit 0 (13.82 s), including stable decoration identity during an already-open dialog and removal on dismiss. Command: `rtk proxy npm test -- src/features/membership src/features/notifications/notification-realtime.test.ts src/layouts/CustomerAccountLayout.test.ts --maxWorkers=1`. Explicit 2048 MB vue-tsc -b and Vite production build both passed, exit 0; bundle 6,426 modules / 8.66 s, existing chunk-size warning only. No Web lint script. Diff whitespace check passed. GitNexus reports UNKNOWN for the unindexed host; direct scope inspected. Whole-tree compare remains MEDIUM / 12 tracked files / one previously mapped notification flow; new files are unindexed.

Actual Chrome fixture used isolated DB bookora_it_auth_hardening_1795419845923_b6c6fd, API18000 / Web127.0.0.1:15174, and three real paid/completed COD Orders. Silver at **1440×900** and Gold at **390×844** each recorded exactly **17 starts / 17 ends**; two deliberate duplicate Gold hints added no cycle. First-start→last-end measured **2,016.90 / 1,756.40 ms**, with constant dialog dimensions, 64×64 badge allocation and CTA offset throughout. Diamond opened under actual reduced-motion at **320×740**: zero animation events before any inspection override, all 17 animation names none, decorations hidden, badge/CTA intact; the same reduced dialog was also checked at 1440×900 and 390×844. Modal bounds at 320 were x16..304 and CTA hit testing passed. A 335px background document width occurred during live viewport/scroll-lock changes; a fresh plain-dialog baseline was 320px. This does not establish a general page-overflow fix; no shared scroll-lock change was made.

Evidence: celebration-animation-analysis.json and original celebration-animation*.json in E; animation-browser-cases.json, animation-frame-samples.json, animation-mobile-frame-samples.json, reduced screenshots and celebration-animation-mobile-motion.jpg. Normal-motion visual frame sequences explicitly re-enable media emulation on the existing genuine Diamond dialog; those extra CSS cycles are inspection, not additional tier events or the once-per-open measurement. Raw Animation CDP and RAF/performance sampling were unsupported; successful passive event capture and sequential screenshots are the accepted evidence. The temporary passive probe was preserved in E and removed from repository source with exact-content verification. Captured browser console errors: zero; closing removed effect DOM. Media/viewport overrides were restored, owned fixture tab/servers stopped, synthetic DB retained. No commit/push.

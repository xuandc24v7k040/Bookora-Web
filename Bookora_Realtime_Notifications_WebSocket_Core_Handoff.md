# Bookora — Realtime Notifications & WebSocket Core

## 1. STATUS

**BOOKORA — REALTIME NOTIFICATIONS & REUSABLE WEBSOCKET CORE — DONE (VERIFIED)**

Chốt ngày **21/11/2026 (Asia/Ho_Chi_Minh)**. Hoàn tất BE/DB/REST, transactional dispatch, realtime core dùng lại cho Chat, UI Customer/Branch, canonical contract generation và kiểm chứng runtime/browser **18/18 M01–M18** trong môi trường local an toàn. Không còn mandatory blocker.

**Cập nhật UI theo yêu cầu mới ngày 21/11/2026:** mục 11 thay thế mô tả màu badge/tab Admin ở bản nghiệm thu ban đầu; các số liệu full-suite phía dưới thuộc lần triển khai core, không phải tuyên bố chạy lại toàn bộ suite cho hotfix UI.

- Web cuối: **208 files / 1086 tests PASS**; API unit: **115 suites / 942 tests PASS**; Notifications E2E: **17 PASS**, regression Coupon/FlashSale/Auth: **41 PASS**.
- Typecheck/lint API, build API/Web, Prisma validate/migration status/schema diff, OpenAPI/Orval/Zod và diff checks PASS. Web không có lint script riêng.
- DB audit runtime: **58 notifications, 0 duplicate, 0 promo phát sớm; promo chỉ CUSTOMER**.
- VNPay kiểm chứng bằng signed callback local; không tuyên bố đã thanh toán live. Giới hạn deployment và DB fixture giữ lại được ghi tại mục 10.

## 2. PREFLIGHT

- Web: `aa658a83000294df0e3447deae42cf3292592ab3`, `D:/CTU/CT466E/bookora-web/bookora-web`.
- API: `01ca5652dc373187530dfbb5a5ad47ee9cb48165`, `D:/CTU/CT466E/bookora-api/bookora-api`.
- Baseline cả hai: chỉ `AGENTS.md`, `CLAUDE.md` modified (2 dòng mỗi repo), không untracked. Bảo toàn các thay đổi này.
- App có trước: Web 5173/API 8000; DB `localhost:5432/bookora_db`, development. Fixture và acceptance chạy DB riêng theo helper hiện có. Migration additive trên DB development chỉ được áp dụng sau khi kiểm tra target và tạo backup (mục 5).
- Authority: prompt đã được người dùng yêu cầu thực thi; source hiện tại quyết định contract; ba ảnh chỉ là visual reference. Không thêm wishlist/system alerts/chat.

| ID | Source thực | FOUND/KEEP/GAP | Reuse/Change | Blast radius | Verify |
|---|---|---|---|---|---|
| RT-01 | API auth/strategies/jwt-access.strategy.ts, authorization.service.ts, auth-sessions.repository.ts | KEEP; socket GAP | Reuse JWT sub/sid + resolvePrincipal, cookie accessToken | Auth boundary | cookie/origin/session/revoke runtime |
| RT-02 | authorization/branch-context.service.ts, authorization.service.ts | KEEP | Effective assignment grants + DENY; read AND (update_status OR cancel) | branch ACL | negative REST/socket |
| N-01 | Prisma multi-file schema; app.module.ts | GAP | Notification + durable dispatch, scoped REST | additive | PostgreSQL + contract |
| N-02 | checkout/checkout.service.ts:placeCod | KEEP | One transaction intent, COD PENDING only | LOW: 1 caller | COD rollback/idempotency |
| N-03 | payments/payments.service.ts:applySuccessfulVnpayTransaction | KEEP | Transition-history hook after verified checks | history HIGH | invalid/duplicate/retry/late callback |
| N-04 | orders/order-status-history.ts; customer-orders.service.ts:confirmReceived; order-cancellation.ts | KEEP | History event ID for dedupe; separate receipt | history HIGH: 6 callers/19 symbols, 3 affected process groups | transition/cancel/receipt |
| N-05 | coupons.service.ts:save,setActive; coupon-redemption.ts | KEEP | Same transaction schedule; recheck visibility/time/quota | LOW: 2/1 callers | boundary/PRIVATE/exhausted |
| N-06 | flash-sales.service.ts:control; flash-sale-pricing.ts | KEEP | Publish schedule; derived ACTIVE unchanged | LOW: 1 caller | publish/start/stop/restart |
| N-07 | coupons-expiry.service.ts + test/helpers/postgres-test-database.ts | GAP dispatch | Bounded polling; PostgreSQL claim/cursor, no broker | new module | concurrency/rollback/retry |
| UI-01 | components/client/layout/ClientHeader.vue | KEEP | Bell between wishlist/cart desktop+mobile | LOW: 2 imports | header before/after |
| UI-02 | pages/app/account/AccountNotificationsPage.vue; CustomerAccountLayout.vue | placeholder GAP | Real list, no badge/no four cards | account only | tabs/search/read/paging/mobile |
| UI-03 | layouts/DashboardLayout.vue; authorization/admin-menu.ts; router/index.ts | KEEP | Navy Bell + branch-only page/menu | layout LOW; menu helper CRITICAL: 2 direct/10 total, 4 process groups | permissions/menu/router regressions |
| C-01 | API docs:openapi/docs:check; Web openapi:sync/gen:api | KEEP | Generate only; no manual generated edits | contract | export/sync/Orval/Zod/build |

Design trước diff: Notification domain phụ thuộc abstract RealtimePublisher, core chỉ biết auth/socket/user-room và predicate phân quyền do domain cung cấp. Dispatch intent cùng transaction nghiệp vụ; worker materialize per-user bằng cursor bounded, emit sau commit. PostgreSQL/REST là authority, socket chỉ invalidation best effort. Chat tương lai dùng publisher/auth/lifecycle nhưng sở hữu domain riêng; phase này không có Chat.

## 3. ARCHITECTURE / REUSE FOR CHAT

```text
Checkout / Order history / Coupon / Flash Sale
  └─ transaction nghiệp vụ + NotificationDispatch
       └─ NotificationWorker → Notification per user (commit)
            └─ abstract RealtimePublisher → RealtimeGateway → user socket
REST Notifications ← PostgreSQL                 ↓ invalidation
Vue Query ← Notification bridge ← shared RealtimeConnection / Auth session
```

- API `src/modules/realtime/`: adapter, explicit Origin/path configuration, JWT/cookie/AuthSession validation, server-owned user room, lifecycle và typed publisher. Không import Notification/Order/Coupon/FlashSale; không xử lý nghiệp vụ Chat.
- `RealtimeModule` dùng AuthorizationModule/JwtModule; `NotificationsModule` dùng Prisma + RealtimeModule. Domain gọi `RealtimePublisher.publishToUser(userId, event, entitled)`, không truy cập Socket.IO trực tiếp.
- Cookie access JWT phải có `sub/sid/exp`, HS256 hợp lệ; principal được resolve bằng session hiện tại. Revalidate mỗi 15 giây và trước mỗi protected emit. Fingerprint đổi quyền/assignment làm socket đóng và client reconcile. Per-emit vẫn fail-closed nếu timer chưa đến lượt.
- Room `user:<id>` chỉ server join; không có endpoint client chọn room. Publish duyệt connection đã xác thực, kiểm tra lại session và predicate trước emit. Payload tối đa 8 KiB.
- FE `src/lib/realtime/connection.ts` giữ một manager cho mỗi app/tab; `session.ts` sở hữu auth lifecycle. Domain đăng ký typed event bằng interface augmentation, `onReconcile` và `onReset`; bridge Notifications chỉ quản lý cache Notifications. Auth/session plumbing không nằm trong feature Notification.
- Manager dùng credentials cookie, retry tối đa 5 lần/backoff 1–30 giây, session recovery throttle 10 giây, generation guard chống reconnect sau logout. Connect/focus refetch REST; fallback REST mỗi 60 giây. Không cộng/trừ badge bằng socket payload.
- Chat phase sau có thể inject publisher, thêm domain event/REST riêng và đăng ký handler trên manager hiện tại. Không phải thay Gateway/JWT/session/room plumbing. Chưa có message/chat room/presence/typing/history hoặc Chat UI.
- Không thêm Redis/broker. Hiện tại hỗ trợ nhiều worker bằng PostgreSQL; realtime nhiều API instance cần Socket.IO adapter/broker thích hợp khi triển khai topology đó. Durable REST vẫn là authority nếu socket không tới instance chứa connection.

## 4. NOTIFICATION EVENTS / RECIPIENTS

| Event | Hook thật | Recipient | Idempotency |
|---|---|---|---|
| COD → PENDING | `src/modules/checkout/checkout.service.ts:placeCod` | BRANCH đang active, assignment đúng order.branchId, quyền xử lý đơn | `COD:<orderId>` |
| Verified VNPay PENDING_PAYMENT → PENDING | `src/modules/orders/order-status-history.ts:recordOrderStatusHistory`, được gọi từ payment transition đã verify | Nhân sự branch; thêm PAYMENT_PAID cho owner Customer | `<historyId>:ORDER_NEW_PAID`, `<historyId>:PAYMENT_PAID` |
| Admin → CONFIRMED/PACKING/SHIPPING/COMPLETED/CANCELLED | cùng history hook | Customer owner, không gửi lại cho người thao tác | history ID + kind |
| Customer cancel | cùng history hook sau cancel hợp lệ | Nhân sự branch | history ID + kind |
| Customer receipt | `src/modules/customer-orders/customer-orders.service.ts:confirmReceived` | Nhân sự branch; không đổi thành COMPLETED | `RECEIPT:<receiptHistoryId>` |
| Payment terminal cancellation | history hook SYSTEM từ PENDING_PAYMENT/PAYMENT_FAILED → CANCELLED | Customer owner | history ID + PAYMENT_TERMINAL |
| Coupon bắt đầu hiệu lực | `src/modules/coupons/coupons.service.ts:save,setActive` + worker | Chỉ CUSTOMER active | `COUPON_ACTIVE:<couponId>` |
| Flash Sale bắt đầu hiệu lực | `src/modules/flash-sales/flash-sales.service.ts:control` publish + worker | Chỉ CUSTOMER active | `FLASH_SALE_ACTIVE:<saleId>` |

- Tạo VNPay PENDING_PAYMENT không enqueue branch alert. Signature/amount/status/duplicate/late callback vẫn do Payments hiện hữu quyết định; không thêm đường tắt giả PAID. Runtime dùng signed callback với test secret trong môi trường local, không phải giao dịch VNPay live.
- Không enqueue cho note-only hoặc no-op transition. Không self notification, ngoại lệ PAYMENT_PAID cho chủ đơn theo quyết định nghiệp vụ.
- Branch phải có `orders.read AND (orders.update_status OR orders.cancel)` trên chính assignment đang active; grants ALLOW/DENY được resolve theo source hiện hữu. Không dùng role string để quyết định recipient.
- Coupon: kiểm lại PUBLIC, isActive, start/end, quota consumed + reservation còn hạn tại dispatch. Flash: PUBLISHED, start/end, item/variant/product hợp lệ và còn quota. PRIVATE, disabled, DRAFT, CANCELLED, STOPPED_EARLY/expired/exhausted không phát.
- Migration chỉ schedule chương trình future eligible. Không backfill chương trình đã active trước rollout; explicit enable/đổi PRIVATE→PUBLIC mới có thể tạo eligibility mới. Campaign đã DONE không phát lại khi sửa/re-enable.

## 5. SCHEMA / DISPATCH

- Prisma: `prisma/schema/31-notifications.models.prisma`; backrelation User/Branch ở `20-auth-users-branches.models.prisma`.
- Migration: `prisma/migrations/20261120120000_realtime_notifications/migration.sql`. Thêm Notification, NotificationDispatch, enum/index/FK; không reset/truncate bảng hiện có.
- Notification ULID, user/branch/dispatch FK Restrict, type/category/title/content/referenceType/referenceId/readAt/createdAt. Unique `(userId, dispatchId)` ngăn duplicate per recipient; index phục vụ owner/branch/unread/time.
- Dispatch có eventKey unique, kind/reference/actor/branch/dueAt, state PENDING/DONE/SKIPPED, audienceCutoff, cursor, attempts và skipReason. Intent commit/rollback chung transaction nghiệp vụ.
- Một tick claim một job bằng `FOR UPDATE SKIP LOCKED`; tối đa 100 users/batch, keyset theo ULID và cutoff cố định. Rows + cursor + state commit atomic. Crash/trigger failure rollback cả batch; instance khác có thể tiếp tục, retry không duplicate. Batch lớn xoay dueAt để nhường job khác.
- Campaign row được `FOR SHARE NOWAIT` trong mỗi batch, tránh gửi cùng lúc campaign edit và tránh đảo thứ tự lock job/campaign gây deadlock. Eligibility kiểm lại mỗi batch. Người đăng ký/assignment mới sau cutoff không bị kéo vào broadcast đang chạy.
- Lỗi persist giữ PENDING và backoff exponential tối đa 300 giây. Socket emit sau commit, lỗi emit không rollback đơn hàng/lịch sử; client lấy lại REST.
- DB local PostgreSQL 18.4, timezone `Asia/Bangkok`; Prisma dùng timestamp không timezone. Đã phát hiện raw `CURRENT_TIMESTAMP` bị adapter diễn giải lệch +7 giờ. Claim/default/cutoff/backoff mới dùng `CURRENT_TIMESTAMP AT TIME ZONE 'UTC'` rõ ràng; browser hiển thị `Asia/Ho_Chi_Minh`.
- Trước migrate: verified development `localhost:5432/bookora_db`, một migration Notifications pending. Backup đã tạo: `D:/CTU/CT466E/backups/bookora_db_before_realtime_1795183356403.backup` (329653 bytes). Sau migrate: 31 migrations, up to date; schema diff trả `This is an empty migration.` Không dùng fixture trên DB app.
- Acceptance dùng disposable PostgreSQL qua helper hiện hữu và full migrate deploy. Runtime browser riêng: `bookora_it_auth_hardening_1795207672214_06840b`; chỉ chứa tài khoản `@realtime.example.test`.

## 6. API / SOCKET CONTRACT

REST dưới prefix thật `/api/v1`:

| Method / route | Contract / scope |
|---|---|
| GET `/notifications` | page/limit (max 50), search title/content, category ORDER/PROMOTION, unreadOnly, sort newest/oldest; order ổn định createdAt + id |
| GET `/notifications/unread-count` | unread trong owner/selected branch |
| POST `/notifications/:id/read` | owner-only, monotonic readAt, idempotent; 404 nếu không thuộc scope |
| POST `/notifications/read-all` | chỉ owner/selected branch, CSRF như HTTP mutations hiện hữu |

- CUSTOMER chỉ `userId=self, branchId=null`. BRANCH bắt buộc `X-Branch-Id` và quyền hiện tại; thiếu branch 400, sai quyền 403. SYSTEM bị từ chối; guest/inactive/revoked dùng auth boundary hiện hữu.
- Không nhận userId/room từ client. DTO whitelist/validation, không lộ stack/token/cookie. Coupon reference đổi PRIVATE/missing được redact title/content/code trong response; không gửi private code qua notification.
- Namespace `/realtime`, path mặc định `/socket.io`, origin allowlist cấu hình `REALTIME_ORIGINS`; credentials true. Cả polling và WebSocket upgrade đều kiểm Origin explicit, missing/foreign Origin bị chặn.
- Event `notification.changed`: `{ "version": 1, "id": "<ULID nếu có>", "branchId": null }` hoặc branch ULID. Event chỉ invalidate, không chứa nội dung nhạy cảm. `realtime.session` thông báo cần xác thực/reconcile rồi disconnect.
- FE cache key gồm `notifications/userId/branchId/params`; chuyển branch không dùng previous-data. Callback mutation giữ key của scope tại lúc gửi. Error không giữ protected rows. Retry phục hồi đồng thời list và unread count.
- Canonical pipeline: API `docs:check` → Web `OPENAPI_URL=http://localhost:18000/api/docs-json npm run gen:api:local`. Export 159 paths / 222 operations / 278 schemas. Orval/Zod generated; không hand-edit generated.
- Web OpenAPI snapshot SHA256: `7F274EA56B0F7515708E8856BA509B29084EEC24A3F21055D2F58B781D8CF766`. Notification module đặt cuối imports để tránh reorder toàn bộ Swagger; API OpenAPI diff chỉ thêm 552 dòng.

## 7. FRONTEND UI

- Customer Bell nằm giữa wishlist/cart trên desktop và mobile, badge thật (ẩn 0, clamp 99+), primary green; hover/click/keyboard, tối đa 5 newest, ScrollArea và footer luôn tách khỏi vùng cuộn. Pointer từ hover sang click không làm đóng popup; Escape/outside và focus restore hoạt động.
- `/account/notifications` thay placeholder bằng CustomerNotificationCenter, giữ CustomerAccountLayout/sidebar. Bắt đầu bằng heading/mô tả/toolbar; **không có badge “Tài khoản khách hàng” ở nội dung, không có 4 KPI cards**. Sidebar vẫn giữ accessible navigation label hiện hữu.
- Tabs all/unread/order/promotion, debounce search, newest/oldest, Hôm nay/Hôm qua/Trước đó, pagination 6 rows/page, mark-one/all, skeleton/empty/error/retry. Copy code riêng, không tự apply/checkout. ORDER dùng route owner, Flash Sale `/flash-sale`, coupon fallback `/san-pham?onSale=true`; reference không hợp lệ không biến thành URL tùy ý.
- Admin Bell chỉ chèn vào DashboardLayout giữa search và selector; icon/CTA/unread dùng token **navy Admin**, badge đỏ. Không sửa dashboard KPI/chart. Trang `/branch-admin/notifications` dùng DataTable/Breadcrumb/filter/sort/paging hiện hữu, không có tab Promotion.
- Menu/router/feature cùng yêu cầu quyền đọc + một quyền xử lý theo selected branch. Cashier/Branch Admin/Staff delegated được xem; Staff read-only và SYSTEM không Bell/menu/page.
- Responsive đã xem 1440×900, 1366×768, 390×844, 320×844. Tab wrap ở 320, title/order code wrap, CTA còn đọc được; document không overflow ngang. Footer popup ở màn hình thấp vẫn nằm trong viewport.

## 8. AUTOMATED VERIFY

Mọi command dưới đây đã chạy thật qua `rtk proxy`; không cộng số test của các lần chạy lặp vào tổng. Web không có lint script; `npm run build` bao gồm vue-tsc.

| Repo | Command | Kết quả |
|---|---|---|
| API | `npm test -- --runInBand --silent` | exit 0; 115 suites / 942 tests |
| API | `npm run test:e2e -- --runInBand --detectOpenHandles --testPathPatterns=notifications-http --json --outputFile=C:/Users/Admin/AppData/Local/Temp/bookora-realtime-evidence/api-notifications-result.json` | exit 0; 1 suite / 17 tests |
| API | `npm run test:e2e -- --runInBand --testPathPatterns="coupon-http\|flash-sale-http\|auth-hardening"` | exit 0; 3 suites / 41 tests, regression |
| API | `npm run type-check`, `npm run lint`, `npm run build` | mỗi command exit 0; build 530 files |
| API | `npx prisma format`, `npx prisma validate`, `npx prisma generate` | exit 0 |
| API | `npx prisma migrate deploy`, `npx prisma migrate status` | exit 0; 31 migrations up to date |
| API | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --script` | exit 0; empty migration |
| API | `npm run docs:check` | exit 0; 222 operations / 278 schemas; Redocly valid, 2 pre-existing ignored problems |
| Web | `OPENAPI_URL=http://localhost:18000/api/docs-json npm run gen:api:local` | exit 0; canonical sync + Orval + Zod |
| Web | `npm run verify:generated-zod` | exit 0; 36 files, 274 zod.ulid, 0 forbidden occurrences |
| Web | `npm test -- src/features/notifications src/lib/realtime --maxWorkers=2 --testTimeout=15000` | exit 0; 6 files / 13 tests sau sửa retry |
| Web | `npm test -- --maxWorkers=2 --testTimeout=15000 --reporter=json --outputFile=C:/Users/Admin/AppData/Local/Temp/bookora-realtime-evidence/web-final-result.json` | exit 0; 208 files / 1086 tests, failed0 |
| Web | `npm run build` | exit 0 sau sửa retry; vue-tsc + Vite 6350 modules |
| Cả hai | `git diff --check` | exit 0 |
| Cả hai | GitNexus `detect_changes({scope:"all"})` | MEDIUM; API 4 COD flows, Web 5 AuthNavigation flows; scope đúng dự kiến |

Notification integration dùng AppModule + PostgreSQL + HTTP + Socket.IO thật (polling và websocket), không chỉ mock gateway. Bao gồm COD rollback, receipt/completed, customer/admin cancel, invalid/duplicate VNPay, terminal event, delayed/PRIVATE/disabled/re-enabled/quota campaign, concurrent workers, batch100 rollback/restart/cutoff, REST owner/branch/CSRF/readAt, Origin/cookie/JWT/session/inactive/grant revoke, room injection, publisher độc lập domain, socket outage không làm mất history.

Các lỗi trong quá trình verify đã xử lý: timezone raw SQL; cấu hình path `/socket.io`; pending handshake lifecycle; hover/click toggle; tab 320px; token CSS Admin; retry list/count. Những lần Web test đầu timeout do tải song song/generator đổi output giữa import đã được chạy lại độc lập với timeout 15s; không còn dùng kết quả fail đó làm PASS. Không chạy generator cùng tests/build ở lần cuối.

Warning còn lại: Node experimental VM modules, pg concurrent-client-query deprecation trong test helper; Vite chunk-size warning ở bundle hiện hữu. Không nâng dependency lớn ngoài phạm vi để giấu warning.

## 9. RUNTIME & MANUAL BROWSER

Thực hiện trên app thật bằng CUA in-app browser. API 18000; Customer Web localhost:15173; phiên độc lập dùng 127.0.0.1:15174 (cookie host riêng). DB fixture riêng ở mục 5. Chỉ dùng test credentials; không có payment live/email bên ngoài.

Evidence lưu bền: `C:/Users/Admin/.codex/visualizations/2026/11/20/01a1f915-683b-7c72-b7c5-b14389626bc9/bookora-realtime/` (27 ảnh/JSON). Tất cả ảnh trong bảng là JPEG ở thư mục này; có `web-final-result.json`, `api-notifications-result.json`, `runtime-audit.json`. Bản chạy tạm và test harness nằm tại `C:/Users/Admin/AppData/Local/Temp/bookora-realtime-evidence/`. Các ca được chạy qua nhiều lượt cùng source, lượt cuối xác nhận lại sau shared session/retry fix.

| Case | Thao tác thật / quan sát | Evidence / scope | Status |
|---|---|---|---|
| M01 | Customer login → homepage; Bell giữa wishlist/cart, green, unread thật; click desktop/tap mobile mở popup | `customer-bell-desktop-final.jpg`, `customer-bell-320-final.jpg`; desktop1440, mobile390/320 | PASS |
| M02 | Pointer vào Bell/click rồi chuyển tới popup/footer; hover-before-click không toggle đóng; DOM dialog đúng 5 `.notification-row`; footer click điều hướng được | `customer-bell-desktop-final.jpg`; keyboard không lấy focus khi hover; 5 rows + copy/mark/footer buttons riêng | PASS |
| M03 | Click Xem tất cả → account page; sidebar giữ nguyên, không badge và 4 stats cards | `customer-notifications-desktop-final.jpg` | PASS |
| M04 | Tabs/search không tồn tại→empty, sort Cũ nhất đổi thứ tự, Sau→2/2 rồi Trước; mark-one/all; skeleton khi fetch; proxy trả503 có alert/Thử lại; bỏ fault và retry phục hồi cả list/count | `customer-api-outage.jpg`, `customer-retry-recovered.jpg`; API503 chủ động, không phải production fault | PASS |
| M05 | ORDER click mở đúng own order detail; copy coupon hiện toast thành công; Flash notification mở Flash Sale thật; coupon đã expire vẫn tới listing an toàn, không tự áp mã/checkout | `/account/orders/<ULID>`, `/flash-sale`, `/san-pham?onSale=true` quan sát từ tab/DOM; allowlist reference được test | PASS |
| M06 | Branch Admin dashboard Bell giữa search/branch selector; navy CTA/icon/unread, đỏ badge, dữ liệu branch; KPI/charts/sidebar source giữ nguyên | `admin-bell-desktop-final.jpg` 1440×900 | PASS |
| M07 | Footer Bell → branch page; existing DataTable, search empty, sort Thời gian tăng dần đổi thứ tự; chỉ tabs all/unread/order | `admin-notifications-desktop-final.jpg` | PASS |
| M08 | Branch A unread5→B3; mark-all B→0; quay A vẫn5; không flash rows branch cũ | `admin-branch-scope.jpg`; REST/socket ACL bổ sung integration | PASS |
| M09 | Cashier xem Bell/page; Staff delegated xem receipt; Staff readonly không Bell/menu, URL trực tiếp denied; SYSTEM không Bell và URL branch denied | `cashier-notifications.jpg`, `staff-granted-receipt.jpg`, `staff-readonly-denied.jpg`, `system-direct-url-denied.jpg` | PASS |
| M10 | Chạy Checkout COD thật trong fixture khi 2 browser đang mở: branch4→5, Customer giữ7 | runtime `cod` → `COD_COMMITTED`; browser aria-label thật | PASS |
| M11 | VNPay create giữ branch6/Customer11; verified + cùng callback2 lần → thêm đúng1 mỗi recipient; Customer còn nhận2 promos riêng đúng giờ | `vnpay-create`, `vnpay-paid`; callback local signed, không gọi VNPay live; duplicate rows0 | PASS |
| M12 | CONFIRMED/PACKING/SHIPPING hiển thị Customer; receipt làm branch5→6 và Order còn SHIPPING; complete thêm Customer riêng; Customer cancel hiển thị branch “Khách hàng đã hủy...” | runtime transition/receipt/complete/cancel + live DOM, `staff-granted-receipt.jpg` | PASS |
| M13 | 6 campaign fixtures start45s future: trước giờ tab Promo0; sau giờ đúng2 rows PUBLIC/PUBLISHED, private/disabled/draft/cancel không rows; branch không promo | `promotion-before-start.jpg`; DB2DONE/4SKIPPED,4 recipient rows toàn CUSTOMER, early0 | PASS |
| M14 | 2 tabs cùng localhost + 1 phiên host127 độc lập: mark-all A làm cả ba unread0 qua socket không reload | live aria-label A/tabA/B đều0; lịch sử14 rows vẫn còn; branch scope sync được test REST/socket | PASS |
| M15 | Chủ động disconnect socket, tạo Order khi browser offline: badge vẫn0; reload lấy lại persisted history và unread1, không toast storm | `disconnect-sockets` + `order`; REST còn chạy; reconnect/reload thật | PASS |
| M16 | Logout A làm Bell A biến mất, B vẫn nhận unread2; guest deep-link→login. Thu hồi session B rồi phát event: B mất user/protected access và deep-link→login, A tiếp tục nhận3. Customer→branch URL denied | host/cookie độc lập; per-emit fail-closed; expired JWT và bound15s còn được real-socket integration verify | PASS |
| M17 | 390×844 và320×844 không overflow (scrollWidth375/305); popup320 bounds0..296; low-height1366×768 popup bottom661.6; Enter/Tab/Escape/outside và focus trả Bell | `customer-notifications-mobile-final.jpg`, `customer-notifications-320-final.jpg`, `customer-bell-320-final.jpg`, `customer-bell-low-height.jpg` | PASS |
| M18 | Console error/warn arrays rỗng ở browser cuối; DB audit58notifications/0duplicate; promo4rows toànCUSTOMER/early0; controlled503/forced outage chỉ test | Không mở DevTools Network pane; dùng HTTP/Socket integration logs + proxy fault + DB audit thay thế. Không tuyên bố đã xem pane | PASS |

M13 fixture cố ý tạo dispatch cho campaign không hợp lệ để kiểm tra worker fail-closed; các hooks API thật được kiểm tra bằng integration. Không hardcode các fixture này trong production UI.

## 10. REGRESSIONS / FINAL DIFF / RISKS

**Tracked API thay đổi:** `.env.example`, `package.json`, `package-lock.json` (deps tối thiểu); `docs/openapi.json` (generated); Prisma auth-user schema (backrelations); app.module/app.setup (module/adapter); checkout/history/customer-receipt/coupons/flash-sales (transaction intent hooks); 4 existing test specs admin-orders/checkout/customer-orders/payments (transaction mocks có dispatch).

**API mới:**

```text
prisma/migrations/20261120120000_realtime_notifications/migration.sql
prisma/schema/31-notifications.models.prisma
src/modules/notifications/notification-access.ts
src/modules/notifications/notification-intents.ts
src/modules/notifications/notification-worker.service.ts
src/modules/notifications/notifications.controller.ts
src/modules/notifications/notifications.dto.ts
src/modules/notifications/notifications.module.ts
src/modules/notifications/notifications.service.ts
src/modules/realtime/realtime-io.adapter.ts
src/modules/realtime/realtime-options.ts
src/modules/realtime/realtime-publisher.ts
src/modules/realtime/realtime.gateway.ts
src/modules/realtime/realtime.module.ts
test/helpers/notification-environment.ts
test/helpers/notification-runtime-actions.ts
test/notifications-http.e2e-spec.ts
test/notifications.browser-runtime.ts
```

**Tracked Web thay đổi:** `.env.example`, package/lock (socket.io-client); OpenAPI snapshot/models index (generated); admin-menu/router/types (selected branch + processing permission); ClientHeader/DashboardLayout (Bell); main (shared session + bridge); AccountNotificationsPage (placeholder → component).

**Web mới:**

```text
src/features/notifications/components/CustomerNotificationCenter.vue
src/features/notifications/components/NotificationBell.vue
src/features/notifications/components/NotificationRow.vue
src/features/notifications/pages/AdminNotificationsPage.vue
src/features/notifications/notification-menu.test.ts
src/features/notifications/notification-presentation.test.ts
src/features/notifications/notification-presentation.ts
src/features/notifications/notification-realtime.ts
src/features/notifications/notification-scope.ts
src/features/notifications/notifications-api.test.ts
src/features/notifications/notifications-api.ts
src/features/notifications/notifications-ui.test.ts
src/features/notifications/notifications.css
src/lib/realtime/connection.test.ts
src/lib/realtime/connection.ts
src/lib/realtime/session.test.ts
src/lib/realtime/session.ts
src/api/generated/endpoints/notifications/notifications.ts
src/api/generated/zod/notifications/notifications.ts
src/api/generated/models/notificationCountDto.ts
src/api/generated/models/notificationItemDto.ts
src/api/generated/models/notificationItemDtoCategory.ts
src/api/generated/models/notificationListDto.ts
src/api/generated/models/notificationsList200.ts
src/api/generated/models/notificationsListCategory.ts
src/api/generated/models/notificationsListParams.ts
src/api/generated/models/notificationsListSort.ts
src/api/generated/models/notificationsRead201.ts
src/api/generated/models/notificationsReadAll201.ts
src/api/generated/models/notificationsUnreadCount200.ts
Bookora_Realtime_Notifications_WebSocket_Core_Handoff.md
```

- `AGENTS.md` và `CLAUDE.md` modified sẵn ở cả hai repo được giữ nguyên; không tính là thay đổi implementation. GitNexus report có đưa hai file này vào summary. New untracked chưa có index nên impact trả UNKNOWN; đã đối chiếu caller/import bằng source và tests, không hiểu UNKNOWN là an toàn tuyệt đối.
- Cảnh báo HIGH history hook và CRITICAL menu helper đã được nêu trước edit. Final detect_changes MEDIUM trong đúng COD/AuthNavigation flows; mapping `toResponse` do line shift, không sửa logic response nghiệp vụ.
- Không rewrite Auth/Checkout/Orders/Payment/Coupon pricing/quota/dashboard. Không đổi đường xác minh VNPay, snapshot, receipt rules hoặc grants hiện hữu; chỉ nối intent trong transaction. Không có Chat/wishlist/system alert ngoài scope.
- Dependencies thêm: API `@nestjs/websockets`, `@nestjs/platform-socket.io` cùng Nest11.1.20, `socket.io`; Web `socket.io-client`; API dev socket.io-client phục vụ runtime tests. Không thêm queue/Redis hoặc UI library.
- Bằng chứng là môi trường local single API instance + PostgreSQL thật. Production TLS/reverse proxy upgrade/sticky routing và nhiều API instances chưa được triển khai/test trong phase này; phải cấu hình explicit REALTIME_ORIGINS/path phù hợp deployment. Đây là giới hạn môi trường, không phải khẳng định đã nghiệm thu production.
- Chưa có giao dịch VNPay live. Verified signed local callback và payment regression là evidence theo safe-test gate của prompt.
- Không git add/commit/push/pull/rebase/reset/clean/restore. Chỉ một handoff Markdown được tạo; ảnh/JSON và test harness tạm nằm ngoài repo.
- Đã dừng đúng 4 server kiểm thử do agent tạo (Vite15173/15174, API18000, proxy18001), có kiểm tra PID/command line trước Stop-Process. Không đổi `.env` local; test env chỉ ở process. Đã reset browser viewport. Không tự khởi chạy lại server development 5173/8000.
- Cleanup không reset/truncate/drop DB app hoặc xóa DB fixture để tránh đụng dữ liệu ngoài phạm vi. Giữ runtime DB `bookora_it_auth_hardening_1795207672214_06840b` để audit. Ba DB disposable từ phiên bị gián đoạn trước cũng giữ lại: `bookora_it_auth_hardening_1795181708153_73c634`, `bookora_it_auth_hardening_1795181817387_ed8e4b`, `bookora_it_auth_hardening_1795183642533_a43f86`. Chúng tách biệt `bookora_db`; không phải fixture production. Integration tests dùng lifecycle disposable của helper hiện hữu.
- Final gate: source còn nguyên trong working tree để review; không còn việc implementation/verification bắt buộc đang chờ.

## 11. HOTFIX UI THEO PHẢN HỒI — 21/11/2026

**Hoàn tất đúng phạm vi UI được yêu cầu.** Không sửa API, nghiệp vụ, schema, permission, dispatch hoặc generated contract trong lượt hotfix.

| File Web | Thay đổi / lý do |
|---|---|
| `src/features/notifications/components/NotificationBell.vue` | Cursor pointer cho Bell/mark-read/retry/view-all; badge Admin primary navy, Customer primary green, chữ trắng |
| `src/features/notifications/components/NotificationRow.vue` | Cursor pointer cho toàn dòng và copy-code; dùng chung Bell + account page |
| `src/features/notifications/pages/AdminNotificationsPage.vue` | Bỏ Tabs; dùng filterableColumns/DataTableFacetedFilter hiện hữu, `multiple:false`, ba options Tất cả/Chưa đọc/Đơn hàng, initial Tất cả. Map UI filter sang query list hiện hữu, giữ search/sort/paging |
| `src/features/notifications/components/CustomerNotificationCenter.vue` | TabsList/Triggers rounded-none; cursor cho tab, mark-read, sort options, retry và paging |
| `src/features/notifications/notifications.css` | Cursor cho nút enabled trong vùng notification-admin, không thay shared Button/DataTable |
| `src/components/client/layout/ClientHeader.vue` | Badge giỏ desktop/mobile đổi nền primary green, chữ trắng |
| `src/components/client/layout/CustomerAccountSidebar.vue` | Thêm “Thông báo của tôi”, icon Bell, route `/account/notifications`; dùng được cả desktop sidebar và mobile sheet |

GitNexus: sidebar `items` LOW, 0 direct callers/processes; `handleQuery` mới chưa được index nên UNKNOWN, đã kiểm tra các nơi dùng trực tiếp. Final detect_changes MEDIUM gồm scope phase core có trước, không thêm API flow.

Verify hotfix:

- Targeted Vitest Notifications + ClientHeader + CustomerAccountSidebarAvatar: **6 files / 23 tests PASS, exit0**. Không thêm test chỉ để kiểm class CSS.
- `npm run build`: **PASS, exit0**, vue-tsc + Vite6350 modules, gồm CSS cuối. Vẫn có warning chunk-size hiện hữu.
- `git diff --check`: PASS. Không commit/push.
- Browser local fixture thật: Admin badge `rgb(15,23,42)` + white; Customer Bell/cart badge `oklch(0.38 0.095 148)` + white; computed cursor của Bell, rows, mark-read và footer là pointer.
- Admin không còn tab; filter mặc định Tất cả pressed, search “chưa” chỉ còn option Chưa đọc; đổi sang Đơn hàng chỉ một option pressed. Sau mark-all, Chưa đọc rỗng; Đơn hàng trả4 rows. DataTable shared không bị sửa.
- Customer tabs radius0px, rows pointer, sidebar link aria-current=page. Mobile390×844: document scrollWidth375, Bell/cart primary trắng đúng, mobile account sheet có menu Thông báo của tôi.
- Admin console không có error/warn. Customer tab có log từ iframe Turnstile lúc khởi động bằng env mặc định; lượt fixture UI chạy với cấu hình Turnstile tắt riêng trong process test. Không sửa cấu hình `.env` hay auth của server development.
- Runtime dùng `bookora_it_auth_hardening_1795243725337_bcbdf5`; một cart item được seed riêng trong DB fixture để kiểm badge thật. Không dùng dữ liệu app DB. Đã dừng đúng server fixture18000/15173/15174 bằng PID/command line; giữ nguyên server development8000/5173. DB fixture giữ lại, không reset/drop/truncate.

Ảnh kiểm chứng: `C:/Users/Admin/.codex/visualizations/2026/11/20/01a1f915-683b-7c72-b7c5-b14389626bc9/bookora-realtime-ui-hotfix/`:
`admin-bell.jpg`, `admin-filter-default.jpg`, `admin-filter-final.jpg`, `customer-bell.jpg`, `customer-badges.jpg`, `customer-page.jpg`, `customer-mobile.jpg`.

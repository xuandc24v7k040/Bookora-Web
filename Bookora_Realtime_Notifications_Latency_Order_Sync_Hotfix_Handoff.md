# Bookora — Realtime Notifications Latency & Order UI Sync Hotfix

## 1. STATUS

**BOOKORA — REALTIME NOTIFICATIONS LATENCY & ORDER UI SYNC HOTFIX — DONE (VERIFIED)**

Ngày21/11/2026, Asia/Ho_Chi_Minh. M01–M18 đã thực thi, API/PostgreSQL/Socket.IO thật và thao tác UI thật. Không commit/push/deploy.

- Bell p95 commit→UI: **3534,7 → 408,7 ms**.
- Order: baseline badge bên nhận vẫn PENDING sau cả20 thao tác; sau sửa **20/20 tự cập nhật**, p95 **370,1 ms**.
- Cộng uncertainty: p95 Bell **418,9 ms**, Order **380,3 ms**; đạt mục tiêu1000ms.
- API **942/942 unit**, **24/24 integration**; Web **47/47 targeted/component tests**. Các checks có script đều đạt, chi tiết mục8.

## 2. PREFLIGHT / AUTHORITY

| Repo | Root | HEAD đầu và cuối |
|---|---|---|
| Web | D:/CTU/CT466E/bookora-web/bookora-web | aa658a83000294df0e3447deae42cf3292592ab3 |
| API | D:/CTU/CT466E/bookora-api/bookora-api | 01ca5652dc373187530dfbb5a5ad47ee9cb48165 |

Đầu phase đã có Notifications core/UI hotfix: Web46, API36 modified/untracked files. Đã snapshot tất cả và SHA256 trước sửa tại C:/Users/Admin/AppData/Local/Temp/bookora-latency-evidence/baseline/manifest.json; source snapshots trong baseline/web và baseline/api. final-diff.json tách thay đổi hotfix: Web giữ nguyên hash45/46 baseline files (chỉ mở rộng main.ts); API giữ nguyên25/36,11 file mở rộng có chủ đích liệt kê mục5/7. Các file trước đây clean được review bằng diff riêng. Không coi whole HEAD diff là diff mới của phase này.

Đã đọc AGENTS/CLAUDE hai repo, RTK, scripts/schema và handoff Notifications/Orders/Receipt; source/runtime mới là authority. Auth, Gateway/Core, schema/migration, dependency, generated contract, Coupon/Flash Sale service và Notifications UI giữ hash baseline. Không sửa các phần đó trong hotfix.

App dev sẵn có5173/8000, PostgreSQL local/bookora_db; không ghi fixture vào DB app. Runtime test18000/15173/15174, PostgreSQL18.4 local, DB timezone Asia/Bangkok; SQL worker giữ quy đổi UTC. Cadence runtime **5000ms cả trước và sau**, không hạ interval để đạt latency.

Manual fixture DB được giữ lại:

- before: bookora_it_auth_hardening_1795246050820_d53f75.
- after lượt chẩn đoán: bookora_it_auth_hardening_1795247719537_cff2a8.
- after2 chính thức/manual: bookora_it_auth_hardening_1795249090465_2e146b.

Integration dùng helper disposable DB hiện hữu, tự dọn đúng DB do test tạo. Không reset/drop/truncate DB ứng dụng, không gọi provider thanh toán live.

## 3. ROOT CAUSE / LATENCY

| ID | Observed/source | Fix/risk |
|---|---|---|
| LAT-01 | NotificationWorker.onModuleInit interval5000; tick claim1batch, không wake sau commit; p95 commit→claim3450ms | Post-commit PostgreSQL hint đánh thức Order due-now qua worker canonical; giữ polling/locks/retry |
| LAT-02 | Persist→emit và socket nhanh; transport websocket thật | Giữ notification.changed/REST; fan-out giới hạn10 tránh hàng trăm emit tuần tự |
| SYNC-01 | Không có Order domain event | order.changed độc lập worker |
| SYNC-02 | main.ts chỉ BroadcastChannel/storage, không nối hai browser contexts | Shared-manager Orders bridge, scoped invalidation/reconcile |
| SYNC-03 | Admin previous data xuyên nhánh; mutation dùng branch sau await | Placeholder cùng scope; capture mutation keys trước request |
| SEC-01 | Bell processing audience khác Order read audience; detail có thể giữ stale data khi denied refetch | ACL riêng orders.read, reset protected queries, error/retry và dialog guard |

T0: click và request UI; T1/T2: transaction bắt đầu/Prisma promise hoàn thành sau COMMIT acknowledgement; T3: worker claim/persist commit; T4: publisher; T5: socket receive; T6: canonical REST data và badge DOM đúng. Bell correlate Notification ID + Order ID/type và badge thật, không suy count từ payload.

Server dùng performance.timeOrigin+performance.now. Mỗi browser document hiệu chuẩn5 clock requests, lấy RTT thấp nhất, offset midpoint, uncertainty=RTT/2. Không trừ Date.now giữa process mà bỏ qua lệch clock. Mỗi bộ20 committed events:10 Admin→Customer CONFIRMED,10 Customer→Admin CANCELLED, nhiều Orders khác nhau. p95 nearest-rank19/20; median trung bình hai điểm giữa. Không chạy build/test CPU song song khi đo chính thức.

Đơn vị ms. Ô số: **n; min / median / p95 / max**.

| Segment | Before | After chính thức (after2) |
|---|---|---|
| Commit→claim | 20; 430.8 / 2311.1 / 3450 / 4332.6 | 20; 3.7 / 17.5 / 36 / 69.4 |
| Claim→Notification commit | 20; 13.2 / 40.3 / 60.8 / 79.8 | 20; 133.6 / 184.9 / 208.6 / 228.3 |
| Persist→fan-out emit | 20; 0 / 3.5 / 10.8 / 13.5 | 20; 0 / 0.2 / 0.4 / 0.6 |
| Emit→Bell UI | 20; 18.6 / 41.4 / 58.9 / 257.3 | 20; 107.4 / 139.3 / 184.3 / 221.1 |
| Socket receive→Bell UI | 20; 19.5 / 37 / 55.1 / 244.3 | 20; 72.4 / 107.8 / 147.5 / 179.6 |
| Socket receive→Order UI | Không tự cập nhật; không có p95 hợp lệ | 20; 84.4 / 133.8 / 221.5 / 295.3 |
| Commit→Bell UI | 20; 501.2 / 2389.2 / 3534.7 / 4477 | 20; 254.8 / 347.5 / 408.7 / 454.5 |
| Bell + clock uncertainty | 20; 506.7 / 2399.5 / 3541.7 / 4484.2 | 20; 264.7 / 355.9 / 418.9 / 458.3 |
| Commit→Order UI | Không tự cập nhật; không có p95 hợp lệ | 20; 186.6 / 277.4 / 370.1 / 379 |
| Order + clock uncertainty | Không tự cập nhật; không có p95 hợp lệ | 20; 195.6 / 286.9 / 380.3 / 382.8 |
| Click→API success | 20; 48.6 / 71.4 / 200.1 / 219.7 | 20; 91.1 / 195.1 / 303.5 / 409.8 |
| Click→Bell UI | 20; 546.1 / 2463.9 / 3578.9 / 4692.5 | 20; 329.4 / 528.7 / 658.6 / 779.3 |
| Click→Order UI | Không tự cập nhật; không có p95 hợp lệ | 20; 261.2 / 416.2 / 654 / 703.8 |
| API request→response | 20; 24.7 / 45.7 / 147 / 165.7 | 20; 51.7 / 157 / 263.5 / 341.7 |
| Clock uncertainty | 20; 2.8 / 7 / 12.5 / 13.6 | 20; 3.8 / 9.3 / 13.5 / 20 |

Không gán0ms hoặc p95 giả cho baseline Order không cập nhật. DOM sau mỗi thao tác và before-admin-stale.jpg chứng minh stale20/20; không suy chỉ từ việc probe không ghi T6.

T4 branch trace là mốc fan-out cuối, không phải timestamp chính xác từng recipient. Raw before emit→socket có min−4,1ms trong biên clock/fan-out; đây không phải latency vật lý âm và không dùng làm gate. Client socket→UI dùng cùng browser clock. Gate commit→UI độc lập mốc emit, đã báo cả conservative clock margin. After có thêm Orders/ACL/refetch đồng thời nên không tuyên bố từng segment đều nhanh hơn; tổng latency đã đạt.

Lượt after chẩn đoán có thêm20 Bell samples (p95353,9ms), nhưng probe nhầm product items của detail với Order list. Không dùng lượt đó làm gate Order: đã sửa parser, đo lại20 mẫu mới after2. Full-page navigation dồn dập trong lượt chẩn đoán gặp giới hạn CSRF trước Order POST; các thao tác không commit không tính samples. Bộ chính thức dùng SPA chiều cancel, đủ20 successful commits online. Không cộng lượt đo/test lặp để tăng số PASS.

## 4. DESIGN / BOUND / IMPACT

signalOrderChange gọi parameterized pg_notify trong business transaction. PostgreSQL chỉ giao hint sau outer commit, rollback không phát và gộp payload trùng trong cùng transaction. Dùng pg sẵn có, không broker/dependency/schema mới. [PostgreSQL18 NOTIFY](https://www.postgresql.org/docs/18/sql-notify.html).

Order adapter có một dedicated LISTEN connection, timeout5s/reconnect backoff1–30s, queue coalesced1024 và timer cleanup/unref. Listener đánh thức worker và phát Order hint độc lập, không block HTTP bằng recipient fan-out. NotificationDispatch vẫn durable; worker tick/claim/unique dedupe/cursor/retry/UTC giữ vai trò canonical. Mất hint/crash: Notification poll phục hồi; Order là invalidation hint, reconnect/focus REST reconcile.

Impact trước edit: recordOrderStatusHistory **HIGH**,6 direct/19 reachable/3 process groups, đã cảnh báo user; placeCod/placeVnpay/confirmReceived LOW1 direct mỗi method; AppModule MEDIUM10 direct. Web stopOrderSync LOW1, submitDialog LOW0. Symbol Notifications mới ở phase trước chưa có trong index: UNKNOWN, không coi0 graph hits là an toàn; đã đọc source và test runtime.

detect_changes(scope=all) cuối phase: Web medium12symbols/5flows/20trackedfiles; API critical19symbols/19flows/18trackedfiles. Aggregate so với HEAD chứa cả phase trước, đã cảnh báo và đối chiếu manifest; không tự sửa các flow Auth/routing cũ để giảm graph warning. Không commit.

## 5. BACKEND / CHANGED FILES

| File (dưới API root) | Thay đổi hotfix |
|---|---|
| src/modules/orders/order-change-signal.ts | Hint transaction nhỏ, $executeRaw không deserialize PostgreSQL void |
| src/modules/orders/order-realtime.service.ts | LISTEN lifecycle, bounded publish và Order-view ACL |
| src/modules/orders/order-realtime.module.ts | Adapter Orders dùng core hiện hữu |
| src/modules/orders/order-status-history.ts | Signal khi fromStatus khác toStatus; giữ logic history/dispatch cũ |
| src/modules/checkout/checkout.service.ts | Signal COD/VNPay create trong transaction; idempotent return không signal thêm |
| src/modules/customer-orders/customer-orders.service.ts | Signal sau receipt claim/history; duplicate receipt no-op |
| src/modules/notifications/notification-worker.service.ts | wakeOrder đúng referenceId/due-now; queue1024,8batch/lượt rồi yield; claim cũ, poll5s, fan-out10; stop đợi active tick |
| src/modules/notifications/notifications.module.ts | Export worker để adapter đánh thức |
| src/app.module.ts | Đăng ký adapter sau Notifications |

Payload qua core: **order.changed {version:1, orderId, branchId}**. Không DTO/address/payment/token/recipient list. Core/Gateway giữ hash baseline, không import Orders; Chat vẫn reuse generic publisher.

Per-emit ACL: Customer owner; BRANCH user/assignment/branch active với orders.read. Gateway vẫn xác minh session/principal hiện hành. Không mở System audience/client-chosen rooms. Actor có thể nhận Order hint ở tab/thiết bị khác nhưng không tạo self Notification.

Bell giữ rule orders.read AND (orders.update_status OR orders.cancel), actor exclusion/eventKey/recipient dedupe. Staff không có quyền xử lý vẫn sync Order, Bell không mở rộng. Quyền note nội bộ hiện hữu không bị đổi.

VNPay PENDING_PAYMENT/PAYMENT_FAILED hint owner-only, không branch processing alert; verified paid→PENDING mới sync branch và notification đúng một lần. Không thay REST filters khi admin chủ động truy vấn unpaid Orders. Payment retry/failure/terminal/cancel vẫn qua history helper chung. Note-only không phát status giả. Receipt≠COMPLETED.

Giữ dueAt eligibility/cutoff/cursor100/SKIP LOCKED/backoff; future promotions không bị wake sớm. Hai worker vẫn dedupe bằng DB. Publish lỗi sau commit không rollback hoặc đổi HTTP success thành500.

## 6. FRONTEND / CHANGED FILES

| File (dưới Web root) | Lý do |
|---|---|
| src/features/orders/state/order-realtime.ts | Typed handler trên shared connection; batch30ms/queue1024; version/ID-shape validation, drop queued work khi scope đổi; exact detail và scoped lists |
| src/main.ts | Install/dispose Orders bridge một lần; BroadcastChannel/storage cũ dùng chung bridge |
| src/features/admin-orders/pages/AdminOrderListPage.vue | Chỉ reuse previous data cùng branch |
| src/features/admin-orders/pages/AdminOrderDetailPage.vue | Capture branch/order cache key trước await |
| src/pages/app/account/AccountOrderDetailPage.vue | Ẩn stale protected data/dialog khi denied refetch; loading/retry; cancel dialog theo allowed action; break-all mã dài ở390px |

Customer invalidate mọi list filter và exact detail(id). Branch chỉ current branch có orders.read, không global app invalidate. Reconnect/focus/visibility/online reconcile list+detail, throttle duplicate1s; reset observed protected data/in-flight queries khi session/identity đổi. Self-mutation set/refetch canonical result ngay. AbortSignal và branch keys giữ nguyên; không đổi status labels/receipt semantics/theme/tabs/table layout.

## 7. CONTRACT / TEST-ONLY FILES

Không migration/REST DTO/route/OpenAPI/Orval/Zod change. Generated/schema/lockfile hashes bằng baseline, generation N/A.

API test files mới: test/order-realtime.e2e-spec.ts, test/order-realtime.browser-runtime.ts, test/helpers/order-realtime-probe.ts. test/helpers/notification-environment.ts thêm configure callback và worker cleanup. Bốn service.spec.ts admin-orders/checkout/customer-orders/payments thêm mock $executeRaw, không bỏ assertions nghiệp vụ.

Web tests mới: src/features/orders/state/order-realtime.test.ts (7 cases), src/features/orders/customer-order-detail-realtime.test.ts (4 cases). Hai regression files customer-receipt-focus-hotfix.test.ts và phase17-order-list-refresh-review-textarea-hotfix.test.ts theo vị trí bridge mới.

Web test/realtime.vite.config.ts chỉ inject test/realtime-browser-probe.ts khi chạy explicit config đó. API probe chỉ có ở test bootstrap, không AppModule. Clock/IDs/status/DOM metadata không vào normal build; không log credentials/JWT/cookie/raw signed callback/PII DTO. Test socket controls có cleanup khi manager tạo connection mới.

## 8. AUTOMATED VERIFY

Lệnh chạy từ repo tương ứng, RTK prefix; counts ở lượt cuối, không cộng run lặp.

| Command | Kết quả cuối |
|---|---|
| API: rtk proxy npm test -- --runInBand | exit0;115 suites,942tests PASS |
| API: rtk proxy npm run test:e2e -- --runInBand --detectOpenHandles --testPathPatterns='(order-realtime\|notifications-http)' | exit0;2suites,24tests PASS; lượt này không còn Jest delayed-exit warning |
| API: rtk proxy npm run type-check | exit0 |
| API: rtk proxy npm run lint | exit0, không ESLint errors/warnings |
| API: rtk proxy npm run build | exit0;533files compiled |
| API: rtk proxy npx prettier --check [order signal/service/module, worker, e2e, browser-runtime, probe] | exit0,7files |
| Web: rtk proxy npm test -- src/features/orders src/features/admin-orders src/features/notifications src/lib/realtime | exit0;15files,47tests PASS |
| Web: rtk proxy npm run build | exit0;vue-tsc và Vite PASS |
| Hai repo: rtk proxy git diff --check | exit0 cả hai |
| analyze.cjs before --saved / after2; audit-runtime.cjs; verify-runtime.cjs; final-diff.cjs | exit0;20+20 samples,6campaign predicates,2VNPay orders dedupe và baseline attribution |

Integration bao phủ rollback/invalid409/no phantom, commit boundary, due-now wake, worker stop/restart missed-wake, Order độc lập worker, receipt no-op≠complete, note-only, publish failure không500,107 Customer promo recipients qua cursor100, competing workers, future dueAt, owner/branch/read-only/revoked ACL. Related Notifications suite kiểm tra invalid/duplicate/terminal VNPay, promotion eligibility, backoff/restart, Origin/JWT/rooms, readAt/unread/mark-all và future-domain generic publisher.

FE behavior/component:100 duplicate hints→một detail fetch, exact scoped keys, malformed/wrong branch, readonly permission, pending scope đổi, cancel late response, cleanup, reconnect/focus coalescing, identity reset và401/403/404 với cache từng có Order. Component test bắt và sửa cả cached Order code trong cancel dialog sau denied refetch.

Các lần fail ban đầu đã sửa/rerun: Prisma void→$executeRaw, inactive fixture phải bỏ isPrimary, đợi worker idle ở cursor test, SQL mocks/source assertions, Vue Query filter typing và formatter. Không tính lượt fail là PASS.

Web không có lint script. Schema/migration/generation checks N/A vì không đổi schema/contract. Còn warning không chặn gate: Vite chunk size hiện hữu, pg8 query deprecation trong integration fixture; một Vue BranchSelector class warning từ CartSidebar khi qua checkout. Không có unhandled browser JS errors. Không sửa Cart/BranchSelector ngoài bound để dọn warning.

## 9. RUNTIME / MANUAL M01–M18

Hai cookie-host contexts độc lập **Chromium/IAB**, localhost và127.0.0.1; không khai Chrome/Edge PASS. Browser connector chỉ cung cấp IAB, không dùng native Edge đang mở của user. Receiver metadata websocket/visibility=visible. Bộ chính thức cả hai1440×900; mobile390×844. Baseline/lượt chẩn đoán Customer1280×720, Admin1440×900 được ghi đúng kích thước đã quan sát.

| Case | Action → observed / evidence | Status |
|---|---|---|
| M01 | 20 before events, Bell chờ poll, receiver Orders PENDING; before.json/summary, before-admin-stale.jpg | PASS reproduce |
| M02 | Admin confirm khi Customer list mở sẵn→Đã xác nhận không F5; customer-list-confirmed.jpg | PASS |
| M03 | Packing/shipping→Customer detail Đang đóng gói/Đang giao hàng và actions đúng; after2.json/DOM | PASS |
| M04 | Customer List+Detail hai tab cùng sync CONFIRMED/SHIPPING; socket/REST/DOM | PASS |
| M05 | processing→shipping, receipt→received; ba đơn rời trang3/3 làm URL tự page2, Trang2/2; customer-list-page-clamped.jpg | PASS |
| M06 | Receipt→Admin list Khách đã nhận, detail mở Hoàn thành đơn, status vẫn SHIPPING; admin-receipt-still-shipping.jpg/audit | PASS |
| M07 | Admin complete sau receipt→Customer Hoàn thành, COD PAID; runtime/DOM | PASS |
| M08 | Customer cancel→Admin Đã hủy, readonly list/detail cũng sync; one Bell per processing recipient; after2-admin-cancelled.jpg/DB | PASS |
| M09 | Admin cancel CONFIRMED có reason→Customer Đã hủy/one notification, không self; DB/Bell DOM | PASS |
| M10 | UI cart→saved address→COD132000đ→Đặt hàng thành công; Admin list xuất hiện đúng branch; cod-arrived-admin-list.jpg | PASS |
| M11 | Unpaid owner Chờ thanh toán, Branch list đang mở row0; signed local callback hai lần→PENDING/PAID row, Bell33→34; vnpay-paid-once-admin.jpg/audit | PASS |
| M12 | A/B, Cashier confirm, delegated Staff packing; readonly nhận new/cancel Order nhưng Bell0; Staff OrderB safe error; readonly-order-sync-no-bell.jpg | PASS |
| M13 | Refresh rồi đổi Cần Thơ→Hậu Giang không placeholderA, chỉ rowB; detailA trong scopeB safe error; branch-b-only.jpg + cancellation tests | PASS |
| M14 | Revoke phiên CustomerA127→login/no Order heading; localhostA vẫn receipt. Logout→CustomerB không thấy OrderA/cache; revoked-session-login.jpg/account-switch-safe-order.jpg; forged/expired JWT integration | PASS |
| M15 | Disconnect hai Customer sockets, Admin đổi state→offline giữ cũ, connect tự REST reconcile. Stop worker: Order đổi nhưng Bell16, restart poll→Bell17; after2.json/stdin/DOM | PASS |
| M16 |20committed UI events after2,10mỗi chiều; cả20Bell/Order T6, upper p95<1000ms; after2-summary.json | PASS |
| M17 | PUBLIC/PUBLISHED future +PRIVATE/DRAFT/disabled/active; shipping song song; eligible2CUSTOMER mỗi campaign, không early/trùng/branch promo; runtime-promo-before/after, runtime-assertions.json | PASS |
| M18 |1440×900,390×844 list/Bell/detail; mã dài không tràn (docWidth375≤390), green/navy và số trắng; mobile-orders/mobile-bell/mobile-order-detail-fixed.jpg | PASS |

Các401/403/404/revoke là negative cases hoặc phiên hết hạn trong manual dài, không tính latency online. Một tab expired gặp CSRF_INVALID khi refresh và reset content; đã bổ sung safe retry/error view, xác minh phiên hợp lệ phục hồi; không sửa Auth/session policy. Bộ đo chính thức chỉ20 successful commits online.

Evidence ảnh + JSON copy: **C:/Users/Admin/.codex/visualizations/2026/11/20/01a1f915-683b-7c72-b7c5-b14389626bc9/bookora-order-latency**. Ảnh ở root; JSON/manifest/analysis scripts trong evidence/. Bản làm việc gốc C:/Users/Admin/AppData/Local/Temp/bookora-latency-evidence. Không có raw credentials/signature trong evidence.

## 10. FINAL GATES / LIMITS / CLEANUP

- [x] Baseline/source/DB và before measurements có trace.
- [x] Durable dispatch/UTC/locks/dedupe/retry/cursor/poll giữ đúng, fast wake sau commit.
- [x] Order hint độc lập, per-session owner/read ACL, core reusable.
- [x] Customer/Branch list/detail/actions/receipt/filters/paging tự sync, actor tabs và self mutation.
- [x] Offline/reconnect/worker restart/branch/account switch/logout/revoke có evidence.
- [x] Automated/integration/static/diff gates đạt; M01–M18 đã làm.
- [x] p95 commit→Order/Bell≤1000ms normal local online với clock margin.
- [x] Một handoff Markdown, không Git writes/deploy/destructive app DB/generated hand-edit.

Verify topology một API process. LISTEN cần connection/session PostgreSQL ổn định, không transaction pooling không hỗ trợ LISTEN. Hint best effort có missed-wake window; Notification poll và Order reconnect/focus REST phục hồi. Core Socket.IO chưa có cluster adapter: không suy kết quả local thành bảo đảm multi-instance/WAN. Trước scale cần cross-instance Socket.IO delivery riêng, không thêm broker trong hotfix.

Không hứa1000ms khi offline/contention/process restart/session hết quyền. Note-only khác thiết bị giữ policy hiện hữu, không redesign workflow.

Các tab của lượt manual cuối đã đóng và viewport mobile reset sau lưu ảnh. Chỉ dừng process test sở hữu18000/15173/15174; giữ app dev5173/8000. Ba manual DB giữ để audit. Probe chỉ explicit test bootstrap/config, không production import.

**Kết luận: DONE (VERIFIED), code ở local working trees, chưa commit/push/deploy.**

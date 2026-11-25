# Bookora Customer Support Chat — Phase 2 Handoff

## 1. STATUS / GATE

**BOOKORA — CUSTOMER SUPPORT CHAT — PHASE 2 & FULL CHAT — DONE (VERIFIED)**

Nghiệm thu ngày 25-11-2026, múi giờ Asia/Saigon. **30/30 G2 PASS**. Đây là kết quả UI thật và kiểm tra trên mã nguồn local; không tái sử dụng số liệu Gate 1 làm Gate 2. Không commit/push.

## 2. PREFLIGHT / SOURCE / ENVIRONMENT

- Đã đọc toàn bộ Master Spec v1.0.0 (decision lock 2026-11-23), Phase 2 BOUND→VERIFY→DONE prompt, Phase 1 Handoff và hai ảnh đính kèm Customer green/Admin navy. Ảnh là tham chiếu bố cục; không sao chép danh tính, đơn hàng, ưu tiên hoặc SLA minh họa.
- Web: `D:/CTU/CT466E/bookora-web/bookora-web`, master, HEAD `54c463f695861d5cc9d32d13cd33f5e957f68e9a`.
- API: `D:/CTU/CT466E/bookora-api/bookora-api`, master, HEAD `df4e47052de77387094c82d1fc9528871bd3479c`.
- Phase 1 đã có code/contracts và nhiều thay đổi chưa commit. Giữ các thay đổi sẵn có trong AGENTS/CLAUDE, migration/Prisma, auth grants, Realtime Core, R2 và generated contracts. Diff so với HEAD chứa cả Phase 1; không coi toàn bộ diff là Phase 2.
- Baseline: [web-baseline.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/web-baseline.json), [api-baseline.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/api-baseline.json); trạng thái cuối đầy đủ: [final-metadata.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/final-metadata.json). Không thêm thư viện.
- UI `http://localhost:5173`, API `http://localhost:8000/api/v1`; app PostgreSQL 18.4 `localhost:5432/bookora_db`; Socket.IO shared /realtime, thực tế WebSocket. R2 dùng cấu hình private hiện hữu, không công khai bucket/key.
- Hai context QA độc lập: Customer trong in-app Chromium và Branch Admin/Staff trong Edge Profile 1. Chrome có phiên người dùng sẵn có được giữ đăng nhập; chỉ kiểm tra draft rồi hủy, không gửi tin bằng tài khoản đó. Phiên bản thực tế: {"customer":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36","admin":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36 Edg/158.0.0.0","customerContext":"in-app Chromium","adminContext":"Edge Profile 1","performanceViewport":"1440x900","api":"localhost:8000/api/v1","database":"localhost:5432/bookora_db","transport":"shared Socket.IO WebSocket"}.
- Turnstile/CSRF/JWT/guards giữ bật. Đăng nhập bằng form thật, không chèn token hay bỏ qua CAPTCHA. Quyền hoàn tất CAPTCHA QA đã được người dùng xác nhận.

## 3. INTEGRATION WATCHLIST A–D / CHANGED FILES / IMPACT

| ID | Finding và xử lý | Verification |
|---|---|---|
| IN-A | Migration Support có trong source nhưng chưa áp dụng app DB. Đã backup custom archive 380.692 byte, kiểm tra pg_restore --list, chạy forward prisma migrate deploy qua test/support-phase2-migrate.cjs. Bảng public 56→61; migration history 34→35 (33 thư mục migration hiện tại). | Snapshot ngay trước/sau migration xác nhận các hàng lịch sử không đổi; thêm đúng 4 Support grants cho BRANCH_ADMIN. Prisma status cuối: up to date. |
| IN-B | Thiếu exact ORDER resolved-history lookup. Thêm filter orderId vào SupportTicketQueryDto/repository list và nullable orderCode vào summary. UI tìm active trước, rồi RESOLVED đúng order/owner; reopen/new là hai lựa chọn riêng. | Real completed order: resolved→history→reopen OPEN/unassigned; new chỉ tạo khi first send. E2E owner/foreign/order chính xác. |
| IN-C | UI manage cần eligible picker không phụ thuộc HR API. Thêm GET /support/assignees, effective current-branch read/manage guard; trả ID/name, phân trang/search. Eligible phải active branch assignment + effective read/reply, DENY thắng ALLOW/role. | Manager không staff.read, không reply vẫn dùng picker và reassign; Staff bị revoke bị loại; người không có Support bị từ chối. |
| IN-D | Safe Support context tách khỏi full Orders authority. GENERAL không tạo Order card. Full products/payment/shipping và Order link chỉ qua existing Orders query khi effective orders.read + canViewOrderDetail. Media qua authorized private proxy→Blob. | Support-only không có phone/address/link; Orders viewer có đúng dữ liệu QA. Foreign/cross-branch/revoked file GET đều fail closed; Blob URL bị revoke. |

Các nhóm file Phase 2 và lý do:

| File/nhóm | Thay đổi |
|---|---|
| src/features/support/api/*, state/* | Typed API/query keys theo owner/branch/generation; store dùng shared connection, stable optimistic/canonical merge, delta recovery, read/unread/typing, scope cleanup và khôi phục ý định điều hướng sau xác thực lại. |
| src/features/support/components/*, pages/SupportInboxPage.vue, support.css | Customer host/prechat/list/thread/composer/private media/actions/context; Inbox navy responsive; Customer green. Memo hóa từng message với dependency read receipt/delivery/error/quyền và previous message để tránh render lại cả lịch sử. |
| src/App.vue, src/main.ts | Một global host, một attachment vào realtime manager hiện hữu cho mỗi tab. |
| src/router/index.ts, authorization/admin-menu.ts, admin-permissions.ts, permission-labels.ts, SidebarNav.vue | Route/menu/effective Support permissions; chỉ override token sidebar của mục Support sang navy. |
| AccountOrdersPage.vue, AccountOrderDetailPage.vue | CTA mở cùng host ORDER; wrap mã đơn dài trên mobile, không sửa rộng layout Orders. Các tests Orders liên quan thêm fixture/mock capability cho CTA mới. |
| API src/modules/support/dto/support.dto.ts, support.controller.ts, support.service.ts, support.repository.ts | Exact order history, safe orderCode và eligible assignee contract nêu trên; giữ các endpoint/socket cũ. |
| API support-file-validation.ts, support-files.service.ts | Chuẩn hóa ZIP MIME Windows application/x-zip-compressed chỉ cho .zip, vẫn kiểm tra cấu trúc file. So sánh staging expires_at với UTC vì Prisma timestamp lưu UTC trong DB có timezone +07. |
| Web/BE generated OpenAPI/Orval/Zod | Chỉ sinh qua scripts chính thức; giữ parity với API export, không sửa tay generated file. |
| test/support-phase2*.{ts,cjs}, support-file-mime.e2e-spec.ts, support-files.e2e-spec.ts | Fixture local có guard, backup/migration preflight, contract/security/file regression, cleanup chỉ dữ liệu thuộc manifest QA. |

Đã chạy upstream impact trước các symbol edit. Index cũ chưa có nhiều symbol Phase 2 nên trả UNKNOWN, không diễn giải thành zero risk. File AccountOrdersPage được báo LOW; file validation/expiry có blast radius LOW trong Support. Đã reindex bằng --index-only để giữ nguyên AGENTS/CLAUDE và chạy detect_changes cuối; xem [gitnexus-final.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/gitnexus-final.json). Không chỉnh Auth/Orders/Realtime Core ngoài các điểm tích hợp đã nêu và thay đổi Phase 1 có sẵn.

**Scope caveat:** detect_changes xếp toàn bộ tracked diff chưa commit là HIGH, gồm Auth/Realtime/R2/permission catalog có sẵn từ Phase 1; đã đối chiếu baseline và không bỏ qua cảnh báo này. Công cụ không bao phủ đầy đủ untracked files. Vì vậy các file Support mới được kiểm riêng bằng index mới, upstream impact, full status manifest và tests/UI nêu trong báo cáo; không tuyên bố graph chứng minh zero risk. Generated OpenAPI lớn bị analyzer bỏ qua theo giới hạn file mặc định, được kiểm bằng contract parity/generation/typecheck thay thế.

File-level impact trên index mới: support.store.ts **MEDIUM / 13 direct consumers**, SupportThread.vue **LOW / 3 direct consumers**; API eligibleAssignees **LOW / 1 direct caller, 2 total affected symbols** trong Support. Symbol useSupportStore riêng vẫn UNKNOWN do graph extraction, nên dùng file-level result và source review, không gán zero risk. Không chỉnh code sau các scope checks này.

## 4. CONTRACT / BACKEND

- GET /support/tickets thêm optional exact orderId; response summary thêm orderCode: string|null. Owner/branch scope vẫn do server áp đặt.
- GET /support/assignees (operationId supportAssigneesList): current-branch effective support.read + support.manage; safe ID/name, không expose HR/PII khác. Reassign vẫn xác thực lại eligibility phía server.
- ZIP alias và UTC expiry là runtime fixes, không nới giới hạn 10 MiB hay bỏ xác minh byte/extension.
- Socket version/schema giữ nguyên; dùng typed on/emit của RealtimeConnection hiện hữu, không thêm client hoặc worker cho chat.
- OpenAPI/Orval/Zod sinh lại thành công. Parsed API docs/openapi.json và Web openapi/bookora.openapi.json trùng khớp; parity fingerprint `e25368f1f21dd0ec3f96460b0c17e4eb59ee432c3c0cfb98e8cab9d268b57aac`.
- Gate 1 targeted regression được chạy lại thật: 4 e2e files / **29 tests**; không cộng lại các lần chạy lặp hoặc nhận 402 tests Phase 1 thành số Gate 2.

## 5. WEB FEATURE / STATE / UX

Global CustomerSupportHost phục vụ Home/Product/Account/Orders. Guest dùng existing login/guard; mở launcher/CTA/chọn branch/file không tạo ticket. GENERAL xác nhận branch; ORDER lấy branch từ owned Order. Compact, expanded hai pane, mobile full viewport; minimize/close/back giữ hành vi rõ ràng.

List cursor/search/filter được patch trực tiếp khi có ticket/message event, kể cả searched lists. Append-only historical match đã được server xác nhận được giữ; không refetch cả thread cho mỗi message. Optimistic bubble dùng clientMessageId; canonical HTTP/WS merge theo stable identity, retry giữ cùng ID. Payload lớn contentOmitted kéo bounded afterSequence delta. Paging cũ giữ anchor, incoming khi đọc lịch sử chỉ hiện Tin nhắn mới.

Read watermark chỉ tăng khi message thực sự hiện trong viewport và tab visible; batch 160ms, chỉ Customer/assignee đúng context tạo seen. Typing debounce 200ms, throttle 1s, idle stop 2s và TTL tối đa 3,5s; không phát theo mỗi phím. Unread chat độc lập Notification Bell.

Reset phiên/owner/branch/quyền hủy requests, query cache, typing, pending draft và Blob URLs ngay. Sau session recovery, chỉ giữ navigation intent (ticket/order ID, layout) và chỉ nạp lại từ API khi shared socket đã xác thực cùng user/branch; không phục hồi dữ liệu riêng tư cũ. Revoke/đổi user/branch hủy intent. Tests bao phủ cả Order lookup đang dở và read access bị thu hồi.

Composer giới hạn 4.000 Unicode code points, tối đa 5 tệp/message và 10 MiB/file; có progress/cancel/retry, file-only, emoji, Enter/Shift+Enter và composition guard. Admin có atomic claim, bỏ nhận, resolve, reassign eligible, takeover theo quyền; chỉ assignee có effective reply được trả lời.

## 6. SECURITY / APP DB / R2

- DB migration evidence: [db-before.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/db-before.json), [db-after.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/db-after.json), [backup.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/backup.json), [migration-deploy.log](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/migration-deploy.log), [api-migration-status.log](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/api-migration-status.log). Backup kiểm tra archive listing; không tuyên bố đã restore thử backup.
- Các fixture dùng run ID riêng, 8 users/2 branches/4 COD orders/1 product; không inventory/payment thật, không VNPay/marketing campaign. Only QA PENDING order được xác nhận qua Orders UI để kiểm tra realtime.
- Effective Support và Orders được tách; Customer foreign/branch switch/content sau revoke fail closed. Scope key có user + owner hoặc branch + generation; abort và cleanup ngăn late response đưa dữ liệu cũ trở lại.
- R2 ảnh/PDF/video/DOCX/ZIP có private content authorization hiện hành. Không URL bucket public; Blob URLs được revoke khi đóng/unmount/reset. PDF native viewer có thể bị trình duyệt/CSP từ chối; nút tải xuống vẫn hoạt động.
- Test-owned cleanup đã áp dụng: **10 R2 objects** được xóa và HeadObject xác nhận 404; **5 tickets / 269 messages**, 8 users, 2 branches, 4 orders và các FK QA liên quan được xóa. Chỉ dùng manifest ID + guard email/run/branch/product + owned FK closure, không reset/drop/truncate app DB. Fingerprints của tất cả non-fixture rows trước/sau cleanup bằng nhau: **true**. Dữ liệu người dùng phát sinh đồng thời trong quá trình QA được giữ nguyên.
- Cleanup plan/result: [cleanup-plan.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/cleanup-plan.json), [cleanup-result.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/cleanup-result.json). Đây là đối chiếu preservation tại thời điểm cleanup, tách với đối chiếu lịch sử ngay sau migration.

## 7. AUTOMATED / CONTRACT / BUILD

Kết quả cuối: API **49 unit + 29 e2e**; Web **190 tests trong 30 files**. Các bộ này không trùng nhau; những lần chạy targeted trước đó chỉ là iteration, không cộng vào aggregate. FE không có lint script. Web build bao gồm vue-tsc -b; API type-check/lint/build, Prisma validate/status, docs pipeline và hai diff checks đã chạy thật.

| Check | Command thực tế | Exit |
|---|---|---|
| api-typecheck | `rtk npm run type-check` | 0 |
| api-lint | `rtk npm run lint` | 0 |
| web-thread-test-recheck | `rtk npm test -- src/features/support/components/SupportThread.test.ts --maxWorkers=1` | 0 |
| api-build | `rtk npm run build` | 0 |
| api-prisma-validate | `rtk npm run prisma:validate` | 0 |
| api-migration-status | `rtk npx prisma migrate status` | 0 |
| api-unit | `rtk npm test -- --runInBand --json --outputFile=C:\Users\Admin\AppData\Local\Temp\bookora-support-phase2-evidence\api-final-unit.json src/modules/auth/auth.service.spec.ts src/modules/auth/guards/csrf.guard.spec.ts src/modules/auth/strategies/jwt-access.strategy.spec.ts src/shared/storage/r2-object-storage.service.spec.ts` | 0 |
| api-support-e2e | `rtk npm run test:e2e -- --runInBand --json --outputFile=C:\Users\Admin\AppData\Local\Temp\bookora-support-phase2-evidence\api-final-support-e2e.json test/support-chat.e2e-spec.ts test/support-files.e2e-spec.ts test/support-file-mime.e2e-spec.ts test/support-phase2.e2e-spec.ts` | 0 |
| api-openapi | `rtk npm run docs:check` | 0 |
| web-generate | `rtk npm run gen:api:local` | 0 |
| web-tests | `rtk npm test -- src/authorization/admin-identity.test.ts src/authorization/admin-menu.test.ts src/authorization/permission-policy.test.ts src/layouts/ClientAuthLayout.test.ts src/layouts/ClientLayout.test.ts src/layouts/CustomerAccountLayout.test.ts src/layouts/DashboardLayout.test.ts src/router/client.routes.test.ts src/router/customer-auth.routes.test.ts src/router/guest-route-recovery.test.ts src/router/index.test.ts src/features/notifications/notification-realtime.test.ts src/lib/realtime/connection.test.ts src/lib/realtime/session.test.ts src/lib/realtime/support-contract.test.ts src/features/orders/state/order-realtime.test.ts src/features/support/components/SupportComposer.test.ts src/features/support/components/SupportOrderContact.test.ts src/features/support/state/support-messages.test.ts src/features/support/state/support.store.test.ts src/pages/app/account/AccountAddressesHotfix.test.ts src/pages/app/account/AccountOrderDetailCancel.test.ts src/pages/app/account/AccountOrderReceiptConfirmation.test.ts src/pages/app/account/AccountOrderReviewActionHotfix.test.ts src/pages/app/account/AccountOrdersHotfix7.test.ts src/pages/app/account/AccountPhase3.test.ts src/pages/app/account/AccountReviewsDeleteDialog.test.ts src/pages/app/account/CustomerAccountUiHotfixContract.test.ts src/features/support/components/SupportContext.test.ts src/features/support/components/SupportThread.test.ts --maxWorkers=1 --reporter=json --outputFile=C:\Users\Admin\AppData\Local\Temp\bookora-support-phase2-evidence\web-final-tests.json` | 0 |
| web-build | `rtk npm run build` | 0 |
| web-diff-check | `rtk git diff --check` | 0 |
| api-diff-check | `rtk git diff --check` | 0 |

Lệnh Vitest/Jest đầy đủ và thời lượng nằm trong [checks-final.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/checks-final.json); reports [web-final-tests.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/web-final-tests.json), [api-final-unit.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/api-final-unit.json), [api-final-support-e2e.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/api-final-support-e2e.json). Build có cảnh báo chunk lớn đã tồn tại ở bundle Admin/catalog; không coi cảnh báo là lỗi hay tuyên bố đã tối ưu toàn bộ bundle. [web-build.log](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/web-build.log), [api-openapi.log](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/api-openapi.log), [web-generate.log](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/web-generate.log).

## 8. REAL BROWSER EVIDENCE — 30 CASES

Tất cả thao tác là UI thật trên local app API/DB/R2. Dùng synthetic QA identities/media; đăng nhập form thật, CSRF và permission guards bật. Các fault injection (giữ response sau commit, ngắt WebSocket, throttle upload, instrumentation DOM) chỉ phục vụ phép thử và đã được gỡ. Không dùng direct API send thay click để tính latency.

| ID | Result | Hành động / quan sát |
|---|---|---|
| G2-01 | PASS | Guest launcher redirected to existing login with safe return intent; genuine Customer UI login succeeded after Turnstile. No Support ticket created by entry. |
| G2-02 | PASS | Actual Home expand/minimize/close; SPA Product -> Account -> Orders, launcher one and active ORDER retained; same host opened from Order CTA. Existing shared socket manager reused. |
| G2-03 | PASS | GENERAL selected explicitly at QA Ninh Kiều branch; first real text/emoji created the ticket; canonical sender bubble and actual admin receipt observed. |
| G2-04 | PASS | Actual Orders list CTA while storefront real Cần Thơ differs from QA order Ninh Kiều selects exact owned ORDER/branch in single global host; no ticket created on entry. |
| G2-05 | PASS | Actual Order Detail contact tested COMPLETED, CANCELLED and PENDING_PAYMENT; cancelled shows exact prechat/create-on-first-send, completed/pending-payment show exact active history; status/payment untouched. |
| G2-06 | PASS | Repeated pending-payment CTA from Detail and Orders list selects same canonical ticket 01M877648JR9RXJF7HZJDVQPS4 and prior message history; one host, five QA tickets total. |
| G2-07 | PASS | Completed ORDER was resolved, explicitly reopened to OPEN/unassigned and reclaimed. Resolved again; exact Orders CTA returned resolved history without composer and with both choices. Tạo yêu cầu mới created a separate request only on first send. |
| G2-08 | PASS | Actual Unicode/4000 emoji canonical message and 4001 disabled; file-only 5 attachments, sixth rejected; 10 MiB+1 rejected with observed feedback; invalid EXE rejected. |
| G2-09 | PASS | Real GENERAL history loaded older cursor page; scroll offset increased by inserted content height. New Customer message did not jump while reading past; Tin nhắn mới button returned to bottom. |
| G2-10 | PASS | Hidden/minimized chat unread separate Bell. SPA Home/Product/Account/Orders one host; genuine prior logout and foreign/revoked sessions cleared tickets/media, old Blob unusable and protected content denied. |
| G2-11 | PASS | Branch Inbox filters/search/branch tested. Empty searched OPEN list received new pending-payment ORDER ticket without refresh; claim removed it from OPEN and IN_PROGRESS filter showed canonical status. Other branch cleared cache and protected GETs returned404. |
| G2-12 | PASS | Two independent authenticated Staff and Branch Admin native UI claim requests were held then released together. Staff HTTP 201, Admin 409; one assignee, winner composer enabled, loser refreshed read-only with conflict message. |
| G2-13 | PASS | Support-only assigned Staff sent a real reply. Other effective support.read/reply manager remained read-only until explicit reassignment. |
| G2-14 | PASS | Real Support assignee picker listed only active reply-capable Branch Admin/Staff. Reassigned to Branch Admin via UI; former Staff composer disappeared without reload and new assignee composer enabled. |
| G2-15 | PASS | Resolve visible both contexts; Customer explicit reopen GENERAL -> OPEN unassigned; Admin no composer until claim; actual confirmed Bỏ nhận xử lý -> OPEN/no composer; claim again, no F5. |
| G2-16 | PASS | Existing Staff permission editor granted support.read/claim/reply only in QA branch and explicitly denied orders.read. New Staff login showed Support menu/inbox; appeared in real eligible picker, was assigned through UI and sent a real reply without full Order PII/link. |
| G2-17 | PASS | Support-only Staff ORDER context shows safe order code/status, no receiver phone/address or Order link. Branch Admin orders.read context shows actual products/payment/receiver and correct existing guarded Orders link. |
| G2-18 | PASS | GENERAL context identity, branch, subject, assignee and real activities, no fake Order/product/shipping card. Private media ACL verified on ORDER. |
| G2-19 | PASS | Final real UI 40 text sends (20 each direction) on GENERAL with 122 loaded messages and ORDER; calibrated DOM visible recipient P95 516.87 ms, optimistic P95 18 ms; pre-optimization outliers retained. |
| G2-20 | PASS | Final 12 idle trials/direction: UI typing P95 380.76/277.24ms. Blur and automatic 2s idle remove indicator. Real 14-key sequence produced bounded typing start/stop; only current assignee/Customer, no phantom indicator after revoke/reassign. |
| G2-21 | PASS | Customer message remained Đã gửi when unassigned Staff read OPEN ticket; after claim and actual visible read it became Đã xem. Minimized chat received badge1 without seen; Bell stayed separate at1. Reassignment cleared former-assignee reply/receipt context. |
| G2-22 | PASS | Real private R2 JPEG/PNG/WebP/PDF/MP4/WebM/DOCX/ZIP via UI. Large inline/lightbox, MP4 and WebM readyState4/no media errors/blob URLs; PDF viewer fallback and actual PDF/DOCX/ZIP downloads. |
| G2-23 | PASS | Throttled real multipart upload of an 8 MiB valid ZIP. Customer sent text during upload; Admin received it while upload progress and cancel action remained visible. Cancel removed the staged item; network conditions restored. |
| G2-24 | PASS | Blocked only socket.io for 147.1 seconds; HTTP replies persisted and reached Customer during outage. After unblock the existing tab recovered missing P2-RECOVERY-1 exactly once via afterSequence, without refresh. |
| G2-25 | PASS | Real POST response 201 was held after commit, DB row count=1 and Customer rendered it while sender WS blocked. HTTP timed out to failed bubble; actual Gửi lại reused identical clientMessageId and recovered one canonical bubble in each UI. |
| G2-26 | PASS | Actual Staff permission editor changed support.read to DENY while Staff displayed a private photo. Realtime session refresh removed protected UI/cache, revoked Blob URL; authenticated private content GET with same branch failed closed. |
| G2-27 | PASS | Final live six viewports (320x568,390x844,768x1024,1366x768,1440x900,1920x1080): no horizontal page overflow, full-screen mobile, close/back/composer visible, expanded two-pane tablet/desktop. Scoped Order-code wrapping fixes Orders 320px overflow; long text/media verified earlier. |
| G2-28 | PASS | Final 1440/1366 navy 3-column Inbox with large private inline image, safe Order context; tablet 768 list/thread + context Sheet; mobile390 list↔thread native Back and selection, composer reachable, page no horizontal overflow. |
| G2-29 | PASS | Real Chromium IME composition/Enter, Shift+Enter newline, emoji Escape/focus, 14 Tab steps trapped, chat Escape returns launcher; reduced-motion matchMedia=true while real typing visible plus scoped CSS review (wrapper spans observed, individual dot computed style not separately measured). Blur removes indicator. |
| G2-30 | PASS | Actual Admin Orders UI confirmed only QA COD pending order; independent Customer Order Detail updated to Đã xác nhận without refresh while shared Support session remained active. Bell observed separately. |

Evidence chi tiết (raw timing, request/DOM/DB checks, claim race, history, revocation, foreign, branch switch, downloads, screenshots): [browser.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/browser.json). Screenshot cũ trong thư mục là iteration, **ảnh -final- mới là evidence bố cục cuối**.

Customer: [320×568](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/customer-final-320x568.jpg), [390×844](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/customer-final-390x844.jpg), [768×1024](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/customer-final-768x1024.jpg), [1366×768](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/customer-final-1366x768.jpg), [1440×900](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/customer-final-1440x900.jpg), [1920×1080](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/customer-final-1920x1080.jpg). Home: [Customer Home expanded](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/customer-home-final.jpg).

Admin: [1440×900](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/admin-final-1440x900.jpg), [1366×768](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/admin-final-1366x768.jpg), [768×1024](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/admin-final-768x1024.jpg), [390×844](C:/Users/Admin/AppData/Local/Temp/bookora-support-phase2-evidence/admin-final-390x844.jpg). Ảnh desktop có ảnh sách inline lớn và context đúng Order; tablet có context Sheet; mobile list↔thread/composer đã thao tác. Orders 320px có mã dài đã wrap, không tràn ngang.

IME được kiểm bằng **Chromium composition thật qua CDP Input.imeSetComposition**, ghi nhận keydown Enter isComposing=true và số bubble không tăng, rồi committed Enter gửi một tin tới recipient; không gọi đây là kiểm thử gõ vật lý UniKey/Telex. Shift+Enter giữ newline, 14 Tab steps không thoát dialog, Escape popover/chat trả focus đúng. Reduced-motion được bật khi hiển thị typing (matchMedia=true); đối chiếu scoped CSS tắt animation/transition. DOM diagnostic đã đo wrapper spans, không dùng nó làm phép đo computed style của từng dot i.

Một số native pointer attempts lúc layout/scroll vừa thay đổi không phát request mong đợi; các lần đó không được tính PASS. CTA cuối được kích hoạt bằng bàn phím trên control thật và xác nhận owned-context request/canonical thread, ngoài các lần mouse interaction đã chạy trước đó. Session-recovery navigation có 3 automated cases và browser reload/CTA smoke; không tuyên bố đã ép live token expiry ở lượt cuối.

## 9. PERFORMANCE / METHODOLOGY / OUTLIERS

Mốc bắt đầu là capture của native click nút gửi; mốc cuối là bubble thật có kích thước, document visible và giao với viewport thread. MutationObserver kết hợp instrumentation setter scrollTop gọi setter gốc rồi đọc geometry, để không nhầm lần DOM mount ngoài vùng nhìn hoặc native scroll event bị browser trì hoãn là recipient visible. Gỡ toàn bộ observer/listener/setter sau đo.

Hai performance.now() được hiệu chỉnh về cùng controller monotonic clock bằng 10 mẫu midpoint/minimum-RTT trước và sau mỗi nhóm. Tính relative offset giữa hai browser nên controller runtime reset không đổi miền thời gian tương đối. Lưu RTT, before/after drift và toàn bộ raw samples trong finalPerformance/finalMeasurements. Không trừ performance.now() giữa hai process khi chưa calibration. Không coi WS frame/API ACK là thời gian render.

40 text-only sends, **20 mỗi chiều**, 20 trên GENERAL với 122 messages loaded và 20 trên ORDER. Stable online, không chạy build/index/lint đồng thời phép đo. Đơn vị ms; P95 nearest-rank, không báo P99 vì ít mẫu.

| Đo | n | min | P50 | P95 | max |
|---|---:|---:|---:|---:|---:|
| Recipient, cả hai chiều | 40 | 73.93 | 142.75 | 516.87 | 859.63 |
| Recipient Customer→Admin | 20 | 85.33 | 161.35 | 549.83 | 859.63 |
| Recipient Admin→Customer | 20 | 73.93 | 126.18 | 242.23 | 264.87 |
| Sender optimistic, cả hai chiều | 40 | 2.70 | 6.20 | 18.00 | 67.30 |
| Optimistic Customer | 20 | 2.90 | 4.15 | 12.90 | 13.00 |
| Optimistic Admin | 20 | 2.70 | 9.60 | 22.10 | 67.30 |

Recipient P95 đạt ≤1.000ms. Sender bình thường ≤50ms; **một mẫu 67,30ms được giữ**, không tuyên bố tất cả mẫu dưới 50ms. Lượt trước tối ưu có GENERAL P95 khoảng 2.846,59ms và optimistic outlier 235,8ms; giữ nguyên preOptimizationPerformance/Measurements/Latency. Sau memo hóa, đo lại toàn bộ 40 mẫu thay vì loại những mẫu chậm để đạt gate. Lượt typing trước có một mẫu 1.307,09ms cũng giữ trong typingSummary cũ.

| Typing UI sau idle | n | min | P50 | P95 | max |
|---|---:|---:|---:|---:|---:|
| Customer→Admin | 12 | 229.86 | 244.46 | 380.76 | 380.76 |
| Admin→Customer | 12 | 234.04 | 244.44 | 277.24 | 277.24 |

Typing đo input event→recipient status DOM, 12 trials mỗi chiều, idle 1,1s trước trial, blur/idle stop thật. Một chuỗi 14 phím tạo 1 start/1 stop; không có per-keystroke flood. Không đo tách riêng backend signal/HTTP→WS/WS→render cho bộ số này, không suy diễn thời gian các đoạn chưa đo.

WebSocket-only outage **147.11s**, HTTP còn dùng được. Tin persisted bị bỏ lỡ được khôi phục một lần bằng afterSequence, không F5. Recovery observation upper bound **37.61s**; đây là giới hạn trên do thời điểm kiểm tra, không phải latency reconnect chính xác. Hai lần outage thử trước không hợp lệ được giữ riêng, không tính PASS. Hold real HTTP201 sau DB commit + sender WS blocked→timeout→retry cùng clientMessageId: DB và hai UI chỉ có một canonical message.

## 10. REGRESSION / SAFETY / CLEANUP

Existing Orders confirm trên fixture đồng bộ Customer Detail/Bell thật khi chat đang hoạt động; unread chat tách Bell. Tests bao phủ Auth/CSRF/JWT, route/menu/effective permission, Orders actions/receipt/cancel/layout, Notification realtime/shared connection, R2 và Support state/composer/context/thread. Staff editor thật dùng 4 localized Support permissions, không tạo HR dependency cho picker. Không chạy VNPay, shipping thật hoặc marketing campaign.

Các lỗi phát hiện và retest: reactive pending thread, first-send race/draft ownership, canonical merge/dedupe, order route param id (không phải orderId ở Admin), live searched list patch, ZIP Windows MIME, UTC staged expiry, history scroll anchor, long-history rendering, Order code overflow 320px và navigation sau session recovery. Reports/raw lỗi trước sửa được giữ cho audit.

Final browser cleanup: {"customerLogout":true,"adminLogout":true,"networkFaultsCleared":true,"mediaAndViewportEmulationCleared":true,"probesRemoved":true,"oldEdgeDebuggerDetached":true,"userChromeAndYouTubeUntouched":true,"qaCreatedTabsClosed":true,"existingChromeLoginPreserved":true,"existingEdgeQaTab":"Debugger detached; existing user tab left open after shared QA logout. All temporary QA tabs closed."}. Không còn probe, response interception, blocked URL, network throttle hay viewport/media emulation do task để lại. QA sessions đã logout; context QA tạm được đóng. Chrome đăng nhập sẵn và tab YouTube của người dùng được giữ. Credentials fixture bị loại khỏi manifest sau khi xóa accounts.

Đã chạy git diff --check cả hai repo, kiểm tra final status/stat, reindex GitNexus (index-only) và detect_changes. Không git add/commit/push/pull/rebase/reset/clean/restore; không xóa thay đổi Phase 1. Final scope report gồm cả thay đổi Phase 1 chưa commit; xem baseline/final manifests để phân biệt.

## 11. LIMITATIONS / FINAL

- Bằng chứng này là local/dev, một API instance; không chứng minh horizontal Socket.IO deployment, tải hàng nghìn concurrent users hay mạng production.
- PDF native inline viewer phụ thuộc browser/CSP, có fallback download đã thử. MP4/WebM dùng clip synthetic rất ngắn để chứng minh decode private Blob; không coi đây là kiểm thử long-video streaming/seeking hoặc mọi codec.
- Full file tối đa 10 MiB được tải qua private Blob; không thêm public R2 URL hay API Range mới ngoài contract hiện hữu.
- Không có API priority/SLA trong contract nên không tạo dữ liệu minh họa từ mockup. Không tạo chat page thứ ba hoặc tự tạo ticket sau checkout/payment.
- Evidence nằm trong thư mục Temp được kiểm soát, có thể bị hệ điều hành dọn về sau; official handoff này ở repo Web. QA fixtures/R2 đã dọn; muốn lặp lại live QA cần tạo run fixture mới bằng helper có guard và đăng nhập form thật.

**Kết luận:** app DB đã migrate an toàn; 30/30 browser cases PASS, latency/typing đạt gate sau sửa, automated/build/contract checks PASS, cleanup giữ nguyên non-fixture rows. Customer Support Chat Phase 2 & Full Integration đã hoàn tất và không có blocker còn mở.

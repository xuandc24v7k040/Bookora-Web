# Bookora Customer Support Chat — UI/UX Hotfix 1 Handoff

## 1. STATUS / GATE

**BOOKORA — CUSTOMER SUPPORT CHAT UI/UX HOTFIX 1 — PENDING**

Ngày kiểm tra: **25-11-2026, Asia/Saigon**. Đã implement HF-01…HF-06 và Reply persisted, chạy build/contract/security regression và một phần UI thật. **Chưa đạt nghiệm thu toàn bộ M01–M32.** Không dùng kết quả Phase 2 để thay thế kiểm tra Hotfix.

Blocker: sau khi phiên công cụ thay đổi, browser inventory trả `Local browser access is unavailable for this chat`, kể cả sau khi người dùng xác nhận bật lại full CDP và công cụ được khởi tạo lại. Thử cửa sổ Chrome qua Computer Use sau đó bị công cụ dừng vì không xác định URL đủ tin cậy. Không tiếp tục tự động hóa browser sau lần dừng này. Các ca còn thiếu, đặc biệt typing đủ mẫu, outage ≥120s, Orders/Bell UI và nghiệm thu bản cuối, vẫn **BLOCKED/NOT RUN**.

Không commit/push hoặc thực hiện git write actions.

### Điều chỉnh theo phản hồi Product Owner — 25-11-2026

Yêu cầu mới và bảy ảnh đính kèm được dùng làm chuẩn cho các điều chỉnh dưới đây. Phần này thay thế các quyết định UI cũ về toolbar, emoji picker và typography client; các phép đo/ảnh UI ở các mục lịch sử bên dưới **không xác minh bản điều chỉnh này**.

| Finding | Nguyên nhân | Thay đổi hiện tại / file |
|---|---|---|
| Copy/Reply nằm dưới tin nhắn, có chữ và khoảng trống | Toolbar là phần tử trong luồng, có chiều cao riêng | `SupportThread.vue`, `support.css`: pill icon-only absolute cạnh bubble; outgoing bên trái, incoming bên phải; hover/focus hiện, thiết bị không hover vẫn thao tác được. Toolbar là sibling của bubble nên không tham gia `space-y` hoặc khoảng cách timestamp. Copy giữ nguyên plain text, không gọi toast; có status dành cho screen reader. |
| Download ảnh đứng riêng dưới ảnh | Action nằm trong attachment | `SupportAttachment.vue` expose download đang dùng authenticated Blob flow; `SupportThread.vue` gọi cùng flow từ icon Download trong pill. Với nhiều ảnh, tải lần lượt các ảnh trong tin nhắn. Giữ download trong lightbox và nút download của tài liệu; tin nhắn chưa gửi không có download. |
| Emoji scrollbar native và active category nền đen | Web component tự render Shadow DOM và styles riêng | `SupportEmojiPicker.vue`: Vue grid dùng shared shadcn `ScrollArea`, giữ database/dataset tiếng Việt của dependency hiện có; search, category, favorites, skin tone và keyboard navigation. `support.css`: active category chỉ underline, nền trong suốt. Không thêm dependency. |
| Nút thêm tệp không đúng dashed hover | Chưa có style trạng thái rõ ràng | `SupportComposer.vue`, `support.css`: viền dashed 1px màu border nhạt, hover/focus-visible chuyển xanh Bookora, nền trong suốt. |
| Selected ticket admin viền quá đậm | Border primary cộng inset shadow | `support.css`: bỏ inset shadow, dùng border token nhạt, giữ border 1px và nền muted. |
| Font client bị phóng to | Typography Hotfix áp đồng thời admin và customer | `support.css`: giới hạn các override typography vào admin; client bubble trở lại 13px desktop / 12px mobile, metadata trở lại utility gốc. |

Kiểm tra đã chạy cho lần điều chỉnh này:

- Support regression: **9 files / 41 tests PASS**; gồm emoji shared ScrollArea, search/select/keyboard, exact clipboard không toast, download ủy quyền và pending state.
- Sau khi tách toolbar khỏi bubble để loại bỏ spacing nội bộ: chạy lại `SupportThread.test.ts`, **5/5 PASS**.
- `npm run build` sau chỉnh sửa cuối: **PASS** (`vue-tsc -b` và Vite); còn cảnh báo chunk lớn có sẵn. Log: `C:/Users/Admin/AppData/Local/Temp/bookora-support-ui-review-build.log`.
- Prettier check: **7 source/test/style files PASS**. `git diff --check`: **PASS**.
- GitNexus upstream đã chạy trước sửa: các component có trong index LOW; picker/function mới không có symbol trong index được coi UNKNOWN và đọc trực tiếp. `detect_changes(all)` báo MEDIUM trên tổng diff tracked có sẵn; không bao hết untracked Support, không coi là bằng chứng không có ảnh hưởng.
- Live visual QA bản này **chưa thực hiện được**: CUA inventory vẫn trả `Local browser access is unavailable for this chat`. Không đánh dấu nghiệm thu UI hoặc toàn bộ Hotfix DONE.

### Bổ sung ba chi tiết theo ảnh mới — 25-11-2026

- `SupportThread.vue`: sau khi clipboard ghi thành công, riêng tin được sao chép đổi Copy thành Check trong 1,5 giây rồi phục hồi; không toast. Trạng thái được đưa vào `v-memo` để icon cập nhật thực; timer reset khi đổi thread và được dọn khi unmount. `support.css` thêm hiệu ứng xuất hiện nhẹ 140ms, tuân thủ reduced motion.
- `support.css`: quote customer bỏ cỡ chữ cố định 14px bằng cách kế thừa bubble (13px desktop / 12px mobile); line-height 1.4 và padding dọc 6px giúp phần trích dẫn gọn hơn, áp dụng cả tin gửi/nhận.
- `SupportAttachment.vue`: dialog được Portal ra ngoài chat nên mất customer theme; truyền lại class `support-customer` theo store và dùng `support-primary` cho nút tải xuống. Customer dùng xanh Bookora, admin tiếp tục dùng primary hiện hành.
- `SupportThread.test.ts`: kiểm tra icon Copy → Check → Copy theo thời gian và clipboard bị từ chối không hiện check. Support regression **9 files / 42 tests PASS**. Các chỉnh sửa sau test chỉ thêm class animation và CSS cho quote.
- Build/typecheck **PASS** (`npm run build`), Prettier check bốn file **PASS**, `git diff --check` **PASS**. Log build: `C:/Users/Admin/AppData/Local/Temp/bookora-support-ui-polish-build.log`; còn cảnh báo chunk lớn có sẵn.
- Browser limitation nêu ở trên vẫn còn: chưa có visual QA trực tiếp cho bản bổ sung này.

## 2. PREFLIGHT / BASELINE / RUNTIME

| Mục | Giá trị đã xác minh |
|---|---|
| Web | `D:/CTU/CT466E/bookora-web/bookora-web`, master, HEAD `54c463f695861d5cc9d32d13cd33f5e957f68e9a` |
| API | `D:/CTU/CT466E/bookora-api/bookora-api`, master, HEAD `df4e47052de77387094c82d1fc9528871bd3479c` |
| Runtime | Web `http://localhost:5173`, API `http://localhost:8000/api/v1` |
| DB | PostgreSQL local `localhost:5432/bookora_db`; identity query xác nhận database/server/port trước migration |
| Auth | Form login thật cho Customer QA và Branch Admin QA; cookie/CSRF/Turnstile giữ nguyên. CAPTCHA QA được người dùng cho phép tại thời điểm thao tác |
| Hai contexts đã dùng | Customer: in-app Chromium; Admin: Chrome profile GPT 2. Edge chứa phiên người dùng, chỉ đọc baseline |
| Fixture | Run `support-hf1-01m88wbgmt4vpp1pnm94m8k0b7`, tài khoản `example.test`, hai branch riêng, bốn order thuộc QA: PENDING/COMPLETED/CANCELLED/PENDING_PAYMENT |

Đã đọc prompt Hotfix, Master Spec v1.0.0, Phase 1/2 handoffs, prompt Phase 2, AGENTS/CLAUDE/README/package scripts, RTK và source liên quan cả hai repositories. Hai mockup có thể truy cập trong Downloads đã được xem: `Trang chủ Bookora với hỗ trợ khách hàng.png`, `Giao diện hộp thư hỗ trợ Bookora màu xanh navy.png`. Không tìm thấy các file có đúng tên sáu screenshot lỗi và năm screenshot DigiMart được liệt kê trong prompt; không giả định đã xem chúng. Không dùng các tài liệu lịch sử như bằng chứng runtime Hotfix.

Baseline gồm HEAD/status và SHA-256 của các tracked/untracked file trước chỉnh sửa. Phase 1/2 và generated files đã có sẵn nhiều thay đổi chưa commit. Đối chiếu baseline riêng, không coi tổng `git diff HEAD` là toàn bộ Hotfix. Không có file baseline nào bị mất sau generation.

Evidence local: [thư mục Hotfix](C:/Users/Admin/AppData/Local/Temp/bookora-support-hotfix1-evidence). `web-baseline.json`, `api-baseline.json`, `delta.json`, `checks.json`, `db-preservation.json`, `performance.json`, `viewports.json`, `cleanup-result.json` là các nguồn chính. Backup DB, manifest credentials và snapshot cookie nằm **local/private**, không đưa vào repo hay nội dung báo cáo. Raw baseline Admin có dữ liệu người dùng, không dùng làm ảnh sanitized để chia sẻ.

## 3. ROOT CAUSES / MINIMAL CHANGES

| ID | Finding → root cause thực | Thay đổi | Verification / giới hạn |
|---|---|---|---|
| HF-01 | `SupportPrechat.vue` dùng native `<select>` cho branch | Thay bằng shared shadcn `Select/Trigger/Value/Content/Item`, inline; Portal z-index 85, customer tokens, disabled/loading; không Dialog | UI thật đã mở/chọn branch QA; còn thiếu keyboard/touch đầy đủ trên bản cuối |
| HF-02 | Prechat gọi `GET /customer/orders?page=1&limit=10`; API trả **400**, `errors.limit: limit must not be greater than 5` | Giữ endpoint owner hiện hành, đổi **limit=5**, giữ phân trang, loading/empty/error/retry tách biệt; Select order có mã/trạng thái/branch | Request sau sửa **HTTP 200**, bốn order QA xuất hiện. Chọn order COMPLETED và gửi qua UI thành công; branch được server suy từ order. Empty/retry có component tests; CTA list/detail chưa kiểm tra UI mới |
| HF-03 | Composer hardcode 12 emoji, nối vào cuối draft | Một `emoji-picker-element@1.29.1`, import động lần mở đầu; 1.923 emoji tiếng Việt, search/category/scroll/favorites; chèn vào selection/caret và phục hồi focus | UI search “sách” trả emoji, chèn `A📚️B` đúng caret. Unit test selection replacement/IME. Popup ESC/focus/mobile đầy đủ còn thiếu |
| HF-04 | Khay upload là div `overflow-y-auto` native | Shared `ScrollArea`, tray capped, thumbnail/name/size/progress/remove/retry; Button `+ Thêm tệp` dashed; tối đa 5, nút disabled khi đủ | UI upload JPG/PNG/WebP/PDF trong hai lần chọn, năm tệp ready, remove một rồi file-only send. 320px: tray ~136px, input và Send trong viewport. Bản cuối bổ sung flex cap composer để tray có thể co khi có quote/text dài; cần kiểm tra UI lại tổ hợp này |
| HF-05 | Inbox outer rounded border/shadow, height `100dvh - 17rem`, parent max-width/padding; profile avatar có trong User nhưng DTO chỉ select fullName | Bỏ rounded Card/shadow, workspace flex theo vùng còn lại; page-specific parent `:has(> .support-admin)` bỏ max-width, không sửa DashboardLayout; avatarUrl map vào safe Support DTO; shared avatar/fallback ở list, bubble, header, context | Sáu viewport đã đo/screenshot; 1366/1440/1920 có ba cột, radius 0. Header mobile được thu gọn sau khi phát hiện clipping ở 320. API avatar mapping và fallback tests PASS; asset profile thật chưa kiểm tra browser |
| HF-06 | `.support-admin .support-bubble-own` hardcode green | Dùng token Admin primary hiện hành; Customer giữ green. Không đổi semantic status | Admin computed background **rgb(15,23,42)**, text **15px** trong UI thật; selector chỉ Support |

ORDER trace không liên quan lỗi ownership, CSRF hoặc branch guard: request đã đến DTO validation và bị giới hạn page size. Không nới validation Orders hoặc sửa payment/status để né lỗi.

## 4. UX / FILES CHANGED

| File / nhóm | Lý do |
|---|---|
| `src/features/support/components/SupportPrechat.vue` + test | Limit 5, shadcn Select cho branch/order, trạng thái đơn, honest load states |
| `SupportEmojiPicker.vue`, `public/emoji/{vi.json,LICENSE,NOTICE.md}`, package/lock | Picker đầy đủ, dữ liệu `emoji-picker-element-data@1.8.0/vi/cldr/data.json` phục vụ từ app, không gọi CDN lúc người dùng mở picker |
| `SupportComposer.vue` + test | Caret insertion, quote cancel/send, ScrollArea/dashed add, file states, bounded composer |
| `SupportThread.vue` + test | Copy plain canonical text; Reply theo quyền; safe quote, click original đang loaded → scroll/highlight; original chưa loaded → thông báo an toàn, không tải N+1 |
| `SupportAttachment.vue` | Bổ sung nút download cho ảnh inline; dùng nguyên authorized Blob download hiện hành |
| `SupportAvatar.vue` + test, TicketList/Context/Thread | URL profile thực nếu có; fallback initials khi thiếu/hỏng, không ảnh giả |
| `support.store.ts` + test | replyToMessageId đi cùng payload retry/clientMessageId; optimistic safe quote; toast tạo yêu cầu chỉ khi first sequence=1 và không replay |
| `SupportInboxPage.vue`, `support.css` | Workspace không outer Card, font dễ đọc, popup compact 30rem/expanded 68rem, mobile full viewport, scoped navy, actions hover/focus và luôn có trên thiết bị không hover |
| `support-errors.ts` | Thông báo riêng HTTP 401 và invalid reply; giữ xử lý các error cũ |
| API Support schema/DTO/repository/service | Quan hệ Reply nullable, same-ticket validation/DB guard, bounded quote, avatar mapping |
| API `test/support-hotfix1*`, `test/support-chat.e2e-spec.ts`, cleanup helper | DB/security/socket regression, fixture/migration guard, sửa thứ tự migration preservation test; cleanup tái sử dụng helper hiện có |
| API/Web OpenAPI + generated Support models/Zod | Sinh bằng scripts chính thức, không hand-edit generated |

Copy/Reply toolbar dành vùng ổn định, hiện khi hover hoặc focus; trên no-hover controls vẫn có. Reply không ghép quote vào body, không tạo conversation con, không tạo ticket mới. Download vẫn qua proxy kiểm quyền và Blob URL được revoke theo cleanup hiện hành. File limits/MIME/server validation/private R2 không đổi.

Thư viện emoji Apache-2.0, một package mới, không thêm UI framework. Build cho thấy picker tách chunk **37.69 kB / gzip 13.43 kB**; JSON tiếng Việt **442.476 byte**, tải riêng khi mở picker. Các cảnh báo chunk lớn toàn app còn tồn tại. Lần npm install báo tổng dependency audit 108 vulnerabilities; không chạy `npm audit fix` ngoài scope và không kết luận đây là vấn đề do picker.

## 5. BACKEND / CONTRACT / DB

- Migration mới: **`20261125090000_support_message_reply`**. Chỉ thêm nullable `support_messages.reply_to_message_id`, FK tự tham chiếu `ON DELETE SET NULL`, index và trigger same-ticket. Không sửa migration đã applied.
- Request `SupportMessageInputDto.replyToMessageId?`; server kiểm reply tồn tại trong cùng ticket sau authority check. First-message create có reply bị từ chối. Foreign ticket/branch/missing ID trả safe error, không trả metadata của original.
- Response `replyToMessageId?`, `replyTo?: { id, senderName, text, attachmentCount }`. Quote text bounded **240 Unicode code points**, không private URL hoặc file bytes. Relation include lấy cùng query set, không N+1 per message. Old messages có null/omitted.
- Idempotency hash giữ nguyên với message cũ không reply; reply target được thêm vào hash khi có. Retry cùng key/payload trả cùng row; cùng key khác quote trả 409.
- `chat.message.created` giữ **version 1**, thêm optional metadata tương thích; publisher hiện hành spread canonical DTO. Ngưỡng 8 KiB và contentOmitted/delta recovery không đổi; không thêm Socket.IO connection, room hoặc Bell notification.
- Ticket summary thêm `customerAvatarUrl?`; message thêm `senderAvatarUrl?`, lấy từ User.avatarUrl vốn đã có trong profile/review contracts.
- Backup custom dump local được `pg_restore --list` kiểm tra trước deploy. `db-preservation.json` xác nhận toàn bộ giá trị row cũ giữ nguyên (bỏ qua đúng nullable column mới khi so sánh). **34 migrations, DB up to date** sau deploy; Prisma validate PASS.
- Pipeline đã chạy: API `prisma:generate`, `docs:openapi` → Web `gen:api:local` / `gen:api` → generated Zod verifier. Parity cuối: **schemaParity=true, pathParity=true**, 310 schemas/250 operations. Không chỉnh generated bằng tay.

## 6. REAL BROWSER ACCEPTANCE M01–M32

Các bước browser dưới đây diễn ra trên local Web/API/DB thật; clicks/typing/file chooser thật, không thay bằng gọi API để chấm UI. Các assertion API bổ sung được ghi riêng. **Một case còn assertion chưa chạy không được tính PASS toàn case.** UI thật có kết quả tốt nhưng bản cuối đã thêm avatar header/context, status order và flex cap composer sau các screenshot: cần nghiệm thu lại bản cuối khi browser access hoạt động.

| Case | Đã quan sát / chưa hoàn tất | Status |
|---|---|---|
| M01 | Before GENERAL/ORDER/Admin và after QA có; thiếu sáu ảnh lỗi/five reference files và before emoji/tray đầy đủ | BLOCKED |
| M02 | Mouse mở/chọn shadcn branch Select thật; keyboard/touch/scroll đầy đủ chưa chạy | BLOCKED |
| M03 | Chọn branch chưa tạo GENERAL ticket; DB cleanup chỉ có ORDER ticket. Chưa chạy hết back/close/reopen/toast/retry assertions | BLOCKED |
| M04 | HTTP 200 limit=5; owned QA orders; chọn COMPLETED → first send thật, đúng order/branch. Bản cuối có thêm status label chưa kiểm UI lại | BLOCKED — final UI retest |
| M05 | Component empty/error/retry và backend ownership tests; zero-order/401/403/500 manual UI chưa đủ | NOT RUN — full browser case |
| M06 | CTA source/store tests giữ nguyên; Orders list/detail actual UI, resolved/reopen/new và mọi status chưa chạy Hotfix | NOT RUN |
| M07 | Compact/expanded/mobile dimensions và 15px message đã đo; cần retest final composer/long content | BLOCKED |
| M08 | Search “sách”, category grid, nhiều emoji; real caret `A📚️B`; scroll/keyboard toàn case còn thiếu | BLOCKED |
| M09 | Unit IME/Unicode/selection PASS; manual ESC/outside/focus/mobile/receiver emoji đầy đủ chưa chốt | BLOCKED |
| M10 | UI chọn 4 rồi thêm tệp thứ 5, previews/progress/ready, dashed button và cap disabled; mixed JPG/PNG/WebP/PDF | PASS — observed implementation trước final layout cap |
| M11 | ScrollArea viewport thật; tray capped ~136px tại 320×568, composer/send trong màn hình. Final combination quote + multiline cần retest | BLOCKED |
| M12 | UI remove và file-only send thành công; bounds/cleanup unit + real R2 e2e PASS; retry/cancel/oversize đầy đủ qua UI chưa chạy | BLOCKED |
| M13 | Copy/Reply controls hiện trong Customer DOM; exact clipboard, hover/focus feedback chưa kiểm | NOT RUN — complete case |
| M14 | Admin Reply click thật và navy computed; exact Copy/hover/keyboard chưa kiểm | BLOCKED |
| M15 | Admin Reply nguyên bản → Customer nhận canonical quote qua realtime; DB/API/socket tests PASS. UI reload/cancel cả hai hướng còn thiếu | BLOCKED |
| M16 | Safe quote fallback/loaded jump có code + render test; actual Reply ảnh/file/old-page click chưa chạy | NOT RUN |
| M17 | API replay/conflict/one-row + FE retry giữ quote PASS; UI ACK-loss/reconnect chưa chạy | NOT RUN — browser fault case |
| M18 | File-only qua UI đến Admin; private image render thật. Lightbox/PDF/video/DOCX/ZIP download UI chưa đủ; ACL file e2e PASS | BLOCKED |
| M19 | Controls hiện ở mobile/no-hover; chưa thao tác đủ Copy/Reply/Download bằng touch | NOT RUN — complete case |
| M20 | Workspace radius=0; desktop 1366/1440/1920 full available width/height, screenshots + measurements có | PASS — measured layout |
| M21 | Composer vị trí hữu dụng với lịch sử dài được đo; scrolling từng pane và final combination chưa đầy đủ | BLOCKED |
| M22 | Font 15px, long order code không page overflow ở sáu viewport; 4000 chars/huge photo/filename complete UI chưa đủ | BLOCKED |
| M23 | Admin own bubble rgb(15,23,42), 15px; Customer green scoped source; đủ computed-color/semantic assertions bản cuối chưa chốt | BLOCKED |
| M24 | DTO mapping/fallback/error-retry tests PASS; actual profile asset with/without avatar chưa kiểm browser | NOT RUN — asset load case |
| M25 | Admin mobile chọn ticket/composer accessible, sửa clipping 320 và chụp lại; tablet Sheet/390 Back/menu chưa đủ | BLOCKED |
| M26 | QA Admin claim/reply UI thật; authority/reassign/resolved regressions API PASS; toàn lifecycle/role matrix UI chưa đủ | BLOCKED |
| M27 | Đã chụp/đo Customer và Admin ở 320/390/768/1366/1440/1920; keyboard/zoom/overlays toàn matrix chưa đủ | BLOCKED |
| M28 | Hai chiều real UI gửi/sent/seen không F5; hidden unread/history indicator/typing toàn case chưa đủ | BLOCKED |
| M29 | 44 measured UI sends, 43 valid recipient samples, 21/22 hai chiều, P95 731ms; chỉ ORDER, sender observations thiếu và có outliers | BLOCKED — GENERAL + complete optimistic gate |
| M30 | Chưa đo ≥12 typing trials mỗi chiều bằng UI Hotfix | NOT RUN |
| M31 | Chưa chạy browser outage ≥120s + Reply/revoke/cache/media matrix Hotfix | NOT RUN |
| M32 | 72 FE regression tests và real API security/files PASS; actual Order state-change + Bell simultaneous UI Hotfix chưa chạy | NOT RUN — full UI regression |

Ảnh QA/số đo ở evidence directory: `after-general.png`, `after-order.png`, `after-emoji.png`, `after-admin-reply.png`, `customer-{320,390,768,1366,1440,1920}.png`, `admin-{320,390,768,1366,1440,1920}.png`, `admin-320-fixed.png`, `after-upload-320.png`, `viewports.json`. Dữ liệu trong ảnh after là fixture tổng hợp, không đơn/tài khoản thật.

Ví dụ measurements: tại 1440×900 Admin workspace **1152×676.48px**, cột **264.95 / 633.61 / 253.44px**; tại 1920×1080 **1632×856.48px**. Customer expanded tại desktop rộng **1088px**, mobile full viewport. Sau mobile heading fix, Admin 320×568 workspace từ y=120 đến ~526.86, composer/send không vượt bottom; screenshot `admin-320-fixed.png`.

## 7. PERFORMANCE — SỐ MỚI, KHÔNG DÙNG LẠI PHASE 2

Đã warm-up rồi gửi UI thật hai chiều trên ORDER QA. Một lượt controller-only trước đó có spike do round trips; không dùng nó như latency render thuần. Phép đo chính chỉ quan sát trusted Send click và text bubble **intersect thread viewport** sau double requestAnimationFrame; không sửa DOM hay mô phỏng implementation. Dùng `Date.now()` chung Windows host, lưu calibration CDP; các lượt RTT tốt 13–18ms, clock offset 6–8ms, chênh hai browser khoảng 1–2ms. API/R2 cùng local app, online, không throttle; upload không nằm trong text samples.

| Metric | n | P50 | P95 | Max |
|---|---:|---:|---:|---:|
| UI Send click → visible recipient | **43/44** | **154ms** | **731ms** | **1215ms** |
| Sender visible observations có timestamp | 25/44 | 31ms | 394ms | 536ms |

Recipient valid counts: Customer→Admin **21**, Admin→Customer **22**. Mẫu `HF1 measured 20 customer` không bắt được thời điểm intersect nên được giữ trong excluded list, không giả 0ms. Sender timestamps thiếu nhiều ở Admin, observation chịu rAF/background scheduling; **không kết luận optimistic P95 ≤50ms**. Recipient P95 đạt riêng run ORDER này, chưa đạt toàn bộ gate GENERAL/ORDER/typing/outage. Giữ cả outlier, raw samples và controller upper bounds trong `performance.json`.

API regression mới sau schema: 40 sends cùng harness monotonic clock cho HTTP→Socket P95 **83.71ms**, commit→publish P95 **5.28ms**; 100-socket load P95 **111.06ms**. Đây là **API metrics**, không thay thế recipient browser assertion. Historical Phase 2 P95 516.87ms chỉ là số tham khảo, không phải lần đo này.

## 8. AUTOMATED / QUALITY

Các dòng PASS dưới đây là lệnh đã chạy thực; [checks.json](C:/Users/Admin/AppData/Local/Temp/bookora-support-hotfix1-evidence/checks.json) và log tương ứng lưu command/exit/time.

| Check | Kết quả |
|---|---|
| Web targeted Support/shared realtime/Notifications/Orders | **19 files, 72 tests PASS**, exit 0 |
| Web `npm run build` | PASS, vue-tsc + Vite; picker lazy chunk nêu trên; existing large chunk warnings |
| API `npm run build` | PASS, 566 SWC files; chạy trước các thay đổi chỉ test/formatting cuối |
| API `npm run type-check`, `npm run lint` | PASS, exit 0 |
| `npm run prisma:validate`, `npm exec -- prisma migrate status` | PASS, 34 migrations/up to date |
| New `support-hotfix1.e2e-spec.ts` | **5/5 PASS**: persisted quote/replay/hash/cursor, foreign/missing/first-message/DB trigger rejection, authorized Socket canonical quote, assignee/resolved ACL, avatar mapping |
| `support-chat.e2e-spec.ts` rerun | **17/17 PASS** sau sửa migration test ordering; includes real DB/HTTP/socket/concurrency/Unicode/load/ACL |
| `support-files.e2e-spec.ts`, `support-file-mime.e2e-spec.ts` | Hai suites PASS, **8 tests** trong run đầu; authorized/private R2 và MIME regression |
| `support-phase2.e2e-spec.ts` | **4/4 PASS** trong run ban đầu cùng new quote suite |
| `docs:openapi`, `docs:contract`, `docs:lint` | PASS; 250 operations, 310 schemas |
| Web `gen:api:local`/`gen:api` + generated verifier | PASS sau retry; 39 Zod files, 279 ULID uses, zero forbidden occurrences |
| Schema/path parity export ↔ Web | true / true |
| `git diff --check` cả hai repositories | PASS |

Failure đã xử lý, không che kết quả: generation đầu lỗi thiếu memory khi nhiều check chạy đồng thời, làm generated endpoint folder ở trạng thái tạm thiếu và build lúc đó fail; đã chạy lại generation hoàn chỉnh rồi build PASS. API dev process bị dừng lúc áp lực memory, khởi động lại bằng build/start:prod; Vite được tạm dừng đúng process cổng 5173 trong final build rồi khởi động lại. Không sửa security/architecture để khắc phục lỗi máy. Preservation test cũ loại trừ đúng foundation nhưng vô tình áp migration Reply trước foundation; đã đổi thứ tự pre-foundation → foundation → subsequent migrations và chạy lại PASS.

## 9. SECURITY / SAFETY / CLEANUP / SCOPE

- Ownership Order và branch inference ở backend giữ nguyên. Support-only không được thêm Orders quyền. Không đổi Auth/session/CSRF/Turnstile, Orders/payment/GHN/coupon/Notifications logic hoặc shared socket architecture.
- Same-ticket Reply được bảo vệ cả service và DB trigger. API/socket summary bounded, không expose private attachment URL. Tests kiểm foreign owner/branch, missing original, unauthorized staff, resolved ticket, idempotent retry và DB direct mutation.
- GitNexus upstream trước sửa: component/helper Support chủ yếu LOW; store 12 direct consumers và DTO MEDIUM. `supportError` **CRITICAL** do 7 direct callers/nhiều processes; thay đổi chỉ thông báo 401 + invalid-reply map, đã báo risk và chạy regression. Test harness không có symbol trong index nên UNKNOWN, đã đọc source thay vì xem là zero risk.
- `detect_changes(all)` cuối báo Web MEDIUM/API HIGH cho **tổng diff có sẵn** gồm Realtime/Auth/storage từ Phase 1/2. Những file tích hợp đó không bị Hotfix sửa theo baseline hashes. Analyzer không bao hết untracked Support files; không dùng nó làm bằng chứng zero risk. Không commit.
- Cleanup tái sử dụng `test/support-phase2-cleanup.cjs --hotfix1`; local DB/prefix/users/branches/product/order manifest được kiểm trước cả dry-run và apply; chỉ bỏ qua self-FK SupportReplies khi xếp thứ tự bảng, không bỏ ownership checks.
- Cleanup thực tế: xóa **8 QA users, 2 QA branches, 4 QA orders, 1 QA ticket, 71 QA messages**, dữ liệu con đúng manifest và **4 private R2 objects**; HEAD object xác nhận 404. Snapshot toàn bộ row ngoài fixture **nonFixtureRowsPreserved=true**. Không reset/drop/truncate app DB hoặc xóa ticket/tài khoản thật. Các E2E riêng dùng disposable DB và teardown của test helper hiện có.
- **Browser session caveat:** Chrome được dùng cho Admin QA sau khi lưu cookie/storage gốc vào `chrome-session-private.json`. Browser access bị chặn trước bước restore. Không in/chia sẻ credential snapshot. QA accounts đã cleanup nên phiên QA không còn hiệu lực; **chưa thể xác minh/khôi phục session Chrome gốc qua công cụ hiện tại**. Edge session người dùng không bị đăng xuất. Cần restore qua full CDP được hỗ trợ khi hoạt động trở lại, hoặc đăng nhập lại bằng UI.

## 10. REMAINING / RESUME

Implementation và automated checks hiện có thể review; **chưa có đủ bằng chứng để gọi DONE (VERIFIED)**. Cần browser/CDP hoạt động để restore session tạm, tạo lại QA fixtures qua `test/support-hotfix1-fixtures.ts` (đổi run mới), rồi chạy lại bản cuối và hoàn thành các hàng BLOCKED/NOT RUN, nhất là M06/M13–M19/M24–M32, GENERAL performance, 12 typing trials mỗi chiều, ≥120s outage và Orders/Bell UI. Sau đó cleanup bằng đúng manifest mới và cập nhật **chính handoff này**.

Các source screenshots lịch sử còn thiếu không được ghi PASS; nếu cung cấp được thì đối chiếu trực tiếp. Product Owner manual acceptance vẫn **PENDING**, độc lập với các test agent đã chạy.

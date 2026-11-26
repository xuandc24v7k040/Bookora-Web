# Bookora — UI/UX & Buy Now Hotfix 1 — DONE (VERIFIED)

**Trạng thái hiện tại xem mục 9.** Product Owner đã chốt phương án A trong continuation ngày 26/11/2026: Mua ngay được cập nhật quantity của chính variant hiện có thành đúng quantity vừa chọn. Quyết định này ghi đè ràng buộc H2 cũ. Các mục 1–8 bên dưới được giữ làm lịch sử lần kiểm thử trước; verdict PENDING/BLOCKED ở đó không phải kết luận của continuation.

Ngày thực hiện: 26/11/2026 (Asia/Saigon). Đây là evidence của lần thực hiện hiện tại, không kế thừa verdict PASS từ handoff GHN trước.

## 1. Lịch sử trước continuation — verdict và giới hạn nghiệp vụ cũ

| Mục | Kết quả |
| --- | --- |
| H1 | IMPLEMENTED / VERIFIED: logo local nguyên bản nằm ngay bên phải tên, separator mảnh, bỏ riêng Truck của title GHN; đã kiểm tra browser và responsive. |
| H2 | PENDING: đã sửa normal/catalog Buy Now đi thẳng Checkout, xác minh variant khác mặc định + quantity 2; còn blocker cùng variant có quantity cũ khác. |
| H3 | IMPLEMENTED; source audit Client/Admin, computed cursor trên các family và nhiều custom target đã thực hiện. Không coi việc lấy mẫu là đã click mọi element. Một số trạng thái/consumer chưa được kiểm tra trực tiếp được liệt kê bên dưới. |
| Tổng thể | **PENDING**, không phải DONE (VERIFIED). Không sửa BE source/API/schema để tự quyết nghiệp vụ đang bị khóa. |

**Blocker H2:** contract hiện tại không đồng thời hỗ trợ exact quantity mua ngay và bảo toàn quantity cũ khác của cùng variant. `prisma/schema/25-carts.models.prisma` của API có unique `(cartId, variantId)`. `cart.repository.ts:addItem` cộng quantity; `updateQuantity` thay quantity. `PreviewCheckoutDto` nhận `selectedCartItemIds`, không nhận quantity mua riêng. `checkout.service.ts:resolveState` đọc `item.quantity` từ DB, và final revalidation yêu cầu cart quantity khớp state. Helper cũ dùng `actions.update` nên quantity 5 có thể bị thay thành 2 trước khi checkout.

Bản sửa **không thực hiện overwrite này**: nếu cùng variant có quantity khác, báo lỗi rõ ràng và dừng trước mutation/navigation. Case đó vẫn **không đạt B03/DL-02**, không được ghi PASS. Cần chốt một trong hai thay đổi ngoài quyết định hiện tại: cho phép cập nhật quantity cũ, hoặc thiết kế contract Checkout hỗ trợ số lượng mua riêng do BE xác thực và quy tắc consume/preserve rõ ràng. Handoff này không tự triển khai một trong hai chính sách.

## 2. Baseline và bảo toàn working tree

| Repository | HEAD lúc bắt đầu | Owner changes trước hotfix |
| --- | --- | --- |
| Web `D:/CTU/CT466E/bookora-web/bookora-web` | `287a30b feat(checkout): add GHN shipping option and estimated delivery` | `M AGENTS.md`, `M CLAUDE.md`, untracked `public/ghn-logo.png`; diff stat instruction files: 2 insertions / 2 deletions. |
| API `D:/CTU/CT466E/bookora-api/bookora-api` | `2b33f86 feat(shipping): integrate GHN quotes and multi-provider checkout` | `M AGENTS.md`, `M CLAUDE.md`; diff stat instruction files: 2 insertions / 2 deletions. |

Đã đọc AGENTS/CLAUDE, README, `C:/Users/Admin/.codex/RTK.md`, package scripts, handoff GHN mới nhất và source cart/checkout/Flash liên quan. Instruction files và handoff GHN cũ không bị sửa. Không add/commit/push/pull/rebase/reset/restore/clean. Logo do Owner thêm được dùng tại chỗ, không tạo lại ảnh.

GitNexus status ban đầu của cả hai repo: up-to-date, cùng indexed/current HEAD như bảng trên. Truy vấn flow Buy Now, context `prepareBuyNow`, upstream impact `addToCart`, `prepareBuyNow`, `buttonVariants`, `sidebarMenuButtonVariants` trước khi sửa: graph trả LOW / 0 direct upstream. **Giới hạn graph:** Vue template/import không được phản ánh đầy đủ; source xác nhận hai CTA gọi `addToCart`, một production caller gọi `prepareBuyNow`, và shared Button có phạm vi Client/Admin rộng. Đã báo phạm vi thực tế của shared primitive trước khi sửa. Detect changes so với `master`: MEDIUM, hai process `AddToCart → GetMessageFromPayload` và `AddToCart → SerializeCheckoutCartItemIds`; instruction-file changes trong output là Owner changes có từ đầu.

## 3. Preflight → fix → verify

### H1 — Logo

- GAP → MINIMAL FIX → VERIFY: `src/features/checkout/components/CheckoutShippingOptions.vue` dùng Truck trước tên GHN. Thay bằng `Giao Hàng Nhanh | img`, giữ CalendarClock, radio, INTERNAL, quote/error/retry/expiry logic và màu hiện có.
- Asset thực tế Owner chỉ định: `public/ghn-logo.png`, **700 × 400**, 32.322 bytes, có alpha; khác kích thước 1200 × 300 ghi trong prompt. Dùng đúng asset thực tế theo chỉ dẫn trực tiếp của Owner. Không crop/filter/recolor hay đổi pixel. SHA-256: `dd044391de9c1d75be1c8e1975b4e0aa183ae110fc6aab0687c8532c6c1aeaf5`.
- `w-14` = 56 CSS px, `h-auto`, natural rendered box 56 × 32; phần logo có vùng trong suốt trong file. Browser hiển thị đúng biểu tượng xanh/cam và chữ GHN cam, không méo. `alt=""` vì decorative, tên GHN vẫn là accessible label.
- Chỉ thêm `ml-auto` cho fee/Skeleton GHN để khi xuống dòng ở 390/320px vẫn căn phải. Không thay layout INTERNAL/address/payment/coupon.
- Baseline desktop đã xem/chụp shipping section đang dùng Truck; baseline mobile đã đo DOM/overflow, **không lưu được ảnh baseline mobile riêng**. After đã có ảnh thực tế và số đo 1440/768/390/320px.
- Live quote đã nhận 201, phí 31.501đ, ETA 27/11/2026 trong case regular 1. Flash 2 có báo giá 34.001đ. Không hardcode fee/ETA.
- Controlled network abort của GHN giữ INTERNAL enabled, GHN disabled; controlled delay giữ Skeleton/header; bỏ injection và retry lấy lại quote thật. Phân biệt rõ injection với live success.

### H2 — Direct Buy Now

- GAP → MINIMAL FIX → VERIFY: `BookDetailPage.vue:addToCart` trước đây chỉ gọi `prepareBuyNow` khi `buyNow && activeFlashOffer`; normal/catalog dùng add rồi `router.push('/cart')`. Test cũ còn assert chính hành vi `/cart` này. Không có browser reproduction riêng của lỗi trước khi sửa handler; root cause được chứng minh bằng source/test baseline, sau sửa có browser end-to-end.
- Normal, catalog discount và Flash Buy Now hiện dùng chung canonical helper, await cart result, route `{ name: 'client-checkout', query: { items: <one returned CartItem ID>, flashOffer?: ... } }`.
- Capture user ID/type, branch, selected variant, requested quantity và source route; kiểm tra context sau refresh, trước mutation và sau response. Chặn stale navigation. Giữ `cartPending` chống rapid click. Không tạo order/hold quota ở click Buy Now.
- Item đã có đúng quantity: reuse, không add/update. Item chưa có: existing add flow, kiểm tra returned branch/variant/quantity/eligibility. Item đã có quantity khác: fail safe bằng `BuyNowSelectionError`, không overwrite; đây là blocker, không phải hoàn thành exact-quantity contract.
- Add to Cart giữ reason `ADD_ITEM`, toast và ở lại Product Detail. Guest giữ `/login?returnTo=<existing product route>`. Không thêm temporary cart, frontend price authority hay checkout mới.
- FOUND → KEEP → TEST: Checkout parse/serialize ULID selection qua `route.query.items`; preview/final revalidation, owned cart, branch, prices, stock, Flash/coupon/payment snapshots giữ nguyên ở BE. Generated Orval/Zod không bị sửa; không cần regenerate contract.

### H3 — Cursor-only

- GAP → MINIMAL FIX → VERIFY: shared Button, Checkbox, RadioGroupItem, Switch, TabsTrigger, SelectTrigger, NativeSelect, CommandItem, CalendarCellTrigger, AlertDialog action/cancel, Dialog/Sheet built-in close, Popover/Collapsible triggers, SidebarMenuButton và scroll action buttons thiếu pointer trên enabled target.
- Shared rule dùng selector enabled/không aria-disabled/data-disabled, specificity thấp qua `:where`, để cursor đặc thù của consumer tiếp tục thắng. Native feature buttons dùng `enabled:cursor-pointer`. Label checkbox/radio/switch được scope theo enabled target; không áp pointer cho label text-input/textarea.
- Custom gaps: DataTable clear-filter/date, branch selector/account avatar/logout, TreeSelect, analytics action/legend/bar, manager/staff replacement/candidates/branch options, branch map suggestions/location trigger, category previews, review stars, product author/boolean/variant labels/media preview, catalog category/variant controls, account address/orders/password controls, checkout coupon opener, branch-required quick options.
- Hai gap được tìm bằng browser thay vì đếm class: ImageDropzone large variant có cursor chỉ trong compact branch; CouponDateTimePicker dùng **raw Reka RadioGroupItem**, bypass shared wrapper. Chỉ bổ sung enabled pointer cho đúng branch/target đó.
- KEEP/excluded: native `a[href]`/RouterLink đã có computed pointer; DropdownMenuItem/CheckboxItem và SelectItem đã có pointer; nonactionable DataTable row giữ auto, stop-propagation cell không phải action; SidebarRail giữ resize; media drag handle giữ grab/grabbing; ProductGallery giữ zoom-in; map pan/drag, inputs/textarea/contenteditable, scrollbar thumb, decorative badges/cards/icons không bị ép pointer.
- Đã gỡ các diff dư thừa ở trigger chỉ dùng as-child Button và primitive chưa có consumer hiện tại. ContextMenu/Accordion/Pagination/Combobox không có primitive riêng trong tree hiện tại: pagination dùng Button, combobox dùng Popover/Command/custom, expandable navigation dùng Collapsible. Không thêm primitive mới.
- Rà diff từng nhóm và kiểm tra normalization bỏ riêng cursor tokens: mọi file thuần H3 chỉ khác cursor; `BookDetailPage.vue` là file mixed H2 + ba cursor của tab custom. Không đổi event/role/tabIndex/DOM, hover/focus, layout, màu/theme hay API trong H3.

## 4. Inventory route/module và browser coverage

Các kết quả computed CSS bên dưới là lấy mẫu các target đang render, không phải tuyên bố click mọi element. Browser đầu dùng CUA/Chrome thật; sau khi kết nối browser của chat mất, tiếp tục Chrome headless Playwright độc lập bằng dependency đã có trong TEMP. Không cài thư viện vào repo.

| Family | Routes/components đã audit | Kết quả / exclusions |
| --- | --- | --- |
| Storefront | `/`, `/san-pham`, `/search`, `/san-pham/:slug`, `/flash-sale`; ProductCard, Gallery, filters/category tree, variant selector, carousel/search/header | Source inventory toàn family; browser Home/Product Detail/catalog/category child/variant CTA. Links pointer; zoom-in được giữ. Không claim đã tương tác mọi filter/search suggestion. |
| Cart/Checkout | `/cart`, `/checkout`, success/payment-result; CartItemRow/Sidebar, shipping/address/coupon/payment controls | Actual multi-line cart → multi-selected Checkout, Buy Now → single-selected Checkout, refresh, provider switch, real quote, coupon, COD create/cancel, VNPay sandbox pending/cancel. |
| Auth | login/register/forgot/reset/verification forms | Source inventory, login Customer/Admin thực; Button/Checkbox/pending/inputs kiểm tra trực tiếp. Các form còn lại reuse shared family; không đổi auth semantics. |
| Account | `/account`, `/account/addresses`, `/account/orders`, order detail, `/account/reviews`, `/account/membership`, `/account/profile`, `/account/notifications`, `/account/wishlist` | Đã mở các route, đo target enabled/disabled đại diện; address edit/combobox/switch, order tabs/paging/cancel, review stars, avatar preview/password visibility, notification tabs/select. Empty state vẫn không clickable. |
| Bell/Support Client | NotificationBell, CustomerSupportHost, Support list/search/action/composer/emoji/PDF | Bell/source và actual support open/close/list/search. Phần lớn custom targets đã có pointer trước hotfix. Không gửi tin nhắn hỗ trợ. |
| Admin shell | SidebarNav/UserMenu, scope menu, SidebarRail, DashboardLayout | Actual navigation/scope menu pointer; sidebar rail vẫn w-resize. As-child và native href được kiểm tra. |
| Admin analytics | `/super-admin/dashboard`, `/super-admin/reports/revenue` | Runtime ban đầu empty analytics; sau đó fixture **chỉ phục vụ visual cursor** tạo completed history đúng source để render branch bar/weekly/payment controls. Không dùng fixture đó làm evidence của order business flow. |
| Organization/people | branches/detail/form/map, users, roles/permissions/form, branch-admins/detail/manager/replacement, staff/detail/create/candidates/access/branch/replacement, branch-required | List routes mở thật; representative dialog/actual options được đo. Staff replacement có một lần harness chờ sai context/timeout, không che lỗi bằng unit test. |
| Catalog Admin | products/detail/edit, categories/detail/form/tree/thumbnail, suppliers, publishers, authors, product-attributes | Source inventory + actual list routes; product edit/media/boolean/author/variant controls, category thumbnail/detail/tree preview. Không upload/sửa product thật qua UI. |
| Commerce Admin | inventory stocks/movements/receipts, orders/detail, reviews, coupons/date picker, flash-sales, membership | Actual list routes, DataTable sort/filter/paging/menus, date-clear, coupon Switch/date/calendar/raw time radios. Shared coverage không tương đương click từng row/action. |
| Branch Admin | `/branch-admin/support`, `/branch-admin/notifications` | Support với manager fixture có quyền thật được mở; notifications route bị giới hạn quyền ở fixture hiện có, không bypass/grant quyền để giả PASS. Super Admin/Client notification families có audit riêng. |

Super Admin route sweep: dashboard + 21 list/report/module routes, các target enabled đang render đều pointer, ngoại lệ đúng chủ ý là SidebarRail resize. Disabled pagination giữ default hoặc not-allowed theo style có trước. Product-list row không actionable giữ auto, click không mở detail; menu action mới là target tương tác.

## 5. Runtime acceptance matrix

| ID | Verdict thực tế |
| --- | --- |
| L01 | PASS: logo nguyên bản local, text/separator/image inline, fee/ETA giữ canonical; desktop đã xem screenshot. |
| L02 | PASS: actual INTERNAL 32.000đ ↔ GHN 31.501đ, total regular 152.000đ ↔ 151.501đ; radio/green selection hoạt động. |
| L03 | PASS cho loading/controlled network error/retry/disabled/mobile; expiry thực tế từng xuất hiện và retry được. Không claim kiểm thử mọi mã lỗi upstream. |
| B01 | PASS sau sửa: nondefault regular variant, qty 2, one returned item; summary 250.000đ, INTERNAL total 285.000đ. |
| B02 | PASS cho multi-cart preservation/single Buy Now selection: regular/sale/nondefault lines tồn tại, preview chỉ nhận một selected ID. Old selection UI không được exhaustively race-test. |
| B03 | **BLOCKED**: cart existing qty khác → giữ nguyên cart và dừng, không vào Checkout. Không đáp ứng exact qty checkout của case này. |
| B04 | PASS: catalog sale qty 1 → 80.000đ; Flash qty 2 → 120.000đ merchandise, `flashOffer` retained; real Checkout summary. Exhausted/ineligible Flash runtime chưa chạy riêng. |
| B05 | PARTIAL: unit/component rapid-click, mutation failure, stale/mismatched response PASS; runtime network injection thực hiện cho GHN, chưa thực hiện đầy đủ stock/out-of-stock/cart-mutation fault/rapid-click matrix. |
| B06 | PARTIAL: actual guest redirects login đúng returnTo; unit branch/session guard PASS. Actual in-flight logout/branch-switch races chưa chạy. |
| B07 | PASS: Add to Cart success toast ở Product Detail; Cart select-all → multiple item IDs ở Checkout. |
| B08 | PASS cho refresh giữ one variant/qty, checkout cancel-order và unrelated lines; không exhaustive browser back/branch/user matrix. |
| B09 | PASS representative real GHN + INTERNAL + ORDER/SHIPPING coupons; GOLD fixture còn nguyên; không claim mọi membership/tier combination được chạy lại. |
| B10 | PASS representative: GHN COD regular 1 tạo 201, total/payment 129.501đ; only selected line consumed, unrelated sale line giữ nguyên. Cancel trả stock 997→998, cả hai voucher CONSUMED→RELEASED. INTERNAL VNPay nondefault 2 tạo pending 285.000đ, actual redirect `sandbox.vnpayment.vn`, cancel qua customer UI, stock 1000 restored; không nhập thẻ/pay live. |
| C01 | PASS các shared family hiện dùng đã lấy mẫu: Button/Tab/Menu/Select/Checkbox/Radio/Switch/paging/Dialog/Calendar; raw coupon time radios có test browser sau fix. Không claim unused primitive đã render. |
| C02–C05 | Source inventory + representative browser coverage như bảng trên; còn permission-limited notification branch route và các edge state chưa click hết. |
| C06 | PASS representative disabled Button, radio disabled, input/textarea text, media grab, sidebar resize, zoom-in, noninteractive row; giữ style trước đó. |
| C07 | PASS H1 1440/768/390/320px: documentWidth ≤ viewport, image 56px đúng ratio, price không bị che và căn phải khi wrap. Không phải audit responsiveness toàn website. |
| R01 | PASS diff scope: H1 title/fee responsive; H2 routing/selection/safe failure; H3 cursor-only; BE/generated/theme/dependency/schema không thay. |

COD QA order: `01M8BPJ9RGGRK55Y8WWAXBF7VN`; VNPay pending QA order: `01M8BPV9TCD7K637Y3QQYWGPC3`. Cả hai là order do lần này tạo trong DB clone riêng và đã cancel qua UI. Các paid/order records từ fixture archive không được tính là evidence của lần này.

Các timeout của harness do locator/fixture/context đã được giữ lại: role dialog cần mở nested permission editor; manager fixture thiếu global role mapping được align với source; visual analytics fixture cần completed status history, UTC timestamp; guest wait `load` bị chậm dù URL đã đúng, rerun theo DOMContentLoaded PASS; cart nested `main` selector được sửa và rerun thật. Không sửa source nghiệp vụ để làm các harness này pass.

## 6. Automated gates

| Lệnh thực chạy | Kết quả |
| --- | --- |
| Web `rtk proxy npm test -- --reporter=dot --maxWorkers=1` lần đầu | Exit 1: 230 files / 1186 tests PASS, 1 test CouponFormDialog timeout 5s; tổng 231 files / 1187 tests tại thời điểm đó. Chạy đồng thời build/browser làm máy tải cao; không tăng timeout hay đổi assertion. |
| Web cùng full command chạy lại sau bổ sung tests | **Exit 0: 231 files / 1191 tests PASS**, 494.60s. |
| Web `rtk proxy npm test -- --reporter=dot --maxWorkers=1 src/features/coupons/components/CouponFormDialog.test.ts` | Exit 0: 1 file / 7 tests PASS, gồm case timeout trước. |
| Web targeted Buy Now/shipping 3 files | Exit 0: 17 tests PASS. |
| Web targeted ImageDropzone/variant selection/final-product/Buy Now/shipping 6 files | Exit 0: 27 tests PASS. |
| Web frozen-source regression `rtk proxy npm test -- --reporter=dot --maxWorkers=1 src/features/coupons/components/CouponDateTimePicker.test.ts src/features/coupons/components/CouponFormDialog.test.ts src/features/checkout/components/CheckoutShippingOptions.test.ts src/components/client/layout/ClientHeader.test.ts src/pages/app/catalog/BookDetailFlashBuyNow.test.ts src/features/cart/buy-now.test.ts` | **Exit 0: 5 matched files / 35 tests PASS**, 48.08s. Không có standalone `CouponDateTimePicker.test.ts` tại HEAD này; picker được mount/test qua CouponFormDialog tests. Full suite ở trên chạy trước những bổ sung cursor cuối; targeted này chạy sau khi chốt source. |
| Web `rtk proxy npm test -- --reporter=dot --maxWorkers=1 src/features/checkout src/features/cart src/pages/app/catalog/BookDetailFlashBuyNow.test.ts src/features/coupons/components/CheckoutCouponDialog.test.ts src/features/coupons/components/CouponFormDialog.test.ts src/components/shared/ImageDropzone.test.ts src/features/storefront/composables/use-variant-selection.test.ts src/features/flash-sales/components/flash-sale-client-hotfix.test.ts` | Exit 0: 16 files / 69 tests PASS. |
| Web `rtk proxy npm run build` | **Final frozen-source exit 0**: vue-tsc -b + Vite, 6527 modules, Vite 11.08s; existing >500KB chunk warning. Log `web-frozen-build.log` trong TEMP. |
| API `rtk proxy npm test -- --runInBand cart.service.spec.ts checkout.service.spec.ts checkout.dto.spec.ts ghn-quote.service.spec.ts` | **Exit 0: 4 suites / 42 tests PASS**. Không claim full BE suite, build/lint/typecheck BE đã chạy vì BE source không đổi. |
| Web lint | NOT AVAILABLE: package không có lint script. Không thêm config/dependency. |
| Generated verifier | Không cần chạy pipeline vì không đổi API/generated contract. Generated files không bị edit thủ công. |
| `rtk git diff --check` Web/API | Kiểm tra trước bàn giao; không có whitespace error. |

Failure ban đầu khi chạy component test logo trên Windows: Vite cố transform literal `/ghn-logo.png` thành `file:///ghn-logo.png`. Dùng binding constant `:src="'/ghn-logo.png'"` để giữ public URL ở runtime; targeted logo tests đã PASS. Không thay test config hay generated code.

## 7. Environment và cleanup

- Owner Web/API listeners được phát hiện tại 5173/8000; không kill/restart các process này.
- Runtime riêng: Web `http://127.0.0.1:15173`, API `http://127.0.0.1:18000`, `NODE_ENV=test`, Turnstile disabled chỉ ở process QA, email dùng local capture credential, VNPay chỉ sandbox. Không ghi env/config production.
- DB riêng: `bookora_hotfix1_qa_1795688440177`, clone từ **isolated GHN QA database trước đó**, xác minh hostname local/prefix trước mọi fixture write. Không reset/drop/truncate DB nào. Không write vào Owner DB.
- Hai actual order tests đã được cancel, stock/voucher release kiểm tra qua SQL read-only snapshot. Hai order fixtures phục vụ analytics/review cursor được seed riêng và được ghi nhãn visual-only; không tính là placement/revalidation test. Fixture users/options/category/attribute chỉ ở clone này.
- Tất cả harness, screenshots, JSON, logs ở `C:/Users/Admin/AppData/Local/Temp/bookora-hotfix1/`, ngoài repo; private DB/credential metadata chỉ trong `private.json`, không đưa vào handoff/log. Các credentials/cookies/tokens/receiver của Owner không được ghi ra evidence.
- QA clone được giữ riêng để đối chiếu, không tự drop. Mỗi standalone Playwright harness gọi `browser.close()` khi xong. **Cleanup process còn PENDING:** automatic approval review từ chối `write_stdin(session 92914, 'stop')` cho API QA vì cần approval trong khi policy `Never`. Không thử dừng cùng process bằng đường khác. API QA PID 16080 (18000), Vite QA PID 11136 (15173) được để lại; không tuyên bố đã dừng. Owner listeners 5173/8000 không bị stop. Repo chỉ giữ source, official regression tests, Owner logo và handoff này.
- Findings ngoài scope: existing chunk-size warning, warnings trong test fixtures về router/injection/DEV invalid vnode, một số label disabled đã có pointer từ trước. Không redesign/refactor/sửa các findings đó.

## 8. Changed files và lý do

H1: `src/features/checkout/components/CheckoutShippingOptions.vue` (title/logo + fee responsive) và `.test.ts` tương ứng (asset/title/no Truck + existing radio/state regression). `public/ghn-logo.png` là **Owner asset có trước**, không phải binary do agent thay đổi.

H2: `src/features/cart/buy-now.ts` (canonical route, exact-return checks, context guard, no destructive quantity overwrite), `src/features/cart/buy-now.test.ts` (same-variant conflict, matching multi-cart reuse, failure/stale guards); `src/pages/app/catalog/BookDetailPage.vue` (normal/catalog dùng canonical helper, typed safe failure, giữ Add to Cart) và `BookDetailFlashBuyNow.test.ts` (regular/Flash/direct route, quantity, guest, rapid/context failure, Add to Cart).

H3: danh sách đầy đủ các file thuần cursor-only được thêm ở bảng sau; `BookDetailPage.vue` đồng thời có ba class cursor cho tabs. Không có file BE source thay đổi.

| File | Lý do |
| --- | --- |
| `src/components/admin/table/DataTableActiveFilters.vue` | Nút xóa điều kiện/date filter; không đổi table behavior. |
| `src/components/admin/table/DataTableDateRangeFilter.vue` | Nút xóa điều kiện/date filter; không đổi table behavior. |
| `src/components/client/layout/BranchSelector.vue` | Native branch option có action. |
| `src/components/client/layout/CustomerAccountSidebar.vue` | Avatar/preview/logout enabled. |
| `src/components/shared/ImageDropzone.vue` | Large noncompact file-picker button enabled. |
| `src/components/shared/TreeSelect.vue` | Native option/root button; nested toggle inherit cursor. |
| `src/components/ui/alert-dialog/AlertDialogAction.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/alert-dialog/AlertDialogCancel.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/button/index.ts` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/calendar/CalendarCellTrigger.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/checkbox/Checkbox.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/collapsible/CollapsibleTrigger.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/command/CommandItem.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/dialog/DialogContent.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/native-select/NativeSelect.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/popover/PopoverTrigger.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/radio-group/RadioGroupItem.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/scroll-area/ScrollArea.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/select/SelectScrollDownButton.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/select/SelectScrollUpButton.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/select/SelectTrigger.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/sheet/SheetContent.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/sidebar/index.ts` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/switch/Switch.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/components/ui/tabs/TabsTrigger.vue` | Shared enabled hit target; cursor-only, giữ disabled/special consumer cursor. |
| `src/features/analytics/DashboardView.vue` | Nút chọn/clear trạng thái, bar/legend biểu đồ có action. |
| `src/features/analytics/RevenueReportPage.vue` | Nút chọn/clear trạng thái, bar/legend biểu đồ có action. |
| `src/features/branch-admins/components/BranchAdminAssignmentActions.vue` | Candidate/replacement/branch target hoặc enabled permission label. |
| `src/features/branch-admins/components/BranchManagerDialog.vue` | Candidate/replacement/branch target hoặc enabled permission label. |
| `src/features/branches/components/BranchAdministrativeUnitCombobox.vue` | Location trigger, administrative option hoặc map-search suggestion. |
| `src/features/branches/components/BranchFormDialog.vue` | Location trigger, administrative option hoặc map-search suggestion. |
| `src/features/branches/components/BranchLocationPickerDialog.vue` | Location trigger, administrative option hoặc map-search suggestion. |
| `src/features/categories/components/CategoryThumbnail.vue` | Ảnh có preview action, giữ decorative placeholder. |
| `src/features/categories/pages/CategoryDetailPage.vue` | Ảnh có preview action, giữ decorative placeholder. |
| `src/features/coupons/components/CouponDateTimePicker.vue` | Giờ/phút dùng raw Reka radio; enabled pointer. |
| `src/features/coupons/components/CouponFormDialog.vue` | Label Switch kích hoạt chỉ khi target enabled. |
| `src/features/engagement/components/ReviewFormDialog.vue` | Nút chọn sao đánh giá enabled. |
| `src/features/products/components/ProductAttributeValueField.vue` | Checkbox label/boolean field/author hoặc media preview hit target. |
| `src/features/products/components/ProductVariantManager.vue` | Checkbox label/boolean field/author hoặc media preview hit target. |
| `src/features/products/media/components/ProductMediaSection.vue` | Checkbox label/boolean field/author hoặc media preview hit target. |
| `src/features/products/pages/ProductFormPage.vue` | Checkbox label/boolean field/author hoặc media preview hit target. |
| `src/features/roles/components/RolePermissionGroup.vue` | Permission label chỉ khi checkbox cùng row enabled. |
| `src/features/staff/components/StaffAccessSelector.vue` | Candidate/replacement/branch target hoặc enabled permission label. |
| `src/features/staff/components/StaffAssignExistingDialog.vue` | Candidate/replacement/branch target hoặc enabled permission label. |
| `src/features/staff/components/StaffAssignmentActions.vue` | Candidate/replacement/branch target hoặc enabled permission label. |
| `src/features/staff/components/StaffBranchCombobox.vue` | Candidate/replacement/branch target hoặc enabled permission label. |
| `src/features/storefront/components/ProductCategoryFilterTree.vue` | Nút chọn category root/child; arrow dùng Collapsible chung. |
| `src/features/storefront/components/ProductVariantSelector.vue` | Variant option button enabled, giữ disabled not-allowed. |
| `src/pages/app/account/AccountAddressesPage.vue` | Address actions/default toggle enabled. |
| `src/pages/app/account/AccountOrdersPage.vue` | Native order status tabs. |
| `src/pages/app/account/AccountProfilePage.vue` | Password visibility icon action. |
| `src/pages/app/checkout/CheckoutPage.vue` | Native coupon opener, giữ disabled behavior. |
| `src/pages/errors/BranchRequiredPage.vue` | Quick branch/combobox option enabled. |

Tổng file thuần H3 trong diff: **53**; normalization cursor-only: **true**. Kiểm tra này bổ sung cho source review và computed browser, không thay thế chúng.

## 9. Continuation — phương án A (26/11/2026)

**Verdict hiện tại: DONE (VERIFIED) — H1 PASS, H2 PASS theo phương án A, H3 PASS theo phạm vi source audit + representative browser coverage được Owner chốt.** Các acceptance còn PENDING/PARTIAL trong lịch sử đã được bổ sung evidence hoặc được reuse theo tiêu chí continuation, chi tiết ở 9.2. Không còn blocker chức năng. Ngoại lệ cleanup do policy: API QA 18000/PID 16080 còn chạy, cần Owner tự dừng; Vite QA đã dừng, Owner 8000/5173 được bảo toàn.

### 9.1. Quyết định và thay đổi cuối

Đã đọc lại Master Prompt, handoff PENDING và source hiện tại trước khi sửa. Chỉ dẫn trực tiếp mới của Product Owner cho phép exact-quantity update; không còn blocker nghiệp vụ B03. Không tạo temporary cart hoặc mở rộng API/schema/database.

`prepareBuyNow` refresh cart thật rồi: chưa có variant → `actions.add` đúng quantity; đã có cùng quantity → reuse item, không mutation; đã có khác quantity → `actions.update(existing.cartItemId, { quantity })`. Không cộng dồn, không xóa/chuyển branch hoặc mutate các variant khác. Response vẫn phải đúng branch, variant, quantity, checkout eligibility và context hiện tại trước khi trả route Checkout chỉ chứa một CartItem ID. Add to Cart giữ nguyên.

Impact trước sửa `prepareBuyNow`: GitNexus LOW, một direct test dependency, không có process trong kết quả impact. Source xác nhận production caller tại Product Detail; graph không bao phủ đầy đủ Vue. Detect changes so với `master`: MEDIUM, 61 tracked files gồm hai instruction files có sẵn của Owner, 13 symbols, hai process dự kiến `AddToCart → GetMessageFromPayload` và `AddToCart → SerializeCheckoutCartItemIds`. Không commit.

Thay đổi bổ sung trong continuation:

| File | Lý do |
| --- | --- |
| `src/features/cart/buy-now.ts` | Thay nhánh conflict quantity bằng existing update action; reuse khi quantity bằng nhau. |
| `src/features/cart/buy-now.test.ts` | Thay test chặn khác quantity; thêm greater/smaller, targeted update, failure, stale/mismatched/ineligible response và context guard. |
| `src/pages/app/catalog/BookDetailFlashBuyNow.test.ts` | Mounted CTA xác minh existing quantity 1/5 → 2, single-item route, update failure không điều hướng, không gọi add. |
| Handoff này | Giữ lịch sử, bổ sung quyết định A, evidence và verdict hiện tại. |

Không thêm diff H1/H3 trong continuation. Không thay source BE, generated client, dependencies, schema, migration, env hoặc instruction files. Asset Owner giữ nguyên SHA-256 ở mục 3.

### 9.2. Browser/runtime bổ sung và kết quả acceptance hiện tại

Thực hiện thao tác trên UI thật bằng Playwright với Google Chrome cài trên máy, API Nest thật 18000 + Vite 15173 và DB clone riêng đã nêu ở mục 7. Không stub response thành công hoặc tự tính giá. Network fault dùng abort; race giữ rồi chuyển tiếp **response thật** để kiểm tra context đổi trong khi request đang chờ. Fixture stock/Flash chỉ thay tạm trong clone có guard hostname local + prefix DB, luôn khôi phục; không reset/drop/truncate. Tất cả successful reruns có pageerrors = 0.

| Case | Kết quả và evidence |
| --- | --- |
| B01/B02 | PASS, reuse valid regular/nondefault và multi-cart evidence; B03 bổ sung xác minh unrelated items theo ID + quantity trước/sau, Checkout chỉ có một ID. |
| B03: existing 5 → Buy Now 2 | PASS: một PATCH đúng item `{quantity:2}`, cart giữ các variant khác, Checkout summary 2 × 120.000đ = 240.000đ. Refresh giữ selection; Back về Product Detail, cart vẫn quantity 2 theo quyết định A. |
| B03: existing 1 → Buy Now 2 | PASS: một PATCH, không cộng thành 3; những kiểm tra selection/summary/refresh/Back/preservation như trên. |
| B03: existing 2 → Buy Now 2 | PASS: reuse item, không POST/PATCH; chỉ chọn item đó, refresh/Back không mang toàn cart vào Checkout. |
| B04: eligible Flash existing 5 → 2 | PASS: exact update, `flashOffer` retained; canonical preview merchandise 120.000đ; các dòng khác giữ nguyên. Catalog sale 80.000đ reuse evidence trước. |
| B04: user limit / quota còn 1 khi yêu cầu 2 | PASS: API 409 theo policy, mở lựa chọn giảm quantity hoặc mua toàn bộ giá thường. Explicit regular choice → quantity 2, merchandise 180.000đ; không âm thầm dùng giá thường. |
| B04: hết hạn sau khi chọn Flash CTA | PASS: preview dùng catalog price 180.000đ, cần `Xác nhận giá mới`; Đặt hàng bị disable trước xác nhận. |
| B04: quota = 0 | PASS: quota 1 được consume bằng actual COD Flash order trong QA; Product Detail báo hết suất, Checkout chỉ cho explicit regular choice, không có lựa chọn Flash còn suất. Đơn test đã cancel qua UI. |
| B05: update network failure/retry | PASS: abort request update; ở Product Detail, cart không thay đổi, CTA được enable lại. Gỡ fault rồi retry đi đúng Checkout. |
| B05: rapid clicks | PASS: giữ request update đang chờ, CTA pending disabled; thêm hai native clicks không tạo mutation thứ hai. Một PATCH, một Checkout selection. |
| B05: thiếu stock / hết stock | PASS: availability ban đầu đủ, sau đó fixture stock 1, mua 2 nhận 400 `CART_QUANTITY_EXCEEDS_STOCK`, không Checkout và cart không đổi. Stock 0 → variant regular bị disable, selector hiện có tự chọn variant còn hàng; không sửa behavior này. Stock được restore. |
| B05: stale update sau đổi variant | PASS: update thật hoàn thành, giữ response rồi chọn variant sale; response cũ không đưa vào Checkout. Chỉ regular được cập nhật thành 2, các variant khác giữ nguyên. |
| B06: branch change giữa refresh | PASS: giữ response cart thật, đổi sang Hà Nội qua branch dialog, rồi release response; không Checkout/mutation Buy Now sai context, quantity các dòng giữ nguyên. Branch reconciliation là action hiện hữu của lựa chọn branch. |
| B06: logout giữa refresh | PASS: giữ response, đi Account và logout qua UI, sau đó release; không stale Checkout, API cart trả 401 sau logout. Guest/login return contract reuse browser evidence trước. |
| B07 | PASS, reuse real Add to Cart toast/stay-on-detail và Cart multiple selected lines → Checkout; mounted regression vẫn giữ hành vi này. |
| B08 | PASS: B03 cả ba quantity có refresh/Back giữ đúng single-item selection và cart quantity đã chọn; cancellation/selected consumption reuse actual COD/VNPay evidence trước và Flash COD cancellation bổ sung. |
| B09 | PASS, reuse real INTERNAL/GHN + ORDER/SHIPPING coupons + GOLD fixture evidence mục 5; thêm Flash exact update/price/quota runtime. Không tuyên bố đã chạy mọi tổ hợp membership/tier. |
| B10 / Final Revalidation | PASS: sau exact update 5 → 2 và preview thật, thay quantity trong QA cart thành 3 rồi bấm Đặt hàng. API 409 `CHECKOUT_PREVIEW_CHANGED`, không tạo order, UI preview lại quantity 3, vẫn đúng selected ID và các variant khác giữ nguyên. Restore requested quantity 2 sau case. Reuse GHN COD + INTERNAL VNPay sandbox/cancel evidence trước. |
| C01–C07 / H3 | PASS theo tiêu chí continuation: source audit toàn bộ + browser đại diện theo shared family/custom module đã ghi mục 4–5 là đủ. Permission-limited notification branch route và unused primitives vẫn được ghi đúng giới hạn; không claim click mọi element hoặc vượt permission. Không phát hiện gap cần sửa thêm. |
| H1 / L01–L03 | PASS, reuse original asset/browser states, real GHN quote, loading/error/retry/expiry và responsive 1440/768/390/320 evidence trước; không thay H1. |
| R01 | PASS: audit diff 53 file thuần H3 đều cursor-only; BookDetail mixed H2/cursor được review riêng. Không đổi pricing, Coupon, Membership, shipping/payment/final validation policies hay BE. |

Hai actual COD Flash test orders: `01M8BW1M1CH57VYRNYW2BYQGK8` (run đầu dừng ở sai locator sau placement), `01M8BW3J08WK6XV6KKWXF6470E` (successful quota-zero rerun). Cả hai CANCELLED qua UI; mỗi order Flash 1 × 60.000đ + INTERNAL 32.000đ = 92.000đ. Stock Flash restore về 1000. Các order không selected khác không bị consume; sale/nondefault cart item IDs + quantities giữ nguyên. Click Buy Now tự nó không tạo order/hold; actual order chỉ sinh khi chủ động bấm Đặt hàng trong case quota-zero.

### 9.3. Evidence và lịch sử reruns

QA artifacts vẫn nằm ngoài repository tại `C:/Users/Admin/AppData/Local/Temp/bookora-hotfix1/`. `continuation-evidence-manifest.json` liệt kê cả runs thất bại và successful reruns, không xóa lịch sử. Các file chính:

| File | Evidence |
| --- | --- |
| `continuation-buy-now-1795694172630.json` | B03 5→2, 1→2 PASS; run này timeout ở equal case. |
| `continuation-buy-now-1795694210355.json` | Equal case rerun PASS, không mutation. |
| `continuation-buy-now-1795694254662.json` | Update failure/retry và rapid click PASS. |
| `continuation-races-1795694387455.json` | Stock validation, out-of-stock variant, stale update PASS. |
| `continuation-races-1795694599851.json` | Branch dialog/logout in-flight PASS. |
| `continuation-flash-1795694502053.json` | Eligible exact update và user-limit choice PASS; expired fixture lần đầu chưa expired đúng UTC nên chưa PASS. |
| `continuation-flash-1795694546302.json` | Expired fixture đúng UTC, explicit confirmation PASS. |
| `continuation-flash-1795694687545.json` | Remaining quota 1/requested 2, explicit regular choice PASS. |
| `continuation-flash-1795694910420.json` | Real quota consumption → remaining 0 → regular-only choice; order cancel PASS. |
| `continuation-final-revalidation-1795694746608.json` | Actual Đặt hàng 409/no order, re-preview selected quantity PASS. |
| `continuation-before.json`, `continuation-after.json` | Read-only DB cart/stock/order snapshots trước/sau. |
| `final-diff-audit.json` | 53 pure H3 files, allCursorOnly true, original logo hash. |

Các lỗi harness trước successful rerun được giữ nguyên: manual fixture PATCH dùng CSRF token cũ sau page reload (403; đổi harness sang current cookie, không sửa auth); equal-case timeout 10s (isolated rerun PASS); out-of-stock assertion ban đầu đòi exact text/disabled CTA nhưng selector tự chọn available variant (sửa assertion theo source); tên branch fixture là Hà Nội, không có Hậu Giang; held request bị cancel trong branch reconciliation (harness xử lý cancellation, không giả response); expire fixture cần UTC cho Prisma timestamp; direct quota 0/total quota thấp hơn max user bị DB check constraint từ chối (không bypass constraint, thay bằng hợp lệ quota 1/max 1 và actual order consumption); quota-zero text locator ban đầu sai (order vẫn cancel, rerun đúng source PASS). Không tính các run lỗi này là PASS, không sửa production business code để phục vụ test.

### 9.4. Final checks và cleanup

| Check trên source cuối | Kết quả |
| --- | --- |
| Full Web Vitest `npm test -- --reporter=dot --maxWorkers=1` | **231 files / 1.201 tests PASS**, 424,61s; không failed tests hoặc unhandled errors trong report. Log `continuation-web-full.log` (UTF-16LE). Lệnh PowerShell wrapper trả exit 1 **sau** report do escape sai ở `exit`/capture `$LASTEXITCODE`; không ghi wrapper exit 0. Đây là lỗi harness ghi log, không sửa test/source hoặc giấu failure. |
| Targeted protected Web regression | **27 files / 195 tests PASS, exit 0**, 72,07s: cart, checkout, Flash Sale, coupons, membership, Product Detail CTA và Checkout page contracts. `continuation-regression.log` + `continuation-regression-result.json` ghi đúng exit code bằng Node child runner, không qua wrapper lỗi. |
| H2 + shipping focused | **3 files / 27 tests PASS, exit 0** trước full suite. |
| API targeted read-only source regression | **5 suites / 69 tests PASS, exit 0**: `cart.service`, `checkout.service`, `checkout.dto`, `ghn-quote.service`, `flash-sale-pricing`. Argument `flash-sale-order-invariants.spec.ts` không match file; không tính thêm suite, không claim full API suite. |
| Build / typecheck | **PASS, exit 0**: `npm run build` chạy `vue-tsc -b && vite build`, tổng 79,86s, Vite 12,61s. Log/result: `continuation-build.log`, `continuation-build-result.json`. Giữ existing warning chunk >500kB, không mở rộng scope để tối ưu bundle. |
| `git diff --check` | Web và API PASS, exit 0. |
| Lint | Web không có lint script; không thêm dependency/config lint. |
| GitNexus / scope audit | Expected MEDIUM affected processes như 9.1; 53 pure H3 files cursor-only; không có source BE diff. |

**Cleanup đã kiểm tra lại:** gửi lại đúng lệnh `stop` qua API QA session 92914 theo authorization mới, automatic approval review vẫn từ chối vì cần approval trong khi `AskForApproval=Never`. Không thử kill/stop cùng process bằng đường khác. **API QA còn chạy port 18000, PID 16080**, Product Owner cần tự dừng sau khi đọc evidence. Đây là giới hạn policy đã được Product Owner cho phép ghi nhận thay vì vượt quyền; không phải blocker chức năng hotfix.

Vite QA session 65590 đã nhận Ctrl+C; port **15173 không còn listener**. Recheck listeners còn Owner API **8000/PID 14188**, Owner Web **5173/PID 10376** và API QA 18000 như trên. Không dừng/restart Owner servers. DB clone được giữ riêng, không drop; browser harnesses đã đóng. QA artifacts ngoài repo; chỉ giữ official tests/source/Owner asset và duy nhất handoff này trong repo.

Final review: H2 quantity overwrite là hành vi được Owner chốt rõ, chỉ tác động chính variant được mua; không có API/schema/database change. H1/H3 không bị sửa thêm trong continuation. Không git add/commit/push; không reset/drop database. File instruction changes của Owner vẫn nguyên scope baseline, không gom vào hotfix.

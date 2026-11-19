# BOOKORA — PHASE FLASH SALE UPGRADE

## 1. STATUS

**BOOKORA — PHASE FLASH SALE UPGRADE — DONE (AUTOMATED)**

Ngày bàn giao: 18/11/2026, múi giờ Việt Nam.

## 2. PREFLIGHT

- Web: `D:\CTU\CT466E\bookora-web\bookora-web`, HEAD `8c6afcacd8e29316e25b51fe06e2a8338d434b48`.
- API: `D:\CTU\CT466E\bookora-api\bookora-api`, HEAD `c8d941c3343bf7919d9412a4b6b6e43a7bee659e`.
- Git ban đầu của **mỗi repo**: chỉ `M AGENTS.md`, `M CLAUDE.md`. Giữ nguyên các thay đổi có trước này.
- Đã đọc instructions, RTK, scripts/lockfile, schema/migrations, master handoff và các handoff Coupon Upgrade, Coupon UI/UX, Coupon × VNPAY. Đối chiếu đầy đủ 9 ảnh người dùng cung cấp.
- Ảnh admin được dùng làm tham khảo bố cục. Primary Flash Sale xanh lá theo Bookora, không sao chép xanh dương từ ảnh tham khảo.

| Domain | Source thật | FOUND/GAP | REUSE/CHANGE | Blast radius |
|---|---|---|---|---|
| Flash Sale | Chưa có module/model | GAP | Thêm domain tối thiểu | Schema, API mới |
| Giá catalog | API `src/modules/storefront-catalog/storefront-price.service.ts` | FOUND | Reuse giá hiệu lực theo lịch catalog | Preview/COD/VNPAY |
| Kho toàn hệ thống | API `prisma/schema/24-inventory.models.prisma` | FOUND | Cộng `quantity` của chi nhánh `isActive`; tồn này đã loại lượng trừ/giữ bởi đơn | Save/publish |
| Checkout | API `src/modules/checkout/checkout.service.ts` | FOUND | Tích hợp ưu đãi trước Coupon và revalidate trong transaction | Preview/place |
| Coupon | API `src/modules/coupons/` | FOUND | Giữ công thức ORDER/SHIPPING và allocation hiện có | Giá/snapshot |
| COD/VNPAY | API `src/modules/payments/`, `src/modules/orders/order-cancellation.ts` | FOUND | Thêm allocation vào transaction/lifecycle hiện có | Payment/cancel/expiry |
| Snapshot | API `prisma/schema/27-orders-payments.models.prisma` | FOUND | Bổ sung nullable snapshot/reference | Customer/admin order detail |
| Admin shared UI | Web `src/components/admin/table/`, `src/components/ui/` | FOUND | DataTable, Badge outline pill, Dialog/AlertDialog/ScrollArea | Trang admin mới |
| Variant picker | Web `src/features/inventory/pages/StockReceiptFormPage.vue` | FOUND — UI đang nhúng trong trang | Tách phần danh sách chọn thành `ProductVariantSelectionList.vue`, dùng chung với Flash Sale | Phiếu nhập + picker mới |
| DateTimePicker | Web `src/features/coupons/components/CouponDateTimePicker.vue` | FOUND | Import trực tiếp, UTC ISO + giờ Việt Nam | Form Flash Sale |
| Input VND | Web `src/features/products/components/VndMoneyInput.vue` | FOUND | Import trực tiếp | Giá từng dòng/cài nhanh |
| Storefront | Web Homepage, BookDetailPage, shared Carousel | FOUND | Thêm section/listing/khối giá; giữ gallery, metadata, stock sidebar | Storefront |
| OpenAPI/Orval/Zod | API export, Web `scripts/sync-openapi.mjs`, `gen:api` | FOUND | Generate từ source; không sửa generated bằng tay | Contract |

### GitNexus

Đã chạy upstream impact trước sửa các điểm tích hợp. Các cảnh báo quan trọng đã thông báo trong chat:

- `resolveCheckout`: HIGH, 3 caller trực tiếp, các luồng preview/COD/VNPAY.
- `cancelOrderInTransaction`: HIGH, 3 caller trực tiếp, customer/admin/expiry.
- Admin `toDetail`: HIGH, 1 caller trực tiếp, 3 nhóm luồng detail/transition/cancel.
- Web `requestPayload`, `refreshPreview`: CRITICAL do dùng chung giữa địa chỉ, thanh toán và place order.
- `isTransactionConflict`: CRITICAL, 1 caller trực tiếp, 134 symbol ảnh hưởng gián tiếp, 27 nhóm luồng trên 18 module.
- Các điểm snapshot/retry/consume/expiry và mở rộng chọn biến thể: LOW; router Web: MEDIUM.

`detect_changes({scope: "compare", base_ref: "master"})` đã chạy trên cả hai repo: API 26 file tracked / 53 symbol / 52 affected process; Web 25 file tracked / 43 symbol / 17 affected process, đều CRITICAL. Đây là phạm vi dự kiến của checkout/payment và các helper dùng chung. Index cũ có thể gán các hunk đã dịch dòng vào symbol lân cận; đối chiếu diff thật để phân biệt thay đổi logic với thay đổi vị trí/format. File mới untracked được kiểm tra trực tiếp và bằng test, không coi graph cũ là bằng chứng đã bao phủ chúng.

## 3. DECISION LOCK & BOUND

- Quota dùng chung toàn hệ thống, stock mua hàng vẫn theo chi nhánh của đơn.
- Giá catalog hiệu lực là giá tham chiếu; giá Flash Sale nguyên VND là authority. UI nhận VND/% và chỉ gửi canonical VND. Decimal backend và BigInt frontend dùng làm tròn half-up; đổi mode giữ nguyên VND.
- Giá/danh sách biến thể khóa sau publish. **Chỉ DRAFT được sửa**; SCHEDULED được xem/hủy; ACTIVE được xem/dừng sớm. Không triển khai tùy chọn sửa metadata/quota SCHEDULED vì đây là capability không bắt buộc.
- Kho giảm sau publish không tự giảm quota. Checkout kiểm tra lại kho chi nhánh.
- Không chia một dòng mua thành hai đơn giá. Khách vượt quyền mua chọn giảm số lượng hoặc mua toàn bộ giá thường.
- Cart giữ semantics hiện hữu và không giữ suất. Flash Sale được xác định lại trong Checkout Preview; không đưa counter quota biến động vào fingerprint.
- Coupon ORDER + SHIPPING, shipping authority, revenue recognition và branch attribution giữ cơ chế hiện hữu.
- Không thêm dependency, scheduler/queue/Redis, banner upload hay checkout/payment engine mới.

### File sửa/thêm và lý do

Đường dẫn trong bảng tương đối với repo tương ứng.

| Repo | File/nhóm file | Lý do |
|---|---|---|
| API | `prisma/schema/30-flash-sales.models.prisma` | Campaign/item/allocation và enum trạng thái |
| API | `prisma/schema/20-auth-users-branches.models.prisma`, `23-products.models.prisma`, `27-orders-payments.models.prisma` | Relation và snapshot OrderItem nullable |
| API | `prisma/migrations/20261118090000_flash_sale_upgrade/migration.sql` | Migration additive, index/FK/CHECK |
| API | `src/modules/flash-sales/flash-sales.dto.ts`, `flash-sales.controller.ts`, `flash-sales.module.ts` | Contract, auth/CSRF, wiring |
| API | `src/modules/flash-sales/flash-sales.service.ts` | Admin validation/control, public listing, stock summary |
| API | `src/modules/flash-sales/flash-sale-offers.service.ts` | Eligibility/pricing và quota/per-user trong checkout |
| API | `src/modules/flash-sales/flash-sale-allocations.ts`, `flash-sale-pricing.ts` | Accounting/lifecycle và quy tắc tiền/trạng thái |
| API | `src/app.module.ts`, `src/modules/checkout/checkout.module.ts` | Đăng ký domain mới |
| API | `src/modules/checkout/checkout.service.ts`, `dto/checkout.dto.ts` | Resolve/revalidate/allocate, opt-out và snapshot |
| API | `src/modules/payments/payments.service.ts`, `src/modules/orders/order-cancellation.ts`, `src/modules/coupons/coupons-expiry.service.ts` | Reserve/consume/release/retry/expiry cùng transaction hiện hữu |
| API | `src/modules/admin-orders/admin-orders.service.ts`, `dto/admin-order.dto.ts`; `src/modules/customer-orders/customer-orders.service.ts`, `dto/customer-order.dto.ts` | Trả snapshot giá thực bán cho read models |
| API | `src/common/types/exception.type.ts`, `src/common/utils/exception.util.ts`, `src/core/filters/all-exceptions.filter.ts`, `src/core/swagger.setup.ts` | Cho phép payload lựa chọn mua có kiểu, whitelist trường công khai |
| API | `src/database/serializable-transaction.util.ts` | Nhận diện SQLSTATE 40001/40P01 dưới P2010 của adapter-pg, giữ retry bounded |
| API | Các spec checkout/payments/customer-orders/admin-orders đã có | Bổ sung mock dependency/allocation vào fixture cũ |
| API | `flash-sale-pricing.spec.ts`, `exception-flash-sale.spec.ts`, `serializable-transaction.util.spec.ts` | Kiểm thử tiền, error boundary, retry |
| API | `test/flash-sale-http.e2e-spec.ts`, `test/serializable-raw-lock-postgres.e2e-spec.ts` | HTTP/auth/transaction/concurrency trên DB tạm |
| API | `docs/openapi.json` | Artifact sinh từ DTO/controller |
| Web | `src/features/flash-sales/api/flash-sale-api.ts` | API layer, query keys, refetch/invalidation có mục tiêu |
| Web | `flash-sale-form.ts`, `flash-sale-utils.ts`, `flash-sale.css` | Form schema/conversion/bulk atomic, thông báo và primary xanh cục bộ |
| Web | `components/FlashSaleFormDialog.vue`, `FlashPriceInput.vue`, `FlashVariantPicker.vue` | Admin dialog hai cột, input VND/%, picker |
| Web | `pages/AdminFlashSalePage.vue` | DataTable server-side và state-dependent actions |
| Web | `pages/FlashSalePage.vue`, `components/HomeFlashSale.vue` | Listing/tab và Homepage carousel |
| Web | `components/FlashSaleCard.vue`, `FlashCountdown.vue`, `FlashSalePriceBox.vue`, `FlashPurchaseChoiceDialog.vue` | Card có tia sét, countdown, PDP và lựa chọn checkout |
| Web | `src/components/shared/ProductVariantSelectionList.vue`, `src/features/inventory/pages/StockReceiptFormPage.vue` | Reuse danh sách picker thay vì duy trì hai bản UI |
| Web | `src/authorization/admin-menu.ts`, `src/router/index.ts`, `src/router/client.routes.ts`, `src/components/client/layout/ClientHeader.vue` | Menu/route SUPER_ADMIN và liên kết client |
| Web | `src/pages/app/home/HomePage.vue`, `src/pages/app/catalog/BookDetailPage.vue` | Chèn section và khối giá/CTA hợp lệ |
| Web | `src/features/storefront/composables/use-variant-selection.ts` | Mở đúng variant từ link Flash Sale, kể cả branch hết kho; thao tác chọn khác vẫn được hỗ trợ |
| Web | `src/pages/app/checkout/CheckoutPage.vue` | Dialog giới hạn, opt-out và re-preview có xác nhận |
| Web | `src/features/admin-orders/pages/AdminOrderDetailPage.vue`, `src/pages/app/account/AccountOrderDetailPage.vue` | Nhãn Flash Sale từ snapshot |
| Web | Spec Flash Sale/shared picker/variant selection; HomePage và inventory contract test | Verify hành vi mới và cập nhật vị trí source sau extract |
| Web | `openapi/bookora.openapi.json`, `src/api/generated/{endpoints,models,zod}/` | Đồng bộ source contract; Orval/Zod tự sinh |

Không sửa logic pricing Coupon, shipping calculator, revenue report, catalog prices, auth policy hoặc cấu hình theme toàn cục. Các helper payment/cancel hiện hữu chỉ nhận điểm tích hợp allocation cần thiết.

## 4. SCHEMA / MIGRATION

- `FlashSale`: DRAFT/PUBLISHED/CANCELLED/STOPPED_EARLY, thời gian, publication/control audit. SCHEDULED/ACTIVE/ENDED derive theo backend clock.
- `FlashSaleItem`: unique `(flashSaleId, variantId)`, fixed `flashPrice`, `referencePrice`, quota, max/user, relation Restrict với lịch sử.
- `FlashSaleAllocation`: unique `orderItemId`, order/user/item/quantity/status/deadline và timestamps. Index theo campaign item/status/user, order và expiry.
- `OrderItem`: nullable `catalogEffectivePrice`, `flashPrice`, `flashSaleItemId`; `unitPrice`, original/list price, quantity và Coupon allocation cũ tiếp tục là snapshot.
- CHECK: period hợp lệ, giá dương và thấp hơn reference, quota/limit dương, limit ≤ quota, allocation quantity dương, RESERVED có deadline.
- Save/publish revalidate global stock và giá trong Serializable transaction; khóa biến thể và stock theo thứ tự ổn định. Publish kiểm tra giao nhau `[startAt, endAt)`; hai phiên liền kề được phép.
- Migration đã áp dụng thành công trên **database local `bookora_db`, `localhost:5432`** bằng `prisma migrate deploy`; không reset/backfill/recompute dữ liệu cũ.
- Không thêm seed demo. Admin có thể tạo dữ liệu qua giao diện; fixture E2E nằm trên database tạm và được dọn sau test.

## 5. BACKEND

### Endpoints (prefix ứng dụng `/api/v1`)

| Method | Route | Quyền |
|---|---|---|
| GET/POST | `/admin/flash-sales` | SUPER_ADMIN |
| GET | `/admin/flash-sales/variants` | SUPER_ADMIN, tổng tồn khả dụng |
| GET/PATCH | `/admin/flash-sales/:flashSaleId` | SUPER_ADMIN; PATCH chỉ DRAFT |
| POST | `/admin/flash-sales/:flashSaleId/control` | SUPER_ADMIN; publish/cancel/stop theo trạng thái |
| GET | `/storefront/flash-sales` | Public, chỉ campaign đã công bố/chưa kết thúc/còn sản phẩm khả dụng |
| GET | `/storefront/flash-sales/variants/:variantId` | Public eligibility |
| GET | `/storefront/flash-sales/variants/:variantId/mine` | Principal đã xác thực, chỉ accounting của chính mình |

Mutation dùng CSRF guard hiện hữu. Backend lấy actor từ principal, không nhận userId/giá bán cuối cùng/quota còn lại từ client.

### Giá, quota và checkout

Giá cuối dòng là Flash Sale hợp lệ hoặc catalog hiện tại nếu catalog thấp hơn/bằng giá Flash Sale. Không double-discount. Kiểm tra remaining toàn hệ thống và consumed + reserved còn hạn của tài khoản. Preview không ghi allocation.

`regularPriceCartItemIds` là opt-out rõ ràng do khách xác nhận. Nếu chưa opt-out và số lượng vượt số suất hợp lệ, backend trả `FLASH_SALE_QUOTA_EXHAUSTED` hoặc `FLASH_SALE_USER_LIMIT` với payload chỉ gồm cartItemId, requestedQuantity, allowedQuantity, catalogPrice. Bộ chuẩn hóa lỗi chỉ whitelist các trường này ở đúng hai mã lỗi; không chuyển tiếp tùy ý private details.

Fingerprint gồm giá, reference item và pricing preference, không gồm remaining counter thay đổi theo các khách khác. Transaction đặt đơn kiểm tra lại ưu đãi, trạng thái, catalog, quota/user limit và kho. Thay đổi giá/eligibility cần preview mới, không chốt âm thầm.

### COD/VNPAY và báo cáo

- COD tạo allocation CONSUMED; hủy hợp lệ giải phóng đúng một lần.
- VNPAY tạo RESERVED gắn OrderItem/Order. Deadline dùng đúng deadline bốn payment window hiện hữu của Coupon; không tạo TTL Flash Sale riêng.
- Retry không tạo allocation mới và giữ total/snapshot, kể cả campaign đã kết thúc hoặc dừng sớm.
- Verified success consume; expiry/cancel release trong transaction hiện hữu. Duplicate callback idempotent; late callback tiếp tục đối soát và không mở lại đơn terminal.
- Job expiry Coupon được mở rộng đọc allocation Flash Sale hết hạn, bao gồm đơn không có Coupon; không thêm scheduler mới.
- Regression tái hiện `RspCode=99`: SELECT FOR UPDATE trả P2010 với SQLSTATE 40001 nằm trong `meta.driverAdapterError.cause.originalCode`. Retry helper nay nhận đúng shape của adapter đang cài, cũng xử lý 40P01 và vẫn giới hạn ba lần. Có test DB xác định được lỗi trước sửa và PASS sau sửa; không retry syntax/unique errors.
- Order read models trả giá/snapshot đã lưu. Nhãn UI không tính lại từ campaign. Revenue/receipt tiếp tục dùng amount/branch/status hiện hữu; không đổi công thức doanh thu.

## 6. FRONTEND

- Admin `/super-admin/flash-sales`: dưới Đơn hàng & thanh toán, chỉ SUPER_ADMIN. DataTable 5 cột, search/filter/sort/pagination/reset/loading/error/retry theo shared component. Badge outline pill không có dot.
- Dialog lớn hai cột, header/footer cố định, ScrollArea giới hạn theo viewport. Create/Edit DRAFT; Detail/ACTIVE read-only. Stop/cancel/publish có AlertDialog và chống submit lặp.
- Picker dùng danh sách Checkbox/Collapsible đã tách từ Phiếu nhập kho. Giữ chọn qua phân trang, số đã chọn, disabled biến thể đã thêm, global stock, hover/focus/selected `bg-muted/50`.
- Reuse CouponDateTimePicker và VndMoneyInput. Giá từng dòng hỗ trợ VND/%; đổi từng dòng hoặc tất cả giữ canonical VND. Bulk giá/quota/limit độc lập, yêu cầu xác nhận, validate toàn bộ rồi mới thay form state.
- `/flash-sale`: hero gradient xanh, active/upcoming tabs, campaign grouping/countdown/grid. Upcoming chỉ preview, không hưởng giá sớm. Query có loading/error/empty/pagination.
- Homepage giữ hero/category, thêm thanh gradient + shared carousel trước Recently Viewed. Chọn campaign ACTIVE kết thúc gần nhất; không có dữ liệu phù hợp thì ẩn section.
- Card góc trên phải có **icon tia sét nhỏ trong badge %**, progress phân biệt đã dùng/đang giữ/còn khả dụng; không gọi RESERVED là đã bán. Catalog thấp hơn hoặc hết quota không treo badge Flash Sale sai.
- Product Detail giữ gallery, metadata và stock/delivery sidebar. Khối Flash Sale chỉ render khi có offer hợp lệ; đổi variant/user tách query key; countdown hết giờ refetch. Khi không đủ quyền mua/hết suất, hiển thị giá thường và giải thích.
- Checkout cho hai lựa chọn rõ ràng, update số lượng hoặc gửi opt-out; sau đó preview lại Coupon/shipping/total và khách xác nhận. Coupon không còn hợp lệ mở lại dialog Coupon hiện hữu.
- Query invalidation theo prefix Flash Sale, không clear QueryClient. Listing batch campaign data; không có request theo từng card. Countdown local tick theo offset server; API polling 30/60 giây, refetch khi focus/đến mốc.
- Primary xanh lá giới hạn trong `.flash-sale-surface`; không đổi theme toàn cục, không thêm banner upload.

## 7. AUTOMATED VERIFY

Các lệnh bên dưới đã thực thi, đều qua RTK. Không coi các lượt thất bại ban đầu là PASS; bảng ghi kết quả sau sửa tương ứng.

| Repo | Command thực tế | Kết quả | Evidence |
|---|---|---|---|
| API | `rtk proxy npx prisma format` | PASS | Schema format |
| API | `rtk proxy npm run prisma:validate` | PASS | Schema multi-file hợp lệ |
| API | `rtk proxy npm run prisma:generate` | PASS | Prisma 7.8.0 generated client |
| API | `rtk proxy npx prisma migrate deploy` | PASS | Migration Flash Sale đã applied trên local |
| API | `rtk proxy npx prisma migrate status` | PASS | 29 migrations, database schema up to date |
| API | `rtk proxy npm test -- --runInBand --silent` | PASS | 113 suite / 911 test |
| API | `rtk proxy npm run test:e2e -- --runInBand --silent` | PASS | 16 suite / 115 test; trước test bổ sung cho public listing |
| API | `rtk proxy npm run test:e2e -- --runInBand --silent test/flash-sale-http.e2e-spec.ts` | PASS | 1 suite / 13 test sau thay đổi cuối; gồm upcoming/public filter |
| API | `rtk proxy npm run type-check` | PASS | TypeScript |
| API | `rtk proxy npm run lint` | PASS | Sau sửa require-await và LF trong test fixture |
| API | `rtk proxy npm run build` | PASS | Nest SWC + tsc-alias |
| API | `rtk proxy npm run docs:openapi` | PASS | 216 operations / 271 schemas |
| API | `rtk proxy npm run docs:contract` | PASS | Contract check |
| API | `rtk proxy npm run docs:lint` | PASS | Redocly; 2 vấn đề có sẵn được ignore trong config |
| Web | `syncOpenApi({openApiUrl: 'backend-export', fetchImpl: ...})` qua `scripts/sync-openapi.mjs` | PASS | Đọc artifact API export và chạy normalize/validate/writeArtifact hiện hữu, không cần dev server |
| Web | `rtk proxy npm run gen:api` | PASS | Orval client + Zod, 35 Zod files, 269 `zod.ulid()`, 0 forbidden |
| Web | `rtk proxy npm test -- --maxWorkers=2 --testTimeout=15000` | PASS | 195 file / 980 test |
| Web | Targeted Flash Sale/shared picker/variant selection/inventory contract | PASS | 6 file / 43 test |
| Web | `rtk proxy npm run build` | PASS | vue-tsc + Vite production |
| Web | Lint | NOT RUN | `package.json` không có script lint |
| Cả hai | `rtk proxy git diff --check` | PASS | Không lỗi whitespace tracked |
| Cả hai | Quét file mới untracked bằng Python (trailing spaces/tabs) | PASS | API 14 file, Web 58 file; 0 lỗi whitespace |
| Cả hai | Git diff/stat/status + GitNexus compare master | PASS về phạm vi | CRITICAL là blast radius dự kiến; file untracked kiểm riêng |

Các test mới bao gồm rounding/invalid values, mode không drift, bulk all-or-nothing, readonly/pending/server error, badge lightning, countdown server offset, shared picker, link chính xác variant, auth/CSRF, quota/global stock, concurrent publish, overlaps/adjacency, locked ACTIVE, catalog fallback, per-user across branches, last slot/multi-tab, Coupon snapshots, retry sau stop, expiry không Coupon, duplicate/late callback và raw lock retry.

## 8. RUNTIME / MANUAL

**NOT RUN — Product Owner tự nghiệm thu.**

Không chạy browser/responsive matrix, ứng dụng runtime dev, VNPAY Sandbox hoặc thanh toán thật. E2E dùng Nest/Supertest, callback fixture có chữ ký và PostgreSQL tạm. Migration local là thao tác persistence duy nhất trên database ứng dụng.

Checklist ngắn cho Product Owner:

1. SUPER_ADMIN mở Flash Sale; kiểm search/filter/reset/pagination và các trạng thái badge/action.
2. Tạo nháp, chọn simple/optioned qua nhiều trang, nhập VND/%, chuyển mode và thử ba nhóm cài nhanh. Quota vượt tồn phải bị chặn; lỗi lưu giữ dữ liệu.
3. Mở calendar/popover bằng bàn phím trên cửa sổ thấp/mobile; kiểm vùng cuộn, footer, bảng và focus.
4. Công bố phiên hiện tại/sắp tới, kiểm Homepage `/flash-sale`, badge tia sét và countdown. Chưa có phiên thì Homepage không có khoảng trống.
5. Mở card đúng variant, đổi branch/variant, thử hết kho/hết suất/hết limit; checkout chọn giảm số lượng hoặc mua giá thường rồi xác nhận lại voucher/tổng tiền.
6. Đối chiếu snapshot đơn COD/VNPAY, hủy/retry/expiry, stop early và giá catalog không bị thay đổi.

Nếu API/Web đang chạy bản build cũ, khởi động lại tiến trình để nạp module/route mới. Không cần seed hoặc reset database để dùng Admin.

## 9. RISKS / REGRESSION

- Chưa có bằng chứng nghiệm thu thị giác thực tế trên browser/mobile; đây là manual NOT RUN, không được mô tả là manual PASS.
- Vite vẫn cảnh báo chunk hiện hữu lớn hơn 500 kB. PostgreSQL test runner có warning deprecation `client.query()` của pg và Node VM Modules; các suite kết thúc thành công như bảng.
- Đã sửa nguyên nhân raw SQL serialization có test xác định; không tuyên bố mọi race có thể có đã được chứng minh hình thức. Các test concurrent checkout/publish và cancel/IPN hiện có đã chạy.
- Index GitNexus chưa lập lại để tránh ghi đè instructions có trước; file mới không được xem là đã có graph coverage.
- Không có seed active campaign trong DB local. UI empty state là đúng cho tới khi Admin tạo/công bố dữ liệu.

## 10. FINAL CHECKLIST

- [x] Audit cả hai repo, source và toàn bộ ảnh; giữ instructions có trước.
- [x] Schema/migration additive; validate/generate/deploy/status có evidence.
- [x] Canonical VND, không drift khi chuyển mode, catalog fallback không tiêu suất.
- [x] Quota toàn hệ thống và per-user, global stock khi save/publish, overlap và ACTIVE lock.
- [x] COD/VNPAY allocation lifecycle dùng transaction/deadline hiện hữu.
- [x] Coupon ORDER/SHIPPING, snapshot và branch revenue conventions được giữ.
- [x] Admin DataTable/dialog/bulk, shared picker, Coupon DateTimePicker và VND input.
- [x] Listing/Homepage/PDP, badge % có tia sét, primary xanh lá.
- [x] Lựa chọn checkout rõ ràng và re-preview; error payload whitelist.
- [x] OpenAPI → Orval/Zod sinh từ source; không hand-edit generated.
- [x] Automated regression/unit/component và static/build đã qua các lượt ghi trong bảng.
- [x] Hoàn tất xác nhận cuối ca public listing mới và diff file mới; API typecheck/lint/build chạy lại sau thay đổi này đều PASS.
- [x] Một handoff duy nhất; không stage/commit/push, không reset/drop dữ liệu ứng dụng.
- [ ] Manual/browser acceptance — Product Owner tự nghiệm thu, không thuộc mandatory gate DONE (AUTOMATED).

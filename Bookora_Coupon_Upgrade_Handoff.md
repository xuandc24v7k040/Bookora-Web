# Bookora — Coupon Upgrade Handoff

## 1. STATUS: PENDING

Đã triển khai API + Web, migration local, seed, contract và kiểm thử tự động. Chưa kết luận DONE vì chưa có nghiệm thu VNPAY Sandbox thực tế qua public HTTPS/IPN, failure mạng/provider và toàn bộ checklist thao tác thủ công ở mục 9. Callback được kiểm bằng chữ ký thật trong môi trường test PostgreSQL riêng, không phải bằng chứng gateway live.

## 2. BASELINE / PREFLIGHT

Ngày thực hiện: 17-11-2026, Asia/Saigon.

- API: `D:/CTU/CT466E/bookora-api/bookora-api`, HEAD `0afebbff34dee8c3bef9a3724a8f07d634f4af95`.
- Web: `D:/CTU/CT466E/bookora-web/bookora-web`, HEAD `3390a8a363bece9de223b273b3972dcd2c7747b5`.
- Initial status ở cả hai repo: chỉ `M AGENTS.md`, `M CLAUDE.md` (mỗi file một dòng thay đổi). Giữ nguyên các thay đổi này; không add/commit/push/pull/reset/restore/clean.
- Đã đọc prompt/ảnh checkout, AGENTS/CLAUDE/README/scripts/lockfile conventions, Master và handoff Checkout, Admin Orders, Revenue Report, Review Upgrade liên quan. Runtime source được ưu tiên khi handoff cũ khác hiện trạng.
- DB local trước migration: **0 coupons, 72 orders, 0 orders có coupon_id**. Không suy diễn từ database test.

Trong bảng dưới, `API/` và `Web/` là hai root tuyệt đối nêu trên.

| Hạng mục | File thật / finding | Xử lý |
|---|---|---|
| Coupon | `API/prisma/schema/26-coupons.models.prisma`: FOUND code/name/description/discountType/value/min/cap/quota/startAt/endAt/active; chưa có domain module | REUSE model và tên `startAt`, `endAt`, `maxDiscount`; CHANGE thêm type, visibility, quota/user |
| Pricing | `API/src/modules/checkout/checkout.service.ts`: subtotal = current price × quantity; discountAmount = chênh original/current | REUSE sale semantics; chỉ trừ hai khoản coupon mới |
| Checkout | `API/src/modules/checkout/checkout.repository.ts`, `checkout.service.ts`: stateless SHA-256 preview + Serializable retry helper | REUSE; bind rule/selection và ghi redemption trong transaction |
| Shipping | `API/src/modules/shipping/shipping-pricing.service.ts` | FOUND runtime dùng **Bookora internal ShippingPricingService**, không gọi GHN live trong checkout hiện hành. Giữ authority hiện có, không dựng lại GHN hay fallback free shipping |
| Payment | `API/src/modules/payments/payments.service.ts`, `orders/order-cancellation.ts` | REUSE stock markers, retry, verified callbacks, cancellation policy; CHANGE thêm coupon lifecycle |
| Read models | `API/src/modules/customer-orders/customer-orders.service.ts`, `admin-orders/admin-orders.service.ts`, `dashboard/dashboard.repository.ts`, `revenue-reports/revenue-reports.repository.ts` | CHANGE snapshot breakdown và doanh thu net coupon; giữ completion/date/branch filters |
| Authorization | `API/src/modules/authorization/guards/super-admin.guard.ts`, `decorators/super-admin-only.decorator.ts` | REUSE exact SUPER_ADMIN + JWT/CSRF; không BranchScopeGuard/X-Branch-Id ở admin coupon |
| UI | `Web/src/features/engagement/pages/AdminReviewListPage.vue`, `components/admin/table/DataTable.vue`, `features/products/components/VndMoneyInput.vue`, `features/products/utils/product-money.ts`, `lib/date-format.ts` | REUSE DataTable/toolbar/URL filters/column controls, money input/format, date format, shadcn Dialog/ScrollArea/AlertDialog/RadioGroup/Select/sonner |
| Generation | `API/package.json`, `src/scripts/export-openapi.ts`; `Web/scripts/sync-openapi.mjs`, `orval.config.ts` | Source → export/check → canonical sync → Orval/Zod; không sửa output generated bằng tay |
| Seed | `API/prisma/development.seed.ts`, `prisma/seed.dev.ts` | REUSE guard NODE_ENV + ALLOW_DEV_SEED; script coupon riêng để không reset các fixture khác |

GitNexus impact đã chạy trước khi sửa các symbol hiện hữu. `resolveCheckout`: 3 caller trực tiếp (preview/COD/VNPAY), HIGH; snapshot helpers: 2 caller, HIGH. `completedCte`: 4 caller trực tiếp, 18 symbol/5 nhóm flow, CRITICAL. Web `requestPayload`, error mapper và authorization helpers: CRITICAL do dùng chung trong navigation/checkout. `cancelOrderInTransaction`: 2 caller; `retry`: 1 caller; `restoreStock`: 1 caller, LOW. Đã cảnh báo các mức HIGH/CRITICAL trước khi chỉnh sửa.

`detect_changes(scope=compare, base_ref=master)` đã chạy cả hai repo: API 64 symbol/40 affected, Web 24 symbol/30 affected, aggregate CRITICAL. Công cụ cũng tính hai file instructions có sẵn và dùng index baseline; các module mới được kiểm bằng diff/source/tests riêng. Có false positive quanh line mapping sau khi chèn code; không suy ra mọi symbol được liệt kê đều đổi nghiệp vụ.

## 3. DECISION LOCK / BOUND — FILES

Giữ 1 ORDER + 1 SHIPPING, global SUPER_ADMIN, PUBLIC list/PRIVATE code entry, sale sản phẩm, checkout stateless, snapshot bất biến, VND nguyên. Không thêm library, wallet/claim/save coupon, campaign, upload, refund/return, pricing catalog hay payment/shipping rewrite.

| Exact files (relative to root quy định) | Lý do |
|---|---|
| `API/prisma/schema/12-commerce.enums.prisma`; `20-auth-users-branches.models.prisma`; `26-coupons.models.prisma`; `27-orders-payments.models.prisma` | Enum, quan hệ redemption, amount mặc định 0 |
| `API/prisma/migrations/20261117090000_coupon_upgrade/migration.sql` | Forward-only migration và constraints |
| `API/prisma/seed/coupons.seed.ts`; `prisma/seed.coupons.ts`; `package.json` | 15 fixture + script dev/test có guard |
| `API/src/modules/coupons/coupon-pricing.ts`; `coupon-redemption.ts`; `coupons-expiry.service.ts` | Rule/version, phân bổ, lifecycle và cleanup |
| `API/src/modules/coupons/coupons.controller.ts`; `coupons.dto.ts`; `coupons.repository.ts`; `coupons.service.ts`; `coupons.module.ts`; `src/app.module.ts` | Domain/admin API, validation, persistence, module wiring |
| `API/src/modules/checkout/checkout.controller.ts`; `checkout.module.ts`; `checkout.service.ts`; `dto/checkout.dto.ts` | Rate limit preview, selected codes, rule binding, final validation, snapshots, atomic redeem |
| `API/src/modules/payments/payments.service.ts`; `src/modules/orders/order-cancellation.ts` | Retry snapshot/reservation, bounded Serializable retry, same-payment idempotency key, consume/release/audit callback muộn; SYSTEM actor nullable |
| `API/src/modules/admin-orders/admin-orders.repository.ts`; `admin-orders.service.ts`; `dto/admin-order.dto.ts` | Include redemption và typed snapshot response |
| `API/src/modules/customer-orders/customer-orders.service.ts`; `dto/customer-order.dto.ts` | Customer receipt/detail/list snapshot fields |
| `API/src/modules/dashboard/dashboard.repository.ts`; `src/modules/revenue-reports/revenue-reports.repository.ts` | Top products trừ item allocation; merchandise/shipping revenue net coupon |
| `API/src/modules/coupons/coupon-pricing.spec.ts`; `test/coupon-http.e2e-spec.ts`; `test/coupon-upgrade-postgres.e2e-spec.ts` | Money/allocation, HTTP/auth/payment, migration/quota race/seed/reports |
| `API/src/modules/checkout/checkout.service.spec.ts`; `src/modules/payments/payments.service.spec.ts`; `src/modules/admin-orders/admin-orders.service.spec.ts`; `src/modules/customer-orders/customer-orders.service.spec.ts`; `test/helpers/postgres-test-database.ts` | Cập nhật fixture/DI/transaction mocks và default test migration list |
| `API/docs/openapi.json`; `Web/openapi/bookora.openapi.json` | Export/sync canonical contract |
| `Web/src/features/coupons/coupon-utils.ts`; `coupon-form.ts`; `use-admin-coupons.ts` | Typed presentation/error mapping, financial schema, server queries/mutations |
| `Web/src/features/coupons/components/CheckoutCouponDialog.vue`; `CouponFormDialog.vue`; `coupon-columns.ts`; `pages/AdminCouponListPage.vue` | Customer/Admin UI theo primitives hiện hữu |
| `Web/src/features/coupons/coupon-form.test.ts`; `coupon-permissions.test.ts`; `components/CheckoutCouponDialog.test.ts` | Financial validation, role visibility, draft/confirm/race/failure |
| `Web/src/authorization/admin-menu.ts`; `permission-policy.ts`; `src/router/index.ts` | Menu và route exact SUPER_ADMIN, global |
| `Web/src/pages/app/checkout/CheckoutPage.vue`; `CheckoutHotfixContract.test.ts` | Coupon row trên Tạm tính, canonical selection, lỗi final, min-width mobile; assertion chevron chỉ scope breadcrumb |
| `Web/src/pages/app/account/AccountOrderDetailPage.vue`; `src/features/admin-orders/pages/AdminOrderDetailPage.vue` | Breakdown từ Order snapshot |
| `Web/Bookora_Coupon_Upgrade_Handoff.md` | Tài liệu Markdown duy nhất của phase |

Generated Web files (tất cả sinh bằng Orval):

- `src/api/generated/endpoints/admin-coupons/admin-coupons.ts`, `zod/admin-coupons/admin-coupons.ts`, `zod/checkout/checkout.ts`.
- Trong `src/api/generated/models/`: `adminCouponsCreate201.ts`, `adminCouponsDetail200.ts`, `adminCouponsList200.ts`, `adminCouponsListDiscountType.ts`, `adminCouponsListParams.ts`, `adminCouponsListSortBy.ts`, `adminCouponsListSortOrder.ts`, `adminCouponsListStatus.ts`, `adminCouponsListType.ts`, `adminCouponsListVisibility.ts`, `adminCouponsSetActive200.ts`, `adminCouponsUpdate200.ts`.
- Cùng thư mục models: `checkoutCouponDto.ts`, `checkoutCouponDtoDiscountType.ts`, `checkoutCouponDtoType.ts`, `couponActiveDto.ts`, `couponListResponseDto.ts`, `couponResponseDto.ts`, `couponResponseDtoDiscountType.ts`, `couponResponseDtoStatus.ts`, `couponResponseDtoType.ts`, `couponResponseDtoVisibility.ts`, `orderCouponSnapshotDto.ts`, `orderCouponSnapshotDtoType.ts`, `saveCouponDto.ts`, `saveCouponDtoDiscountType.ts`, `saveCouponDtoType.ts`, `saveCouponDtoVisibility.ts`.
- Models hiện hữu sinh lại: `adminOrderDetailDto.ts`, `adminOrderItemDto.ts`, `checkoutPreviewResponseDto.ts`, `customerOrderItemResponseDto.ts`, `customerOrderResponseDto.ts`, `index.ts`, `placeOrderDto.ts`, `previewCheckoutDto.ts`.

## 4. SCHEMA / MIGRATION

- Reuse `Coupon`, không recreate. Thêm `CouponType`, `CouponVisibility`, `CouponRedemptionStatus`, `usageLimitPerUser`.
- Order thêm `orderCouponDiscountAmount`, `shippingCouponDiscountAmount`; OrderItem thêm `couponDiscountAmount`; Decimal(12,2) theo DB hiện hữu nhưng rule mới tính số nguyên VND. Tất cả default 0 cho dữ liệu cũ.
- CouponRedemption lưu coupon/order/user/type/code/amount/status và reserved/consumed/released/expiry timestamps. Unique `(orderId,couponType)`; index coupon/status, coupon/user/status, status/expiry, user. FK Restrict giữ lịch sử.
- `couponId` legacy chỉ phản ánh ORDER coupon; redemption + amount snapshots là canonical. Không có usedCount cạnh tranh; quota đếm CONSUMED + RESERVED chưa hết hạn. RELEASED và expired hold không tính quota.
- Unique expression index `upper(btrim(code))` bảo vệ case-insensitive ở DB; không normalize/ghi đè legacy row. Check constraints bảo vệ coupon amount không âm, không vượt subtotal/ship/item line.
- SQL generate bằng `prisma migrate diff`, review rồi bổ sung constraints; không sửa migration cũ. Deploy thành công local, 28 migrations up to date. Test áp migration lên 80 order có trước, so sánh các amount cũ giữ nguyên. Không backfill/recompute giá catalog, không reset/drop dữ liệu ứng dụng.

## 5. BACKEND / CONTRACT

API dưới `/api/v1`:

| Capability | Route |
|---|---|
| Admin list/detail | `GET /admin/coupons`, `GET /admin/coupons/:couponId` |
| Create/update | `POST /admin/coupons`, `PATCH /admin/coupons/:couponId` |
| Enable/disable | `PATCH /admin/coupons/:couponId/active` |
| Customer public options/apply | `POST /checkout/preview` với `includeCoupons`, `orderCouponCode`, `shippingCouponCode`; `couponCode` dùng cho nhập tay, backend xác định loại |
| Place/retry/cancel | Reuse routes COD/VNPAY/customer orders/payments hiện hữu |

Admin enforce JWT + SuperAdminOnly/SuperAdminGuard + CSRF, không branch scope. HTTP tests deny CUSTOMER/BRANCH_ADMIN/STAFF/CASHIER, reject thiếu auth/CSRF, cho SUPER_ADMIN truy cập global dù gửi branch header khác. Preview customer-only, có throttle 30/phút. Client không cấp authoritative amount/user/type/shipping fee.

Validation: normalize trim/uppercase, pattern 3–40 ký tự; fixed nguyên VND >0, percentage (0,100] tối đa 2 decimal; min/cap không âm; start < end; quota hợp lệ. Không đổi code/type khi đã có redemption. Lỗi ổn định gồm `COUPON_INVALID`, `COUPON_INACTIVE`, `COUPON_UPCOMING`, `COUPON_EXPIRED`, `COUPON_MIN_ORDER`, `COUPON_SHIPPING_REQUIRED`, `COUPON_ZERO_SHIPPING`, `COUPON_EXHAUSTED`, `COUPON_USER_LIMIT`, `COUPON_CODE_EXISTS`, `COUPON_HISTORY_LOCKED`, `COUPON_QUOTA_CONFLICT`, `COUPON_VALIDATION`, `COUPON_RESERVATION_EXPIRED`, `CHECKOUT_PREVIEW_CHANGED`.

Math: subtotal đã sau product sale; product discount chỉ hiển thị. Total = subtotal − ORDER + shipping − SHIPPING. Prisma.Decimal tính percentage chính xác rồi floor VND; clamp mỗi coupon vào đúng base/cap. Allocation dùng BigInt floor + largest remainder, tie-break item ID; tổng allocation bằng discount cấp đơn, xử lý quantity qua lineTotal. Shipping không phân bổ vào item.

Preview không ghi quota. Reference bind branch/items/quantity/weight/current + original price/stock/address/payment/shipping quote/coupon code/rule version/amount. Rule version gồm các điều kiện tài chính, thời gian, quota, visibility/active và updatedAt, không chỉ amount. Final revalidate; có coupon còn kiểm lại cart/branch/address/variant/prices/weight/stock trong transaction. Quota recheck dưới coupon row locks theo ID cố định + Serializable transaction/bounded retry. Failure rollback cả stock/order/redemption.

Lifecycle:

- COD tạo thành công → CONSUMED, cùng transaction order + stock + clear cart.
- VNPAY tạo → RESERVED, deadline cố định `createdAt + 4 × payment.vnpay.expireMinutes` (config local 15 phút → 60 phút). Attempt đầu vẫn 15 phút như cũ.
- Fail/abandon attempt giữ coupon để retry trong deadline. Retry dùng Order/Payment amount đã chốt, không pricing lại, không tạo redemption mới; attempt mới phải kết thúc trước deadline. Reject idempotency key thuộc payment khác; transaction retry dùng helper Serializable hiện hữu.
- Success verified IPN/return claim payment attempt rồi CONSUMED cùng transaction; signature/amount/currency/payment graph sai không được nhận paid. Callback lặp không double stock/usage.
- Customer/admin cancel trước completion → RELEASED một lần. Cleanup mỗi 60 giây, batch 100, hủy order unpaid quá deadline bằng helper cancellation hiện hữu; dữ liệu DB tồn tại qua restart. SYSTEM actor không gán user khách hàng.
- Verified late success sau cancel/expiry/superseded: lưu sanitized callback, signature verification và response/status + warning reconciliation; không phục hồi coupon/stock, không đổi total và không tự nhận paid. Cần đối soát vận hành khi tiền thực đã chuyển.
- Reports merchandise = subtotal − ORDER coupon; shipping = fee − SHIPPING coupon; top-product revenue = lineTotal − allocation. Completed revenue/account spent tiếp tục đọc Order.totalAmount theo policy hiện hữu.

## 6. FRONTEND

Admin `/super-admin/coupons`: menu “Đơn hàng & thanh toán → Quản lý khuyến mãi”; exact SUPER_ADMIN trên menu/route. DataTable server search/type/visibility/discount type/derived status/sort/page/pageSize, URL state, reset/column controls/error/retry, dropdown row action để không cắt nút ở mobile. Create/Edit dùng Dialog, body ScrollArea, footer/header cố định, money input Product Admin, schema bổ sung từ generated Zod, inline tiếng Việt, sonner mutation, AlertDialog enable/disable. Ngày dùng formatter hiện hữu `HH:mm dd-MM-yyyy`.

Checkout giữ layout cũ. Hàng ticket/chevron nằm sau sản phẩm, trước Tạm tính. Dialog dùng token xanh Bookora (`--color-primary` kế thừa từ `--bookora-green`), hai nhóm, radio 1 mỗi nhóm, PRIVATE entry và reason cho unavailable. Chỉ body cuộn; không có subtotal/shipping/total breakdown trong dialog. Draft bị bỏ khi đóng; confirm mới lấy canonical preview và cập nhật ngoài summary. Context/race guard bỏ response cũ; final coupon error buộc chọn/xác nhận lại. Dòng sale discount cũ còn nguyên.

Phát hiện/sửa qua browser: ScrollArea cần chiều cao Dialog xác định để không đè footer; checkout grid cần min-w-0 và track minmax(0,1fr) khi địa chỉ/tên sản phẩm dài. Không sửa shared primitive hoặc theme toàn app.

## 7. SEED

Script: `npm run prisma:seed:coupons`; từ chối NODE_ENV=production hoặc thiếu `ALLOW_DEV_SEED=true`. Upsert `update: {}` giữ rules/status/timestamps đã có, không reset usage trong redemption. First create dùng clock lúc seed, start trước 1 phút, end sau 90 ngày; không hardcode ngày quá khứ.

- ORDER (10): BOOKORA10, BOOKORA30, BOOKORA20K, BOOKORA50K, BOOKORA70K, BOOKORA5, BOOKORA12, BOOKORA15, READMORE25, WELCOMEBOOK.
- SHIPPING (5): SHIP20, SHIP50, SHIP10, SHIP15, SHIPMAX40.
- **100 lượt/mã, mặc định 1 lượt/user**. READMORE25 và WELCOMEBOOK PRIVATE; 13 mã còn lại PUBLIC. Rules/amount/min/cap đúng bảng prompt.
- Local query sau seed: ORDER=10, SHIPPING=5, min/max usageLimit đều 100. PostgreSQL test seed lần hai giữ số fixture, trạng thái admin và redemption CONSUMED có thật; không duplicate/reset usage.
- Browser dùng tài khoản demo mới `coupon-demo-1794892455054@bookora.local`, một address và cart riêng (không thay giỏ/user cũ). Mật khẩu theo `DEVELOPMENT_PASSWORD` hiện hữu; không ghi mật khẩu vào tài liệu. Không tạo order live trong browser.

## 8. AUTOMATED VERIFY

Các lệnh thực tế chạy qua `rtk` / `rtk proxy`, tại đúng root từng repo.

| Repo | Lệnh / kiểm tra | Kết quả |
|---|---|---|
| API | `npm run prisma:format`, `prisma:validate`, `prisma:generate` | PASS |
| API | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --script --output prisma/migrations/20261117090000_coupon_upgrade/migration.sql` | PASS; SQL đã review |
| API | `npm run prisma:migrate:deploy`; `npx prisma migrate status` | PASS, migration áp dụng local; 28 migrations up to date |
| API | `node -e` bật ALLOW_DEV_SEED cho process rồi ts-node/register + seed.coupons.ts | PASS; query xác nhận 15/10/5/quota 100 |
| API | `npm test -- --runInBand --silent` | PASS 110 suites / 872 tests |
| API | `npm run test:e2e -- --runInBand --silent` | PASS 14 suites / 95 tests tại lượt full; sau đó mở rộng ca coupon và chạy lại targeted |
| API | `npm test -- --runInBand --silent coupons checkout payments customer-orders admin-orders revenue-reports dashboard` | PASS 16 suites / 111 tests |
| API | `npm test -- --runInBand --silent payments` sau hardening retry | PASS 2 suites / 14 tests |
| API | `npm run test:e2e -- --runInBand --silent coupon-upgrade-postgres coupon-http` cuối | PASS 2 suites / 14 tests |
| API | `npm run lint`; ESLint targeted sau thay đổi cuối | PASS |
| API | `npm run type-check`; `npm run build` | PASS |
| API | `npm run docs:check` (export → contract → Redocly) | PASS, 207 operations / 261 schemas; 2 Redocly problems được ignore theo config có sẵn |
| Web | `npm run openapi:sync`; `npm run gen:api` | PASS; sync localhost canonical, Orval client + Zod + compatibility script |
| Web | `npm run verify:generated-zod` (qua gen:api) | PASS, 33 files, 265 zod.ulid occurrences, 0 forbidden |
| Web | `npm test -- src/features/coupons` | PASS 3 files / 21 tests |
| Web | Targeted coupon + CheckoutHotfixContract + CheckoutShippingPricingContract sau sửa layout cuối | PASS 5 files / 36 tests |
| Web | `npm test -- --maxWorkers=2` | PASS 188 files / 938 tests |
| Web | `npm run build` (vue-tsc -b + vite build) | PASS; cảnh báo chunk >500kB có sẵn |
| Web | lint npm script | NOT AVAILABLE trong package.json; không thêm dependency để giả gate |
| Cả hai | `git diff --check`, status/name-only/stat review; GitNexus compare master | PASS diff whitespace; aggregate risk CRITICAL được review theo source/test |

Lỗi trung gian đã xử lý: fixture HTTP thiếu sku/combinationKey; mock DialogTitle thiếu context; assertion cũ cấm chevron ngoài breadcrumb; thiếu cột discountType khiến filter disabled; token màu sai tên và scroll/min-width mobile. Bảng PASS chỉ dùng lượt chạy lại sau sửa tương ứng, không lấy lượt FAIL làm PASS.

## 9. MANUAL & REGRESSION

Đã chạy browser local tại localhost:5173 + API localhost:8000, dùng session demo:

- SUPER_ADMIN login, menu/route global, list fixture, search BOOKORA10 ra một dòng, create Dialog và inline lỗi tiếng Việt khi gửi form rỗng. Dropdown actions không còn hai nút bị cắt trong một action cell.
- Admin Dialog đo ở 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 320×700: dialog/footer fit, body ScrollArea có chiều cao hữu hạn, body không tràn ngang.
- Customer chọn saved address, internal shipping quote 40.000đ cho giỏ 594.000đ; không coupon tổng 634.000đ, sale discount 66.000đ vẫn chỉ hiển thị.
- Chọn nháp BOOKORA10 + SHIP20 rồi đóng: tổng giữ 634.000đ, focus trả về hàng voucher.
- PUBLIC list không có READMORE25/WELCOMEBOOK. Nhập READMORE25 riêng tư + SHIP20, confirm: tổng 589.000đ. Đổi ORDER thành BOOKORA10 và giữ SHIP20: tổng 574.000đ, hai dòng giảm 40.000đ/20.000đ, sale row 66.000đ vẫn còn.
- SHIPPING/ORDER không đủ min bị disabled với lý do tiếng Việt. Dialog không có breakdown trùng; nút xác nhận dùng màu xanh Bookora `oklch(0.38 0.095 148)`.
- Đóng dialog lần cuối: tổng vẫn 574.000đ, dialog đóng và focus trở về hàng “Mã giảm giá BOOKORA10 + SHIP20”. Đã reset viewport override sau kiểm tra.

Checkout Dialog: đo DOM sau resize ổn định, không lấy trạng thái giữa CSS transition làm kết quả.

| Viewport | Document overflow | Dialog / footer fit | Body client / scroll height (px) | Breakdown trùng |
|---|---|---|---|---|
| 1440×900 | Không | PASS / PASS | 582 / 1660 | Không |
| 1366×768 | Không | PASS / PASS | 578 / 1660 | Không |
| 1024×768 | Không | PASS / PASS | 578 / 1660 | Không |
| 768×1024 | Không | PASS / PASS | 582 / 1660 | Không |
| 390×844 | Không | PASS / PASS | 590 / 1704 | Không |
| 320×700 | Không | PASS / PASS | 518 / 1656 | Không |

Console tab nghiệm thu: không thấy Vue warning/lỗi ứng dụng trong captured warn/error; có 8 log obfuscated từ iframe Cloudflare Turnstile của login (`challenges.cloudflare.com`), không ghi nhận chúng là PASS sạch toàn bộ console. Chưa có network trace đầy đủ, nên unexpected 4xx/5xx toàn bộ matrix vẫn NOT RUN; HTTP status/error cases có kiểm trong integration tests.

Evidence JPG ngoài repo tại `C:/Users/Admin/.codex/visualizations/2026/11/17/01a1e7c4-066b-7641-8fb0-6e3d237a632d/`: `coupon-admin-desktop.jpg`, `coupon-checkout-summary.jpg`, `coupon-checkout-dialog-desktop.jpg`, `coupon-checkout-dialog-mobile.jpg`. Đã mở ảnh desktop/mobile để xác nhận trực quan. Không tạo report/plan Markdown khác.

NOT RUN / remaining manual acceptance (không giả PASS): VNPAY Sandbox redirect/IPN qua public HTTPS, provider/network failure thực; browser COD place/cancel và VNPAY retry/cancel end-to-end; admin create/edit/disable có lưu, mọi filter/sort/page/column combination trên từng viewport; đổi branch/address khi mã đang áp dụng; manual receipt/report/reviews đầy đủ. Các luồng này có automated regression như mục 8 nhưng không thay thế manual gate. Upload failure: **N/A**, phase không có upload.

## 10. DONE CHECKLIST & RISKS

- [x] Audit hai repo/DB/source + impact trước sửa, giữ instructions có sẵn.
- [x] Reuse coupon schema, migration forward-only, legacy zero defaults, allocations/snapshots.
- [x] Exact SUPER_ADMIN global; server/UI security và CSRF.
- [x] 1 ORDER + 1 SHIPPING, PUBLIC/PRIVATE, fixed/percentage/min/cap/time/global/user quota.
- [x] Preview không reserve, rule/context binding, final validation, atomic quota/stock/order và rollback.
- [x] COD consume, VNPAY reserve/consume, retry giữ amount, cancel/expiry release, late callback audit.
- [x] Seed 15 = 10 ORDER + 5 SHIPPING, 100/mã, idempotent và dev scoped.
- [x] Source-first OpenAPI → Orval/Zod; không hand-edit generated files.
- [x] Automated regression, builds, typecheck, lint API và diff checks.
- [ ] Hoàn tất toàn bộ manual failure/lifecycle/role/responsive matrix và gateway Sandbox evidence.

Giới hạn vận hành: cleanup chạy trong app mỗi phút; cần API instance hoạt động để xử lý eventual cancellation. Callback có tiền thật đến sau terminal cần đối soát thủ công theo warning/sanitized callback; không tự mở lại đơn hay cấp voucher. Public options giới hạn 100 mã theo contract. Cảnh báo Vite chunk lớn và pg query deprecation trong tests được ghi nhận; không đổi dependency ngoài scope.

Kết luận: **BOOKORA — PHASE COUPON UPGRADE — PENDING** cho đến khi các manual/gateway gates còn lại có bằng chứng. Không commit/push hay reset DB.

# Bookora — Review Variant & Media Upgrade

## 1. TRẠNG THÁI

**BOOKORA REVIEW VARIANT & MEDIA UPGRADE — NOT DONE**

Đã triển khai backend/frontend/database và chạy R2 thật bằng HTTP integration test. Chưa đủ bằng chứng manual browser, responsive và đối chiếu ảnh approved. Không đánh đồng build/component test/R2 integration với manual acceptance.

## 2. PREFLIGHT & SOURCE BASELINE

| Repository | Root thực tế | Branch | SHA đầu vào | Working tree đầu vào |
|---|---|---|---|---|
| API | `D:/CTU/CT466E/bookora-api/bookora-api` | `master` | `11e6b6212ebf13014aa95a627cd5a71e9f19ba44` | Chỉ `AGENTS.md`, `CLAUDE.md` đã thay đổi |
| Web | `D:/CTU/CT466E/bookora-web/bookora-web` | `master` | `f9bb84596e3e36992fb0017fdb8e87ab26e04e55` | Chỉ `AGENTS.md`, `CLAUDE.md` đã thay đổi |

Đã đọc instructions/README/package scripts ở cả hai repo; `C:/Users/Admin/.codex/RTK.md`; prompt người dùng cung cấp; hai ảnh đính kèm (review public approved và modal upload approved); Master Handoff, Phase 17, Mini Phase 11.5 phía Web và Phase 9/10C phía API. Các ảnh khác trong manifest của prompt không được đính kèm trong phiên này. Đã đối chiếu source hiện tại thay vì dùng các con số/giới hạn trong handoff cũ. Hai lockfile npm v3 giữ nguyên, không thêm dependency.

Quy ước bảng: `API/` và `Web/` tương ứng hai root tuyệt đối ở trên.

| Hạng mục | Source path | Finding | Quyết định | Ảnh hưởng |
|---|---|---|---|---|
| Review identity/unique | `API/prisma/schema/28-engagement.models.prisma` | GAP: unique cũ user/order/product, chưa có orderItem/media | CHANGE: unique orderItem nullable; giữ partial unique cho legacy | Migration, create, pending |
| Snapshot biến thể | `API/prisma/schema/27-orders-payments.models.prisma`, `API/src/modules/checkout/checkout.service.ts` | FOUND: `variantOptions` JSON `{name,value}[]`, `variantLabel` đã lưu lúc mua | REUSE snapshot, không sửa checkout | Historical display |
| SIMPLE/OPTIONED | `API/src/modules/products/products.service.ts` | FOUND: configuration suy ra từ options; không có field productType cố định | Review dùng danh sách option snapshot; rỗng/không hợp lệ → không badge | Không dùng tên “Mặc định” để phân loại |
| Formatter đơn hàng | `API/src/modules/customer-orders/customer-orders.service.ts`, `Web/src/pages/app/account/AccountOrderDetailPage.vue` | Chưa có formatter shared cho review; order hiện trả snapshot trực tiếp | Thêm mapper nhỏ `review-display.ts`, không đọc live variant | Không tạo nhãn lịch sử giả |
| Media association | `API/prisma/schema/23-products.models.prisma` | GAP: ProductMedia có ownership/lifecycle khác review | Thêm ReviewMedia riêng | DB metadata, không lưu binary |
| R2/image pipeline | `API/src/shared/images/{image-upload.service,image-processing.service,image-presets,image.types}.ts`, `API/src/shared/storage/r2-object-storage.service.ts` | FOUND: namespace `reviews` và preset `review` đã có | REUSE; thêm error routing riêng và cleanup adapter nhỏ | Không thêm client/bucket/pipeline |
| Cleanup hiện hữu | `API/src/modules/product-media/product-media-cleanup.service.ts`, `API/src/modules/customer-account/customer-account.service.ts` | Cleanup bị giới hạn namespace products/avatars; chưa có helper shared cho review | `R2ObjectStorageService.cleanupKeys` dùng lại delete/logging, kiểm prefix theo owner | Best-effort sau commit/compensation |
| Shared primitives | `Web/src/components/ui/{badge,button,dialog,textarea,scroll-area}` | FOUND | REUSE toàn bộ | Không thêm design system |
| Image picker/preview | `Web/src/components/shared/{ImageDropzone,ImagePreviewDialog}.vue` | Picker một ảnh; preview một ảnh, không previous/next | Mở rộng ImageDropzone bằng props multiple/compact; default một ảnh vẫn giữ | Avatar/Category regression |
| Gallery | `Web/src/features/storefront/components/ProductGallery.vue`, package `vue-easy-lightbox` | FOUND: gallery sản phẩm/carousel, không phù hợp hàng 3 ảnh review | Wrapper nghiệp vụ nhỏ ReviewMediaGallery, dùng lại lightbox thư viện | Shared giữa public và My Reviews |
| Reviews endpoints | `API/src/modules/reviews/{reviews.controller,reviews.service,reviews.repository}.ts` | FOUND: pending DISTINCT order/product; JSON create/edit đang hoạt động | Bỏ dedupe theo product, thêm media mutations | Review/account dashboard/order CTA |
| Generation | `API/package.json`, `Web/package.json`, `Web/scripts/sync-openapi.mjs`, `Web/orval.config.ts` | FOUND | Chạy docs:check → gen:api:local | Không sửa output bằng tay |
| Legacy thực tế | `API/scripts/review-upgrade-audit.cjs`, DB local | KNOWN: 11 review, exact 10, ambiguous 1, unmatched 0 | Backfill duy nhất; khóa pending/create của cặp legacy mơ hồ | Không đoán biến thể |

Giới hạn runtime đã xác minh: `IMAGE_UPLOAD_MAX_BYTES=5242880`. Audit tiếp theo ghi wrong owner/incomplete order/invalid rating đều 0. Computer Use thấy Chrome đang chạy Bookora, nhưng dừng trước khi đọc/điều khiển vì không xác định được URL đủ tin cậy.

## 3. DECISION LOCK & BOUND / BLAST RADIUS

Giữ DL-01…DL-12: review mới theo dòng hàng; completed/owner; snapshot; SIMPLE không badge; rating 1–5, nội dung tùy chọn 2000 ký tự; 0–4 ảnh; R2 hiện có; không sửa generated bằng tay; không Git write. Các yêu cầu visual/responsive đã triển khai trong code nhưng chưa khóa PASS bằng trình duyệt.

Manifest từng file, lý do, phạm vi và regression nằm trong [Bookora_Review_Variant_Media_Upgrade_Files.md](Bookora_Review_Variant_Media_Upgrade_Files.md). `AGENTS.md`/`CLAUDE.md` không thuộc thay đổi của task.

Impact trước sửa: phần lớn Reviews LOW, 1–4 direct callers; `listPending` có 2 direct callers và ảnh hưởng account dashboard. `reviewActions` có 2 direct callers (list/detail). Shared image `process` HIGH: một direct caller ImageUploadService, lan sang Product Media/Category/Avatar. Đã cảnh báo và chỉ thêm nhánh review; các preset khác giữ hành vi. Cross-tab `publishEngagementChange` HIGH: 4 direct callers (Wishlist và Reviews); chỉ thêm payload sản phẩm tùy chọn, giữ calls không tham số.

`detect_changes(scope: compare, base_ref: master)` đã chạy: API HIGH, 46 indexed symbols/15 flows/16 tracked files; Web MEDIUM, 39 indexed symbols/5 flows/14 tracked files tại thời điểm kiểm tra. Graph có thể gán “touched” cho method phía sau vùng thêm code do line offsets; diff thực tế không đổi `normalizeKey`, `bucketFor`, `getChannel`. File mới chưa được index ở baseline được review qua source/typecheck/tests; không stage để ép GitNexus nhận file. Không thay Product cleanup có blast radius CRITICAL; guard xóa Product hiện đã chặn khi có reviews/references.

Orders chỉ đổi cách đếm CTA review; không đổi tạo đơn, transition, payment, inventory hay snapshot checkout. Frontend Order Detail đổi key sang orderItemId, thêm nhãn và sửa limit 50 không hợp lệ thành 20 theo DTO backend hiện hữu. Shared UI duy nhất mở rộng là ImageDropzone. Component mới ReviewMediaGallery là composition nghiệp vụ (3 thumbnails/counter), không phải primitive hoặc lightbox mới. Không thêm dependency.

## 4. DATABASE & LEGACY MIGRATION

- Migration forward-only: `API/prisma/migrations/20261115140000_review_order_item_media/migration.sql`.
- Review thêm `order_item_id` nullable + unique + FK OrderItem `ON DELETE RESTRICT`; bỏ unique cũ sau khi backfill và tạo partial unique `(user_id,order_id,product_id) WHERE order_item_id IS NULL`.
- ReviewMedia: ULID id, review FK cascade, objectKey unique, url, sortOrder, createdAt. Unique `(review_id,sort_order)` và CHECK sortOrder 0–3 tạo hàng rào DB tối đa 4 ảnh; unique này cũng phục vụ lookup theo review, không thêm index trùng.
- SQL chỉ gắn review khi cùng order/product có đúng một OrderItem. Không sửa rating/content/visibility/timestamps. Ambiguous giữ null, không badge và chặn mọi pending/create trong cặp order/product đó.
- Trước migration local: 11 review, exact 10, ambiguous 1. Ngay sau migration: 11 review, linked 10, unresolved 1; đối chiếu toàn bộ field cũ PASS.
- Snapshot trước deploy: `C:/Users/Admin/Downloads/bookora-backups/review-upgrade-predeploy.json`. Không đưa nội dung review cá nhân vào repo.
- Sau đó, lần audit lặp lại phát hiện 2 review đổi updatedAt, 1 trong số đó đổi rating/content so với snapshot. Không xác định nguồn cập nhật; không khôi phục/ghi đè. Không được mô tả audit hiện tại là “toàn bộ field vẫn bằng snapshot”. Bằng chứng migration giữ dữ liệu là kiểm tra ngay sau deploy và fixture migration độc lập.
- Prisma validate/generate/deploy/status PASS; 27 migrations, up to date; `migrate diff --exit-code` báo `No difference detected`.
- Fresh SQL migration path được chạy từ đầu trên disposable PostgreSQL trong hai E2E suite; legacy fixture kiểm tra nguyên vẹn field trước/sau.
- Rollback: ưu tiên roll-forward. Không drop metadata hoặc tái tạo unique cũ khi đã có nhiều review của cùng product/order. Client cũ thiếu orderItemId nhận validation 400, không âm thầm chọn dòng hàng; deploy frontend/backend tương ứng.

## 5. BACKEND & API CONTRACT

| Method/path (prefix `/api/v1`) | operationId | Thay đổi |
|---|---|---|
| GET `/account/reviews/pending` | `customerReviewsPending` | Mỗi OrderItem một row; orderItemId + variantLabel snapshot |
| POST `/account/reviews` | `customerReviewsCreate` | Bắt buộc orderItemId cùng orderId/productId hiện hữu để kiểm consistency; server xác minh và derive field từ DB; response 201 |
| PATCH `/account/reviews/:reviewId` | `customerReviewsUpdate` | Giữ immutable identity; trả media/snapshot; field identity lạ bị whitelist reject |
| DELETE `/account/reviews/:reviewId` | `customerReviewsDelete` | Parent-row lock, thu keys, xóa DB, cleanup sau commit |
| POST `/account/reviews/:reviewId/images` | `customerReviewImagesUpload` | Multipart `files`, 1–4 JPEG/PNG/WebP; authenticated owner + CSRF; trả media ordered |
| DELETE `/account/reviews/:reviewId/images/:mediaId` | `customerReviewImagesDelete` | Scoped owner/review/media, DB-first cleanup |
| GET `/account/reviews` | `customerReviewsList` | orderItemId nullable, variantLabel nullable, media ordered |
| GET `/storefront/products/:productId/reviews` | `storefrontProductReviewsList` | variantLabel + media trong batch include; không orderId/objectKey; giữ visible filter và aggregate |
| GET `/admin/reviews`, PATCH visibility | `adminReviewsList`, `adminReviewsSetVisibility` | Kế thừa display fields, giữ Super Admin policy |

`CreateReviewDto`, Customer/Pending/Public/Admin response DTO và `ReviewMediaDto` là nguồn contract. Order được kiểm owner + raw COMPLETED trong Serializable transaction; orderItem phải thuộc đúng order/product. Unique/P2034 trả 409. Pending không còn DISTINCT/GROUP BY theo product; legacy unresolved vẫn được chặn. Quantity không tham gia identity/badge. Mapper chỉ đọc `OrderItem.variantOptions`, không join live variant để dựng nhãn.

Media hydration qua include/select có thứ tự sortOrder/id, không endpoint ảnh N+1. Summary/count/distribution vẫn tính theo từng visible review, không đổi rules filters/moderation. OpenAPI check cuối có 202 operations/255 schemas; client/Zod sinh lại bằng script. Status tạo review được mô tả đúng 201; model generated cũ `customerReviewsCreate200` được generator thay bằng `customerReviewsCreate201`.

## 6. CLOUDFLARE R2 & MEDIA LIFECYCLE

Tái sử dụng ImageUploadService → ImageProcessingService → R2ObjectStorageService, namespace `reviews/{reviewId}/{ulid}.webp`, preset `review` đã tồn tại: edge tối đa 1920, no upscale, WebP quality theo cấu hình (82), min 32×32, tối đa 40 triệu pixel. Sharp decode/format check, review MIME phải khớp định dạng bytes, reject animated image; EXIF bị loại bỏ. Input/transport/UI thống nhất tối đa 5 MiB, JPEG/PNG/WebP. Review không ảnh vẫn hợp lệ.

Upload: auth/owner/count preflight → shared process/upload → transaction khóa parent review và kiểm lại quota → metadata. Nếu upload một phần hoặc metadata/quota fail, cleanup tất cả object mới. Remove: khóa parent → scope media → xóa metadata và compact order → commit → shared cleanup. Delete review lấy keys trước cascade. R2 và PostgreSQL không phải một atomic transaction.

Cleanup kiểm prefix `reviews/{reviewId}/`, dedupe keys và dùng shared storage delete. Lỗi cleanup được log operation/key/error theo best-effort convention hiện có, không rollback metadata. Không có durable retry queue mới; nếu R2 delete thực sự lỗi cần xử lý key trong log. Unit test xác minh fail không im lặng. Không có object cleanup pending được ghi nhận trong real R2 test.

Unit tests có: foreign owner trước storage; DB/quota fail compensation; object đầu được cleanup khi upload ảnh sau fail; unlink trước cleanup; MIME/corrupt/truncated/oversize/EXIF; prefix isolation và log cleanup failure. PostgreSQL test chạy đồng thời hai batch và kiểm số ảnh không vượt 4.

Real R2 test opt-in đã chạy bằng `rtk proxy pwsh -NoProfile -Command '$env:RUN_REVIEW_R2_SMOKE="1"; & npm run test:e2e -- --runInBand review-http'`: fixture DB tạm; upload JPEG/PNG/WebP tới 4 ảnh; HTTP public URL 200 WebP; ảnh thứ 5 bị chặn; remove một ảnh rồi delete review; DB media còn 0; cả 4 public URL kiểm tra sau cleanup trả 404 (query cache-busting). Lặp lại trên backend source cuối: 2/2 tests PASS, 20.761s. Credentials không in ra và không ghi vào frontend. Đây là automated HTTP/R2 evidence, không phải browser evidence.

Ẩn review không xóa R2 object; public Review API không trả review/media đó. URL public đã biết không tự bị revoke khi hide, đúng kiến trúc bucket public hiện hữu.

## 7. FRONTEND UI / UX & RESPONSIVE

ReviewFormDialog hiện hữu vẫn dùng Dialog/ScrollArea/Textarea/Button/Badge. Thêm badge full wrap dưới product name; ô Thêm ảnh camera, dashed xanh; note phía trên; counter x/4; preview và nút xóa; tổng 4 thì ẩn tile. Cùng modal cho create/edit. Nội dung/rating optionality không đổi. Title/footer cố định; khối product/badge nằm trong body ScrollArea để badge 3–5 nhóm dài không chiếm toàn bộ header trên viewport thấp. Max-height theo dvh; không đổi global CSS/theme.

Ảnh cũ được đánh dấu xóa và chỉ gọi DELETE khi lưu; Hủy trước save không xóa server. Local preview xóa không gọi DELETE; object URL được revoke khi remove/reset/close/unmount. Dữ liệu không leak giữa review A/B. Upload fail giữ reviewId đã tạo; retry update/upload trên review đó. Nếu mất response, tải lại canonical state trước khi viết lại để tránh ảnh trùng/xóa lặp; nếu canonical có ảnh mới chưa xác nhận thì dùng danh sách server và bỏ local batch chưa chắc chắn.

Review public/My Reviews dùng ReviewMediaGallery: 0 ảnh không có khoảng trống; tối đa 3 thumbnail; ô thứ ba phủ `total - 2` (3 ảnh +1, 4 ảnh +2), click mở đúng index 2 và toàn bộ ảnh qua vue-easy-lightbox. Stars/summary/filter/avatar/content/relative time giữ nguyên; thời gian nằm sau gallery. Pending/order CTA dùng orderItemId riêng.

Cache: invalidation review/account/order theo convention; helper chỉ làm mới catalog cache có product liên quan và detail slug, cùng admin reviews. Không clear QueryClient hay invalidate toàn Catalog. Cross-tab payload product tùy chọn giữ compatibility Wishlist; moderation cũng phát signal.

| Viewport | Manual kết quả | Lý do |
|---|---|---|
| 1440×900 | NOT RUN | Computer Use không xác định được URL Chrome |
| 1280×800 | NOT RUN | Như trên |
| 1024×768 | NOT RUN | Như trên |
| 768×1024 | NOT RUN | Như trên |
| 390×844 | NOT RUN | Như trên |
| 360×740 | NOT RUN | Như trên |
| 320×568 | NOT RUN | Như trên |

Chưa có screenshot trước/sau, console/network counts, kiểm padding/overflow thực tế, focus trap/Esc/Tab/z-index/body scroll/soft keyboard hoặc browser thứ hai. Không dùng ảnh mock để ghi PASS.

## 8. KẾT QUẢ VERIFY TỰ ĐỘNG

Các lệnh shell dùng `rtk` theo instructions. Lượt E2E cuối chạy riêng sau khi các bộ kiểm tra khác kết thúc.

| Repository | Lệnh thực tế | Kết quả | Evidence |
|---|---|---|---|
| API | `rtk npm run prisma:format` | PASS | Schema formatted |
| API | `rtk npm run prisma:validate` / `rtk proxy npx prisma validate` | PASS | Schema valid |
| API | `rtk npm run prisma:generate` | PASS | Prisma Client 7.8.0 |
| API | `rtk npm run prisma:migrate:deploy` | PASS | Apply review migration |
| API | `rtk proxy npx prisma migrate status` | PASS | 27 migrations/up to date |
| API | `rtk proxy npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code` | PASS | No difference detected |
| API | `rtk proxy node scripts/review-upgrade-audit.cjs --snapshot` | PASS | 11 rows; snapshot riêng trong Downloads |
| API | `rtk proxy node scripts/review-upgrade-audit.cjs --verify` | PASS ngay sau deploy; FAIL ở lần audit sau | Ngay sau: 11/11 unchanged; sau đó có 2 row thay đổi, giữ nguyên |
| API | `rtk npm test -- --runInBand src/modules/reviews src/modules/customer-orders src/shared/images src/modules/product-media src/modules/categories src/modules/customer-account` | PASS | 15 suites/107 tests tại mốc targeted |
| API | `rtk proxy npm test -- --runInBand` | PASS | 109 suites/863 tests; sau đó bổ sung CTA cases và chạy targeted 27/27 |
| API | `rtk proxy npm test -- --runInBand src/modules/customer-orders/customer-orders.service.spec.ts` | PASS | 27 tests; gồm 3 cases đếm hai variants sau 0/1/2 line reviews |
| API | `rtk npm run test:e2e -- --runInBand review-http review-upgrade-postgres` | PASS | 2 suites/6 tests |
| API | Real R2 opt-in command ở mục 6 | PASS | 2 HTTP tests, URL read/delete assertions |
| API | `rtk proxy npm run test:e2e -- --runInBand` | PASS | 12 suites/83 tests, 124.753s; chạy riêng, không tăng timeout |
| API | `rtk proxy npm run lint` | PASS | Exit 0; lỗi lint test ban đầu đã sửa |
| API | `rtk proxy npx eslint src/modules/customer-orders/customer-orders.service.spec.ts` | PASS | Kiểm lại sau 3 CTA cases; formatter theo ESLint repository |
| API | `rtk proxy npm run type-check` | PASS | Exit 0 |
| API | `rtk proxy npm run build` | PASS | SWC compile 486 files |
| API | `rtk proxy npm run docs:check` | PASS | 202 operations/255 schemas; 2 Redocly ignored rules có sẵn |
| Web | `rtk proxy npm run gen:api:local` | PASS | 32 Zod files, 265 ULID, 0 forbidden |
| Web | `rtk npm test -- src/features/engagement src/components/shared/ImageDropzone.test.ts src/pages/app/account/AccountReviewsDeleteDialog.test.ts` | PASS tại mốc targeted | 10 files/37 tests; sau đó thêm lost-response case |
| Web | `rtk npm test -- --maxWorkers=2` | PASS tại mốc full đầu | 185 files/915 tests |
| Web | `rtk proxy npm test -- --maxWorkers=2` (sau final generation, chạy riêng) | PASS | 185 files/916 tests, 308.93s |
| Web | `rtk proxy npm test -- src/features/engagement/components/ReviewFormDialog.test.ts src/features/engagement/phase17-ui-ux-hotfix.test.ts src/pages/app/account/AccountReviewsDeleteDialog.test.ts` | PASS | 3 files/15 tests sau điều chỉnh khối product/badge vào body cuộn |
| Web | `rtk proxy npx vue-tsc -b --pretty false` | PASS tại mốc typecheck | Exit 0 |
| Web | `rtk proxy npm run build` | PASS | 6167 modules; vue-tsc + Vite; chạy lại sau layout modal cuối, Vite 9.54s |
| Web | Lint script | NOT AVAILABLE | package.json không có lint script |
| Cả hai | `rtk git diff --check` | PASS | Không whitespace error; Git có cảnh báo LF/CRLF |

Các lần fail trong quá trình phát triển đã được ghi nhận: fixture E2E ban đầu dùng enum địa chỉ sai (đã sửa theo Prisma); fixture frontend cũ thiếu media; gallery stub thiếu tên component; lint test mới. Không thay nghiệp vụ để né test. Lượt cuối chạy trùng Orval clean làm một suite frontend không import được generated auth; đã kết thúc generation trước khi chạy lại. Không tăng timeout để che lỗi.

## 9. MANUAL BROWSER / R2 TEST EVIDENCE

- Runtime local sẵn có: Web `http://localhost:5173`, API `http://localhost:8000`.
- Test HTTP: owner/other customer và session thật chỉ tồn tại trong disposable PostgreSQL; JWT/CSRF guards thật, không tắt bảo mật runtime người dùng.
- Automated HTTP chứng minh 401 khi thiếu session, 403 khi thiếu CSRF/cross-owner create, 404 scoped ảnh, 400 bytes giả/immutable field, 413 oversize, 409 duplicate/quota, 201 create/upload; không lộ orderId/objectKey public.
- Automated DB chứng minh 2 dòng cùng product → 2 pending/2 review; quantity >1 vẫn 1 review; concurrent create đúng 1; legacy exact/ambiguous; media concurrency/order/hide/cascade.
- Automated R2 thật: mục 6. Fixture objects đã được cleanup; không xóa ảnh/review của user trong DB local.
- Manual browser: **NOT RUN** vì Computer Use dừng với thông báo không xác định được URL Chrome trên Windows đủ tin cậy để enforce policy. Không dùng một kênh UI automation khác để vòng qua hạn chế này.

Checklist nghiệm thu còn lại: mở SIMPLE/OPTIONED (1/2/3/5 nhóm), đơn có 2 biến thể; tạo/sửa 0–4 ảnh, remove/cancel/reopen, upload lỗi/retry; public overlay/lightbox; admin hide/show; refresh/logout/login/cross-tab; toàn bộ 7 viewport ở mục 7; kiểm focus/keyboard/scroll/z-index/console/network; lưu screenshot hai màn approved và một browser thứ hai nếu có. Không cần thay/reset dữ liệu hiện hữu để thực hiện.

## 10. ACCEPTANCE CHECKLIST

- [x] Preflight audit hai repo, status/commit, impact/file list đã ghi nhận.
- [x] Decision Lock không bị thay đổi ngoài phê duyệt người dùng.
- [x] `OrderItem` là identity authoritative cho review mới, unique được đảm bảo ở DB.
- [x] Order completed/ownership/CSRF và review permission vẫn đúng (unit/HTTP).
- [x] Pending/list/create/edit không gộp nhầm hai biến thể cùng product (DB/HTTP).
- [x] SIMPLE không hiện phân loại mặc định (mapper/component).
- [x] OPTIONED hiện đầy đủ tên nhóm + giá trị snapshot, không hard-code số nhóm (1/2/3/5 groups).
- [x] Review cũ không mất/gán sai biến thể trong migration; có số liệu ngay sau migration và fixture. Cập nhật local sau mốc migration được tách riêng ở mục 4.
- [x] Review supports 0–4 ảnh; không bắt buộc ảnh.
- [x] Shared R2/image processing/cleanup được tái sử dụng; không pipeline/client thứ hai.
- [x] Validation file, quota, concurrency, compensation và cleanup có automatic evidence.
- [ ] Modal Thêm/Sửa được đối chiếu visual approved trên browser.
- [ ] Public Review tab được đối chiếu visual approved trên browser (gallery/counter có component test).
- [x] Không duplicate UI primitive/shadcn component, không thêm design system.
- [ ] Responsive PASS toàn bộ viewport và padding/overflow thực tế.
- [ ] Keyboard/focus/loading/error/z-index manual acceptance đầy đủ (object URL có test).
- [x] OpenAPI/frontend client/Zod regenerate bằng script, không chỉnh tay.
- [x] Backend targeted/unit và full E2E regression PASS (109 suites/863 unit tests; 12 suites/83 E2E tests).
- [x] Frontend targeted và full suite cuối PASS: 185 files/916 tests sau final generation.
- [x] Prisma/lint/typecheck/build/diff PASS tại các mốc ghi trong bảng 8; layout modal cuối được kiểm lại bằng targeted tests và build.
- [ ] Manual browser/R2 smoke có bằng chứng UI; R2 automatic không thay thế manual.
- [x] Không sửa domain không liên quan, không commit/push/reset/clean.
- [x] Handoff tiếng Việt có evidence và hạn chế trung thực.

## 11. VẤN ĐỀ CÒN LẠI, RỦI RO, REGRESSION

Blocker DoD: manual browser/responsive/visual/accessibility/console/network chưa chạy do Computer Use bị chặn. Không ghi DONE WITH NOTES.

Legacy unresolved: 1 review được giữ nguyên và không gán biến thể. Hai review local đã có cập nhật sau snapshot; không kết luận nguồn cập nhật và không rollback các thay đổi đó. Cleanup R2 best-effort có log, không có durable retry mới; URL public không bị revoke tự động khi hide. Đây là giới hạn được nêu rõ, không phải atomic DB/R2 guarantee.

Regression shared được phủ bởi backend full suite, targeted Category/Product Media/Avatar, frontend ImageDropzone/Wishlist/account/router full suite. LF/CRLF warnings, Vite chunk >500 kB, Node experimental VM modules và pg query deprecation là warnings đã thấy; không tự sửa dependency hoặc domain khác trong task.

## 12. GIT SAFETY & KẾT LUẬN

- Không git add/commit/push/reset/clean/restore/checkout thay đổi người dùng.
- Không chỉnh generated OpenAPI/Orval/Zod bằng tay; file create response 200→201 do generator thay.
- Không tạo primitive trùng shadcn-vue; không thêm lightbox library/R2 client/image pipeline thứ hai.
- Không đổi Orders/Inventory/Payments/Checkout business logic.
- Không sửa hoặc khôi phục `AGENTS.md`/`CLAUDE.md` và dữ liệu review đang được cập nhật.

**BOOKORA REVIEW VARIANT & MEDIA UPGRADE — NOT DONE**

Chưa đủ điều kiện khóa trạng thái DONE. Chỉ đổi trạng thái sau khi hoàn tất manual acceptance còn thiếu và lưu bằng chứng.

# Bookora — Flash Sale Admin UI/UX Hotfix 1

## 1. STATUS

**BOOKORA — FLASH SALE ADMIN UI/UX HOTFIX 1 — DONE (AUTOMATED)**

Ngày 18/11/2026. H1–H5 đã triển khai; regression, typecheck/build và kiểm tra phạm vi PASS. Visual/browser acceptance **NOT RUN**, không được coi là đã nghiệm thu giao diện.

## 2. PREFLIGHT

- Web HEAD: `8c6afcacd8e29316e25b51fe06e2a8338d434b48`.
- API HEAD: `c8d941c3343bf7919d9412a4b6b6e43a7bee659e`.
- Working tree đầu phiên đã có nhiều thay đổi Phase Flash Sale ở tracked files và các file untracked feature/contracts/handoff; API cũng có thay đổi từ Phase trước. Đã giữ nguyên, không stage/commit/push/reset/clean/restore.
- Đã đọc project instructions, RTK, package scripts, handoff Phase hiện tại, source Coupon, shared UI, menu/router và các component liên quan. Có **5 ảnh thực tế** đính kèm hotfix; prompt mô tả ảnh Coupon thứ 6 nhưng không có attachment tương ứng, nên đối chiếu Coupon Form Dialog hiện hữu trong source.
- Source hiện tại là căn cứ triển khai. Yêu cầu hotfix mới về layout dọc, Admin primary tối và vị trí menu thay thế yêu cầu Phase trước ở các điểm này.
- Lưu SHA-256 đầu phiên của 1.795 file Web và 602 file API (tracked + untracked không bị ignore) để phân biệt hotfix với diff có trước.

| Issue | Root cause đã xác minh | Fix | Rủi ro hồi quy |
| --- | --- | --- | --- |
| H1 | `FlashSaleFormDialog.vue`: `lg:grid-cols-[260px_minmax(0,1fr)]` và ScrollArea riêng cột trái bóp tên/mô tả/thời gian. | Nhóm nội dung theo chiều dọc; một body ScrollArea; header/footer cố định; bảng scroll ngang cục bộ. | Scroll trên màn hình thấp/hẹp cần visual acceptance. |
| H2 | Shared `CouponDateTimePicker` lấy collision boundary từ ScrollArea viewport gần nhất; boundary 260px cũ ép popup trong khi calendar/giờ chia cột. | Loại boundary hẹp bằng layout full-width; nhãn Bắt đầu/Kết thúc và lỗi inline. Không sửa shared picker. | DOM test xác nhận boundary/nội dung; không chứng minh vị trí pixel. |
| H3 | `FlashVariantPicker.vue` dùng flex + max-height nhưng thiếu chiều cao xác định; list có thể đẩy footer khỏi vùng nhìn thấy. | Grid có chiều cao theo dvh, hàng list `minmax(0,1fr)`, list-only ScrollArea, footer ngoài list; khôi phục focus về nút mở. | Shared selection list còn dùng ở Phiếu nhập kho; đã chạy regression. |
| H4 | Admin gắn `.flash-sale-surface`, CSS này override primary thành xanh Client. | Bỏ import/class Client khỏi Admin; dùng token và shared Button theo Coupon. | Client CSS và global theme giữ nguyên. |
| H5 | Entry Flash Sale nằm trong sales group. | Chuyển một entry sang promotions và sửa breadcrumb. | Route, guard và Coupon entry giữ nguyên; có menu/router/sidebar regression. |

GitNexus impact trước sửa: `admin-menu.ts` LOW (2 dependent trực tiếp, 16 gián tiếp, 0 process). Symbol Flash Sale/shared mới chưa có trong index nên impact trả UNKNOWN/not found; đã truy vết caller trực tiếp từ source: Admin page → form → picker, shared selection list → Flash Sale/Stock Receipt. Không xem UNKNOWN là bằng chứng an toàn.

## 3. CHANGED FILES / BOUND

Các đường dẫn sau tương đối với Web repo:

| File | Thay đổi / blast radius |
| --- | --- |
| `src/authorization/admin-menu.ts` | Di chuyển entry Flash Sale sang Quản lý khuyến mãi; giữ route và SuperAdmin-only. |
| `src/authorization/admin-menu.test.ts` | Kiểm tra parent, một entry duy nhất, quyền, route và Coupon label hiện hữu. |
| `src/features/flash-sales/pages/AdminFlashSalePage.vue` | Bỏ Client green scope, icon dùng token Admin, breadcrumb đúng group; giữ DataTable và hành động. |
| `src/features/flash-sales/components/FlashSaleFormDialog.vue` | Layout dọc, body/table scroll, labels/errors inline từ schema hiện hữu; quản lý đóng child và restore-focus target. Chỉ ảnh hưởng form Admin. |
| `src/features/flash-sales/components/FlashSaleFormDialog.test.ts` | Regression layout, datetime thật, footer/mode, lỗi inline và bảng 20 biến thể tên dài; giữ canonical price. |
| `src/features/flash-sales/components/FlashPriceInput.vue` | Caption chuyển màu xanh sang muted token; không đổi tính giá. |
| `src/features/flash-sales/components/FlashVariantPicker.vue` | Height/grid/footer, chọn tất cả trên trang và trạng thái indeterminate, neutral checkbox, restore focus. |
| `src/features/flash-sales/components/FlashVariantPicker.test.ts` **mới** | Selection/pagination/search/expand, list-footer separation và nested parent draft/focus/Escape/confirm. |
| `src/components/shared/ProductVariantSelectionList.vue` | Hover/focus border mỏng, tăng contrast unchecked checkbox, accessible name biến thể; không đổi selection/stock mapping. Ảnh hưởng hai nơi dùng: Flash Sale và Phiếu nhập kho. |
| `src/features/inventory/inventory-hotfix.test.ts` | Điều chỉnh assertion class cũ cho class contrast mới; giữ kiểm tra stock và shared extraction. |
| `Bookora_Flash_Sale_Admin_UIUX_Hotfix1_Handoff.md` **mới** | Handoff duy nhất của hotfix. |

Hash đối chiếu đầu/cuối phiên: đúng **9 file đã tồn tại thay đổi + 1 test mới + handoff này**. Toàn bộ 602 file API giữ nguyên. Client pages/theme, generated OpenAPI/Orval/Zod, router/guard, CouponDateTimePicker/Coupon form, `StockReceiptFormPage.vue`, `flash-sale.css` và handoff Phase cũ giữ nguyên so với đầu hotfix. Không thêm dependency, không chạy seed/migration/DB mutation.

## 4. UI FIXES

- Create/Edit/Detail dùng ba nhóm: Thông tin chương trình → Thời gian áp dụng → Sản phẩm tham gia. Body cuộn dọc, bảng cuộn ngang riêng; footer giữ đúng draft/publish/read-only/pending.
- Tên/mô tả đủ chiều rộng; thời gian chia hai cột khi đủ breakpoint và stack trên màn hình nhỏ. Reuse nguyên CouponDateTimePicker, calendar/giờ/phút/Hiện tại/Xong và quy ước UTC+7. Hiện lỗi tên/mô tả từ schema hiện hữu và lỗi thời gian tiếng Việt.
- Picker có vùng list riêng trong chiều cao giới hạn. Pagination, trang hiện tại, số đã chọn, Đóng, Thêm N nằm ngoài list; N=0 disabled. Chọn tất cả trên trang bỏ qua biến thể đã thêm và giữ selection qua phân trang.
- Nested Close/Escape chỉ đóng picker, giữ draft cha và trả focus về nút mở; confirm thêm biến thể về form.
- Admin kế thừa primary tối/navy của hệ thống, bề mặt/input/badge dùng shared tokens; status badge outline pill không dot. Client xanh/gradient không đổi.
- Menu: Quản lý khuyến mãi → Flash Sale, cùng nhóm `Mã khuyến mãi` (label Coupon thực tế); route `/super-admin/flash-sales` và quyền SUPER_ADMIN giữ nguyên.
- Không đổi pricing/bulk/quota/limit/status locks, stock toàn hệ thống của Flash Sale hay stock theo chi nhánh của Phiếu nhập kho.

## 5. AUTOMATED VERIFY

Đây là kết quả chạy trong **phiên hotfix**, không lấy số từ handoff Phase trước. Các lần kiểm tra chính:

| Lệnh / kiểm tra | Kết quả |
| --- | --- |
| `rtk proxy npm test -- src/features/flash-sales src/features/coupons/components/CouponFormDialog.test.ts src/features/inventory/inventory-hotfix.test.ts src/components/shared/ProductVariantSelectionList.test.ts src/authorization/admin-menu.test.ts src/features/coupons/coupon-permissions.test.ts --maxWorkers=2 --testTimeout=15000` | PASS — 8 files / 58 tests ở bước đầu. |
| `rtk proxy npm test -- src/features/flash-sales/components/FlashVariantPicker.test.ts --maxWorkers=1 --testTimeout=15000` | PASS — 1 file / 3 tests, gồm nested Close/Escape/focus. |
| `rtk proxy npm test -- src/features/flash-sales/components/FlashSaleFormDialog.test.ts --maxWorkers=1 --testTimeout=15000` | PASS — 1 file / 8 tests sau bổ sung 20 dòng. |
| `rtk proxy npm test -- src/features/flash-sales src/features/coupons src/features/inventory src/components/shared/ProductVariantSelectionList.test.ts src/authorization/admin-menu.test.ts src/components/admin/sidebar/AppSidebar.test.ts src/router/index.test.ts --maxWorkers=2 --testTimeout=15000` | **PASS cuối — 15 files / 140 tests**, sau tất cả thay đổi source/test. Lần trước cùng nhóm: 139 tests. |
| `rtk proxy npm run build` (`vue-tsc -b && vite build`) | **PASS cuối** — typecheck và production build. Vite có cảnh báo chunk >500 kB, không chặn build. |
| Web lint | **NOT AVAILABLE** — package.json không có lint script. |
| `rtk proxy git diff --check` ở Web/API | PASS; Git cảnh báo LF/CRLF ở working tree có trước, không có whitespace error. |
| `rtk proxy git status --short`, `rtk proxy git diff --stat`; review untracked + SHA-256 baseline | PASS phạm vi hotfix; diff Git tổng vẫn chứa toàn bộ Phase trước nên không dùng tổng stat để quy cho hotfix. |
| GitNexus `detect_changes({scope: "compare", base_ref: "master", repo: "BaseVue3TS"})` | Đã chạy: CRITICAL, 44 symbols / 21 processes / 26 tracked files của **toàn bộ diff Phase trước + hotfix**. Kết quả không cô lập hotfix và chưa index symbol mới; đã dùng source review + baseline hash để kiểm soát phạm vi. Không commit. |

Trong quá trình bổ sung test có hai assertion ban đầu FAIL (calendar dùng data-slot thay vì role grid; nút Đóng của test bắt nhầm dialog cha). Đã sửa selector đúng thành phần; các lần chạy cuối PASS như bảng trên.

## 6. RUNTIME/MANUAL

**NOT RUN — Product Owner tự nghiệm thu.** API/Vite đã chạy sẵn, nhưng computer-use không đọc được cửa sổ Edge mục tiêu đang minimized; không có browser session điều khiển phù hợp để hoàn tất smoke. Không có ảnh sau sửa, không nhận visual PASS và không tạo/sửa campaign trong DB để kiểm tra.

Checklist nghiệm thu:

1. Khoảng 1366×768: mở Create; kiểm tra ba nhóm dọc, tên/mô tả, hai nhãn thời gian và footer luôn trong viewport; cuộn đến bảng nhiều dòng và bật Cài nhanh.
2. Mở cả Bắt đầu/Kết thúc: calendar, thứ/ngày, giờ/phút, Hiện tại/Xong không chồng; thử end ≤ start và lỗi tên trống; đóng/mở lại picker.
3. Mở chọn sản phẩm: SIMPLE/OPTIONED, hover/focus/unchecked contrast, search tên/SKU, chọn tất cả, phân trang; pagination/count/Đóng/Thêm N không bị list che. Close/Escape trả focus và giữ form cha.
4. Khoảng 390×844: body scroll, popup date/time, footer và bảng scroll ngang không tràn; kiểm tra Edit DRAFT và Detail/ACTIVE chỉ đọc.
5. Sidebar mở đúng Quản lý khuyến mãi khi direct URL/refresh; Coupon và Phiếu nhập kho hoạt động; Client Flash Sale vẫn xanh và badge giảm giá có icon flash như Phase trước.

## 7. RISKS + FINAL STATUS

- DOM/unit tests xác nhận cấu trúc, nội dung, state và tương tác; không thay thế kiểm tra pixel/overflow thực ở desktop thấp và mobile. Cần Product Owner nghiệm thu các bước trên.
- Search API hiện hữu hỗ trợ tên/SKU; chưa có bằng chứng barcode được hỗ trợ. Hotfix giữ nguyên contract, không bổ sung backend search hoặc nhận barcode đã verify.
- GitNexus index chưa phủ feature mới; cảnh báo compare CRITICAL chứa các domain có trước (gồm Checkout). Không diễn giải thành đánh giá rủi ro riêng của hotfix.
- Không chạy full app/manual E2E; đã chạy toàn bộ nhóm regression liên quan. Không commit/push.

**FINAL: DONE (AUTOMATED); visual/manual acceptance NOT RUN.**

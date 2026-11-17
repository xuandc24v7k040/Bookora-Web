# BOOKORA — COUPON UI/UX HOTFIX 1

## STATUS

**BOOKORA — COUPON UI/UX HOTFIX 1 — DONE (AUTOMATED)**

## PREFLIGHT

Đã đối chiếu `AGENTS.md`, `CLAUDE.md`, working tree và `Bookora_Coupon_Upgrade_Handoff.md`. Baseline Web `3390a8a`, API `0afebbf`. Các sửa đổi của Phase Coupon Upgrade đã có sẵn trong working tree khi bắt đầu.

| Mục | FOUND / GAP | FIX |
| --- | --- | --- |
| Ngày giờ | `src/features/coupons/components/CouponFormDialog.vue` dùng `datetime-local`: múi giờ theo máy, mất giây khi nạp lại dữ liệu edit, chưa kiểm tra phút đã qua. `src/lib/date-format.ts` dùng giờ Việt Nam. | Chọn ngày, giờ và phút bằng Calendar/Popover/ScrollArea có sẵn. Giữ ISO UTC trong form. |
| Form | Form dùng Checkbox ở cuối. `src/components/ui/switch/` chưa có wrapper. | Bổ sung Switch theo shadcn-vue trên `SwitchRoot`/`SwitchThumb` của Reka đã cài. |
| Trạng thái | `src/features/coupons/components/coupon-columns.ts` dùng chữ màu. `src/features/engagement/components/admin-review-columns.ts` đã có pattern Badge outline. | Reuse Badge, giữ đủ 5 trạng thái và bộ lọc tương ứng. |
| Sao chép | `src/features/coupons/components/CheckoutCouponDialog.vue` chỉ hiển thị mã. | Nút Copy độc lập với radio, gọi Clipboard API và báo kết quả qua Sonner. |

`Bookora-API/src/modules/coupons/coupons.dto.ts` nhận ISO date-time. `Bookora-API/src/modules/coupons/coupons.service.ts` kiểm tra `startAt < endAt` và đọc thời gian theo instant. Quy tắc phút của form dùng được với contract hiện tại, vì vậy hotfix chỉ sửa Web.

GitNexus upstream trước sửa báo LOW tại form, checkout dialog và cột trạng thái. AdminCouponListPage và CheckoutPage lần lượt là nơi gọi trực tiếp hai dialog. Hàm `save` có 1 caller trực tiếp và 0 execution flow được ghi nhận. `detect_changes` so với `master` báo CRITICAL cho tổng diff Phase Coupon Upgrade đã có sẵn với 19 file tracked. Các file hotfix hiện untracked nên được kiểm riêng bằng review source và test.

## Bốn sửa đổi

1. `src/features/coupons/components/CouponDateTimePicker.vue` và `src/features/coupons/coupon-period.ts` thêm popover ngày giờ 24h theo `Asia/Ho_Chi_Minh`, chọn **Hiện tại** vào bản nháp và bấm **Xong** để xác nhận. Create mặc định phút hiện tại. Xác nhận và lưu đối chiếu với phút hiện tại. `endAt` phải lớn hơn `startAt`. Edit giữ nguyên timestamp lịch sử, kể cả giây và mili giây, nếu không thay đổi trường đó.
2. `src/features/coupons/components/CouponFormDialog.vue` và `src/components/ui/switch/Switch.vue` sắp field theo **Thông tin chung → Thời gian hiệu lực → Mức giảm & điều kiện**, đặt **Kích hoạt** cạnh đầu form. Giữ formatter tiền, validation, giá trị `isActive` khi edit và lỗi server. Thân form cuộn riêng với tiêu đề và nút lưu cố định. Popover giới hạn trong vùng thân dialog và chuyển sang bố cục dọc trên màn hình hẹp.
3. `src/features/coupons/components/coupon-columns.ts` dùng Badge outline dạng pill như Admin Reviews. Màu theo trạng thái, không có chấm trang trí. Giữ chiều rộng, xuống dòng của cột ưu đãi và lượt sử dụng.
4. `src/features/coupons/components/CheckoutCouponDialog.vue` đặt nút Copy cạnh mã trên từng thẻ. Nút có tên truy cập và dùng được bằng bàn phím. Bấm Copy giữ nguyên lựa chọn hai nhóm và dialog. Clipboard bận sẽ chặn click lặp, thông báo dùng cùng ID để tránh xếp chồng.

## Automated verify

| Lệnh | Kết quả |
| --- | --- |
| `rtk proxy npm test -- src/features/coupons src/pages/app/checkout/CheckoutHotfixContract.test.ts src/pages/app/checkout/CheckoutShippingPricingContract.test.ts --maxWorkers=2` | PASS — 8 file, 50 test. Bao gồm picker thật trong Dialog, đổi trạng thái, thời gian lịch sử, lỗi server, Badge và Clipboard success/fail. |
| `rtk proxy npm run build` (`vue-tsc -b && vite build`) | PASS — typecheck và bundle thành công. Vite cảnh báo một số chunk trên 500 kB. |
| `rtk git diff --check`, `rtk git diff --stat`; kiểm whitespace riêng 9 file hotfix untracked | PASS — diff tracked giữ nguyên theo baseline, 9 file hotfix không có lỗi whitespace. |
| Lint Web | NOT RUN — `package.json` không có script lint. |
| Browser, manual, runtime, API live và E2E | NOT RUN — Product Owner tự nghiệm thu. |

## Checklist nghiệm thu thủ công

- Mở bộ chọn ở màn hình 320–390 px và cửa sổ thấp. Kiểm tra Tab, phím mũi tên, Escape, cuộn giờ/phút, nút **Xong** và nút lưu form.
- Tạo voucher ở phút hiện tại, chọn phút đã qua, thử kết thúc bằng hoặc trước bắt đầu. Nếu form mở qua phút kế tiếp, chọn lại **Hiện tại** trước khi lưu.
- Mở voucher lịch sử và lưu sau khi chỉ đổi tên hoặc Switch. Đối chiếu ngày giờ đã lưu. Xem outline và màu ở từng trạng thái trong bảng.
- Chọn một voucher mỗi nhóm, bấm Copy mã khác và kiểm tra lựa chọn vẫn nguyên. Thử từ chối quyền ghi Clipboard để xem thông báo lỗi.

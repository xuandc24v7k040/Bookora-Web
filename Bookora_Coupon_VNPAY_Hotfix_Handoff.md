# BOOKORA COUPON × VNPAY HOTFIX — DONE

> **Audit sau merge — 18/11/2026:** Đã khôi phục các phần bị mất khi resolve conflict. Nội dung bốn file conflict hiện khớp bản hotfix trong Git (so sánh stage 2, chuẩn hóa CRLF/LF). Git index vẫn còn `UU/AA`; chưa stage hoặc hoàn tất merge. Kết quả kiểm thử chạy lại và giới hạn xác minh nằm ở cuối tài liệu.

**Phạm vi** — Hotfix trên Bookora API tại HEAD `7fd86cb` và một ánh xạ lỗi trên Bookora Web tại HEAD `dd6d075`. Hai repo đã có thay đổi `AGENTS.md` và `CLAUDE.md` trước khi bắt đầu.

## H1 — Callback sau khi hủy hoặc hết hạn

Luồng hủy cũ giải phóng kho và voucher nhưng có thể để attempt VNPAY ở `PENDING`. Nhánh IPN thất bại chỉ kiểm tra trạng thái attempt và bỏ qua kết quả claim giữ kho. Do đó callback có thể đổi đơn `CANCELLED` thành `PAYMENT_FAILED`. Lượt E2E đầu còn tái hiện deadlock vì luồng hủy khóa đơn trước, trong khi IPN khóa attempt trước. Return thất bại chỉ chuyển hướng. Return thành công đi qua cùng nhánh đối soát với IPN thành công.

- `src/modules/payments/payments.service.ts` chỉ áp dụng thất bại cho attempt hiện hành còn chờ, thuộc payment và đơn còn chờ thanh toán. Transaction kiểm tra lại callback và chỉ đổi trạng thái khi claim giữ kho thành công. IPN bị bỏ qua trả mã `02`. Nhánh thành công, thất bại và hết hạn attempt khóa hàng đơn trước các thao tác ghi. Nhánh thành công đến muộn tiếp tục lưu callback đã lọc để đối soát.
- `src/modules/orders/order-cancellation.ts` đóng attempt VNPAY còn chờ trong cùng transaction hủy. Các attempt đã kết thúc giữ trạng thái lịch sử.
- `src/modules/customer-orders/customer-orders.service.ts`, `src/modules/admin-orders/admin-orders.service.ts` và `src/modules/admin-orders/admin-orders.repository.ts` dùng retry serialization hiện có cho thao tác hủy. Job hết hạn voucher đã dùng helper đó và cùng luồng hủy.

E2E xác nhận callback đã ký đến muộn qua IPN và Return không mở lại đơn, không ghi PAID cho đơn đã hủy và không hoàn kho hoặc thay đổi lượt dùng lần hai. Khi hủy và IPN chạy đồng thời, chỉ trạng thái thắng race được áp dụng. Ca retry vẫn dùng tổng tiền đã chốt và cùng lượt giữ voucher.

## H2 — Tổng tiền VNPAY bằng 0đ

`VnpayService.buildPaymentUrl()` đã từ chối số tiền không hợp lệ, nhưng `CheckoutService.placeVnpay()` chỉ gọi bộ tạo URL sau khi transaction đặt đơn đã commit.

- `src/modules/checkout/checkout.service.ts` kiểm tra tổng tiền canonical trong transaction, sau kiểm tra preview và dữ liệu checkout, trước khi ghi kho, đơn, payment, attempt, voucher hoặc giỏ. Trên nhánh số tiền không hợp lệ, hệ thống đối chiếu lại voucher bằng chính transaction đó để nhận ra ưu đãi đã thay đổi. Với tổng tiền 0đ còn đúng preview, API trả HTTP `422` và mã `VNPAY_INVALID_AMOUNT`. Luồng phát lại URL từ attempt cũ cũng kiểm tra số tiền.
- `src/pages/app/checkout/CheckoutPage.vue` hiển thị hướng dẫn chọn phương thức khác hoặc điều chỉnh voucher. HTTP 422 và cấu trúc lỗi đã có trong OpenAPI. Mã lỗi mới là giá trị chuỗi trong cấu trúc này.

E2E giảm hết tiền hàng **và** phí vận chuyển, đối chiếu dữ liệu trước/sau và xác nhận VNPAY 0đ không ghi dữ liệu. Cùng giỏ đó vẫn đặt COD thành công. Các fixture hợp lệ đang chặn hoặc giới hạn giảm giá theo tiền hàng và phí ship, nên không dựng tổng âm từ quy tắc coupon. Điều kiện số tiền vẫn từ chối cả tổng âm và số không phải số nguyên an toàn.

## Bằng chứng kiểm thử

Test sửa trong `src/modules/payments/payments.service.spec.ts` và `test/coupon-http.e2e-spec.ts`. E2E dùng app test của Jest/Supertest và database PostgreSQL tạm, với callback ký bằng cấu hình fixture. Ca validation thời điểm trùng dùng cùng một timestamp để tránh chênh mili giây giữa hai lần dựng fixture.

| Repo | Lệnh đã chạy | Kết quả cuối |
| --- | --- | --- |
| API | `rtk proxy npm test -- --runInBand --silent` | PASS — 110 suite, 873 test |
| API | `rtk proxy npm run test:e2e -- --runInBand --silent` | PASS — 14 suite, 102 test |
| API | `rtk proxy npm run type-check`, `rtk proxy npm run lint`, `rtk proxy npm run build` | PASS |
| Web | `rtk proxy npm test -- src/features/coupons src/pages/app/checkout/CheckoutHotfixContract.test.ts src/pages/app/checkout/CheckoutShippingPricingContract.test.ts --maxWorkers=2 --testTimeout=15000` | PASS — 8 file, 50 test. Chạy riêng sau khi lượt chạy song song có một test form timeout ở 5 giây |
| Web | `rtk proxy npm run build` | PASS — gồm `vue-tsc -b` và Vite |
| Web | Lint | NOT RUN — package.json không có script lint |
| Cả hai | `rtk git diff --check` | PASS |
| Manual, browser, runtime server, VNPAY Sandbox | Nghiệm thu thực tế | NOT RUN — người dùng nghiệm thu |

GitNexus upstream báo HIGH cho helper hủy (3 caller gồm khách hàng, quản trị và job hết hạn) và CRITICAL cho hàm ánh xạ lỗi Web (7 caller, 6 luồng); phần Web chỉ thêm một mục thông báo. Handler IPN có 1 caller, luồng ghi success có 2 caller (IPN và Return), luồng hết hạn attempt có 1 caller, đều LOW. GitNexus có dữ liệu một phần ở `placeVnpay`; đã đối chiếu trực tiếp controller. `detect_changes` so với `master` báo HIGH ở cả hai repo. Diff theo phạm vi gồm 8 file code/test API, 1 file code Web và handoff này. Schema, migration, generated contract và các thay đổi instructions có sẵn giữ nguyên.

## Audit và phục hồi sau conflict — 18/11/2026

### BOUND — đối chiếu source trước khi sửa

API HEAD hiện tại là `9349f88`, Web HEAD là `dd6d075`. Không thấy conflict marker trong bốn file xung đột, nhưng nội dung resolve ban đầu đã mất ba phần của bản bàn giao:

1. `src/modules/checkout/checkout.service.ts`: mất nhánh chặn tổng tiền VNPAY không hợp lệ trước khi trừ kho và ghi dữ liệu, bao gồm đối chiếu lại voucher để phát hiện preview cũ. Helper kiểm tra tiền và guard phát lại URL vẫn còn, nhưng không thay thế được nhánh này trong transaction đặt đơn.
2. `src/modules/payments/payments.service.spec.ts`: mock transaction thiếu `$queryRaw` cho thao tác khóa hàng đơn, làm fixture không còn khớp implementation.
3. `test/coupon-http.e2e-spec.ts`: test thời điểm bắt đầu/kết thúc trùng nhau lại gọi `body()` hai lần, có thể tạo hai timestamp lệch mili giây.

Đã khôi phục đúng ba phần trên từ stage 2 của các file conflict. Đồng thời chuẩn hóa CRLF sang LF cho bốn file vì lint báo lỗi định dạng sau merge. `src/modules/payments/payments.service.ts` không mất logic; chỉ chuẩn hóa xuống dòng. Không mở rộng nghiệp vụ.

Đối chiếu toàn bộ nội dung, sau chuẩn hóa CRLF/LF, cho kết quả **MATCH** với stage 2 ở cả bốn file:

- `src/modules/checkout/checkout.service.ts`
- `src/modules/payments/payments.service.ts`
- `src/modules/payments/payments.service.spec.ts`
- `test/coupon-http.e2e-spec.ts`

Các thay đổi hủy đơn trong `order-cancellation.ts`, customer-orders và admin-orders đã có nguyên vẹn ở HEAD. Sau phục hồi, `git diff HEAD` của API chỉ còn thay đổi instructions có sẵn. Phía Web vẫn có đúng ánh xạ `VNPAY_INVALID_AMOUNT` gồm hai dòng như bàn giao; không sửa thêm code Web.

GitNexus upstream trước sửa trả LOW cho `placeVnpay` (1 caller), handler IPN (1 caller), success (2 caller, 1 process) và expiry (1 caller). `detect_changes` so với `master` chỉ nhận diện thay đổi instructions trong lần audit này, nên không dùng kết quả đó để chứng minh nội dung file unmerged; đã kiểm tra trực tiếp source và các Git stage như trên.

### VERIFY — kiểm tra lại sau phục hồi

| Repo | Lệnh đã thực thi trong lần audit | Kết quả |
| --- | --- | --- |
| API | `rtk proxy npm test -- --runInBand --silent` | PASS — 110 suite, 873 test |
| API | `rtk proxy npm run type-check` | PASS |
| API | `rtk proxy npm run lint` | PASS sau chuẩn hóa LF; lượt đầu thất bại với 3.094 lỗi CRLF |
| API | `rtk proxy npm run build` | PASS |
| API | `rtk proxy npm run test:e2e -- --runInBand --silent` | Lượt đầu: 13/14 suite, 101/102 test qua. Lượt full chạy lại: PASS — 14 suite, 102 test, 198,832 giây |
| API | Suite `test/coupon-http.e2e-spec.ts`, chạy riêng hai lượt | PASS — 10/10 test mỗi lượt |
| Web | `rtk proxy npm test -- src/features/coupons src/pages/app/checkout/CheckoutHotfixContract.test.ts src/pages/app/checkout/CheckoutShippingPricingContract.test.ts --maxWorkers=2 --testTimeout=15000` | PASS — 8 file, 50 test |
| Web | `rtk proxy npm run build` | PASS — `vue-tsc -b` và Vite; có cảnh báo chunk lớn hơn 500 kB và thời gian plugin `vite:vue` |
| Web | Lint | NOT RUN — package.json không có script lint |
| Cả hai | `rtk git diff --check` | PASS |

**Giới hạn cần giữ lại:** lượt full E2E đầu có ca race hủy đơn/IPN trả `RspCode=99` thay vì `02`. Hai lượt coupon HTTP riêng và lượt full chạy lại đều qua. Chưa xác định được nguyên nhân lỗi gián đoạn này; không kết luận rằng race đã tuyệt đối ổn định hoặc lỗi do tải máy. Không thay đổi thêm logic ngoài bản hotfix để làm test qua.

Không chạy runtime server, browser, manual test hoặc VNPAY Sandbox. E2E chỉ dùng ứng dụng test tự động và PostgreSQL tạm theo thiết lập test hiện có.

### DONE — trạng thái bàn giao sau audit

Đã phục hồi source về đúng bản hotfix, giữ nguyên các thay đổi instructions có sẵn. Chưa stage, commit hay hoàn tất merge. Git index vẫn đánh dấu `UU` cho ba file checkout/payments và `AA` cho `test/coupon-http.e2e-spec.ts`; người dùng cần hoàn tất resolve trong Git sau khi xem lại. Việc source không còn conflict marker không đồng nghĩa Git index đã resolve.

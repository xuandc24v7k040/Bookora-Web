# Bookora — Flash Sale Client UI/UX Hotfix 1 + Buy Now Bugfix

## 1. STATUS

**BOOKORA — FLASH SALE CLIENT UI/UX HOTFIX 1 + BUY NOW BUGFIX — DONE (AUTOMATED)**

Ngày 18/11/2026. Browser/visual acceptance **NOT RUN**; không đồng nghĩa automated PASS là đã nghiệm thu giao diện.

## 2. PREFLIGHT

- Web HEAD: `8c6afcacd8e29316e25b51fe06e2a8338d434b48`; API HEAD: `c8d941c3343bf7919d9412a4b6b6e43a7bee659e`.
- Hai working tree đã có toàn bộ Phase Flash Sale và Web có Admin hotfix chưa commit. Đã đọc instructions, RTK, scripts thật, handoff Phase/Admin và source hiện hữu; lưu SHA-256 tracked/untracked đầu phiên để cô lập hotfix này. Không dùng diff tổng so với HEAD làm danh sách thay đổi riêng của Client hotfix.
- Lượt yêu cầu này chỉ đính kèm Markdown, **không có 4 ảnh Client thực tế**. Mapping dưới đây theo mô tả trong tài liệu, không nhận đã xem các ảnh đó. Ảnh Client tham khảo cũ và source Bookora vẫn là tham chiếu.
- Đã audit Buy Now trước sửa CSS. Source tham chiếu: `BookDetailPage.vue`, `CartPage.vue`, cart API/components, `CheckoutPage.vue`, API CartMapper, checkout resolver/offers và HTTP tests. Tabs Đơn hàng thực tế ở `src/pages/app/account/AccountOrdersPage.vue`: underline xanh, chữ semibold, border dưới, không shadow; không có abstraction Tabs riêng để import.

| Issue / ảnh theo mô tả | Root cause trong source | Fix / phạm vi |
| --- | --- | --- |
| Buy Now | PDP `addToCart(true)` dùng ADD rồi tới `/cart`; API CartMapper chỉ lấy `StorefrontPriceService.resolve(...).current`. Checkout riêng đã resolve Flash Sale. | Đường FS đi thẳng existing Checkout với đúng item; API Cart quote theo lô. Không sửa checkout pricing/payment engine. |
| H1 / ảnh 1 | `FlashCountdown` chỉ có số; hero không có icon cùng heading. | Thêm labeled variant, Clock + heading cùng hàng; giữ server offset/timer. |
| H2 / ảnh 1 | Listing TabsTrigger còn style nền/shadow mặc định, không có direction/transition. | Reuse shadcn Tabs với visual Order tabs, Flame/Clock, indicator, Vue Transition hai chiều. |
| H3 / ảnh 1 | Mỗi campaign render thêm FlashCountdown. | Chỉ deadline tiếng Việt đậm primary, timezone Việt Nam. |
| H4 / ảnh 1–2 | Card dùng amber badge; hover chỉ đổi shadow. | Badge xanh có tia sét, border/title primary, nâng nhẹ, focus/reduced motion. |
| H5 / ảnh 3 | Compact dùng `flex-1` + `mt-auto` như card đầy đủ; carousel track cố định ngay cả khi chỉ 1–2 item. | Compact price sát title/variant; 1–2 item dùng grid có max-width, nhiều item dùng Carousel. |
| H6 / ảnh 4 | Hero đồng hồ phụ thuộc `first` của tab đang chọn; empty chỉ là một câu. | Hero chung ngoài transition, upcoming motif sách thay clock, empty centered có icon/title/description. |

GitNexus impact: PDP `addToCart` LOW; CartMapper `toResponse` **HIGH**, 5 caller trực tiếp/4 nhóm process Cart; `refreshPreview` **CRITICAL**, 6 caller/5 process Checkout (đã cảnh báo, không sửa thân hàm này). `loadPreview` LOW. Feature mới chưa index đầy đủ nên UNKNOWN được bổ sung bằng source trace/tests. Compare với master sau sửa: Web critical 50 changed symbols/21 affected/27 tracked files; API critical 58/56/28. Đây là toàn bộ diff Phase có trước + hotfix, không phải đánh giá riêng của hotfix.

## 3. BUY NOW DIAGNOSIS

**Case A được xác minh từ source và HTTP regression:** Cart chỉ hiển thị catalog trong khi Preview/Place có Flash Sale resolver. Không có bằng chứng Preview hoặc snapshot ban đầu tính sai; không sửa authoritative pricing để che lỗi Cart.

Fixture thật dùng catalog hiệu lực 80.000đ, giá gốc 100.000đ, Flash Sale khóa 60.000đ, quantity 2:

| Layer | Trước sửa theo source | Sau sửa / evidence |
| --- | --- | --- |
| Product Detail | Offer FS, nhưng CTA add rồi tới Cart. | Test bấm CTA thật: selected variant + qty 2 → exact returned cart item → `client-checkout`, kèm offer ID làm intent. |
| Cart | Mapper `currentUnitPrice = price.current` = 80.000đ, subtotal 160.000đ. | HTTP: 60.000đ, subtotal 120.000đ; message giá dự kiến/chưa giữ suất. |
| Preview | Resolver FS đã có. | HTTP: unitPrice 60.000đ, bằng Cart quote. |
| Place / Snapshot | Revalidate/allocate trong transaction đã có. | HTTP COD snapshot unitPrice 60.000đ; suite kiểm tra thêm VNPAY reserve/retry/callback/snapshot. |
| Quota | Cart/Preview không giữ suất. | HTTP assert allocation count = 0 trước Place. |

Patch chính:

- `prepareBuyNow` refresh Cart, tìm đúng variant; nếu đã có thì update **đúng quantity khách chọn**, không cộng lẫn quantity cũ; chỉ chọn một cart item trả về. Kiểm tra branch/response quantity/eligibility trước navigation. PDP kiểm tra thêm branch/variant chưa đổi trong khi await; pending chặn click lặp.
- Intent `flashOffer` chỉ là ID đối chiếu UX, không truyền giá/tổng/discount làm authority. Không set regular-price opt-out. URL giữ intent qua refresh/Back; login returnTo giữ variant query. Khách cần bấm mua lại sau đăng nhập.
- Checkout so sánh canonical preview với offer intent. Nếu offer đã hết/thay đổi, chặn Place và yêu cầu **Xác nhận giá mới**; quota/per-user vẫn dùng dialog giảm lượng/mua toàn bộ giá thường hiện hữu. Backend tiếp tục revalidate khi Place và trả stale preview nếu đổi giá giữa Preview/Place.
- **Không có FS:** giữ Buy Now cũ add vào Cart rồi `/cart`; có component regression riêng. Add to Cart vẫn không giữ suất.
- API `CartFlashPriceService` mới: 1 query campaign items + 2 query groupBy usage toàn hệ thống/cá nhân, reuse `activeFlashUsage`; không N+1 theo item. Mapper chỉ áp quote khi FS thấp hơn catalog, đủ toàn bộ quantity/quota/user limit và stock của branch đang hoạt động. Không chia một dòng thành hai giá.
- Contract response không đổi, dùng các trường price/message có sẵn. Không sửa DTO/OpenAPI/generated. CartSidebar nêu rõ giá dự kiến, chưa giữ suất.

Regression tương đương trước/sau: source cũ exact assignment catalog và navigation `/cart` chứng minh lỗi; test CTA hiện tại assert Checkout intent (đường cũ không đạt assertion), test HTTP mới assert Cart 60.000đ (mapper cũ trả 80.000đ). **Không nhận đã ghi một lần test đỏ trước patch:** lượt HTTP đầu kết thúc sau khi patch đã được áp dụng. Evidence là source trước sửa + test đường thật sau sửa.

## 4. UI FIXES H1–H6

- H1: hero ACTIVE có Clock + heading, số và nhãn GIỜ/PHÚT/GIÂY cùng từng cột; giờ >99 không cắt. Giữ một timer hero, offset serverNow, expiry refetch; không gọi API mỗi giây. Query hero luôn page 1 sorted endAt asc; listing phân trang riêng, page 1 dùng cùng Vue Query key để deduplicate.
- H2: shadcn Tabs giữ keyboard/ARIA, visual underline giống Order tabs; Flame/Clock + count tint. Indicator dịch hai chiều; panel enter/leave transform ±24px + opacity 220ms, reduced-motion bỏ transition. Hero ngoài transition, panel wrapper min-width/overflow và min-height ổn định.
- H3: header mỗi campaign chỉ còn mốc bắt đầu/kết thúc bằng `Intl.DateTimeFormat('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', ...})`, không mini timer.
- H4: badge góc phải primary tint xanh + Zap, không amber. Card dùng border màu/translate/shadow không đổi kích thước border, title đổi primary; focus/reduced motion có style. Giữ link đúng variant, giá/progress và Đã dùng/Giữ/Còn trung thực.
- H5: compact bỏ spacer/margin-auto cho giá, giữ ảnh đúng tỷ lệ. 1 item max-width nhỏ căn giữa, 2 item grid có max-width, nhiều item Carousel; arrows disabled được ẩn và đặt trong khoảng padding, không tạo slots rỗng.
- H6: upcoming không clock, có motif BookOpen. Empty centered theo vùng nội dung, CalendarClock lớn/title/mô tả; nút chuyển về ACTIVE khi có dữ liệu. Upcoming có data hiển thị card thật/start time, không CTA mua giá FS sớm.
- Green scope chỉ gắn Client; không chỉnh global theme, shared ProductCard, shared Tabs, shared Carousel hoặc Admin.

## 5. BOUND — FILES

Đường dẫn tương đối với repo tương ứng:

| Repo / file | Lý do |
| --- | --- |
| Web `src/pages/app/catalog/BookDetailPage.vue` | CTA FS, branch/variant/pending/login context; regular flow giữ nguyên. |
| Web `src/features/cart/buy-now.ts` (mới) | Chuẩn bị exact item/quantity và kiểm tra intent với canonical preview. |
| Web `src/pages/app/checkout/CheckoutPage.vue` | Chặn Place khi intent không khớp; feedback/xác nhận giá mới. |
| Web `src/features/cart/components/CartSidebar.vue` | Copy giá dự kiến/chưa giữ suất. |
| Web `src/features/flash-sales/pages/FlashSalePage.vue` | Hero, tabs/transition, campaign headers, upcoming/empty. |
| Web `src/features/flash-sales/components/FlashCountdown.vue` | Optional labels, giữ logic clock. |
| Web `src/features/flash-sales/components/FlashSaleCard.vue` | Hover/badge, compact layout. |
| Web `src/features/flash-sales/components/HomeFlashSale.vue` | 1/2/many layout, arrows. |
| Web `src/features/cart/buy-now.test.ts`, `src/pages/app/catalog/BookDetailFlashBuyNow.test.ts` (mới) | Exact selection/quantity/branch/intent, CTA thật và no-FS regression. |
| Web `src/features/flash-sales/components/flash-sale-client-hotfix.test.ts` (mới), `flash-sale-ui.test.ts` | Hero/tab/empty/upcoming/grid/carousel và labeled clock. |
| API `src/modules/cart/cart-flash-price.service.ts`, `.spec.ts` (mới) | Batch quote/usage và bounded query regression. |
| API `src/modules/cart/cart.mapper.ts`, `cart.module.ts` | Áp quote vào response hiện hữu, đăng ký provider. |
| API `test/flash-sale-http.e2e-spec.ts` | Cart→Preview→COD snapshot, stock/qty/catalog/stop regression. |
| Web `Bookora_Flash_Sale_Client_Hotfix1_Handoff.md` | Handoff duy nhất của nhiệm vụ này. |

Baseline hash xác nhận Admin hotfix/menu/dialog/DatePicker/Variant Picker, Coupon, Inventory, VNPAY source, schema/migrations, generated contracts, global theme và hai handoff cũ giữ nguyên. Backend thay đổi chỉ Cart quote/wiring và tests; checkout/payment source không đổi. Không thêm dependency hoặc chạy lệnh Git ghi dữ liệu.

## 6. VERIFY

| Lệnh thật / phạm vi | Kết quả |
| --- | --- |
| Web `rtk proxy npm test -- src/features/flash-sales src/features/cart src/features/checkout src/features/coupons src/features/storefront src/pages/app/checkout src/pages/app/home src/pages/app/account/AccountOrdersPage.test.ts --maxWorkers=2 --testTimeout=15000` | PASS — 34 files / 178 tests. |
| Web `rtk proxy npm test -- src/pages/app/catalog/BookDetailFlashBuyNow.test.ts --maxWorkers=1` | PASS — 1 file / 2 tests, gồm CTA FS thật và regular Buy Now cũ. |
| Web cùng nhóm regression trên, thêm `src/pages/app/catalog/BookDetailFlashBuyNow.test.ts` | PASS cuối — 35 files / 180 tests, sau tất cả thay đổi. |
| Web `rtk proxy npm test -- src/features/flash-sales/components/flash-sale-client-hotfix.test.ts --maxWorkers=1` | PASS — 5 tests sau sửa query hero nearest deadline. |
| Web `rtk proxy npm run build` | PASS cuối — vue-tsc + Vite. |
| Web lint | NOT AVAILABLE — không có script. |
| API `rtk proxy npm test -- --runInBand --testPathPatterns="cart\|flash-sale\|checkout.service"` | PASS — 6 suites / 66 tests. |
| API `rtk proxy npm run test:e2e -- --runInBand --testPathPatterns=flash-sale-http` | PASS cuối — 15 tests, HTTP + PostgreSQL thật trong database tạm. Không gọi VNPAY Sandbox; callback ký bằng fixture. |
| API `rtk proxy npm run type-check` | PASS. |
| API `rtk proxy npm run build` | PASS — Nest/SWC + tsc-alias. |
| API `rtk proxy npm run lint -- --no-warn-ignored` | PASS. |
| API `rtk proxy npm exec -- eslint src/modules/cart/cart.mapper.ts src/modules/cart/cart.module.ts src/modules/cart/cart-flash-price.service.ts src/modules/cart/cart-flash-price.service.spec.ts test/flash-sale-http.e2e-spec.ts` | PASS sau bổ sung regression cuối. |
| Hai repo: `git diff --check`, status/stat và baseline hashes | PASS phạm vi; tiếp tục giữ diff Phase có trước. |

Trong quá trình viết UI tests có FAIL do duplicate template attribute và selector test (Tabs dùng mousedown, Carousel không có data-slot). Đã sửa nguồn/selector đúng implementation, chạy lại PASS. Build Vite cảnh báo chunk >500kB. HTTP concurrency tests có log write conflict/deadlock dự kiến, bounded retry đã PASS. Không nhận các cảnh báo này là lỗi giá còn tồn tại.

## 7. RUNTIME/MANUAL

**NOT RUN — Product Owner tự nghiệm thu.** Không chạy browser smoke trong phiên này. Automated HTTP dùng database disposable với fixture/migrations riêng; không seed/reset DB ứng dụng, không thanh toán thật/Sandbox.

Checklist PO:

1. Desktop/mobile 320/390/1024/1366/1440: ACTIVE↔UPCOMING, keyboard, indicator/slide hai chiều; reduced motion; hero không co ngang; empty và upcoming có data.
2. Listing/Home 1/2/nhiều item: badge, hover/focus, title/price, compact spacing, arrows chỉ khi trượt được, quota Giữ/Đã dùng đúng nghĩa.
3. PDP SIMPLE/OPTIONED: đổi variant/branch, quantity 1/>1, giỏ đã có item, guest login; CTA FS → Checkout đúng một dòng và đúng lượng; regular CTA cũ → Cart.
4. Cart/Preview/Place: giá dự kiến, hết suất/per-user, giảm lượng/mua toàn bộ regular, catalog thấp hơn, campaign hết/dừng; không tự đặt giá cao hơn khi chưa xác nhận. Thử refresh/Back và stale preview.
5. ORDER+SHIPPING coupons, COD/VNPAY snapshot và retry bằng quy trình nghiệm thu an toàn của PO; không thực hiện thanh toán thật trong phiên agent.

## 8. RISKS / FINAL CHECKLIST

- Automated kiểm tra luồng mua thật bằng component CTA và HTTP Cart→Preview→Place→Snapshot; pixel/animation/overflow và accessibility trên browser chưa nghiệm thu.
- Cart là estimate không giữ suất, có thể đổi trước Checkout; quantity vượt entitlement hiển thị regular estimate kèm giải thích và dialog lựa chọn tại Checkout. Authority cuối vẫn là transaction phía server.
- Usage rule của Cart batch reuse `activeFlashUsage`, đồng bộ policy hiện tại bằng HTTP regression. Nếu tương lai đổi offer policy phải cập nhật Cart batch cùng resolver.
- Guest được chuyển đăng nhập và giữ URL/variant; không tự tiếp tục mutation sau đăng nhập. Số lượng trước đăng nhập chưa được persist; PO kiểm tra trải nghiệm này trong manual.
- Không chạy full browser/manual suite. Các source/payment/stock/Admin ngoài phạm vi được bảo toàn theo hash, không chỉ dựa vào báo cáo Phase.
- Chưa commit/push.

**FINAL: DONE (AUTOMATED); manual/visual acceptance NOT RUN.**

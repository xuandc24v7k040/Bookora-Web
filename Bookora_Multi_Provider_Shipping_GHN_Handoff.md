# BOOKORA — MULTI-PROVIDER SHIPPING & GHN INTEGRATION — DONE (VERIFIED)

<!-- GHN_POST_ACCEPTANCE_CLEANUP_START -->
## Product Owner nghiệm thu & cleanup — 26-11-2026

Product Owner đã manual test và chấp nhận **DONE (VERIFIED)**. Cleanup chỉ chuyển artifacts QA ra ngoài hai repository; toàn bộ nội dung VERIFY/lịch sử bên dưới được giữ nguyên.

- Archive: [Bookora_GHN_QA_20261126.zip](D:/CTU/CT466E/bookora-ghn-archives/ghn-post-acceptance-20261126-145120/Bookora_GHN_QA_20261126.zip); cùng thư mục có MANIFEST.json, cleanup-audit.json và deletion-verification.json. **97 file** được xác minh CRC, kích thước và SHA-256 từng file, quét credential cấu hình/session QA trước khi xóa; không đưa .env/private state/cookies/payment URLs vào archive.
- Đã archive/xóa khỏi repo: Web test/evidence/ghn-preflight-20261126/ (2 file), test/evidence/ghn-recovery-20261126/ (92 file); BE test/ghn-qa-environment.ts, test/ghn-qa-fixtures.ts, test/ghn-qa-server.ts (chỉ standalone QA, không có consumer production/test suite/CI/package script).
- Giữ nguyên byte toàn bộ production source, automated unit/component/regression tests chính thức, generated OpenAPI/Orval/Zod, env examples và artifacts phase khác. Không sửa nghiệp vụ, không thao tác database, không commit/push/git clean.
- References evidence/helper trong phần VERIFY cũ là references lịch sử: đường dẫn Web tương ứng ở web/test/evidence/... trong ZIP; ba helper BE ở api/test/.... Không còn executable reference trong hai repo; không chạy các lệnh QA lịch sử trực tiếp từ checkout đã cleanup.
- Kiểm tra cleanup: typecheck + build **cả hai repo PASS**; API targeted **23 suites/227 tests PASS**; Web targeted **11 files/45 tests PASS**; references, git status và git diff --check PASS. Web build còn cảnh báo chunk lớn hiện hữu. Snapshot audit xác nhận chỉ 97 file trên bị xóa và đoạn Handoff này được thêm; các file khác không đổi.
<!-- GHN_POST_ACCEPTANCE_CLEANUP_END -->


Ngày hoàn tất: **26-11-2026, Asia/Saigon**. Recovery tiếp nối cùng mini phase; đọc cùng Master Prompt và G0 Recovery Continuation. **G0 core, implementation BE/FE, financial parity, contract, PostgreSQL/runtime, M01–M32, RV01–RV10 và performance đã được xác minh.** Không còn blocker bắt buộc. Lịch sử attempt đầu ở cuối file được giữ nguyên, bao gồm FAIL/BLOCKED; không cộng test count lịch sử vào kết quả mới.

## 1. Phạm vi, baseline và quyết định đã khóa

| Repo | Checkout / HEAD không đổi | Baseline owner giữ nguyên |
|---|---|---|
| API | `D:/CTU/CT466E/bookora-api/bookora-api`, `master`, `c296e410d8d2c6e9b29369da8e69bf6dfe43939b` | `AGENTS.md`, `CLAUDE.md` dirty trước task, mỗi file 1 insertion/1 deletion |
| Web | `D:/CTU/CT466E/bookora-web/bookora-web`, `master`, `320f6eb9717b5bc0e73042e0986ac7c921fb402c` | Hai instruction files như trên; handoff và evidence attempt đầu |

Không git add/commit/push/pull/reset/restore/rebase/clean; không đổi package/lockfile hoặc credential thật. Không sửa địa chỉ Branch owner, shop GHN, `.env`/`.env.production`. Không migration/backfill production: JSON `shippingFeeBreakdownSnapshot`, `shippingQuoteReference`, nullable `estimatedDeliveryAt` hiện có đã biểu diễn đủ snapshot. DB owner đã xác minh 34 migrations up to date; không DDL trong DB owner.

QA sử dụng **database riêng `bookora_ghn_qa_1795661455049`**, migrate deploy 34 migrations; copy ba branch hiện hành làm fixture, synthetic customer/foreign customer/admin, catalog/coupon/Flash Sale/GOLD. Không drop/reset/truncate DB. API QA `127.0.0.1:18000`, control test-only `127.0.0.1:18001`, Web QA `15173`; API owner `8000` không bị dừng. Playwright cài ngoài repo trong TEMP, dùng Microsoft Edge thật; không thêm dependency ứng dụng. Process override chỉ cho QA: DB, frontend/CORS, Turnstile/mail test, auth test throttle, VNPay return/frontend result URL. **Không tăng checkout throttle**; các harness chờ cửa sổ rate limit khi cần.

Mọi app Preview dùng duy nhất configured Token/ShopId, explicit `from_*` từ canonical owned `cart.branch`, không phải frontend/default shop. Saved Address và GPS/VietMap/proof cùng hội tụ resolver. INTERNAL mặc định; lỗi/loading/unsupported của GHN không chặn INTERNAL. GHN đã chọn lỗi/hết hạn thì giữ intent, chặn submit, cho retry hoặc khách chủ động đổi provider. Chỉ selected fee đi vào canonical money/coupon pipeline.

## 2. G0 recovery và operational facts

Evidence: `test/evidence/ghn-recovery-20261126/live-ghn-recovery.json` (**23 requests, 17 Preview**), `payment-limit-diagnostics.json`, `cod-declared-diagnostics.json`. Đây là fresh live GHN; các negative có chủ đích giữ nguyên HTTP/error thật.

| Recovery | Kết quả thực tế |
|---|---|
| V3 master | 34 provinces; wards Cần Thơ/TP.HCM/Hà Nội đúng parent, active. Invalid province HTTP/body 200 nhưng data=null; app fail closed. |
| Read-Shop mới | Shop active, new-address metadata persisted và đủ; không lưu/in địa chỉ riêng hoặc ShopId. Default-origin control Preview PASS 31.501đ. Control chỉ ở G0 harness, không có trong production adapter. |
| A Cần Thơ → TP.HCM | 31.501đ, ETA `2026-11-27T16:59:59Z`, safe route indicator `4-G-73-A6`. |
| B TP.HCM → TP.HCM | 21.001đ, cùng ETA, `2x4-G-73-A6`; A lặp lại 31.501đ. |
| C Hà Nội → TP.HCM | 34.000đ, ETA `2026-11-28T16:59:59Z`, `4x4-G-73-A6`. Hà Nội → Hà Nội 21.001đ. |
| Origin proof | A/B/A/C cùng invariant input fingerprint, cùng credentials, chỉ đổi actual branch origin. Invalid explicit origin HTTP 400. Kết hợp docs override from_*, repeated controlled comparison, response signals và negative; không suy luận vị trí chỉ từ sort_code/fee. |
| Hà Nội hiện hành | Read-only owner DB xác minh record mới Kim Liên/address có số nhà; actual runtime dùng record copy, không hardcode trong adapter. Không kết luận GPS là nguyên nhân sửa conflict cũ: owner đồng thời đổi ward/street. |
| COD/declared account limits | COD 300.000đ PASS; 331.501đ bị `COD_IS_OVER_LIMIT` (account limit 300.000đ). Insurance 500.000đ PASS; 3.000.000đ bị `PRICE_DECLARE_OVER_LIMIT` (account limit 500.000đ). Đổi order_value/insurance không né được COD limit. App trả GHN unavailable; không clamp hoặc khai COD giả 0. |
| Quote-only safety | Success có order_code rỗng. Zero GHN shipment mutation. Production client chỉ allowlist V3 master + v2 Preview, không Read-Shop/Create/Update/Cancel. |

Các fee trên là **observations theo input/thời điểm**, không phải constants trong source. Runtime hai sách 900g/kiện khác G0 1.000g: Cần Thơ 34.001đ, TP.HCM 21.001đ, Hà Nội 39.000đ; request/branch match trong `final-ui.json` và `runtime-trace.json`. Trace mới so sánh thật cả Token và ShopId với configured values rồi chỉ lưu boolean. `runtime-trace-stage1.json` giữ nguyên checkpoint đầu; boolean cũ chỉ kiểm tra header có mặt, không dùng riêng nó để chứng minh cùng credential values.

Tài liệu đã đối chiếu: [GHN overview](https://developer.ghn.vn/vi/docs/getting-started/overview), [Province V3](https://developer.ghn.vn/vi/docs/master-data/get-province-new), [Ward V3](https://developer.ghn.vn/vi/docs/master-data/get-ward-new), [Read Shop](https://developer.ghn.vn/vi/docs/shop/get-shop), [Preview](https://developer.ghn.vn/vi/docs/order/preview), [Create specification — chỉ đọc](https://developer.ghn.vn/vi/docs/order/create).

## 3. Source audit đã hoàn tất — FOUND → KEEP → TEST

| Audit | Source / quyết định / validation |
|---|---|
| S01–S03 | `shipping/shipping-pricing.service.ts`, policy calculators/resolver/factory giữ nguyên. Packaging, gross/chargeable rounding, province/type/route, quote fingerprint và fee không đổi; **Final built calculator replay 9 positives +1 weight rejection** exact breakdown/fingerprint/error parity với historical inputs (`calculator-after.json`), protected shipping tests và12 canonical before/after thực tế. |
| A01–A03 | `checkout.repository.ts`, `resolveAddress`, location proof/VietMap hiện có giữ ownership/proof. Resolver GHN chỉ structured names/street; không yêu cầu hoặc gửi GPS. Real saved/add/edit/GPS/deny/equivalence, foreign address 404, missing origin và branch mismatch đã chạy. |
| P01 | `storefront-price.service.ts`, `flash-sale-offers.service.ts`, existing cart/Buy Now giữ nguyên. Canonical eligible price/subtotal lấy trước GHN. Actual Flash buy-now 60.000đ, catalog sale 80.000đ, quota/allocations/release kiểm tra DB. |
| P02 | `coupons.service.ts`, `coupon-pricing.ts`, reservations và Membership giữ nguyên. Extract đúng công thức cũ sang `checkout-amounts.ts`; canonical selected fee là input cho resolve/reserve/assert; không duplicate rules hoặc largest-remainder allocation. Fixed/%/cap/free/stack/GOLD/invalid/ineligible/expired đã kiểm tra. |
| P03 | Preview hash giữ INTERNAL input như cũ. GHN dùng material hash (context/fee/ETA ngày VN/parcel/COD/value) thay timestamps/nonce. HMAC ref scoped principal/cart/branch/items/address/payment/config. Revalidate transaction mở rộng cho GHN cả khi không coupon/Flash. Live in-flight SQL quantity/branch changes → 409, không order/stock/coupon/allocation mutation. |
| P04 | COD/VNPay/payment/retry/IPN/cancel/inventory services không sửa. External GHN hoàn tất trước Serializable transaction; canonical fee snapshot dùng cho cả hai payment methods. Actual bốn combinations; real sandbox paid cả hai; retry dưới disabled/500 không gọi GHN; signed callback idempotency và release kiểm tra DB. |
| P05 | Existing Order JSON/ref/ETA đủ; provider resolver GHN iff snapshot.provider='GHN', legacy INTERNAL. Customer/Admin DTO/mapping thêm read projection, không backfill/refresh lịch sử. Admin UI và legacy/no fabricated ETA đã chạy. |
| F01–F02 | Giữ page hierarchy/address/coupon/payment/CTA. Typed generated API wrapper; independent quote composable + shadcn RadioGroup/cards. Fix initial branch bootstrap race và áp owned default saved address khi context sẵn sàng. Abort/sequence/context/account/expiry, canonical card reconciliation sau conflict. |
| X01–X02 | 5 env keys + ba examples; source-driven OpenAPI → Orval/Zod. No library/schema migration. Typecheck/lint/build/contracts/full suites PASS; owner changes được giữ. |

## 4. Architecture và contract thực tế

- **Config:** `GHN_ENABLED`, `GHN_BASE_URL`, `GHN_TOKEN`, `GHN_SHOP_ID`, `GHN_TIMEOUT_MS`. Ba example `.env.example`, `.env.production.example`, `.env.test.example` disabled + placeholders. Strict boolean flag; enabled invalid credential/ShopId/host/timeout trở thành GHN invalid, không làm INTERNAL chết. HTTPS official production/dev hosts only, không port/path/query/hash/credentials, redirect error; timeout 100–15.000ms, default 5.000ms. Invalid boolean bị env validator từ chối như convention hiện có. Credentials chỉ BE.
- **Client:** typed runtime validation HTTP + body code/data, integer nonnegative total_fee, valid ISO ETA, fee components integer, order_code phải ''. total_fee dùng đúng một lần. Localized error codes; không expose raw body/headers/PII/fetch URL.
- **Address:** NFC/case/whitespace/province-prefix normalization, giữ dấu và loại ward; exact canonical trước unique aliases, ward lookup trong matched parent/active. Missing/inactive/ambiguous/data-null/malformed fail closed. Master cache 24h, max64, single-flight, không cache lỗi thành danh mục rỗng.
- **Parcel:** gross grams từ calculator hiện hữu; không dùng INTERNAL rounded chargeable grams. GHN service2 cho <20kg; không phát minh service5/multi-parcel. Estimates cm theo existing package kinds: 28×20×5, 28×22×12, 30×24×20, 35×27×28, 40×30×35. Catalog có cả 2D và 3D text; parser chỉ tin numeric cm rõ ràng, làm tròn lên và kiểm tra lower bounds/known stack height so với outer estimate. Sách đo được không vừa thì GHN unavailable, không underdeclare. Missing thickness không tự bịa; không bắt variant nhập thêm fields hoặc migrate hàng loạt. **Outer carton estimates chưa đo vật lý** — đây là limitation vận hành đã cho phép trong prompt.
- **Payment inputs:** payer1 shop, note `KHONGCHOXEMHANG`, insurance/order_value=canonical merchandise subtotal. VNPay/prepaid COD0. COD khởi đầu bằng canonical net merchandise (không lấy INTERNAL fee làm seed gây false account-limit rejection), sau đó dùng chính canonical coupon/formula với GHN fee cho tới cod_amount bằng final total, tối đa3 Preview trong total upstream timeout budget; không hội tụ thì unavailable. Không gửi Bookora voucher cho GHN.
- **Cache/ref:** preview TTL60s, bounded256, single-flight, no failure/stale fallback. Fee cache theo account scope/user/branch/normalized explicit payload; signed reference còn bind cart/item-price/receiver/context. Public reference payload chỉ hashes/expiry/nonce; cache không chia sẻ user reference/PII. VN date material comparison; equivalent timestamp refresh không tạo false money conflict. Upstream không cung cấp quote validity riêng.
- **Endpoint:** JWT+CSRF+customer/branch-owned canonical context, `POST /api/v1/checkout/shipping/ghn-quote`, operationId `checkoutGhnShippingQuote`, throttle30/min. Body reuse PreviewCheckoutDto (selected items/address/payment/coupon); response `{enabled, quote, unavailableCode, message}`. Preview/place thêm optional strict enum `shippingProvider` (omit→INTERNAL; null/unknown→400), bounded `shippingQuoteReference`. FE chỉ nhận safe fee/ETA/ref/expiry; không Token/ShopId/GHN master IDs. Existing internal quote shape không bị giả lập cho GHN: separate `internalShippingQuote`/`ghnShippingQuote` projection.
- **Snapshot:** JSON GHN provider/fee/components/parcel/COD/declared/ref/quotedAt/expiresAt/material/context hashes; existing ETA lưu UTC. Retry/history đọc snapshot, không GHN fetch hoặc recalc giá. Legacy JSON không provider được đọc INTERNAL; null ETA tiếp tục null.
- **Web:** INTERNAL quote/CTA không await unselected GHN. Independent Skeleton/error/retry; signed context + abort + request sequence chống late response. Expiry xóa quote, giữ selected intent và chặn GHN CTA. Preview conflict làm card fee/ETA khớp canonical totals, cần khách bấm lại. Note/UI unrelated không làm carrier refetch; prepaid coupon không đổi fee payload, cache reuse. Customer/Admin đọc snapshot.

## 5. Financial parity và PostgreSQL/payment outcomes

`canonical-before.json` và `canonical-after.json`: **12/12 exact money + item allocation/coupon + INTERNAL breakdown parity**, cùng inputs, chỉ loại quotedAt/expiresAt khi so sánh. Không coi catalog `discountAmount` là khoản được trừ thêm lần hai.

| Case | Subtotal | INTERNAL fee | ORDER | SHIPPING | Total trước = sau |
|---|---:|---:|---:|---:|---:|
| regular | 120000 | 32000 | 0 | 0 | 152000 |
| catalog | 80000 | 32000 | 0 | 0 | 112000 |
| Flash | 60000 | 32000 | 0 | 0 | 92000 |
| catalog + Flash | 140000 | 35000 | 0 | 0 | 175000 |
| ORDER10% | 120000 | 32000 | 12000 | 0 | 140000 |
| fixed SHIPPING | 120000 | 32000 | 0 | 10000 | 142000 |
| SHIPPING50%, cap15k | 120000 | 32000 | 0 | 15000 | 137000 |
| free shipping | 120000 | 32000 | 0 | 32000 | 120000 |
| ORDER + capped SHIPPING | 120000 | 32000 | 12000 | 15000 | 125000 |
| GOLD | 120000 | 32000 | 15000 | 0 | 137000 |
| catalog/Flash + two coupons | 140000 | 35000 | 14000 | 10000 | 151000 |
| VNPay | 120000 | 32000 | 0 | 0 | 152000 |

`order-runtime.json`: actual authenticated AppModule/PostgreSQL created + idempotently repeated + canceled INTERNAL/GHN × COD/VNPay. Same merchandise120k, ORDER12k, SHIPPING10k: INTERNAL32k→total130k; GHN31.501k→129.501k; Payment.amount equals Order.totalAmount. Stock1000→999→1000, coupons released. No fake payment/shipment state.

`payment-ui.json` + `sandbox-paid.json`: actual UI placed INTERNAL VNPay152.000đ / GHN151.501đ, real redirect to `sandbox.vnpayment.vn`; completed official **NCB sandbox test card + OTP** for both. Real provider-signed Return code/status00→PAID, order PENDING; replay same genuine signed callback through QA IPN twice→00/idempotent. Return targets QA18000, frontend QA15173; no callback sent to owner API. This proves real sandbox Return; it is **not** a claim that VNPay's server reached a public localhost IPN URL. [Official test card](https://sandbox.vnpayment.vn/apis/docs/gioi-thieu/).

`retry-negative-runtime.json`: both providers retry201 with persisted fee/amount/ETA under GHN disabled and injected500; **zero GHN calls**. Separately labeled signed QA failure callback fixtures drive retry/release, repeated failure does not double-restock. These fixtures are not presented as real gateway successes.

`flash-cancel-ui.json`: actual product Flash Buy Now→single selected line60k→GHN31.501k→ORDER6k + SHIPPING10k→total75.501k→COD success→customer UI cancel. Flash and two coupon allocations CONSUMED→RELEASED; stock1000 restored, GOLD/lifetimeSpend unchanged; creation/cancellation notification intents persisted, customer order UI updated. `race-runtime.json`: mutate QA cart quantity and branch street **while real GHN Preview is in flight**, tx rejects409 with no order/stock/coupon/allocation mutation; fixtures restored.

An early QA SQL observer treated PostgreSQL timestamp-without-time-zone as host-local and displayed shifted ETA; corrected observer uses `::text` plus actual Prisma/customer ISO equality. Persisted ETA/product code was correct throughout; no timezone DB workaround applied.

## 6. Actual browser acceptance M01–M32

All browser results use actual local Web/API/PostgreSQL and Edge/Playwright. Positive GHN requests are live. Error/slow/fee/ETA injections are explicitly identified; component mocks do not replace runtime evidence.

| Case | Verdict / evidence |
|---|---|
| M01 | PASS — real `checkout-before-1440.png`, `checkout-after-internal-1440.png`, `checkout-after-ghn-1440.png`; existing hierarchy/address/summary/coupon/payment/CTA retained. No mobile-before image was captured; after covers all required widths. |
| M02 | PASS — owned default saved address auto applied, INTERNAL selected, legacy fee/route/weight; independent real GHN fee/ETA (`ui-initial.json`). |
| M03 | PASS — alternate saved address→fresh canonical/internal and GHN quotes; no extra GPS (`ui-initial.json`). |
| M04 | PASS — actual account Address UI add/edit/select; fresh street quoted (`address-branch-ui.json`, `saved-added-edited.png`). |
| M05 | PASS — browser sensor coordinates at public QA landmark→real VietMap→confirm/proof→GHN; no unconfirmed address quote (`gps-confirmed.png`). |
| M06 | PASS — CDP denied GPS, localized message, valid saved address works (`address-branch-ui.json`). |
| M07 | PASS — same synthetic GPS/VietMap confirmed destination saved through existing owned-address API, selected via UI; same receiver/structured destination/fee/ETA (`final-ui.json`). |
| M08 | PASS — actual header branch switch HCM/Hà Nội/Cần Thơ, await matching new response and canonical branch, outgoing explicit origin with same configured credentials (`final-ui.json`, `runtime-trace.json`). |
| M09 | PASS — actual cart quantity + selected checkbox lines, 2 books gross900g/internal chargeable1000g; Flash actual Buy Now one eligible line (`final-ui.json`, `flash-cancel-ui.json`). |
| M10 | PASS — whole-card/radio GHN↔INTERNAL, no address reentry, canonical totals and coupon state (`ui-initial.json`, `coupon-ui.json`). |
| M11 | PASS — displayed fee matches live total_fee, ETA VN date, order_code empty; trace/source guards (`runtime-trace*.json`, screenshots, date tests). |
| M12 | PASS — actual coupon dialog apply/remove ORDER, prices/allocation preserved across providers; invalid voucher rejected (`coupon-ui.json`, parity JSON). |
| M13 | PASS — fixed/%/cap/free/stack on selected fee; no double/negative discount (`coupon-ui.json`, `order-runtime.json`, `flash-cancel-ui.json`, canonical matrix). |
| M14 | PASS — catalog80k/Flash60k/GOLD/free shipping, same merchandise after switch; invalid, membership-ineligible and expired coupon rejected (`coupon-ui.json`, `coupon-negative-ui.json`). |
| M15 | PASS — INTERNAL COD actual UI under delayed GHN + DB creation/cancel (`faults-ui.json`, `order-runtime.json`). |
| M16 | PASS — actual GHN COD UI success/customer snapshot, selected amount/ETA; no shipment (`payment-ui.json`, `flash-cancel-ui.json`). |
| M17 | PASS — INTERNAL VNPay real sandbox success, canonical amount/DB; retry tested (`sandbox-paid.json`, `retry-negative-runtime.json`). |
| M18 | PASS — GHN VNPay real sandbox success, amount/ETA persisted, no shipment (same evidence). |
| M19 | PASS — retry while GHN disabled/500, snapshot invariant, no GHN/history requests; authentic successful callback replay plus labeled failure fixtures (same evidence). |
| M20 | PASS — actual60s expiry keeps GHN selected and blocks CTA; retry fresh; injected fee/ETA date change rejects409 before create, updates card+canonical total, requires explicit resubmit (`final-ui.json`, `negative-runtime.json`). |
| M21 | PASS — controlled6s carrier delay with5s timeout: INTERNAL ready3980ms and actual order placed4187ms while GHN not done (`faults-ui.json`); timings include cold Web load. |
| M22 | PASS — injected timeout/500/429/malformed/no-route localizes/disables only GHN; live retry succeeds, stay checkout (`faults-ui.json`). |
| M23 | PASS — selected GHN failure retains intent, blocked CTA, explicit INTERNAL recovery; rejected place no mutations (`selected-failure-ui.json`, negative/race JSON). |
| M24 | PASS — delayed real response A discarded after UI destination B; actual branch/quantity/payment changes; DB in-flight races rejected (`selected-failure-ui.json`, `final-ui.json`, `race-runtime.json`). |
| M25 | PASS — QA process flagfalse hides GHN, zero new GHN calls, legacy INTERNAL works; owner env unchanged (`selected-failure-ui.json`, `negative-runtime.json`). |
| M26 | PASS — missing origin / actual measured oversize only GHN unavailable; INTERNAL still can place, no forced GPS (`negative-runtime.json`, `retry-negative-runtime.json`). |
| M27 | PASS — customer and authorized Admin UI read provider/ETA; existing INTERNAL JSON displays INTERNAL/no invented ETA; history causes no GHN calls (`admin-read-ui.json`, screenshots, order-runtime). |
| M28 | PASS — actual customer UI cancel restores stock and releases coupon/Flash hold/consumption, membership unchanged, status/notification intents correct (`flash-cancel-ui.json`). |
| M29 | PASS — actual shadcn controls, green/pointer/keyboard Arrow+Space, focus/disabled/retry no accidental selection; component tests and browser (`ui-initial.json`). |
| M30 | PASS — 1366×768/1440×900/1920×1080/768×1024/390×844/320×568, no overflow, readable wraps. Mobile saved-address/CTA scroll+hit tests fully reachable without chat covering centered controls (`ui-initial.json`, `session-mobile-ui.json`, six screenshots). Existing global support placement unchanged. |
| M31 | PASS — zero pageerrors in completed browser harnesses; actual logout→protected checkout login→foreign account fresh quote context. Existing foreign address404/principal ref422; no credential literals in Web (`session-mobile-ui.json`, retry-negative, final safety scan). |
| M32 | PASS — coupon dialog, support open/close, notification popover/list with order/payment entries, actual order update/cancel/navigation usable (`final-ui.json`, `session-mobile-ui.json`, flash cancel). |

Observed dev console warnings: unchanged `CartSidebar` passes class to fragment-root `BranchSelector`; API emitted a pg client concurrent-query deprecation notice. Completed harnesses had zero pageerrors; these warnings are recorded rather than claimed absent or patched outside scope.

### Supplemental recovery RV01–RV10

| Cases | Verdict / evidence |
|---|---|
| RV01–RV02 | PASS — fresh Read-Shop/default control and A/B/A/Hà Nội/invalid-origin in live recovery; app path explicit-only. |
| RV03 | PASS — three actual UI branches and matching BE origin/header credential equality (`final-ui.json`, current trace). |
| RV04 | PASS — test-owned branch street change invalidates ref422; live in-flight branch change rejects409 (`negative-runtime.json`, `race-runtime.json`). |
| RV05 | PASS — branch/saved no coordinates still quote; real GPS proof + equivalent saved address (`negative-runtime.json`, `final-ui.json`). |
| RV06 | PASS — missing/ambiguous/inactive mapping unit tests; actual missing-origin/oversize and injected malformed/conflict/timeout isolation (fault/negative JSON). |
| RV07 | PASS — selected expiry/error/material change/race retains intent and rejects before mutation, explicit INTERNAL recovery (M20/M23/race evidence). |
| RV08 | PASS — realistic final COD/prepaid fields, all four combinations, exact selected fee/coupon/payment snapshots; convergence bounded, no waybill or production charge. |
| RV09 | PASS — examples/strict config tests and actual flagfalse zero new calls; invalid upstream settings isolated. |
| RV10 | PASS — calculator/protected/full tests, 12 exact canonical before/after, regenerated contract, legacy/history/retry/cancel/release outcomes. |

## 7. Performance, quality commands và limitations của evidence

- Original same-input authenticated INTERNAL before n20: P50 **17.624ms**, P95 **54.816ms**; first after under concurrent test/build CPU: P50 **49.246ms**, P95 **191.625ms**. Both retained in canonical JSON; không xóa mẫu chậm.
- Quiet later n20: P50 **26.601ms**, P95 **70.400ms**, zero GHN calls (`internal-performance-quiet.json`). QA catalog visibility metadata later added for Buy Now; absolute samples across stages are not a controlled benchmark of source alone.
- A paired diagnostic overlapped browser startup/archive: enabled P95 **862.819ms**; retained with interference note (`internal-performance-paired.json`), not used as isolated verdict.
- **Isolated alternating flag control**, no browser/build/test/lint: 2 warmups +12 matched pairs, INTERNAL always152.000đ. Disabled P50 **31.852ms** / P95 **94.385ms**; enabled P50 **31.390ms** / P95 **56.585ms**; **zero new GHN calls** (`internal-performance-paired-isolated.json`). No consistent added GHN latency on INTERNAL; source has no GHN await there. Controlled slow-upstream actual INTERNAL order before GHN completes proves UI/submit independence. This is local/dev verification, not a production load/SLA claim.

Actual commands below all exit0 unless noted; reruns/historic counts not added together:

| Command / scope | Kết quả |
|---|---|
| API `rtk proxy npm test -- --runInBand` | **121 suites / 997 tests PASS**, latest full suite includes new GHN client/config/resolver/parcel/cache/ref/COD/date tests. |
| API protected targeted shipping/checkout/coupons/payments/Flash/membership/orders/GHN | Earlier post-change22 suites/222 PASS; later standalone resolver5 PASS, then authoritative full suite above. |
| API `rtk proxy npm run type-check` | PASS, including final QA fixture changes. `npm run typecheck` was an initial wrong script name and failed; corrected actual command is type-check. |
| API `rtk proxy npm run lint` | PASS; final QA fixture additionally targeted `rtk proxy npx eslint test/ghn-qa-fixtures.ts --fix` PASS. |
| API `rtk proxy npm run build` | PASS, SWC583 files. |
| API `rtk proxy npm run docs:check` | Export + contract **251 operations/312 schemas** + Redocly valid; 2 existing explicitly ignored findings. |
| Web `rtk proxy npm test -- --reporter=dot --maxWorkers=1` | **231 files / 1183 tests PASS** (full suite); final GHN targeted5 files/22 PASS after quote acceptance reconciliation. |
| Web `rtk proxy npm run build` | Final vue-tsc + Vite PASS,6527 modules. Existing >500kB chunk warnings retained; no new library. |
| Generated pipeline | API docs:openapi/docs:contract/docs:lint; Web runtime18000 OpenAPI sync (prefix normalized), gen:api via Orval + repository fix scripts, no manual generated edits. Latest canonical API JSON = Web JSON exactly. |
| Web `rtk proxy npm run verify:generated-zod` | PASS,39 files,282 zod.ulid(),0 forbidden. No Web lint script exists. |
| Git whitespace | `rtk proxy git diff --check` both PASS; example trailing blank lines fixed. CRLF conversion warnings are Git platform notices. |
| GitNexus | impact before existing symbol edits; all/compare master detect_changes: API42 changed indexed symbols,17 affected flows/16 tracked files; Web29/24/18; **CRITICAL**, expected checkout/payment blast radius. New GHN symbols UNKNOWN (not yet indexed); source/callers reviewed manually, no arbitrary reindex. |

Browser harness corrections are not hidden: early tests hit wrong/duplicate selectors, inspected Admin's actual “Khách & giao hàng” tab, and initially assumed a cumulative trace count reset. These were harness failures, corrected and rerun. QA catalog initially lacked public category/primary image and had stale synthetic ward codes; completed **QA-only** catalog/validated administrative fixture, no storefront/address business changes. API checkout429 encountered from overlapping harnesses; waited normal window, no limit bypass. Expired-coupon QA SQL initially used DB-local now() against UTC timestamp storage, leaving it future-dated; corrected test-only UTC expression and reran: COUPON_EXPIRED409, BRONZE→GOLD voucher COUPON_MEMBERSHIP_TIER409. Coupon restored in finally; no product logic changed. Early ETA observer correction described above.

Evidence writes initially caused Vite dev reload during 60s expiry wait, resetting the page to default INTERNAL. Traced actual navigation/requests, isolated QA Vite watcher with `ignored: ['**/test/evidence/**']` (TEMP QA launcher only), then reran expiry with no reload: GHN remained selected, CTA blocked, retry/material conflicts PASS. No product workaround or global Vite config edit.

## 8. Changed files và lý do

**API:**

- `src/config/ghn.config.ts` + spec, `env.keys.ts`, `index.ts`, three env examples: safe feature configuration and account-scoped cache identity.
- `src/modules/integrations/ghn/{ghn.client,ghn-address.resolver,ghn-quote.service,ghn-parcel,ghn.error,ghn.types,ghn.module}.ts` + relevant specs: allowlisted wire integration, strict mappings/parcel/cache/HMAC/COD/typed failures.
- `src/modules/shipping/shipping-provider.ts`: additive provider enum only; internal policy files untouched.
- `checkout/checkout-amounts.ts`, `dto/ghn-quote.dto.ts`, existing checkout DTO/controller/module/service: exact shared money formula, independent endpoint, selected fee/reference, pretransaction quote and transaction revalidation/snapshot.
- `orders/shipping-provider-snapshot.ts`, customer/admin order service/DTO: persisted provider/ETA read, legacy compatibility.
- `docs/openapi.json`: generated from source.
- `test/ghn-qa-{environment,fixtures,server}.ts`: isolated QA DB/process overrides/real AppModule and labeled fault trace/control, never imported by app production path.

**Web:**

- `src/features/checkout/api/checkout-api.ts`: typed independent quote wrapper.
- `features/checkout/components/CheckoutShippingOptions.vue` + test: scoped shared primitive radio cards/green/ETA/error/retry.
- `features/checkout/composables/use-ghn-shipping-quote.ts` + test; `utils/shipping-eta.ts` + test: independent abort/expiry/context state and VN date.
- `src/pages/app/checkout/CheckoutPage.vue`: canonical provider/ref/totals binding, retained intent, default saved address/branch bootstrap; two existing source contract tests updated to inspect new shipping component instead of removed inline markup.
- `AccountOrderDetailPage.vue`, `AdminOrderDetailPage.vue`: snapshot display.
- `openapi/bookora.openapi.json`, generated checkout client/models/enums/Zod/index: pipeline outputs.
- This existing handoff; `test/evidence/ghn-recovery-20261126/`: sanitized JSON/screenshots and archived verification harness. Historical `ghn-preflight-20261126/` untouched. Some generated files appear dirty from line endings with empty content diff; numstat reviewed.

Protected production catalog/coupon/Flash/Membership/payment/realtime/support/inventory/report logic, pricing calculator files, schema/migrations and package/lockfiles did not change. No Admin GHN configuration, per-branch ShopId, generic provider framework or physical shipping dispatch.

## 9. Reproduction, safety và cleanup

QA private credentials/browser cookies/payment URLs stay only in TEMP, not evidence/source/handoff. `test/ghn-qa-environment.ts` refuses a DB name outside `/bookora_ghn_qa_`; fixture setup must target a **new empty isolated QA DB** after migrate deploy, not owner DB. Read the scripts before rerunning: some create/cancel QA orders and test-owned records; do not execute an entire legacy e2e suite with DROP helpers.

Actual runtime command: API `rtk proxy node -r ts-node/register -r tsconfig-paths/register test/ghn-qa-server.ts`; Web TEMP `bookora-ghn-browser/vite-qa.mjs` (run from Web cwd). Actual browser commands used `rtk proxy node C:/Users/Admin/AppData/Local/Temp/bookora-ghn-browser/<harness>.cjs`. Sanitized copies in `test/evidence/ghn-recovery-20261126/harness/`; CommonJS copies require Playwright from the TEMP installation via module lookup/NODE_PATH, not a new app dependency. Baseline files represent their original pre-edit run; recreated cart-item IDs after actual COD are explicitly handled in later helpers.

Cleanup thực tế (`cleanup.json`): hủy thêm **4 đơn QA chưa thanh toán** bằng existing customer flow; tổng QA DB giữ16 CANCELLED +2 PENDING/PAID từ hai sandbox payments thành công để review snapshot. Không refund/cancel hai đơn PAID, không xóa record. Coupon/Flash **RESERVED=0**; stock Cần Thơ: Flash1000, sale1000, regular998 (hai đơn sandbox PAID đã mua mỗi đơn1). Các fixture mutation quantity/street/coordinates/ward/packageSize/coupon endAt được restore; saved QA addresses/catalog/category/image và cart test-owned giữ trong DB riêng. Owner DB không bị ghi bởi harness. QA flag/fault về live/enabled trước khi **đóng cả API18000/control18001 và Vite15173** qua stdin stop; kiểm tra port chỉ còn owner API8000 và GET docs HTTP200. Không kill process owner. Private TEMP fixture credentials còn để owner có thể tái chạy QA; không được đưa các private files/cookies/payment URLs vào git hoặc evidence.

Current functional limitations are intentional scope: **quote-only, no GHN shipment booking**, account-specific COD/insurance limits, estimated outer parcel sizes pending physical measurements, unsupported ambiguous/oversize/multi-parcel routes unavailable instead of fake fee. Fee/ETA can change and require reconfirmation. Production deployment/load testing and owner product acceptance are outside this local implementation; no production charge, shipment mutation or git write occurred.

---


## Historical attempt — trước owner recovery (giữ nguyên)

## 1. Status, scope và baseline

**PENDING — G0 live feasibility BLOCKED. Chưa triển khai GHN vào ứng dụng.**

Ngày xác minh: **26-11-2026, Asia/Saigon**. Đã đọc prompt được giao và ảnh checkout đính kèm. Áp dụng gate tại mục I.1.4: **“Chỉ tiếp tục implementation GHN khi G0 PASS.”** Control bắt buộc dùng origin mặc định shop thất bại hai lần. Không bỏ qua gate chỉ vì hai explicit origins báo giá thành công.

| Repo | Working tree thực tế | HEAD / branch | Dirty baseline được bảo toàn |
|---|---|---|---|
| API | `D:/CTU/CT466E/bookora-api/bookora-api` | `c296e410d8d2c6e9b29369da8e69bf6dfe43939b` / `master` | `M AGENTS.md`, `M CLAUDE.md`; 2 insertions / 2 deletions |
| Web | `D:/CTU/CT466E/bookora-web/bookora-web` | `320f6eb9717b5bc0e73042e0986ac7c921fb402c` / `master` | `M AGENTS.md`, `M CLAUDE.md`; 2 insertions / 2 deletions |

GitNexus index HEAD khớp cả hai repo (indexed 25-11-2026); không reindex. Đã đọc instructions, README, scripts/package manifests và xác nhận cả hai lockfile version 3. Đã tham khảo các handoff Checkout/Orders, Coupon/VNPay, Flash Sale, Membership, Auth và Support; kết quả lịch sử không được tính vào kiểm thử lần này.

Deliverables thực hiện: kiểm tra GHN live không tạo shipment, audit các điểm tích hợp trọng yếu, baseline calculator và test hiện hành, xác nhận DB/migrations và API runtime, handoff này cùng JSON evidence đã loại thông tin bí mật. Adapter, config, contracts, snapshot và UI integration đều **chưa thực hiện**, do gate trước implementation không đạt.

## 2. Blocker GHN và bằng chứng live

Evidence: [`test/evidence/ghn-preflight-20261126/live-ghn.json`](test/evidence/ghn-preflight-20261126/live-ghn.json). Đây là bản ghi sanitized từ các response đã quan sát qua công cụ; không phải raw HTTP capture hoặc bộ test replay tự động.

Config local BE: `GHN_ENABLED=true`; `GHN_BASE_URL` có host `online-gateway.ghn.vn`; Token có mặt, ShopId dạng số hợp lệ, timeout dạng số. Không thay cấu hình hoặc môi trường. Mọi request hợp lệ dùng cùng một Token/ShopId, không xuất giá trị vào tài liệu/evidence. Tài khoản được cấu hình là production GHN; các lời gọi chỉ đọc/Preview.

Đã đọc trực tiếp tài liệu chính thức:

- [Overview](https://developer.ghn.vn/vi/docs/getting-started/overview).
- [Province V3](https://developer.ghn.vn/vi/docs/master-data/get-province-new) và [Ward V3](https://developer.ghn.vn/vi/docs/master-data/get-ward-new).
- [Preview](https://developer.ghn.vn/vi/docs/order/preview) và [Create request specification](https://developer.ghn.vn/vi/docs/order/create), chỉ đọc đặc tả Create.
- [Read shop](https://developer.ghn.vn/vi/docs/shop/get-shop), để kiểm tra nguyên nhân control thất bại.

| G0 case | Status | Quan sát thực tế |
|---|---|---|
| G0-01 | PASS cho phạm vi đã gọi | Province HTTP/body 200, 34 tỉnh. Ward Cần Thơ 103, TP.HCM 168, Hà Nội 126, Cà Mau 64; tất cả parent_id đúng province. Các ward chọn có status=1. Province -1 trả HTTP/body 200 nhưng data=null, được nhận diện là invalid; chưa có production resolver để kiểm thử xử lý. |
| G0-02 | **FAIL → BLOCKER** | Không truyền from_*: HTTP 400 / `FROM_ADDRESS_CONVERT_FAIL`, 543 ms. Lặp với `is_new_from_address=true`: cùng lỗi, 322 ms. Không có quote/ETA hợp lệ cho default-shop control. |
| G0-03 | PASS cho request branch A | Cần Thơ / Phường Ninh Kiều → TP.HCM / Phường Sài Gòn: HTTP/body 200, total_fee=31.501đ, 265 ms, order_code rỗng. |
| G0-04 | PASS cho request branch B; gate tổng chưa đạt | Cùng destination/package và credentials, đổi origin sang TP.HCM / Phường Sài Gòn: HTTP/body 200, total_fee=21.001đ, 383 ms, order_code rỗng. |
| G0-05 | PARTIAL / BLOCKED | A/B đổi cả fee và sort_code (`4-G-73-A5` → `2x4-G-73-A5`); lặp A giữ 31.501đ/sort_code cũ (277 ms); invalid province bị từ chối HTTP 400. Origin thứ ba Hà Nội / Phường Hoàn Kiếm trả HTTP 400 / `FROM_ADDRESS_CONFLICT` (210 ms). Chưa có default-shop control thành công hoặc full route proof cho mọi branch. |
| G0-06 | NOT RUN đầy đủ / BLOCKED | Chỉ kiểm tra service 2, payment_type_id=1, cod_amount=0, insurance/order_value=300.000đ, note `KHONGCHOXEMHANG`, kiện 1.000g / 25×20×8cm. Chưa xác minh realistic COD, các giá trị khai giá/thu hộ, limit/service 5, invalid token/no route. Không coi fixture này là production payment/insurance policy. |
| G0-07 | PASS trong phạm vi trace lời gọi | 1 Province + 5 Ward + 7 Preview + 2 read-Shop = **15 calls**. Không gọi Create/Cancel/Update hoặc shipment mutation. Tất cả Preview thành công trả order_code="". Chưa kiểm tra danh sách shipment bằng API read-only riêng. |

Ba Preview thành công cùng trả `expected_delivery_time=2026-11-27T16:59:59Z`. Chưa nghiệm thu formatter/UI theo múi giờ Việt Nam.

Origin A/B/C lấy từ record branch local bằng transaction SQL **READ ONLY**, giữ street/province/ward và chuẩn hóa sang canonical names từ GHN V3; không sửa branch. Destination street/name/phone dùng fixture tổng hợp, không lấy người nhận từ screenshot hoặc dữ liệu khách thật. Hai cờ new-address=true cho các explicit origins, omit district. Phí successful response chỉ có main_service; các fee component còn lại bằng 0.

Read-Shop trả HTTP/body 200, tìm đúng configured ShopId, status active. Nhưng `address`, `ward_code`, `district_id` đều không có giá trị; `is_new_address=false`, `address_v2`, `ward_id_v2`, `province_id_v2` cũng chưa có giá trị. Đây là bằng chứng phù hợp với lỗi default-origin conversion. Không suy diễn rằng toàn bộ lỗi Hà Nội có cùng nguyên nhân; `FROM_ADDRESS_CONFLICT` cần GHN xác nhận riêng.

**Điều kiện tiếp tục:** owner/GHN cần hoàn thiện địa chỉ gửi hợp lệ của shop hiện tại để G0-02 PASS, đồng thời xác minh/khắc phục conflict khi explicit origin Hà Nội. Sau đó chạy lại control, A/B/C, tuyến phân biệt, negatives và G0-06 với cùng một ShopId. Không đổi sang nhiều ShopId, không dùng shop origin thay branch, không sửa dữ liệu branch để né lỗi. Việc đổi hồ sơ shop GHN không được thực hiện trong lượt này.

## 3. PREFLIGHT audit matrix

`API/` và `Web/` dưới đây trỏ tới hai absolute roots ở mục 1. FOUND/KEEP mô tả source đã đọc; PARTIAL/GAP nêu phần còn phải hoàn tất sau khi gate được mở. Đây **chưa phải full preflight/financial audit hoàn tất**.

| ID | Real source / method / route | Finding và minimal plan sau G0 | Blast radius / mandatory verification |
|---|---|---|---|
| S01 | API `src/modules/checkout/checkout.service.ts`: preview, resolveCheckout, placeCod, placeVnpay; `checkout.repository.ts` | FOUND/KEEP canonical resolver. DTO selectedCartItemIds được đối chiếu owned cart, header branch phải khớp cart.branchId. Preview stateless. Cần tái sử dụng cùng context cho quote độc lập. | 3 direct callers của resolveCheckout; preview/COD/VNPay. Ownership, selected lines, branch race, final transaction. |
| S02 | API `src/modules/shipping/shipping-pricing.service.ts`; calculators/resolvers; `shipping-rate-policy.service.ts`; `shipping-quote.factory.ts` | FOUND/KEEP internal policy. Quote hash từ breakdown, TTL hiện tại 24h. Không áp TTL/hash nội bộ này cho GHN một cách máy móc. | Internal golden baseline đã ghi; GHN adapter phải giữ fast path không có external await. |
| S03 | API `src/modules/checkout/product-weight.util.ts`; `shipping/calculators/packaging.calculator.ts`, `chargeable-weight.calculator.ts`; `policies/packaging-policy-v1.ts` | FOUND/KEEP: positive safe integer grams/qty, không fallback weight giả; 5 packaging tiers, gross rồi round lên bước internal. GHN cần gross và dimension policy riêng, chưa chọn production dimensions. | Calculator, product weight, packaging boundaries; missing/oversize, GHN unavailable độc lập. |
| A01 | API `checkout-location-proof.service.ts`, CheckoutService.resolveAddress/currentLocationResponse; Web `src/pages/app/checkout/CheckoutPage.vue`: locateMe, confirmLocation | FOUND/KEEP VietMap reverse và xác nhận; proof HMAC purpose/version/TTL và binding province/ward/coordinates. FE timeout GPS 12s. | Hai nguồn địa chỉ, GPS denied/timeout, invalid/expired/mutated proof, actual browser còn BLOCKED. |
| A02 | API CheckoutRepository.findOwnedAddress, CheckoutService.resolveAddress; Web CheckoutAddressCombobox và useCustomerAddresses | FOUND/KEEP saved address lookup theo userId+id; không đòi GPS/proof. Full add/edit address audit và browser chưa chạy. | Foreign/missing saved address, add/edit/default select, equivalence với GPS. |
| A03 | API `prisma/schema/20-auth-users-branches.models.prisma`, CheckoutRepository.findCart | FOUND Branch province/ward/address/isActive, origin từ cart.branch; DB có Cần Thơ, TP.HCM, Hà Nội. No per-branch ShopId. | Missing/ambiguous address chỉ làm GHN unavailable; actual branch switching chưa test. |
| P01 | API resolveCheckout; `storefront-catalog/storefront-price.service.ts`, `flash-sales/flash-sale-offers.service.ts` | PARTIAL/KEEP resolver dùng price.current, offer.flashPrice và eligibility trước khi sum. Chưa audit toàn bộ quota/call sites/fixtures promo. | Flash Sale/cart/catalog/buy-now financial baseline còn phải mở rộng. |
| P02 | API resolveCheckout; `coupons/coupon-pricing.ts`, `coupons.service.ts` | FOUND canonical coupon input `{userId, subtotal, shippingFee}`; clamp discount và deterministic largest-remainder allocation. Membership/rules/quota full audit còn PARTIAL. | Selected fee chỉ thay input shippingFee; percentage/cap/free ship/stack/tier/reserve/release còn phải runtime verify. |
| P03 | API createPreviewReference, ensureReadyForOrder, revalidateCouponCheckout | FOUND hash gồm prices/items/address/payment/quote breakdown/coupon rule version/tier. Existing transaction revalidation có early return khi không coupon/Flash Sale; cần audit chặt boundary cho GHN, không giả định đã đủ chống TOCTOU. | Expiry/context/fee/ETA-date changes, rejection before reservations, concurrency. |
| P04 | API placeCod/placeVnpay; `payments/payments.service.ts`: retry, callback amount checks | FOUND existing resolve+ready trước Serializable transaction; stock/order/payment/coupon/Flash Sale trong tx. Retry dùng persisted payment/transaction amount. Full payment cancellation/IPN audit còn PARTIAL. | Protected P0; không đổi state machine. Runtime COD/VNPay/cancel/release chưa chạy. |
| P05 | API `prisma/schema/27-orders-payments.models.prisma`, CheckoutService.orderData; `customer-orders/customer-orders.service.ts`, `admin-orders/admin-orders.service.ts` | FOUND fee JSON, quote ref, nullable estimatedDeliveryAt sẵn có; chưa có dedicated shipping-provider field. orderData hiện chưa gán ETA. Admin read đã có estimatedDeliveryAt. Cần chọn additive provider snapshot/read projection sau G0, chưa chốt migration. | Legacy reads/no backfill, selected snapshots, retry/history no live GHN. |
| F01 | Web CheckoutPage.vue loadPreview/refreshPreview/requestPayload; `features/checkout/api/checkout-api.ts` | FOUND abort/sequence/branch checks, input fingerprints, generated typed API layer. Chưa có GHN request/state. Generic initial preview failure hiện redirect cart; GHN lỗi phải được tách local. | 3 direct callers loadPreview; stale responses, branch/account/address/payment, selected quote invalid, coupon canonical preview. |
| F02 | Web CheckoutPage.vue, `components/ui/radio-group`, Button, Skeleton | FOUND shared shadcn imports; shipping hiện là một static card với decorative radio. Giữ page hierarchy theo ảnh, thêm real RadioGroup sau G0; client green, cursor/focus/disabled. | Actual responsive, keyboard, screenshot/provider switching chưa chạy. |
| X01 | API `src/config/env.validation.ts`, env.keys.ts/app.config.ts; `.env.example`, `.env.production.example`, `.env.test.example` | GAP: 3 env example chưa có GHN keys, chưa có GHN validation/client/cache. Giữ nguyên vì implementation gate chưa mở; 5 tên env đã khóa được ghi ở mục 5. | Strict enabled, allowlisted HTTPS host/no redirect, positive ShopId, timeout, credentials only when enabled, INTERNAL isolation. |
| X02 | API package scripts, prisma.config.ts, docs/openapi.json; Web scripts/sync-openapi.mjs, orval.config.ts | FOUND source-driven pipeline, no generated manual edit. DB 34 migrations up to date; chưa cần migration vì chưa implement. | Generation/contract parity sau thay đổi, forward-only SQL review/backup nếu cần migration. |

GitNexus upstream thực tế: `resolveCheckout` **LOW**, 3 direct callers (`preview`, `placeCod`, `placeVnpay`), 6 impacted symbols, 2 grouped entry processes; `loadPreview` **LOW**, 3 direct dependencies, 2 grouped entry processes. Context chi tiết cho resolveCheckout cho thấy participation trong 10 execution flows; aggregation của impact không được hiểu là chỉ có 2 đường thực thi. Dù graph chấm LOW, đây vẫn là protected financial path. Không sửa function/class/method hiện hữu.

## 4. Baseline INTERNAL và tiền hàng

[`test/evidence/ghn-preflight-20261126/internal-baseline.json`](test/evidence/ghn-preflight-20261126/internal-baseline.json) được tạo bằng cách instantiate **ShippingPricingService thật** cùng 7 dependency calculator/resolver/factory thật qua `node -r ts-node/register -r tsconfig-paths/register`. Không HTTP/DB/network. Chín input hợp lệ đều gọi hai lần: breakdown và requestFingerprint giống hoàn toàn; chỉ không lưu các timestamp quote. Một negative vượt giới hạn đã ghi lỗi.

| Origin code → destination code | Type / qty / product g | Gross / chargeable g | Route | Fee VND |
|---|---|---|---|---|
| 1 → 92 | WARD / 1 / 900 | 1000 / 1000 | FAR_REGION | 39000 |
| 1 → 92 | COMMUNE / 1 / 900 | 1000 / 1000 | FAR_REGION | 48000 |
| 92 → 92 | WARD / 4 / 2600 | 2950 / 3000 | SAME_PROVINCE | 32000 |
| 92 → 79 | WARD / 2 / 700 | 900 / 1000 | SAME_REGION | 35000 |
| 92 → 48 | WARD / 3 / 1070 | 1270 / 1500 | ADJACENT_REGION | 42000 |
| 92 → 1 | WARD / 1 / 350 | 450 / 500 | FAR_REGION | 34000 |
| 92 → 92 | WARD / 1 / 400 | 500 / 500 | SAME_PROVINCE | 32000 |
| 92 → 92 | WARD / 1 / 401 | 501 / 1000 | SAME_PROVINCE | 32000 |
| 92 → 92 | WARD / 11 / 15000 | 15800 / 16000 | SAME_PROVINCE | 100000 |
| 92 → 92 | WARD / 11 / 15001 | rejected | `CHECKOUT_SHIPPING_WEIGHT_LIMIT_EXCEEDED` | — |

Các code trên thuộc Bookora internal resolver, **không phải GHN V3 IDs**. Fee 100.000đ là output policy hiện hành, không clamp hoặc sửa lại trong phase này.

Canonical source: subtotal=sum eligible lineTotal; discountAmount là original/current price difference đã phản ánh trong lineTotal, không trừ lần nữa. total=subtotal−ORDER coupon+selected shipping fee−SHIPPING coupon. Existing CheckoutService saved-address unit fixture chạy trong lần này assert subtotal 120.000đ, shipping 32.000đ, total 152.000đ; không gọi reverse geocode. Không đưa receiver fixture vào evidence.

Chưa có full same-input before/after matrix cho catalog/Flash Sale/ORDER+SHIPPING coupon/membership/COD/VNPay vì integration chưa bắt đầu. Đây là **baseline và repeatability**, không phải tuyên bố GHN pricing parity PASS. Source nghiệp vụ hoàn toàn không đổi.

## 5. Architecture, config và contract còn phải làm

Không thêm API GHN, enum/provider selection, cache/reference/TTL/error semantics, resolver hoặc parcel policy trong lượt này. Checkout vẫn `shippingMethodCode='STANDARD'`, internal quote hiện hữu. Chưa có lựa chọn GHN trong sản phẩm.

Sau khi G0 PASS: tái sử dụng owned cart/address và actual branch; quote GHN độc lập với INTERNAL preview/place; selected fee đi vào đúng canonical coupon context; fetch ngoài DB transaction; kiểm tra material fee/ETA date/context thay đổi trước commit. Phải hoàn tất P0 audit/fixtures còn thiếu trước sửa, chạy impact cho từng symbol sẽ đổi.

Env names phải reuse: `GHN_ENABLED`, `GHN_BASE_URL`, `GHN_TOKEN`, `GHN_SHOP_ID`, `GHN_TIMEOUT_MS`. Ba example ở X01 và strict validation **vẫn PENDING**, không được hiểu là đã hỗ trợ flag. Không đưa GHN credentials vào Web.

Runtime OpenAPI read-only `GET http://localhost:8000/api/docs-json` trả 200, title Bookora API; actual runtime paths có prefix `/api/v1/checkout/...`. Canonical exported docs dùng `/checkout/...`; Web sync có logic normalize prefix. Operations hiện có: `checkoutPreview`, `checkoutResolveCurrentLocation`, `checkoutReverseCurrentLocation`, `checkoutPlaceOrderCod`, `checkoutPlaceOrderVnpay`. Không thêm hoặc sửa generated contracts.

Pipeline cho lượt triển khai tiếp: API `docs:openapi` → `docs:contract` / `docs:lint`; Web `openapi:sync` → `gen:api` (Orval client/Zod + repo fix scripts + verify generated). Chưa chạy generation vì source/DTO chưa thay đổi; không tuyên bố post-change contract parity.

## 6. DB và order snapshots

Đã xác minh env local BE `NODE_ENV=development`, DB host localhost:5432. `prisma.config.ts` dùng multi-file `prisma/schema`, migrations `prisma/migrations`. Migrate status: **34 migrations, database schema up to date**. Chỉ SELECT branch trong SQL transaction `BEGIN READ ONLY` / `ROLLBACK`; không đọc dữ liệu người nhận thật, không tạo fixture DB/order/payment, không thay stock/coupon/quota.

Không migration, backfill hoặc seed; không cần backup phục vụ migration vì không có DB mutation. Chưa tạo GHN order snapshot; ETA nullable sẵn có không chứng minh provider snapshot đủ. Provider/schema design và compatibility cần được review sau G0. Không có persisted QA order/COD/VNPay result trong lượt này.

## 7. UI/browser acceptance

Ảnh owner đã được đọc: desktop hai cột, section địa chỉ/shipping trái, summary/coupon/payment phải; vùng shipping có shared origin/destination, một INTERNAL card và weight/route. Chỉ dùng làm visual reference, không dùng giá/địa chỉ/người nhận trong ảnh làm fixture.

CUA inventory chạy thành công: có Edge và in-app browser; không có checkout tab. Browser capability có thật, **không có blocker công cụ browser được xác nhận**. Web localhost:5173 chưa chạy; API thực tế đang chạy port 8000, runtime docs trả 200. Kiểm tra cổng ban đầu bỏ sót 8000 đã được sửa lại sau khi đọc PORT; không kết luận API tắt từ lần probe đó.

Không mở runtime customer checkout, không khởi động Web/API hay sửa session. Không chụp actual baseline/after UI. Mọi manual case dưới đây vẫn chưa chạy, do implementation dừng tại G0; không dùng ảnh owner hoặc component tests thay runtime evidence.

| Case | Status | Việc cần verify sau G0/implementation |
|---|---|---|
| M01 | NOT RUN | Actual before/after desktop checkout screenshots |
| M02 | BLOCKED | Default saved address, INTERNAL mặc định, real GHN fee/ETA |
| M03 | BLOCKED | Đổi saved address và hai quote |
| M04 | BLOCKED | Add/edit/select address flow |
| M05 | BLOCKED | Browser GPS → real VietMap → confirm/proof → quote |
| M06 | BLOCKED | GPS denied/timeout giữ saved address usable |
| M07 | BLOCKED | GPS/saved equivalent normalized context |
| M08 | BLOCKED | Actual purchasing branch switch và origin/ShopId |
| M09 | BLOCKED | Qty/selected lines/buy-now/parcel refresh |
| M10 | BLOCKED | Real radio/card provider switch, canonical total |
| M11 | BLOCKED | UI fee=Preview total_fee, ETA VN date, no order_code |
| M12 | BLOCKED | Apply/remove ORDER coupon ở cả hai providers |
| M13 | BLOCKED | SHIPPING fixed/%/cap/free/stack |
| M14 | BLOCKED | Flash Sale/catalog/membership eligible/ineligible |
| M15 | NOT RUN | INTERNAL COD QA order/DB/inventory |
| M16 | BLOCKED | GHN COD QA order/snapshot, no shipment |
| M17 | NOT RUN | INTERNAL VNPay pending amount/sandbox/retry |
| M18 | BLOCKED | GHN VNPay corresponding flow |
| M19 | BLOCKED | Snapshot retry khi GHN thay đổi/outage/disabled |
| M20 | BLOCKED | Expiry/fee/ETA-date change final conflict |
| M21 | BLOCKED | Delayed GHN, INTERNAL readiness/placement independent |
| M22 | BLOCKED | Timeout/500/429/malformed/no route/retry |
| M23 | BLOCKED | GHN selected failure retains intent/blocks only relevant CTA |
| M24 | BLOCKED | Rapid changes/out-of-order response |
| M25 | BLOCKED | Isolated flag=false runtime, zero GHN calls |
| M26 | BLOCKED | Missing mapping/unsupported parcel isolated to GHN |
| M27 | BLOCKED | Customer/Admin persisted snapshot, legacy reads |
| M28 | NOT RUN | QA cancel, stock/coupon/Flash Sale release |
| M29 | BLOCKED | Actual shadcn, whole-card/keyboard/focus/cursor/green |
| M30 | BLOCKED | 1366/1440/1920 desktop, 768 tablet, 390/320 mobile |
| M31 | BLOCKED | Console/network/session isolation/no Web credential leaks |
| M32 | NOT RUN | Coupon/notification/support/navigation runtime smoke |

Chưa có manual acceptance hoặc Product Owner acceptance. Không đổi layout/client green/admin navy hoặc support/payment UI.

## 8. Commands và verification trong lượt này

Shell commands dùng `rtk` sau khi đọc RTK.md; lần đọc instructions ban đầu diễn ra trước khi biết rule. Git commands chỉ read-only. Dưới đây là kết quả mới, không cộng số test từ handoff cũ hoặc cộng test rerun vào total suite.

| Working tree / command | Exit | Kết quả |
|---|---|---|
| API `rtk proxy npm test -- --runInBand --testPathPatterns='shipping\|checkout\|coupons\|payments\|flash-sales\|membership'` | 0 | **15 suites / 142 tests PASS**, 20.779s. Unit-level baseline; không phải toàn bộ PostgreSQL/runtime financial regression. |
| API `rtk proxy npm run type-check` | 0 | PASS, tsc --noEmit |
| API `rtk proxy npx prisma migrate status` | 0 | PASS, 34 migrations / schema up to date |
| Web `rtk proxy npm test -- --reporter=dot` | 1 | **226 files PASS / 2 files FAIL; 1172 tests PASS / 4 FAIL**, 220.08s. Cả 4 failure là timeout 5000ms trong date-picker tests: CouponFormDialog 3, FlashSaleFormDialog 1. Chưa thay source lúc chạy. |
| Web `rtk proxy npm test -- --maxWorkers=1 src/features/coupons/components/CouponFormDialog.test.ts src/features/flash-sales/components/FlashSaleFormDialog.test.ts src/pages/app/checkout/CheckoutShippingPricingContract.test.ts src/pages/app/checkout/CheckoutHotfixContract.test.ts` | 0 | **4 files / 34 tests PASS**, 22.84s. Không đổi timeout/source. Không quy nguyên nhân timeout chắc chắn cho machine contention; full-suite run vẫn có failure ghi nhận. |
| Web `rtk proxy npm run verify:generated-zod` | 0 | PASS: 39 files, 279 zod.ulid(), 0 forbidden occurrences |
| Web `rtk proxy npx vue-tsc -b --pretty false` | 0 | PASS |
| API và Web `rtk git diff --check` | 0 | PASS trên tracked diff; chỉ có thay đổi instructions pre-existing |
| GitNexus `detect_changes({scope: 'all'})` cho cả hai repo | success | Mỗi repo chỉ nhận diện 2 instruction sections pre-existing, 0 affected processes, LOW; không bao phủ ba file handoff/evidence untracked |
| Existing calculator baseline via `rtk proxy node -r ts-node/register -r tsconfig-paths/register -e <instantiate existing service and dependencies>` | 0 | 9 successful/repeatable cases + 1 expected negative; full inputs/breakdowns/hash trong internal-baseline.json |

Không chạy build/lint toàn dự án, export/generation, DB integration test, live payment, hoặc runtime post-change regression trong lượt gate-blocked này. Các lần read source hụt tên file và probe cổng ban đầu không phải quality check PASS; đường dẫn thực đã được tìm lại và ghi đúng trong audit matrix.

## 9. Performance và isolation

Live call elapsed được ghi từng mẫu trong live-ghn.json, gồm cả success/error; **không phải benchmark app/cache**. Chưa có adapter/cache nên chưa có cache hit/miss hoặc single-flight evidence. Không có INTERNAL HTTP n=20 baseline/after/P50/P95, submit latency hoặc delayed-GHN browser proof. Các mục này **PENDING**. Không suy từ thời gian GHN 265–383ms ra UI latency hay performance isolation.

## 10. Files, safety và tiếp nối

Chỉ tạo file trong Web repo:

1. `Bookora_Multi_Provider_Shipping_GHN_Handoff.md`: một handoff Markdown chính thức, ghi gate/blocker, findings và trạng thái thật.
2. `test/evidence/ghn-preflight-20261126/live-ghn.json`: bằng chứng GHN sanitized, controls/negatives/request counts và giới hạn.
3. `test/evidence/ghn-preflight-20261126/internal-baseline.json`: input/output calculator hiện hành để đối chiếu trong lượt triển khai tiếp.

Kiểm tra status/stat cuối: API vẫn đúng 2 file instructions dirty baseline; Web thêm đúng handoff và hai JSON evidence untracked. Tracked diffstat cả hai repo vẫn 2 insertions / 2 deletions như ban đầu. JSON evidence parse hợp lệ và các file mới không có trailing whitespace.

Không sửa production source ở API/Web, instructions pre-existing, credentials/env thật hoặc examples, dependencies/lockfiles, schema, generated OpenAPI/Orval/Zod. Không chạy git add/commit/push/pull/rebase/reset/clean/restore. Không khởi động/tắt process owner; không có temporary env override hoặc DB fixtures cần cleanup. Không tạo vận đơn, không live payment.

Khi external blockers đã được xử lý, cần chạy lại **toàn bộ G0**, hoàn tất audit/baseline tài chính còn thiếu rồi mới tích hợp. Sau đó triển khai hai providers/hai address sources và hoàn thành automated + DB + actual browser M01–M32 + performance. Quote-only: việc chọn GHN sau này không tự đặt pickup/vận đơn. Kích thước kiện khả thi ở mục 2 là fixture, chưa được xác nhận vật lý cho catalog/bao bì sản phẩm.

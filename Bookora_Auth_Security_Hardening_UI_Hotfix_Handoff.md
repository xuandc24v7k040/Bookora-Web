# Bookora — Auth Security Hardening & Client UI Hotfix

## STATUS

**BOOKORA — AUTH SECURITY HARDENING & CLIENT UI HOTFIX — PENDING.**

Đã triển khai FE/BE, migration, contract và bốn hotfix; đã tự chạy runtime/browser desktop/mobile. Chưa đủ DONE gate: **M5 Google OAuth live thiếu tài khoản test an toàn**; **M6 có HTTP contexts A/B đầy đủ nhưng chưa thao tác change/reset password bằng browser**. Không đánh đồng các kết quả này với live OAuth/manual PASS. Không commit/push.

## PREFLIGHT

- Web: `D:/CTU/CT466E/bookora-web/bookora-web`, HEAD `57e97520a2684a36ef6ac8ee4e8de85795687f08`.
- API: `D:/CTU/CT466E/bookora-api/bookora-api`, HEAD `e5d566f315534b8cc81600b999eeabc32657eb0c`.
- Ban đầu cả hai repo chỉ có ` M AGENTS.md`, ` M CLAUDE.md` (2 dòng đổi). Giữ nguyên các thay đổi này. Không Git write/commit/push.
- Đã đọc prompt, RTK, instructions/README/scripts hai repo; các handoff Password Recovery/CSRF, Coupon và Review trực tiếp liên quan. GitNexus index trùng HEAD.

| ID | Thực trạng / path thực tế | Root cause / GAP | Quyết định / reuse | Blast radius trước sửa |
|---|---|---|---|---|
| AUTH-01 | API `src/modules/auth/auth.service.ts:loginWithGoogle`, `strategies/google.strategy.ts:validate` | Lookup email, tự gắn Google ID vào LOCAL; chưa khóa subject/type; Boolean coercion `email_verified` | Lookup subject; fail closed provider/identity/CUSTOMER; strict boolean; giữ state/callback an toàn | LOW, callback gọi trực tiếp; Passport gọi strategy |
| AUTH-02 | API `AuthService.register/login`, Prisma User, MailService, PasswordRecovery | Chưa có state/token/verify/resend | Thêm boolean required mặc định false cho legacy + timestamp thật, token storage riêng; reuse AuthAttempts, transaction, mail transport và shell email reset | register/login LOW (1 caller mỗi hàm); AuthModule MEDIUM (8 imports); config LOW |
| AUTH-03 | API `startSession/logout/refresh/changePassword`, PasswordRecovery | Multi-device đúng; contract còn mô tả single-device; JWT refresh có thể giống nhau trong cùng giây | Giữ policy; thêm refresh `jti` ngẫu nhiên để rotation thật; bổ sung regression + docs | `signTokenPair` HIGH: 3 callers trực tiếp refresh/changePassword/startSession, 10 symbols/3 tầng; đã cảnh báo trước sửa |
| UI-01 | Web `src/features/coupons/components/CheckoutCouponDialog.vue` | Loading chỉ có spinner, không skeleton card | Dùng shared Skeleton trong từng nhóm ORDER/SHIPPING; giữ form/footer/logic | LOW, CheckoutPage |
| UI-02 | Web `src/features/engagement/components/ReviewMediaGallery.vue` | Button thumbnail thiếu cursor | Một patch shared cho My Reviews và PublicReviewSection | LOW, 2 consumers |
| UI-03 | Web `src/components/shared/ImageDropzone.vue` | Button thật mở file input thiếu cursor | Chỉ thêm cursor khi compact; disabled cursor giữ đúng | LOW, 4 consumers; chỉ compact Review đổi |
| UI-04 | Web `src/components/client/layout/CustomerAccountSidebar.vue` | Multi-root fragment làm mất fallthrough class `sticky/self-start/hidden` từ layout | Explicit attrs trên aside, giữ dialogs riêng và layout | LOW, CustomerAccountLayout |

## DECISION LOCK / BOUND

Giữ LOCAL/GOOGLE độc lập, CUSTOMER OAuth, legacy không bị khóa hàng loạt, không fake verified, token purpose riêng, TTL qua config, multi-device. Không sửa payment/Flash Sale/WebSocket, không thêm thư viện, không sửa generated thủ công, không chạy destructive DB/Git. Chỉ tạo handoff Markdown này.

## BACKEND / LEGACY / SESSION

- Google: lookup `googleId` trước, không fallback nhận diện bằng email. Chỉ GOOGLE/CUSTOMER/active, subject và email khớp DB mới được cấp phiên. Email Google thay đổi bị từ chối an toàn, không đổi DB. LOCAL có Google ID cũ, collision email, Google ID null/mismatch, non-CUSTOMER, thiếu identity/email hoặc `email_verified !== true` đều fail closed. Unique race chỉ đọc lại đúng subject; giữ signed state và callback lỗi an toàn.
- Register mới đặt `emailVerificationRequired=true`, `emailVerifiedAt=null`; giữ `isActive` riêng. Response mở rộng public user với `verificationRequired`, `verificationDelivery=SENT|FAILED`, `resendCooldownSeconds`. Không session/auto-login. Gửi thư lỗi: tài khoản vẫn tồn tại, token bị revoke, UI hướng dẫn gửi lại.
- Token random 32 bytes, chỉ lưu HMAC-SHA256; prefix `EMAIL_VERIFICATION:` và bảng riêng ngăn dùng lẫn với reset. Reuse secret hash hiện hữu, không đổi password reset TTL. Verify/resend khóa cùng user trong Serializable transaction có retry; consume kiểm tra `expiresAt > now`, chỉ một request thắng. USED/REVOKED/EXPIRED/INVALID có machine code và thông báo Việt.
- Resend dùng AuthAttempts atomic, enum purpose riêng theo email/IP; row lock và cooldown ngăn mail bombing/race. Phản hồi giống nhau cho missing/GOOGLE/inactive/verified/legacy và lỗi delivery, chỉ nói “yêu cầu đã được tiếp nhận”.
- ENV: `EMAIL_VERIFICATION_TOKEN_TTL_MINUTES` default **30**, integer **1–1440**; `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS` default **60**, integer **1–3600**. Config `mail.emailVerification`; service và email dùng cùng TTL. Đã thêm cả ba env examples. Runtime test override 2 phút/1 giây; unit fake clock override 7 phút và kiểm tra đúng boundary.
- Mail: giữ Resend → MailService, extract shell nhỏ `bookoraActionEmail` ngay trong template reset hiện hữu. Không copy HTML lớn, đổi palette hay thêm transport. HTML/plain text có CTA, hạn dùng từ config và footer Bookora.
- Multi-device giữ nguyên: login A+B cùng active; logout/replay chỉ revoke sid liên quan; refresh CAS; đổi mật khẩu giữ/rotate A, revoke các sid khác; reset revoke tất cả. Bổ sung refresh JWT `jti` random để rotation không trả lại cùng JWT trong một giây. `auth-contract.md`, logout OpenAPI description đồng bộ policy.
- Audit DB local **chỉ đọc**: `LOCAL AND googleId IS NOT NULL` có **1 CUSTOMER active, 1 session active**. Không sửa mapping hoặc revoke phiên có sẵn vì bảng session không ghi provenance để phân biệt phiên LOCAL/Google cũ. Fix chặn OAuth sai trong tương lai; phiên đã cấp trước deploy vẫn theo lifecycle cũ. Cần đánh giá targeted tài khoản này khi triển khai; không bulk backfill/revoke production. Không đưa email/id cá nhân vào handoff.

## FRONTEND / HOTFIX

- `/verify-email` dùng ClientAuthLayout + AuthVisualPanel + AuthBrand, width 480px, Field/Input/Button/Alert/Skeleton và màu/spacing như Forgot Password. Register chuyển sang check-inbox trong cùng shell; Login có thông báo chưa xác minh và entry gửi lại. Có loading, success, invalid/expired/used/revoked, resend/cooldown, retry; không auto-login.
- Link mail dùng `/verify-email#token=...`; token chỉ giữ memory, `router.replace` xóa URL trước gọi API, không lưu storage. Runtime phát hiện router scroll dùng hash làm CSS selector và in warning: đã bỏ hash scrolling riêng route verification; các lần kiểm cuối console không còn warning này.
- Runtime phát hiện tab verify thay CSRF cookie làm tab login giữ cache cũ. `api/http/auth-csrf-request.ts` retry **một lần** đúng `403 CSRF_INVALID`, sau clear/bootstrap mới, cho login/register/verify/resend. Guard từ chối trước Turnstile/business handler nên không lặp side effects. Không đổi global interceptor hoặc cookie protocol. Browser hai tab đã chứng minh `403 → csrf 200 → login 200 → me 200`.
- Coupon: spinner-only được thay bằng shared Skeleton trong từng nhóm ORDER/SHIPPING, giữ input, ScrollArea/footer và logic chọn/preview. Đã thấy skeleton thật khi proxy local tạo độ trễ; timeout có error/reload; tải lại chọn TEST-ORDER, preview 100.000đ → 90.000đ. Không tạo đơn/thanh toán.
- Review: thêm cursor đúng button của shared ReviewMediaGallery (My/Public), và chỉ compact trigger của ImageDropzone; disabled dùng not-allowed. Browser mở lightbox ở cả hai nơi; file chooser và local image preview hoạt động; hủy dialog sau thử, không ghi ảnh lên storage thật.
- Sidebar: fragment nhiều root làm rơi attrs từ layout. `inheritAttrs:false` + bind attrs lên aside khôi phục `self-start`, sticky và responsive visibility; không fixed height. Đối chiếu Overview/Orders/Reviews/Profile, article ngắn/dài; sidebar khoảng 528–548px tùy tên/email, không stretch. Mobile Sheet hiển thị đúng.

## SCHEMA / CONTRACT

- Migration duy nhất `20261120090000_customer_email_verification`: thêm boolean default false và timestamp nullable vào users; bảng token + unique digest/FK/index; hai AuthAttempt enum values. Additive, không sửa migration đã áp dụng hoặc cập nhật giả verified cho dữ liệu cũ. Migration được Prisma deploy một lần; deploy lặp không còn pending, không cần SQL idempotence thủ công.
- **30 migrations** apply trên DB dùng một lần; `migrate status`: up to date; deploy lần hai: no pending migrations. Không migrate DB ứng dụng có sẵn. Test helper `runMigrations` thêm migration Auth độc lập để các suite cũ dùng User schema mới; GitNexus MEDIUM, 9 test callers, không production caller. Reviews HTTP regression PASS.
- Endpoints mới: `POST /auth/email-verification/verify` (`authVerifyEmail`), `POST /auth/email-verification/resend` (`authResendEmailVerification`), CSRF + throttle. Dùng ErrorResponseDto cho 400/403/409/429; không trả token/hash.
- BE `docs:check` → Web `gen:api:local`: 155 paths, 218 operations, 275 schemas; cuối sync SHA-256 `1EABBC2732DAFD31C1C78859B174E6ED2DE44AB5E0B282D7941ED1E9D8D4CA3D`. 35 generated Zod files, 269 `zod.ulid()`, 0 forbidden occurrences. Không sửa generated bằng tay, không thêm dependency/đổi lockfile.

## AUTOMATED VERIFY

Các nhóm test có overlap, **không cộng thành số test độc lập**. Các kết quả bên dưới đã được đọc từ exit code/output thực tế.

| Repo | Command đã chạy | Kết quả |
|---|---|---|
| API | `rtk proxy npm run prisma:format` | PASS, exit 0 |
| API | `rtk proxy npm run prisma:validate` | PASS, exit 0 |
| API | `rtk proxy npm run prisma:generate` | PASS, exit 0 |
| API | `node node_modules/prisma/build/index.js migrate deploy` / `migrate status`, DATABASE_URL chỉ DB dùng một lần | PASS, 30 migrations; deploy lặp no pending |
| API | `rtk proxy npm test -- --runInBand src/modules/auth src/modules/mail src/config/env.validation.spec.ts` | PASS, 35 suites/397 tests, exit 0; gồm regression JWT thật cùng giây |
| API | `rtk proxy npm run test:e2e -- --runInBand auth-hardening.e2e-spec.ts` | PASS, 1 suite/16 tests, exit 0 |
| API | `rtk proxy npm run test:e2e -- --runInBand review-http.e2e-spec.ts` | PASS, 1 suite/2 tests, exit 0; storage giả lập, không R2 live |
| API | `rtk proxy npm run type-check` | PASS sau thay đổi harness cuối, exit 0 |
| API | `rtk proxy npm run lint` | PASS, exit 0; `rtk proxy npx eslint src/modules/auth/auth.service.spec.ts` sau test JWT mới cũng exit 0 |
| API | `rtk proxy npm run build` | PASS, exit 0, 516 files |
| API | `rtk proxy npm run docs:check` | PASS, export/contract/Redocly, exit 0 |
| Web | `rtk proxy npm run gen:api:local` | PASS, sync/Orval/Zod, exit 0 |
| Web | `rtk proxy npm run build` | PASS sau lần gen error schemas cuối, exit 0; vue-tsc + Vite 6294 modules |
| Web | Lệnh regression tổng bên dưới | PASS, 25 files/211 tests, exit 0 |
| Web | `rtk proxy npm test -- src/router/index.test.ts src/api/http/auth-csrf-request.test.ts src/api/http/__tests__/client.test.ts src/api/http/csrf-manager.test.ts src/components/client/auth/CustomerAuthForms.test.ts src/features/email-verification --maxWorkers=1 --testTimeout=20000` | PASS, 6 files/117 tests, exit 0 |
| Web | Lint | NOT AVAILABLE: package.json không có script lint |
| Cả hai | `rtk proxy git diff --check` | PASS, exit 0; cảnh báo chuẩn hóa LF/CRLF không phải whitespace error |

Lệnh regression tổng Web (giữ nguyên command thực thi):

```powershell
rtk proxy npm test -- src/components/client/auth/CustomerAuthForms.test.ts src/features/auth src/features/email-verification src/features/password-recovery src/api/modules/auth.api.test.ts src/api/http src/router/index.test.ts src/router/customer-auth.routes.test.ts src/features/coupons src/features/engagement/components src/components/shared/ImageDropzone.test.ts src/components/client/layout/CustomerAccountSidebarAvatar.test.ts src/pages/app/checkout/CheckoutHotfixContract.test.ts src/pages/app/checkout/CheckoutShippingPricingContract.test.ts --maxWorkers=1 --testTimeout=20000
```

Các lỗi trong vòng đầu đã được xử lý: fixture role CUSTOMER đã được migration tạo; endpoint đổi mật khẩu trả 201; mock/test đăng ký cũ mong quay lại login; type fixtures thiếu field mới; dynamic import test cần đường dẫn `.js`; format harness. Hai test CouponForm timeout 5s trên máy này PASS khi chạy một worker/timeout 20s, không sửa logic CouponForm. Expected delivery 503/unique/serialization conflicts trong E2E là ca lỗi chủ động, không phải HTTP 500 thành công giả. Có warning pg query deprecation và Vite chunk >500kB; không thêm scope sửa chúng.

## RUNTIME / MANUAL EVIDENCE

Harness `test/auth-hardening.browser-runtime.ts` boot đầy đủ Nest app, chỉ bind local và kiểm `current_database()` đúng DB do helper tạo; migrations qua Prisma deploy. Web chạy bằng script thật:

```powershell
rtk proxy npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node"}' -r tsconfig-paths/register test/auth-hardening.browser-runtime.ts
# Lần boot xác nhận lại cũng dùng thành công:
rtk proxy npx ts-node -r tsconfig-paths/register test/auth-hardening.browser-runtime.ts
$env:VITE_API_BASE_URL='http://localhost:18000/api/v1'; $env:VITE_TURNSTILE_ENABLED='false'; rtk proxy npm run dev -- --host 127.0.0.1 --port 15173 --strictPort
```

API 18000, inbox 18001. Mail đi qua **Resend SDK/ResendMailProvider thật** đến local HTTP capture (`RESEND_BASE_URL` chỉ trong helper), không mock MailService. SMTP N/A vì source dùng Resend HTTP; không gửi thư/credential đến Resend/Google bên ngoài. Dùng thêm reverse proxy 18002, `VITE_API_BASE_URL=http://localhost:18002/api/v1`, delay preview 3500/15000ms để thấy loading và timeout; sau đó bỏ delay. Proxy chỉ ghi method/path/status, không query/header/body/cookie/token. Browser DevTools network surface không có; xác minh network bằng proxy HTTP metadata và E2E, không tuyên bố đã mở Network panel.

Runtime E2E dùng Prisma/PostgreSQL thật và cùng mail SDK capture: pre/post verify, used/expired/invalid, resend concurrency, hai verify đồng thời, delivery failure/retry, token namespace, reset không bypass verification; Google adapter/subject/collision/type/race; session A/B/logout/refresh/replay/change/reset. Google **live browser NOT RUN/BLOCKED**.

Audit cuối DB browser trước cleanup: 4 LOCAL mới verified, 1 mới unverified; **0 session active của LOCAL mới chưa verify**; 8 token, 4 used, 3 revoked, **0 digest sai định dạng**. Không log token/password trong app/handoff/screenshots. Một warning router hash phát hiện trong vòng đầu đã được sửa trước nghiệm thu; các link kiểm cuối không còn warning.

Ảnh nằm ngoài repo, thư mục tuyệt đối:
`C:/Users/Admin/.codex/visualizations/2026/11/19/01a1f515-9e37-7c31-a9c5-d95e5a571140/bookora-auth-evidence/`.

| Case | Thao tác thực tế / viewport / bằng chứng | Status |
|---|---|---|
| M1 Register | Desktop 1440×900 và mobile 390×844 nhập/submit LOCAL, inbox, không auto-login. `register-desktop.jpg`, `register-mobile.jpg`, `check-inbox-{desktop,mobile}.jpg` | PASS |
| M2 Email | Xem HTML inbox, CTA và TTL 2 phút, click CTA mở verify; mail 1280×720, Web 1440×900/390×844. `verification-mail-desktop.jpg`, `verification-success-{desktop,mobile}.jpg` | PASS |
| M3 Login pre/post | Login 403 trước verify; sau verify login 200 + me 200. Đã lặp mobile/hai tab sau fix CSRF. `login-before-verification.jpg`, `login-preverify-mobile.jpg`, `cross-tab-login-mobile.jpg` | PASS |
| M4 Invalid/expired/used/resend | Mở link sai/hết hạn/used/revoked thật, resend UI và cooldown 1s từ config test; link cũ deny, link mới success. Expiry fixture chỉnh timestamp UTC chỉ trên test DB. `verification-{invalid,expired,used,revoked}-mobile.jpg`, `resend-mobile.jpg` | PASS |
| M5 Google collision live | Không có tài khoản Google test an toàn đã được xác nhận; không lấy credentials cá nhân. Backend GoogleStrategy adapter + DB integration có kiểm | BLOCKED live / PASS adapter |
| M6 Multi-device | Hai HTTP agents độc lập trên PostgreSQL kiểm đủ login A+B/logout A/refresh B/replay/change/reset. Browser đã login/logout thực tế; **chưa test change/reset bằng browser hoặc hai browser contexts độc lập** | RUNTIME PASS / BROWSER PARTIAL |
| M7 Coupon | Checkout → dialog thật, proxy delay, quan sát 2 nhóm skeleton/footer, timeout/reload, chọn và xác nhận voucher sau load. 1440×900 + 390×844. `coupon-skeleton-{desktop,mobile}.jpg`, `coupon-error-mobile.jpg`, `coupon-selected-mobile.jpg` | PASS |
| M8 My Reviews | Đo cursor pointer button, click lightbox, đóng; desktop/mobile. `my-review-lightbox.jpg`, `my-review-lightbox-mobile.jpg` | PASS |
| M9 Public Reviews | Product Detail → Đánh giá → click thumbnail/lightbox; đo pointer, 1440×900. `public-review-lightbox.jpg` | PASS |
| M10 Review Dialog | Desktop/mobile, pointer ở nút thật, file chooser multiple, chọn PNG giả lập và preview 2/4; hủy, không lưu R2. `review-dialog-{desktop,mobile}.jpg`, `review-local-image-preview.jpg`; Reviews HTTP tests bổ sung upload lifecycle | PASS picker/preview; R2 live N/A |
| M11 Sidebar | Overview dài, Profile/Orders/Reviews ngắn, aside align-self flex-start/sticky; mobile Sheet. `account-overview-sidebar.jpg`, `account-{profile,orders}-desktop.jpg`, `account-sidebar-mobile.jpg` | PASS |
| M12 Responsive/regression | Auth cũ/mới, coupon, reviews/lightbox/dialog, account tại 390×844; không horizontal overflow trên view đã đo. `login-mobile.jpg`, `forgot-password-mobile.jpg`, các ảnh trên. Console kiểm cuối [] | PASS cho UI đã nêu; Network panel N/A, có proxy evidence |

Giới hạn M6: chính sách Computer Use yêu cầu handoff thao tác đổi credential. [SKILL.md](C:/Users/Admin/.codex/plugins/cache/openai-bundled/computer-use/26.1111.71704/skills/computer-use/SKILL.md) yêu cầu đọc confirmations; [quy tắc đi kèm](C:/Users/Admin/.codex/plugins/cache/openai-bundled/computer-use/26.1111.71704/docs/confirmations.md) ghi **“[2.4] Final step: submit change password”** thuộc Hand-Off Required. Đã kiểm semantics bằng HTTP contexts, không gán phần đó thành browser manual PASS.

## GATE / RỦI RO / DỮ LIỆU TEST

- [x] Audit hai repo, bảo vệ baseline instructions, root causes và impact trước sửa chính.
- [x] Provider isolation, CUSTOMER-only, token namespace/hash/single-use/TTL/config, legacy compatibility.
- [x] Runtime register/mail/verify/login + fail/resend; session HTTP contexts A/B và docs.
- [x] Bốn UI hotfix, browser desktop/mobile có ảnh; không payment/order/Flash Sale/WebSocket changes.
- [ ] Google OAuth live M5 bằng tài khoản test an toàn.
- [ ] M6 manual browser đầy đủ; HTTP equivalent đã PASS nhưng ghi riêng.
- [x] Chốt unit/regression, API typecheck/lint/build/docs, Web typecheck/build sau contract cuối; cleanup DB/process kiểm thử.

Các file mới chưa nằm trong GitNexus index HEAD: impact trả UNKNOWN cho EmailVerificationController, không được coi là LOW/0 callers an toàn. Đã review wiring AuthModule → controller/service, FE generated wrappers và kiểm runtime; không stage để ép index nhận file. `detect_changes(scope:compare, base_ref:master)` cuối: Web MEDIUM, 15 indexed symbols/3 flows/22 tracked files; API HIGH, 36 indexed symbols/8 flows/22 tracked files (kể cả hai instruction files có trước). Các flow bị ảnh hưởng xoay quanh register/login; một số symbol phía sau vùng chèn bị gán touched do offset. Diff không thay refresh/changePassword/logout policy; thay đổi signing helper chỉ thêm refresh jti. Manifest đầy đủ cả tracked/untracked bên dưới là nguồn đối chiếu phạm vi.

### Manifest chính xác và lý do

Các path trong hai bảng lấy gốc repo nêu ở PREFLIGHT. `AGENTS.md`, `CLAUDE.md` của cả hai repo là thay đổi có trước, **không thuộc implementation này**. Không đổi lockfile/dependency.

| API — file đã thay đổi/thêm | Lý do |
|---|---|
| `.env.example`, `.env.test.example`, `.env.production.example` | Công bố TTL/cooldown có default/range rõ ràng |
| `src/config/env.keys.ts`, `src/config/env.validation.ts`, `src/config/mail.config.ts`, `src/config/env.validation.spec.ts` | Mapping, fail-fast validation và regression config |
| `prisma/schema/10-auth-authorization.enums.prisma`, `prisma/schema/20-auth-users-branches.models.prisma` | State legacy/new, token purpose riêng và enum rate limit |
| `prisma/migrations/20261120090000_customer_email_verification/migration.sql` | Migration additive tương ứng schema |
| `src/modules/auth/auth.service.ts`, `src/modules/auth/auth.service.spec.ts` | Provider isolation, registration/verified-login, JWT rotation và regression |
| `src/modules/auth/strategies/google.strategy.ts` | Chỉ chấp nhận Google email_verified boolean true |
| `src/modules/auth/auth.module.ts` | DI controller/service email verification |
| `src/modules/auth/auth.controller.ts` | Typed register response, logout docs đúng policy |
| `src/modules/auth/email-verification/email-verification.controller.ts`, `src/modules/auth/email-verification/email-verification.dto.ts` | Verify/resend, validation, throttle/CSRF, OpenAPI responses |
| `src/modules/auth/email-verification/email-verification.service.ts`, `src/modules/auth/email-verification/email-verification.service.spec.ts` | Hash/TTL/atomic consume/resend/delivery và fake-clock regression |
| `src/modules/users/users.repository.ts` | Cho phép create Customer nhận cờ required có kiểu |
| `src/modules/mail/mail.service.ts`, `src/modules/mail/templates/password-reset-email.ts` | Reuse transport và shell mail cho verification, giữ reset flow |
| `auth-contract.md`, `docs/openapi.json` | Contract Auth/session/verification và OpenAPI sinh từ source |
| `test/helpers/postgres-test-database.ts` | Thêm auth migration cho các DB integration test cũ |
| `test/helpers/auth-hardening-environment.ts` | DB dùng một lần, full migration và local Resend HTTP capture |
| `test/auth-hardening.e2e-spec.ts` | 16 case HTTP/DB mới, không thay thế Google live/browser manual |
| `test/auth-hardening.browser-runtime.ts` | Harness browser tái lập với dữ liệu giả và cleanup/startup guard |

| Web — file đã thay đổi/thêm | Lý do |
|---|---|
| `src/api/modules/auth.api.ts`, `src/api/modules/auth.api.test.ts` | Register response mới và CSRF recovery cho Auth |
| `src/api/http/auth-csrf-request.ts`, `src/api/http/auth-csrf-request.test.ts` | Retry đúng một lần khi CSRF cookie bị tab khác thay; 7 tests mới |
| `src/features/auth/customer-auth.ts` | Mapping machine code yêu cầu xác minh email |
| `src/components/client/auth/CustomerLoginForm.vue`, `src/components/client/auth/CustomerRegisterForm.vue`, `src/components/client/auth/CustomerAuthForms.test.ts` | Entry resend/inbox/no auto-login, giữ shell/form/Turnstile, cập nhật regression cũ |
| `src/features/email-verification/api/email-verification-api.ts` | Typed generated API calls, tách khỏi UI |
| `src/features/email-verification/email-verification-errors.ts` | Thông báo Việt và phân loại retry/rate-limit |
| `src/features/email-verification/components/EmailVerificationForm.vue`, `src/features/email-verification/components/EmailVerificationForm.test.ts` | Toàn bộ verify/inbox/resend state trong pattern Auth cũ; 11 tests mới |
| `src/pages/app/auth/EmailVerificationPage.vue`, `src/router/client.routes.ts` | Route trong ClientAuthLayout và visual panel hiện hữu |
| `src/router/index.ts`, `src/router/index.test.ts` | Không dùng verification token fragment làm scroll selector; regression mới |
| `src/features/coupons/components/CheckoutCouponDialog.vue`, `src/features/coupons/components/CheckoutCouponDialog.test.ts` | Skeleton đúng nhóm và test transition loading → list |
| `src/features/engagement/components/ReviewMediaGallery.vue` | Pointer đúng shared thumbnail My/Public |
| `src/components/shared/ImageDropzone.vue` | Pointer ở compact Add Image; disabled not-allowed |
| `src/components/client/layout/CustomerAccountSidebar.vue`, `src/components/client/layout/CustomerAccountSidebarAvatar.test.ts` | Forward attrs lên aside; regression class không rơi vào dialogs |
| `openapi/bookora.openapi.json`, `src/api/generated/endpoints/auth/auth.ts`, `src/api/generated/zod/auth/auth.ts` | Sinh lại contract/endpoints/Zod qua scripts |
| `src/api/generated/models/authRegister201.ts`, `src/api/generated/models/index.ts` | Output generator cho registration response mới |
| `src/api/generated/models/authResendEmailVerification200.ts`, `src/api/generated/models/authVerifyEmail200.ts` | Output generator response aliases |
| `src/api/generated/models/registrationResponseDto.ts`, `src/api/generated/models/registrationResponseDtoVerificationDelivery.ts` | Output generator typed registration delivery |
| `src/api/generated/models/resendVerificationDto.ts`, `src/api/generated/models/resendVerificationResponseDto.ts`, `src/api/generated/models/verifyEmailDto.ts` | Output generator request/response DTO mới |
| `Bookora_Auth_Security_Hardening_UI_Hotfix_Handoff.md` | Handoff duy nhất của phase, findings/evidence/gates |

Các suite cũ Auth/mail/CSRF/password recovery/coupon/review/account tiếp tục chạy trong các lệnh regression; các file `.spec.ts`/`.test.ts` mới được ghi riêng ở manifest. Reviews HTTP suite cũ vẫn PASS sau khi test migration helper đổi. Không tuyên bố đã chạy toàn bộ suite của cả hai repo.

Đối chiếu tự động manifest với `git diff --name-only` + `git ls-files --others --exclude-standard`: **35 file Web / 28 file API** thuộc task, không thiếu path; không có trailing whitespace trong file mới, handoff UTF-8 không có replacement character. Các số này loại trừ bốn instruction files có thay đổi trước.

### Cleanup và bước còn chờ

- Đã dừng API/inbox/Web/proxy do phiên này tạo; không còn listener trên 15173/18000/18001/18002. Dev servers có trước tại **8000/5173** vẫn chạy, không bị dừng.
- Đã kiểm tra ba DB tạm chính xác do browser harness tạo: host local, owner đúng current_user, không kết nối active, không user ngoài `@example.test`; sau đó drop từng DB có tên allowlist. Catalog xác nhận **0 DB còn lại** trong ba tên này. E2E DB dùng helper cleanup riêng. Không migrate/drop/truncate DB ứng dụng có sẵn.
- Ảnh bằng chứng còn tại thư mục visualization đã nêu; không đưa ảnh/token/credentials vào source. Dữ liệu đăng ký/mail/session/cart/review giả trong các DB browser đã được dọn cùng DB.
- Trước deploy: chạy migration mới bằng workflow triển khai hiện hữu; cấu hình TTL/cooldown, frontend URL và mail transport thật; review targeted legacy LOCAL+googleId/phiên đã cấp cũ. Không cần backfill emailVerifiedAt cho legacy.
- **M5:** cần tài khoản Google test an toàn để kiểm collision LOCAL, đúng GOOGLE subject và non-CUSTOMER qua callback browser thật; ghi Network/console an toàn, không lưu OAuth tokens.
- **M6:** kiểm lại A/B trên hai browser contexts độc lập, logout/refresh/replay/change/reset. Người dùng thực hiện bước submit đổi credential theo Computer Use handoff; sau đó agent kiểm outcomes/session. Chưa thực hiện nên vẫn PENDING.

**Kết luận gate: PENDING.** Implementation và automated/runtime kiểm được đã có evidence; chỉ đóng DONE (VERIFIED) sau khi M5 live và M6 manual browser được hoàn tất.

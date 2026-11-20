# Bookora — Auth DB Migration & Admin Login Recovery

## STATUS

**BOOKORA — AUTH DB MIGRATION & ADMIN LOGIN RECOVERY — DONE (VERIFIED).**

Đã migrate đúng DB ứng dụng, khôi phục login System/Branch Admin và Customer legacy trên runtime hiện có, sửa guest redirect loop, kiểm tra browser desktop/mobile và Edge InPrivate/F12. Phase Auth Hardening trước vẫn **PENDING** riêng M5 Google live/M6 manual đầy đủ; hotfix này không tự đóng các gate đó. Không commit/push.

## PREFLIGHT / BOUND

- Web HEAD `57e97520a2684a36ef6ac8ee4e8de85795687f08`; API HEAD `e5d566f315534b8cc81600b999eeabc32657eb0c`.
- Working tree ban đầu giữ toàn bộ mini phase Auth Hardening chưa commit: Web 22 tracked modified + 15 untracked files; API 22 tracked modified + 8 untracked files. Gồm AGENTS/CLAUDE thay đổi có trước. Không reset/restore/clean/commit/push; không overwrite chúng.
- Đã đọc prompt recovery, instructions/README/scripts/config/migration/seed và handoff Auth Hardening của hai repo. Chỉ sửa root cause recovery, không đổi contract, security policy, payment hay UI ngoài BOUND.
- Runtime đầu audit: Web Vite `localhost:5173` (PID 4132), API Nest dist `localhost:8000` (PID 3060), đúng đường dẫn repo. API kết nối PostgreSQL local `::1:5432`, DB `bookora_db`, schema `public`, role `postgres`. OS socket API local port 55059 khớp `pg_stat_activity.client_port=55059`, `datname=bookora_db`: **API TARGET MATCH YES**. Không in URL/credentials. Cuối hotfix, API watch đã reload thành PID 16372 với cùng command/path; Web PID 4132 giữ nguyên; không còn listener test 18003.
- Browser Admin Login đã tái hiện thông báo “Thao tác cơ sở dữ liệu không hợp lệ”. Guest `/account` trắng DOM rồi CDP snapshot timeout 20s; không coi là migration-only.

| Issue | Root cause / evidence | Fix bound / blast radius |
|---|---|---|
| DB login | DB không có `users.email_verification_required`, `users.email_verified_at`; pending duy nhất `20261120090000_customer_email_verification` | Review SQL, backup/restore thử, migrate deploy đúng app DB; không bỏ Prisma fields |
| Guest freeze | `resolveAuthNavigation`: unknown + bootstrapError redirect tới auth-unavailable; route này skip bootstrap nhưng vẫn thỏa cùng nhánh redirect, lồng redirect query vào chính nó | Chỉ redirect lỗi khi route yêu cầu bootstrap; GitNexus LOW, 1 direct caller (global guard), 26 symbols kể cả tests qua 3 tầng; context có 5 flows permission/landing/redirect |
| Legacy migration history | Authorization migration `20260621090000_authorization_phase_1` checksum DB khác disk; các migration finished khác khớp | Điều tra line endings/Git history/schema drift; không sửa applied migration/history hay migrate resolve |

## MIGRATION AUDIT / DATA PRESERVATION

- SQL email verification đã đọc toàn bộ: thêm boolean NOT NULL DEFAULT false + timestamp nullable; hai enum values; bảng token/hash unique/FK cascade/index. Không cập nhật fake verified, không reset dữ liệu, không đổi bảng session. ALTER users cần lock ngắn; enum additions không đổi giá trị cũ.
- Baseline DB: 26 users, 444 sessions, 82 orders, 29 products. Migration history có hai record checkout cũ rolled back, có record thành công thay thế; không thao tác vào history này.
- Backup bằng PostgreSQL `pg_dump 18.4 --format=custom`, kiểm tra TOC và **restore toàn bộ** bằng `pg_restore --exit-on-error --single-transaction --no-owner` vào DB tạm riêng. So sánh counts/digest users/roles/user_roles khớp, sau đó dọn DB restore. Archive giữ ngoài repo: `C:/Users/Admin/.codex/backups/bookora-auth-recovery/20261120/bookora_db-before-email-verification-1795141416031.dump` (**322.802 bytes**), SHA-256 `badc3e9632b626e1490572212d44d8a4b11c874380ded5205443b4d44a1344ed`. `latest-backup.json` cùng thư mục ghi metadata, không in secrets.
- Trước deploy: `rtk proxy npx prisma migrate status` exit 1, đúng **một pending** email verification. So sánh SHA-256 toàn bộ migration finished với disk: chỉ migration authorization cũ khác checksum. Đã kiểm LF/CRLF và Git history; chưa xác định nguồn gốc text divergence cũ. **Schema diff trước deploy chỉ có đúng các đối tượng email verification**, không có structural drift authorization. Không sửa migration cũ hoặc `_prisma_migrations`; không `migrate resolve`.
- `rtk proxy npm run prisma:migrate:deploy`: **exit 0**, áp dụng duy nhất `20261120090000_customer_email_verification` lên `bookora_db/public`. Status sau: up to date. `migrate diff --from-config-datasource --to-schema prisma/schema --script`: **empty migration**. Deploy lặp: exit 0, **No pending migrations**.
- Catalog xác nhận boolean NOT NULL DEFAULT false, timestamp nullable; enum EMAIL_VERIFICATION_EMAIL/IP; bảng token với PK, unique digest, hai indexes và FK đúng schema. Record migration mới finished=true, không rollback.
- Ngay sau migrate: **26 users / 444 sessions / 82 orders / 29 products**, đúng baseline; roles/user_roles digest không đổi. Restore đối chiếu lần hai dùng cùng JSONB serialization chứng minh 26 user giữ nguyên ID/email/password hash/provider/type/status và các field cũ; chỉ loại trừ `last_login_at/updated_at` có thể đổi do login được cho phép. Không xóa/reset/duplicate user cũ.
- Kết thúc acceptance: **27 users / 451 sessions / 82 orders / 29 products**. Chênh một user là fixture recovery mới có tên/email synthetic; session tăng do login runtime, không xóa session để né lỗi. Cả **26 account cũ** vẫn `emailVerificationRequired=false`, `emailVerifiedAt=NULL`. Không fake verified/backfill user cũ.
- Query Prisma thật `user.findUnique()` và `authSession.findFirst({include:{user:true}})` đều PASS sau migrate. Runtime login + `/auth/me` cũng PASS; không còn missing-column 400. Không cần đổi Prisma repository/controller/backend business logic.

## LEGACY / SEED

- Source `prisma/development.seed.ts` có System Super Admin và các Branch Admin assigned/unassigned. Đối chiếu DB read-only: seed được thử đều LOCAL, active, có hash; bcrypt đối chiếu chuẩn seed khớp. **Không chạy full seed, không repair/reset password/role của user nào.**
- System seed `superadmin@bookora.local`: form Admin → `/super-admin/dashboard`; `/auth/me` 200, SYSTEM, SUPER_ADMIN, isSuperAdmin=true. Refresh dashboard vẫn authenticated; logout rồi login lại thành công.
- Branch seed `branchadmin.ct@bookora.local`: form Admin → `/branch-admin/dashboard`; `/auth/me` 200, BRANCH, assignment active tại `can-tho`, role BRANCH_ADMIN, primary branch đúng. Refresh PASS; vào System dashboard → access-denied.
- Customer legacy demo đã có trước: mật khẩu chuẩn fixture khớp; `required=false`, `verifiedAt=NULL`; form Customer → home/account và `/auth/me` 200 CUSTOMER. Không gửi mail hoặc sửa verification state của user này.
- Fixture mới được tạo **chỉ để acceptance** trên app DB, LOCAL/CUSTOMER/required=true, email `@example.test`, hash chuẩn bcrypt, role CUSTOMER. Trước verify, form login hiển thị yêu cầu xác minh, không authenticated. Token test random/hash purpose riêng được mint có kiểm soát; sau đó **chính endpoint verify thật** consume và ghi timestamp, không gán verifiedAt giả. Sau verify, login + `/auth/me` 200 CUSTOMER và account PASS. Đây không phải test registration/mail delivery mới; các flow đó được regression bằng E2E.
- Fixture đã logout, token used, **0 active session**, sau đó targeted disable đúng ID/email/name synthetic. Giữ record phục vụ audit, không delete account/session. Đã xóa file tạm chứa token đã dùng; không đưa password/token vào repo/handoff/ảnh.

## GUEST ROUTE FREEZE: ROOT CAUSE → FIX → EVIDENCE

- Tái hiện trước sửa: `/account` sau Admin Login fail trên runtime hiện hành, trang chỉ còn Notifications; DOM snapshot tiếp theo timeout 20s. Tab cũ không nhận lệnh đóng; người dùng đã đóng để tiếp tục kiểm thử bản sửa.
- Source root cause xác định độc lập với missing-column: error fallback bị guard tự redirect khi auth state vẫn unknown/error. Test mới có guard budget để bắt bug mà không tự treo test runner.
- Test mới chạy **production routes/meta/redirect + auth store + HTTP interceptors**, chỉ bỏ page components và gắn failure adapter. Guard budget làm test fail hữu hạn thay vì treo runner: trước sửa **15 fail / 3 pass**, chính xác các lỗi 403/400/500/timeout/offline của ba protected URLs; 401 vốn redirect login bình thường.
- **Fix production duy nhất:** thêm `shouldBootstrap &&` vào nhánh unknown/bootstrapError redirect. Route protected vẫn bootstrap/kiểm quyền; trang fallback/public đã skip bootstrap được render, không self-redirect. Không tăng retry, không tắt guards, không xóa storage/cookie để che lỗi.
- Sau sửa, 18 matrix cases PASS, bao gồm `/account`, `/super-admin` redirect `/admin-home`, `/super-admin/dashboard`; 401 gọi một me + csrf + refresh rồi login; các lỗi còn lại chỉ một me rồi fallback. Navigation qua Login/Register/Forgot/Verify không phát sinh retry bootstrap.
- Browser failure injection tạm tại `src/api/http/client.ts`: chỉ DEV + query test, thay adapter **riêng `/auth/me` bằng error**, không fake authenticated response. 24 lần thử: 2 protected paths × 6 lỗi × 2 viewport. 401 về đúng Customer/Admin Login; còn lại tới AuthUnavailable; mỗi trace có một auth/me, bấm retry rõ ràng mới có lần thứ hai. Timeout/offline được mô phỏng bằng Axios `ECONNABORTED/ERR_NETWORK`, không cố ý ngắt API/DB hoặc chờ timeout TCP thật. Đã xóa hoàn toàn instrumentation; `git diff -- src/api/http/client.ts` rỗng. Không coi simulated status là HTTP thực trên wire.
- Expired session: helper localhost 18003 chỉ set hai JWT **đã hết hạn**, ký bằng config local, trên browser test đã logout. Desktop/mobile đều chuyển về login đúng nhóm route, không có account controls. Sau đó expire đúng hai cookie synthetic và dừng helper; không sửa user/session DB hay cookie policy app.

## CHANGED FILES / IMPACT

So với working tree đầu hotfix, chỉ có bốn file sau được bổ sung/thay đổi:

| Repo / file | Thay đổi / vì sao |
|---|---|
| Web `src/router/index.ts` | Một điều kiện `shouldBootstrap` chặn fallback tự redirect; hai dòng scroll verification của phase trước giữ nguyên |
| Web `src/router/guest-route-recovery.test.ts` | 18 integration cases với routes/store/interceptors thật, budget redirect hữu hạn, public Auth regression |
| API `src/modules/auth/auth.service.spec.ts` | Thêm ba bộ dữ liệu SYSTEM/BRANCH legacy/non-customer để chứng minh verification rule không khóa admin |
| Web `Bookora_Auth_Migration_Admin_Login_Recovery_Handoff.md` | Handoff duy nhất của hotfix |

Không có migration SQL/source Auth/seed/config/contract/generated/dependency mới trong hotfix; sử dụng migration có sẵn của phase trước. Tracing logout tạm cũng đã gỡ; wrapper logout giữ nguyên. Lần logout đầu chưa được xác nhận, không thu được mã lỗi nên không gán nguyên nhân; các lần logout/relogin sau PASS và được đối chiếu session fixture đã revoked.

GitNexus trước sửa guard: LOW, một direct caller; context ghi nhận các flow permission/landing/safe redirect. `detect_changes(compare master)` sau cùng: **Web HIGH: 16 indexed symbols / 8 flows / 22 tracked files; API HIGH: 36 / 8 / 22**. Đây là tổng working tree gồm mini phase trước và instruction files có trước, không phải hotfix phát sinh từng đó thay đổi. File test/handoff mới chưa nằm trong index HEAD; đã đối chiếu trực tiếp diff và runtime. Không stage/reindex/commit để ép tool nhận file.

## AUTOMATED VERIFY

Các nhóm có overlap, không cộng thành số test unique. Không tuyên bố đã chạy full suite của cả hai repo.

| Repo | Command thật | Kết quả |
|---|---|---|
| API | `rtk proxy npm run prisma:validate` | PASS, exit 0 |
| API | `rtk proxy npm run prisma:generate` | PASS, Prisma 7.8.0, exit 0; không nâng dependency |
| API | `rtk proxy npx prisma migrate status` trước/sau | Trước exit 1/pending một migration; sau exit 0/up to date |
| API | `rtk proxy npm run prisma:migrate:deploy` hai lần | PASS exit 0; lần đầu áp dụng đúng migration, lần sau no pending |
| API | `rtk proxy npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --script` trước/sau | Trước đúng verification delta; sau empty, exit 0 |
| API | `rtk proxy npm test -- --runInBand src/modules/auth src/modules/mail src/config/env.validation.spec.ts` | **35 suites / 400 tests PASS**, exit 0 |
| API | `rtk proxy npm run test:e2e -- --runInBand auth-hardening.e2e-spec.ts` | **1 suite / 16 tests PASS**, exit 0; Google adapter/isolation, verification, race, purpose và multi-device/refresh/replay/change/reset |
| API | `rtk proxy npm run type-check` | PASS, exit 0 |
| API | `rtk proxy npm run lint` | PASS, exit 0 |
| API | `rtk proxy npm run build` | PASS, exit 0, 516 files |
| Web | `rtk proxy npm test -- src/router/guest-route-recovery.test.ts src/router/index.test.ts src/stores/auth.store.test.ts src/pages/errors/auth-error-pages.test.ts --maxWorkers=1 --testTimeout=20000` | **4 files / 84 tests PASS**, exit 0 |
| Web | Lệnh rộng bên dưới | **12 files / 175 tests PASS**, exit 0 |
| Web | `rtk proxy npm run build` | PASS vue-tsc + Vite 6294 modules, exit 0 |
| Web | Lint | NOT AVAILABLE: repo không có script lint |
| Cả hai | `rtk proxy git -c core.safecrlf=false diff --check` | PASS, exit 0; có kiểm tra cả whitespace file mới |

```powershell
rtk proxy npm test -- src/router src/stores/auth.store.test.ts src/pages/errors/auth-error-pages.test.ts src/api/http src/api/modules/auth.api.test.ts src/components/client/auth/CustomerAuthForms.test.ts src/features/email-verification --maxWorkers=1 --testTimeout=20000
```

Expected E2E delivery 503/serialization/unique conflicts là ca lỗi có chủ đích, không phải lỗi app runtime thành công giả. Vite vẫn cảnh báo chunk >500kB, không mở rộng scope sửa bundle. OpenAPI pipeline N/A trong hotfix vì contract không đổi; các generated thay đổi nhìn thấy trong git status thuộc phase trước.

## RUNTIME / MANUAL R1–R13

Acceptance chính dùng Web **5173** → API **8000** → DB ứng dụng **bookora_db**, không thay bằng DB harness. API watch có tự reload khi build/source tests cập nhật; không kill/restart process người khác bằng tay. Hai dev servers vẫn được giữ chạy. Không đổi Turnstile, secret, cookie security hoặc ENV app. Widget tự hoàn tất; không tự giải CAPTCHA. Một lần submit quá sớm hiển thị yêu cầu xác minh bảo mật, sau widget sẵn sàng login PASS.

Ảnh ngoài repo: `C:/Users/Admin/.codex/visualizations/2026/11/19/01a1f515-9e37-7c31-a9c5-d95e5a571140/bookora-recovery-evidence/`.

| ID | Bằng chứng thực tế | Status |
|---|---|---|
| R1 | System seed form login → `/super-admin/dashboard`; `/auth/me` 200 SYSTEM/SUPER_ADMIN; `system-admin-dashboard.jpg` | PASS |
| R2 | Branch seed form login → `/branch-admin/dashboard`; me 200 BRANCH, can-tho/BRANCH_ADMIN/primary; `branch-admin-dashboard.jpg` | PASS |
| R3 | Reload cả System và Branch dashboards giữ đúng principal; protected dashboard data tải được | PASS |
| R4 | System logout → Admin Login, login lại vào dashboard; Branch logout qua AccessDenied; Customer logout → home, fixture active sessions=0 | PASS sau retest; lần đầu unconfirmed ghi riêng |
| R5 | Legacy demo đúng password cũ, required=false/verifiedAt=NULL, me 200 CUSTOMER, account render; `legacy-customer-account.jpg` | PASS |
| R6 | Fixture required=true chưa verified: form Customer chặn, không authenticated; `new-customer-unverified.jpg` | PASS |
| R7 | Backend verify consume thật → success, token xóa URL; login me 200 CUSTOMER/account; `new-customer-verified.jpg`, `verified-customer-account.jpg` | PASS |
| R8 | Prisma User/AuthSession include User smoke PASS; catalog/status/diff đúng; không missing column khi login/me | PASS |
| R9 | Guest direct `/account` → `/login?redirect=/account`; reload ổn định. Link nội bộ footer đến `/account/notifications` → đúng Customer Login. Edge **InPrivate mới do người dùng mở** cũng quan sát đúng `/login?redirect=/account`; `guest-account-{desktop,mobile}.jpg`, `guest-reload-keyboard-mobile.jpg` | PASS |
| R10 | `/super-admin` → `/admin/login?redirect=/admin-home`; child `/super-admin/dashboard` → Admin Login, không protected content; kiểm IAB desktop/mobile và Edge InPrivate; `guest-admin-{desktop,mobile}.jpg` | PASS |
| R11 | Failure adapter có kiểm soát trên chính Web 5173: 400/401/403/500/timeout/offline × account/admin × desktop/mobile; URL ổn định, trace một me, retry bằng button hữu hạn; `failure-{customer,admin}-500-{desktop,mobile}.jpg` | PASS simulated transport errors; không tuyên bố tắt DB/API thật |
| R12 | JWT hết hạn thật trong cookie test → đúng login cả hai nhóm route, desktop/mobile. CUSTOMER vào System bị access-denied; SYSTEM vào account về đúng admin dashboard; BRANCH vào System bị deny. Login/logout/deep-link và public Auth routes không ping-pong; `branch-role-mismatch.jpg`, `expired-session-mobile.jpg` | PASS |
| R13 | IAB 1440×900 và 390×844: auth/fallback/guest render, không horizontal overflow trên các view đã đo; nhập/xóa email bằng keyboard được. App-origin console cuối [] lỗi. Edge InPrivate **F12 mở DevTools được**, Sources/Console/Network mở, state Not paused; `edge-inprivate-f12.jpg` | PASS với giới hạn đo bên dưới |

Giới hạn bằng chứng: Network UI của Edge đã mở, nhưng filter/auto-switch Sources do script bên ngoài khiến không dùng panel này làm nguồn đếm request chính. Counts hữu hạn dựa vào adapter trace và integration tests; HTTP principal outcomes lấy từ trang JSON `/auth/me` thật trong browser. Không mở header/cookie panel, không export HAR chứa token. Edge có warning/error từ Cloudflare/extension; không khẳng định toàn bộ console của Edge rỗng. IAB app-origin error logs đã kiểm cuối là rỗng. Không có phép đo profiler CPU/heap đầy đủ; kết luận không freeze dựa vào navigation settle, DOM/keyboard, F12 và các lần quan sát hữu hạn. Không đổi security settings, breakpoints hay tắt extension/Turnstile để lấy PASS.

## FINAL GATE / CLEANUP / RỦI RO

- [x] Đúng DB app, backup restore được, audit migration/pending trước DDL.
- [x] Deploy thành công, schema diff empty, history migration mới thành công, deploy lặp no pending; không mất dữ liệu cũ.
- [x] System/Branch Admin browser login/me/refresh/logout/relogin đúng quyền; Customer legacy tương thích.
- [x] New Customer chưa/đã verify đúng policy; Google isolation/multi-device regression PASS. Google live không cần cho hotfix này và không chạy mới.
- [x] R9–R13 browser desktop/mobile, InPrivate sạch và F12 có bằng chứng; lỗi bootstrap không tái tạo redirect loop.
- [x] Tests/static/build/diff PASS; chỉ bốn file recovery kể trên; không commit/push/reset/clean/restore/Git write.
- [x] Gỡ adapter/tracing tạm. Cookie helper 18003 đã dừng; cookie synthetic đã dọn. Hai DB restore tạm đã drop bởi đúng helper, không drop DB app.
- [x] Fixture app mới đã disable, token used, không active session; giữ một record synthetic để audit. Không seed lại hoặc thay hash/role/verifiedAt của 26 user cũ.

Rủi ro tồn tại được giữ riêng: checksum text của authorization migration cũ không khớp disk dù structural schema đã khớp; chưa xác định provenance, cần lưu ý khi audit lịch sử/deploy môi trường khác, không sửa history để giả PASS. Không rollback migration app đã áp dụng vì đây là additive hotfix bảo toàn legacy. Backup chứa dữ liệu riêng, giữ local ngoài repo và quản lý theo quy trình backup hiện hữu.

**DONE (VERIFIED) chỉ cho hotfix recovery này.** Handoff Auth Hardening trước không được sửa status; Google live/M6 manual của phase đó vẫn theo danh sách pending cũ.

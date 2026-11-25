# Bookora — PDF Preview Hotfix — DONE (VERIFIED)

Ngày kiểm chứng: **25-11-2026, Asia/Saigon**. Customer Chrome và Branch Admin Edge đã mở PDF bằng thao tác UI thật, thấy nội dung được render, chuyển trang và zoom được. Không dùng HTTP 200 thay cho kết quả browser.

## Root cause đã chứng minh

- Đã đọc source working tree, Phase 1/2 và UI/UX Hotfix 1 handoffs. Luồng hiện hữu: private R2 → `SupportFilesService.download` kiểm tra live ticket/branch/session → authorized binary API → Axios `responseType: blob` → Blob URL → iframe sandbox.
- PDF gốc `30.7_Dieu chinh dia diem Tap huan PCGD XMC 2026_1.pdf`: **750.283 bytes**, `%PDF-1.5`, **1 trang**, không mã hóa. PDF tải qua UI có SHA-256 **`3de16dacce150ea88aaa52e94ef669422afa706dabefefcac75dd8af95aba6e7`**, trùng bản gốc Downloads; pypdf đọc được.
- Network thực tế: `Content-Type: application/pdf`, `Content-Length: 750283`, `Content-Disposition: attachment`, `Cache-Control: private, no-store`, `Content-Security-Policy: sandbox; default-src 'none'`. Frontend tạo Blob mới có MIME PDF; disposition của response không phải navigation của Blob URL.
- Native viewer vẫn lỗi trên cả Chrome/Edge trong `<iframe sandbox="allow-same-origin">`. Chromium chặn PDF plugin trong sandboxed iframe; [source Chromium](https://chromium.googlesource.com/chromium/src/+/refs/tags/145.0.7582.1/components/pdf/browser/pdf_navigation_throttle.cc) xác nhận cơ chế này. Không có exception PDF từ app trong console; thông báo chặn xuất hiện ngay trong frame.

## Fix và files changed

| File | Mục đích |
|---|---|
| Web `src/features/support/components/SupportPdfViewer.vue` | Canvas viewer PDF.js lazy-load; loading/error/retry, previous/next, zoom 50–200%, fit width; shared ScrollArea; giới hạn bitmap; hủy render, destroy worker/document và giải phóng canvas khi unmount. Không tạo lớp PDF scripting, XFA hoặc active annotation. |
| Web `src/features/support/components/SupportAttachment.vue` | Thay riêng iframe PDF bằng viewer chung cho Customer/Admin. Reauthorize mỗi lần mở và tải PDF; guard scope/abort; đóng xóa Blob reference và unmount viewer; thu hồi URL download tạm. Giữ ảnh/video/document actions và theme hiện hành. |
| Web `package.json`, `package-lock.json` | Pin `pdfjs-dist@6.5.438`; hooks chuẩn bị assets khi install/dev/build. Node hiện tại 22.22.2 đáp ứng engine. |
| Web `scripts/copy-pdfjs-assets.mjs`, `.gitignore` | Copy fonts/CMaps/ICC/decoders cùng version vào generated `public/pdfjs/`; worker do Vite đóng gói. Assets phục vụ local, không CDN. |
| Web `SupportPdfViewer.test.ts`, `SupportAttachment.test.ts` | Lifecycle/render/navigation/zoom/error; authorization lại khi download; media invalidation, URL revoke, DOCX/ZIP download regression. |
| API `test/support-files.e2e-spec.ts` | Thêm ca PDF: grant `support.read` → tải 200 → DENY cùng quyền → 404; anonymous 401; owner còn 200. Chỉ fixture biệt lập. |

API/R2/Auth/CSP/branch policy, generated contracts, realtime và Chat UI/UX khác không bị sửa. GitNexus upstream trước sửa: attachment LOW (1 importer trực tiếp), `load` LOW (3 callers), `show`/`clear` LOW; API test LOW (0 callers/processes). Aggregate `detect_changes(all)` Web MEDIUM chứa các diff Phase 1/2 có sẵn và không bao hết untracked files; không diễn giải thành zero risk.

## Browser / runtime evidence

| Kiểm chứng | Kết quả |
|---|---|
| PDF gốc trong Customer Chrome / Admin Edge | **PASS** — nội dung công văn render rõ trong dialog, không còn iframe lỗi. Ảnh trước/sau và DOM snapshots được hiển thị trong chat kiểm thử. |
| PDF QA 3 trang, 1.537 bytes, private R2 | **PASS cả hai** — Customer thấy trang 2/3 ở 125%; Admin thấy trang 3/3, next disabled ở cuối; zoom 75%, 100%, 125% đã thao tác thực. |
| Đóng/mở lại | **PASS** — viewer cũ biến mất; mở lại tải có authorization, về trang 1 và 100%, không lỗi canvas/worker. |
| Download | **PASS** — nút UI tải PDF gốc hoàn tất; bytes/hash/parser khớp như trên. Download không dùng lại Blob đã mở để bỏ qua kiểm tra quyền. |
| Responsive Customer/Admin | **PASS** — desktop; 390×844 và 320×568. Ở 320px dialog rộng 288px, `scrollWidth === clientWidth === 271`; canvas zoom được chứa trong ScrollArea. Viewport overrides đã reset. |
| Attachment regression | **PASS** — ảnh 1918×858 loaded; video 1280×720, 12,67s, `readyState=4`, `error=null`; DOCX tải 28.868 bytes, ZIP/CRC hợp lệ và có `word/document.xml`. DOCX/ZIP actions có component tests; real R2 suite kiểm tra các định dạng cho phép. |
| Console bản cuối | Không có error/warn từ origin app được ghi nhận trong hai tab khi kiểm PDF. |

## Automated checks

- Web regression: **23 files / 85 tests PASS** — Support, shared realtime, Notifications và Account Orders. Follow-up PDF/attachment: **2 files / 7 tests PASS**, bao gồm thêm hai ca DOCX/ZIP; số này có phần trùng với regression, không cộng dồn.
- Web `npm run build`: **PASS**, gồm vue-tsc và Vite. PDF library là lazy chunk ~445 KB trước gzip; worker tách riêng. Còn cảnh báo chunk lớn của ứng dụng.
- Real PostgreSQL/private R2: `support-files.e2e-spec.ts` bản cuối **6/6 PASS**; `support-file-mime.e2e-spec.ts` **3/3 PASS** trong paired run trước đó. Có foreign customer, orders-only, wrong branch, revoked assignment, revoked permission, anonymous và MIME/size/cleanup cases. Không chỉ kiểm tra HTTP trên fixture giả.
- Targeted API ESLint, Web Prettier, `git diff --check` cả hai repositories: **PASS**.
- Logs: [evidence directory](C:/Users/Admin/AppData/Local/Temp/bookora-pdf-hotfix-evidence), gồm `build-final.log`, `web-regression.log`, `pdf-targeted-final.log`, `api-files-final.log`, `api-files-tests.log`, `download-validation.json`.

## Trạng thái / dữ liệu kiểm thử

**Không còn blocker của PDF Preview hotfix.** Upload file chooser ban đầu thiếu extension permission nên PDF QA được tạo trong runtime và đưa qua API có session/CSRF hiện hành; mọi thao tác mở/chuyển trang/zoom là UI thật. Không tắt bảo vệ browser hoặc backend.

Để lại **một tin `[PDF Preview QA]`** trong hội thoại dev `01M86T22SHQQD2C7G57Q75752B` để đối chiếu: message `01M897QXRYV91BSJHZ6BQJAY8J`, attachment `01M897QXABBMRWRKJFJJSR1DEW`. Tài liệu tổng hợp không có dữ liệu cá nhân. E2E tự cleanup disposable DB/private objects của nó; không xóa hay sửa tin nhắn cũ. Không git add/commit/push/pull/reset/clean/restore; giữ các thay đổi chưa commit có sẵn.

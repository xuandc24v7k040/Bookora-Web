# Bookora AI Search & Recommendation — Phase 1 Handoff

Cập nhật 17:59:37 28/11/2026 (UTC+7 / Asia/Saigon). Tài liệu chính thức duy nhất trong repo FE. Contract: [Master Spec](C:/Users/Admin/Downloads/Bookora_AI_Search_Recommendation_Master_Spec.md), [Prompt 1](C:/Users/Admin/Downloads/Bookora_AI_Search_Recommendation_Phase1_BOUND_VERIFY_DONE_Prompt.md), [Recovery continuation](C:/Users/Admin/Downloads/Bookora_AI_Phase1_G1_Recovery_Continuation_Prompt.md). Bản NO-GO cũ nguyên vẹn: [original-no-go-handoff.md](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/original-no-go-handoff.md).

## 1. Final verdict

**DONE (VERIFIED — P1 FOUNDATION & SEARCH).** P1 hoàn thành theo các mẫu kiểm chứng dưới đây; toàn bộ AI phase và P2 chưa hoàn thành. Feature mặc định OFF; actual Owner .env được giữ nguyên. Không commit/push, deploy hay mở P2.

| Gate | Verdict | Evidence chính |
|---|---|---|
| G0 PREFLIGHT / baseline | PASS | Cùng HEAD, public catalog thật 32, snapshot d44fc6…; baseline gốc trước integration; bổ sung 9 filter combinations, Cart, Checkout preview, 2-session Realtime, concurrency5. [preflight.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/preflight.json), [g0-additional-baseline.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/g0-additional-baseline.json). |
| G1 bounded recovery | PASS | 96 query đã freeze, 48 calibration / 48 untouched heldout; một final heldout; NDCG gain +0.219244, P@5 +0.05, 0 semantic-only OOD additions. [selection-frozen.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/selection-frozen.json), [heldout-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/heldout-final.json). |
| G2 correctness / foundation | PASS | Final compiled API 55 checks; OFF parity115; filters/sorts/facets/page91; freshness22 + volatile4; exact hydrate race; actual timeout, overload, DB error semantics. |
| G3 browser / performance / protected | PASS | B01–B12 kết hợp artifacts hợp lệ, actual Chrome/CDP/API/DB/model; 22 A/B/C groups đạt frozen targets sau các lượt lấy mẫu cố định và gộp đầy đủ. Các lượt fail trước được giữ và giải thích ở §8. |
| G4 scope / handoff / cleanup | PASS | Build/checks PASS, owner files/hash bảo toàn, QA DB đã drop khi connections=0, không còn QA listener/embedding orphan, một handoff, P2 reuse DI PASS. |

Đây là acceptance trên snapshot và hardware đã đo, không phải cam kết accuracy hay latency tuyệt đối cho mọi catalog/workload.

## 2. PREFLIGHT và source audit

| Hạng mục | Actual finding |
|---|---|
| BE | D:/CTU/CT466E/bookora-api/bookora-api; master; HEAD 775aeb6f91996d0e79deea1131aeb0792888b5a4 |
| FE | D:/CTU/CT466E/bookora-web/bookora-web; master; HEAD f0349d590b0ae53625a4240c46f56dfb2a520172 |
| Owner edits | AGENTS.md và CLAUDE.md ở cả hai repo đã dirty trước task. Hash hiện tại bằng preflight. Không reset/stash/checkout/rebase. |
| Máy | Windows11 / 10.0.26200; i5-10210U, 4 cores / 8 logical CPUs; RAM 8,395,124,736 bytes. Node22.22.2, npm10.9.7. |
| Headroom | Recovery preflight free1.74GB; một sample khi Chrome đang mở còn khoảng650MB. Sau cleanup free 2.41GiB. Không load hai model cùng lúc. |
| DB / safety | Owner localhost/bookora_db chỉ read-only audit. Clone stream pg_dump → pg_restore thành bookora_ai_recovery_qa_20261128, không lưu customer SQL dump. Mutations/test accounts chỉ ở QA. |
| Catalog | 32 public Products theo đầy đủ publicProductVisibilityWhere, không chỉ ACTIVE. Count32 không phải hard limit: F01 đã tạo public Product33, index nhận rồi xóa đúng. |
| Snapshot | SHA256 d44fc6d4e94c3b0ba7af12c24b94d1a08c1e48d9e6391b358628a94d2fe41df6. QA trước benchmark và Owner read-only sau task vẫn khớp public semantic/identifier metadata. |

Paths trong bảng sau tương đối với BE/FE roots ở trên; method là reference để tránh line-number drift.

| ID | Actual source / method | FOUND / KEEP / GAP → action / verify |
|---|---|---|
| S01 | BE src/modules/storefront-catalog/storefront-catalog.controller.ts / storefront-catalog.service.ts / storefront-catalog.repository.ts; products/list/listProductPage | KEEP existing endpoint/envelope/DTO. Gắn candidate union ở repository; API55/OFF115/contract185paths. |
| S02 | repository.searchProductMatches; migration20260807103000_storefront_search_extensions | KEEP SQL unaccent/trgm/normalize; internal ranks0–7. isBestMatch chỉ <=3. Bảo vệ ranks0–3,5,6; identifier-shaped no-match giữ SQL. |
| S03 | repository.listWhere/priceWhere/listOrderedProductIds/listFacets | KEEP full filtered set, explicit sorts, facets/count trước pagination. Matrix91 checks. |
| S04 | storefront-product-visibility.ts; publicProductSelect; StorefrontPriceService | Predicate shared giữ active Product, active category/parent, active default variant, primary general image. Hydrate lại visibility cho AI-enabled Search, kể cả exact/strong; retry SQL tối đa1. OFF/no-q giữ path gốc. |
| S05 | repository.listHomeCandidates/listSearchSuggestions/completedSalesByProduct; service.home | KEEP optimized Home/suggestions. Protected body hashes bằng HEAD; no inference/AI projection. |
| S06 | repository.listRelatedProductIds; service.relatedProducts; FE RelatedProductsSection.vue | KEEP legacy structured5/4/3/2/1 + ties/fallback, max3. Không AI Related trong P1. |
| S07 | Products/Authors/Categories/Publishers/ProductMedia mutation repositories | GAP Product.updatedAt không bao hết relation rename. Dùng read-side committed projection, content+relation fingerprints, prepublication find. CRUD/race/rollback thực trên QA. |
| S08 | Actual catalog.json, document-audit.json | 2 Product thiếu cả short/long description; test/manual text và author mismatches tồn tại. Không sửa Owner metadata để đạt gate. |
| S09 | FE ClientHeader.vue; LiveSearchPanel.vue; search history | KEEP SQL suggestions, debounce/keyboard/history/submit. Chỉ đổi empty copy để không kết luận full Search rỗng. |
| S10 | FE BookListPage.vue; use-product-filters.ts; storefront-api.ts | KEEP /san-pham?q=…, URL/sort/page/filter. GAP old placeholderData có thể giữ cards của query trước → chỉ giữ khi q không đổi; unit2 + browser rapid search. /search placeholder không đổi. |
| S11 | FE HomePage/BookDetailPage/ProductCard/RelatedProductsSection/RecentlyViewed | KEEP theme/cards/history/variant/availability. Actual widths1440/1024/768/390/320, Wishlist/detail/history, variant và Cart/Buy Now. |
| S12 | Wishlist userId_productId; Order/Payment; use-recently-viewed | Audit P2 only. Future purchase signal cần COMPLETED + PAID; completed-sales popularity hiện hữu không thay thế điều kiện PAID. |
| S13 | Config/env, Nest SWC+tsc-alias, package scripts, Orval/Zod, Commerce/Realtime | Safe OFF flag, compiled child path/manifest asset, offline provision, dev-watch actual startup. DTO/generated/schema/production protected modules không đổi. |

GitNexus upstream listProductPage: LOW,2 direct callers (service.list và newest test), controller gián tiếp; searchProductMatches LOW,2 callers. Repository/module impacts MEDIUM trong preflight. New AI symbols chưa indexed nên trả UNKNOWN, được review source + tests. Final detect_changes báo LOW,0 grouped processes; không coi số0 này là bằng chứng không có ảnh hưởng. Các symbol Home/suggestions bị graph đánh dấu touched do hunk/line drift có body hash không đổi: [source-scope-audit-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/source-scope-audit-final.json), [gitnexus-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/gitnexus-final.json).

## 3. Decision Lock và exact scope

DL01: một pinned local model, shared singleton process/index. DL02: automatic hybrid trên list hiện hữu, bảo toàn strong SQL. DL03: typing suggestions không inference. DL04–06: Related max3, Personalized max5 và viewed/wishlist/COMPLETED+PAID chỉ là contract P2; chưa triển khai. DL07: Search public, guest/customer parity; không đọc private signals. DL08: chưa tạo personalized fallback/section. DL09: không schema/migration/tracking. DL10: fingerprint content/relation + committed reads/race protection. DL11: không API key/external inference/Redis/pgvector/Python/AI HTTP server. DL12: reuse green UI, hai surgical FE changes. DL13: actual model/API/DB/CDP/performance/protected evidence dưới đây.

| Changed file(s), relative root | Lý do |
|---|---|
| BE src/modules/ai/ai.module.ts | DI shared providers; export projection/index/embedding cho future consumer. |
| BE src/modules/ai/ai.types.ts; model-files.json | Pinned model/document identity,384dims,.845 gate, resource budgets/checksums. |
| BE src/modules/ai/ai-catalog.repository.ts | Minimal current public semantic projection; không lấy price/stock/customer graph. |
| BE src/modules/ai/semantic-document.ts | Generic extractive/token-budget representation + deterministic fingerprint, giữ HTML source boundaries trong fingerprint. |
| BE src/modules/ai/vector.ts | Finite/dim/L2 validation và cosine. |
| BE src/modules/ai/embedding.worker.ts | Native CPU inference trong internal child process, checksum/offline/token checks. |
| BE src/modules/ai/embedding.service.ts | One process, async load, FIFO cap5, query1s/document5s deadlines, hard kill/fallback/shutdown. |
| BE src/modules/ai/product-vector-index.service.ts | In-memory valid vectors, reconcile/repair/single-flight/stale completion protection. |
| BE src/modules/ai/semantic-search.service.ts | Eligibility, protected SQL, valid snapshot, threshold/fusion; SQL while building. |
| BE src/modules/ai/*.spec.ts (4 files) |23 focused tests về document/fingerprint/vector/eligibility/cache/race/lifecycle/queue/error. |
| BE src/modules/storefront-catalog/storefront-product-visibility.ts | Extract nguyên public predicate để share, tránh circular import. |
| BE src/modules/storefront-catalog/storefront-catalog.repository.ts + storefront-catalog.module.ts | Optional semantic seam/internal rank, full candidate union và authoritative hydration; import AiModule. |
| BE src/config/ai.config.ts, env.keys.ts, index.ts | Register flag/path, safe boolean validation. |
| BE .env.example/.env.production.example/.env.test.example | Safe defaults false + local model path; actual .env không đổi. |
| BE nest-cli.json, .gitignore | Copy model manifest vào compiled dist; ignore local model artifacts. |
| BE package.json/package-lock.json | Pin @huggingface/transformers3.8.1 và compatible native dependencies. |
| BE scripts/provision-ai-model.mjs, docs/ai-search.md | Verify/copy/download pinned artifacts; offline/dev/prod/reuse instructions. |
| FE src/features/storefront/components/LiveSearchPanel.vue | “Chưa có gợi ý nhanh phù hợp.” + chỉ dẫn Enter/nút tìm kiếm. |
| FE src/features/storefront/api/storefront-api.ts; storefront-products-query.test.ts | Clear misleading previous-query cards; typed API vẫn generated;2 regression tests. |
| FE handoff này | One official result/evidence/continuation contract. |

AGENTS.md/CLAUDE.md dirty là Owner edits được giữ nguyên. Không có DTO/controller/generated API/migration/P2 production file change. Không có new FE dependency.

## 4. Model, document và quality

Xenova/multilingual-e5-small, revision761b726dd34fb83930e26aab4e9ac3899aa1fa78, MIT, q8 ONNX CPU,384dims, mean pooling + L2. @huggingface/transformers3.8.1 / onnxruntime-node1.21.0. query:/passage: prefixes; actual tokenizer max512 kể cả prefix/special tokens. Remote fetch disabled và bị reject trong worker; runtime không provision/download.

| Artifact | Bytes | SHA256 |
|---|---:|---|
| config.json | 658 | cb99455288675345e1a4f411438d5d0adbba5fbd3a67ea4fb03c015433b996c1 |
| tokenizer.json | 17082730 | 0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39 |
| tokenizer_config.json | 443 | a1d6bc8734a6f635dc158508bef000f8e2e5a759c7d92f984b2c86e5ff53425b |
| special_tokens_map.json | 167 | d05497f1da52c5e09554c0cd874037a083e1dc1b9cfd48034d1c717f1afc07a7 |
| onnx/model_quantized.onnx | 118308185 | f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193 |

Canonical cũ truncation13/32, max2276tokens. Compact mới0/32 truncation, max508. Winner allocated0/32, max364, mean215.28tokens. Budgets name64/category48/short96/body232/authors32/publisher24, final prefix/special-aware fit512. Dedup và extractive generic rules, bỏ biography/sales boilerplate; không sinh nội dung, không tailor query/label. [document-audit.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/document-audit.json), [documents.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/documents.json), [production-document-parity.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/production-document-parity.json) chứng minh compiled builder byte-identical winner trên32 actual products sau tối ưu tokenizer.

96 queries =48 calibration /48 heldout; mỗi split12 negatives. Labels0/1/2 từ actual catalog trước inference, **agent manual labels, chưa Owner review**. P@5 denominator5, Recall@10 grade>=1, graded NDCG gain2^grade−1; empty relevant sets tách OOD. Leakage audit exact/near-duplicate, rubric/rationale/hash/timestamps lưu trước tuning; drafts trước freeze giữ nguyên. [protocol.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/protocol.json), [calibration.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/calibration.json), [heldout.sealed.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/heldout.sealed.json), [leakage-audit.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/leakage-audit.json), [pre-calibration-freeze.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/pre-calibration-freeze.json).

Bounded search:3 representations tổng cộng,3 gate families;1881 configs tái sử dụng embeddings,369 feasible. Objective ưu tiên gate đơn giản rồi NDCG/P@5. Winner **allocated + G-A absolute cosine>=0.845**, freeze trước khi mở final heldout. Calibration semantic20: NDCG0.105082→0.737290; P@5 0.03→0.25;12 OOD không thêm semantic-only. **Final heldout chạy một lần**; các API replays sau chỉ verify parity với output đã freeze, không tuning/evaluate một winner mới.

| Heldout group | n | SQL → hybrid NDCG@10 | SQL → hybrid P@5 | Semantic additions |
|---|---:|---|---|---:|
| exact | 4 | 1.0000 → 1.0000 | 0.2000 → 0.2000 | 0 |
| identifier | 3 | 1.0000 → 1.0000 | 0.1333 → 0.1333 | 0 |
| lexical | 1 | 1.0000 → 1.0000 | 0.2000 → 0.2000 | 0 |
| semantic | 24 | 0.0761 → 0.2953 | 0.0167 → 0.0667 | 19 |
| ood | 12 | n/a → n/a | 0.0000 → 0.0000 | 0 |
| mixed | 4 | 0.0000 → 0.3710 | 0.0000 → 0.1000 | 3 |

Semantic24: gain **+0.219244**, P@5 gain **+0.05**, Recall@10 0.0625→0.3125; Hit@1 0.0833→0.25; MRR0.0833→0.2917. OOD: **0 failing queries /12,0 unrelated semantic-only additions**;3 negative queries/3 product-results do legacy SQL vẫn giữ nguyên. Exact/identifier/strong lexical parity; valid identifiers Hit@1 **2/2**,1 nonexistent identifier vẫn empty.

**Limits cần Owner biết:** semantic P@5 tuyệt đối chỉ0.0667 và NDCG0.2953; nhiều semantic needs vẫn miss, và positive semantic queries có unrelated additions.0 OOD quan sát trên12 queries không phải100% accuracy. Ví dụ query “bốn mươi bài viết từ chuyên mục Cảm thức” trả9 cards, chỉ leading relevant hit không khiến cả9 đều đúng. Metadata nên được Owner chỉnh riêng: Chuyện Tình Thị Trấn Manual10B và Bút bi Thiên Long FO-024 Manual10B thiếu mô tả; ReLIFE/Coco Wyo gắn Antoine de Saint-Exupéry, Chú Thuật gắn J.K.Rowling lệch nội dung. Không sửa Owner DB trong task.

Item-item sanity toàn32 anchors: Jobs↔Musk, Marketing↔StoryBrand có useful neighbors; Hail Mary↔ReLIFE và calculator↔sách còn lạc chủ đề. [item-item-sanity.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/item-item-sanity.json). Đây là diagnostic shared vectors, **không phải P2 sign-off**.

Lịch sử giữ nguyên: E5 canonical cũ NDCG0.0701→0.7166 nhưng2 false additions trên1/6 OOD (FAIL). MiniLM corrected128tokens gain+0.5266 nhưng6 additions trên1/6 OOD (FAIL). Run MiniLM có max_length bị ignore là INVALID; không dùng để acceptance. Heldouts cũ khác nhau nên không dùng để xếp hạng trực tiếp hai model. Recovery không thử model thứ ba.83 old artifacts +5 pinned E5 files được hash lại PASS: [final-integrity.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/final-integrity.json).

## 5. Implementation contracts

AiModule sở hữu một EmbeddingService/child process và ProductVectorIndex. Process không có listener/server/deployment riêng. Load/warmup async ngoài Commerce readiness; missing/corrupt/model error/invalid vector/deadline → SQL. Unavailable giữ degraded đến restart, không retry storm. Cap5 gồm active+queued; inference concurrency1, native intra2/inter1. Query deadline1000ms gồm waiting; document nền5000ms gồm waiting. Timeout kill process, resolve callers/fallback, không để native tasks tích lũy. Shutdown chờ exit.

Canonical projection gồm Product ID/name/shortDescription/description, author names, active category/parent names và publisher name. Fingerprint có model/repr/quant/pooling/prefix identity và content/relation values, sorted deterministic; full NFC HTML description để không bỏ sót paragraph-boundary changes. Không dùng Product.updatedAt làm sole signal; không embed price/stock/rating/discount/identifier/private data. Không persistence/index file.

Eligible fresh read lấy committed projection, reconcile/invalidate missing/stale/non-public vectors. Repair tuần tự, một batch/single-flight; trước publish lại find current source/fingerprint/visibility/desired version. Read sequence và stale completion không được overwrite thế hệ mới. Khi đang build/repair, request dùng SQL ngay; không quét lại metadata/queue query thừa. Khi đủ snapshot mới embed query và confirm current projection trước rank. Fresh post-commit request không trust detected stale vectors; overlap có thể fallback. First eligible query sau cold start dùng SQL trong lúc build; cùng q có thể còn cached SQL/empty đến60s nếu không tạo fresh HTTP. Đây là suy luận từ staleTime hiện hữu và fallback đã đo, không phải test UI cold-cache riêng. Browser cache hiện hữu60s vẫn có thể phục vụ cached result; không hứa tự realtime-invalidate mọi tab sau Admin edit. B09 dùng fresh HTTP.

Eligibility bảo vệ rank0–3,5,6 và numeric/ASCII identifier-shaped queries; meaningful short queries vẫn có thể eligible. Cosine>=.845, deterministic ID tie, semantic IDs rồi legacy IDs, distinct; không ép đủ topK/loại legacy false positives. Union đầy đủ trước canonical filters/sort/count/facets/page. Giá/rating/image/availability theo current DB/service. AI-enabled q search rechecks canonical where tại hydrate (hybrid và exact/strong), retry SQL tối đa1 khi candidate biến mất. No-q/OFF giữ path gốc. Natural-language budget/negation không là hard filter; explicit controls là authority. Public DTO không có score/vector/debug.

## 6. Config và reproducible setup

Actual credentials/.env không thay đổi. Defaults: SEMANTIC_SEARCH_ENABLED=false; AI_MODEL_PATH=.local-models/e5-small, relative path resolve từ BE cwd. Binary/cache/evidence ngoài repo; default provision destination đã gitignore. Source instructions: [docs/ai-search.md](D:/CTU/CT466E/bookora-api/bookora-api/docs/ai-search.md).

Trong BE working directory, ví dụ PowerShell (không paste credentials):

~~~powershell
rtk npm ci
rtk proxy node scripts/provision-ai-model.mjs --from 'D:/CTU/CT466E/bookora-ai-qa-20261128/models/e5-small'
# Hoặc bỏ --from để tải đúng pinned public revision và kiểm SHA256.
$env:AI_MODEL_PATH='D:/CTU/CT466E/bookora-ai-qa-20261128/models/e5-small'
$env:SEMANTIC_SEARCH_ENABLED='false'
rtk npm run build
rtk npm run start:prod
# Dev dùng: rtk npm run start:dev
# Enable trong process được Owner chọn: $env:SEMANTIC_SEARCH_ENABLED='true', rồi restart.
~~~

Không enable trong Owner .env tự động. Khi OFF không load model/inference/AI projection; khi ON thiếu files core vẫn boot/Search SQL. Model provision verify5 files mỗi startup; sau provision inference offline được thực thi. Dev-watch trên loopback8105 đã actual boot và chạy compiled worker đến model-file-failure qua IPC, Search200: [dev-start-check.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/dev-start-check.json). Dist asset/path và compiled runtime đã chạy với real model.

QA command provenance: runtime.cjs clone; manage-final.cjs + serve-final.cjs; infer-calibration.mjs → calibrate.mjs → evaluate-heldout.mjs (one attempt); final-runtime-checks.cjs / visibility-final-validation.cjs; browser-final.mjs / browser-admin-freshness.mjs / browser-protected.mjs / browser-variant.mjs / failure-browser.mjs; benchmark-final.cjs / benchmark-repeat.cjs / final-home-repeat.cjs. Scripts ghi wx để giữ evidence; không chạy đè archive cũ. Muốn rerun cần thư mục evidence mới và QA DB/ports được kiểm tra. A đã là process live pre-edit; runtime.cjs serve trên dist hiện tại sẽ load final source, **không tái tạo A gốc**. Tái tạo A phải dùng source export/isolated checkout tại BE HEAD775aeb6… với lockfile tương ứng; không reset Owner checkout. Không rerun final heldout để tune.

## 7. VERIFY — Q / A / F / R / B

| Matrix | Status / actual scope | Evidence |
|---|---|---|
| Q Quality/Labels/OOD/Exact/Shared/Resource | PASS theo frozen metrics, limitations ở §4; actual offline CPU embeddings,384 finite/L2, tokens<=512 | [heldout-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/heldout-final.json), [resource-probe.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/resource-probe.json), [item-item-sanity.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/item-item-sanity.json) |
| A01–A03 | OFF115 exact canonical responses, ignore timestamp only; ON55 gồm48 frozen queries, exact/identifier no AI,32 vectors/load1 | [off-parity-visibility-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/off-parity-visibility-final.json), [on-correctness-visibility-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/on-correctness-visibility-final.json) |
| A04–A07 |91 actual HTTP/PG checks:12 filter combinations×7 sorts, price/category/parent/author/NXB/attribute/sale/upcoming/combined, stable facets/count/pages,6 invalid DTO400 | [api-matrix-visibility-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/api-matrix-visibility-final.json) |
| A08–A12 | canonical visibility/hydration, current price/rating/image, guest/customer parity, unchanged Home/Related/detail/availability; exact race bổ sung | [exact-visibility-race.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/exact-visibility-race.json), browser/variant và API evidence |
| F01–F05 | Create33/delete; name/short/HTML/description; author/category/parent/NXB rename kể cả Product.updatedAt không đổi; relation change; product/default variant/media/category/parent visibility | [freshness-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/freshness-final.json) (22 cases toàn bộ F matrix) |
| F06 | price/release0 recompute; stock/rating/coupon/flash0 recompute, restore QA | [freshness-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/freshness-final.json), volatile-freshness-*.json |
| F07–F11 | rollback0; actual held old publication discarded; concurrent stable no full rebuild; restart32; hydrate hide race hybrid và exact | [freshness-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/freshness-final.json), [exact-visibility-race.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/exact-visibility-race.json), cold/on correctness traces |
| Attribute fingerprint | N/A included-attribute rename: attributes không nằm trong semantic doc; attribute filter vẫn canonical và đã test. | ai-catalog projection / matrix91 |
| R01–R03 | OFF+missing0load; ON missing degraded/core200; actual local inference với network blocked trong worker | [failure-browser-1795860579296.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/failure-browser-1795860579296.json), POC remoteAttempts0 / worker source |
| R04/R08 | reject NaN/wrong dim/exception unit; foreground DB failure unit + injected projection failure qua real API trả500 đúng, following browse200 |23 AI unit tests; [final-burst-and-db-error.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/final-burst-and-db-error.json) |
| R05 | Actual native query timeout~1011ms, owning model PID exited, core PID giữ và200; actual cap20→5 inference/15 fallback, drained/ready; queue waiting deadline unit | [final-timeout-check.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/final-timeout-check.json), [final-burst-and-db-error.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/final-burst-and-db-error.json) |
| R06/R07 | Cold app ready-before-model trace, protected browser during index build/query;1415 eligible requests200, model1/doc32/query5, no failure/timeout; shutdown/restarts/dev/compiled and orphan cleanup | [cold-protected-start-1795860964268.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/cold-protected-start-1795860964268.json), [browser-protected-1795860966284.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/browser-protected-1795860966284.json), [cleanup-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/cleanup-final.json) |
| B01–B07 | Real Home/header exact/no-dấu, semantic empty SQL suggestions Enter + button, identifier/typo/suggestion click, filters/sort/page/refresh/back/forward, OOD empty, rapid A→B,5 widths | [browser-final-1795860343199.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/browser-final-1795860343199.json); screenshots browser-1795860343199-*.png |
| B08 | Real UI SQL fallback khi timeout, OFF+missing và ON missing; no indefinite skeleton/pageerror | [failure-browser-1795860531475.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/failure-browser-1795860531475.json), [failure-browser-1795860579296.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/failure-browser-1795860579296.json) |
| B09 | Actual Admin PATCH payload + committed value checked; fresh public request, fingerprint changed/recompute1; restored | [browser-admin-1795860465076.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/browser-admin-1795860465076.json) |
| B10 | Guest/customer same IDs; detail/Wishlist/user history isolation; actual stocked variant “Bìa cứng” click và Cart qty1, no AI inference/projection | [browser-final-1795860343199.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/browser-final-1795860343199.json), [browser-variant-1795862196572.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/browser-variant-1795862196572.json) |
| B11/B12 | Real Home/detail/branch availability under AI load; Cart qty2/Buy Now exact2/UI Checkout preview201;2 actual contexts nhận support message/WebSocket | [browser-protected-1795860966284.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/browser-protected-1795860966284.json) |

Chrome158.0.8127.37, controlled headless full CDP/Playwright driving real FE5175 → Nest8104 → QA PostgreSQL + local model, không mock API. Valid browser artifacts console/pageerrors0; screenshots được nhìn kiểm tra desktop semantic và320px: [semantic](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/browser-1795860343199-semantic.png), [320px](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/browser-1795860343199-responsive-320.png). Support2-context render delivery 186.33 / 279.38ms trong lượt cold/index stress.

Automated: BE full125 suites/1022 tests PASS sau visibility guard; metadata export projection được build/lint và DI-test riêng sau đó; AI+Catalog targeted8 suites/61 tests PASS; relevant e2e14 suites/135 tests +8 suites/62 tests =22 suites/197 distinct tests PASS. Storefront final rerun3 suites/25 tests PASS. FE full236 files/1215 tests PASS và targeted query regressions2 PASS. FE build bao gồm vue-tsc; không FE lint script trong package. BE build, Prisma validate, docs:contract PASS; FE39 generated Zod files/282ulid()/0 forbidden PASS. Runtime OpenAPI185paths exact parity, không generated churn: [openapi-current-final-parity.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/openapi-current-final-parity.json).

| Final command | Exit | Log |
|---|---:|---|
| rtk npm test -- --runInBand | 0 | [check-beunit-1795862245203.log](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/check-beunit-1795862245203.log) |
| rtk npm run type-check | 0 | [check-betype-1795862326020.log](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/check-betype-1795862326020.log) |
| rtk npm run lint | 0 | [check-belint-1795862352126.log](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/check-belint-1795862352126.log) |
| rtk npm run test:e2e -- --runInBand --testPathPatterns=storefront | 0 | [check-bestorefront-1795862400281.log](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/check-bestorefront-1795862400281.log) |
| rtk npm run build (BE; SWC598 files + tsc-alias) |0| executed sau final formatting và module export |
| rtk npm run build (FE; vue-tsc + Vite) |0| [check-febuild-1795859779452.log](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/check-febuild-1795859779452.log) |
| rtk npm test -- --run --maxWorkers=1 (FE) |0| [check-feunit-1795859261149.log](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/check-feunit-1795859261149.log) |
| rtk npm run verify:generated-zod |0| [check-fecontract-1795859903805.log](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/check-fecontract-1795859903805.log) |
| relevant BE e2e135 + protected62 |0| [check-bee2e-1795859239076.log](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/check-bee2e-1795859239076.log), [check-beprotected-1795861597584.log](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/check-beprotected-1795861597584.log) |

Protected scope gồm auth/ACL/multi-device, catalog/SQL, Wishlist/Recently Viewed/Reviews, Cart/Checkout/quotas/coupons/inventory, shipping/payment state logic, Membership và Order/Promotion notifications/Support. Live external VNPay sandbox card/Return/IPN và GHN service **NOT RUN**; không ép charge/shipment hay sửa credentials. State/revalidation regression coverage dùng existing tests/QA doubles theo repo. Không coi đây là full historical manual acceptance của mọi phase. FE build có existing large-chunk warning, không sửa unrelated bundling. pg client concurrent-query deprecation warning có trong e2e, không có test fail.

## 8. Performance và iteration integrity

A = original pre-edit compiled process8102; B = final source OFF8103; C = final source ON8104, real model. Cùng QA snapshot/hardware/runtime mode, stable routes/params; order A/B/C ↔ C/B/A alternation, no mutation trong benchmark. Final policy freeze trước samples:100 mỗi mode/group/concurrency,10 warmups; Checkout10 mỗi concurrency vì limit30/min (10warmup+10+10=30/process). Home concurrency5 có một fixed repeat200, gộp đầy đủ100+200=300; không bỏ mẫu/best-run selection, không lấy thêm sau verdict này. Errors0 cho mọi sample dưới đây. Mỗi ô là **P50 / P95 / max, ms**.

| Scenario | Concurrency | n / mode | A | B | C | Errors | Verdict |
|---|---:|---:|---|---|---|---:|---|
| exact | 1 | 100 | 22.59 / 32.60 / 38.83 | 24.64 / 32.06 / 39.25 | 26.13 / 34.13 / 46.61 | 0 | PASS |
| exact | 5 | 100 | 63.56 / 103.90 / 113.01 | 69.03 / 113.19 / 116.38 | 69.83 / 106.02 / 121.34 | 0 | PASS |
| identifier | 1 | 100 | 16.88 / 22.58 / 26.54 | 17.27 / 20.40 / 28.77 | 18.19 / 24.08 / 25.95 | 0 | PASS |
| identifier | 5 | 100 | 49.05 / 59.18 / 62.29 | 47.81 / 57.99 / 62.12 | 52.99 / 63.17 / 72.59 | 0 | PASS |
| short | 1 | 100 | 15.58 / 18.25 / 20.73 | 15.77 / 19.50 / 30.20 | 17.24 / 19.95 / 32.85 | 0 | PASS |
| short | 5 | 100 | 45.56 / 50.37 / 55.71 | 45.68 / 49.44 / 49.86 | 47.60 / 51.59 / 52.17 | 0 | PASS |
| semantic | 1 | 100 | 10.23 / 12.48 / 14.84 | 10.30 / 12.77 / 15.72 | 48.49 / 58.33 / 77.68 | 0 | PASS |
| semantic | 5 | 100 | 19.04 / 26.04 / 45.58 | 18.47 / 24.22 / 29.57 | 133.28 / 182.77 / 215.55 | 0 | PASS |
| suggestions | 1 | 100 | 19.50 / 23.24 / 42.99 | 19.80 / 24.34 / 27.12 | 19.54 / 23.41 / 32.82 | 0 | PASS |
| suggestions | 5 | 100 | 49.32 / 103.15 / 133.69 | 51.22 / 70.95 / 148.10 | 47.38 / 55.20 / 61.84 | 0 | PASS |
| browse | 1 | 100 | 14.98 / 20.92 / 25.24 | 15.23 / 20.79 / 25.84 | 14.71 / 18.98 / 26.31 | 0 | PASS |
| browse | 5 | 100 | 52.81 / 60.36 / 64.61 | 54.74 / 62.89 / 73.58 | 53.70 / 65.69 / 66.24 | 0 | PASS |
| home | 1 | 100 | 14.92 / 24.48 / 31.31 | 14.74 / 22.84 / 27.04 | 14.69 / 21.37 / 26.76 | 0 | PASS |
| home | 5 | 300 | 47.46 / 79.75 / 96.93 | 52.45 / 79.82 / 120.63 | 54.50 / 87.13 / 123.52 | 0 | PASS |
| detail | 1 | 100 | 8.17 / 10.09 / 12.45 | 8.36 / 10.76 / 13.96 | 8.09 / 10.64 / 12.47 | 0 | PASS |
| detail | 5 | 100 | 24.72 / 29.05 / 30.31 | 25.27 / 30.06 / 30.99 | 25.66 / 28.58 / 32.41 | 0 | PASS |
| related | 1 | 100 | 19.90 / 22.35 / 25.48 | 20.12 / 23.96 / 26.32 | 19.89 / 23.59 / 25.63 | 0 | PASS |
| related | 5 | 100 | 49.51 / 54.18 / 54.83 | 48.11 / 57.07 / 59.57 | 47.61 / 55.31 / 55.58 | 0 | PASS |
| cart | 1 | 100 | 10.49 / 15.31 / 19.09 | 10.81 / 16.85 / 27.11 | 10.77 / 14.81 / 20.94 | 0 | PASS |
| cart | 5 | 100 | 39.44 / 61.18 / 67.41 | 37.93 / 54.78 / 58.07 | 39.62 / 65.01 / 70.14 | 0 | PASS |
| checkout | 1 | 10 | 12.12 / 20.77 / 20.77 | 13.37 / 23.38 / 23.38 | 12.59 / 20.00 / 20.00 | 0 | PASS |
| checkout | 5 | 10 | 44.06 / 46.24 / 46.24 | 46.34 / 48.67 / 48.67 | 41.15 / 42.49 / 42.49 | 0 | PASS |

Warm semantic C: P50/P95 **48.49/58.33ms** (c1), **133.28/182.77ms** (c5), đều dưới300/800ms. Frozen fast tolerance max(10%,10ms), áp cho cả p50/p95 B−A và C−A;22 groups PASS ở final combined summaries. Home c5 final C−A p95=7.38ms, không inference/AI metadata reads. Không diễn giải noise của unchanged endpoints thành speedup.

Lịch sử measurement được giữ nguyên, không tô xanh retroactively: first30-sample source trước exact visibility recheck có4 p95 fail; bổ sung100 gộp130 vẫn fail exact c1 (C45.13 vs A29.86). Final source thêm exact visibility recheck vì correctness, không tuyên bố nó gây performance improvement. Final100-per-group run chỉ fail Home c5 (B68.87/C60.32 vs A49.45); một repeat200 đã khai báo trước, gộp300 cho kết quả A79.75/B79.82/C87.13 PASS. All raw samples gồm failed runs: [benchmark-final-1795861061465.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/benchmark-final-1795861061465.json), [benchmark-repeat-1795861115175.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/benchmark-repeat-1795861115175.json), [visibility-final-benchmark-policy.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/visibility-final-benchmark-policy.json), [benchmark-visibility-final-1795862003021.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/benchmark-visibility-final-1795862003021.json), [final-home-repeat-policy-1795862076971.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/final-home-repeat-policy-1795862076971.json), [final-home-repeat-1795862076971.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/final-home-repeat-1795862076971.json). Điều kiện noise/GC/OS của máy local có ảnh hưởng; không tăng tolerance sau fail.

Native thread termination từng làm QA runtime thoát; implementation cuối dùng process để containment. Document build1s từng timeout dưới cold Chrome/load; giảm repeated metadata reads trong repair rồi tách bounded background5s, giữ interactive1s và HTTP gates. Final cold protected run model1/doc32/query5,0 failure/timeout PASS. Không coi các lượt thread/deadline cũ là pass của final implementation. Freshness first fixture thiếu weightGram; race harness nhầm event history cũ; B09 harness fill trước hydration; B11 harness đợi POST thứ hai dù Buy Now reuse cart; B12 selector trúng cả preview và message. Các log fail giữ nguyên; sửa harness có expected/actual checks, rerun hợp lệ. Không sửa heldout hoặc gate để chữa các lỗi này.

| Resource / timing | Actual scope / result |
|---|---|
| Final compiled cold model load | 4092.81ms; lượt khác2117ms/2985ms. Core ready async, không phải HTTP warm latency. |
| Final32 vector build | 15295.06ms; một lượt khác9086.77ms. Tạm SQL khi build, không trả stale vectors. |
| Production query adapter elapsed | n=331, p50/p95/max=9.68/45.60/86.32ms; gồm IPC/queue, không gọi là pure ONNX hoặc HTTP. |
| Production document adapter elapsed | n=32, p50/p95/max=442.64/1546.91/1578.93ms; background5s cần thiết cho tail>1s trên máy này. |
| Current DB projection | n=667, p50/p95/max=7.88/28.78/47.59ms. Không tách riêng canonical hydration timing; đã nằm trong HTTP, không bịa số. |
| G1 standalone worker probe | load1260.93ms/index4221.24ms;30 warm query p50/p95=5.77/10.61ms; cosine32 scan0.294ms; one QA changed Product recompute106.18ms/1Product. Chỉ là probe, không production HTTP/freshness acceptance. |
| RSS actual compiled sample | Nest+model working sets cộng 763.45MiB; tổng riêng từng process peak 1008.55MiB là upper bound, không concurrent peak. Native model process peak khoảng569MiB. |
| CPU / event loop | Process cumulative CPU tại sample: main45.52s, child46.70s gồm load/checks/bench, không %CPU/inference-only. Main during benchmark CPU delta28.03s. Final lag monitor resolution20ms: p95=33.05ms/max=109.38ms. A không có cùng lag instrumentation, không claim causal event-loop speedup. |
| Repeated / concurrency | Doc inference32 không đổi xuyên paired benchmark; modelLoads1. C semantic c1 100/100 có9IDs; c5 96/100 có9IDs,4/100 safe SQL fallback do concurrent read ordering, không model failure. |
| Browser submit→render | semantic first network174.98ms; repeated cached110.46/67.71ms (60s client cache). Define final heading/cards rendered,3 actions; không LCP hoặc causal before/after speedup. Network waterfall trong browser artifact. |

## 9. Cleanup và final diff

[cleanup-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/cleanup-final.json): đã dừng đúng registered QA runtime/FE/manager/dev children; không còn listeners8102/8103/8104/8105/8198/5175 và không embedding orphan. Drop bookora_ai_recovery_qa_20261128 khi connections=0. Không gửi kill Owner processes; ports8000/5173 vẫn listen, PID trước/sau cleanup giữ nguyên. Public snapshots/model binaries/evidence giữ ngoài repo. Không giữ raw customer dump/tokens. New artifact secret scan0, owner .env/AGENTS/CLAUDE hashes bằng preflight. Final Owner public metadata vẫn32/SHA d44fc6… trong snapshot-check-owner-*.json.

Git HEAD không đổi; working trees còn đúng Owner edits và P1 source/docs/tests/lockfile changes để review; không gọi working tree là clean/committed. git diff --check BE/FE PASS. [source-scope-audit-final.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/source-scope-audit-final.json) chứa status/stat và protected function bodies; [final-format-lineage.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/final-format-lineage.json) chứng minh chỉ whitespace Prettier thay đổi ở repository sau frozen runtime benchmark source (reconstructed old SHA khớp exact). Cuối cùng chỉ thêm export existing projection provider cho future DI consumer; build/lint và [p2-reuse-di-check.json](D:/CTU/CT466E/bookora-ai-qa-20261128/recovery-g1/p2-reuse-di-check.json) PASS, không đổi providers/model/HTTP behavior. Không commit/push.

Remaining limits: small agent-labeled heldout, low absolute semantic precision/coverage, metadata errors, weak item-item neighbors, memory headroom8GB và full projection O(catalog size), cache/freshness limits ở §5, noise local latency. Không suy từ32/33 Products ra scale lớn. Enable/rollout là quyết định vận hành của Owner sau review; task không tự deploy hoặc sửa Owner config.

## 10. P2 continuation contract — deferred

Future module import AiModule và inject **AiCatalogRepository + ProductVectorIndex + EmbeddingService** cùng instance; DI consumer probe đã PASS, không cần Search API. Read current minimal products → beginRead/reconcile → snapshot(products); snapshot chỉ có current fingerprint-matching normalized vectors, dùng exported cosine helper. Nếu not ready/building/không đủ valid vectors phải follow P2 fallback/hide contract, không chế dữ liệu. P2 chỉ reuse core này, không load model thứ hai hay tạo vector store mới.

Related hiện vẫn SQL legacy max3. Homepage chưa có personalized endpoint/section. P2 phải đánh giá item-item quality riêng (đặc biệt Hail Mary/non-book anchors), implement signals đúng Master Spec: viewed max12 theo guest/user localStorage namespace, Wishlist principal-scoped, purchases COMPLETED+PAID distinct Product; không guest-account merge, không bảng tracking, không fake bestseller personalization. Personalized max5/hide khi thiếu signal; vị trí sau Recently Viewed theo Master Spec. Handoff này không mở P2 hoặc viết Prompt2. Owner review P1 trước khi quyết định bước tiếp.

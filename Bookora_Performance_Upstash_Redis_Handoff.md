# Bookora — Performance & Upstash Redis — Handoff

Ngày kiểm chứng: 27-11-2026 (Asia/Saigon).

## 1. STATUS / GATES

**P1 DONE (VERIFIED) / P2 NO-GO — OWNER DECISION REQUIRED. Không tuyên bố DONE (VERIFIED) cho toàn phase tích hợp Redis.**

Redis read-write đã hoạt động thật, nhưng không có projection nào được giữ: ứng viên Home không đạt retention gate sau SQL optimization; các ứng viên còn lại bị loại theo chi phí đọc, privacy hoặc scope. Theo mục 0.1/VI của Master Prompt, Owner cần quyết định đóng phase theo SQL-only. Các phần live/browser chưa chạy lại đầy đủ được ghi NOT RUN/PARTIAL bên dưới; không gộp thành full protected PASS.

| Gate | Verdict | Evidence |
|---|---|---|
| G0 | PASS cho local source, baseline A, QA DB, Upstash read-write | A được đo trước production edits; GET/PING/SET/DEL HTTPS thật. Quota còn lại/eviction cloud không quan sát được, dùng counter bảo thủ. |
| G1 | PASS | 14 API canonical parity; 29 differential checks trên PostgreSQL; baseline B cuối; regression suites và browser thực. |
| G2 | NO-GO, đã đo | Hai paired runs, mỗi run n100 B + n100 C; MISS/MIX/concurrency; SDK HIT được chứng minh bằng counters. |
| G3 | Automated + SQL/browser representative PASS; full integration DONE không đạt | Không giữ cache không có lợi; full live-provider/browser sweep không được tuyên bố hoàn tất. |

### Local baseline / ownership

- BE: `D:/CTU/CT466E/bookora-api/bookora-api`, master, HEAD `2b33f861acc64a0e6f211b1e74b88f4dc5007f29` — `2b33f86 feat(shipping): integrate GHN quotes and multi-provider checkout`.
- FE: `D:/CTU/CT466E/bookora-web/bookora-web`, master, HEAD `3a1e622a58d2122c6c7442be74b830a9f89cf788` — `3a1e622 fix(ui): tabs animation client`.
- Trước task, cả hai repo chỉ có Owner changes trong AGENTS.md và CLAUDE.md (mỗi repo 2 insertions/2 deletions). Hash các instruction files giữ nguyên. Không git add/commit/push/pull/rebase/reset/restore/clean/stash.
- Agent không ghi .env. Owner đã thay Read-Only Token bằng Standard Token trong BE .env sau probe NOPERM; Web .env giữ nguyên. REDIS_ENABLED không có ở snapshot .env ban đầu; QA overrides được dùng, không đoán flag đã được triển khai.
- GitNexus index trùng HEAD khi preflight; không reindex. Impact upstream của home, sortPopular, completedSalesByProduct, listSearchSuggestions: LOW, mỗi symbol 1 direct caller, 0 indexed affected processes. Hai test files sửa để phục hồi regression có file impact LOW/0 callers. detect_changes(all và compare/master) LOW ở cả hai repo. Một số symbol bị gắn touched do line shifts của index; actual diff xác nhận listProductPage/ratingAggregates/protected production code không sửa.

### Runtime / safety / dataset

- Owner API/Web 8000/5173 được giữ chạy. QA riêng: API 127.0.0.1:18020, Web 127.0.0.1:15193. NODE_ENV=test, ts-node transpileOnly, Vite dev 8.0.13; Node 22.22.2; Chrome headless thật, Playwright ngoài repo. A/B cùng runtime mode, không so dev với production build.
- DB Owner local bookora_db chỉ được đọc preflight. DB benchmark `bookora_performance_qa_1795774129370` clone từ DB QA cũ đã xác minh idle/local. Không clone/write production. Không reset/drop/truncate/reseed DB Owner.
- Dataset A/B/C cố định: 601 products, 604 variants, 12.024 order_items, 24 orders, 0 reviews ở trạng thái benchmark. Seed deterministic thêm 600 products, 12.000 snapshot lines; mỗi sản phẩm thứ 17 DRAFT, thứ 19 thiếu primary image, mỗi thứ 10 có future release, mỗi thứ 3 có catalog sale. Seed details: [dataset.json](D:/CTU/CT466E/bookora-performance-archives/20261127/dataset.json).
- Đây là synthetic scale benchmark, không phải production traffic. Order dùng để scale có nhiều synthetic lines và không reconcile monetary header; tuyệt đối không dùng order này làm financial regression fixture. Financial baseline dùng Cart/Preview độc lập.
- QA process dùng canonical password login/CSRF/RBAC, hai browser contexts Admin/Customer riêng. Turnstile tắt và mail credential local chỉ trong process QA; không bypass JWT/ACL. Không tạo vận đơn GHN hoặc thanh toán live.
- PrismaService dùng PrismaPg với connectionString, không cấu hình pool max/timeout riêng trong source; phase này không chỉnh pool. Concurrency đo là 5, không suy kết quả thành production pool-sizing recommendation.
- Source docker-compose định nghĩa một backend container; còn manual seeds/imports/scripts có thể ghi DB ngoài service. Không chứng minh multi-instance coherence và không triển khai cache theo giả định đó. Không thêm worker/scheduler/queue/lock platform.

## 2. PREFLIGHT S01–S10 / PLAN / IMPACT

| ID | Exact source/method | Finding / decision | Evidence / verify / risk |
|---|---|---|---|
| S01 | D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.service.ts:home,sortPopular; D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.repository.ts:completedSalesByProduct | GAP → FIX: SQL SUM theo live variant.product_id; lightweight Home candidates; chọn 5/5/3 trước hydration, tối đa 13 distinct products; rating chỉ cho selected IDs. Giữ locale vi, sales/demo fallback, createdAt/releaseDate/id ties. | Home median 137.37→40.40ms; materialized rows 14762→1204; LOW direct controller/service callers. |
| S02 | D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.repository.ts:listProductPage,listFacets,listOrderedProductIds | FOUND/KEEP: matching IDs + count và full filtered facets. Không bỏ count hoặc đổi isolation semantics; không sửa chỉ vì thấy includes. | Default/search/page/filter/sorts trong 29 differential checks PASS; SQL/ranking chiếm cost chính. |
| S03 | D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.repository.ts:listSearchSuggestions | GAP → FIX: lấy visible IDs trước, giữ full visible total, rank rồi hydrate top limit. Giữ bestMatch/bestSeller flags. | 2.741→1.156 materialized rows; 17→18 SQL calls; canonical HTTP + PostgreSQL hidden-before-limit test PASS. |
| S04 | D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.repository.ts:listRelatedProductIds | FOUND/KEEP: structured score/rank/fallback SQL có parameter binding. | EXPLAIN và canonical related parity; không rewrite ranking/index/schema. |
| S05 | D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.service.ts:detail; storefront-price.service.ts:resolve | FOUND/KEEP: relations + canonical current price live. | Detail rẻ hơn Redis RTT; exact clock/unit + live sale boundary PASS; không duplicate pricing engine. |
| S06 | D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.repository.ts:listCategories,ratingAggregates; D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-branches/storefront-branches.repository.ts:listActive | FOUND/KEEP public tree/metadata, batched ratings/summaries order. | Categories 2 SQL, branches 1 SQL; không cache full reviews/reviewer data hoặc user ID combinations. |
| S07 | D:/CTU/CT466E/bookora-api/bookora-api/src/modules/dashboard/dashboard.service.ts:overview | FOUND/KEEP: scope trước aggregates; lowStock/todayOperations live. | Actual Admin login/dashboard + canonical response; không đưa confidential reports lên Redis. |
| S08 | D:/CTU/CT466E/bookora-api/bookora-api/src/modules/revenue-reports/revenue-reports.service.ts và repository.ts | FOUND/KEEP: summary/trend/branches/table/export SQL-first, date/ACL semantics. | Baselines cho 4 JSON endpoints; contract và Coupon/PostgreSQL financial-report tests PASS. Export không cache; không claim đã benchmark CSV. |
| S09 | D:/CTU/CT466E/bookora-web/bookora-web/src/lib/query-client.ts; D:/CTU/CT466E/bookora-web/bookora-web/src/features/storefront/api/storefront-api.ts; analytics/DashboardView.vue | FOUND/KEEP: staleTime 60s, gcTime 600s, branches/categories 300s, suggestions 30s, Dashboard refetch 60s. | Browser Network/DOM được quan sát; không đổi query keys/staleTime/polling/UI. Detail→related/availability là dependency có chủ đích. |
| S10 | D:/CTU/CT466E/bookora-api/bookora-api/src/modules/integrations/ghn/ghn-quote.service.ts và protected commerce/auth/realtime modules | FOUND/KEEP: GHN Map TTL60s, max256, single-flight; PostgreSQL authority. | GHN quote thật qua Checkout, full protected automated regression; không đưa stock/Flash/Coupon/Checkout/session vào Redis. |

SELECT plans và indexes: [query-plans.json](D:/CTU/CT466E/bookora-performance-archives/20261127/query-plans.json). Plan snapshots được lấy khi checks còn chạy, chỉ dùng đánh giá query shape/scan, không dùng như quiet latency benchmark. Không thêm migration/index/schema; không unsafe raw SQL. SQL SUM giữ COMPLETED-only, bỏ null/deleted variant như source cũ, không dùng historical order_item.product_id thay live variant mapping.

## 3. Cache admission / mutation matrix / security

| Projection | Final decision | Reason |
|---|---|---|
| Home | SQL-ONLY / EXCLUDE Redis | Actual HIT giảm SQL nhưng median không nhanh hơn B; MISS/MIX tail regress; hai paired repeats xác nhận. |
| Product list/filter | SQL-ONLY | High-cardinality, price/filter membership và invalidation/time complexity; không có measured retention case đủ tốt để mở rộng. |
| Related | SQL-ONLY | SQL tốt, lợi ích tiềm năng nhỏ so với RTT và ranking/time/visibility coverage cần có; không thêm cache chỉ để đủ số API. |
| Detail | SQL-ONLY | B median ~15ms, thấp hơn Redis RTT ~33–34ms chưa tính framework. |
| Categories / Branches | SQL-ONLY | B median ~6–7ms, rẻ hơn remote cache; FE đã có cache 5 phút. |
| Suggestions | EXCLUDE Redis | Không gửi arbitrary personal search terms lên Upstash. Không có public-popular-term admission evidence; không cache synthetic Performance term để cứu benchmark. |
| Summaries | EXCLUDE Redis | Tổ hợp IDs theo user/order-sensitive, cardinality; batch hiện hữu giữ nguyên. |
| Ratings / Reviews | SQL-ONLY / EXCLUDE full reviews | Rating batch nhỏ; full review chứa reviewer fields không được cache. |
| Dashboard / Revenue / Export | EXCLUDE Redis | Permission/scope/confidential aggregates và live operations; SQL-only. |
| Stock / pricing authority / Flash / Coupon / Cart / Checkout / Payment / Auth / Realtime | EXCLUDE Redis | Protected authority giữ PostgreSQL, không đi qua thử nghiệm Home cache. |

Mutation dependencies đã trace để đánh giá trước admission:

| Actual write entry points | Home dependency / commit boundary | Final hook |
|---|---|---|
| ProductsService create/update/status/remove, variant/default/options/bulk methods → ProductsRepository serializable transactions | Product visibility, slug, price, ranking metadata; outer repository promise hoàn tất transaction | Không thêm, Home cache bị loại |
| ProductMediaService upload/alt/primary/reorder/remove → repository DB writes | Primary image/public eligibility; sau DB commit, không external I/O trong transaction | Không thêm |
| CategoriesService create/update/image/remove → category transactions | Public category/parent visibility và image/tree | Không thêm |
| AuthorsService / PublishersService update/remove | Public author/publisher metadata, SetNull/Cascade relationships | Không thêm |
| ReviewsService create/update/delete/moderation | Visible rating aggregate; sau outer transaction | Không thêm |
| AdminOrdersService.transition → repository.transaction; COMPLETED history | Completed quantities/bestseller. Customer confirmReceived chỉ ghi receipt, Admin completion mới đổi status. | Không thêm |
| Seed/import/manual SQL ngoài runtime | Có thể thay catalog/ranking | Không có coherence promise; không có cache trong final source |

**Retained cache matrix rỗng.** Không có production TTL/key/generation/single-flight/circuit/invalidation module cần vận hành. Không có runtime Redis dependency, env example hoặc unused SDK được thêm vào hai repo. REDIS_ENABLED/token hiện hữu không kích hoạt cache trong final source; không mô tả flag là feature đã triển khai. Redis outage/quota không tạo dependency mới cho app.

Trial chỉ ở D:/CTU/CT466E/bookora-performance-archives/20261127/trial-cache.cjs, QA AppModule thật, không import từ production: SDK @upstash/redis 1.41.1 singleton, retries=0, auto-pipelining=false, telemetry=false, per-operation AbortSignal 150ms. Final public Home JSON only, version=1, <=64KiB, TTL<=60s, validUntil giới hạn bởi earliest future release/sale transition; QA UUID boot + generation keys. GET→DB→SET thật, single-flight trong burst; SET awaited nên cold cost được ghi thật. Trial không có đầy đủ mutation fencing/circuit/fault contract và **không được giữ hoặc gọi production-ready**. Chỉ read-only dataset trong cache benchmark; không dùng trial này làm freshness proof.

Official references đã đọc: [Getting Started](https://upstash.com/docs/redis/overall/getstarted), [TypeScript SDK](https://upstash.com/docs/redis/sdks/ts/overview), [timeout/telemetry](https://upstash.com/docs/redis/sdks/ts/advanced), [retry defaults](https://upstash.com/docs/redis/sdks/ts/retries). Không dùng default 5 SDK retries trong thử nghiệm.

## 4. A/B/C benchmarks — final source

### Methodology

- A: original source + Redis OFF. B chính thức: **benchmark-B-verified.json**, final production source + Redis OFF, sau full checks và khôi phục dataset. C: cùng final source + ephemeral QA Redis candidate; B/C paired interleave thứ tự, cùng process/runtime/data.
- Full endpoint A/B: 5 warmups, n50 measured tuần tự/endpoint; Chrome APIRequest monotonic clock. C paired: n100 mỗi condition, repeat lần hai; stress concurrency=5, n50. No production traffic inference.
- B trial ban đầu là exploratory và browser bị ảnh hưởng bởi checks. B-final bị loại vì fixture releaseDate lệch (07:00→00:00 qua date-only Admin form). Harness cleanup được sửa, timestamp khôi phục từ immutable A fixture; B-verified **14/14 parity PASS**. [dataset-restored.json](D:/CTU/CT466E/bookora-performance-archives/20261127/dataset-restored.json), [fixture-restoration-diff.json](D:/CTU/CT466E/bookora-performance-archives/20261127/fixture-restoration-diff.json).
- API elapsed gồm HTTP client/body read. dbMs trong raw samples là tổng driver wall time của SQL, có thể overlap; không phải database CPU time. Rows là rows trả về/materialized, không phải tất cả rows PostgreSQL scan. Concurrent SQL attribution có Prisma batching/async-context limitations; chỉ dùng sequential counts như số chính xác theo request.
- Response bytes là decompressed body. Error rate trên measured successful A/B endpoints: 0%. Raw mỗi mẫu có status/bytes; không dùng vài samples suy P95 ổn định.

Đơn vị ms; latency mỗi ô = min / P50 / P95 / max; n50/endpoint/mode.

| Endpoint | A latency | B verified latency | SQL count A/B (median) | Rows A/B (median) | Body bytes A/B | Parity |
|---|---|---|---|---|---|---|
| /storefront/home | 114.82 / 137.37 / 164.86 / 234.96 | 35.29 / 40.40 / 62.42 / 169.66 | 18/18 | 14762/1204 | 5739/5739 | PASS |
| /storefront/products | 32.33 / 43.60 / 333.00 / 572.84 | 45.99 / 55.42 / 73.26 / 77.76 | 22/23 | 600/600 | 5590/5590 | PASS |
| /storefront/products?q=Performance | 65.96 / 83.97 / 127.19 / 137.72 | 79.23 / 94.98 / 126.99 / 221.66 | 22/23 | 1186/1186 | 5369/5369 | PASS |
| /storefront/products/search-suggestions?q=Performance&limit=5 | 87.17 / 99.94 / 146.48 / 252.45 | 73.51 / 84.81 / 97.81 / 197.28 | 17/18 | 2741/1156 | 2408/2408 | PASS |
| /storefront/products/01K00000000000000000000001/related?limit=3 | 40.77 / 46.22 / 55.15 / 168.49 | 46.20 / 50.82 / 61.52 / 69.84 | 18/18 | 17/17 | 1395/1395 | PASS |
| /storefront/products/performance-book-1 | 10.48 / 13.52 / 17.42 / 19.72 | 13.26 / 14.95 / 17.11 / 18.87 | 16/16 | 5/5 | 3807/3807 | PASS |
| /storefront/categories | 4.67 / 5.56 / 7.86 / 10.46 | 5.13 / 6.65 / 8.48 / 9.26 | 2/2 | 2/2 | 355/355 | PASS |
| /storefront/branches | 4.45 / 5.29 / 9.04 / 13.22 | 4.69 / 6.26 / 9.47 / 11.66 | 1/1 | 3/3 | 672/672 | PASS |
| /storefront/products/summaries?ids=01K00000000000000000000001 | 9.14 / 10.89 / 14.07 / 15.12 | 10.67 / 13.03 / 18.30 / 130.94 | 16/16 | 5/5 | 503/503 | PASS |
| /dashboard/overview | 24.44 / 28.68 / 36.12 / 40.02 | 29.57 / 31.97 / 41.97 / 48.30 | 28/28 | 58/58 | 3423/3423 | PASS |
| /reports/revenue/summary | 25.38 / 33.92 / 100.34 / 309.93 | 26.98 / 32.34 / 45.17 / 69.58 | 20/20 | 17/17 | 641/641 | PASS |
| /reports/revenue/trend | 23.46 / 27.41 / 33.94 / 36.32 | 27.50 / 35.33 / 56.51 / 57.34 | 20/20 | 45/45 | 6083/6083 | PASS |
| /reports/revenue/branches | 16.08 / 18.51 / 27.75 / 123.73 | 19.00 / 26.27 / 51.08 / 118.60 | 19/19 | 16/16 | 504/504 | PASS |
| /reports/revenue/table | 19.76 / 22.72 / 26.05 / 28.56 | 23.52 / 27.27 / 34.29 / 37.74 | 20/20 | 25/25 | 2174/2174 | PASS |

Home median giảm **70.59%**, materialized rows giảm **91.84%**. SQL count không giảm; lợi ích từ aggregation, narrow candidates và bounded hydration. Suggestions thêm 1 query đổi lại giảm materialization. Endpoint không sửa có latency dao động: không quy toàn bộ khác biệt cho optimization. Riêng tail revenue-branches ở một run tăng; source/call path analytics không đổi, exploratory B không có cùng regression lặp lại. Không claim mọi API/site đều nhanh hơn.

Small QA supplemental (server-enforced read-only, 1 product/24 items, paired direct service calls, n50, không phải HTTP benchmark): Home A/B P50 10.76/13.34ms, P95 26.46/25.15ms; suggestions 15.15/16.92ms, P95 21.25/24.70ms. Trade-off +1.8–2.6ms median khi catalog rất nhỏ được giữ rõ, không quảng cáo synthetic gain thành production gain. [small-nonregression.json](D:/CTU/CT466E/bookora-performance-archives/20261127/small-nonregression.json).

### Actual Redis candidate results

| Condition | n | min / P50 / P95 / max ms | Observed path | Redis commands | SQL median |
|---|---|---|---|---|---|
| B-paired | 100 | 32.30 / 39.54 / 58.07 / 73.19 | db=100 | 0 | 18 |
| C-paired | 100 | 37.17 / 39.73 / 44.12 / 187.90 | hit=99, bypass=1 | 100 | 0 |
| C-MISS | 50 | 99.77 / 105.79 / 135.75 / 208.07 | miss=50 | 100 | 19 |
| C-MIX | 50 | 38.13 / 40.34 / 109.54 / 135.16 | miss=10, hit=40 | 60 | 0 |
| C-MIX-95 | 50 | 37.70 / 39.15 / 106.67 / 109.23 | miss=3, hit=47 | 53 | 0 |
| B-concurrency | 50 | 89.17 / 97.80 / 109.65 / 260.15 | db=50 | 0 | 4 |
| C-HIT-concurrency | 50 | 39.60 / 53.36 / 296.34 / 297.51 | hit=46, bypass=4 | 50 | 0 |
| C-MIX-concurrency | 50 | 110.81 / 116.88 / 125.89 / 127.23 | miss=50 | 60 | 0 |

- Pure HIT subset lần 1: n99, P50/P95 39.73/44.12ms; paired B n100 39.54/58.07ms. Một request bypass do client deadline.
- Confirmation: pure HIT n99, P50/P95 **40.31/45.71ms**; paired B n100 **38.45/55.06ms**. Median HIT chậm hơn B ~4.8%, không đạt mục tiêu giảm >=30%. B zero Redis calls; HIT zero SQL.
- MIX nominal 95% thực tế 47/50 HIT (94%): P95 106.67ms. MIX80%: P95 109.54ms. Không dùng warm tail đẹp để bỏ qua cold/mixed regress.
- Concurrency5 warm workload 46 HIT/4 bypass có P95 296ms, cao hơn B 110ms. MIX concurrency có 50 MISS/join-fill trong cold bursts, **không** được gọi 80% HIT; đây là stress scenario, không phải production hit rate dự đoán.
- All C response parity PASS. NO-GO dựa performance; không giả rằng trial chưa có invalidation đã qua freshness gates. No retained C implementation nên final source chính là SQL B đã đo, không có stale final C metrics.

| Endpoint | A P50/P95 | B P50/P95 | C-MISS | C-HIT workload | C-MIX80 | SQL A/B/C HIT | HIT rate | Commands | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Home | 137.37 / 164.86 | 40.40 / 62.42 | 105.79/135.75 | 39.73/44.12 (confirmation 40.31/45.71) | 40.34/109.54 | 18/18/0 | 99/100 warm, 40/50 mix | 423 measured run1; 100 paired confirmation + warm/browser | SQL-ONLY / EXCLUDE Redis |
| Các endpoints khác | Bảng A/B trên | Bảng A/B trên | N/A | N/A | N/A | Không có cache | N/A | 0 | EXCLUDE theo admission matrix |

Raw evidence: [benchmark-A.json](D:/CTU/CT466E/bookora-performance-archives/20261127/benchmark-A.json), [benchmark-B-verified.json](D:/CTU/CT466E/bookora-performance-archives/20261127/benchmark-B-verified.json), [redis-trial.json](D:/CTU/CT466E/bookora-performance-archives/20261127/redis-trial.json), [redis-trial-confirmation.json](D:/CTU/CT466E/bookora-performance-archives/20261127/redis-trial-confirmation.json), [sql-trial.ndjson](D:/CTU/CT466E/bookora-performance-archives/20261127/sql-trial.ndjson). Không dùng benchmark-B-final.json làm final evidence.

### Browser A/B/C thật

Viewport 1440x900; cùng Chrome/Vite runtime; mỗi sample mở page mới, FE query cache mới. Bảng A/B đo DOM ready + networkidle (500ms quiet), **không gọi đó là LCP**. n3 nhỏ; P95 gần max, không đủ suy kết quả toàn site. Re-navigation riêng dùng link/back UI và behavior Vue Query hiện hữu.

| Page | A P50/P95 ms | B P50/P95 ms | n A/B |
|---|---|---|---|
| home | 2341.22 / 2839.63 | 2168.02 / 2295.14 | 3/3 |
| list | 2337.71 / 2606.53 | 1854.95 / 1948.76 | 3/3 |
| search | 1961.05 / 1985.66 | 2090.52 / 2340.25 | 3/3 |
| detail | 1854.14 / 1952.67 | 2229.31 / 2370.22 | 3/3 |
| dashboard | 2229.19 / 2355.83 | 1988.24 / 2009.74 | 3/3 |
| revenue | 2174.02 / 2473.87 | 1941.97 / 2214.36 | 3/3 |

Home C browser confirmation n5: DB/cache data-ready P50 1645.01/1437.34ms; network-quiet 1923.69/1855.78ms. Thứ tự DB trước cache có warm-module/noise bias; không quy 207ms DOM chênh lệch thành Redis benefit khi paired API không có median gain. Mỗi page có actual Home HTTP200 với mode db/cache; 5 measured cache pages trace HIT, SQL0. Resource Timing filter ban đầu rỗng, confirmation dùng actual response events + server counters thay vì giả số API timing.

Browser regression 8/8 PASS: Admin UI rename→Customer old slug404/new Detail/Home; Customer analytics403; link/back re-entry; Buy Now exact qty2 và other cart lines preserved, Checkout refresh; responsive1440/768/390/320 no overflow; 0 pageerrors. [browser-regression.json](D:/CTU/CT466E/bookora-performance-archives/20261127/browser-regression.json). Initial harness fill trước form hydration được giữ trong browser-regression-initial.json; rerun chờ authoritative input value rồi thao tác thật PASS.

QA media URL cũ có ảnh không tải được trong screenshot; không sửa R2/Owner assets hoặc che bằng mock. Layout/cursor/Buy Now/GHN logo giữ source hiện hữu. Không có production FE UI edit. SPA document TTFB/resource timings trong raw data không được dùng thay API TTFB; LCP không được thu thập.

## 5. Correctness / regression gates

Cache-specific cases N/A vì **không có retained cache**; không dùng N/A để tuyên bố trial unsafe đã PASS.

| ID | Verdict / actual evidence |
|---|---|
| F01 | SQL empty/404/parity PASS qua differential + unit/HTTP; retained TTL/HIT lifecycle N/A. Trial có real HIT/MISS, không tuyên bố full TTL/fault validation. |
| F02 | Admin rename browser → old slug404/new slug + Home DOM PASS; committed hidden product PostgreSQL candidate test PASS. Full cache mutation matrix N/A. |
| F03 | Existing variant/default/media/price tests PASS; canonical pricing unchanged, stock live. Không chạy lại từng Admin variant/media UI action. |
| F04 | Existing category/author/publisher/branch automated tests + live read parity PASS; full CRUD browser sweep NOT RUN, không có cache hooks cần chứng minh. |
| F05 | Actual committed review create/hide trên QA DB → fresh Home rating 5/count1→count0 PASS; official review suites PASS; no reviewer data sent to Redis. |
| F06 | Actual PostgreSQL SUM parity với source cũ PASS, including snapshot product mismatch/null variant/pending status; protected completion/membership suites PASS. |
| F07 | Real sale start/end + upcoming release transition qua HTTP/PostgreSQL PASS (~4.8s real clock); deterministic canonical price tests PASS. Fixtures restored. |
| F08 | Uncommitted hide không lộ qua HTTP, rollback giữ product PASS; transaction regression suites PASS. |
| F09 | Retained-cache races/delayed SET/overlapping invalidation N/A; chưa triển khai cache. Trial concurrency chỉ chứng minh performance/parity trên read-only dataset. |
| F10 | Retained-cache invalid token/429/5xx/malformed payload/invalidation faults N/A. Probe read-only token NOPERM được điều tra và Owner sửa; SDK client timeouts quan sát được, không gọi đó là provider outage. |
| F11 | Retained cache outage/recover/restart/eviction N/A; final app không có Redis read path hoặc zombie cache có thể được phục vụ. |
| F12 | Retained key/cardinality/single-flight security contract N/A. Trial UUID QA namespace, bounded public payload/TTL; no arbitrary terms/customer data. |
| F13 | Actual Customer dashboard/revenue403, Admin200; full auth/cross-branch/support permission e2e PASS. |
| F14 | Final source không dùng Redis ở startup/readiness/auth/read/write; OFF zero Redis và missing token không tạo dependency. Không quảng cáo flag ON như implemented cache feature. |
| F15 | Actual Admin/Customer independent-context rename/reload/re-entry PASS; no manual cache clear. Existing FE staleTime limitations giữ nguyên, không push across tabs. |

| ID | Protected regression evidence / limitation |
|---|---|
| R01 | Actual Home/List/Search/Detail/Related, Admin dashboard/revenue; canonical API parity PASS; existing branch/availability suites PASS. |
| R02 | Actual regular Buy Now qty2→single-selected Checkout, other lines unchanged, refresh PASS; Flash/catalog cases covered by full HTTP/PostgreSQL + FE tests, không claim đã lặp mọi Flash UI scenario. |
| R03 | Coupon/Flash/membership atomic quota/eligibility/cancel/allocations tests trên PostgreSQL thật PASS; financial Preview A/B/final same input PASS. |
| R04 | INTERNAL Preview/UI + real GHN quote card 34.001đ/ETA28-11-2026 PASS, no shipment created. GPS live browser workflow NOT RUN lần này; geolocation regression tests PASS. |
| R05 | Preview monetary parity + PostgreSQL checkout/COD/cancel/restock/final-revalidation suites PASS. Không gọi một Preview là actual placed-order evidence. |
| R06 | Coupon/Flash VNPAY HTTP + PostgreSQL lifecycle tests PASS với signed QA callbacks. Genuine provider browser card/Return/IPN flow NOT RUN lần này; historical handoff không tính là current PASS. |
| R07 | Browser real Admin/Customer auth, CSRF and scoped HTTP/e2e/RBAC PASS; no cached ACL/report. |
| R08 | Notification/realtime/membership/support actual HTTP/PostgreSQL/WebSocket e2e suites PASS. Không gửi tin qua account Owner; full two-user support/Bell browser sweep NOT RUN. |
| R09 | Final protected source không có Redis dependency/invalidation I/O. Actual protected HTTP/DB tests PASS; separate n50 before/after write-latency benchmark NOT RUN, không bịa mutation overhead. |
| R10 | Representative Customer responsive1440/768/390/320 + Admin desktop actual views PASS; 0 pageerrors; no FE production edit/redesign/request polling added. |

Monetary baseline: HTTP201, identical selected cart/address/regular-price inputs, subtotal750.000đ, catalog discount40.000đ, selected INTERNAL fee45.000đ, total795.000đ; quantities/current/original/line totals and empty coupon allocations khớp A/B/final. [financial-A.json](D:/CTU/CT466E/bookora-performance-archives/20261127/financial-A.json), [financial-B.json](D:/CTU/CT466E/bookora-performance-archives/20261127/financial-B.json), [financial-final.json](D:/CTU/CT466E/bookora-performance-archives/20261127/financial-final.json). Không hardcode upstream GHN fee vào expected monetary snapshot. COD/VNPAY amount/state assertions ở official PostgreSQL tests được phân biệt với genuine gateway traffic.

## 6. Automated verification / exact commands

Các lệnh npm bên dưới đều chạy qua rtk proxy trong QA environment; test DB target override local isolated. Exit/count thật:

| Command | Result / exit | Duration | Log |
|---|---|---|---|
| npm test -- --runInBand --silent | PASS (0) | 348.52s | [api-unit.log](D:/CTU/CT466E/bookora-performance-archives/20261127/api-unit.log) |
| npm run test:e2e -- --runInBand --silent | PASS (0) | 468.73s | [api-e2e-final.log](D:/CTU/CT466E/bookora-performance-archives/20261127/api-e2e-final.log) |
| npm run type-check | PASS (0) | 48.67s | [api-type-final.log](D:/CTU/CT466E/bookora-performance-archives/20261127/api-type-final.log) |
| npm run lint | PASS (0) | 301.10s | [api-lint.log](D:/CTU/CT466E/bookora-performance-archives/20261127/api-lint.log) |
| npm run build | PASS (0) | 44.80s | [api-build.log](D:/CTU/CT466E/bookora-performance-archives/20261127/api-build.log) |
| npm run prisma:validate | PASS (0) | 4.80s | [prisma-validate.log](D:/CTU/CT466E/bookora-performance-archives/20261127/prisma-validate.log) |
| npm exec -- prisma migrate status | PASS (0) | 6.76s | [prisma-status.log](D:/CTU/CT466E/bookora-performance-archives/20261127/prisma-status.log) |
| npm run docs:contract | PASS (0) | 2.12s | [api-contract.log](D:/CTU/CT466E/bookora-performance-archives/20261127/api-contract.log) |
| npm test -- --reporter=dot --maxWorkers=1 | PASS (0) | 516.82s | [web-test-final.log](D:/CTU/CT466E/bookora-performance-archives/20261127/web-test-final.log) |
| npm run build | PASS (0) | 426.04s | [web-build.log](D:/CTU/CT466E/bookora-performance-archives/20261127/web-build.log) |
| npm run verify:generated-zod | PASS (0) | 1.48s | [web-contract.log](D:/CTU/CT466E/bookora-performance-archives/20261127/web-contract.log) |

- BE unit: **121 suites / 999 tests PASS**. BE final e2e: **27 suites / 221 tests PASS**. New targeted PostgreSQL performance suite: 3 tests PASS. Storefront unit targeted: 17 tests PASS.
- FE final: **231 files / 1.201 tests PASS**. Three formerly failing suites targeted: 23/23 PASS. No blanket skip, no timeout increase, no business assertions relaxed.
- First BE e2e exit1: 25 passed/2 failed suites, 208 passed/13 failed tests. Coupon fixture skipped coupon migration but applied later realtime migration querying visibility; corrected chronological pre-upgrade→assert preservation→post-upgrade migration setup. Support seed exceeded default 5s transaction during concurrent checks; no production timeout/seed policy change; full rerun PASS. [api-e2e.log](D:/CTU/CT466E/bookora-performance-archives/20261127/api-e2e.log).
- First FE exit1: 228 passed/3 failed files, 1.194 passed/7 failed tests. Six 5s timeouts under contention cleared on rerun with reduced load. One stale raw-source assertion banned ScrollArea anywhere on Detail; now checks RelatedProductsSection itself, keeping all positive carousel assertions. Latest tabs ScrollArea remains. [web-test.log](D:/CTU/CT466E/bookora-performance-archives/20261127/web-test.log).
- npx prettier --check official changed test files PASS; npx eslint test/coupon-upgrade-postgres.e2e-spec.ts PASS; full BE lint PASS. FE has no lint script; not invented. Both git diff --check PASS. FE build includes vue-tsc. BE final type-check rerun PASS after test fixture correction.
- BE build 583 files; FE production build PASS with existing >500KiB chunk warning (including admin table columns). No bundle redesign based only on that warning. Prisma validate/status read-only PASS against QA; no migration applied to Owner.
- OpenAPI contract check and generated Zod validation PASS; generated clients/schema/DTOs/lockfiles unchanged. Never hand-edited generated output.

## 7. Changed files / operation / cleanup

| File | Why |
|---|---|
| D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.repository.ts | SQL aggregation, lightweight Home candidates, bounded suggestions hydration after visibility. |
| D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.service.ts | Home chọn đúng groups trước hydration; ratings theo selected IDs; generic same-rule popular comparator. |
| D:/CTU/CT466E/bookora-api/bookora-api/src/modules/storefront-catalog/storefront-catalog.service.spec.ts | Selected-set bounds, ties/rank/rating, fallback/empty regression. |
| D:/CTU/CT466E/bookora-api/bookora-api/test/storefront-performance-postgres.e2e-spec.ts | Real PostgreSQL mapping/null/status/visibility/rank/total regression. |
| D:/CTU/CT466E/bookora-api/bookora-api/test/coupon-upgrade-postgres.e2e-spec.ts | Fix chronological migration fixture; all existing money/uniqueness/quota assertions kept. |
| D:/CTU/CT466E/bookora-web/bookora-web/src/features/engagement/engagement-hotfix.test.ts | Scope existing no-ScrollArea guard to related component; production tabs/UI unchanged. |
| D:/CTU/CT466E/bookora-web/bookora-web/Bookora_Performance_Upstash_Redis_Handoff.md | One official cross-repo handoff. |

No application dependency/env example/schema/API contract/UI changes. @upstash/redis/Playwright installed only in external QA archive. Owner AGENTS/CLAUDE changes preserved, no commit/push.

### Demo / Redis / manual edits

Final application is SQL-only. Do not tell demo operators to enable REDIS_ENABLED expecting cache: **no retained integration reads it**. Existing credentials remain Owner-managed; token rotation only in .env, never chat/log. A future retained cache requires new measured benefit and full mutation/time/race/restart/outage coverage before enablement; no TTL-only or global GET cache shortcut.

Manual DB edits/seeds currently read through PostgreSQL normally. No Redis namespace needs invalidation/restart in final source. FE may reuse its existing Vue Query freshness window until reload/refetch/re-entry behavior; no new Redis stale window or cross-tab push claim. No cron keepalive, paid plan, cloud DB, billing change or global Redis flush.

### QA archive / cleanup

- Raw samples, screenshots, sanitized logs, original-source snapshots and harnesses: `D:/CTU/CT466E/bookora-performance-archives/20261127`. [MANIFEST.json](D:/CTU/CT466E/bookora-performance-archives/20261127/MANIFEST.json) contains sizes/hashes and configuration-secret scan. Private database metadata is excluded from public manifest/handoff; do not publish private.json.
- Probe test-owned keys deleted with DEL; trial keys only QA UUID namespace + TTL<=60s, allowed to expire. No KEYS/SCAN/shared-delete/FLUSH. Tracked SDK calls **541**; native probes/permission diagnostics approximately169; remaining unlabelled browser/startup calls conservatively bounded. **Total phase <1.000 commands**, below10.000 cap. This is not the remaining provider quota. Billing/quota/eviction cloud settings were not observable with database token.
- Original Read-Only token GET/PING200 but SET403 NOPERM; Standard Token SET/GET/DEL and final PING PASS on real HTTPS Upstash endpoint. One CLI PING attempt failed transiently; bounded file-based probe rerun PASS. No secrets in error output/evidence scan. Latest GET probe n50 P50/P95 32.54/36.21ms; initial Standard probe29.02/34.01ms. [upstash-probe.json](D:/CTU/CT466E/bookora-performance-archives/20261127/upstash-probe.json), [upstash-ping.json](D:/CTU/CT466E/bookora-performance-archives/20261127/upstash-ping.json), [upstash-readonly.json](D:/CTU/CT466E/bookora-performance-archives/20261127/upstash-readonly.json).
- Agent API/Web processes on18020/15193 were stopped via their own stdin stop handlers; all Playwright browsers closed in finally. Owner8000/5173 not stopped. Final listener/diff/secret audit is recorded in final-audit.json and MANIFEST.json.
- QA review/date/name/slug fixtures restored; immutable A Home parity rechecked before B-verified. Scaled QA DB intentionally retained for reproducibility, isolated from Owner. Official disposable test DBs use their own create/close lifecycle. No Owner artifact cleanup or DB destructive command.

**Owner decision:** accept SQL-only/no-go as the phase outcome, or define a separately justified Redis workload/topology to remeasure. Current evidence does not support keeping Redis or declaring full integration DONE.

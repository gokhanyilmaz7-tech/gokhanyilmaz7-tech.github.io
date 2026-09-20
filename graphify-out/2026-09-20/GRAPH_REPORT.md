# Graph Report - gokhanyilmaz7-tech.github  (2026-09-20)

## Corpus Check
- 967 files · ~1,734,578 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1175 nodes · 2167 edges · 64 communities (56 shown, 3 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cd9882b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- report-page.js
- _
- BrowserTab
- index.js
- mevzuat-RJufrWaC.js
- section.js
- program.js
- admin-provisions.js
- noksanlar.js
- mevzuat-cIqBrbqF.js
- mevzuat-BwE7Bg8m.js
- mevzuat-CLt7GuDV.js
- $
- mevzuat-NDRrUeFF.js
- mevzuat-X0zFHwTa.js
- scripts
- ipc-GiOSXsF2.js
- gorevler.js
- ipc.js
- ipc-CC3fB8bB.js
- ipc-CF2rktK9.js
- ipc-DCFprWxf.js
- ipc-DjOtaq8l.js
- ipc-lMc67Oxm.js
- mevzuat-BEeRYWaR.js
- mevzuat-BGv5QIPh.js
- mevzuat-DSJalpAl.js
- legislation-links.js
- ipc-BE23aU6z.js
- ipc-Bg33kEaG.js
- ipc-DeRxyg-7.js
- ipc-CAqesSJZ.js
- ipc-CH2wvElr.js
- ipc-rYuib5NG.js
- ipc-B20qbRHL.js
- ipc-BogIL1RR.js
- ipc-C2-CQl8x.js
- ipc-CikfCPo6.js
- ipc-CSrbJhm1.js
- ipc-Dd0lpo8_.js
- ipc-Dfy-Q9TM.js
- ipc-DoVFgjC6.js
- ipc-DwgAwF-W.js
- ipc-DzYL-Iw9.js
- modulepreload-polyfill-B5Qt9EMX.js
- index-BFuwxWrC.js
- main-ANpTSETr.js
- main-BGzingDg.js
- main-BMbVswpm.js
- main-DIG814bC.js
- main-DRONz_BM.js
- Handler
- test_run.js
- manifest.json
- public/manifest.json
- hesaplama.js
- scroll-top.js
- Mevzuat Rehberi
- admin.js

## God Nodes (most connected - your core abstractions)
1. `_` - 38 edges
2. `$` - 29 edges
3. `w()` - 21 edges
4. `$` - 21 edges
5. `requireAccount()` - 20 edges
6. `initNoksanlar()` - 20 edges
7. `renderStream()` - 20 edges
8. `renderAccordions()` - 19 edges
9. `fetch()` - 19 edges
10. `h()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `N()` --indirect_call--> `g()`  [INFERRED]
  assets/favoriler-PrvOaiVw.js → assets/report-D4okbJGz.js
- `U()` --indirect_call--> `i()`  [INFERRED]
  assets/report-w4ZHIf8P.js → assets/modulepreload-polyfill-B5Qt9EMX.js
- `p()` --indirect_call--> `g()`  [INFERRED]
  assets/favoriler-PrvOaiVw.js → assets/report-D4okbJGz.js
- `j()` --indirect_call--> `S()`  [INFERRED]
  assets/favoriler-PrvOaiVw.js → assets/report-D4okbJGz.js
- `init()` --calls--> `currentUser()`  [EXTRACTED]
  src/program.js → src/auth.js

## Import Cycles
- None detected.

## Communities (64 total, 3 thin omitted)

### Community 0 - "report-page.js"
Cohesion: 0.06
Nodes (78): currentUser(), hydrateFavorites(), isAdminMode(), openAccountSettings(), openDialog(), persistFavorites(), protectPage(), requireAccount() (+70 more)

### Community 1 - "_"
Cohesion: 0.07
Nodes (81): e(), n, o(), r(), s(), b(), d(), f() (+73 more)

### Community 2 - "BrowserTab"
Cohesion: 0.09
Nodes (27): App, Bool, Context, Equatable, Identifiable, BrowserCoordinator, BrowserTab, .isHome (+19 more)

### Community 3 - "index.js"
Cohesion: 0.10
Nodes (58): env, helpers, base64(), decode(), encoder, googleAuth(), json(), readCookie() (+50 more)

### Community 4 - "mevzuat-RJufrWaC.js"
Cohesion: 0.09
Nodes (26): a(), c(), d, i(), l(), n(), o, u() (+18 more)

### Community 5 - "section.js"
Cohesion: 0.11
Nodes (31): applyProvisionTitle(), blocks, color(), compact(), content, copyProvision(), editProvisionTitle(), escapeHtml() (+23 more)

### Community 6 - "program.js"
Cohesion: 0.16
Nodes (26): archiveList, changeMonth(), closeArchiveModal(), closeAssignModal(), currentMonth, currentYear, dayNames, deleteArchiveItem() (+18 more)

### Community 7 - "admin-provisions.js"
Cohesion: 0.21
Nodes (21): adjustFirstLineIndent(), applyFormatTemplate(), applyOverride(), applyProvisionOverrides(), bindInlineToolbar(), blockNodes(), caretAtBlockStart(), copyFormatTemplate() (+13 more)

### Community 8 - "noksanlar.js"
Cohesion: 0.11
Nodes (57): activeFavoriteList(), applyFavoriteListToSelection(), clearBasket(), closeEditModal(), closeFavoritePicker(), closeListlessConfirmModal(), closePreviewModal(), closeTedbirlerSuccessModal() (+49 more)

### Community 9 - "mevzuat-cIqBrbqF.js"
Cohesion: 0.13
Nodes (18): C, D, E(), ee(), G, H(), J(), M (+10 more)

### Community 10 - "mevzuat-BwE7Bg8m.js"
Cohesion: 0.15
Nodes (16): B, C(), ee(), H(), I, j(), M, O (+8 more)

### Community 11 - "mevzuat-CLt7GuDV.js"
Cohesion: 0.15
Nodes (17): B(), C(), D, et(), H, j, M, O (+9 more)

### Community 12 - "$"
Cohesion: 0.16
Nodes (18): $, B, C, D, et(), H(), J(), M() (+10 more)

### Community 13 - "mevzuat-NDRrUeFF.js"
Cohesion: 0.15
Nodes (17): B, C, D, et(), H(), j, M(), O (+9 more)

### Community 14 - "mevzuat-X0zFHwTa.js"
Cohesion: 0.16
Nodes (17): B, C, D, et(), H(), J(), M(), O (+9 more)

### Community 15 - "scripts"
Cohesion: 0.11
Nodes (18): dependencies, pdfjs-dist, devDependencies, vite, name, private, scripts, build (+10 more)

### Community 16 - "ipc-GiOSXsF2.js"
Cohesion: 0.18
Nodes (16): c(), D(), E, f, g, j, k(), L (+8 more)

### Community 17 - "gorevler.js"
Cohesion: 0.19
Nodes (16): archive, attachmentsMap, escapeHtml(), escapeJs(), initEventListeners(), loadAllAttachments(), loadProgramData(), monthNames (+8 more)

### Community 18 - "ipc.js"
Cohesion: 0.19
Nodes (16): copyButton, escapeHtml(), filterRows(), formatCell(), isFullWidthNote(), isHeaderRepeat(), isMajor(), isNote() (+8 more)

### Community 19 - "ipc-CC3fB8bB.js"
Cohesion: 0.18
Nodes (15): b(), d, E(), f, g(), h, k(), l (+7 more)

### Community 20 - "ipc-CF2rktK9.js"
Cohesion: 0.20
Nodes (15): c(), D(), E, f, g, H, j(), k() (+7 more)

### Community 21 - "ipc-DCFprWxf.js"
Cohesion: 0.18
Nodes (15): b(), d, E(), f, g(), h, k(), l (+7 more)

### Community 22 - "ipc-DjOtaq8l.js"
Cohesion: 0.18
Nodes (15): b(), d, E(), f, g(), h, k(), l (+7 more)

### Community 23 - "ipc-lMc67Oxm.js"
Cohesion: 0.21
Nodes (12): b(), c, d(), E(), f(), h, i(), l (+4 more)

### Community 24 - "mevzuat-BEeRYWaR.js"
Cohesion: 0.16
Nodes (15): A, G, j(), L, M(), O, Q(), R() (+7 more)

### Community 25 - "mevzuat-BGv5QIPh.js"
Cohesion: 0.14
Nodes (14): A, E(), g, j(), k, L, O, Q() (+6 more)

### Community 26 - "mevzuat-DSJalpAl.js"
Cohesion: 0.15
Nodes (14): A(), B, D, E, H(), j, O, q() (+6 more)

### Community 27 - "legislation-links.js"
Cohesion: 0.13
Nodes (14): clockEl, count, currentCalDate, dateEl, daysFull, laws, list, monthsFull (+6 more)

### Community 28 - "ipc-BE23aU6z.js"
Cohesion: 0.19
Nodes (14): b, C(), d(), E, g, h, j(), K (+6 more)

### Community 29 - "ipc-Bg33kEaG.js"
Cohesion: 0.18
Nodes (13): A, C(), d, E, f, g, H(), j() (+5 more)

### Community 30 - "ipc-DeRxyg-7.js"
Cohesion: 0.19
Nodes (14): c(), E(), g, h, i(), j(), k(), L (+6 more)

### Community 31 - "ipc-CAqesSJZ.js"
Cohesion: 0.19
Nodes (13): A(), b, E(), f, g, H(), k, M() (+5 more)

### Community 32 - "ipc-CH2wvElr.js"
Cohesion: 0.19
Nodes (13): A(), b, E(), f, g, H(), k, M() (+5 more)

### Community 33 - "ipc-rYuib5NG.js"
Cohesion: 0.19
Nodes (13): A(), b, E(), f, g, H(), k, M() (+5 more)

### Community 34 - "ipc-B20qbRHL.js"
Cohesion: 0.21
Nodes (12): b(), c(), d, E(), h, i, l, m (+4 more)

### Community 35 - "ipc-BogIL1RR.js"
Cohesion: 0.21
Nodes (12): b(), c(), d, E(), h, i, l, m (+4 more)

### Community 36 - "ipc-C2-CQl8x.js"
Cohesion: 0.20
Nodes (12): A(), b, E, f, g, h(), k, L() (+4 more)

### Community 37 - "ipc-CikfCPo6.js"
Cohesion: 0.22
Nodes (12): b(), c(), d, h, i, l, m(), n (+4 more)

### Community 38 - "ipc-CSrbJhm1.js"
Cohesion: 0.15
Nodes (8): b, f, g, H(), k, s, w(), y

### Community 39 - "ipc-Dd0lpo8_.js"
Cohesion: 0.21
Nodes (12): b, c, d, E(), f(), g(), h, l (+4 more)

### Community 40 - "ipc-Dfy-Q9TM.js"
Cohesion: 0.16
Nodes (10): b, f, g, H(), k, m(), p(), s (+2 more)

### Community 41 - "ipc-DoVFgjC6.js"
Cohesion: 0.16
Nodes (10): b, f, g, H(), k, m(), p(), s (+2 more)

### Community 42 - "ipc-DwgAwF-W.js"
Cohesion: 0.22
Nodes (12): b(), c(), d, h, i, l, m(), n (+4 more)

### Community 43 - "ipc-DzYL-Iw9.js"
Cohesion: 0.21
Nodes (12): b(), c, d(), E(), f(), h, i(), l (+4 more)

### Community 44 - "modulepreload-polyfill-B5Qt9EMX.js"
Cohesion: 0.05
Nodes (46): c(), D(), E, f(), g, H, j(), k() (+38 more)

### Community 45 - "index-BFuwxWrC.js"
Cohesion: 0.33
Nodes (8): a(), d(), l(), o(), p, r, s(), u()

### Community 46 - "main-ANpTSETr.js"
Cohesion: 0.33
Nodes (8): c(), m(), n, o, r(), s(), u(), v

### Community 47 - "main-BGzingDg.js"
Cohesion: 0.33
Nodes (8): c(), m, o(), r, s, t(), u(), v()

### Community 48 - "main-BMbVswpm.js"
Cohesion: 0.33
Nodes (8): c(), m(), n, o, r(), t(), u(), v

### Community 51 - "main-DIG814bC.js"
Cohesion: 0.36
Nodes (8): c, d, l(), n(), o(), p(), t, u()

### Community 52 - "main-DRONz_BM.js"
Cohesion: 0.33
Nodes (8): a(), c(), d, i(), l(), n(), o, u()

### Community 56 - "test_run.js"
Cohesion: 0.33
Nodes (4): fs, legData, legMatches, needle

### Community 57 - "manifest.json"
Cohesion: 0.50
Nodes (3): pageCount, pdf, sections

### Community 58 - "public/manifest.json"
Cohesion: 0.50
Nodes (3): pageCount, pdf, sections

### Community 66 - "Mevzuat Rehberi"
Cohesion: 0.50
Nodes (3): Mevzuat Rehberi, Yönetici girişi, Çalıştırma

### Community 68 - "admin.js"
Cohesion: 0.35
Nodes (10): app, bindActions(), deleteUser(), escapeHtml(), formatDate(), load(), postUserAction(), render() (+2 more)

## Knowledge Gaps
- **339 isolated node(s):** `n`, `r`, `I`, `p`, `r` (+334 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 425 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_` connect `_` to `modulepreload-polyfill-B5Qt9EMX.js`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `$` connect `$` to `modulepreload-polyfill-B5Qt9EMX.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `$` connect `_` to `modulepreload-polyfill-B5Qt9EMX.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `n`, `r`, `I` to the rest of the system?**
  _339 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `report-page.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06384065372829417 - nodes in this community are weakly interconnected._
- **Should `_` be split into smaller, more focused modules?**
  _Cohesion score 0.06843090082865544 - nodes in this community are weakly interconnected._
- **Should `BrowserTab` be split into smaller, more focused modules?**
  _Cohesion score 0.0915915915915916 - nodes in this community are weakly interconnected._
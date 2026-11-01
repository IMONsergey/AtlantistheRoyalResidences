# Atlantis interaction and visual audit, V3

Audit label: 2026-11-01. This is a continuation of the audit; exact UTC browser capture timestamps are in the evidence. Baseline: `a94c16da3a602832484fce0a2c6b05958658cbc9`.

This report records fresh baseline reproductions and local fixes after the user reported broken interactions and inaccurate branding. Earlier V2 PASS results were not used as acceptance for these changes. Publication and the live enquiry backend are outside this local verification.

## Result and scope

**Atlantis has 6 primary journeys per engine: 12/12 fixed journeys passed in Chromium 145.0.7632.6 and WebKit 26.0.** The shared suite has 19 journeys per engine across Atlantis and AVA together; it is not 19 for Atlantis alone. Five of Atlantis's six baseline journeys in each engine exposed defects; the menu/history positive control already passed. Additional focused visual and contrast checks cover the unchanged image viewer and the final hover-color correction.

The source inventory contains 138 anchor/button/select/summary instances across generated routes, including shared dialogs. That count is an inventory, not a claim of 138 individual browser passes. All 58 anchor instances have valid local file/route/fragment targets in the static route check. Source checks found no text arrow glyphs or arrow HTML entities; interface arrows use icons.

| Surface | Reviewed contract and browser coverage |
| --- | --- |
| Header/menu/logos and anchors | Actual menu open/close, selection, detail navigation and browser Back/Forward. Header/footer wordmarks remain home links. Menu and lightbox close/focus/scroll contracts reviewed. |
| Catalogue | Bedrooms, area, plan/interior preview, result count, empty-state/reset and carried query parameters reviewed. Browser Back/Forward and explicit-query reload tested against all filter/preview state. |
| Residence 3402 | Card still opens the detail; View floor plan now opens its actual plan section. The full plan and Enlarge control are visible on arrival at 390px. Exact top alignment is not required on a page whose maximum scroll is reached. |
| Enquiry and requests | Pending editing, Close/reopen with another trigger, failure, same-input retry, server field error, revised-input retry and mock success/reset exercised. Values/context remain consistent with the request. No live enquiry was sent. |
| Highlights and Interiors | Each gallery was tested with a failed next image, explicit Retry, successful recovery and delayed image completion after another user intent. Good frames remain visible, and the whole error/Retry block is in view. |
| Full-screen photograph/interior/plan viewer | Source review plus fresh mobile plan zoom/fit, interior Next, close/Escape and restored scrolling. Existing load-error guidance allows another image or Close/reopen. The new explicit Retry controls are for the two page carousels. |
| Resources, map, privacy and 404 | Presentation, catalogue and payment-plan actions honestly request material through contextual enquiry. They do not claim a nonexistent PDF download. Map URL and local privacy/404 targets reviewed; the external map service was not tested in the isolated suite. |
| Video and motion | There is no video element or full film in the current Atlantis source. The underwater full-screen content is a photograph. A fresh normal-motion gallery transition and mid-transition reduced-motion switch were checked, alongside mobile WebKit interaction paths. |

## Confirmed findings and fixes

### ATL-V3-01: Pending enquiry fields can diverge from submitted data

**Reproduce:** Submit the intercepted fixture and edit the name while the request is held.

**Baseline:** The visible form accepts a different name while the captured request contains the previous name. Reopening can display the edited values for an already-sending request.

**Fixed:** Every form control is frozen with its context until completion. Previous disabled states and all entered data are restored after failure.

### ATL-V3-02: Pending close/reopen leaves the error below view

**Reproduce:** At 390×600 close/reopen an intercepted pending enquiry, then return 503 or 422.

**Baseline:** The failed request preserves data but its error is not fully visible in the current scroll position.

**Fixed:** After restoring controls the dialog focuses/scrolls the first server-invalid field or the live message.

### ATL-V3-03: Catalogue state disagrees with browser history

**Reproduce:** Home → Plans → bedrooms 2, area under 300, Interior → Back → Forward; reload the explicit query URL.

**Baseline:** Back changes the URL to / but leaves the previous selects, preview and empty result.

**Fixed:** Initial load, popstate and pageshow restore recognized query values, count, empty state, preview and residence links without rewriting history.

### ATL-V3-04: View floor plan does not target the floor plan

**Reproduce:** Select Interior in the homepage collection, then activate View floor plan.

**Baseline:** The detail opens at its top with photographs; the requested plan is below the mobile fold.

**Fixed:** The CTA preserves the collection query and targets #floor-plan on the detail page. The plan and Enlarge control are visible on arrival.

### ATL-V3-05: Failed gallery navigation gives no explanation or retry

**Reproduce:** Fail the next image in Highlights or Interiors and activate Next.

**Baseline:** The previous frame/counter remain with no explanation or retry.

**Fixed:** Both galleries retain the good frame, provide loading/error/retry feedback and preserve latest intent through failure/recovery.

### ATL-V3-06: Small header emblem differs from the primary source

**Reproduce:** Compare the eight-bar emblem with Figma 2029:881.

**Baseline:** Rounded dimensions and offsets make a 25×20 shape instead of the authored 25×19.2857 geometry.

**Fixed:** The original eight rectangles use the source dimensions, offsets and currentColor. Header/footer wordmark assets remain the original source masks.

### ATL-V3-07: Hover reduces close/menu contrast below 3:1

**Reproduce:** Open the enquiry or navigation dialog and hover its Close icon or a navigation label.

**Baseline:** The shared light gold #b39985 on cream #fef8f4 measures 2.553:1.

**Fixed:** Only these interactive hover colors use the existing darker brown #72614f, measuring 5.638:1. Decorative gold remains unchanged.

## Primary design source and contrast

Figma file: `m3N3lJCoutaziEm4nt4CwO`, reused session `bcbc9432-ff5d-4e7e-acca-8bd2487dbf82`. See [figma-provenance.json](verification/interaction-v3/figma-provenance.json) and [native-size pixel comparisons](verification/interaction-v3/figma-pixel-comparison.json).

| Source node | Result |
| --- | --- |
| [2029:881](https://www.figma.com/design/m3N3lJCoutaziEm4nt4CwO?node-id=2029-881), children 2029:882–2029:892 | The emblem now uses the source's eight rectangles, exact offsets and 25 × 19.2857 overall geometry. CSS pixel snapping differs from Figma's antialiased export, especially at this small size; this is not described as byte-identical rendering. |
| [2029:875](https://www.figma.com/design/m3N3lJCoutaziEm4nt4CwO?node-id=2029-875) | Original header mask retained; source frame 115.318 × 69 and contain sizing preserve its proportions. |
| [2029:1221](https://www.figma.com/design/m3N3lJCoutaziEm4nt4CwO?node-id=2029-1221) | Original footer SVG mask retained; source frame 136 × 86.603. |

The native-size browser captures and rendered Figma references use the same background; no image resize or recoloring is applied. The source shapes, colors and placement were inspected at desktop, tablet and 390/320px widths. The measured differences include CSS/vector/image rasterization at tiny dimensions and are reported openly in the JSON, rather than treated as a universal pixel-perfect pass.

A focused hover check found light gold `#b39985` on cream `#fef8f4` at **2.553:1** on both Close and navigation text. The final interactive hover color is the form's existing darker brown `#72614f`, giving **5.638:1**. Decorative gold and static artwork are unchanged. Before/after screenshots and computed colors are saved; this final CSS-only change received a focused hover rerun and a final successful build, without rerunning unrelated form/history journeys.

Other inspected controls include form Submit/Close, lightbox Close/Next/Previous/zoom/fit, footer links and the new gallery status/Retry. The new error statuses use solid navy/white surfaces and remain fully visible in the primary desktop/mobile failure journeys.

## Reviewable evidence

- [Regression summary and before/fixed observations](verification/interaction-v3/regressions.json), [finding ledger](verification/interaction-v3/findings.json), [route/arrow checks](verification/interaction-v3/source-route-check.json).
- [Catalogue Back baseline](verification/interaction-v3/before-webkit-catalogue-back-state.jpg) and [fixed state](verification/interaction-v3/after-webkit-catalogue-back-state.jpg).
- [Enquiry error before](verification/interaction-v3/before-webkit-enquiry-error-after-reopen.jpg) and [after](verification/interaction-v3/after-webkit-enquiry-error-after-reopen.jpg).
- [Floor-plan CTA before](verification/interaction-v3/before-webkit-floor-plan-link-destination.jpg) and [after](verification/interaction-v3/after-webkit-floor-plan-link-destination.jpg).
- [Highlights failure/retry](verification/interaction-v3/after-webkit-gallery-failure-highlights.jpg), [Interiors failure/retry](verification/interaction-v3/after-webkit-gallery-failure-interiors.jpg).
- [Menu hover before](verification/interaction-v3/before-hover-navigation.jpg) and [after](verification/interaction-v3/after-hover-navigation.jpg), [exact hover measurements](verification/interaction-v3/after-hover-contrast-results.json).
- [Additional visual/normal-motion results](verification/interaction-v3/visual-probe-results.json).

## Verification method, source freeze and boundaries

Baseline and fixed source were built in separate local directories and served on localhost. Form responses were intercepted before network delivery, using controlled 503/422/200 responses and fictional `example.invalid` input. All external requests and unmocked non-GET requests were blocked; the static server independently rejects non-GET. Primary fixed journeys report no page errors and no unexpected outbound requests.

Held images and 503 responses verify pending/failure behavior instead of relying only on cached success. For two intentionally pending WebKit screenshot states, the harness bypasses Playwright's `document.fonts.ready` wait because that wait also waits for the held image. Ordinary brand/visual captures wait for fonts and decoded images. This changes only the capture harness, not application behavior.

`npm run check` and the relevant final builds succeeded. AVA's check retains one pre-existing unused-import hint in `tests/enquiry.test.mjs` with zero errors/warnings; no unrelated test code was changed. The source file hashes and exact local build flags are in [source-freeze.json](verification/interaction-v3/source-freeze.json). Detailed raw results, original PNGs, source inventory, logs and the controlled harness remain in `artifacts/logic-audit-20261101-v3/`; compact evidence is versioned here. Old V2 reports were not overwritten.

These results establish the listed routes and changed contracts in the stated browser/viewport combinations. They do not certify every physical device, actual multi-finger pinch hardware, every network/OS media policy, external service uptime or real enquiry delivery. Normal-motion checks exercise decoded transitions and preference changes; they are not a frame-rate benchmark. Primary design source comparison is explicit about rendering differences and does not assert that every page pixel is identical across browsers.

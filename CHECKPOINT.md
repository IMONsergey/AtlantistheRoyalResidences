# Atlantis publication checkpoint

## Scope

Continue the user-authorized build and publication of all five original Figma real-estate projects. This checkout is Atlantis only. Preserve the existing design and narrative; use the original source assets and local fonts.

## Recovered implementation

- Recovered the complete previous implementation from `/workspace/scratch/6ba048c62957/sites/AtlantistheRoyalResidences` instead of rebuilding it from a new interpretation.
- Includes the sunset-to-underwater hero, myth, architecture, collage, location/ascent, three highlights, residences introduction and filters, three-image interior gallery, closing scenes, Unit 3402 detail, privacy and 404 pages.
- Recovered original WebP/SVG artwork, Vanitas/Caslon/Graphik/Inter WOFF2, asset provenance, Astro 7.4.4, GSAP 3.15.0, Vercel adapter and private enquiry handler.
- Design source: Figma `m3N3lJCoutaziEm4nt4CwO`, Atlantis page `148:2`; prepared desktop `2029:839`, mobile `2038:6880`, detail `2050:4754`.

## Narrow continuation fixes

- Catalogue bedrooms, area and preview selection persist in URL parameters when opening Unit 3402 and returning. Only recognized catalogue values are used.
- Reopening an enquiry while its request is pending preserves the context actually being submitted.
- A retry after a confirmed expired/conflicting reference obtains a new UUID; unchanged network retries keep the existing UUID and fields.
- Success requires an OK response whose receipt ID matches the submitted reference.
- Menu-to-enquiry transitions restore focus to the visible menu button rather than the now-hidden menu item.
- The image viewer clears its cached fitted width when opening another image.
- `SITE_URL` is accepted as the canonical origin; `PUBLIC_SITE_URL` remains supported.
- Added pinned TypeScript 5.9.3 and Node 24.19.2 typings from the sibling ORLA lockfile; `npm run check` provides the typecheck command.
- Updated the existing browser suite to cover filter return, form reopening after failure, receipt ID and menu-to-enquiry focus return.

## Recovery preparation evidence (historical)

- Recovered previous `tests/output/report.json` records a passing Chromium suite at 1440 x 900 and 390 x 844, with normal/reduced motion and no reported page or asset errors. This is historical evidence, not a fresh run of the continuation changes.
- Reviewed the recovered desktop hero, mobile hero, mobile residences and mobile unit screenshots. Visual styling was not changed in the continuation.
- Current static asset check: all 147 asset-map entries resolve; 5 WOFF2 files present.
- Current `node --check` passes for `tests/e2e.mjs` and `astro.config.mjs`.
- These preparation checks preceded the completed recovery release below. The final checks for the later motion update are recorded at the end of this file.

## Recovery handoff (completed)

The following was the recovery release handoff. It is historical, not a list of outstanding work for the current motion update; completed recovery validation is recorded under Publication verification.

1. Transfer source/public/fonts/provenance, excluding `node_modules`, `.astro`, `.vercel`, `dist`, `design/context`, `design/source-assets`, `design/assets-source.json` and `tests/output`.
2. Run `npm ci`, `npm run build`, `npm run check`, `npm run test:api` on the server.
3. Start the local server on port 4322 and run `npm run test:e2e` with an installed Chromium path if needed.
4. Configure the project origin/private Blob, verify a real production API receipt with a clearly synthetic record, commit/push and deploy. Root owns deployment and live storage verification.

## Content limits

Only Unit 3402 has supplied actual plan/details. No live inventory feed, current prices, availability, presentation PDF or payment schedule is fabricated. The existing request actions retain the original content and request missing documents honestly. The source plan and third interior reference retain their source quality limits.

## Publication verification, 2026-11-01

Recovered original design source and optimized assets preserved. Fresh npm install, production build, type checks, five enquiry API tests, and browser interaction checks passed on the authorized server. Private enquiry storage is configured on the Vercel project. Production HTTP and storage verification is recorded separately after deployment.

## Motion polish verified on server, 2026-11-01

Prepared a source patch for the current design/motion task: tall-viewport-aware residences pinning, non-replaying reveal lifecycle, shorter scroll scrub, coalesced geometry refresh, removal of permanent large-layer will-change, decoded image crossfade with robust swipe/rapid inputs, centered bounded plan zoom, resize-to-fit, stable modal scrollbar space and reduced-motion-aware dialog entrances. Existing source artwork and composition are retained. No API or submission payload logic changed.

Changed source: `src/scripts/site.ts`, `src/styles/global.css`, `src/components/Hero.astro`, `src/components/Origin.astro`, `src/components/Interiors.astro`, `src/components/Lightbox.astro`. Scenario handoff: `docs/MOTION-QA-2026-11-01.md`.

`git diff --check` passed in the text snapshot. The final server typecheck/build and existing Chromium suite subsequently passed as recorded below. WebKit/Safari, performance profiling and production verification of this update are not established by those checks.

## Historical motion verification handoff, 2026-11-01

The release owner reported final authorized server job `20261101T124548-54c1d23d28` with exit 0: all ten typecheck/build tasks across the five repositories passed, including Atlantis. Browser job `20261101T124919-e3044c77a5` also exited 0 with all five existing suites passing, including Atlantis `tests/e2e.mjs` via `scripts/browser-qa.mjs`.

The Atlantis suite is Chromium-only. Its reduced-motion contexts cover 1440x900 desktop and 390x844 touch-emulated mobile, source images, catalogue/filter return, highlights/interiors, Unit 3402, plan zoom, menu focus, privacy and mocked enquiry validation/retries. Its normal-motion flow additionally checks 1440x650 pre-pin copy readability, live resize to mobile with pin cleanup and no text overlap, keyboard gallery/inert consistency, and a live reduced-motion change followed by desktop resize. The corrected overflow assertion uses usable root client width; the stable scrollbar gutter is no longer treated as a failure. Exact coverage, unverified manual scenarios and report paths are in `docs/MOTION-QA-2026-11-01.md`.

The unpublished status belonged to that earlier handoff. The release owner subsequently confirmed commit `9d110ca` on the READY production deployment. Historical API/publication evidence above is not a fresh live receipt check for the motion update. The server browser suite mocked enquiries and did not establish WebKit/Safari, physical-touch/pinch, throttled-network or performance measurements. Screenshots were generated by the suite; this entry does not claim a manual visual review of every Atlantis scene.

The earlier documentation-only handoff is complete. The authoritative final commit, deployment and live acceptance record is the [five-project motion release report](https://github.com/IMONsergey/LuxuryRealty/blob/main/docs/MOTION-RELEASE-2026-11-01.md).

## Full-screen image loading correction, 2026-11-01

Independent review reproduced a remaining production defect on Unit 3402: delaying the second full-size photo left an empty image while its caption and counter already said 2 / 3. The inline slider had decode protection, but the separate full-screen viewer did not.

The viewer now decodes a replacement before committing the image/alt/caption/counter, ignores superseded results and invalidates requests on close. Its image promise cache retains at most three entries. Initial failures hide the broken frame; replacement failures retain the valid current frame and expose recovery guidance. Next can skip an unavailable image, and Previous or reopening can retry it. Plan zoom stays disabled until the source is ready. Source artwork, submission behavior and the existing viewport/zoom geometry are unchanged.

This correction is locally verified source for the current continuation, not a publication claim. Typecheck, production build, the existing Chromium browser suite and the focused Chromium/WebKit lightbox suite passed on the final source. The focused suite made zero API requests and reported zero page errors. The existing suite used mocked enquiry responses. Validation used Node 24.22.1 and the available Playwright 1.58.2 runtime; the repository's Playwright 1.62.1 declaration and lockfile were not changed. Build dependencies matched the pinned Astro/GSAP/TypeScript versions.

Exact scope and commands are appended to `docs/MOTION-QA-2026-11-01.md`. Final commit/deployment/live acceptance belongs in the [release report](https://github.com/IMONsergey/LuxuryRealty/blob/main/docs/MOTION-RELEASE-2026-11-01.md), which supersedes handoff status after publication.

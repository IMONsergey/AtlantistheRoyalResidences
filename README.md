# Atlantis The Royal Residences

A complete responsive implementation of the prepared Atlantis project in Figma, using Astro, TypeScript and GSAP. The pages are prerendered; the enquiry endpoint is a server route deployed through the Vercel adapter.

## Run and build

Use Node 24.x. Dependencies are pinned exactly and the lockfile is committed.

```sh
npm ci
npm run dev
```

The development server uses port 4322. For a production build:

```sh
npm run build
```

Set `SITE_URL` (or `PUBLIC_SITE_URL`) to the published origin to emit canonical and Open Graph URLs. The site does not guess a production domain.

## Pages and behavior

- `/`: sunset hero, underwater mythology, architecture, residence collage, Dubai location and map, the 150-metre ascent, three highlights, the signature residences transition, catalogue filters, three-image interiors gallery, yacht scene and contact cards.
- `/residences/3402/`: the supplied four-bedroom Signature Residence Type 2, metric and imperial room dimensions, interior photographs, full-resolution plan viewer and building/level diagrams.
- `/privacy/`: enquiry privacy information, data information and deletion request actions.
- `/404.html`: branded missing-page state.
- `/api/enquiry`: validated server endpoint, private storage and idempotent request references.

Navigation, galleries and dialogs work with a keyboard. Dialogs have focus containment, Escape dismissal and focus return. Galleries have previous/next controls and touch swipe. The plan supports fit, button/keyboard zoom, native touch scrolling and mouse dragging, with scrolling alternatives to dragging.

Catalogue filters and the selected preview are preserved in the URL when opening a residence and returning. The catalogue contains only the supplied residence 3402. Filters show a useful empty state; they do not imply a live inventory feed. Source presentation figures, narrative copy and room measurements are retained without adding prices or availability claims.

## Motion

GSAP ScrollTrigger provides restrained art parallax and text movement. On a desktop with a fine pointer, the source signature silhouette expands into the paper catalogue through a short reversible pinned sequence. Touch devices retain a continuous native scroll layout. `prefers-reduced-motion: reduce` removes the animation and pinning while keeping every scene and action available. There is no artificial loading delay or scroll hijacking.

## Enquiries

The form submits the shared contract to `/api/enquiry`. Client validation follows the server limits. A request reference remains unchanged during retries; editing submitted details creates a fresh reference. Success appears only after the server confirms `{ ok: true }`. HTTP failures, network failures and timeouts preserve the entered details and expose a retry path.

The handler stores enquiries in private Vercel Blob objects. It uses fixed UUID paths with overwrite disabled. An ambiguous write is confirmed by reading the matching stored fingerprint before reporting success. Validation, same-origin checks, body limits and a bounded per-instance rate limit run before storage. See `.env.example` for deployment configuration.

Presentation and catalogue PDFs were not supplied. Their actions request the actual material through the enquiry form. No fabricated PDF, payment schedule or download success is presented.

## Design and assets

Source file: `m3N3lJCoutaziEm4nt4CwO`, existing Atlantis page `148:2`.

| Composition | Figma node |
| --- | --- |
| Prepared desktop story | `2029:839` |
| Desktop hero and mythology | `2029:840` |
| Origin, architecture and collage | `2029:905` |
| Location and ascent | `2029:986` |
| Prepared mobile story | `2038:6880` |
| Mobile hero | `2038:6881` |
| Mobile location | `2038:6933` |
| Mobile residences introduction | `2038:7001` |
| Unit detail | `2050:4754` |
| Enquiry panel | `2038:6066` |

All artwork comes from the supplied Figma image and vector assets. The interface remains semantic HTML; no screen capture is used as a site section. Local WebP derivatives preserve the source image content and crop. Large individual SVG masks are rendered to transparent WebP derivatives for transfer size. Original SVGs otherwise remain intact. Identical asset files are deduplicated. `design/asset-provenance.json` records context keys, hashes, dimensions and runtime file paths.

Vanitas Bold, Caslon 540 LT Std Italic/Roman and Graphik Light were supplied with the project and are hosted locally as WOFF2 Latin subsets. Inter Variable is also local. There are no runtime Figma URLs or remote font requests.

The three prepared interior slides are the open-air pavilion, bedroom and living room, following the prepared component order. The third unit-reference image retains the source presentation watermark. Its caption identifies it as a supplied interior reference.

## Verification

Install a Chromium browser for Playwright once:

```sh
npx playwright install chromium
```

With the local server running:

```sh
npm run test:e2e
npm run test:api
```

`TEST_BASE_URL` can point to a preview deployment. `CHROMIUM_EXECUTABLE_PATH` can select an existing compatible browser.

The browser suite covers 1440 × 900 desktop and 390 × 844 mobile, normal/reduced motion, source-image loading, horizontal overflow, menu anchors, catalogue filters and empty state, gallery navigation, unit routing, plan zoom, form validation and repeated request errors before a confirmed success. API responses are mocked only inside the browser test; no real enquiry is submitted by it. Screenshots and the test report are written to the ignored `tests/output/` folder.

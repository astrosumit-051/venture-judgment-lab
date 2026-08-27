# Course-first interface design QA

- Source visual truth: `/Users/sumitkumarsah/.codex/generated_images/01a033f1-bcd2-7d40-9bfb-7b805e516bf3/exec-7991d014-5def-4e91-9c17-4d277a8e39b9.png`
- Verified implementation: `http://127.0.0.1:8787/?coursePreview=1`
- Desktop viewport: 1488 x 1058 CSS px at device scale factor 1
- Mobile viewport: 390 x 844 CSS px at device scale factor 1
- State: Day 1 visual-preview state, Scan companies expanded, pre-lock Luna

## Final comparison

- Full desktop implementation: `.scratch/course-first-desktop-final-1488x1058.png`
- Same-viewport source and implementation: `.scratch/course-first-comparison-final.png`
- Mobile implementation: `.scratch/course-first-mobile-final-390x844.png`
- Source and implementation were placed in the same comparison input after each
  material visual pass.

## Findings resolved

- [P1] The first implementation was too vertically dense, hiding later
  checkpoints below the viewport. Checkpoint headers, table rows, and judgment
  editor were compacted until all five checkpoints were visible.
- [P1] The original 242px rail materially exceeded the source proportion. It is
  now 168px at the reference viewport, with matching compact brand and nav type.
- [P1] The Luna boundary used a dark card instead of the source's quiet paper
  treatment. It now uses the light paper, coral accent, and disabled post-lock
  control shown in the selected mock.
- [P2] The first preview included internal discovery metadata and course pills
  absent from the source. Preview-only disclosure now stays compact while the
  active learner route retains truthful sourcing details.
- [P2] Header and route typography initially pushed the course below the fold.
  The final header, rotation title, and horizontal rhythm match the reference
  proportions without reducing legibility.

No P0, P1, or P2 visual mismatch remains in the accepted state.

## Required fidelity surfaces

- Typography: existing Lab serif/sans pairing retained and matched to the
  source hierarchy.
- Layout: fixed forest rail, ordered course column, and clean Why today/Luna
  sidebar match the reference composition.
- Color: cream, forest, coral, moss, and lime tokens remain consistent with the
  selected mock.
- Assets: the source contains no raster imagery. Visible interface symbols use
  Phosphor icons; no emoji, CSS drawings, or handcrafted placeholder SVGs.
- Copy: checkpoint order, company comparison fields, causal editor, Independent
  First Pass boundary, and Luna-after-lock language match the product contract.

## Interaction and responsive verification

- Today, Practice, Evidence, and More navigation all rendered their intended
  destinations in the selected in-app browser.
- The Reading and Scan accordions opened correctly; company selection, causal
  draft save, and Snapshot conversation handoff worked without preserving fake
  preview evidence.
- Luna remained disabled before Snapshot lock.
- The non-preview route rendered an explicit recovery state with Retry and Luna
  fallback actions while Day 1 remains unstarted.
- Mobile reflow at 390 x 844 retained all four destinations with no document
  overflow; the comparison table remains intentionally scrollable within its
  own bounded surface.
- Browser console warnings/errors: none.
- The release browser smoke verified keyboard focus, lazy-loaded advanced
  surfaces, mobile navigation fit, and large-record pagination.

## Comparison history

- Pass 1: identified excess vertical density, extra preview metadata, and the
  incorrect dark Luna card.
- Pass 2: resolved density and Luna treatment; identified the oversized rail
  and remaining header-height mismatch.
- Final pass: rail, header, route rhythm, five-checkpoint viewport fit, company
  comparison, causal editor, and right sidebar passed at 1488 x 1058.

final result: passed

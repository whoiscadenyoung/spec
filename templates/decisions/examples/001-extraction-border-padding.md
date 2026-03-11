---
id: 1
title: Extraction Border Padding
slug: extraction-border-padding
date: 2026-03-11
scope: Detection
status: Accepted
description: Add a replicated border to the source image before warpAffine to prevent strip clipping when near frame edges.
---

# Extraction Border Padding

## Context

When a test strip is held horizontally (long axis horizontal, bottom of strip on
left), `cv.minAreaRect()` returns an ~90° angle. `warpAffine` is used to
unrotate the strip to vertical before cropping.

If the strip is near the edge of the original image, the `warpAffine` rotation
swings part of the strip outside the image canvas bounds. The previous code
applied `Math.max(0, ...)` clamping on the crop coordinates, which silently
clipped pixels — cutting off the topmost pad and making the bottom whitespace
appear to extend into blank canvas area.

## Decision

Before calling `warpAffine`, add a border to the source image using
`cv.copyMakeBorder(..., cv.BORDER_REPLICATE)`. The border size is calculated as:

```ts
const borderSize = Math.ceil(Math.max(width, height) / 2) + pad;
```

This is large enough to contain the full strip half-diagonal after any rotation.
The strip center coordinates are offset by `borderSize` to remain correct within
the bordered canvas. After rotation, the crop uses the adjusted coordinates with
no clamping required.

Relevant code in `src/detector.ts` → `extractRotatedRegion`:

```ts
const borderSize = Math.ceil(Math.max(width, height) / 2) + pad;
const bordered = new cv.Mat();
cv.copyMakeBorder(src, bordered, borderSize, borderSize, borderSize, borderSize, cv.BORDER_REPLICATE);
const adjCX = centerX + borderSize;
const adjCY = centerY + borderSize;
```

## Consequences

- All 16 pads are now captured correctly even when the strip is near the frame
  edge after rotation.
- Slight memory overhead from the bordered intermediate `Mat`, which is freed
  immediately after the crop.
- `BORDER_REPLICATE` fills with edge pixels rather than black, avoiding
  brightness anomalies in color sampling near the crop boundary.

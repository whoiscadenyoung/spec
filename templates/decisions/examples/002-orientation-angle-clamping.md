---
id: 2
title: Orientation Angle Clamping
slug: orientation-angle-clamping
date: 2026-03-11
scope: Detection
status: Accepted
description: Clamp the deskew angle to (-90°, 90°] after normalisation to avoid accidental near-180° rotations during extraction.
---

# Orientation Angle Clamping

## Context

`cv.minAreaRect()` always returns `width >= height` by convention, with `angle` in `[-90°, 0°)`.
For a nearly-vertical strip (long axis ≈ vertical), the long side is returned as `width`, so
`normalizeRotatedRect` swaps width/height and adds `+90°` to convert to a height-dominant rect.

However, `+90°` applied to an angle like `-88°` gives `2°` (correct — tiny deskew), but applied
to other near-vertical representations can accumulate to `~180°`. The result was that two strips
that were correctly oriented in the original photo (`BB7A6404` and `4F3B8CC4`) came out of
`extractRotatedRegion` inverted 180°. `ensureCorrectOrientation` then had to flip them back.
This double-flip was purely an artefact of the angle calculation — the strips needed no
orientation correction at all.

The underlying cause: `minAreaRect`'s angle convention does not encode which "end" of the long
axis corresponds to the physical top of the strip. After the swap + `+90°`, the angle may be the
supplement (180° away) of the minimum-magnitude correction.

## Decision

After the swap-and-add, clamp `angle` to `(-90°, 90°]` by subtracting or adding 180° until it
falls in that range:

```ts
while (angle > 90) angle -= 180;
while (angle <= -90) angle += 180;
```

This ensures `warpAffine` always applies the **smallest-magnitude** deskew, never an accidental
near-180° rotation. For strips that are already vertical, the correction is ≈ 0°. For strips
that are horizontal (held sideways), the correction is ≈ ±90°. `ensureCorrectOrientation`
remains as a fallback for any remaining 180° ambiguity that is genuinely caused by camera
orientation.

## Consequences

- The double-flip (extraction inverts → orientation corrects) is eliminated for correctly-held
  vertical strips.
- `ensureCorrectOrientation` now acts as a true fallback for strips held upside-down by the
  user, rather than routinely correcting an extraction artefact.
- The horizontal strip (`78CED945`) is unaffected — its angle was already in range.

---
id: 4
title: Orientation Correction via Brightness Sampling
slug: orientation-correction-strategy
scope: Detection
status: Accepted
description: Sample top and bottom brightness bands to detect and correct 180° inversions after strip extraction.
---

# Orientation Correction via Brightness Sampling

## Context

After extraction, the strip may be upside-down (top physically near the bottom of the image). The strip spec defines:

- 0.1 cm top whitespace
- 1.1 cm bottom whitespace
- 16 pads between them

The bottom end is significantly more white (11x more whitespace) than the top. This asymmetry can be used to detect and correct a 180° inversion without needing external metadata (EXIF orientation, user input, etc.).

Earlier implementations counted consecutive white rows, which was brittle to framing noise at the very edge of the crop. The previous version also used a 15% sample window.

## Decision

`ensureCorrectOrientation` samples the **top 8%** and **bottom 8%** of the extracted strip height and computes average pixel brightness (averaging R+G+B across all pixels in each band) via `averageBrightness()`. If `topBright > botBright`, the strip is inverted and is flipped with `cv.flip(strip, flipped, 0)` (vertical flip).

Key choices:

- **8% window** (changed from 15%): Captures approximately 1 cm at each end of a 13 cm strip. Wide enough to average out noise but avoids sampling into the pad zone (pads start at 0.77% from top, bottom whitespace starts at 91.5%).
- **Average brightness over region** rather than row-counting: More robust to partial occlusion or minor crop inaccuracy.
- **Runs after every extraction**: Even when `normalizeRotatedRect` produces a near-zero deskew angle (ADR-002), this step is fast (O(pixels in 2 bands)) and acts as a universal safety net.

## Consequences

- Strips held upside-down by the user are automatically corrected.
- After ADR-002 (angle clamping), this function rarely needs to act on the vertical-strip case, but continues to provide correct results in all orientations.
- The 8% window must remain smaller than the bottom whitespace fraction (~8.46% of strip height) to avoid sampling into the pad zone when the strip is correctly oriented.

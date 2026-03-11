---
id: 3
title: Compound Definitions as Injectable Constant
slug: compound-definitions
date: 2026-03-11
scope: Architecture
status: Accepted
description: Introduce a CompoundDefinition array as an injectable parameter to decouple strip type from detector and reporter logic.
---

# Compound Definitions as Injectable Constant

## Context

The 16-pad water test strip has a fixed top-to-bottom ordering of compounds
(Cyanuric Acid through pH). Previously, pad colors in the output were identified
only by index (0–15). The HTML report had no labels telling the user which
compound each color swatch corresponds to.

Other strip variants (e.g. different manufacturers or test types) would have
different pad orderings and different units, so any compound mapping needed to
be replaceable rather than hard-coded inside the detector or reporter.

## Decision

Introduce `src/compounds.ts` with:

- `CompoundDefinition` interface: `{ name: string; unit: string }`
- `WATER_TEST_COMPOUNDS: CompoundDefinition[]` — the 16-entry ordered array
  matching `docs/compounds.md` top-to-bottom

The array is passed as an optional parameter down the call chain:

```ts
detectStrip(src, outputDir, steps, compounds?)
samplePadColors(oriented, whiteRef, compounds?)
```

Inside `samplePadColors`, each `PadColor` is annotated with
`compound: compounds[index]` when the array is provided. `PadColor.compound`
is typed as `CompoundDefinition | undefined` in `types.ts`.

The entry point (`index.ts`) passes `WATER_TEST_COMPOUNDS` explicitly. A future
caller can pass a different array for a different strip type, or omit it
entirely for a generic, unlabeled report.

## Consequences

- Compound names and units appear in the HTML report alongside each color swatch.
- The pipeline is agnostic to the specific strip type; compound mapping is
  caller-supplied.
- Adding a new strip variant requires only defining a new `CompoundDefinition[]`
  constant — no changes to detector or reporter logic.
- `compound` being optional on `PadColor` means existing tests and callers
  without compound data continue to work without modification.

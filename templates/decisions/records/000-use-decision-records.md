---
id: 000
title: Use Decision Records
slug: use-decision-records
scope: Documentation
status: Accepted
description: Decision to adopt ADRs for documenting architectural decisions made in this project.
---

# Use Decision Records

## Context

We want to be able to record any decisions made in the project that concern architecture, code, or other fields.

## Decision

We will use decision records loosely based on [MADR](https://adr.github.io/madr/) to document significant decisions. Each ADR is a short markdown file stored alongside the project, following the template in `adr-template.md`.

## Consequences

- Decisions are traceable and searchable over time.
- New contributors can understand the rationale behind key choices.
- A small overhead is added when making significant decisions.

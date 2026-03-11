# Decision Records

Templates for tracking decisions made in the project. When setting up a project, copy these files into `docs/decisions/`.

## Intended folder structure

```
docs/decisions/
├── decision-log.md          # Index of all decision records
└── records/
    ├── record-template.md   # Template to copy when creating a new record
    └── NNN-short-title.md   # Individual decision records
```

## Files

### `docs/decisions/decision-log.md`

The index of all decisions. Each accepted record gets a row in this table. Columns:

| Column   | Description                                      |
| -------- | ------------------------------------------------ |
| ID       | Integer matching the file number                 |
| Decision | Short title of the decision                      |
| Scope    | Area of the project affected (e.g. Process, API) |
| Status   | One of: Proposed, Accepted, Deprecated, Superseded |
| Record   | Markdown link to the file in `records/`          |

### `docs/decisions/records/`

Contains all individual decision record files, named `NNN-short-title.md` (e.g. `001-use-typescript.md`). Start numbering from `000`.

### `docs/decisions/records/record-template.md`

This is the template to create a new record. Fill in the YAML frontmatter fields and the three sections:

- **Context** — What situation or problem forced the decision. Past tense, factual.
- **Decision** — What was decided and how it works. Present tense.
- **Consequences** — Bullet points covering positive effects, trade-offs, and constraints on future work.

#### Frontmatter fields

| Field         | Description                                               |
| ------------- | --------------------------------------------------------- |
| `id`          | Integer matching the file number (e.g. `1`)               |
| `title`       | Short title describing what was decided                   |
| `slug`        | Kebab-case version of the title (e.g. `use-typescript`)   |
| `date`        | Date the decision was made, in `YYYY-MM-DD` format        |
| `scope`       | Area of the project this affects                          |
| `status`      | Proposed \| Accepted \| Deprecated \| Superseded by NNN   |
| `description` | One-sentence summary for indexing and tooling             |

## Adding a new record

1. Copy `records/record-template.md` → `records/NNN-short-title.md`
2. Fill in the frontmatter and the three sections
3. Add a row to `decision-log.md`

## Examples

See `examples/` for reference records showing the expected level of detail and writing style.

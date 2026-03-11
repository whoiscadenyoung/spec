# spec

A CLI built with Bunli

## Installation

```bash
bun install
```

## Development

```bash
bun dev -- [command]
```

## Building

```bash
bun run build
```

## Testing

```bash
bun test
```

## Usage

```bash
spec hello --name World
```

## Commands

- `hello` - A simple greeting command

## Templates

### ADR (Architecture Decision Records)

Templates for documenting significant architectural decisions live in `templates/adr/`:

- **`adr-template.md`** — The base template for new ADRs. Copy this file, rename it `NNN-short-title.md`, and fill in the YAML frontmatter and sections.
- **`decision-log.md`** — Index of all ADRs. Add a row here whenever a new ADR is accepted.
- **`000-use-decision-records.md`** — The first ADR, explaining why we use ADRs.
- **`examples/`** — Reference ADRs showing the expected level of detail and writing style.

## License

MIT
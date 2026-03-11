# ADR Command

We want to create a simple command to help us generate architecture decision records in our codebase.

We will have to create the CLI commands to be able to use our templates to create ADRs.

## Commands

The parent command will be adr. The subcommands will be the following:

### adr init

This should create the following folders in the project:

- `docs/`: Create at CWD if it does not exist.
- `docs/architecture/`: If it already exists, the command should throw an error and tell user to use --force flag. --force flag should replace current contents of `docs/architecture/`.
- `docs/architecture/decisions`: Empty folder to hold decisions future decisions.

This should also create the following files in the project:

- `docs/architecture/decisions/000-use-architecture-decision-records.md`: Copy template from `templates/adr/000-use-architecture-decision-records.md`
- `docs/architecture/decision-log.md`: Decision log copied from template
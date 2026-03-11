# ADR Command

We want to create a simple command to help us generate decision records in our codebase.

We will have to create the CLI commands to be able to use our templates to create ADRs.

## Commands

The parent command will be decisions. The subcommands will be the following:

### decisions init

This should create the following folders in the project:

- `docs/`: Create at CWD if it does not exist.
- `docs/decisions/`: If it already exists, the command should throw an error and tell user to use --force flag. --force flag should replace current contents of `docs/decisions/`.
- `docs/decisions/records`: Empty folder to hold future decision records.

We should then create the following files in the proper folders, copied from `templates/`:

- `templates/decisions/records/000-use-decision-records.md` -> `docs/decisions/records/000-use-decision-records.md`
- `templates/decisions/decision-log.md` -> `docs/decisions/decision-log.md`


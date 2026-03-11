# Decisions Command

We want to create a simple command to help us generate decision records in our codebase.

We will have to create the CLI commands to be able to use our templates to create ADRs.

Make sure the command/subcommands have informative descriptions for help. 

Favor using Bun APIs whenever possible. If third party libraries are required for functionality that isn't part of the Bun API, then ask before adding any.

Make smart design decisions in terms of reusable utilities that might be shared between these commands.

Then at the end, suggest any additional commands we might want to add, but I think this covers all the basics we'd need. 

## Commands

The parent command will be `decisions`. The subcommands will be the following:

### decisions init

The command should do the following:

1. Create the following folders in the project:

- `docs/`: Create at CWD if it does not exist.
- `docs/decisions/`: If it already exists, the command should throw an error and tell user to use --force flag. --force flag should replace current contents of `docs/decisions/`.
- `docs/decisions/records/`: Empty folder to hold future decision records.

2. Create the following files in the proper folders, copied from `templates/`:

- `templates/decisions/records/000-use-decision-records.md` -> `docs/decisions/records/000-use-decision-records.md`
- `templates/decisions/decision-log.md` -> `docs/decisions/decision-log.md`

If succeeds, output a success message pointing to the new docs/decisions folder and saying to use `decisions create` to create the first decision record.

### decisions create

The following input should be passed in either as flags or parameters, with title being the main input:
- title: It should be formatted as a normal title like "Use Decision Records" (required)
- scope: Brief word/phrase describing the record scope (optional--defaults to empty)
- description: A brief description for the decision record (optional--defaults to empty)
- status: Status from valid options of Proposed, Accepted (optional--defaults to Proposed)

The command should do the following:

1. Slugify the title (can use an exisiting library like GitHub if this is not in Bun API)
2. Check the existing `docs/decisions/records/` folder to find the next valid ID (from {id}-file-name.md).
    - Next valid should be the highest number + 1. So if there's 001 and 002, then we should create 003
3. Create the file as `{ID}-{SLUG}.md`
    - The file contents should be the template file `templates/decisions/records/record-template.md`
    - We should replace the `# {TITLE}` with the title passed in
    - We should update the frontmatter with the relevant input or generated fields
        - {TITLE} from user input
        - {SCOPE}, {DESCRIPTION} from user input or left as-is
        - {SLUG} from slugified title
        - {ID} from generated ID number
        - {STATUS} as proposed, unless passed in by user.
4. Automatically update the `docs/decisions/decision-log.md`

If it succeeds, we should output the filepath of the new record and the frontmatter.

If some of the frontmatter is missing, we should suggest what the values should be. 

If there's an error, such as title not being passed in or other issues show them.

### decisions update-log

This should simply check the `docs/decisions/records/` for records and update the `decision-log.md` file so that the table shows the correct frontmatter for all the logs. We can consider this an auto-generated file so there's no risk in completely regenerating it. 
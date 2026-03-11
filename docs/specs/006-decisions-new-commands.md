# Decisions: New Commands

## decisions list

A list command should list all decision records and their file paths. Paths should be relative and just the file name, so `000-use-decision-records.md`. At the top we can say something like "All records can be found in `docs/decisions/records/`".

We would likely have to read in all the markdown files to get the frontmatter. We could use the Bun YAML parser if we aren't using it already.

### Output

We should ensure the output is clean and readable. If we can create a table to display the output, then that might be ideal, but the table would have to be responsive to the terminal window size. We'd also have to make sure our display takes into account the description lengths may vary. So we could potentially have like the meta fields on one line and the description on the next line, perhaps indented or something. 

Decide based on best practices how the default output should be.

It should meet the following requirements:

- Shows all records from `docs/decisions/records/`
- Has the following fields: Title, Scope, Description, Status, Path

#### with --json

```json
{
    "status": "success",
    "items": [
        {
            "title": "",
            "path": "",
            "scope": "",
            "status": "",
            "description": ""
        }
    ]
}
```

### Flags

### --json

This flag should work with any other flags and display the output formatted as JSON.

#### --full

Similar to default output but has all frontmatter fields: ID, Title, Scope, Status, Description, Date, Path. Should work with the --scope flag, --status flag and --json flag. 

#### with --json

```json
{
    "status": "success",
    "items": [
        {
            "id": "",
            "title": "",
            "path": "",
            "date": "",
            "scope": "",
            "status": "",
            "description": ""
        }
    ]
}
```

### --scope

Filter the list by scope string. Should work with the --full flag, --status flag and --json flag. 

The following should all return the same:
- `decisions list --scope="Convex"`
- `decisions list --scope "convex"`

Returns no matching records if none can be found.

#### with --json

```json
{
    "status": "success",
    "filters": [
        "scope": "",
    ],
    "items": []
}
```

### --status

Filter by status string, ideally case-insensitive (accepted -> Accepted, proposed -> Proposed, deprecated -> Deprecated). Do not include the supersedes flag yet as that will be complicated to match since it will include an id of another record.

Should work with the --full flag, --status flag and --json flag. 

The following should all return the same:
- `decisions list --status="Accepted"`
- `decisions list --status "accepted"`

#### with --json

```json
{
    "status": "success",
    "filters": [
        "status": "",
    ],
    "items": []
}
```

---

## decisions list-scopes

We should also have a command to list all scopes used across decision records.

### Output

I envision this might be nice to show as a table perhaps with counts of records for each, or at least a tab-aligned output. 

#### with --json

```json
{
    "status": "success",
    "items": [
        {
            "scope": "",
            "count": 0
        }
    ]
}
```
# Decisions: Sync and validate

## `decisions validate`

We will want to add a `decisions validate` command to validate our existing structure. It should do the following:

- Make sure no two file names have the same ID
- Check and make sure all frontmatter is valid
- Check and make sure that the file names match frontmatter

### Example output

Here is the example output I'm envisioning. Make sure we cover both the regular human readable output and the JSON flag. The human output should link directly to the file paths

Make sure we follow our established patterns for logging errors. 

#### Success

#### Error

I'm envisioning error codes might be like invalid syntax if frontmatter YAML syntax errors (wrong type for status, wrong date format, etc), invalid identifier or id/name if the ID or slug doesn't match the file name, etc.

So it should capture for each error in an array:

- file path
- error code/message
- description of error (Make sure number in file path matches ID field, Make sure date format is YYYY-MM-DD, etc.)

### --fix flag

The fix flag should attempt to fix any errors that are autofixable.

Errors that are auto-fixable:
- If the ID was incorrectly formatted as a string->convert to number. 
- If the ID or slug in the frontmatter does not match the file name, we should update these fields. We will use the file path as the source of truth for ID and slug.

Errors that are not auto-fixable: 

- File path ID conflicts (we want to preserve order stack, and this would require us to rename all subsequent files which is unreasonable). This would block us from changing frontmatter ID to invalid ID
- If the frontmatter fields are invalid values (we don't want to try to convert every possible date type to the correct format, or guess what was meant by a specific status that wasn't part of our enum)

If you can think of any other errors in our frontmatter that would be easily fixable, you can suggest them and wait for my approval to continue with the change.

### Example output

Should have both human and JSON options. 

Should show similar output to the default output of errors that can't be fixed. Should indicate which errors have been fixed for which files.

## `decisions sync`

The sync command should ensure our records are correct before syncing.

So while it should sync the decision log to match the decision records, if it encounters errors in the decision files it should exit and throw an error. It should tell the user that their files are invalid and they should use the validate command to detect and fix issues.

## Shared utilities

Make sure we're abstracting logic that would be shared between these two files. However, one difference is that we could speed up the sync if we early-exit the validation functions on the first validation error. 
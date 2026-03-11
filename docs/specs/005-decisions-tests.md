# Decisions: Tests

Create tests for our bunli `decisions` commands. We should keep these simple so they test the core functionality. 

We should not make tests tailored to pass our existing code. We should make tests that pass our desired success/pass state. If there are failed tests due to issues in the code, that is perfectly acceptable--as long as the tests reflect our desired and successful state.

## Commands

We will want to test the following areas:

- The init command succeeds in creating the files
    - Check that the folders/files are created and that the contents is populated.
- The init command errors if trying to create on top of an existing directory
- The create command creates a decision and the flags work
    - Errors if no title, adds fields to frontmatter if they're passed in, updates log, etc.
- The list command lists decisions and the flags work
- The JSON flag works on all commands, success AND error states, to display valid JSON output
- The sync command syncs when frontmatter in a decision file changes.


I don't want the files/folders created directly in this project, so if we can modify our working directory to be a sub-directory that persists so I can review, or a /tmp folder, then that would be ideal. Not sure what the standard is for bun/node projects and test output folders but follow the best practices.

## Utils

These are just some ideas of the test cases we might want to implement. You don't have to implement these if you don't think they'll provide sufficient coverage. You can implement other tests if you think they'd be better.

- Slugify: Consider cases such as title being invalid (already slugified)
- Make sure ID is formatted properly with a variety of numbers.
- Test parsing frontmatter with errors
- Test getting next id in an empty folder or in a folder where IDs are out of order or may be an invalid format
- Test reading records when some may not be valid
# Error handling and JSON flag

## Error handling

We need to enhance error handling. 

For our commands, we should make sure we maintain a mapping of potential error codes, messages, and suggestions. That way, we can get a specific error and pass it out to the console.

You should identify current errors used in the decisions commands. Then have our decisions commands use custom error types based on the default Error() type. 

For unknown errors, you can treat them as UNKNOWN. If there are JS/TS default error types that would be good to use, we could extend those or implement custom Error() types similarly but so they have the suggestions option.

### Example error type

Here is an example of what an error might look like when the docs/decisions/ already exists. 

The structure is flexible, so choose the best possible design, but this is just roughly what should be included: the code/type, the error message, and what to do with the error.

Some errors may not have any suggestions, or some may have multiple possible fixes. But in general, there will only be one suggestion.

```ts
{
    code: "ALREADY_EXISTS",
    message: "A docs/decisions/ folder already exists in this location.",
    suggestions: [
        "Retry the command with the --force flag to replace the contents."
    ]
}
```

### Example error log

Here is an example of what an error message might look like in the console, using console.error(). You can apply best practices for formatting these messages, this is just an idea. 

```zsh
❌ "decisions init" failed: EXISTING_DECISIONS_FOLDER

   A docs/decisions/ folder already exists in this location. 

   Suggestions
   Retry the command with the --force flag to replace the contents.
```

```zsh
❌ Command "decisions init" failed: EXISTING_DECISIONS_FOLDER

   A docs/decisions/ folder already exists in this location. 

   Suggestions
   1. Retry the command with the --force flag to replace the contents.
   2. Rename or clear the docs/decisions/ folder.
```

---

## JSON flag

All commands should have a `--json` flag to enable JSON output format for content and errors.

This enables AI agents to receive well-structured output that they can easily parse.

### Templates

These templates are ideas that we can use, but we don't have to implement them as is. I think the goal is for the responses to reflect what would be familiar to an agent, such as a REST API.

#### Error template

Here is an error response template. 

```json
{
    "status": "error",
    "error": {
        "code": error.code,
        "message": error.message,
        "suggestions": error.suggestions
    }
}
```

#### Success template

```json
{
    "status": "success",
    "data": {},
    "nextSteps": []
}
```

### Example responses

#### Error response example

```json
{
    "status": "error",
    "error": {
        "code": "ALREADY_EXISTS",
        "message": "A docs/decisions/ folder already exists in this location.",
        "suggestions": [
            "Retry the command with the --force flag to replace the contents."
        ]
    }
}
```

#### Success response example

```json
{
    "status": "success",
    "data": {
        "message": "Initialized docs/decisions/ successfully and created the first decision record",
        "files": [
            "docs/decisions/decision-log.md",
            "docs/decisions/records/000-use-decision-records.md"
        ]
    },
    "nextSteps": [
        "When ready, run decisions create to create your first decision record."
    ]

}
```
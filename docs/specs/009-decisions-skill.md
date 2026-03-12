# Decisions: Skill

## Overview

We've implemented a new decisions command tree in our project to allow users to create and manage a local decisions directory to record key decisions related to code, architecture, or anything really. 

It follows the idea of "architecture decision records", "markdown architecture decision records", or "markdown any decision records", leaning on the "any" side.

Refer to docs/decisions/ for documentation that will point you in the direction of our usage, intent, and all the commands, functions, templates etc. that are part of the decisions command. 

## Task

Your job will be create a skill in the project root at skills/spec-decisions/. The skill should rely on the create-skill skill and follow the open source agent skills specifications, using reference files as needed for auto-discovery.

The skill should capture the intent of creating decision records, but with our custom template and grounded in our templates/decisions/examples. 

The skill should be triggered when the user asks to add a decision record, make an adr record, log a decision, record a decision, etc. 

The agent should capture the design/code/architecture decision made and create a file that reflects roughly our examples and follows our template. We'll want to capture stuff such as how a bug fix was applied, why a schema was written a certain way, etc. 

So for example, I might ask the agent to help me troubleshoot why I'm getting a specific typescript error. The agent will investigate and find the cause and propose the fix. I will ask them to record the decision, which should capture an overview of what we determine was the problem and solution, so that if we ever run into the same issue again we know exactly how to address it. 

## Implementation

We've created a CLI for the agent to use to be able to easily manage decision records without having to manually create files, determining numbering schemes, etc. Think of this as a type of harness. Review the documentation for commands and the actual command definitions in the code, but use this as a rough usage guide.

=={SCRIPT} is a placeholder for now. Leave it in the skill as {SCRIPT}. We will correct it later when we determine how the script will be executed."

### Decision record creation

When an agent is supposed to create a decision record, they will:

1. Determine a short but descriptive title for the decision (2-5 words usually)
2. Determine the scope for the decision. The scope is the general category/area that the decision applies to (convex if working in convex backend, routing if working with TanStack Router, file utilities if working with file utitlies, etc.)
3. Create a short 1-2 sentence description for the decision
4. Run `{SCRIPT} decisions status --json` to see if the decisions library has been initialized yet. 
    - If initialized, can continue. If not initialized, run `{SCRIPT} decisions init --json`. If init fails, stop all tasks and inform user. 
5. Run `{SCRIPT} decisions create --title {TITLE} --scope {SCOPE} --description {DESCRIPTION} --json`
    - If error, stop and inform user of the error
6. Check output of create command for the path of the record
7. Navigate to the file, fill out the template replacing comment blocks with responses. 
8. Save file and confirm to user the location of the new file and tell them they can now approve it. 

### Decision record reference

If an agent is supposed to check for existing decision records, look for a record related to x topic, find a previous decision, etc. Then they can:

1. Run `{SCRIPT} decisions list --json` to view all previous decision titles, scopes, descriptions, etc.
    - Optionally run `{SCRIPT} decisions list-scopes` to view all possible scopes.
    - Optionally run `{SCRIPT} decisions list --scope {SCOPE} --json` to narrow down to a scope.
2. Review the results for any decision records that sound related based on the available fields. 
3. Use the provided URL to navigate to that decision file and review it. 

## Notes

If there are any other useful components of this that you think agents should be able to run, you can mention it in your conclusion. 
Make sure we're following best standards for structuring agent skills.
Make sure you understand our documentation, template, examples, etc. first. 
You can use subagents as needed to keep the main context window clean such as to review files, documentation, browse the web for similar decision record prompts/skills, etc.
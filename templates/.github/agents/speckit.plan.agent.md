---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
handoffs:
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Create Checklist
    agent: speckit.checklist
    prompt: Create a checklist for the following domain...
tools: [execute/runInTerminal, edit/createFile, edit/editFiles, read/readFile, todo]
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## CLI Tools

This CLI Tool is a custom helper library to assist you in the spec-driven development process. {SCRIPT} should be replaced with the actual script command:

```
bun /Users/cadenyoung/Developer/spec/src/index.ts
```

## Progress Tracking

You MUST use #tool:todo to create a progress checklist for this outline. Update it as you complete each step.

The steps should correspond to the outline as follows:

1. Get feature paths
2. Create the plan file
3. Load spec and constitution
4. Execute plan workflow (research, design, contracts)
5. Update agent context
6. Report completion results

## Outline

1. **Use the spec CLI to get the current feature paths**:

   a. **Run the command** from the repo root:

      ```zsh
      # Returns path variables for the current feature branch
      {SCRIPT} check-requirements --paths-only
      ```

   b. **Read the command output** to extract the feature paths.

      - The output is a JSON object. Parse these fields:
        - `featureDir`
        - `specPath`
        - `planPath`
        - `branch`

   c. **If the command fails or JSON parsing fails, STOP immediately**: Instead:

      - Report the error to the user and instruct them to verify they are on a feature branch.
      - Wait for user guidance before proceeding.

2. **Use the spec CLI to create the plan file**:

   a. **Run the command** from the repo root:

      ```zsh
      # Creates plan.md from template in the feature directory
      {SCRIPT} create plan
      ```

   b. **Read the command output** to confirm the plan file was created.

      - The output is a JSON object with `branch`, `planFile`, and `featureDir` fields.

   c. **If an error occurs, STOP immediately**: Instead:

      - Report the error to the user in the chat window with the message: "Error creating plan ({errorType}): {errorMessage}".
      - Wait for user guidance before proceeding.

   d. **Report the plan creation result** to the user: "Created plan file at {planFile}"

3. **Load context**: Read the spec at `specPath` and `/memory/constitution.md`. Load the plan template that was just created at `planFile`.

4. **Execute plan workflow**: Follow the structure in the plan template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Re-evaluate Constitution Check post-design

5. **Update agent context**:

   a. **Run the command** from the repo root:

      ```zsh
      # Detects which AI agent is in use and updates the appropriate context file
      {SCRIPT} update agent-context
      ```

   b. **Read the command output** to confirm which files were updated.

      - The output is a JSON object with an `updated` array of file paths.

   c. **If an error occurs**, report it to the user but continue — context update is non-blocking.

6. **Stop and report**: Command ends after Phase 1 planning. Report branch, plan file path, and generated artifacts.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Define interface contracts** (if project has external interfaces) → `/contracts/`:
   - Identify what interfaces the project exposes to users or other systems
   - Document the contract format appropriate for the project type
   - Examples: public APIs for libraries, command schemas for CLI tools, endpoints for web services, grammars for parsers, UI contracts for applications
   - Skip if project is purely internal (build scripts, one-off tools, etc.)

**Output**: data-model.md, /contracts/*, quickstart.md

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications

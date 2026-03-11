# ADR

We want to be able to create architecture decision records in markdown for our project and eventually have a command to generate these automatically. However first we will have to refine our templates. 

## Steps

1. Review the `templates/adr/adr-template.md` to ensure it's clear and precise for any future agents.
    - Evaluate the `templates/adr/examples/architecture/decisions/` directory for examples of decisions that we want to guide the template towards.
    - Ensure we keep the YAML frontmatter as that will be helpful for record keeping.
    - Update the template if needed for clarity and intent, but favor keeping it the same and simply cleaning it up if it's already good enough.
2. Based on the updated template, edit the `templates/adr/000-use-architecture-decision-records.md` file. 
    - This should be a very very brief file that simply explains the decision to use architecture decision records.
    - Status should be Accepted.
3. Edit the `templates/adr/decision-log.md` file
    - This file should keep the header at the top.
    - It should have a brief description.
    - Then it should have a formatted markdown table with the following columns:
        - ID: {id}
        - Decision: {title}
        - Scope: {scope}
        - Status: {status}
        - Record: {path formatted as markdown link [file.md](relative file path)}
    - We should then add the first ADR we've created to the decision log.
4. Lastly, we should update the README to ensure it properly explains these template files.

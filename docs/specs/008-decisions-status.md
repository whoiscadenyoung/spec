# Decisions: Status

Our workflow should require us to run the init command before running create. I see that we already return an error when trying to run the other commands before the project as been initialized, but we'll want to block create too since if we don't do init we won't have that first 000 record. 
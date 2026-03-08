# Jira Import Guide (Accentify)

## Files
- `jira/epics.csv`
- `jira/stories_tasks.csv`

## Recommended order
1. Import `epics.csv`
2. Import `stories_tasks.csv`

## Jira CSV import path
Jira Settings -> System -> External System Import -> CSV

## Field mapping
Map these CSV columns to Jira fields:
- Issue Type -> Issue Type
- Summary -> Summary
- Description -> Description
- Priority -> Priority
- Labels -> Labels
- Components -> Components
- Story Points -> Story Points (or Story point estimate)
- Epic Name -> Epic Name (for Epic rows)
- Epic Link -> Epic Link (for Story/Task rows)

## Notes
- If your Jira setup does not accept Epic names directly in `Epic Link`, import Epics first, then replace `Epic Link` values in `stories_tasks.csv` with created Epic keys (example: `ACC-12`) and import again.
- Components in CSV are semicolon-separated (example: `Mobile;Firebase Functions`).
- Story Points are provided for Stories/Tasks only.

## Optional cleanup after import
- Create a board with statuses: Backlog, Selected for Dev, In Progress, Code Review, QA, Done.
- Add sprint and assignees.

# Pear Fellows 2026–2027 deadline reverification

**Observed:** 2026-08-08 15:43:39 CDT (UTC−05:00), America/Chicago  
**Scope:** First-party Pear and Airtable sources only. The form was not filled or submitted.

## Finding

- Pear's official Fellows page currently states: “The deadline for our 2026-2027 Fellow cohort is Sunday, August 9th.” In context, that is **Sunday, August 9, 2026**. Pear does not publish an application cutoff time or timezone on this page. ([Pear Fellows](https://pear.vc/programs/dorm/fellows/))
- The same official page still shows both **“Apply here”** and **“Apply now”** calls to action, and both point to Pear's Airtable application URL. ([Pear Fellows](https://pear.vc/programs/dorm/fellows/), [official Airtable form](https://airtable.com/appOpLuCEFZnc97UV/paglABYl3DCPE4odd/form))
- The linked Airtable endpoint returned HTTP `200` and an Airtable **“Interface Form”** page shell during this check. However, the rendered form fields and submission control could not be inspected reliably in the available read-only browser session. Therefore, the strongest supportable conclusion is: **Pear is still publicly inviting applications through the official form link, but this check did not conclusively prove that Airtable would accept a submission.**

## Limitations

- Pear specifies the calendar date but no exact time or timezone; do not infer an end-of-day cutoff in Chicago, Eastern, or Pacific time.
- A reachable Airtable URL and an active “Apply now” link are not equivalent to a verified successful submission path.
- No data was entered and no submission was attempted, so the application was not changed.

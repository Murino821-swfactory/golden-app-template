# CV Matcher job library — OTH-104 / OTH-114

The library appears beside the job posting on `/analyze` and `/dashboard`, in English
and Slovak. Search by title or category, select a role and click **Use role description**
to replace the posting. The CV remains intact. The posting stays editable and the
existing matcher recalculates its score.

## Default selection

[ASSUMPTION] The request asks for ten commonly used roles but supplies no market,
time period or ranking source. These are ten representative starter roles, not a
statistical top-ten claim. Descriptions are authored templates, not actual vacancies.

- AI: Machine Learning Engineer, AI Engineer, MLOps Engineer.
- Data: Data Analyst, Data Scientist, Data Engineer, Analytics Engineer.
- AWS Cloud: AWS Cloud Engineer, AWS Solutions Architect, AWS DevOps Engineer.

## Saved roles

[ASSUMPTION] Keep the existing browser-only, public matcher model. No server database
or cross-device/account sharing was requested. LocalStorage key
`cv-matcher:job-library:v1` stores `{ version: 1, roles: [{ id, title, category,
description }] }`. The UI explicitly describes device/browser persistence. Changing
language keeps custom descriptions as authored; default descriptions follow the locale.

Enter a title/category and a posting, then **Save current posting as a role**. Selecting
a saved role offers **Update saved role** and **Delete saved role**. Defaults remain
immutable; saving while a default is selected creates a custom role. Deleting a saved
role leaves the current posting intact. Clearing browser data removes saved roles.
This is browser storage, not private account storage: users of the same browser profile
share the library. CV text is never stored by the library or sent over the network.

Limits: 100 custom roles, 120 characters per title, 50,000 characters per description.
Damaged/version-mismatched storage, quota failure and unavailable storage show an error
without claiming success or replacing the existing stored data. If another tab changes
the library, reload before editing; concurrent edits are refused when detected.

## Delivery

Changes belong only to `demo/cv-matcher` in `golden-app-template`. Merge the task PR
there, then build with `/newapp/cv-matcher` and the existing Firebase client config.
Publish the gated export to the `cv-matcher/` prefix of `sw-factory-prototypes`, using
the factory's `publishPrototype` function. Verify the live EN/SK analyzer, custom CRUD
and served assets. Do not merge this customer feature into template `main`.

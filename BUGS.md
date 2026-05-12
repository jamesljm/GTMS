# GTMS — Bugs & Questions

## Bugs

- **Add Member: temp password not shown.** Backend generates a password but the frontend dialog closes without showing it, so new user can't log in. Workaround: click "Reset Password" on the new user, which does show it. (`team/page.tsx`)
- **Add Member: no welcome email sent.** Expected behaviour — when adding a user, they should receive an email with their login + temp password. Currently neither happens. (`routes/users.ts` POST `/`)

## Decisions / changes to make

- **Login: Microsoft SSO only.** Remove email/password login form and the Sign Up link from `/login`. Remove the `/signup` page entirely and the `POST /auth/signup` backend route. Only "Sign in with Microsoft" remains.
  - Implications: existing `ed@gtms.com` test account becomes unusable unless we keep a fallback. Need to seed/keep at least one user in the DB whose email matches a real Microsoft account so someone can log in initially.

# Codex Landing Rollback Plan

## Decision

- Baseline: `HEAD` (`cca4ef8`).
- Scope: revert **all current Codex working-tree changes**, not only the 11 files named in the request.
- There are no staged changes. Restore every changed tracked path to `HEAD` and remove the exact untracked paths created by this change set.
- Do not commit or push.

## Execution

1. Re-check the working tree before changing anything:
   - `git status --short --untracked-files=all`
   - `git diff --cached --name-status`
   - Stop if staged changes or new paths not listed below are present.
2. Create a reversible backup outside the repository (for example, under `C:\Users\Lumos\AppData\Local\Temp\kilo`):
   - Save `git diff --binary` for tracked changes.
   - Save the exact untracked-path list from `git ls-files --others --exclude-standard`.
3. Restore all changed tracked files to `HEAD`:
   - `src/App.jsx`
   - `src/styles/index.css`
   - `package.json`
   - `package-lock.json`
   - `index.html`
   - `dist/index.html`
   - `mobile/.expo/dev/logs/start.log`
   - `server-start.log`
   - `tmp/backend.pid`
   - `tmp/frontend.pid`
   - Every deleted file under `dist/assets/` shown by `git status` (restore the tracked versions, including the old hashed bundles and CSS).
   - Use `git restore --source=HEAD --worktree -- <explicit paths>`; do not use a broad reset that could affect paths outside this snapshot.
4. Remove only these exact untracked paths:
   - `dist/assets/AddSupportRequest-CiEdjms0.js`
   - `dist/assets/AdminCustomersPage-Rh0MBg1b.js`
   - `dist/assets/AdminPanel-BGFMWxye.js`
   - `dist/assets/AdminQuotationsPage-Ckj1w4QJ.js`
   - `dist/assets/AdminUserManagementPage-M7NZwtPL.js`
   - `dist/assets/CustomReportBuilderPage-Jlutcvw_.js`
   - `dist/assets/LandingPage-CkS6Uzy2.js`
   - `dist/assets/LandingPage-Dg_NrJnC.css`
   - `dist/assets/MyGroupAccountsPage-DLqR7oEY.js`
   - `dist/assets/QuotationSummaryReportPage-B4ayYpgL.js`
   - `dist/assets/Quotations-DtNx3_mC.js`
   - `dist/assets/SalesDashboard-CmE_tD1d.js`
   - `dist/assets/SummaryReportsPage-BaSlfnsG.js`
   - `dist/assets/TeamViewPage-D6p7bgtk.js`
   - `dist/assets/dashboard-screenshot-BMXDOYsi.png`
   - `dist/assets/getSwBarodaMumBoardData-0qqQsnVI.js`
   - `dist/assets/index-Bq1aA3p4.css`
   - `dist/assets/index-DIroSA0K.js`
   - `dist/assets/userGroupApi-Csm6ECH0.js`
   - `src/assets/dashboard-screenshot.png`
   - `src/components/landing/`
   - `src/pages/landing/`
   - `src/styles/landing.css`
   - `tailwind.config.js`
   - Use explicit `git clean -fd -- <paths>` pathspecs, not an unscoped `git clean`.
5. Verify the tree is clean:
   - `git status --short --untracked-files=all`
   - `git diff --exit-code`
   - `git diff --cached --exit-code`
6. Validate the restored application with `npm run build`; then confirm there are no remaining imports or references to `landing.css`, `pages/landing`, or `components/landing`.

## Validation Criteria

- `git status` is clean.
- The landing route and landing imports are absent from `src/App.jsx`.
- The landing directories, `landing.css`, generated landing bundles, screenshot, and `tailwind.config.js` are absent.
- The build completes successfully against the restored dependency and stylesheet configuration.

## Risks

- Runtime logs and PID files are included because they are part of the current Codex working-tree change set; restoring them is intentional under the selected “All Codex changes” scope.
- The landing files are untracked and have no `HEAD` versions, so deletion is the only rollback mechanism for those files.

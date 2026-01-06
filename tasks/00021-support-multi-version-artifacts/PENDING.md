# Deferred Items for Task 00021: Support Multi-Version Artifacts

The following items were identified as remaining but have been **explicitly deferred** by the user to close this task. These will be addressed in future tasks or as part of general maintenance.

## 1. Testing & Verification
- **E2E Tests**: The `tasks/00021-support-multi-version-artifacts/02-artifact-viewer-versions/tests/e2e` directory is currently empty. Playwright tests need to be added to cover:
    - Version switching via the dropdown.
    - Deep linking to specific versions (e.g., `/a/{token}/v/{number}`).
    - The "Switch to latest" banner functionality on old versions.
    - Version management (rename, delete, upload) in the artifact settings.
- **Validation Videos**: Per project requirements, validation videos for the above E2E flows need to be produced.
- **Unit Test Coverage**: While backend tests exist (`isLatest.test.ts`, `comment-latest-enforcement.test.ts`), frontend unit tests are minimal (only 2 tests in `version-switcher.test.tsx`).

## 2. Code Polishing
- **Dynamic "Uploaded By" Name**: In `ArtifactVersionsTab.tsx`, the `uploadedBy` field is currently hardcoded to `'Owner'`. It should be updated to fetch the actual user name from the `createdBy` ID.
- **Task Documentation Alignment**: 
    - The main `README.md` for Task 00021 still lists the status as `READY FOR IMPLEMENTATION`.
    - `Subtask 01 README` lists status as `BACKEND COMPLETE - FRONTEND PENDING`.
    - These should be updated to `COMPLETE` or `CLOSED` to reflect the current state.

## 3. Future/Deferred Features (Out of Scope for MVP)
These were identified during discovery and remain as potential future enhancements:
- **Custom Default Version**: Ability to pin a specific version as the default instead of always showing the latest.
- **Manual Comment Control**: Ability to manually open/close comments on specific versions (currently automatic: only the latest version accepts comments).
- **Version Diffing**: UI to compare changes between two versions.
- **Branching**: Support for non-linear version history.

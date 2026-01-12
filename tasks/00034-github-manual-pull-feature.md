# Task: Design GitHub "Manual Pull" Workflow
**Status:** DRAFT
**Created:** January 2026

## Objective
Enable users to manually select a specific GitHub commit and import it as a new "Version" of an existing Document. This avoids "Auto-Sync" (CI/CD) complexity while leveraging Git as a source of truth.

## User Story
*   **As a** User,
*   **I want to** connect my GitHub repository,
*   **And** see a list of recent commits on a branch,
*   **So that** I can click "Import this Commit" to create a new version of my artifact without dragging and dropping files.

## Functional Requirements
1.  **Git Auhtentication:** OAuth connection to GitHub.
2.  **Repo Selection:** Picker to choose Repository and Branch.
3.  **Commit Picker:**
    *   List last 10-20 commits on selected branch.
    *   Show Commit Message, Hash, Date, & Author.
    *   *Constraint:* Must handle sub-directories (if the artifact is `docs/specs/my-spec.html`, we need to know where to look).
4.  **Import Logic:**
    *   On selection, fetch the specific file(s) from that commit hash.
    *   Create a new `DocumentVersion` in our database.
    *   Mark source as `github` (vs `upload`).

## Strategic Value
*   **Differentiation:** "Manual Control" vs "Netlify Auto-Deploy". Keeps us in the "Ad-Hoc" space.
*   **Pricing:** Available on Free Tier (High value/Lock-in).

## Questions to Resolve
*   **Path Configuration:** Does the user define "Watched Path" (e.g., `dist/index.html`) once per Document?
*   **Assets:** How do we handle images/CSS referenced in that commit? (Do we pull the whole folder?)

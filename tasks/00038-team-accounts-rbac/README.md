# Task 00038: Team Accounts & Role-Based Access Control (RBAC)

**GitHub Issue:** [#38](https://github.com/clintagossett/artifact-review/issues/38)
**Related Project:** _(None yet - this is feature planning/design)_

---

## Resume (Start Here)

**Last Updated:** 2026-01-18 (Session 1)

### Current Status: 📋 PLANNING & DESIGN

**Phase:** Documenting requirements, defining organizational hierarchy, and mapping permissions across license tiers.

### What We Did This Session (Session 1)

1. **Explored current codebase** - Reviewed `schema.ts`, permission helpers, and product discovery docs
2. **Identified current limitations** - No teams/orgs, artifact-level permissions only, no license enforcement
3. **Created initial planning document** - Started outlining org hierarchy, roles, and permissions

### Previous Sessions

_(None - this is the first session)_

### Next Steps

1. **Finalize organizational hierarchy** - Decide on Organization → Workspace → Folder structure
2. **Define role permissions matrix** - Lock down what each role can do
3. **Map license tiers to features** - What's gated at Free vs Pro vs Team
4. **Design database schema** - New tables and modifications

---

## Objective

Design and document the team account features including:
- Organizational hierarchy (teams, workspaces, folders)
- User roles and permissions across the system
- License tier feature gates and limits
- Database schema additions
- Migration strategy for existing users

This is a **planning and documentation task** - no implementation will occur until the design is approved.

---

## Subtasks

| # | Subtask | Status | Description |
|---|---------|--------|-------------|
| 01 | organizational-hierarchy | 🔲 OPEN | Define Organization → Workspace → Folder structure |
| 02 | roles-and-permissions | 🔲 OPEN | Define roles (Owner, Admin, Member, Guest) and permissions matrix |
| 03 | license-tiers | 🔲 OPEN | Map features and limits to Free, Pro, Team tiers |
| 04 | database-schema | 🔲 OPEN | Design new tables and modifications to existing schema |
| 05 | migration-strategy | 🔲 OPEN | Plan for migrating existing users/artifacts |

---

## Current State

### Existing Permission Model

The current system has a simple artifact-centric permission model:

```
artifacts.createdBy → Single user owner
artifactAccess → Per-artifact view/comment grants
commentPermissions → "owner" | "can-comment"
```

### Key Limitations

| Limitation | Impact |
|------------|--------|
| No concept of teams/organizations | Cannot group users for billing or administration |
| Artifacts belong to single user | No shared ownership, no team collaboration on assets |
| No role hierarchy | Cannot differentiate admin vs member vs guest |
| No license enforcement | Free/Pro/Team tiers not implemented in backend |
| No workspaces/folders | Users cannot organize artifacts into logical groups |

---

## Product Requirements (from PRODUCT-DISCOVERY.md)

From the product discovery document, team features are **core**, not secondary:

> "This is a **team product**, not an individual tool. Key implications:
> - Collaboration is the core, not a feature
> - Shared workspaces by team, project, or initiative
> - Permissions matter from day one
> - Value compounds with more users (network effect within org)
> - Buyer is team lead/Head of Product, not individual PM
> - Land-and-expand go-to-market motion"

### MVP Feature Set (v1)

From product discovery, teams should have:
- Team workspace
- Invite via email/domain
- Role-based access (admin/editor/viewer)
- Seat management
- Basic usage dashboard

---

## Key Design Decisions (To Be Made)

These decisions need to be made collaboratively before proceeding:

### 1. Multi-Organization Support
**Question:** Can a user belong to multiple organizations?
**Options:**
- **A) Yes (Recommended)** - Common in B2B SaaS, enables consulting/contractor use cases
- **B) No** - Simpler model, one user = one org

### 2. Personal vs Organization Artifacts
**Question:** How do personal (non-team) artifacts work?
**Options:**
- **A) Personal Organization** - Every user has a personal org (like GitHub)
- **B) Org-less artifacts** - Artifacts can exist without an organization
- **C) Personal Workspace** - Personal is a special workspace within their org

### 3. Existing User Migration
**Question:** What happens to existing users and their artifacts?
**Options:**
- **A) Auto-create Personal Org** - On login, create personal org and migrate artifacts
- **B) Remain org-less** - Existing artifacts stay as-is until user creates org
- **C) Prompt to create** - Force user to create/join org on next login

### 4. Default Artifact Visibility
**Question:** Are new org artifacts visible to all members by default?
**Options:**
- **A) All members can view** - Default visibility to org, creator controls sharing externally
- **B) Creator only** - Creator must explicitly share with other org members
- **C) Workspace-based** - Visibility determined by workspace settings

### 5. Guest Seat Counting
**Question:** Do guests count toward paid seat limits?
**Options:**
- **A) No (Recommended)** - Guests are free, encourages external collaboration
- **B) Yes** - All users count, simpler billing model
- **C) Separate limit** - X paid seats + Y guest slots

### 6. Minimum Team Size
**Question:** What's the minimum for Team tier?
**Options:**
- **A) 3 users** - As shown on pricing page ("Teams 3+")
- **B) 2 users** - Lower barrier to entry
- **C) 5 users** - Higher commitment, better unit economics

---

## Options Considered

_(To be filled in as we evaluate alternatives)_

## Decision

_(To be filled in once decisions are made)_

## Changes Made

_(None yet - this is a planning task)_

## Output

All planning documents will be produced in this task directory:

| File | Description |
|------|-------------|
| `README.md` | This file - main task tracking |
| `01_organizational-hierarchy/README.md` | Org structure design |
| `02_roles-and-permissions/README.md` | Roles and permissions matrix |
| `03_license-tiers/README.md` | License tier feature mapping |
| `04_database-schema/README.md` | Database schema design |
| `05_migration-strategy/README.md` | Migration plan |

## Testing

_(N/A for planning task - testing strategy will be defined in implementation task)_

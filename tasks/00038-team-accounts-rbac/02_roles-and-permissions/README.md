# Roles and Permissions (RBAC) Design

## Capability Mapping

| # | User Capability | Permission | Who can do it? |
| :--- | :--- | :--- | :--- |
| 1 | **Create artifacts** | `artifact:create` | Org Members |
| 2 | **Upload new version** (to others' artifact) | `artifact:update` | **All Org Members** (Collaborative) |
| 3 | **Create comments/replies** | `comment:create` | All Org Members |
| 4 | **Resolve/Unresolve comments** | `comment:resolve_any` | All Org Members |
| 5 | **Delete others' comments** | `comment:delete_any` | **Admins & Owners ONLY** |
| 6 | **Read artifact** | `artifact:view` | All Org Members |
| 7 | **Download artifact** | `artifact:download` | All Org Members |

## Permission Keys

| Key | Description |
| :--- | :--- |
| `comment:resolve_any` | Toggle Resolution on *any* thread. |
| `comment:resolve_own` | Toggle Resolution on *own* threads (Guests). |
| `comment:edit_content_own` | Edit text of own comment. |
| `comment:edit_content_any` | **ARCHITECTURAL DECISION: ALWAYS FALSE**. |

## Permission Model: Inherit at Org Level
*   All Org Members inherit access to all Org artifacts.
*   No Workspace layer for now.

## Agent Control (Organization Policy)

| Policy | Description |
| :--- | :--- |
| `allowAgents` | If `false`: Agents blocked from Write operations in this Org. |

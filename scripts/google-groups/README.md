# Google Groups Management

Manages Google Groups for Artifact Review's legal/support email inboxes via the Admin SDK.

## Architecture

Groups are created on the primary domain (`productforpeople.com`). The alias domain (`artifactreview.com`) automatically mirrors all group addresses — so `legal@productforpeople.com` also receives mail at `legal@artifactreview.com`.

## Groups

| Group | Alias | Purpose | Referenced In |
|-------|-------|---------|---------------|
| `legal@productforpeople.com` | `legal@artifactreview.com` | Legal inquiries | Terms of Service |
| `privacy@productforpeople.com` | `privacy@artifactreview.com` | Privacy/data rights requests | Privacy Policy, CCPA Notice |
| `dmca@productforpeople.com` | `dmca@artifactreview.com` | DMCA takedown notices | DMCA Policy |
| `support@productforpeople.com` | `support@artifactreview.com` | Customer support | Terms of Service |
| `abuse@productforpeople.com` | `abuse@artifactreview.com` | Abuse reports | Acceptable Use Policy |

All groups have:
- Subject prefix (e.g., `[legal]`) for easy filtering
- Collaborative inbox enabled
- Anyone can post (external senders accepted)
- Invite-only membership
- Spam moderation set to ALLOW (no filtering)

## Prerequisites

- Service account `groups-admin@product-for-people.iam.gserviceaccount.com` with domain-wide delegation
- Credentials stored in Vaultwarden under `google-groups-service-account`
- Python packages: `google-api-python-client`, `google-auth`, `google-auth-httplib2`

## Usage

```bash
# Check current state vs desired config (dry run)
python3 scripts/google-groups/sync-groups.py --check

# Apply config (create/update groups, members, settings)
python3 scripts/google-groups/sync-groups.py

# Show current state of all groups
python3 scripts/google-groups/sync-groups.py --status
```

## Configuration

Edit `groups-config.json` to add/remove groups, change members, or update settings. Then run `sync-groups.py` to apply.

### Adding a new group

Add an entry to the `groups` array in `groups-config.json`:

```json
{
  "email": "newgroup@productforpeople.com",
  "name": "New Group",
  "description": "Description here",
  "subject_prefix": "[newgroup]",
  "referenced_in": "Where this email appears in docs",
  "members": [
    {"email": "clint@productforpeople.com", "role": "OWNER"},
    {"email": "artifactreview.agent@gmail.com", "role": "MEMBER"}
  ],
  "settings": {
    "whoCanPostMessage": "ANYONE_CAN_POST",
    "whoCanJoin": "INVITED_CAN_JOIN",
    "whoCanViewGroup": "ALL_MEMBERS_CAN_VIEW",
    "allowExternalMembers": "false",
    "enableCollaborativeInbox": "true",
    "isArchived": "false",
    "messageModerationLevel": "MODERATE_NONE",
    "spamModerationLevel": "ALLOW"
  }
}
```

Then run `python3 scripts/google-groups/sync-groups.py`.

### Adding a member to all groups

Add the member entry to each group in `groups-config.json`, then run sync.

## Interactive Python usage

```python
import sys
sys.path.insert(0, "scripts/google-groups")
from groups import GroupsAdmin

g = GroupsAdmin(admin_email="clint@productforpeople.com")

# List all groups
g.list_groups()

# Get group settings
g.get_settings("legal@productforpeople.com")

# Add a member
g.add_member("legal@productforpeople.com", "newuser@example.com", role="MEMBER")
```

## Agent Email Inbox

The agent email `artifactreview.agent@gmail.com` is a member of all Google Groups and receives copies of every inbound message. This is how AI agents can read and respond to legal, support, and compliance emails.

**Credentials:** Stored in Vaultwarden under `agent-email-imap` (IMAP app password).

**Accessing the inbox (IMAP via offlineimap):**

```bash
# Sync inbox (downloads new messages to ~/.mail/)
offlineimap -o

# Read recent messages
ls ~/.mail/INBOX/new/              # Unread messages
ls ~/.mail/INBOX/cur/              # Read messages
grep "^Subject:" ~/.mail/INBOX/new/*   # List subjects of unread mail
```

**offlineimap configuration:** `~/.offlineimaprc` configures the IMAP connection. The password is retrieved at runtime from Vaultwarden via `~/.offlineimap-helper.py` (never stored in plaintext).

**Replying as the group address:** Groups have `membersCanPostAsTheGroup` enabled, so the agent can send replies using the group email (e.g., `legal@artifactreview.com`) as the From address via the Groups API or SMTP.

**Gmail web access:** [https://mail.google.com](https://mail.google.com) — sign in as `artifactreview.agent@gmail.com`. The app password in Vaultwarden is for IMAP only; the Gmail web UI uses the account's regular password (also in Vaultwarden under `agent-email-imap`, username field).

## Known Limitations

- `abuse@` is a Google-reserved address. Its settings **cannot** be changed via API — must be configured manually in Google Admin Console.
- **Subject prefix cannot be set via API.** The `customHeaderText` field appears to accept writes but does not persist. Subject prefixes must be set manually in Google Admin Console: **Groups > [group] > Settings > Email options > Subject prefix**.
- The agent email (`artifactreview.agent@gmail.com`) will not receive messages it sends to a group (Google Groups suppresses delivery to the sender).

## Settings Reference

| Setting | Valid Values |
|---------|-------------|
| `whoCanPostMessage` | `ANYONE_CAN_POST`, `ALL_MEMBERS_CAN_POST`, `ALL_IN_DOMAIN_CAN_POST`, `ALL_MANAGERS_CAN_POST`, `ALL_OWNERS_CAN_POST` |
| `whoCanJoin` | `INVITED_CAN_JOIN`, `ANYONE_CAN_JOIN`, `CAN_REQUEST_TO_JOIN`, `ALL_IN_DOMAIN_CAN_JOIN` |
| `whoCanViewGroup` | `ALL_MEMBERS_CAN_VIEW`, `ANYONE_CAN_VIEW`, `ALL_IN_DOMAIN_CAN_VIEW`, `ALL_MANAGERS_CAN_VIEW` |
| `enableCollaborativeInbox` | `"true"`, `"false"` |
| `spamModerationLevel` | `ALLOW`, `MODERATE`, `SILENTLY_MODERATE`, `REJECT` |
| `messageModerationLevel` | `MODERATE_NONE`, `MODERATE_ALL_MESSAGES`, `MODERATE_NON_MEMBERS`, `MODERATE_NEW_MEMBERS` |
| `allowExternalMembers` | `"true"`, `"false"` |
| `customHeaderText` | Subject prefix text (e.g., `[legal]`) |

# Compliance & Support Inboxes

Shared email inboxes for legal, compliance, and support communications, implemented as Google Groups.

## Inboxes

| Public Address | Primary Address | Purpose | Referenced In |
|---------------|-----------------|---------|---------------|
| `legal@artifactreview.com` | `legal@productforpeople.com` | Legal inquiries | Terms of Service |
| `privacy@artifactreview.com` | `privacy@productforpeople.com` | Privacy/data rights requests | Privacy Policy, CCPA Notice |
| `dmca@artifactreview.com` | `dmca@productforpeople.com` | DMCA takedown notices | DMCA Policy |
| `support@artifactreview.com` | `support@artifactreview.com` | Customer support | Terms of Service |
| `abuse@artifactreview.com` | `abuse@productforpeople.com` | Abuse reports | Acceptable Use Policy |

Groups are created on `productforpeople.com` (Google Workspace primary domain). The alias domain `artifactreview.com` automatically mirrors all addresses.

## Subject Prefixes

Each inbox has a subject prefix for easy filtering:

| Inbox | Prefix |
|-------|--------|
| legal | `[legal]` |
| privacy | `[privacy]` |
| dmca | `[dmca]` |
| support | `[support]` |
| abuse | `[abuse]` |

Subject prefixes are set manually in Google Admin Console (cannot be set via API).

## Settings

All groups share these settings:

- **Collaborative inbox** enabled
- **Anyone can post** (external senders accepted)
- **Invite-only membership**
- **Spam moderation: ALLOW** (no filtering)
- **Members can post as the group** (agents can reply as `legal@artifactreview.com`, etc.)

## Members

| Member | Role | Purpose |
|--------|------|---------|
| `clint@productforpeople.com` | OWNER | Business owner, receives all group mail |
| `artifactreview.agent@gmail.com` | MEMBER | AI agent inbox for programmatic processing |

## Agent Access

The agent email receives copies of all inbound group messages. Credentials are stored in Vaultwarden under `agent-email-imap`.

Currently accessed via offlineimap (read-only sync). See [#155](https://github.com/clintagossett/artifact-review/issues/155) for the planned full email management toolkit (read, reply, delete, organize).

## Managing Groups

To add/remove groups, change members, or update settings, edit the config and run the sync script:

```bash
# Dry run — show what would change
python3 scripts/google-groups/sync-groups.py --check

# Apply changes
python3 scripts/google-groups/sync-groups.py

# Show current live state
python3 scripts/google-groups/sync-groups.py --status
```

Configuration: `scripts/google-groups/groups-config.json`
Full documentation: `scripts/google-groups/README.md`

## Known Limitations

- `abuse@` is Google-reserved — settings must be changed manually in Admin Console
- Subject prefixes cannot be set via API — must be set in Admin Console > Groups > Email options
- The agent does not receive messages it sends to a group (Google suppresses delivery to sender)

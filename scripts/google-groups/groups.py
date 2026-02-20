"""
Google Groups Admin - Group management operations.

Usage:
    from groups import GroupsAdmin
    g = GroupsAdmin(admin_email="clint@productforpeople.com")

    g.create_group("mygroup@productforpeople.com", "My Group", "Description")
    g.list_groups()
    g.update_settings("mygroup@productforpeople.com", whoCanPostMessage="ALL_MEMBERS_CAN_POST")
    g.add_member("mygroup@productforpeople.com", "user@productforpeople.com")
"""

import json
from auth import get_clients


class GroupsAdmin:
    def __init__(self, admin_email: str):
        self.admin_email = admin_email
        self.directory, self.settings_api = get_clients(admin_email)

    # -- Group CRUD ------------------------------------------------------------

    def create_group(self, email: str, name: str, description: str = "") -> dict:
        """Create a new Google Group."""
        body = {"email": email, "name": name, "description": description}
        result = self.directory.groups().insert(body=body).execute()
        print(f"Created group: {result['email']}")
        return result

    def get_group(self, email: str) -> dict:
        """Get group details."""
        return self.directory.groups().get(groupKey=email).execute()

    def list_groups(self, domain: str = None) -> list:
        """List all groups, optionally filtered by domain."""
        groups = []
        page_token = None
        while True:
            params = {"customer": "my_customer", "pageToken": page_token}
            if domain:
                params["domain"] = domain
            result = self.directory.groups().list(**params).execute()
            groups.extend(result.get("groups", []))
            page_token = result.get("nextPageToken")
            if not page_token:
                break
        for g in groups:
            print(f"  {g['email']}  --  {g.get('name', '')}")
        return groups

    def delete_group(self, email: str):
        """Delete a group."""
        self.directory.groups().delete(groupKey=email).execute()
        print(f"Deleted group: {email}")

    def update_group(self, email: str, name: str = None, description: str = None) -> dict:
        """Update group name/description."""
        body = {}
        if name:
            body["name"] = name
        if description:
            body["description"] = description
        result = self.directory.groups().patch(groupKey=email, body=body).execute()
        print(f"Updated group: {email}")
        return result

    # -- Members ---------------------------------------------------------------

    def add_member(self, group_email: str, member_email: str, role: str = "MEMBER") -> dict:
        """
        Add a member to a group.
        role: MEMBER | MANAGER | OWNER
        """
        body = {"email": member_email, "role": role}
        result = self.directory.members().insert(groupKey=group_email, body=body).execute()
        print(f"Added {member_email} to {group_email} as {role}")
        return result

    def remove_member(self, group_email: str, member_email: str):
        """Remove a member from a group."""
        self.directory.members().delete(groupKey=group_email, memberKey=member_email).execute()
        print(f"Removed {member_email} from {group_email}")

    def list_members(self, group_email: str) -> list:
        """List all members of a group."""
        members = []
        page_token = None
        while True:
            result = self.directory.members().list(
                groupKey=group_email, pageToken=page_token
            ).execute()
            members.extend(result.get("members", []))
            page_token = result.get("nextPageToken")
            if not page_token:
                break
        for m in members:
            print(f"  {m['email']}  ({m.get('role', '')})")
        return members

    def update_member_role(self, group_email: str, member_email: str, role: str) -> dict:
        """Change a member's role. role: MEMBER | MANAGER | OWNER"""
        body = {"role": role}
        result = self.directory.members().patch(
            groupKey=group_email, memberKey=member_email, body=body
        ).execute()
        print(f"Updated {member_email} role to {role} in {group_email}")
        return result

    # -- Advanced Settings -----------------------------------------------------

    def get_settings(self, group_email: str) -> dict:
        """Get all advanced settings for a group."""
        result = self.settings_api.groups().get(groupUniqueId=group_email).execute()
        print(json.dumps(result, indent=2))
        return result

    def update_settings(self, group_email: str, **kwargs) -> dict:
        """
        Update advanced group settings. Pass any Groups Settings API fields as kwargs.

        Common settings:
          whoCanPostMessage:        ANYONE_CAN_POST | ALL_MEMBERS_CAN_POST | ...
          whoCanJoin:               INVITED_CAN_JOIN | ANYONE_CAN_JOIN | ...
          whoCanViewGroup:          ALL_MEMBERS_CAN_VIEW | ANYONE_CAN_VIEW | ...
          enableCollaborativeInbox: true | false
          spamModerationLevel:      ALLOW | MODERATE | SILENTLY_MODERATE | REJECT
          messageModerationLevel:   MODERATE_NONE | MODERATE_ALL_MESSAGES | ...
          allowExternalMembers:     true | false
          customHeaderText:         Subject prefix text (e.g. "[legal]")

        See README.md for full list of settings and valid values.
        """
        result = self.settings_api.groups().patch(
            groupUniqueId=group_email, body=kwargs
        ).execute()
        print(f"Updated settings for {group_email}: {list(kwargs.keys())}")
        return result

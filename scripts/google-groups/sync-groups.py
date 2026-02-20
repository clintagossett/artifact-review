#!/usr/bin/env python3
"""
Sync Google Groups to match the declarative config in groups-config.json.

Usage:
    python3 scripts/google-groups/sync-groups.py          # Apply config (create/update)
    python3 scripts/google-groups/sync-groups.py --check   # Dry run, show diff
    python3 scripts/google-groups/sync-groups.py --status  # Show current state

Idempotent — safe to run multiple times.
"""

import json
import os
import sys
import time

# Add script directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from groups import GroupsAdmin

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "groups-config.json")


def load_config():
    with open(CONFIG_FILE) as f:
        return json.load(f)


def check_mode(g, config):
    """Show current state vs desired state without making changes."""
    print("=== Google Groups Config Check ===\n")
    for group_cfg in config["groups"]:
        email = group_cfg["email"]
        reserved = group_cfg.get("reserved", False)
        print(f"--- {email} (alias: {email.replace(config['domain'], config['alias_domain'])}) ---")

        # Check if group exists
        try:
            g.directory.groups().get(groupKey=email).execute()
            print(f"  Group: EXISTS")
        except Exception:
            print(f"  Group: MISSING — will be created")
            continue

        # Check members
        try:
            result = g.directory.members().list(groupKey=email).execute()
            current_members = {m["email"]: m.get("role", "") for m in result.get("members", [])}
        except Exception:
            current_members = {}

        for member in group_cfg["members"]:
            m_email = member["email"]
            m_role = member["role"]
            if m_email in current_members:
                if current_members[m_email] == m_role:
                    print(f"  Member {m_email}: OK ({m_role})")
                else:
                    print(f"  Member {m_email}: ROLE MISMATCH (have: {current_members[m_email]}, want: {m_role})")
            else:
                print(f"  Member {m_email}: MISSING — will be added as {m_role}")

        # Check settings
        if reserved:
            print(f"  Settings: RESERVED — must be configured manually in Admin Console")
            continue

        try:
            current_settings = g.settings_api.groups().get(groupUniqueId=email).execute()
        except Exception:
            print(f"  Settings: UNABLE TO READ")
            continue

        for key, desired_value in group_cfg["settings"].items():
            current_value = current_settings.get(key, "NOT SET")
            if str(current_value) == str(desired_value):
                print(f"  {key}: OK ({desired_value})")
            else:
                print(f"  {key}: MISMATCH (have: {current_value}, want: {desired_value})")

        # Subject prefix (manual only — cannot be set via API)
        prefix = group_cfg.get("subject_prefix_manual", "")
        if prefix:
            print(f"  subject_prefix: {prefix} (MANUAL — verify in Admin Console > Email options)")

    print()


def status_mode(g, config):
    """Show current state of all groups."""
    print("=== Google Groups Current State ===\n")
    for group_cfg in config["groups"]:
        email = group_cfg["email"]
        alias = email.replace(config["domain"], config["alias_domain"])
        print(f"--- {email} (alias: {alias}) ---")

        try:
            group = g.directory.groups().get(groupKey=email).execute()
            print(f"  Name: {group.get('name', '?')}")
            print(f"  Description: {group.get('description', '?')}")
        except Exception:
            print(f"  NOT FOUND")
            continue

        try:
            result = g.directory.members().list(groupKey=email).execute()
            for m in result.get("members", []):
                print(f"  Member: {m['email']} ({m.get('role', '')})")
        except Exception:
            print(f"  Members: UNABLE TO READ")

    print()


def sync(g, config):
    """Apply config — create groups, add members, update settings."""
    print("=== Syncing Google Groups ===\n")

    for group_cfg in config["groups"]:
        email = group_cfg["email"]
        reserved = group_cfg.get("reserved", False)
        alias = email.replace(config["domain"], config["alias_domain"])
        print(f"--- {email} (alias: {alias}) ---")

        # Create group if needed
        try:
            g.directory.groups().get(groupKey=email).execute()
            print(f"  Group exists")
        except Exception:
            try:
                g.create_group(email, group_cfg["name"], group_cfg.get("description", ""))
                print(f"  Created group")
                time.sleep(2)  # Let it propagate
            except Exception as e:
                print(f"  ERROR creating group: {e}")
                continue

        # Update group name/description
        try:
            g.update_group(email, name=group_cfg["name"], description=group_cfg.get("description", ""))
        except Exception as e:
            print(f"  ERROR updating group: {e}")

        # Add/update members
        try:
            result = g.directory.members().list(groupKey=email).execute()
            current_members = {m["email"]: m.get("role", "") for m in result.get("members", [])}
        except Exception:
            current_members = {}

        for member in group_cfg["members"]:
            m_email = member["email"]
            m_role = member["role"]
            if m_email in current_members:
                if current_members[m_email] != m_role:
                    try:
                        g.update_member_role(email, m_email, m_role)
                    except Exception as e:
                        print(f"  ERROR updating role for {m_email}: {e}")
            else:
                try:
                    g.add_member(email, m_email, m_role)
                except Exception as e:
                    print(f"  ERROR adding {m_email}: {e}")

        # Update settings
        if reserved:
            print(f"  RESERVED — skipping API settings (configure manually in Admin Console)")
            continue

        settings = dict(group_cfg["settings"])

        try:
            g.update_settings(email, **settings)
        except Exception as e:
            print(f"  ERROR updating settings: {e}")

    # Remind about manual steps
    manual_prefixes = [
        (g_cfg["email"], g_cfg.get("subject_prefix_manual", ""))
        for g_cfg in config["groups"]
        if g_cfg.get("subject_prefix_manual")
    ]
    if manual_prefixes:
        print("\nMANUAL STEPS REQUIRED:")
        print("Subject prefixes cannot be set via API. Set in Admin Console > Groups > [group] > Email options > Subject prefix:")
        for email, prefix in manual_prefixes:
            print(f"  {email}: {prefix}")

    print("\nSync complete.")


def main():
    config = load_config()
    g = GroupsAdmin(admin_email=config["admin_email"])

    if "--check" in sys.argv:
        check_mode(g, config)
    elif "--status" in sys.argv:
        status_mode(g, config)
    else:
        sync(g, config)


if __name__ == "__main__":
    main()

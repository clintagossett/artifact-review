"""
Google Groups Admin - Authentication
Loads service account credentials from Vaultwarden and returns authenticated API clients.
"""

import json
import subprocess
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/admin.directory.group",
    "https://www.googleapis.com/auth/admin.directory.group.member",
    "https://www.googleapis.com/auth/apps.groups.settings",
]

VAULTWARDEN_ITEM = "google-groups-service-account"


def _load_key_from_vaultwarden() -> dict:
    env = os.environ.copy()
    env_file = os.path.expanduser("~/vaultwarden/.env.bw")

    # Source the env file
    result = subprocess.run(
        ["bash", "-c", f"set -a && source {env_file} && set +a && "
         "bw login --apikey 2>/dev/null; "
         'BW_SESSION=$(bw unlock "$BW_PASSWORD" --raw 2>/dev/null) && '
         f'bw get notes "{VAULTWARDEN_ITEM}" --session "$BW_SESSION" 2>/dev/null; '
         "bw lock >/dev/null 2>&1"],
        capture_output=True, text=True, env=env
    )

    if result.returncode != 0 or not result.stdout.strip():
        raise RuntimeError(
            f"Failed to retrieve credentials from Vaultwarden.\n"
            f"stderr: {result.stderr}"
        )

    return json.loads(result.stdout.strip())


def get_clients(admin_email: str):
    """
    Returns (directory_client, groups_settings_client) authenticated via
    domain-wide delegation as the given admin_email.
    """
    key_data = _load_key_from_vaultwarden()

    credentials = service_account.Credentials.from_service_account_info(
        key_data, scopes=SCOPES
    )
    delegated = credentials.with_subject(admin_email)

    directory = build("admin", "directory_v1", credentials=delegated)
    groups_settings = build("groupssettings", "v1", credentials=delegated)

    return directory, groups_settings

import { redirect } from "next/navigation";

/**
 * Settings Index Page
 *
 * Redirects to the default settings section (account).
 * This ensures /settings always shows content rather than a blank page.
 */
export default function SettingsPage() {
  redirect("/settings/account");
}

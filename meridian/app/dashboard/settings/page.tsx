import type { Metadata } from "next";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import {
  AppearanceSettings,
  DataSettings,
  NotificationSettings,
  ProfileSettings,
  SettingsSection,
} from "@/components/settings/settings-sections";
import { requireSessionContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your profile, preferences, privacy and data.",
};

export default async function SettingsPage() {
  const { user, profile, settings } = await requireSessionContext("/dashboard/settings");
  const email = profile?.email ?? user.email ?? null;

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Settings"
        description="How Meridian looks, what it may use, and what happens to your data."
      />

      <div className="mt-7 space-y-5">
        <SettingsSection
          id="profile"
          title="Profile"
          description="Your name, and the country and currency your figures are read in."
        >
          <ProfileSettings profile={profile} email={email} />
        </SettingsSection>

        <SettingsSection
          id="appearance"
          title="Appearance"
          description="Light, dark, or whatever your device is set to. Remembered on this browser."
        >
          <AppearanceSettings />
        </SettingsSection>

        <SettingsSection
          id="notifications"
          title="Notifications"
          description="Alerts, milestones and reminders."
        >
          <NotificationSettings settings={settings} />
        </SettingsSection>

        <SettingsSection
          id="data"
          title="Your data"
          description="Take it with you, or remove it entirely."
        >
          <DataSettings email={email} />
        </SettingsSection>
      </div>
    </PageShell>
  );
}

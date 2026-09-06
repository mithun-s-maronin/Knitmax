"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Download, Monitor, Moon, ShieldCheck, Sun, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { COUNTRIES, CURRENCIES } from "@/lib/constants";
import { updatePreferences, updateProfile, deleteAccount } from "@/lib/actions/settings";
import { deleteAllConversations } from "@/lib/actions/conversations";
import type { ProfileRow, UserSettingsRow } from "@/types/database";

export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20" aria-labelledby={`${id}-heading`}>
      <div className="surface p-5 sm:p-6">
        <h2 id={`${id}-heading`} className="font-semibold">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

/** Name, country and currency. */
export function ProfileSettings({
  profile,
  email,
}: {
  profile: ProfileRow | null;
  email: string | null;
}) {
  const [fullName, setFullName] = React.useState(profile?.full_name ?? "");
  const [country, setCountry] = React.useState(profile?.country ?? "US");
  const [currency, setCurrency] = React.useState(profile?.currency ?? "USD");
  const [pending, startTransition] = React.useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await updateProfile({ fullName, country, currency });
      if (result.ok) toast.success(result.message ?? "Saved.");
      else toast.error(result.error ?? "That did not save.");
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="settings-name">Your name</Label>
          <Input
            id="settings-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-email">Email</Label>
          <Input id="settings-email" value={email ?? ""} readOnly disabled />
          <p className="text-xs text-muted-foreground">
            Your sign-in address. Changing it is not supported yet.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-country">Country</Label>
          <Select
            value={country}
            onValueChange={(value) => {
              setCountry(value);
              const match = COUNTRIES.find((c) => c.code === value);
              if (match) setCurrency(match.currency);
            }}
          >
            <SelectTrigger id="settings-country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="settings-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.label} ({option.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Changes how amounts are shown. It does not convert any of your
            existing figures.
          </p>
        </div>
      </div>

      <Button onClick={save} loading={pending}>
        Save profile
      </Button>
    </div>
  );
}

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active ? "border-primary/50 bg-primary/[0.06]" : "hover:bg-accent/60",
              )}
            >
              <option.icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p id={`${id}-description`} className="mt-1 text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={`${id}-description`}
      />
    </div>
  );
}

/** The AI data permission and conversation memory (§70, §71). */
export function PrivacySettings({ settings }: { settings: UserSettingsRow | null }) {
  const [dataPermission, setDataPermission] = React.useState(
    settings?.ai_data_permission ?? true,
  );
  const [memory, setMemory] = React.useState(settings?.ai_conversation_memory ?? true);
  const [pending, startTransition] = React.useTransition();

  const update = (values: Record<string, boolean>) => {
    startTransition(async () => {
      const result = await updatePreferences(values);
      if (!result.ok) toast.error(result.error ?? "That did not save.");
    });
  };

  return (
    <div className="divide-y">
      <ToggleRow
        id="ai-data-permission"
        label="Allow the assistant to use my financial data"
        description="When this is off, none of your figures are sent to the assistant at all — it is not asked to ignore them, it simply never receives them. It can still answer general questions."
        checked={dataPermission}
        disabled={pending}
        onCheckedChange={(value) => {
          setDataPermission(value);
          update({ ai_data_permission: value });
          toast.success(
            value
              ? "The assistant can now use your figures."
              : "The assistant will no longer receive your figures.",
          );
        }}
      />

      <ToggleRow
        id="ai-memory"
        label="Remember earlier messages in a conversation"
        description="Lets the assistant follow a thread across several questions. With this off, each message is answered on its own."
        checked={memory}
        disabled={pending}
        onCheckedChange={(value) => {
          setMemory(value);
          update({ ai_conversation_memory: value });
        }}
      />

      <p className="flex gap-2.5 pt-4 text-sm text-muted-foreground text-pretty">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Your records are readable only by your own account. Row-level security
        in the database enforces that, not the app — another signed-in user
        querying your rows gets nothing back.
      </p>
    </div>
  );
}

export function NotificationSettings({ settings }: { settings: UserSettingsRow | null }) {
  const [values, setValues] = React.useState({
    notifications_enabled: settings?.notifications_enabled ?? true,
    score_change_alerts: settings?.score_change_alerts ?? true,
    goal_milestone_alerts: settings?.goal_milestone_alerts ?? true,
    monthly_checkin_reminder: settings?.monthly_checkin_reminder ?? true,
  });
  const [pending, startTransition] = React.useTransition();

  const set = (key: keyof typeof values, value: boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    startTransition(async () => {
      const result = await updatePreferences({ [key]: value });
      if (!result.ok) toast.error(result.error ?? "That did not save.");
    });
  };

  return (
    <div className="divide-y">
      <ToggleRow
        id="notifications-enabled"
        label="Show notifications"
        description="Alerts about your finances, milestones you reach, and check-in reminders."
        checked={values.notifications_enabled}
        disabled={pending}
        onCheckedChange={(value) => set("notifications_enabled", value)}
      />
      <ToggleRow
        id="score-alerts"
        label="Score changes"
        description="Tell me when my score moves after a new assessment."
        checked={values.score_change_alerts}
        disabled={pending || !values.notifications_enabled}
        onCheckedChange={(value) => set("score_change_alerts", value)}
      />
      <ToggleRow
        id="goal-alerts"
        label="Goal milestones"
        description="Tell me when a goal is reached or a fund milestone is hit."
        checked={values.goal_milestone_alerts}
        disabled={pending || !values.notifications_enabled}
        onCheckedChange={(value) => set("goal_milestone_alerts", value)}
      />
      <ToggleRow
        id="checkin-reminder"
        label="Monthly check-in reminder"
        description="A nudge each month to update your figures."
        checked={values.monthly_checkin_reminder}
        disabled={pending || !values.notifications_enabled}
        onCheckedChange={(value) => set("monthly_checkin_reminder", value)}
      />
    </div>
  );
}

const CSV_TABLES = [
  { table: "income_sources", label: "Income" },
  { table: "expenses", label: "Expenses" },
  { table: "savings_accounts", label: "Savings" },
  { table: "debts", label: "Debts" },
  { table: "financial_goals", label: "Goals" },
  { table: "assessments", label: "Assessments" },
  { table: "score_history", label: "Score history" },
];

/** Export, clear conversations, delete the account (§48, §49). */
export function DataSettings({ email }: { email: string | null }) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const clearConversations = () => {
    startTransition(async () => {
      const result = await deleteAllConversations();
      if (result.ok) toast.success("All conversations deleted.");
      else toast.error(result.error ?? "That did not work.");
    });
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteAccount(confirmation);
      if (result.ok) {
        toast.success("Your account and all of its data have been deleted.");
        router.push("/");
      } else {
        toast.error(result.error ?? "That did not work.");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium">Export everything</h3>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          A complete copy of every record Meridian holds for you — profile,
          income, expenses, savings, debts, goals, assessments, score history
          and conversations.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="/api/export?format=json" download>
              <Download className="size-4" />
              Download JSON
            </a>
          </Button>
        </div>

        <p className="mt-5 text-sm font-medium">Or one section as CSV</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {CSV_TABLES.map((entry) => (
            <Button key={entry.table} asChild variant="ghost" size="sm">
              <a href={`/api/export?format=csv&table=${entry.table}`} download>
                {entry.label}
              </a>
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-sm font-medium">Delete AI conversations</h3>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          Removes every conversation and message. Your score and financial
          records are untouched.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={clearConversations}
          disabled={pending}
        >
          Delete all conversations
        </Button>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-5">
        <h3 className="flex items-center gap-2 text-sm font-medium text-destructive-ink">
          <TriangleAlert className="size-4" />
          Delete my account
        </h3>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          This removes your account and every record attached to it —
          assessments included — permanently and immediately. It cannot be
          undone, and we cannot recover any of it afterwards. Export your data
          first if you might want it.
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => setConfirmingDelete(true)}
          disabled={pending}
        >
          Delete my account
        </Button>
      </div>

      <AlertDialog
        open={confirmingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingDelete(false);
            setConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {email ?? "your account"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every assessment, record, goal and conversation will be deleted
              permanently. There is no undo and no backup we can restore from.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-confirmation">
              Type DELETE to confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              placeholder="DELETE"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep my account</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending || confirmation.trim().toUpperCase() !== "DELETE"}
              loading={pending}
            >
              Delete everything
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

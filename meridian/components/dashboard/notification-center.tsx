"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  CircleAlert,
  CircleCheck,
  Info,
  Trophy,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/format";
import {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import type { NotificationRow } from "@/types/database";

const SEVERITY_ICONS = {
  critical: { icon: CircleAlert, tone: "text-destructive-ink" },
  warning: { icon: TriangleAlert, tone: "text-score-needs-improvement-ink" },
  info: { icon: Info, tone: "text-primary" },
  success: { icon: CircleCheck, tone: "text-score-excellent-ink" },
} as const;

/** The bell: deterministic alerts, milestones and reminders (§64). */
export function NotificationCenter({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const [pending, startTransition] = React.useTransition();
  const unread = notifications.filter((n) => !n.read_at);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={
            unread.length > 0
              ? `Notifications, ${unread.length} unread`
              : "Notifications"
          }
        >
          <Bell className="size-4" />
          {unread.length > 0 ? (
            <span className="absolute right-1 top-1 flex size-2 rounded-full bg-primary ring-2 ring-background" />
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {notifications.length > 0 ? (
            <div className="flex items-center gap-1">
              {unread.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => startTransition(() => void markAllNotificationsRead())}
                >
                  Mark all read
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => startTransition(() => void clearNotifications())}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </div>

        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing to report right now.
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y">
              {notifications.map((notification) => {
                const style =
                  SEVERITY_ICONS[notification.severity] ?? SEVERITY_ICONS.info;
                const Icon =
                  notification.type === "milestone" ? Trophy : style.icon;

                const body = (
                  <>
                    <Icon className={cn("mt-0.5 size-4 shrink-0", style.tone)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-pretty">
                        {notification.title}
                      </span>
                      {notification.message ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">
                          {notification.message}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[0.6875rem] text-muted-foreground">
                        {formatDate(notification.created_at)}
                      </span>
                    </span>
                    {!notification.read_at ? (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </>
                );

                const className = cn(
                  "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60",
                  !notification.read_at && "bg-primary/[0.04]",
                );

                return (
                  <li key={notification.id}>
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        className={className}
                        onClick={() =>
                          startTransition(() =>
                            void markNotificationRead(notification.id),
                          )
                        }
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={className}
                        onClick={() =>
                          startTransition(() =>
                            void markNotificationRead(notification.id),
                          )
                        }
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

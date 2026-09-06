"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MOBILE_PRIMARY, NAV_GROUPS, isActive } from "./nav-items";

/**
 * The mobile bar: four destinations plus everything else behind "More".
 *
 * It sits above the safe area on devices with a home indicator, and the page
 * reserves matching bottom padding so nothing is ever hidden underneath it.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <nav
      aria-label="Dashboard"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="flex items-stretch">
        {MOBILE_PRIMARY.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] transition-colors",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <Sheet key={pathname} open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] text-muted-foreground",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <Menu className="size-5" />
              More
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  <Logo href={null} />
                </SheetTitle>
              </SheetHeader>
              <div className="px-3 pb-8">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label} className="mb-5">
                    <h2 className="px-3 pb-2 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </h2>
                    <ul className="space-y-0.5">
                      {group.items.map((item) => {
                        const active = isActive(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                                active
                                  ? "bg-accent font-medium text-accent-foreground"
                                  : "text-muted-foreground hover:bg-accent/60",
                              )}
                            >
                              <item.icon className="size-4" />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

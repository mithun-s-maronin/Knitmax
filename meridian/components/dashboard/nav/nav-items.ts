import {
  Bot,
  CalendarCheck,
  ChartLine,
  CreditCard,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Settings,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bar as well as the sidebar. */
  primary?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, primary: true },
      { href: "/dashboard/financial-health", label: "Financial health", icon: Gauge },
      { href: "/dashboard/financial-data", label: "My financial data", icon: FolderOpen, primary: true },
    ],
  },
  {
    label: "Pillars",
    items: [
      { href: "/dashboard/spend", label: "Spend", icon: Receipt },
      { href: "/dashboard/save", label: "Save", icon: PiggyBank },
      { href: "/dashboard/borrow", label: "Borrow", icon: CreditCard },
      { href: "/dashboard/plan", label: "Plan", icon: CalendarCheck },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/dashboard/goals", label: "Goals", icon: Target, primary: true },
      { href: "/dashboard/simulator", label: "Simulator", icon: SlidersHorizontal },
      { href: "/dashboard/ai", label: "AI assistant", icon: Bot, primary: true },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/dashboard/history", label: "History", icon: ChartLine },
      { href: "/dashboard/reports", label: "Reports", icon: FileText },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** The four that fit a mobile bar, plus a "More" entry supplied by the bar itself. */
export const MOBILE_PRIMARY = NAV_ITEMS.filter((i) => i.primary);

/** Longest-prefix match, so /dashboard does not light up on every child route. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

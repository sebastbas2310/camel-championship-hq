import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ClipboardCheck,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Trophy,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/Spinner";
import { AccessDenied } from "@/components/AccessDenied";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV: { to: string; label: string; icon: typeof Flag; roles: Role[] }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER"] },
  { to: "/races", label: "Races", icon: Flag, roles: ["ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER"] },
  { to: "/competitors", label: "Competitors", icon: Users, roles: ["ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER"] },
  { to: "/teams", label: "Teams", icon: UsersRound, roles: ["ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER"] },
  { to: "/standings", label: "Standings", icon: Trophy, roles: ["ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER"] },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck, roles: ["ADMINISTRATOR", "RACE_ORGANIZER"] },
  { to: "/audit-logs", label: "Audit logs", icon: ScrollText, roles: ["ADMINISTRATOR"] },
  {
    to: "/settings",
    label: "Configuración",
    icon: Settings,
    roles: ["ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER"],
  },
];

export function AppShell({
  children,
  allow,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  allow?: Role[] | undefined;
  title?: string | undefined;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
}) {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);

  useEffect(() => setOpen(false), [pathname]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Warming up the track…" />
      </div>
    );
  }

  const items = NAV.filter((item) => item.roles.includes(user.role));
  const denied = allow && !allow.includes(user.role);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex size-10 items-center justify-center rounded-xl bg-heat text-lg font-black text-primary-foreground">
            EIA
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold">Camel vs. Dwarf</p>
            <p className="text-xs text-sidebar-foreground/60">Racing System</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto text-sidebar-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Button>
        </div>
        <Separator className="bg-sidebar-border" />
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open ? (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            {title ? <h1 className="truncate text-lg font-bold md:text-xl">{title}</h1> : null}
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground md:text-sm">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <div className="hidden items-center gap-3 rounded-full border border-border bg-card px-3 py-1.5 sm:flex">
              <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                {user.displayName.slice(0, 2).toUpperCase()}
              </div>
              <p className="max-w-44 truncate text-xs font-semibold">{user.username}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {denied ? <AccessDenied /> : children}
        </main>
      </div>
    </div>
  );
}
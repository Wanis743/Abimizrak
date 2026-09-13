import { Link, useLocation } from "wouter";
import {
  Home,
  Compass,
  Activity,
  Calendar,
  FileBadge2,
  UserCheck,
  Hash,
  LogOut,
  ChevronDown,
  Network,
} from "lucide-react";
import { useUser, useAuthActions } from "@/lib/auth";
import type { SpaceDetail } from "@workspace/api-zod";
import { useGetSpace } from "@workspace/api-client-react";
import { usePreferences } from "@/i18n/runtime";

interface ChannelSidebarProps {
  role: string;
  spaceId?: string;
}

export function ChannelSidebar({ role, spaceId }: ChannelSidebarProps) {
  const [location] = useLocation();
  const { signOut } = useAuthActions();
  const { user } = useUser();
  const { t } = usePreferences();

  // If a spaceId is provided, we fetch its details
  const { data: space } = useGetSpace(spaceId || "", {
    query: { enabled: !!spaceId, queryKey: ["space", spaceId || ""] },
  });

  const isHome = !spaceId;

  // Home Context Navigation
  const homeNavItems = [
    { href: "/", label: t("page.home.title"), icon: Home },
    { href: "/events", label: t("page.events.title"), icon: Calendar },
    { href: "/spaces", label: t("page.spaces.discover"), icon: Compass },
    { href: "/projects", label: t("page.projects.title"), icon: Compass },
    { href: "/talent", label: t("page.talent.title"), icon: Network },
    { href: "/activity", label: t("page.activity.title"), icon: Activity },
    { href: "/identity", label: t("page.identity.title"), icon: FileBadge2 },
    ...(role === "teacher" || role === "admin"
      ? [{ href: "/teacher", label: t("sidebar.teacherWorkspace"), icon: UserCheck }]
      : []),
    ...(role === "admin"
      ? [
          { href: "/admin", label: t("page.admin.eyebrow"), icon: UserCheck },
          { href: "/admin/verification", label: t("sidebar.verifyMembers"), icon: UserCheck },
        ]
      : []),
  ];

  // Space Context Navigation (Placeholder channels for now)
  const spaceNavItems = spaceId
    ? [
        { href: `/spaces/${spaceId}`, label: "feed", icon: Hash },
        { href: `/spaces/${spaceId}/assignments`, label: t("page.academic.assignments"), icon: Hash },
        { href: `/spaces/${spaceId}/resources`, label: t("page.activity.resource"), icon: Hash },
        ...(role === "teacher" || role === "admin"
          ? [{ href: `/spaces/${spaceId}/teacher`, label: t("sidebar.teacherWorkspace"), icon: UserCheck }]
          : []),
      ]
    : [];

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-[var(--lc-line)] bg-white/8 backdrop-blur-2xl">
      {/* Sidebar Header */}
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-[var(--lc-line)] px-4 font-bold text-[var(--lc-ink)]">
        <h2 className="truncate text-base">
          {isHome ? t("app.schoolName") : space?.name || t("state.loading")}
        </h2>
        <ChevronDown size={18} className="text-[var(--lc-muted)]" />
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto px-2 py-4 hide-scrollbar">
        {isHome && (
          <div className="space-y-0.5">
            {homeNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-colors ${isActive ? "bg-[hsl(var(--lc-accent)/.12)] text-[var(--lc-accent)]" : "text-[var(--lc-muted)] hover:bg-white/10 hover:text-[var(--lc-ink)]"}`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!isHome && (
          <div className="space-y-0.5">
            {spaceNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-colors ${isActive ? "bg-[hsl(var(--lc-accent)/.12)] text-[var(--lc-accent)]" : "text-[var(--lc-muted)] hover:bg-white/10 hover:text-[var(--lc-ink)]"}`}
                  >
                    <item.icon size={18} className="text-[var(--lc-muted)]" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="mt-auto flex shrink-0 items-center justify-between border-t border-[var(--lc-line)] bg-white/10 p-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25423A] text-xs font-bold text-white">
            {user?.fullName
              ?.split(" ")
              .map((part: string) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "U"}
          </div>
          <div className="truncate">
            <div className="truncate text-xs font-bold text-[var(--lc-ink)]">
              {user?.fullName || t("sidebar.user")}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--lc-muted)]">
              {role}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-md p-1.5 text-[#59706A] hover:bg-[#DDE8DF] hover:text-[var(--lc-ink)]"
          title={t("account.signOut")}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

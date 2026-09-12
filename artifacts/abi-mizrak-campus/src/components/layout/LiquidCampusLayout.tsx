import { type ReactNode, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Menu, X, Search, Bell, Command, CheckCheck } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

type CampusNotification = {
  id: string;
  title?: string | null;
  body?: string | null;
  message?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
  targetUrl?: string | null;
};
type CampusSearchResult = {
  id: string;
  kind: "person" | "space" | "project" | "event";
  title: string;
  detail?: string | null;
  href: string;
};
type CampusSearchResponse = { query: string; results: CampusSearchResult[] };
import { ServerSidebar } from "./ServerSidebar";
import { ChannelSidebar } from "./ChannelSidebar";

export function LiquidCampusLayout({
  children,
  role,
  displayName,
}: {
  children: ReactNode;
  role: string;
  displayName: string;
}) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<CampusNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim();
  const search = useQuery({
    queryKey: ["campus-search", normalizedSearchQuery],
    queryFn: () =>
      customFetch<CampusSearchResponse>(
        `/api/search?q=${encodeURIComponent(normalizedSearchQuery)}`,
      ),
    enabled: commandOpen && normalizedSearchQuery.length >= 2,
    staleTime: 30_000,
  });
  const spaceId = location.startsWith("/spaces/")
    ? location.split("/")[2]
    : undefined;

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
  }, [location]);
  useEffect(() => {
    void customFetch<CampusNotification[]>("/api/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [location]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((v) => !v);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="campus-shell liquid-canvas flex h-[100dvh] w-full overflow-hidden">
      <header className="fixed inset-x-0 top-0 z-50 mx-auto flex h-16 items-center gap-3 px-3 md:hidden">
        <div className="liquid-surface flex h-12 flex-1 items-center justify-between rounded-full px-3">
          <div className="min-w-0 truncate text-sm font-bold">
            Lycée Abi Mizrak
          </div>
          <div className="flex items-center gap-1">
            <button
              className="lc-icon-button"
              onClick={() => setCommandOpen(true)}
              aria-label="Search"
            >
              <Search size={17} />
            </button>
            <button
              className="lc-icon-button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open navigation"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-y-0 left-0 z-40 flex pt-16 transition-transform duration-300 md:relative md:z-auto md:translate-x-0 md:pt-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <ServerSidebar />
        <ChannelSidebar role={role} spaceId={spaceId} />
      </div>

      <main className="min-w-0 flex-1 overflow-hidden pt-16 md:pt-0">
        <div className="hidden h-16 items-center justify-between border-b border-[var(--lc-line)]/70 px-8 md:flex">
          <button
            className="liquid-panel flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-[var(--lc-muted)]"
            onClick={() => setCommandOpen(true)}
          >
            <Search size={16} />
            <span>Search your campus</span>
            <kbd className="ml-6 rounded-md border border-[var(--lc-line)] px-2 py-0.5 text-[10px]">
              <Command size={10} className="mr-1 inline" />K
            </kbd>
          </button>
          <div className="flex items-center gap-3">
            <div className="lc-eyebrow hidden xl:block">{displayName}</div>
            <button
              className="lc-icon-button relative"
              onClick={() => setNotificationsOpen((v) => !v)}
              aria-label="Notifications"
            >
              <Bell size={17} />
              {notifications.some((n) => !n.readAt) && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--lc-accent)]" />
              )}
            </button>
          </div>
        </div>
        <div className="h-[calc(100%-4rem)] overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/10 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {notificationsOpen && (
        <div className="fixed right-4 top-20 z-[70] w-[min(92vw,390px)] liquid-surface rounded-[24px] p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--lc-line)] pb-3">
            <div>
              <div className="lc-eyebrow">Campus inbox</div>
              <div className="font-display text-lg font-bold">
                Notifications
              </div>
            </div>
            <button
              className="text-xs font-bold text-[var(--lc-muted)]"
              onClick={async () => {
                try {
                  await customFetch("/api/notifications/read-all", {
                    method: "POST",
                  });
                  setNotifications((rows) =>
                    rows.map((n) => ({
                      ...n,
                      readAt: n.readAt || new Date().toISOString(),
                    })),
                  );
                } catch {
                  // Keep unread state unchanged when persistence fails.
                }
              }}
            >
              <CheckCheck size={15} className="mr-1 inline" />
              Mark all read
            </button>
          </div>
          <div className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--lc-line)] p-6 text-sm text-[var(--lc-muted)]">
                You are all caught up.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  className={`w-full rounded-2xl border p-3 text-left transition ${n.readAt ? "border-[var(--lc-line)] bg-white/10" : "border-[var(--lc-accent)]/25 bg-[var(--lc-accent)]/5"}`}
                  onClick={async () => {
                    let persisted = Boolean(n.readAt);
                    if (!n.readAt) {
                      try {
                        await customFetch(`/api/notifications/${n.id}/read`, {
                          method: "POST",
                        });
                        persisted = true;
                        setNotifications((rows) =>
                          rows.map((row) =>
                            row.id === n.id
                              ? { ...row, readAt: new Date().toISOString() }
                              : row,
                          ),
                        );
                      } catch {
                        persisted = false;
                      }
                    }
                    if (persisted && n.targetUrl) navigate(n.targetUrl);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--lc-accent)]" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold">
                        {n.title || "Campus notification"}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--lc-muted)]">
                        {n.body || n.message || ""}
                      </div>
                      <div className="mt-2 text-[10px] font-semibold text-[var(--lc-muted)]">
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {commandOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-[hsl(var(--lc-ink)/.16)] px-4 pt-[12vh] backdrop-blur-md"
          onMouseDown={() => setCommandOpen(false)}
        >
          <div
            className="liquid-surface w-full max-w-2xl overflow-hidden rounded-[28px]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--lc-line)] px-5 py-4">
              <div className="flex items-center gap-3">
                <Search size={19} className="text-[var(--lc-muted)]" />
                <input
                  autoFocus
                  placeholder="Search people, spaces, projects, events…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--lc-muted)]"
                />
              </div>
            </div>
            {normalizedSearchQuery.length >= 2 ? (
              <div className="max-h-[55vh] space-y-2 overflow-y-auto p-4">
                {search.isLoading ? (
                  <div className="p-6 text-center text-sm text-[var(--lc-muted)]">Searching the campus…</div>
                ) : search.isError ? (
                  <div className="rounded-2xl border border-dashed border-[var(--lc-line)] p-5 text-sm text-[var(--lc-muted)]">Campus search is temporarily unavailable.</div>
                ) : search.data?.results.length ? (
                  search.data.results.map((result) => (
                    <button
                      key={`${result.kind}:${result.id}`}
                      onClick={() => {
                        setCommandOpen(false);
                        setSearchQuery("");
                        navigate(result.href);
                      }}
                      className="liquid-panel flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-transform hover:-translate-y-0.5"
                    >
                      <span className="rounded-full border border-[var(--lc-line)] px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[var(--lc-muted)]">{result.kind}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{result.title}</span>
                        {result.detail ? <span className="mt-1 block line-clamp-2 text-xs text-[var(--lc-muted)]">{result.detail}</span> : null}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--lc-line)] p-6 text-center text-sm text-[var(--lc-muted)]">No people, spaces, projects, or events match this search.</div>
                )}
              </div>
            ) : (
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                {[
                ["Find a student", "/talent"],
                ["Open academics", "/academic"],
                ["Open my spaces", "/spaces"],
                ["Create a project", "/projects"],
                ["Open notifications", "/activity"],
                ["View school pulse", "/"],
                ].map(([action, href]) => (
                <button
                  key={action}
                  onClick={() => {
                    setCommandOpen(false);
                    navigate(href);
                  }}
                  className="liquid-panel rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-transform hover:-translate-y-0.5"
                >
                  {action}
                </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

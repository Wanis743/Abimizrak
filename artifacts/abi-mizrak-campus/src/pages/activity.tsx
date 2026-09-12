import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import {
  BellRing,
  BookOpen,
  CalendarDays,
  Megaphone,
  Network,
  Radio,
  Sparkles,
  UserRound,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageIntro, accent } from "./shared";

type ActivityKind =
  | "live"
  | "announcement"
  | "project"
  | "event"
  | "class"
  | "resource";

type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  time: string;
  accent: string;
  actor?: string | null;
};

const activityIcons = {
  live: Radio,
  announcement: Megaphone,
  project: Sparkles,
  event: CalendarDays,
  class: BookOpen,
  resource: BellRing,
} satisfies Record<ActivityKind, typeof Network>;

const activityLabels: Record<ActivityKind, string> = {
  live: "Live",
  announcement: "Announcement",
  project: "Project",
  event: "Event",
  class: "Class",
  resource: "Resource",
};

export function ActivityPage() {
  const activity = useQuery({
    queryKey: ["campus-activity"],
    queryFn: () => customFetch<ActivityItem[]>("/api/campus/activity"),
    staleTime: 30_000,
  });

  return (
    <div className="reveal animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageIntro
        eyebrow="Activity"
        title="Campus Activity"
        detail="Recent posts and updates from spaces you follow."
      />
      {activity.isLoading ? (
        <LoadingState label="Loading campus activity..." />
      ) : activity.isError ? (
        <ErrorState
          label="Campus activity could not be loaded"
          onRetry={() => void activity.refetch()}
        />
      ) : !activity.data?.length ? (
        <EmptyState
          icon={Network}
          title="No activity yet"
          detail="When things happen, they will appear here."
        />
      ) : (
        <div className="space-y-4" aria-label="Campus activity feed">
          {activity.data.map((item) => {
            const Icon = activityIcons[item.kind];
            return (
              <article
                key={item.id}
                className="liquid-surface rounded-[26px] p-5 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent(item.accent)}`}
                  >
                    <Icon size={19} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <span className="font-mono-campus text-[10px] font-bold uppercase tracking-[.18em] text-[#89958F]">
                          {activityLabels[item.kind]}
                        </span>
                        <h2 className="mt-1 font-display text-lg font-bold text-[#25423A]">
                          {item.title}
                        </h2>
                      </div>
                      <time className="shrink-0 text-xs font-medium text-[#89958F]">
                        {item.time}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#59706A]">
                      {item.detail}
                    </p>
                    {item.actor && (
                      <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#725A4A]">
                        <UserRound size={14} aria-hidden="true" />
                        {item.actor}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

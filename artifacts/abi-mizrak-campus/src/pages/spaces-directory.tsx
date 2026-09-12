import { useState, useMemo } from "react";
import {
  useGetSpaces,
  useJoinSpace,
  getGetSpacesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Network, Search } from "lucide-react";
import {
  PageIntro,
  SpaceCard,
  typeLabels,
  LoadingState,
  ErrorState,
  EmptyState,
} from "./shared";
import type { Space } from "@workspace/api-zod";

export function SpacesPage() {
  const { data, isLoading, isError, refetch } = useGetSpaces();
  const spaces = (data as Space[]) || [];
  const joinSpace = useJoinSpace();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () =>
      spaces.filter(
        (space) =>
          (filter === "all" || space.type === filter) &&
          `${space.name} ${space.description}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [filter, search, spaces],
  );

  const shownSpaces = filtered.map((space) => ({
    ...space,
    joined: joined[space.id] ?? space.joined,
  }));

  const handleJoin = (spaceId: string) => {
    joinSpace.mutate(
      { spaceId },
      {
        onSuccess: (membership) => {
          setJoined((current) => ({
            ...current,
            [spaceId]: membership.joined,
          }));
          void queryClient.invalidateQueries({
            queryKey: getGetSpacesQueryKey(),
          });
        },
      },
    );
  };

  return (
    <div className="reveal animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageIntro
        eyebrow="Explore / spaces"
        title="Find your people."
        detail="Classes, clubs, projects, and the school-wide rooms that make Abi Mizrak feel like yours."
        action={
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87948E]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-[#D9D1C2] bg-[#F9F6F0] py-3 pl-9 pr-4 text-sm outline-none focus:border-[#216F58] md:w-56"
              placeholder="Search spaces"
              aria-label="Search spaces"
            />
          </div>
        }
      />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {(["all", "school", "class", "club", "project", "event"] as const).map(
          (item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold capitalize transition-colors ${filter === item ? "bg-[#216F58] text-[#F5F0E6]" : "border border-[#D9D1C2] bg-[#F9F6F0] text-[#71807A] hover:bg-[#E8EEE8]"}`}
            >
              {item === "all" ? "All spaces" : typeLabels[item]}
            </button>
          ),
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Mapping the campus" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : shownSpaces.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No spaces in this view"
          detail="Try another filter. There is usually somewhere to go."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shownSpaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onJoin={handleJoin}
              isJoining={
                joinSpace.isPending && joinSpace.variables?.spaceId === space.id
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

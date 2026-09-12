import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetSpace,
  useGetSpacePosts,
  useCreatePost,
  getGetSpaceQueryKey,
  getGetSpacePostsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Calendar,
  Heart,
  Flag,
  MessageCircle,
} from "lucide-react";
import { LoadingState, ErrorState, typeIcon, accent } from "./shared";
import type { SpaceDetail, Post, PostInputKind } from "@workspace/api-zod";
import { useUser } from "@/lib/auth";
import { customFetch } from "@workspace/api-client-react";
import { TeacherWorkspace } from "../components/TeacherWorkspace";
import { ChannelChat } from "../components/ChannelChat";

type VerificationStatus = { requestedRole?: string | null; isAdministrator?: boolean };
type SpaceApplication = { id: string; userId?: string; user_id?: string; message?: string | null; status?: string };
type SpaceEvent = { id: string; title: string; description?: string | null; location?: string | null; startTime?: string | null; start_time?: string | null };
type SpaceContext = {
  membership?: { role?: string | null } | null;
  application?: SpaceApplication | null;
  pendingApplications?: SpaceApplication[];
  events?: SpaceEvent[];
};
type DiscussionComment = { id: string; userId?: string; body?: string | null; author?: string | null; createdAt?: string | null };
type Discussion = { comments?: DiscussionComment[]; reactions?: Record<string, number>; viewerReactions?: string[] };
type ReactionResponse = { counts: Record<string, number>; active: boolean };
type ChannelSummary = { id: string; name: string; type: string; unreadCount: number; lastMessageAt?: string | null };

export function SpaceDetailPage() {
  const params = useParams<{ spaceId: string }>();
  const [location] = useLocation();
  const spaceId = params.spaceId || "";

  const { data, isLoading, isError, refetch } = useGetSpace(spaceId, {
    query: {
      enabled: Boolean(spaceId),
      queryKey: getGetSpaceQueryKey(spaceId),
    },
  });
  const { data: postsData, isLoading: postsLoading } = useGetSpacePosts(
    { spaceId },
    {
      query: {
        enabled: Boolean(spaceId),
        queryKey: getGetSpacePostsQueryKey({ spaceId }),
      },
    },
  );

  const space = data as SpaceDetail | undefined;
  const posts = (postsData as Post[] | undefined) || [];

  const createPost = useCreatePost();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");
  const [discussion, setDiscussion] = useState<Record<string, Discussion>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const { user } = useUser();
  const { data: verification } = useQuery({
    queryKey: ["verification-status"],
    queryFn: () => customFetch<VerificationStatus>("/api/identity/verification"),
  });
  const {
    data: context,
    isLoading: membershipLoading,
    refetch: refetchContext,
  } = useQuery({
    queryKey: ["spaceContext", spaceId],
    queryFn: () => customFetch<SpaceContext>(`/api/spaces/${spaceId}/context`),
    enabled: !!spaceId,
  });
  const spaceMembership = context?.membership ?? null;
  const applicationStatus = context?.application ?? null;
  const pendingApplications = context?.pendingApplications ?? [];
  const clubEvents = context?.events ?? [];

  const applyMutation = useMutation({
    mutationFn: () =>
      customFetch(`/api/spaces/${spaceId}/applications`, {
        method: "POST",
        body: JSON.stringify({ message: applicationMessage }),
      }),
    onSuccess: () => {
      setApplicationMessage("");
      void refetchContext();
    },
  });

  const updateApplication = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      customFetch(`/api/spaces/${spaceId}/applications/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => void refetchContext(),
  });

  const isTeacher =
    verification?.requestedRole === "teacher" || verification?.isAdministrator;
  const isSpaceAdmin =
    isTeacher ||
    spaceMembership?.role === "admin" ||
    spaceMembership?.role === "owner";
  const isMember = !!spaceMembership;

  if (isLoading || membershipLoading)
    return <LoadingState label="Opening space" />;
  if (isError || !space)
    return (
      <ErrorState
        onRetry={() => void refetch()}
        label="This space is out of reach"
      />
    );

  const Icon = typeIcon[space.type] || ArrowLeft;
  const color = accent(space.accent);

  // Render sub-routes for the space
  const isTeacherView = location.endsWith("/teacher");
  const isAssignments = location.endsWith("/assignments");
  const isEvents = location.endsWith("/events");
  const isApplications = location.endsWith("/applications");
  const channelMatch = location.match(/\/channels\/([^/]+)$/);
  const activeChannelId = channelMatch ? decodeURIComponent(channelMatch[1]) : "";
  const { data: channels = [] } = useQuery({
    queryKey: ["spaceChannels", spaceId],
    queryFn: () => customFetch<ChannelSummary[]>(`/api/spaces/${encodeURIComponent(spaceId)}/channels`),
    enabled: Boolean(spaceId && isMember),
  });

  const loadDiscussion = async (postId: string) => {
    try {
      const data = await customFetch<Discussion>(
        `/api/social/posts/${encodeURIComponent(postId)}/discussion`,
      );
      setDiscussion((v) => ({ ...v, [postId]: data }));
    } catch {}
  };
  const reactToPost = async (postId: string) => {
    try {
      const data = await customFetch<ReactionResponse>(
        `/api/social/posts/${encodeURIComponent(postId)}/reactions`,
        { method: "POST", body: JSON.stringify({ reaction: "like" }) },
      );
      setDiscussion((v) => ({
        ...v,
        [postId]: {
          ...(v[postId] || {}),
          reactions: data.counts,
          viewerReactions: data.active ? ["like"] : [],
        },
      }));
    } catch {}
  };
  const commentOnPost = async (postId: string) => {
    const text = (commentDraft[postId] || "").trim();
    if (!text) return;
    try {
      await customFetch(
        `/api/social/posts/${encodeURIComponent(postId)}/comments`,
        { method: "POST", body: JSON.stringify({ body: text }) },
      );
      setCommentDraft((v) => ({ ...v, [postId]: "" }));
      await loadDiscussion(postId);
    } catch {}
  };

  const handlePost = () => {
    if (!body.trim()) return;
    createPost.mutate(
      {
        data: {
          spaceId: space.id,
          kind: "discussion" as PostInputKind,
          body: body.trim(),
        },
      },
      {
        onSuccess: () => {
          setBody("");
          void queryClient.invalidateQueries({
            queryKey: getGetSpacePostsQueryKey({ spaceId }),
          });
        },
      },
    );
  };

  const isClub = space.type === "club";

  if (isClub && !isMember && !isSpaceAdmin) {
    return (
      <div className="flex h-full flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="mb-6 flex shrink-0 items-center justify-between rounded-3xl border border-[#D9D1C2] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl ${color}`}
            >
              <Icon size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-[#25423A]">
                  {space.name}
                </h1>
                <span className="rounded-full bg-[#E5EFE6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#216F58]">
                  {space.type}
                </span>
              </div>
              {space.description && (
                <p className="mt-1 text-sm text-[#71807A]">
                  {space.description}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 rounded-3xl border border-[#D9D1C2] bg-white p-8 shadow-sm flex flex-col items-center justify-center">
          {applicationStatus ? (
            <div className="text-center max-w-md">
              <CheckCircle2
                size={48}
                className={`mx-auto mb-4 ${applicationStatus.status === "pending" ? "text-[#725A4A]" : applicationStatus.status === "approved" ? "text-[#216F58]" : "text-[#8F3D2E]"}`}
              />
              <h2 className="text-xl font-bold text-[#25423A] capitalize">
                Application {applicationStatus.status}
              </h2>
              <p className="mt-2 text-[#71807A]">
                {applicationStatus.status === "pending"
                  ? "Your application to join this club is currently under review by the admins."
                  : applicationStatus.status === "rejected"
                    ? "Unfortunately, your application to join this club has been rejected."
                    : "Your application was approved! Please refresh the page."}
              </p>
            </div>
          ) : (
            <div className="w-full max-w-md">
              <h2 className="text-xl font-bold text-[#25423A] text-center mb-6">
                Apply to Join
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#59706A] mb-2">
                    Why do you want to join?
                  </label>
                  <textarea
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                    className="w-full min-h-[120px] rounded-xl border border-[#D9D1C2] bg-[#FBF9F4] p-3 text-sm outline-none focus:border-[#216F58]"
                    placeholder="Introduce yourself..."
                  />
                </div>
                <button
                  onClick={() => applyMutation.mutate()}
                  disabled={
                    applyMutation.isPending || !applicationMessage.trim()
                  }
                  className="w-full rounded-xl bg-[#216F58] px-4 py-3 text-sm font-bold text-white hover:bg-[#1B5D4A] disabled:opacity-50"
                >
                  {applyMutation.isPending
                    ? "Submitting..."
                    : "Submit Application"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-6 flex shrink-0 items-center justify-between rounded-3xl border border-[#D9D1C2] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl ${color}`}
          >
            <Icon size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-[#25423A]">
                {space.name}
              </h1>
              <span className="rounded-full bg-[#E5EFE6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#216F58]">
                {space.type}
              </span>
            </div>
            {space.description && (
              <p className="mt-1 text-sm text-[#71807A]">{space.description}</p>
            )}
          </div>
        </div>
      </header>

      <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
        <Link
          href={`/spaces/${spaceId}`}
          className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap ${!isTeacherView && !isAssignments && !isEvents && !isApplications ? "bg-[#F5F0E6] text-[#216F58]" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Discussion
        </Link>
        {channels.map((channel) => (
          <Link
            href={`/spaces/${spaceId}/channels/${encodeURIComponent(channel.id)}`}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap ${activeChannelId === channel.id ? "bg-[#F5F0E6] text-[#216F58]" : "text-gray-500 hover:bg-gray-100"}`}
          >
            # {channel.name}
            {channel.unreadCount > 0 && (
              <span className="min-w-5 rounded-full bg-[#E76F51] px-1.5 py-0.5 text-center text-[10px] text-white">
                {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
              </span>
            )}
          </Link>
        ))}

        {isClub && (
          <Link
            href={`/spaces/${spaceId}/events`}
            className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap ${isEvents ? "bg-[#F5F0E6] text-[#216F58]" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Events
          </Link>
        )}

        {isClub && isSpaceAdmin && (
          <Link
            href={`/spaces/${spaceId}/applications`}
            className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap ${isApplications ? "bg-[#F5F0E6] text-[#216F58]" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Applications{" "}
            {pendingApplications?.length
              ? `(${pendingApplications.length})`
              : ""}
          </Link>
        )}

        {isTeacher && space.type === "class" && (
          <Link
            href={`/spaces/${spaceId}/teacher`}
            className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap ${isTeacherView ? "bg-[#F5F0E6] text-[#216F58]" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Teacher Workspace
          </Link>
        )}
      </div>

      {activeChannelId ? (
        <ChannelChat spaceId={spaceId} channelId={activeChannelId} />
      ) : isTeacherView ? (
        <div className="flex-1 rounded-3xl border border-[#D9D1C2] bg-white p-8 shadow-sm">
          {isTeacher && space.type === "class" ? (
            <TeacherWorkspace spaceId={spaceId} />
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#8F3D2E]">
                Teacher Workspace
              </h2>
              <p className="mt-2 text-[#71807A]">
                Student grading, attendance, and analytics will appear here.
              </p>
            </>
          )}
        </div>
      ) : isAssignments ? (
        <div className="flex-1 rounded-3xl border border-[#D9D1C2] bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[#25423A]">Assignments</h2>
          <p className="mt-2 text-[#71807A]">
            Active coursework for this space.
          </p>
        </div>
      ) : isEvents && isClub ? (
        <div className="flex-1 rounded-3xl border border-[#D9D1C2] bg-white p-8 shadow-sm overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#25423A]">Club Events</h2>
          </div>
          {clubEvents?.length === 0 ? (
            <p className="text-[#71807A]">No upcoming events for this club.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {clubEvents?.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-2xl border border-[#D9D1C2] bg-[#FBF9F4]"
                >
                  <h3 className="font-bold text-[#25423A] text-lg">
                    {event.title}
                  </h3>
                  <p className="text-sm text-[#71807A] mt-1">
                    {event.description}
                  </p>
                  <div className="mt-4 space-y-1 text-xs text-[#59706A]">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {event.startTime || event.start_time
                        ? new Date(
                            event.startTime ?? event.start_time ?? "",
                          ).toLocaleString()
                        : "Schedule pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : isApplications && isClub && isSpaceAdmin ? (
        <div className="flex-1 rounded-3xl border border-[#D9D1C2] bg-white p-8 shadow-sm overflow-y-auto">
          <h2 className="text-xl font-bold text-[#25423A] mb-6">
            Manage Applications
          </h2>
          {pendingApplications?.length === 0 ? (
            <p className="text-[#71807A]">No pending applications.</p>
          ) : (
            <div className="space-y-4">
              {pendingApplications?.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl border border-[#D9D1C2] bg-[#FBF9F4]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-[#25423A]">
                        User {(app.userId ?? app.user_id ?? "unknown").substring(0, 8)}
                      </span>
                      <p className="text-sm text-[#71807A] mt-2 whitespace-pre-wrap">
                        {app.message}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          updateApplication.mutate({
                            id: app.id,
                            status: "approved",
                          })
                        }
                        disabled={updateApplication.isPending}
                        className="rounded-lg bg-[#216F58] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1B5D4A]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          updateApplication.mutate({
                            id: app.id,
                            status: "rejected",
                          })
                        }
                        disabled={updateApplication.isPending}
                        className="rounded-lg bg-[#F6DDD6] px-3 py-1.5 text-xs font-bold text-[#8F3D2E] hover:bg-[#F2CBC1]"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-[#D9D1C2] bg-white shadow-sm">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {postsLoading ? (
              <LoadingState label="Loading posts" />
            ) : posts.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[#89958F]">
                It's quiet here. Be the first to post.
              </div>
            ) : (
              posts.map((post) => {
                const info = discussion[post.id] || {};
                const liked =
                  Array.isArray(info.viewerReactions) &&
                  info.viewerReactions.includes("like");
                return (
                  <div key={post.id} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8EEE8] font-bold text-[#216F58]">
                      {String(post.author || "AB")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#25423A]">
                          {post.author || "Campus member"}
                        </span>
                        <span className="text-xs text-[#89958F]">
                          {post.time || "recently"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#59706A] whitespace-pre-wrap">
                        {post.body}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => void reactToPost(post.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${liked ? "bg-[#E5EFE6] text-[#216F58]" : ""}`}
                        >
                          <Heart
                            size={13}
                            className={liked ? "fill-current" : ""}
                          />{" "}
                          {info.reactions?.like || 0}
                        </button>
                        <button
                          onClick={() =>
                            info.comments
                              ? void loadDiscussion(post.id)
                              : void loadDiscussion(post.id)
                          }
                          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold"
                        >
                          <MessageCircle size={13} />{" "}
                          {Array.isArray(info.comments)
                            ? info.comments.length
                            : 0}
                        </button>
                        <button
                          onClick={() => {
                            const reason = window.prompt(
                              "Reason for reporting this post?",
                            );
                            if (reason)
                              void customFetch("/api/moderation/reports", {
                                method: "POST",
                                body: JSON.stringify({
                                  targetType: "post",
                                  targetId: post.id,
                                  reason,
                                }),
                              });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold"
                        >
                          <Flag size={13} /> Report
                        </button>
                      </div>
                      {discussion[post.id] && (
                        <div className="mt-3 rounded-2xl border border-[#D9D1C2] bg-[#FBF9F4] p-3">
                          {(info.comments || []).map((c) => (
                            <div
                              key={c.id}
                              className="border-b border-[#E8E1D6] py-2 last:border-0"
                            >
                              <div className="text-[11px] font-bold">
                                {(c.userId ?? "unknown").slice(0, 8)}
                              </div>
                              <div className="text-sm text-[#59706A]">
                                {c.body}
                              </div>
                            </div>
                          ))}
                          <div className="mt-2 flex gap-2">
                            <input
                              value={commentDraft[post.id] || ""}
                              onChange={(e) =>
                                setCommentDraft((v) => ({
                                  ...v,
                                  [post.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && void commentOnPost(post.id)
                              }
                              placeholder="Add a comment…"
                              className="min-w-0 flex-1 rounded-full border border-[#D9D1C2] bg-white px-3 py-2 text-xs"
                            />
                            <button
                              onClick={() => void commentOnPost(post.id)}
                              className="rounded-full bg-[#216F58] px-3 py-2 text-xs font-bold text-white"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t border-[#D9D1C2] p-4 bg-[#FBF9F4]">
            <div className="flex items-center gap-2">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePost()}
                placeholder={`Message ${space.name}`}
                className="flex-1 rounded-full border border-[#D9D1C2] bg-white px-4 py-2 text-sm outline-none focus:border-[#216F58]"
              />
              <button
                onClick={handlePost}
                disabled={createPost.isPending || !body.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#216F58] text-white transition-colors hover:bg-[#1B5D4A] disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

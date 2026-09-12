import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  Circle,
  LoaderCircle,
  Users,
  UserPlus,
} from "lucide-react";
import { ErrorState } from "./shared";
import { ChannelChat } from "@/components/ChannelChat";

interface ProjectDetail {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    visibility: string;
    createdAt: string;
  };
  members: {
    id: string;
    userId: string;
    role: string;
    name: string | null;
    joinedAt: string;
  }[];
  milestones: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    createdAt: string;
  }[];
  viewer: { isMember: boolean; isCreator: boolean; canManage: boolean };
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["campus-project", projectId],
    queryFn: () => customFetch<ProjectDetail>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });
  const joinProject = useMutation({
    mutationFn: () =>
      customFetch<void>(`/api/projects/${projectId}/join`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["campus-project", projectId],
      });
    },
  });
  const addMilestone = useMutation({
    mutationFn: () =>
      customFetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        body: JSON.stringify({ title: newMilestoneTitle.trim() }),
      }),
    onSuccess: () => {
      setNewMilestoneTitle("");
      setIsAddingMilestone(false);
      void queryClient.invalidateQueries({
        queryKey: ["campus-project", projectId],
      });
    },
  });
  const toggleMilestone = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      customFetch(`/api/projects/${projectId}/milestones/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: status === "completed" ? "pending" : "completed",
        }),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["campus-project", projectId],
      }),
  });
  const updateSettings = useMutation({
    mutationFn: (body: { status?: string; visibility?: string }) => customFetch(`/api/projects/${projectId}/settings`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["campus-project", projectId] }),
  });
  const addMember = useMutation({
    mutationFn: () => customFetch(`/api/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ userId: inviteUserId.trim() }) }),
    onSuccess: () => { setInviteUserId(""); void queryClient.invalidateQueries({ queryKey: ["campus-project", projectId] }); },
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => customFetch(`/api/projects/${projectId}/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["campus-project", projectId] }),
  });
  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <LoaderCircle
          className="animate-spin text-[var(--lc-accent)]"
          size={32}
        />
      </div>
    );
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;
  const { project, members, milestones, viewer } = data;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--lc-muted)] hover:text-[var(--lc-ink)]"
      >
        <ArrowLeft size={16} /> Back to projects
      </Link>
      <section className="liquid-surface crystal p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="lc-eyebrow">{project.status} project</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.05em]">
              {project.name}
            </h1>
            <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[var(--lc-muted)]">
              {project.description}
            </p>
          </div>
          {!viewer.isMember && (
            <button
              onClick={() => joinProject.mutate()}
              disabled={joinProject.isPending}
              className="lc-primary-button"
            >
              <UserPlus size={16} />
              {joinProject.isPending ? "Joining…" : "Join project"}
            </button>
          )}
          {viewer.canManage && (
            <div className="flex flex-wrap gap-2">
              <select aria-label="Project visibility" className="lc-input" value={project.visibility} disabled={updateSettings.isPending} onChange={(event) => updateSettings.mutate({ visibility: event.target.value })}>
                <option value="public">Public</option><option value="private">Private</option>
              </select>
              {project.status === "idea" && <button className="lc-primary-button" disabled={updateSettings.isPending} onClick={() => updateSettings.mutate({ status: "active" })}>Start project</button>}
              {project.status === "active" && <button className="lc-primary-button" disabled={updateSettings.isPending} onClick={() => updateSettings.mutate({ status: "completed" })}>Complete project</button>}
            </div>
          )}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="liquid-surface p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="lc-eyebrow">Execution</div>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  Milestones
                </h2>
              </div>
              {viewer.isCreator && !isAddingMilestone && (
                <button
                  onClick={() => setIsAddingMilestone(true)}
                  className="lc-secondary-button"
                >
                  <Plus size={15} /> Add
                </button>
              )}
            </div>
            {isAddingMilestone && (
              <div className="mt-4 flex gap-2">
                <input
                  autoFocus
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="Next milestone…"
                  className="min-w-0 flex-1 rounded-xl border border-[var(--lc-line)] bg-white/50 px-3 py-2 outline-none"
                />
                <button
                  onClick={() => {
                    if (newMilestoneTitle.trim()) addMilestone.mutate();
                  }}
                  className="lc-primary-button"
                >
                  Add
                </button>
              </div>
            )}
            <div className="mt-5 space-y-2">
              {milestones.length === 0 ? (
                <p className="text-sm text-[var(--lc-muted)]">
                  No milestones yet.
                </p>
              ) : (
                milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--lc-line)] bg-white/25 p-3"
                  >
                    <button
                      onClick={() =>
                        viewer.isCreator &&
                        toggleMilestone.mutate({ id: m.id, status: m.status })
                      }
                      disabled={!viewer.isCreator || toggleMilestone.isPending}
                      aria-label={`Toggle ${m.title}`}
                    >
                      {m.status === "completed" ? (
                        <CheckCircle
                          className="text-[var(--lc-accent)]"
                          size={20}
                        />
                      ) : (
                        <Circle className="text-[var(--lc-muted)]" size={20} />
                      )}
                    </button>
                    <span
                      className={`text-sm font-semibold ${m.status === "completed" ? "line-through text-[var(--lc-muted)]" : ""}`}
                    >
                      {m.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="liquid-surface p-5 md:p-6">
            <div className="flex items-center gap-2">
              <Users size={17} className="text-[var(--lc-accent)]" />
              <div>
                <div className="lc-eyebrow">People</div>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  Project team
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {members.map((m) => (
                <div key={m.id} className="liquid-panel rounded-2xl p-3">
                  <div className="font-semibold">
                    {m.name || "Campus member"}
                  </div>
                  <div className="mt-1 text-xs capitalize text-[var(--lc-muted)]">
                    {m.role}
                  </div>
                  {viewer.canManage && m.role !== "creator" && <button className="mt-2 text-xs font-bold text-red-700" disabled={removeMember.isPending} onClick={() => removeMember.mutate(m.userId)}>Remove</button>}
                </div>
              ))}
            </div>
            {viewer.canManage && <div className="mt-4 flex gap-2"><input className="lc-input min-w-0 flex-1" aria-label="Campus member user ID" placeholder="Campus member user ID" value={inviteUserId} onChange={(event) => setInviteUserId(event.target.value)} /><button className="lc-secondary-button" disabled={!inviteUserId.trim() || addMember.isPending} onClick={() => addMember.mutate()}><UserPlus size={15} /> Add member</button></div>}
          </section>
        </div>
        <section className="liquid-surface flex h-[600px] min-h-0 flex-col overflow-hidden">
          <div className="border-b border-[var(--lc-line)] px-4 py-3">
            <div className="lc-eyebrow">Team communication</div>
            <h3 className="mt-1 font-display font-bold">Project chat</h3>
          </div>
          <div className="min-h-0 flex-1">
            {projectId && (
              <ChannelChat
                spaceId={projectId}
                channelId={`${projectId}:project-general`}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Sparkles,
  Plus,
  Rocket,
  CheckCircle,
  LoaderCircle,
  Users,
} from "lucide-react";
import { PageIntro, EmptyState, ErrorState } from "./shared";

export interface CampusProject {
  id: string;
  name: string;
  description: string;
  status: "idea" | "active" | "completed";
  createdAt: string;
}

export function ProjectsDirectory() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"idea" | "active" | "completed">(
    "idea",
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const {
    data: projects,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["campus-projects"],
    queryFn: () => customFetch<CampusProject[]>("/api/projects"),
  });
  const createProject = useMutation({
    mutationFn: () =>
      customFetch<CampusProject>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim(),
          status: "idea",
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campus-projects"] });
      setIsCreating(false);
      setNewProjectName("");
      setNewProjectDescription("");
    },
  });
  const filteredProjects =
    projects?.filter((p) => p.status === activeTab) || [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageIntro
        eyebrow="Innovation arena"
        title="Project directory"
        detail="Build alongside people you already share a campus with. Projects are first-class campus objects, not loose posts."
        action={
          <button
            onClick={() => setIsCreating(true)}
            className="lc-primary-button"
          >
            <Plus size={17} /> Create project
          </button>
        }
      />
      {isCreating && (
        <div className="mt-6 liquid-surface crystal p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newProjectName.trim() && newProjectDescription.trim())
                createProject.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="rounded-2xl border border-[var(--lc-line)] bg-white/50 px-4 py-3 outline-none"
              />
              <select
                value="idea"
                disabled
                className="rounded-2xl border border-[var(--lc-line)] bg-white/50 px-4 py-3 outline-none"
              >
                <option value="idea">Idea</option>
              </select>
            </div>
            <textarea
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              placeholder="What are you building?"
              className="min-h-[120px] w-full rounded-2xl border border-[var(--lc-line)] bg-white/50 p-4 outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-[var(--lc-muted)]"
              >
                Cancel
              </button>
              <button
                disabled={createProject.isPending}
                className="lc-primary-button"
              >
                {createProject.isPending ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                Publish idea
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="mt-8 liquid-surface p-1.5">
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { id: "idea", label: "Ideas", icon: Sparkles },
              { id: "active", label: "Active", icon: Rocket },
              { id: "completed", label: "Completed", icon: CheckCircle },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${activeTab === tab.id ? "liquid-panel text-[var(--lc-accent)]" : "text-[var(--lc-muted)]"}`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        {isLoading ? (
          <div className="liquid-surface flex justify-center p-12">
            <LoaderCircle className="animate-spin text-[var(--lc-accent)]" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No projects here yet"
            detail="Start a project and turn a campus idea into a real team workspace."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <article className="liquid-panel h-full rounded-[24px] p-5 transition-transform hover:-translate-y-1">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full border border-[var(--lc-line)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--lc-muted)]">
                      {project.status}
                    </span>
                    <span className="text-xs text-[var(--lc-muted)]">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold">
                    {project.name}
                  </h3>
                  <p className="mt-2 line-clamp-4 text-sm leading-6 text-[var(--lc-muted)]">
                    {project.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-[var(--lc-line)] pt-4 text-xs font-bold text-[var(--lc-muted)]">
                    <span className="flex items-center gap-1.5">
                      <Users size={13} /> Team workspace
                    </span>
                    <span className="text-[var(--lc-accent)]">Open →</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  Calendar,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Plus,
  Save,
  Table2,
  X,
  CheckCircle2,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

type TeacherClass = {
  id: string;
  label: string;
  fullLabelAr?: string | null;
  fullLabelFr?: string | null;
  capacity: number;
};
type Student = {
  userId: string;
  name: string;
  email: string | null;
  classLabel: string;
};
type Grade = {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  termId: string;
  value: number;
  maxValue: number;
  coefficient: number;
  type: string;
};
type Subject = { id: string; code: string; labelAr: string; labelFr: string };
type Term = { id: string; labelAr: string; labelFr: string; order: number };
type ScheduleEntry = { id: string; dayOfWeek: number; startTime: string; endTime: string; subject?: string | null; room?: string | null; classLabel?: string | null };
type Assignment = { id: string; title?: string | null; titleFr?: string | null; titleAr?: string | null; descriptionFr?: string | null; dueDate?: string | null; createdAt?: string | null; status?: string | null; subjectId?: string | null };
type SubmissionFile = { url?: string; name?: string };
type Submission = { id: string; studentId: string; studentName?: string | null; subject?: string | null; assignmentTitle?: string | null; submittedAt?: string | null; isLate?: boolean; maxScore?: number | null; bodyText?: string | null; files?: SubmissionFile[] | null; gradeValue?: number | null; feedback?: string | null; status?: string | null };

async function api<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? ""}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? "Request failed");
  return data as T;
}

export function TeacherWorkspace({
  spaceId = "school-main",
}: {
  spaceId?: string;
}) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const token = session?.access_token;
  const [selectedClass, setSelectedClass] = useState("");
  const [panel, setPanel] = useState<
    "overview" | "attendance" | "gradebook" | "submissions" | "schedule"
  >("overview");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reviewGrades, setReviewGrades] = useState<Record<string, string>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>(
    {},
  );

  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    enabled: !!token,
    queryFn: () => api<TeacherClass[]>("/api/academic/classes", token!),
  });
  const rosterQ = useQuery({
    queryKey: ["academic-roster", selectedClass],
    enabled: !!token && !!selectedClass,
    queryFn: () =>
      api<Student[]>(`/api/academic/classes/${selectedClass}/roster`, token!),
  });
  const gradebookQ = useQuery({
    queryKey: ["academic-gradebook", selectedClass],
    enabled: !!token && !!selectedClass && panel !== "schedule",
    queryFn: () =>
      api<{
        students: { userId: string }[];
        grades: Grade[];
        subjects: Subject[];
        terms: Term[];
      }>(`/api/academic/classes/${selectedClass}/gradebook`, token!),
  });
  const attendanceQ = useQuery({
    queryKey: ["academic-attendance", selectedClass, attendanceDate],
    enabled: !!token && !!selectedClass && panel === "attendance",
    queryFn: () =>
      api<{
        students: Array<{
          userId: string;
          records: Array<{ period: number; status: string }>;
        }>;
      }>(
        `/api/academic/classes/${selectedClass}/attendance?date=${attendanceDate}`,
        token!,
      ),
  });
  const scheduleQ = useQuery({
    queryKey: ["academic-schedule", selectedClass],
    enabled: !!token && (panel === "schedule" || !!selectedClass),
    queryFn: () =>
      api<ScheduleEntry[]>(
        `/api/academic/timetable${selectedClass ? `?classId=${encodeURIComponent(selectedClass)}` : ""}`,
        token!,
      ),
  });
  const assignmentsQ = useQuery({
    queryKey: ["academic-assignments", selectedClass],
    enabled: !!token && !!selectedClass,
    queryFn: () =>
      api<Assignment[]>(
        `/api/academic/assignments?classId=${encodeURIComponent(selectedClass)}`,
        token!,
      ),
  });
  const submissionsQ = useQuery({
    queryKey: ["academic-submissions", selectedClass],
    enabled: !!token && !!selectedClass && panel === "submissions",
    queryFn: () =>
      api<Submission[]>(`/api/academic/classes/${selectedClass}/submissions`, token!),
  });

  const createAssignment = useMutation({
    mutationFn: () =>
      api("/api/academic/assignments", token!, {
        method: "POST",
        body: JSON.stringify({
          classId: selectedClass,
          subjectId,
          titleFr: newTitle.trim(),
          descriptionFr: newDesc.trim(),
          dueDate: new Date(dueDate).toISOString(),
          maxScore: 20,
          status: "published",
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["academic-assignments", selectedClass],
      });
      setIsCreating(false);
      setNewTitle("");
      setNewDesc("");
      setDueDate("");
    },
  });
  const gradeMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api("/api/academic/grades", token!, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic-gradebook", selectedClass],
      }),
  });
  const attendanceMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api("/api/academic/attendance", token!, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic-attendance", selectedClass, attendanceDate],
      }),
  });
  const reviewMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      gradeValue: number | null;
      feedback: string;
      status: string;
    }) =>
      api(`/api/academic/submissions/${payload.id}`, token!, {
        method: "PATCH",
        body: JSON.stringify({
          gradeValue: payload.gradeValue,
          feedback: payload.feedback,
          status: payload.status,
        }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic-submissions", selectedClass],
      }),
  });

  const selected = useMemo(
    () => classesQ.data?.find((c) => c.id === selectedClass),
    [classesQ.data, selectedClass],
  );
  const average = useMemo(() => {
    const rows = gradebookQ.data?.grades ?? [];
    const total = rows.reduce(
      (n, g) => n + (g.value / g.maxValue) * g.coefficient,
      0,
    );
    const weight = rows.reduce((n, g) => n + g.coefficient, 0);
    return weight ? Math.round((total / weight) * 100) : null;
  }, [gradebookQ.data]);
  const sortedAssignments = (assignmentsQ.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""),
    );

  const publish = () => {
    if (
      !selectedClass ||
      !subjectId ||
      !newTitle.trim() ||
      !newDesc.trim() ||
      !dueDate
    )
      return;
    createAssignment.mutate();
  };
  const mark = (studentId: string, status: string) => {
    if (!selectedClass || !subjectId) return;
    attendanceMutation.mutate({
      classId: selectedClass,
      subjectId,
      studentId,
      date: attendanceDate,
      period: 1,
      status,
    });
  };

  return (
    <div className="space-y-8">
      <section className="liquid-surface crystal rounded-[30px] p-5 md:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="lc-eyebrow">Teacher operations</div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-[var(--lc-ink)] md:text-4xl">
              A real teaching workspace.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--lc-muted)]">
              Class rosters, daily attendance, continuous assessment and weekly
              timetable now live beside assignment publishing.
            </p>
          </div>
          <button
            onClick={() => setIsCreating((v) => !v)}
            className="lc-primary-button"
          >
            <Plus size={17} /> New assignment
          </button>
        </div>
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setPanel("overview");
              setSubjectId("");
              setTermId("");
            }}
            className="min-w-64 rounded-2xl border border-[var(--lc-line)] bg-white/55 px-4 py-3 text-sm font-semibold text-[var(--lc-ink)] outline-none"
          >
            <option value="">Select your class</option>
            {(classesQ.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullLabelFr || c.label}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {(
              [
                "overview",
                "attendance",
                "gradebook",
                "submissions",
                "schedule",
              ] as const
            ).map((p) => (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${panel === p ? "bg-[var(--lc-ink)] text-white" : "border border-[var(--lc-line)] bg-white/30 text-[var(--lc-muted)]"}`}
              >
                {p === "overview"
                  ? "Overview"
                  : p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isCreating && (
        <section className="liquid-surface p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="lc-eyebrow">Teaching queue</div>
              <h2 className="mt-1 font-display text-xl font-bold">
                New assignment
              </h2>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="lc-icon-button"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="Assignment title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="rounded-xl border border-[var(--lc-line)] bg-white/55 px-3 text-sm"
            >
              <option value="">Teaching subject</option>
              {(gradebookQ.data?.subjects ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labelFr || s.labelAr}
                </option>
              ))}
            </select>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Objective, expected work, submission notes…"
            className="mt-4 min-h-[130px] w-full rounded-2xl border border-[var(--lc-line)] bg-white/50 p-4 text-sm outline-none focus:border-[var(--lc-accent)]"
          />
          <div className="mt-4 flex justify-end">
            <Button
              onClick={publish}
              disabled={
                createAssignment.isPending ||
                !selectedClass ||
                !subjectId ||
                !newTitle.trim() ||
                !newDesc.trim() ||
                !dueDate
              }
              className="rounded-xl bg-[var(--lc-accent)] text-white hover:opacity-90"
            >
              {createAssignment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Publish assignment
            </Button>
          </div>
        </section>
      )}

      {panel === "overview" && (
        <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <div className="liquid-surface p-5">
            <div className="lc-eyebrow">Class pulse</div>
            <h2 className="mt-1 font-display text-2xl font-bold">
              {selected?.fullLabelFr || selected?.label || "Teaching workspace"}
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric
                icon={<GraduationCap size={17} />}
                label="Students"
                value={selectedClass ? String(rosterQ.data?.length ?? 0) : "—"}
              />
              <Metric
                icon={<Table2 size={17} />}
                label="Recent grades"
                value={
                  selectedClass
                    ? String(gradebookQ.data?.grades.length ?? 0)
                    : "—"
                }
              />
            </div>
            <p className="mt-5 rounded-2xl border border-[var(--lc-line)] bg-white/25 p-4 text-sm leading-6 text-[var(--lc-muted)]">
              Choose a class to unlock its operational surface. The same class
              assignment boundary is enforced server-side.
            </p>
          </div>
          <div className="liquid-surface p-5">
            <div className="lc-eyebrow">Recent assignments</div>
            <div className="mt-3 space-y-3">
              {sortedAssignments.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-[var(--lc-line)] bg-white/25 p-4"
                >
                  <div className="font-semibold">{a.title}</div>
                  <div className="mt-1 text-xs text-[var(--lc-muted)]">
                    {a.dueDate
                      ? `Due ${new Date(a.dueDate).toLocaleDateString()}`
                      : "No deadline"}
                  </div>
                </div>
              ))}
              {sortedAssignments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--lc-line)] p-5 text-sm text-[var(--lc-muted)]">
                  No assignments yet.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {panel === "attendance" && selectedClass && (
        <section className="liquid-surface p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="lc-eyebrow">Daily roll call</div>
              <h2 className="mt-1 font-display text-2xl font-bold">
                Attendance register
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="rounded-xl border border-[var(--lc-line)] bg-white/55 px-3 text-sm"
              >
                <option value="">Teaching subject</option>
                {(gradebookQ.data?.subjects ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.labelFr || s.labelAr}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {(attendanceQ.data?.students ?? []).map((row) => {
              const student = rosterQ.data?.find(
                (s) => s.userId === row.userId,
              );
              const current = row.records.find((r) => r.period === 1)?.status;
              return (
                <div
                  key={row.userId}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--lc-line)] bg-white/25 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-semibold">
                      {student?.name || row.userId}
                    </div>
                    <div className="text-xs text-[var(--lc-muted)]">
                      Period 1 · {current || "Not marked"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["present", "late", "absent", "excused"].map((status) => (
                      <button
                        key={status}
                        disabled={!subjectId || attendanceMutation.isPending}
                        onClick={() => mark(row.userId, status)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${current === status ? "bg-[var(--lc-ink)] text-white" : "border border-[var(--lc-line)]"}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {(attendanceQ.data?.students ?? []).length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--lc-line)] p-6 text-sm text-[var(--lc-muted)]">
                No students are attached to this class.
              </div>
            )}
          </div>
        </section>
      )}

      {panel === "gradebook" && selectedClass && (
        <section className="liquid-surface overflow-hidden p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="lc-eyebrow">Continuous assessment</div>
              <h2 className="mt-1 font-display text-2xl font-bold">
                Gradebook
              </h2>
              <p className="mt-1 text-sm text-[var(--lc-muted)]">
                Weighted average: {average === null ? "—" : `${average}%`}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="rounded-xl border border-[var(--lc-line)] bg-white/55 px-3 text-sm"
              >
                <option value="">Subject</option>
                {(gradebookQ.data?.subjects ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.labelFr || s.labelAr}
                  </option>
                ))}
              </select>
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                className="rounded-xl border border-[var(--lc-line)] bg-white/55 px-3 text-sm"
              >
                <option value="">Term</option>
                {(gradebookQ.data?.terms ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.labelFr || t.labelAr}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[.12em] text-[var(--lc-muted)]">
                  <th className="border-b border-[var(--lc-line)] px-3 py-3">
                    Student
                  </th>
                  <th className="border-b border-[var(--lc-line)] px-3 py-3">
                    Current
                  </th>
                  <th className="border-b border-[var(--lc-line)] px-3 py-3">
                    New /20
                  </th>
                  <th className="border-b border-[var(--lc-line)] px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(rosterQ.data ?? []).map((student) => {
                  const existing = (gradebookQ.data?.grades ?? []).find(
                    (g) =>
                      g.studentId === student.userId &&
                      (!subjectId || g.subjectId === subjectId) &&
                      (!termId || g.termId === termId),
                  );
                  const key = student.userId;
                  return (
                    <tr key={student.userId}>
                      <td className="border-b border-[var(--lc-line)] px-3 py-3 font-semibold">
                        {student.name}
                      </td>
                      <td className="border-b border-[var(--lc-line)] px-3 py-3 text-[var(--lc-muted)]">
                        {existing
                          ? `${existing.value}/${existing.maxValue}`
                          : "—"}
                      </td>
                      <td className="border-b border-[var(--lc-line)] px-3 py-3">
                        <Input
                          className="w-24"
                          value={drafts[key] ?? ""}
                          onChange={(e) =>
                            setDrafts((v) => ({ ...v, [key]: e.target.value }))
                          }
                          placeholder="score"
                        />
                      </td>
                      <td className="border-b border-[var(--lc-line)] px-3 py-3 text-right">
                        <button
                          disabled={
                            !subjectId ||
                            !termId ||
                            drafts[key] === undefined ||
                            drafts[key] === "" ||
                            gradeMutation.isPending
                          }
                          onClick={() =>
                            gradeMutation.mutate({
                              studentId: student.userId,
                              classId: selectedClass,
                              subjectId,
                              termId,
                              value: Number(drafts[key]),
                              maxValue: 20,
                              coefficient: existing?.coefficient || 1,
                              type: existing?.type || "assessment",
                              comment: null,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--lc-line)] px-3 py-2 text-xs font-bold"
                        >
                          <Save size={14} />
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(!gradebookQ.data?.subjects.length ||
            !gradebookQ.data?.terms.length) && (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--lc-line)] p-4 text-sm text-[var(--lc-muted)]">
              Subjects or academic terms have not been configured for this class
              yet. Create those academic records before entering grades.
            </div>
          )}
        </section>
      )}

      {panel === "submissions" && selectedClass && (
        <section className="liquid-surface p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="lc-eyebrow">Review queue</div>
              <h2 className="mt-1 font-display text-2xl font-bold">
                Student submissions
              </h2>
              <p className="mt-1 text-sm text-[var(--lc-muted)]">
                Read work, record a score and return concise feedback without
                leaving the teaching workspace.
              </p>
            </div>
            <div className="rounded-full border border-[var(--lc-line)] px-3 py-2 text-xs font-bold">
              <FileText size={14} className="mr-2 inline" />
              {(submissionsQ.data ?? []).length} received
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {(submissionsQ.data ?? []).map((submission) => {
              const grade =
                reviewGrades[submission.id] ??
                (submission.gradeValue == null
                  ? ""
                  : String(submission.gradeValue));
              const feedback =
                reviewFeedback[submission.id] ?? submission.feedback ?? "";
              const reviewed =
                submission.status === "reviewed" ||
                submission.status === "returned";
              return (
                <article
                  key={submission.id}
                  className="rounded-2xl border border-[var(--lc-line)] bg-white/25 p-4 md:p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {submission.studentName}
                        </h3>
                        <span className="rounded-full border border-[var(--lc-line)] px-2 py-1 text-[10px] font-bold">
                          {submission.subject}
                        </span>
                        {submission.isLate && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-700">
                            Late
                          </span>
                        )}
                        {reviewed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--lc-accent)]/10 px-2 py-1 text-[10px] font-bold text-[var(--lc-accent)]">
                            <CheckCircle2 size={12} /> Reviewed
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-[var(--lc-muted)]">
                        {submission.assignmentTitle} · submitted{" "}
                        {submission.submittedAt
                          ? new Date(submission.submittedAt).toLocaleString()
                          : "unknown time"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl font-bold">
                        {submission.gradeValue == null
                          ? "—"
                          : `${submission.gradeValue}/${submission.maxScore}`}
                      </div>
                      <div className="text-[11px] text-[var(--lc-muted)]">
                        Max score {submission.maxScore}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-[var(--lc-line)] bg-white/30 p-4">
                    <div className="lc-eyebrow">Student work</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                      {submission.bodyText || "No written submission."}
                    </p>
                    {Array.isArray(submission.files) &&
                      submission.files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {submission.files.map((f, i: number) => (
                            <a
                              key={i}
                              href={f?.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate rounded-xl border border-[var(--lc-line)] px-3 py-2 text-xs font-semibold underline"
                            >
                              {f?.name || f?.url || `File ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-[140px_1fr_auto] lg:items-end">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.12em] text-[var(--lc-muted)]">
                        Score
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={submission.maxScore ?? undefined}
                        value={grade}
                        onChange={(e) =>
                          setReviewGrades((v) => ({
                            ...v,
                            [submission.id]: e.target.value,
                          }))
                        }
                        placeholder={`0–${submission.maxScore}`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.12em] text-[var(--lc-muted)]">
                        Feedback
                      </label>
                      <Input
                        value={feedback}
                        onChange={(e) =>
                          setReviewFeedback((v) => ({
                            ...v,
                            [submission.id]: e.target.value,
                          }))
                        }
                        placeholder="What should the student improve or keep?"
                      />
                    </div>
                    <Button
                      disabled={reviewMutation.isPending}
                      onClick={() =>
                        reviewMutation.mutate({
                          id: submission.id,
                          gradeValue: grade === "" ? null : Number(grade),
                          feedback,
                          status: grade === "" ? "returned" : "reviewed",
                        })
                      }
                      className="rounded-xl bg-[var(--lc-ink)] text-white hover:opacity-90"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {reviewMutation.isPending ? "Saving…" : "Save review"}
                    </Button>
                  </div>
                </article>
              );
            })}
            {(submissionsQ.data ?? []).length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--lc-line)] p-8 text-sm text-[var(--lc-muted)]">
                No student submissions yet. Published assignments will appear
                here once students submit work.
              </div>
            )}
          </div>
        </section>
      )}

      {panel === "schedule" && (
        <section className="liquid-surface p-5 md:p-6">
          <div className="lc-eyebrow">Weekly timetable</div>
          <h2 className="mt-1 font-display text-2xl font-bold">
            Teaching schedule
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(scheduleQ.data ?? []).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--lc-line)] bg-white/25 p-4"
              >
                <div className="flex items-center justify-between text-xs text-[var(--lc-muted)]">
                  <span>Day {item.dayOfWeek}</span>
                  <span>
                    {item.startTime}–{item.endTime}
                  </span>
                </div>
                <div className="mt-3 font-display text-lg font-bold">
                  {item.subject}
                </div>
                <div className="mt-1 text-sm text-[var(--lc-muted)]">
                  {item.classLabel} · {item.room || "Room not assigned"}
                </div>
              </div>
            ))}
            {(scheduleQ.data ?? []).length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--lc-line)] p-6 text-sm text-[var(--lc-muted)]">
                No timetable entries are assigned yet.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="liquid-panel rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[var(--lc-muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

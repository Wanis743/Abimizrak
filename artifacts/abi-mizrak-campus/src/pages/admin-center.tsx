import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  Flag,
  GraduationCap,
  Megaphone,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { PageIntro, LoadingState, ErrorState } from "./shared";
import { supabase } from "@/lib/supabase";

type AdminCounts = Partial<Record<"students" | "teachers" | "classes" | "subjects" | "rooms" | "pendingVerification" | "assignments" | "attendanceRecords" | "grades", number>>;
type AcademicYear = { id: string; labelAr?: string; labelFr?: string; startDate?: string; endDate?: string; status?: string };
type AcademicTerm = { id: string; labelAr?: string; labelFr?: string; order?: number };
type AcademicSubject = { id: string; code?: string; labelAr?: string; labelFr: string };
type AcademicClass = { id: string; label: string; fullLabelFr?: string | null };
type AcademicRoom = { id: string; code: string; labelFr?: string | null; capacity?: number | null };
type AdminOverview = { counts: AdminCounts; activeYear?: AcademicYear | null; terms?: AcademicTerm[] };
type AdminConfig = { years?: AcademicYear[]; terms?: AcademicTerm[]; subjects?: AcademicSubject[]; classes?: AcademicClass[]; rooms?: AcademicRoom[] };
type StaffPerson = { userId: string; name: string; email?: string | null; departmentId?: string | null; classId?: string | null };
type AdminStaff = { teachers?: StaffPerson[]; students?: StaffPerson[] };
type MemberDraft = { role: string; membershipStatus: string; roleStatus: string; note: string };
type CampusMember = MemberDraft & { userId: string; name: string; email: string; verified: boolean; requestedRole?: string | null };
type CampusEvent = { id: string; title: string; startTime: string; location?: string | null };
type ModerationReport = { id: string; status: string; targetType: string; targetId: string; reason: string; details?: string | null; createdAt: string };
type TimetableEntry = { id: string; dayOfWeek: number; startTime: string; endTime: string; classId: string; classLabel?: string | null; subjectId: string; subject?: string | null; teacherId: string; roomId?: string | null; room?: string | null };
type AttendanceSummary = { summary: Record<string, number>; records: Array<{ id: string; date: string; studentId: string; classId: string; status: string; period: number }> };
type AuditRow = { id: string; action: string; created_at: string; user_id: string; actor_user_id: string; note?: string | null };
type FacilityIssue = { id: string; roomId: string; reporterId: string; title: string; description: string; status: string; assigneeId?: string | null; resolution?: string | null; createdAt: string };
type ActionBody = Record<string, unknown> | object;

type Tab =
  | "overview"
  | "academic"
  | "people"
  | "timetable"
  | "attendance"
  | "communications"
  | "facilities"
  | "moderation"
  | "audit";
const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
      ...(init?.headers || {}),
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Request failed (" + response.status + ")");
  return body as T;
};

export function AdminCenterPage() {
  const [data, setData] = useState<AdminOverview | null>(null),
    [config, setConfig] = useState<AdminConfig | null>(null),
    [staff, setStaff] = useState<AdminStaff | null>(null);
  const [tab, setTab] = useState<Tab>("overview"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [year, setYear] = useState({
    labelAr: "2026 / 2027",
    labelFr: "2026 / 2027",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
  });
  const [term, setTerm] = useState({
    academicYearId: "",
    labelAr: "الفصل الأول",
    labelFr: "Premier trimestre",
    order: 1,
    startDate: "2026-09-01",
    endDate: "2026-12-20",
  });
  const [subject, setSubject] = useState({
    code: "",
    labelAr: "",
    labelFr: "",
  });
  const [classForm, setClassForm] = useState({
    academicYearId: "",
    levelCode: "2AS",
    section: "A",
    label: "2AS A",
  });
  const [studentClass, setStudentClass] = useState<Record<string, string>>({});

  const refresh = async () => {
    const [a, c] = await Promise.all([
      api<AdminOverview>("/admin/overview"),
      api<AdminConfig>("/admin/academic"),
    ]);
    setData(a);
    setConfig(c);
    setTerm((v) => ({
      ...v,
      academicYearId: a.activeYear?.id || v.academicYearId,
    }));
    setClassForm((v) => ({
      ...v,
      academicYearId: a.activeYear?.id || v.academicYearId,
    }));
  };
  useEffect(() => {
    Promise.all([refresh(), api<AdminStaff>("/admin/staff")])
      .then(([, s]) => setStaff(s))
      .catch((error: unknown) => setError(error instanceof Error ? error.message : "Unable to load administration data"));
  }, []);
  const act = async (path: string, body: ActionBody, method = "POST") => {
    setBusy(true);
    setError("");
    try {
      await api<unknown>(path, { method, body: JSON.stringify(body) });
      await refresh();
      if (path.startsWith("/admin/staff")) setStaff(await api<AdminStaff>("/admin/staff"));
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "The administration action failed");
    } finally {
      setBusy(false);
    }
  };
  const counts = data?.counts || {};
  const activeYear = data?.activeYear;
  const completion = useMemo(() => {
    const v = [
      config?.years?.length,
      config?.terms?.length,
      config?.subjects?.length,
      config?.classes?.length,
      config?.rooms?.length,
    ];
    return Math.round((v.filter(Boolean).length / 5) * 100);
  }, [config]);
  if (error && !data) return <ErrorState onRetry={() => location.reload()} />;
  if (!data) return <LoadingState label="Loading administration console" />;
  return (
    <div className="reveal mx-auto max-w-7xl pb-12">
      <PageIntro
        eyebrow="Administration / operations"
        title="Run the lycée as a system."
        detail="Academic structure, people, timetable, attendance and trust are controlled here. Permissions remain enforced by the server."
      />
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {([
          [
            "People",
            (counts.students || 0) + (counts.teachers || 0),
            UsersRound,
          ],
          ["Classes", counts.classes, GraduationCap],
          ["Subjects", counts.subjects, BookOpen],
          ["Rooms", counts.rooms, Building2],
          ["Pending", counts.pendingVerification, ShieldCheck],
        ] satisfies Array<[string, number | undefined, LucideIcon]>).map(([label, value, Icon]) => (
          <div key={label} className="liquid-surface rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="lc-eyebrow">{label}</span>
              <Icon size={16} className="text-[var(--lc-accent)]" />
            </div>
            <div className="mt-3 font-display text-2xl font-bold">
              {value ?? 0}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            "overview",
            "academic",
            "people",
            "timetable",
            "attendance",
            "communications",
            "facilities",
            "moderation",
            "audit",
          ] as Tab[]
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${tab === t ? "bg-[var(--lc-ink)] text-white" : "border border-[var(--lc-line)] bg-white/25 text-[var(--lc-muted)]"}`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <Link
          href="/admin/verification"
          className="ml-auto rounded-full border border-[var(--lc-line)] px-4 py-2 text-xs font-bold"
        >
          Verification desk
        </Link>
      </div>

      {tab === "overview" && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <section className="liquid-surface p-6">
            <div className="lc-eyebrow">Academic state</div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-bold">
                {activeYear?.labelFr || "No active academic year"}
              </h2>
              {activeYear && (
                <span className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase">
                  {activeYear.status}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--lc-muted)]">
              {activeYear
                ? `${activeYear.startDate ? new Date(activeYear.startDate).toLocaleDateString() : "Start not set"} → ${activeYear.endDate ? new Date(activeYear.endDate).toLocaleDateString() : "End not set"}`
                : "Create an academic year to unlock the control plane."}
            </p>
            {activeYear?.status !== "active" && activeYear && (
              <button
                disabled={busy}
                onClick={() =>
                  act(
                    `/admin/academic/years/${activeYear.id}`,
                    { status: "active" },
                    "PATCH",
                  )
                }
                className="lc-primary-button mt-4"
              >
                <Check size={15} />
                Activate this year
              </button>
            )}
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/5">
              <div
                className="h-full rounded-full bg-[var(--lc-accent)]"
                style={{ width: `${completion}%` }}
              />
            </div>
            <div className="mt-2 text-xs font-bold text-[var(--lc-muted)]">
              Configuration completeness {completion}%
            </div>
          </section>
          <section className="liquid-surface p-6">
            <div className="lc-eyebrow">Operational volume</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Assignments", counts.assignments],
                ["Attendance records", counts.attendanceRecords],
                ["Grades", counts.grades],
                ["Academic terms", data.terms?.length || 0],
              ].map(([label, value]) => (
                <div className="liquid-panel rounded-2xl p-4" key={label}>
                  <div className="text-xs text-[var(--lc-muted)]">{label}</div>
                  <div className="mt-1 font-display text-xl font-bold">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "academic" && (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="liquid-surface p-6">
            <div className="lc-eyebrow">Academic year</div>
            <h2 className="font-display text-xl font-bold">
              Create school year
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["labelAr", "Arabic label"],
                ["labelFr", "French label"],
              ].map(([k, p]) => (
                <input
                  key={k}
                  className="lc-input"
                  placeholder={p}
                  value={year[k as "labelAr" | "labelFr"]}
                  onChange={(e) => setYear({ ...year, [k]: e.target.value })}
                />
              ))}
              <input
                className="lc-input"
                type="date"
                value={year.startDate}
                onChange={(e) =>
                  setYear({ ...year, startDate: e.target.value })
                }
              />
              <input
                className="lc-input"
                type="date"
                value={year.endDate}
                onChange={(e) => setYear({ ...year, endDate: e.target.value })}
              />
            </div>
            <button
              disabled={busy}
              onClick={() => act("/admin/academic/years", year)}
              className="lc-primary-button mt-4"
            >
              <Plus size={15} />
              Create year
            </button>
          </section>
          <section className="liquid-surface p-6">
            <div className="lc-eyebrow">Term</div>
            <h2 className="font-display text-xl font-bold">
              Add academic term
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select
                className="lc-input"
                value={term.academicYearId}
                onChange={(e) =>
                  setTerm({ ...term, academicYearId: e.target.value })
                }
              >
                {(config?.years || []).map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.labelFr}
                  </option>
                ))}
              </select>
              <input
                className="lc-input"
                placeholder="French label"
                value={term.labelFr}
                onChange={(e) => setTerm({ ...term, labelFr: e.target.value })}
              />
              <input
                className="lc-input"
                placeholder="Arabic label"
                value={term.labelAr}
                onChange={(e) => setTerm({ ...term, labelAr: e.target.value })}
              />
              <input
                className="lc-input"
                type="number"
                min="1"
                value={term.order}
                onChange={(e) =>
                  setTerm({ ...term, order: Number(e.target.value) })
                }
              />
              <input
                className="lc-input"
                type="date"
                value={term.startDate}
                onChange={(e) =>
                  setTerm({ ...term, startDate: e.target.value })
                }
              />
              <input
                className="lc-input"
                type="date"
                value={term.endDate}
                onChange={(e) => setTerm({ ...term, endDate: e.target.value })}
              />
            </div>
            <button
              disabled={busy}
              onClick={() => act("/admin/academic/terms", term)}
              className="lc-primary-button mt-4"
            >
              <Plus size={15} />
              Create term
            </button>
          </section>
          <section className="liquid-surface p-6">
            <div className="lc-eyebrow">Subjects</div>
            <h2 className="font-display text-xl font-bold">Subject registry</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                className="lc-input"
                placeholder="Code"
                value={subject.code}
                onChange={(e) =>
                  setSubject({ ...subject, code: e.target.value })
                }
              />
              <input
                className="lc-input"
                placeholder="Arabic"
                value={subject.labelAr}
                onChange={(e) =>
                  setSubject({ ...subject, labelAr: e.target.value })
                }
              />
              <input
                className="lc-input"
                placeholder="Français"
                value={subject.labelFr}
                onChange={(e) =>
                  setSubject({ ...subject, labelFr: e.target.value })
                }
              />
            </div>
            <button
              disabled={busy}
              onClick={() => act("/admin/academic/subjects", subject)}
              className="lc-primary-button mt-4"
            >
              <Plus size={15} />
              Add subject
            </button>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {(config?.subjects || []).slice(0, 12).map((s) => (
                <div key={s.id} className="liquid-panel rounded-xl p-3">
                  <div className="font-semibold">{s.labelFr}</div>
                  <div className="text-xs text-[var(--lc-muted)]">
                    {s.code} · {s.labelAr}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="liquid-surface p-6">
            <div className="lc-eyebrow">Classes</div>
            <h2 className="font-display text-xl font-bold">
              Create class cohorts
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <select
                className="lc-input"
                value={classForm.academicYearId}
                onChange={(e) =>
                  setClassForm({ ...classForm, academicYearId: e.target.value })
                }
              >
                {(config?.years || []).map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.labelFr}
                  </option>
                ))}
              </select>
              <input
                className="lc-input"
                value={classForm.levelCode}
                onChange={(e) =>
                  setClassForm({ ...classForm, levelCode: e.target.value })
                }
                placeholder="Level"
              />
              <input
                className="lc-input"
                value={classForm.section}
                onChange={(e) =>
                  setClassForm({ ...classForm, section: e.target.value })
                }
                placeholder="Section"
              />
              <input
                className="lc-input"
                value={classForm.label}
                onChange={(e) =>
                  setClassForm({ ...classForm, label: e.target.value })
                }
                placeholder="Label"
              />
            </div>
            <button
              disabled={busy}
              onClick={() => act("/admin/academic/classes", classForm)}
              className="lc-primary-button mt-4"
            >
              <Plus size={15} />
              Create class
            </button>
          </section>
          <section className="liquid-surface p-6 xl:col-span-2">
            <div className="lc-eyebrow">Facilities</div>
            <h2 className="font-display text-xl font-bold">
              Rooms & teaching capacity
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <input
                id="room-code"
                className="lc-input"
                placeholder="Room code"
              />
              <input id="room-label" className="lc-input" placeholder="Label" />
              <input
                id="room-building"
                className="lc-input"
                placeholder="Building"
              />
              <input
                id="room-capacity"
                className="lc-input"
                type="number"
                defaultValue="30"
                placeholder="Capacity"
              />
            </div>
            <button
              disabled={busy}
              onClick={() => {
                const g = (id: string) =>
                  document.getElementById(id) as HTMLInputElement;
                void act("/admin/academic/rooms", {
                  code: g("room-code")?.value.trim(),
                  labelFr: g("room-label")?.value.trim(),
                  building: g("room-building")?.value.trim(),
                  capacity: Number(g("room-capacity")?.value || 30),
                });
              }}
              className="lc-primary-button mt-4"
            >
              <Plus size={15} />
              Add room
            </button>
            <div className="mt-5 grid gap-2 md:grid-cols-3">
              {(config?.rooms || []).map((r) => (
                <div key={r.id} className="liquid-panel rounded-xl p-3">
                  <div className="font-semibold">{r.code}</div>
                  <div className="text-xs text-[var(--lc-muted)]">
                    {r.labelFr || "Room"} · {r.capacity ?? 0} seats
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "communications" && <AdminCommunications config={config} />}
      {tab === "facilities" && <FacilitiesAdmin staff={staff} />}
      {tab === "moderation" && <AdminModeration />}
      {tab === "people" && (
        <PeopleAdmin
          staff={staff}
          config={config}
          studentClass={studentClass}
          setStudentClass={setStudentClass}
          busy={busy}
          act={act}
        />
      )}
      {tab === "timetable" && (
        <TimetableAdmin config={config} staff={staff} busy={busy} act={act} />
      )}
      {tab === "attendance" && <AttendanceAdmin />}
      {tab === "audit" && <AuditAdmin />}
    </div>
  );
}

function FacilitiesAdmin({ staff }: { staff: AdminStaff | null }) {
  const [issues, setIssues] = useState<FacilityIssue[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { assigneeId: string; resolution: string; note: string }>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const load = () => api<FacilityIssue[]>("/campus/admin/facilities/issues").then(setIssues);
  useEffect(() => { void load().catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load facility issues")); }, []);
  const advance = async (issue: FacilityIssue) => {
    const next: Record<string, string | undefined> = { reported: "assigned", assigned: "in_progress", in_progress: "resolved", resolved: "closed" };
    const status = next[issue.status];
    if (!status) return;
    const draft = drafts[issue.id] ?? { assigneeId: issue.assigneeId ?? "", resolution: issue.resolution ?? "", note: "" };
    setBusyId(issue.id);
    setError("");
    try {
      await api(`/campus/admin/facilities/issues/${encodeURIComponent(issue.id)}`, { method: "PATCH", body: JSON.stringify({ status, ...draft }) });
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unable to update facility issue"); }
    finally { setBusyId(""); }
  };
  return (
    <section className="mt-5 liquid-surface p-6">
      <div className="lc-eyebrow">Facilities operations</div>
      <h2 className="mt-1 font-display text-2xl font-bold">Issue assignment and resolution</h2>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      <div className="mt-5 space-y-3">
        {issues.map((issue) => {
          const draft = drafts[issue.id] ?? { assigneeId: issue.assigneeId ?? "", resolution: issue.resolution ?? "", note: "" };
          const next = ({ reported: "Assign", assigned: "Start work", in_progress: "Resolve", resolved: "Close" } as Record<string, string>)[issue.status];
          return <div key={issue.id} className="liquid-panel rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{issue.title}</div><div className="mt-1 text-xs text-[var(--lc-muted)]">Room {issue.roomId} · reporter {issue.reporterId}</div></div><span className="rounded-full border px-3 py-1 text-xs font-bold">{issue.status.replace("_", " ")}</span></div>
            <p className="mt-3 text-sm text-[var(--lc-muted)]">{issue.description}</p>
            {next && <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select className="lc-input" value={draft.assigneeId} onChange={(e) => setDrafts((v) => ({ ...v, [issue.id]: { ...draft, assigneeId: e.target.value } }))}><option value="">Select assignee</option>{(staff?.teachers || []).map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select>
              <input className="lc-input" placeholder={issue.status === "in_progress" ? "Resolution (required)" : "Operational note"} value={issue.status === "in_progress" ? draft.resolution : draft.note} onChange={(e) => setDrafts((v) => ({ ...v, [issue.id]: { ...draft, [issue.status === "in_progress" ? "resolution" : "note"]: e.target.value } }))} />
              <button className="lc-primary-button justify-center" disabled={busyId === issue.id || (issue.status === "reported" && !draft.assigneeId) || (issue.status === "in_progress" && !draft.resolution.trim())} onClick={() => void advance(issue)}>{busyId === issue.id ? "Updating…" : next}</button>
            </div>}
          </div>;
        })}
        {!issues.length && !error && <Empty text="No facility issues have been reported." />}
      </div>
    </section>
  );
}

function PeopleAdmin({
  staff,
  config,
  studentClass,
  setStudentClass,
  busy,
  act,
}: {
  staff: AdminStaff | null;
  config: AdminConfig | null;
  studentClass: Record<string, string>;
  setStudentClass: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  busy: boolean;
  act: (path: string, body: ActionBody, method?: string) => Promise<void>;
}) {
  const [members, setMembers] = useState<CampusMember[]>([]);
  const [memberDraft, setMemberDraft] = useState<Record<string, MemberDraft>>({});
  useEffect(() => {
    api<CampusMember[]>("/admin/members")
      .then(setMembers)
      .catch(() => {});
  }, []);
  const saveMember = async (userId: string) => {
    const draft = memberDraft[userId];
    if (!draft) return;
    await act(`/admin/members/${encodeURIComponent(userId)}`, draft, "PATCH");
    setMembers(await api<CampusMember[]>("/admin/members"));
  };
  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      <div className="liquid-surface p-6">
        <div className="lc-eyebrow">Teaching staff</div>
        <h2 className="mt-1 font-display text-2xl font-bold">
          Teaching roster
        </h2>
        <div className="mt-5 space-y-2">
          {(staff?.teachers || []).slice(0, 80).map((t) => (
            <div key={t.userId} className="liquid-panel rounded-2xl p-4">
              <div className="font-semibold">{t.name}</div>
              <div className="mt-1 text-xs text-[var(--lc-muted)]">
                {t.email || "No email"}
                {t.departmentId ? ` · ${t.departmentId}` : ""}
              </div>
            </div>
          ))}
          {!(staff?.teachers || []).length && (
            <Empty text="No teacher profiles are registered yet." />
          )}
        </div>
      </div>
      <div className="liquid-surface p-6">
        <div className="lc-eyebrow">Campus members</div>
        <h2 className="mt-1 font-display text-2xl font-bold">
          Role, verification & class control
        </h2>
        <div className="mt-5 space-y-2">
          {members.map((m) => {
            const d = memberDraft[m.userId] ?? {
              role: m.role,
              membershipStatus: m.membershipStatus,
              roleStatus: m.roleStatus,
              note: "",
            };
            return (
              <div key={m.userId} className="liquid-panel rounded-2xl p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{m.name}</div>
                    <div className="text-xs text-[var(--lc-muted)] truncate">
                      {m.email} · {m.userId}
                    </div>
                  </div>
                  <select
                    className="lc-input xl:w-32"
                    value={d.role}
                    onChange={(e) =>
                      setMemberDraft((v) => ({
                        ...v,
                        [m.userId]: { ...d, role: e.target.value },
                      }))
                    }
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="staff">Staff</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    className="lc-input xl:w-32"
                    value={d.membershipStatus}
                    onChange={(e) =>
                      setMemberDraft((v) => ({
                        ...v,
                        [m.userId]: { ...d, membershipStatus: e.target.value },
                      }))
                    }
                  >
                    <option>pending</option>
                    <option>approved</option>
                    <option>suspended</option>
                    <option>expired</option>
                  </select>
                  <select
                    className="lc-input xl:w-32"
                    value={d.roleStatus}
                    onChange={(e) =>
                      setMemberDraft((v) => ({
                        ...v,
                        [m.userId]: { ...d, roleStatus: e.target.value },
                      }))
                    }
                  >
                    <option>pending</option>
                    <option>approved</option>
                    <option>suspended</option>
                    <option>expired</option>
                  </select>
                  <button
                    disabled={busy}
                    onClick={() => saveMember(m.userId)}
                    className="rounded-xl border px-3 py-2 text-xs font-bold"
                  >
                    <Check size={14} />
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-[var(--lc-muted)]">
                  {m.verified ? "Verified" : "Not verified"} · requested role{" "}
                  {m.requestedRole}
                </div>
              </div>
            );
          })}
          {!members.length && <Empty text="No campus members yet." />}
        </div>
      </div>
      <div className="liquid-surface p-6 xl:col-span-2">
        <div className="lc-eyebrow">Student placement</div>
        <h2 className="mt-1 font-display text-2xl font-bold">
          Class placement
        </h2>
        <div className="mt-5 space-y-2">
          {(staff?.students || []).slice(0, 120).map((s) => (
            <div key={s.userId} className="liquid-panel rounded-2xl p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-[var(--lc-muted)]">
                    {s.email || "No email"}
                  </div>
                </div>
                <select
                  className="lc-input md:w-56"
                  value={studentClass[s.userId] ?? s.classId ?? ""}
                  onChange={(e) =>
                    setStudentClass((v) => ({
                      ...v,
                      [s.userId]: e.target.value,
                    }))
                  }
                >
                  <option value="">Unassigned</option>
                  {(config?.classes || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullLabelFr || c.label}
                    </option>
                  ))}
                </select>
                <button
                  disabled={busy || studentClass[s.userId] === undefined}
                  onClick={() =>
                    act(
                      `/admin/staff/students/${encodeURIComponent(s.userId)}`,
                      { classId: studentClass[s.userId] || null },
                      "PATCH",
                    )
                  }
                  className="rounded-xl border px-3 py-2 text-xs font-bold"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminCommunications({ config }: { config: AdminConfig | null }) {
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  const [event, setEvent] = useState({
    spaceId: "school-main",
    title: "",
    description: "",
    location: "",
    startTime: "",
    endTime: "",
  });
  const [events, setEvents] = useState<CampusEvent[]>([]);
  useEffect(() => {
    api<CampusEvent[]>("/admin/events")
      .then(setEvents)
      .catch(() => {});
  }, []);
  const send = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ delivered: number }>("/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          kind: "announcement",
          targetUrl: "/activity",
        }),
      });
      setMsg(`Delivered to ${r.delivered} approved members.`);
      setTitle("");
      setBody("");
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "Unable to send the broadcast");
    } finally {
      setBusy(false);
    }
  };
  const createEvent = async () => {
    setBusy(true);
    setMsg("");
    try {
      await api<CampusEvent>("/admin/events", {
        method: "POST",
        body: JSON.stringify(event),
      });
      setEvents(await api<CampusEvent[]>("/admin/events"));
      setEvent((v) => ({
        ...v,
        title: "",
        description: "",
        location: "",
        startTime: "",
        endTime: "",
      }));
      setMsg("Event published and members notified.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Unable to publish the event");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-2">
      <div className="liquid-surface p-6">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-[var(--lc-accent)]" />
          <div>
            <div className="lc-eyebrow">Broadcast</div>
            <h2 className="mt-1 font-display text-2xl font-bold">
              Campus announcement
            </h2>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <input
            className="lc-input"
            placeholder="Announcement title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="lc-input min-h-36"
            placeholder="Write the message for the school…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            disabled={busy || !title.trim() || !body.trim()}
            onClick={send}
            className="lc-primary-button"
          >
            <Megaphone size={15} />
            {busy ? "Sending…" : "Send to approved members"}
          </button>
          {msg && <div className="text-sm text-[var(--lc-muted)]">{msg}</div>}
        </div>
      </div>
      <div className="liquid-surface p-6">
        <div className="lc-eyebrow">Events</div>
        <h2 className="mt-1 font-display text-2xl font-bold">
          Publish campus event
        </h2>
        <div className="mt-5 grid gap-3">
          <input
            className="lc-input"
            placeholder="Space ID"
            value={event.spaceId}
            onChange={(e) => setEvent({ ...event, spaceId: e.target.value })}
          />
          <input
            className="lc-input"
            placeholder="Title"
            value={event.title}
            onChange={(e) => setEvent({ ...event, title: e.target.value })}
          />
          <input
            className="lc-input"
            placeholder="Location"
            value={event.location}
            onChange={(e) => setEvent({ ...event, location: e.target.value })}
          />
          <textarea
            className="lc-input min-h-24"
            placeholder="Description"
            value={event.description}
            onChange={(e) =>
              setEvent({ ...event, description: e.target.value })
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="lc-input"
              type="datetime-local"
              value={event.startTime}
              onChange={(e) =>
                setEvent({ ...event, startTime: e.target.value })
              }
            />
            <input
              className="lc-input"
              type="datetime-local"
              value={event.endTime}
              onChange={(e) => setEvent({ ...event, endTime: e.target.value })}
            />
          </div>
          <button
            disabled={
              busy || !event.title || !event.startTime || !event.endTime
            }
            onClick={createEvent}
            className="lc-primary-button"
          >
            <CalendarDays size={15} />
            {busy ? "Publishing…" : "Publish event"}
          </button>
        </div>
        <div className="mt-6 space-y-2">
          {events.slice(0, 8).map((e) => (
            <div key={e.id} className="liquid-panel rounded-xl p-3">
              <div className="font-semibold">{e.title}</div>
              <div className="text-xs text-[var(--lc-muted)]">
                {new Date(e.startTime).toLocaleString()} · {e.location}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminModeration() {
  const [rows, setRows] = useState<ModerationReport[]>([]);
  const [busy, setBusy] = useState(false);
  const load = () =>
    api<ModerationReport[]>("/admin/moderation")
      .then(setRows)
      .catch(() => setRows([]));
  useEffect(() => {
    void load();
  }, []);
  const update = async (id: string, status: string) => {
    setBusy(true);
    try {
      await api(`/admin/moderation/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          resolution:
            status === "resolved"
              ? "Reviewed by administration."
              : status === "dismissed"
                ? "Report dismissed."
                : null,
        }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-5 liquid-surface p-6">
      <div className="flex items-center gap-2">
        <Flag size={16} className="text-[var(--lc-accent)]" />
        <div>
          <div className="lc-eyebrow">Safety & governance</div>
          <h2 className="mt-1 font-display text-2xl font-bold">
            Moderation queue
          </h2>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="liquid-panel rounded-2xl p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase">
                    {r.status}
                  </span>
                  <span className="rounded-full border px-2 py-1 text-[10px] font-bold">
                    {r.targetType}
                  </span>
                </div>
                <div className="mt-2 font-semibold">{r.reason}</div>
                <div className="mt-1 text-xs text-[var(--lc-muted)]">
                  Target {r.targetId} · reported{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </div>
                {r.details && <p className="mt-2 text-sm">{r.details}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy}
                  onClick={() => update(r.id, "reviewing")}
                  className="rounded-xl border px-3 py-2 text-xs font-bold"
                >
                  Review
                </button>
                <button
                  disabled={busy}
                  onClick={() => update(r.id, "resolved")}
                  className="rounded-xl bg-[var(--lc-ink)] px-3 py-2 text-xs font-bold text-white"
                >
                  Resolve
                </button>
                <button
                  disabled={busy}
                  onClick={() => update(r.id, "dismissed")}
                  className="rounded-xl border px-3 py-2 text-xs font-bold"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
        {!rows.length && <Empty text="No moderation reports are waiting." />}
      </div>
    </section>
  );
}

function TimetableAdmin({ config, staff, busy, act }: { config: AdminConfig | null; staff: AdminStaff | null; busy: boolean; act: (path: string, body: ActionBody, method?: string) => Promise<void> }) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [form, setForm] = useState({
    classId: "",
    subjectId: "",
    teacherId: "",
    roomId: "",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "09:00",
    recurrence: "weekly",
  });
  const load = () =>
    api(`/academic/timetable`)
      .then(setEntries)
      .catch(() => setEntries([]));
  useEffect(() => {
    void load();
  }, []);
  const save = async () => {
    try {
      await act("/academic/timetable", form);
      await load();
    } catch {}
  };
  return (
    <section className="mt-5 liquid-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="lc-eyebrow">Scheduling</div>
          <h2 className="mt-1 font-display text-2xl font-bold">
            Build the weekly timetable
          </h2>
          <p className="mt-2 text-sm text-[var(--lc-muted)]">
            Conflicts are rejected for the class, teacher and room.
          </p>
        </div>
        <CalendarDays className="text-[var(--lc-accent)]" />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-4 lg:grid-cols-7">
        <select
          className="lc-input"
          value={form.classId}
          onChange={(e) => setForm({ ...form, classId: e.target.value })}
        >
          <option value="">Class</option>
          {(config?.classes || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullLabelFr || c.label}
            </option>
          ))}
        </select>
        <select
          className="lc-input"
          value={form.subjectId}
          onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
        >
          <option value="">Subject</option>
          {(config?.subjects || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.labelFr}
            </option>
          ))}
        </select>
        <select
          className="lc-input"
          value={form.teacherId}
          onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
        >
          <option value="">Teacher</option>
          {(staff?.teachers || []).map((t) => (
            <option key={t.userId} value={t.userId}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="lc-input"
          value={form.roomId}
          onChange={(e) => setForm({ ...form, roomId: e.target.value })}
        >
          <option value="">No room</option>
          {(config?.rooms || []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.code}
            </option>
          ))}
        </select>
        <select
          className="lc-input"
          value={form.dayOfWeek}
          onChange={(e) =>
            setForm({ ...form, dayOfWeek: Number(e.target.value) })
          }
        >
          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].map((d, i) => (
            <option key={d} value={i + 1}>
              {d}
            </option>
          ))}
        </select>
        <input
          className="lc-input"
          type="time"
          value={form.startTime}
          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
        />
        <input
          className="lc-input"
          type="time"
          value={form.endTime}
          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
        />
      </div>
      <button
        disabled={busy || !form.classId || !form.subjectId || !form.teacherId}
        onClick={save}
        className="lc-primary-button mt-4"
      >
        <Plus size={15} />
        Add timetable entry
      </button>
      <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-[var(--lc-line)] text-left text-xs uppercase tracking-wider text-[var(--lc-muted)]">
              <th className="px-3 py-3">Day</th>
              <th>Time</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Room</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-[var(--lc-line)]">
                <td className="px-3 py-3">
                  {
                    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                      e.dayOfWeek - 1
                    ]
                  }
                </td>
                <td>
                  {e.startTime}–{e.endTime}
                </td>
                <td>{e.classLabel || e.classId}</td>
                <td>{e.subject || e.subjectId}</td>
                <td>
                  {(staff?.teachers || []).find(
                    (t) => t.userId === e.teacherId,
                  )?.name || e.teacherId}
                </td>
                <td>{e.room || e.roomId || "—"}</td>
              </tr>
            ))}
            {!entries.length && (
              <tr>
                <td colSpan={6}>
                  <Empty text="No timetable entries yet." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AttendanceAdmin() {
  const [data, setData] = useState<AttendanceSummary | null>(null);
  useEffect(() => {
    api<AttendanceSummary>("/admin/attendance/summary")
      .then(setData)
      .catch(() => {});
  }, []);
  if (!data) return <LoadingState label="Loading attendance intelligence" />;
  return (
    <section className="mt-5 liquid-surface p-6">
      <div className="lc-eyebrow">Attendance intelligence</div>
      <h2 className="font-display text-2xl font-bold">School-wide roll call</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Object.entries(data.summary).map(([k, v]) => (
          <div className="liquid-panel rounded-2xl p-4" key={k}>
            <div className="text-xs uppercase tracking-wider text-[var(--lc-muted)]">
              {k}
            </div>
            <div className="mt-1 font-display text-2xl font-bold">
              {String(v)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[var(--lc-muted)]">
              <th className="px-3 py-3">Date</th>
              <th>Student</th>
              <th>Class</th>
              <th>Status</th>
              <th>Period</th>
            </tr>
          </thead>
          <tbody>
            {data.records.slice(0, 50).map((r) => (
              <tr key={r.id} className="border-t border-[var(--lc-line)]">
                <td className="px-3 py-3">
                  {new Date(r.date).toLocaleDateString()}
                </td>
                <td>{r.studentId}</td>
                <td>{r.classId}</td>
                <td className="capitalize">{r.status}</td>
                <td>{r.period}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function AuditAdmin() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  useEffect(() => {
    api<AuditRow[]>("/admin/audit")
      .then(setRows)
      .catch(() => {});
  }, []);
  return (
    <section className="mt-5 liquid-surface p-6">
      <div className="lc-eyebrow">Governance</div>
      <h2 className="font-display text-2xl font-bold">
        Verification audit trail
      </h2>
      <div className="mt-5 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="liquid-panel rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold capitalize">{r.action}</span>
              <span className="text-xs text-[var(--lc-muted)]">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            <div className="mt-1 text-xs text-[var(--lc-muted)]">
              User {r.user_id} · Actor {r.actor_user_id}
            </div>
            {r.note && <div className="mt-2 text-sm">{r.note}</div>}
          </div>
        ))}
        {!rows.length && <Empty text="No verification events recorded yet." />}
      </div>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--lc-line)] p-6 text-sm text-[var(--lc-muted)]">
      {text}
    </div>
  );
}

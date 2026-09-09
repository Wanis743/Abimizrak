import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CalendarClock, ClipboardCheck, FileUp, Gauge, GraduationCap, RefreshCw, Send, CheckCircle2, BarChart3, History } from 'lucide-react';
import { customFetch } from '@workspace/api-client-react';
import { PageIntro, EmptyState, LoadingState, ErrorState } from './shared';

type AcademicOverview = {
  classId: string | null;
  schedule: Array<{ id: string; subject: string; subjectCode: string; room: string; startTime: string; endTime: string }>;
  assignments: Array<{ id: string; titleAr?: string | null; titleFr?: string | null; descriptionAr?: string | null; descriptionFr?: string | null; dueDate: string; maxScore: number }>;
  attendanceRate: number | null;
  averagePercent: number | null;
  recentGrades: Array<{ id: string; subject: string; value: number; maxValue: number; coefficient: number; type: string; gradedAt: string }>;
};

type GradeGroup = { term: { id: string; label: string; order: number } | null; grades: Array<{ id: string; subject: string; value: number; maxValue: number; coefficient: number; type: string; comment?: string | null; gradedAt: string }> };
type AttendanceData = { rate: number | null; records: Array<{ id: string; date: string; period: number; status: string; note?: string | null; subjectId: string; classId: string }> };

export function AcademicPage() {
  const [data, setData] = useState<AcademicOverview | null>(null);
  const [gradeGroups, setGradeGroups] = useState<GradeGroup[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [studentAssignments, setStudentAssignments] = useState<any[]>([]);
  const [openAssignment, setOpenAssignment] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [fileLink, setFileLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [view, setView] = useState<'overview' | 'assignments' | 'grades' | 'attendance' | 'timetable'>('overview');

  const load = async () => {
    setLoading(true); setFailed(false);
    try {
      const [overview, assignments, grades, attendanceData] = await Promise.all([
        customFetch<AcademicOverview>('/api/academic/overview'),
        customFetch<any[]>('/api/academic/student/assignments'),
        customFetch<GradeGroup[]>('/api/academic/student/grades'),
        customFetch<AttendanceData>('/api/academic/student/attendance'),
      ]);
      setData(overview); setStudentAssignments(assignments); setGradeGroups(grades); setAttendance(attendanceData);
    } catch { setFailed(true); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const upcoming = useMemo(() => (data?.assignments ?? []).slice().sort((a,b) => +new Date(a.dueDate) - +new Date(b.dueDate)).slice(0, 4), [data]);
  const gradeCount = useMemo(() => gradeGroups.reduce((n,g)=>n+g.grades.length,0), [gradeGroups]);
  const attendanceCounts = useMemo(() => {
    const rows = attendance?.records ?? [];
    return { present: rows.filter(r=>r.status==='present').length, late: rows.filter(r=>r.status==='late').length, absent: rows.filter(r=>r.status==='absent').length, excused: rows.filter(r=>r.status==='excused').length };
  }, [attendance]);

  if (loading) return <LoadingState label="Loading your academic workspace" />;
  if (failed || !data) return <ErrorState onRetry={() => void load()} label="Your academic workspace could not be loaded" />;

  return <div className="reveal space-y-7">
    <PageIntro eyebrow="Academics" title="Your school, organized around the day." detail="Schedule, work, attendance and grades in one academic layer — separate from the social campus so the important things stay precise." />
    <div className="flex flex-wrap gap-2">
      {([['overview','Overview'],['assignments','Assignments'],['grades','Grades'],['attendance','Attendance'],['timetable','Timetable']] as const).map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${view===key?'bg-[var(--lc-ink)] text-white':'border border-[var(--lc-line)] bg-white/30 text-[var(--lc-muted)]'}`}>{label}</button>)}
      <button onClick={()=>void load()} className="lc-icon-button ml-auto" aria-label="Refresh academic data"><RefreshCw size={16}/></button>
    </div>

    {(view==='overview'||view==='timetable')&&<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric icon={GraduationCap} label="Class" value={data.classId ?? 'Not assigned'} detail="Current academic group" />
      <Metric icon={Gauge} label="Average" value={data.averagePercent == null ? '—' : `${data.averagePercent}%`} detail="Weighted visible grades" />
      <Metric icon={ClipboardCheck} label="Attendance" value={attendance?.rate == null ? '—' : `${attendance.rate}%`} detail="Recorded sessions" />
      <Metric icon={BookOpenCheck} label="Open work" value={String(upcoming.length)} detail="Upcoming assignments" />
    </div>}

    {(view==='overview'||view==='timetable')&&<section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <div className="liquid-surface crystal rounded-[28px] p-5 md:p-7">
        <div className="flex items-end justify-between gap-3"><div><div className="lc-eyebrow">Today</div><h2 className="mt-1 font-display text-2xl font-bold">Class schedule</h2></div><CalendarClock size={18} className="text-[var(--lc-accent)]"/></div>
        {data.schedule.length === 0 ? <EmptyState icon={CalendarClock} title="No timetable published" detail="Your class timetable will appear here once administration publishes the schedule."/> : <div className="mt-5 space-y-2">{data.schedule.map((item) => <div key={item.id} className="liquid-panel flex items-center gap-4 rounded-2xl p-4"><div className="w-20 shrink-0 font-mono-campus text-xs text-[var(--lc-muted)]">{item.startTime} — {item.endTime}</div><div className="min-w-0 flex-1"><div className="font-semibold truncate">{item.subject}</div><div className="mt-1 text-xs text-[var(--lc-muted)]">{item.subjectCode || 'Subject'} · Room {item.room}</div></div></div>)}</div>}
      </div>
      <div className="liquid-surface rounded-[28px] p-5 md:p-7">
        <div className="lc-eyebrow">Assessment</div><h2 className="mt-1 font-display text-2xl font-bold">Recent results</h2>
        {data.recentGrades.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[var(--lc-line)] p-6 text-sm text-[var(--lc-muted)]">No grades have been published yet.</div> : <div className="mt-5 space-y-2">{data.recentGrades.slice(0,6).map((g) => <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-[var(--lc-line)] bg-white/20 p-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{g.subject}</div><div className="mt-1 text-[11px] capitalize text-[var(--lc-muted)]">{g.type} · {new Date(g.gradedAt).toLocaleDateString()}</div></div><div className="text-right"><div className="font-display text-xl font-bold">{g.value}<span className="text-xs font-medium text-[var(--lc-muted)]">/{g.maxValue}</span></div></div></div>)}</div>}
      </div>
    </section>}

    {(view==='overview'||view==='assignments')&&<section className="liquid-surface rounded-[28px] p-5 md:p-7">
      <div className="lc-eyebrow">Work queue</div><h2 className="mt-1 font-display text-2xl font-bold">Assignments</h2>
      {studentAssignments.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[var(--lc-line)] p-6 text-sm text-[var(--lc-muted)]">No published assignments are waiting for you.</div> : <div className="mt-5 space-y-3">{studentAssignments.map((a) => { const submitted = Boolean(a.submission); return <article key={a.id} className="liquid-panel rounded-2xl p-4 md:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{a.title}</h3><span className="rounded-full border border-[var(--lc-line)] px-2 py-1 text-[10px] font-bold">{a.subject}</span>{submitted&&<span className="inline-flex items-center gap-1 rounded-full bg-[var(--lc-accent)]/10 px-2 py-1 text-[10px] font-bold text-[var(--lc-accent)]"><CheckCircle2 size={12}/> Submitted</span>}</div><p className="mt-2 text-sm leading-6 text-[var(--lc-muted)]">{a.description || 'No description provided.'}</p></div><div className="shrink-0 text-right"><div className="font-display text-lg font-bold">{a.maxScore} pts</div><div className="mt-1 text-xs text-[var(--lc-muted)]">Due {new Date(a.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div></div></div><button onClick={()=>{setOpenAssignment(openAssignment===a.id?null:a.id);setSubmissionText(a.submission?.bodyText||'');setFileLink(Array.isArray(a.submission?.files)&&a.submission?.files[0]?.url?a.submission.files[0].url:'');setSubmissionMessage('')}} className="mt-4 rounded-xl border border-[var(--lc-line)] bg-white/30 px-3 py-2 text-xs font-bold">{openAssignment===a.id?'Close submission':'Open submission'}</button>{openAssignment===a.id&&<div className="mt-4 rounded-2xl border border-[var(--lc-line)] bg-white/20 p-4"><textarea value={submissionText} onChange={e=>setSubmissionText(e.target.value)} placeholder="Write your answer or submission note…" className="min-h-[130px] w-full rounded-xl border border-[var(--lc-line)] bg-white/50 p-3 text-sm outline-none focus:border-[var(--lc-accent)]"/><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={fileLink} onChange={e=>setFileLink(e.target.value)} placeholder="Optional file URL" className="min-w-0 flex-1 rounded-xl border border-[var(--lc-line)] bg-white/50 px-3 py-2 text-sm outline-none focus:border-[var(--lc-accent)]"/><button disabled={submitting} onClick={async()=>{setSubmitting(true);setSubmissionMessage('');try{await customFetch(`/api/academic/assignments/${a.id}/submission`,{method:'POST',body:JSON.stringify({bodyText:submissionText,files:fileLink?[{url:fileLink,name:'Submission'}]:[]})});setSubmissionMessage('Submission saved.');await load()}catch(e){setSubmissionMessage(e instanceof Error?e.message:'Submission failed.')}finally{setSubmitting(false)}}} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lc-accent)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Send size={14}/>{submitting?'Sending…':submitted?'Resubmit':'Submit work'}</button></div>{submissionMessage&&<div className="mt-3 text-xs font-semibold text-[var(--lc-muted)]">{submissionMessage}</div>}<div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--lc-muted)]"><FileUp size={13}/> File uploads can be connected to school storage; URL submissions work now.</div></div>}</article>})}</div>}
    </section>}

    {view==='grades'&&<section className="liquid-surface rounded-[28px] p-5 md:p-7"><div className="flex items-end justify-between"><div><div className="lc-eyebrow">Performance</div><h2 className="mt-1 font-display text-2xl font-bold">Grade history</h2></div><BarChart3 size={20} className="text-[var(--lc-accent)]"/></div>{gradeGroups.length===0?<EmptyState icon={BarChart3} title="No grades published" detail="Your teachers' published grades will appear here, grouped by academic term."/>:<div className="mt-5 space-y-4">{gradeGroups.map((group,i)=><div key={group.term?.id??`g-${i}`} className="rounded-2xl border border-[var(--lc-line)] bg-white/20 p-4"><div className="flex items-center justify-between"><div className="font-display text-lg font-bold">{group.term?.label??'Unassigned term'}</div><div className="text-xs text-[var(--lc-muted)]">{group.grades.length} result{group.grades.length===1?'':'s'}</div></div><div className="mt-3 divide-y divide-[var(--lc-line)]">{group.grades.map(g=><div key={g.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center"><div className="min-w-0 flex-1"><div className="font-semibold">{g.subject}</div><div className="mt-1 text-xs text-[var(--lc-muted)]">{g.type} · coefficient {g.coefficient}{g.comment?` · ${g.comment}`:''}</div></div><div className="font-display text-xl font-bold">{g.value}<span className="text-xs font-medium text-[var(--lc-muted)]">/{g.maxValue}</span></div></div>)}</div></div>)}</div>}{gradeCount>0&&<div className="mt-5 text-xs text-[var(--lc-muted)]">{gradeCount} published result{gradeCount===1?'':'s'} across your academic record.</div>}</section>}

    {view==='attendance'&&<section className="liquid-surface rounded-[28px] p-5 md:p-7"><div className="flex items-end justify-between"><div><div className="lc-eyebrow">Presence</div><h2 className="mt-1 font-display text-2xl font-bold">Attendance history</h2></div><History size={20} className="text-[var(--lc-accent)]"/></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><MiniStat label="Present" value={attendanceCounts.present}/><MiniStat label="Late" value={attendanceCounts.late}/><MiniStat label="Absent" value={attendanceCounts.absent}/><MiniStat label="Excused" value={attendanceCounts.excused}/></div>{!attendance?.records.length?<EmptyState icon={ClipboardCheck} title="No attendance records" detail="Attendance will appear here once your teachers record classroom sessions."/>:<div className="mt-5 space-y-2">{attendance.records.map(r=><div key={r.id} className="flex flex-col gap-2 rounded-2xl border border-[var(--lc-line)] bg-white/20 p-4 md:flex-row md:items-center md:justify-between"><div><div className="font-semibold">{new Date(r.date).toLocaleDateString()}</div><div className="mt-1 text-xs text-[var(--lc-muted)]">Period {r.period}{r.note?` · ${r.note}`:''}</div></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${r.status==='present'?'bg-emerald-500/10 text-emerald-700':r.status==='late'?'bg-amber-500/10 text-amber-700':r.status==='absent'?'bg-rose-500/10 text-rose-700':'border border-[var(--lc-line)] text-[var(--lc-muted)]'}`}>{r.status}</span></div>)}</div>}</section>}

    {view==='timetable'&&<section className="liquid-surface rounded-[28px] p-5 md:p-7"><div className="lc-eyebrow">Week</div><h2 className="mt-1 font-display text-2xl font-bold">Published timetable</h2><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.schedule.map(item=><div key={item.id} className="rounded-2xl border border-[var(--lc-line)] bg-white/20 p-4"><div className="text-xs font-bold uppercase tracking-[.12em] text-[var(--lc-muted)]">{item.startTime} — {item.endTime}</div><div className="mt-3 font-display text-lg font-bold">{item.subject}</div><div className="mt-1 text-sm text-[var(--lc-muted)]">{item.subjectCode || 'Subject'} · Room {item.room}</div></div>)}{!data.schedule.length&&<EmptyState icon={CalendarClock} title="No timetable published" detail="Your class schedule will appear after administration publishes it."/>}</div></section>}
  </div>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: any; label: string; value: string; detail: string }) {
  return <div className="liquid-panel rounded-[22px] p-4"><div className="flex items-center justify-between"><div className="lc-eyebrow">{label}</div><Icon size={17} className="text-[var(--lc-accent)]"/></div><div className="mt-3 font-display text-2xl font-bold truncate">{value}</div><div className="mt-1 text-xs text-[var(--lc-muted)]">{detail}</div></div>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="liquid-panel rounded-2xl p-4"><div className="lc-eyebrow">{label}</div><div className="mt-2 font-display text-2xl font-bold">{value}</div></div>;
}

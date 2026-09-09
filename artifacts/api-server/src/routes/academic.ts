import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Response, type NextFunction, type Request } from "express";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db, assignmentsTable, attendanceRecordsTable, gradesTable, submissionsTable, schoolClassesTable, studentProfilesTable, subjectsTable, timetableEntriesTable, roomsTable, academicTermsTable } from "@workspace/db";
import { isSuperAdministrator } from "../lib/authz";

const router: IRouter = Router();

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] ?? "" : String(value ?? "");
}
const getAuth = (req: Request) => (req as Request & { auth?: import("../lib/authz").AuthUser | null }).auth ?? null;
type AuthenticatedRequest = Request & { campusUserId?: string };

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = getAuth(req)?.userId;
  if (!userId) return res.status(401).json({ error: "Sign in to access academics." });
  req.campusUserId = userId;
  return next();
}

async function member(req: AuthenticatedRequest) {
  const uid = req.campusUserId!;
  const rows = await db.execute(sql`select role, membership_status, role_status from campus_members where user_id = ${uid} limit 1`);
  return (rows as any)?.rows?.[0] ?? null;
}

async function requireTeacher(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const m = await member(req);
  if (!m || (!isSuperAdministrator(req) && !["teacher", "admin"].includes(m.role)) || m.membership_status !== "approved" || m.role_status !== "approved") return res.status(403).json({ error: "Teacher or administrator access required." });
  return next();
}

router.use(requireAuth);

async function requireApprovedStudent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const m = await member(req);
  if (!m || m.membership_status !== "approved" || m.role_status !== "approved") return res.status(403).json({ error: "Verified campus membership required." });
  if (m.role === "parent") return res.status(403).json({ error: "Student academic access required." });
  return next();
}

router.get("/academic/overview", requireApprovedStudent, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.campusUserId!;
    const profile = await db.select({ classId: studentProfilesTable.classId }).from(studentProfilesTable).where(eq(studentProfilesTable.userId, userId)).limit(1);
    const classId = profile[0]?.classId ?? null;
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const schedule = classId ? await db.select({ entry: timetableEntriesTable, subject: subjectsTable, room: roomsTable }).from(timetableEntriesTable).leftJoin(subjectsTable, eq(subjectsTable.id, timetableEntriesTable.subjectId)).leftJoin(roomsTable, eq(roomsTable.id, timetableEntriesTable.roomId)).where(and(eq(timetableEntriesTable.classId, classId), eq(timetableEntriesTable.dayOfWeek, dayOfWeek))).orderBy(timetableEntriesTable.startTime) : [];
    const assignments = classId ? await db.select().from(assignmentsTable).where(and(eq(assignmentsTable.classId, classId), eq(assignmentsTable.status, "published"))).orderBy(desc(assignmentsTable.dueDate)).limit(6) : [];
    const attendance = await db.select().from(attendanceRecordsTable).where(eq(attendanceRecordsTable.studentId, userId)).orderBy(desc(attendanceRecordsTable.date)).limit(30);
    const grades = await db.select({ grade: gradesTable, subject: subjectsTable }).from(gradesTable).leftJoin(subjectsTable, eq(subjectsTable.id, gradesTable.subjectId)).where(eq(gradesTable.studentId, userId)).orderBy(desc(gradesTable.gradedAt)).limit(50);
    const present = attendance.filter((r: any) => ["present", "late"].includes(r.status)).length;
    const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : null;
    const weighted = grades.reduce((sum: any, row: any) => sum + (row.grade.value / row.grade.maxValue) * row.grade.coefficient, 0);
    const weight = grades.reduce((sum: any, row: any) => sum + row.grade.coefficient, 0);
    res.json({ classId, schedule: schedule.map((row: any) => ({ id: row.entry.id, subject: row.subject?.label_fr ?? row.subject?.label_ar ?? "Subject", subjectCode: row.subject?.code ?? "", room: row.room?.code ?? "—", startTime: row.entry.startTime, endTime: row.entry.endTime })), assignments, attendanceRate, recentGrades: grades.map((row: any) => ({ id: row.grade.id, subject: row.subject?.label_fr ?? row.subject?.label_ar ?? "Subject", value: row.grade.value, maxValue: row.grade.maxValue, coefficient: row.grade.coefficient, type: row.grade.type, gradedAt: row.grade.gradedAt })), averagePercent: weight ? Math.round((weighted / weight) * 100) : null });
  } catch (e) { return next(e); }
});

router.get("/academic/student/assignments", requireApprovedStudent, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const profile = await db.select({ classId: studentProfilesTable.classId }).from(studentProfilesTable).where(eq(studentProfilesTable.userId, req.campusUserId!)).limit(1);
    const classId = profile[0]?.classId;
    if (!classId) return res.json([]);
    const rows = await db.select({ assignment: assignmentsTable, subject: subjectsTable, submission: submissionsTable })
      .from(assignmentsTable)
      .leftJoin(subjectsTable, eq(subjectsTable.id, assignmentsTable.subjectId))
      .leftJoin(submissionsTable, and(eq(submissionsTable.assignmentId, assignmentsTable.id), eq(submissionsTable.studentId, req.campusUserId!)))
      .where(and(eq(assignmentsTable.classId, classId), eq(assignmentsTable.status, "published")))
      .orderBy(assignmentsTable.dueDate);
    res.json(rows.map((r: any) => ({
      id: r.assignment.id, title: r.assignment.titleFr ?? r.assignment.titleAr ?? "Assignment", description: r.assignment.descriptionFr ?? r.assignment.descriptionAr ?? "",
      subject: r.subject?.labelFr ?? r.subject?.labelAr ?? "Subject", subjectId: r.assignment.subjectId, dueDate: r.assignment.dueDate, maxScore: r.assignment.maxScore, allowLate: r.assignment.allowLate,
      submission: r.submission ? { id: r.submission.id, bodyText: r.submission.bodyText, files: r.submission.files, isLate: r.submission.isLate, gradeValue: r.submission.gradeValue, feedback: r.submission.feedback, status: r.submission.status, submittedAt: r.submission.submittedAt } : null
    })));
  } catch (e) { return next(e); }
});

router.post("/academic/assignments/:assignmentId/submission", requireApprovedStudent, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assignmentId = routeParam(req, "assignmentId");
    const [profile] = await db.select({ classId: studentProfilesTable.classId }).from(studentProfilesTable).where(eq(studentProfilesTable.userId, req.campusUserId!)).limit(1);
    if (!profile?.classId) return res.status(400).json({ error: "Assign yourself to an academic class before submitting work." });
    const [assignment] = await db.select().from(assignmentsTable).where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.classId, profile.classId), eq(assignmentsTable.status, "published"))).limit(1);
    if (!assignment) return res.status(404).json({ error: "Assignment not found." });
    const bodyText = typeof req.body?.bodyText === "string" ? req.body.bodyText.trim() : "";
    const files = Array.isArray(req.body?.files) ? req.body.files.slice(0, 10) : [];
    if (!bodyText && files.length === 0) return res.status(400).json({ error: "Add written work or at least one file link." });
    const now = new Date();
    const late = now.getTime() > new Date(assignment.dueDate).getTime();
    if (late && !assignment.allowLate) return res.status(400).json({ error: "This assignment no longer accepts late submissions." });
    const [row] = await db.insert(submissionsTable).values({ id: randomUUID(), assignmentId, studentId: req.campusUserId!, bodyText: bodyText || null, files, isLate: late, status: "submitted", submittedAt: now })
      .onConflictDoUpdate({ target: [submissionsTable.assignmentId, submissionsTable.studentId], set: { bodyText: bodyText || null, files, isLate: late, status: "resubmitted", submittedAt: now } }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.get("/academic/student/grades", requireApprovedStudent, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select({ grade: gradesTable, subject: subjectsTable, term: academicTermsTable })
      .from(gradesTable)
      .leftJoin(subjectsTable, eq(subjectsTable.id, gradesTable.subjectId))
      .leftJoin(academicTermsTable, eq(academicTermsTable.id, gradesTable.termId))
      .where(eq(gradesTable.studentId, req.campusUserId!))
      .orderBy(desc(gradesTable.gradedAt))
      .limit(500);
    const grouped = new Map<string, { term: any; rows: any[] }>();
    for (const row of rows as any[]) {
      const key = row.term?.id ?? "unassigned";
      if (!grouped.has(key)) grouped.set(key, { term: row.term ?? null, rows: [] });
      grouped.get(key)!.rows.push({ id: row.grade.id, subjectId: row.grade.subjectId, subject: row.subject?.labelFr ?? row.subject?.labelAr ?? "Subject", value: row.grade.value, maxValue: row.grade.maxValue, coefficient: row.grade.coefficient, type: row.grade.type, comment: row.grade.comment, gradedAt: row.grade.gradedAt });
    }
    res.json([...grouped.values()].map((g) => ({ term: g.term ? { id: g.term.id, label: g.term.labelFr ?? g.term.labelAr ?? "Term", order: g.term.order } : null, grades: g.rows })) );
  } catch (e) { return next(e); }
});

router.get("/academic/student/timetable", requireApprovedStudent, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [profile] = await db.select({ classId: studentProfilesTable.classId }).from(studentProfilesTable).where(eq(studentProfilesTable.userId, req.campusUserId!)).limit(1);
    if (!profile?.classId) return res.json([]);
    const rows = await db.select({ entry: timetableEntriesTable, subject: subjectsTable, room: roomsTable })
      .from(timetableEntriesTable)
      .leftJoin(subjectsTable, eq(subjectsTable.id, timetableEntriesTable.subjectId))
      .leftJoin(roomsTable, eq(roomsTable.id, timetableEntriesTable.roomId))
      .where(eq(timetableEntriesTable.classId, profile.classId))
      .orderBy(timetableEntriesTable.dayOfWeek, timetableEntriesTable.startTime);
    res.json(rows.map((row: any) => ({
      id: row.entry.id, dayOfWeek: row.entry.dayOfWeek, startTime: row.entry.startTime, endTime: row.entry.endTime,
      subject: row.subject?.labelFr ?? row.subject?.labelAr ?? "Subject", subjectCode: row.subject?.code ?? "", room: row.room?.code ?? "—"
    })));
  } catch (e) { return next(e); }
});

router.get("/academic/student/attendance", requireApprovedStudent, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select().from(attendanceRecordsTable).where(eq(attendanceRecordsTable.studentId, req.campusUserId!)).orderBy(desc(attendanceRecordsTable.date)).limit(100);
    const present = rows.filter((r: any) => ["present", "late"].includes(r.status)).length;
    res.json({ records: rows, rate: rows.length ? Math.round((present / rows.length) * 100) : null });
  } catch (e) { return next(e); }
});

router.get("/academic/classes", requireTeacher, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const m = await member(req);
    if (m?.role === "admin" || isSuperAdministrator(req)) return res.json(await db.select().from(schoolClassesTable).orderBy(schoolClassesTable.label));
    const teacherId = req.campusUserId!;
    const taught = await db.select({ classRow: schoolClassesTable }).from(timetableEntriesTable).innerJoin(schoolClassesTable, eq(schoolClassesTable.id, timetableEntriesTable.classId)).where(eq(timetableEntriesTable.teacherId, teacherId));
    const assigned = await db.select({ classRow: schoolClassesTable }).from(assignmentsTable).innerJoin(schoolClassesTable, eq(schoolClassesTable.id, assignmentsTable.classId)).where(eq(assignmentsTable.teacherId, teacherId));
    const unique = new Map<string, any>();
    [...taught, ...assigned].forEach((r: any) => unique.set(r.classRow.id, r.classRow));
    res.json([...unique.values()].sort((a: any, b: any) => a.label.localeCompare(b.label)));
  } catch (e) { return next(e); }
});

async function canOperateClass(req: AuthenticatedRequest, classId: string) {
  const m = await member(req);
  if (m?.role === "admin" || isSuperAdministrator(req)) return true;
  const uid = req.campusUserId!;
  const taught = await db.select({ id: timetableEntriesTable.id }).from(timetableEntriesTable).where(and(eq(timetableEntriesTable.classId, classId), eq(timetableEntriesTable.teacherId, uid))).limit(1);
  if (taught.length) return true;
  const assigned = await db.select({ id: assignmentsTable.id }).from(assignmentsTable).where(and(eq(assignmentsTable.classId, classId), eq(assignmentsTable.teacherId, uid))).limit(1);
  return assigned.length > 0;
}

router.get("/academic/classes/:classId/roster", requireTeacher, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!(await canOperateClass(req, routeParam(req, "classId")))) return res.status(403).json({ error: "You are not assigned to this class." });
    const rows = await db.select({ student: studentProfilesTable, class: schoolClassesTable }).from(studentProfilesTable).leftJoin(schoolClassesTable, eq(schoolClassesTable.id, studentProfilesTable.classId)).where(eq(studentProfilesTable.classId, routeParam(req, "classId")));
    const studentIds = rows.map((r: any) => r.student.userId).filter(Boolean);
    let users: any[] = [];
    if (studentIds.length) users = (await db.execute(sql`select id, display_name_ar, display_name_fr, email from users where id = any(${studentIds})`) as any).rows ?? [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json(rows.map((r: any) => ({ userId: r.student.userId, name: userMap.get(r.student.userId)?.display_name_fr ?? userMap.get(r.student.userId)?.display_name_ar ?? r.student.userId, email: userMap.get(r.student.userId)?.email ?? null, classLabel: r.class?.label ?? r.class?.fullLabelFr ?? "" })));
  } catch (e) { return next(e); }
});

router.post("/academic/attendance", requireTeacher, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { classId, subjectId, studentId, date, period, status, note } = req.body ?? {};
    if (!classId || !subjectId || !studentId || !date || period === undefined || !status) return res.status(400).json({ error: "classId, subjectId, studentId, date, period and status are required." });
    if (!(await canOperateClass(req, classId))) return res.status(403).json({ error: "You are not assigned to this class." });
    if (!["present", "late", "absent", "excused"].includes(status)) return res.status(400).json({ error: "Invalid attendance status." });
    const student = await db.select({ userId: studentProfilesTable.userId }).from(studentProfilesTable).where(and(eq(studentProfilesTable.userId, studentId), eq(studentProfilesTable.classId, classId))).limit(1);
    if (!student.length) return res.status(400).json({ error: "The selected student is not enrolled in this class." });
    if (!isSuperAdministrator(req)) {
      const subjectLink = await db.select({ id: timetableEntriesTable.id }).from(timetableEntriesTable).where(and(eq(timetableEntriesTable.classId, classId), eq(timetableEntriesTable.subjectId, subjectId), eq(timetableEntriesTable.teacherId, req.campusUserId!))).limit(1);
      if (!subjectLink.length) return res.status(403).json({ error: "You are not assigned to this subject in this class." });
    }
    const now = new Date();
    const [row] = await db.insert(attendanceRecordsTable).values({ id: randomUUID(), classId, subjectId, studentId, date: new Date(date), period: Number(period), status, note: note ?? null, markedBy: req.campusUserId!, markedAt: now }).onConflictDoUpdate({ target: [attendanceRecordsTable.classId, attendanceRecordsTable.studentId, attendanceRecordsTable.date, attendanceRecordsTable.period], set: { status, note: note ?? null, markedBy: req.campusUserId!, markedAt: now } }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.get("/academic/classes/:classId/attendance", requireTeacher, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const classId = routeParam(req, "classId");
    if (!(await canOperateClass(req, classId))) return res.status(403).json({ error: "You are not assigned to this class." });
    const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().slice(0, 10);
    const roster = await db.select({ student: studentProfilesTable }).from(studentProfilesTable).where(eq(studentProfilesTable.classId, classId));
    const records = await db.select().from(attendanceRecordsTable).where(and(eq(attendanceRecordsTable.classId, classId), sql`DATE(${attendanceRecordsTable.date}) = ${date}`)).orderBy(attendanceRecordsTable.period);
    res.json({ classId, date, students: roster.map((r: any) => ({ userId: r.student.userId, records: records.filter((x: any) => x.studentId === r.student.userId) })) });
  } catch (e) { return next(e); }
});

router.get("/academic/timetable", requireTeacher, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const m = await member(req);
    const classId = typeof req.query.classId === "string" ? req.query.classId : null;
    if (classId && !(await canOperateClass(req, classId))) return res.status(403).json({ error: "You are not assigned to this class." });
    const query = db.select({ entry: timetableEntriesTable, subject: subjectsTable, room: roomsTable, classRow: schoolClassesTable }).from(timetableEntriesTable).leftJoin(subjectsTable, eq(subjectsTable.id, timetableEntriesTable.subjectId)).leftJoin(roomsTable, eq(roomsTable.id, timetableEntriesTable.roomId)).leftJoin(schoolClassesTable, eq(schoolClassesTable.id, timetableEntriesTable.classId));
    const rows = classId ? await query.where(eq(timetableEntriesTable.classId, classId)).orderBy(timetableEntriesTable.dayOfWeek, timetableEntriesTable.startTime) : (m?.role === "admin" || isSuperAdministrator(req) ? await query.orderBy(timetableEntriesTable.dayOfWeek, timetableEntriesTable.startTime) : await query.where(eq(timetableEntriesTable.teacherId, req.campusUserId!)).orderBy(timetableEntriesTable.dayOfWeek, timetableEntriesTable.startTime));
    res.json(rows.map((r: any) => ({ id: r.entry.id, classId: r.entry.classId, classLabel: r.classRow?.fullLabelFr ?? r.classRow?.label ?? r.entry.classId, subject: r.subject?.labelFr ?? r.subject?.labelAr ?? "Subject", subjectId: r.entry.subjectId, room: r.room?.labelFr ?? r.room?.labelAr ?? r.room?.code ?? null, roomId: r.entry.roomId, dayOfWeek: r.entry.dayOfWeek, startTime: r.entry.startTime, endTime: r.entry.endTime })));
  } catch (e) { return next(e); }
});

router.get("/academic/classes/:classId/gradebook", requireTeacher, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const classId = routeParam(req, "classId");
    if (!(await canOperateClass(req, classId))) return res.status(403).json({ error: "You are not assigned to this class." });
    const roster = await db.select({ student: studentProfilesTable }).from(studentProfilesTable).where(eq(studentProfilesTable.classId, classId));
    const gradeRows = await db.select().from(gradesTable).where(eq(gradesTable.classId, classId)).orderBy(desc(gradesTable.gradedAt)).limit(1000);
    const subjectRows = await db.select({ subject: subjectsTable }).from(timetableEntriesTable).innerJoin(subjectsTable, eq(subjectsTable.id, timetableEntriesTable.subjectId)).where(eq(timetableEntriesTable.classId, classId));
    const uniqueSubjects = new Map<string, any>();
    subjectRows.forEach((r: any) => uniqueSubjects.set(r.subject.id, r.subject));
    const terms = await db.select().from(academicTermsTable).orderBy(academicTermsTable.order);
    res.json({ classId, students: roster.map((r: any) => ({ userId: r.student.userId })), grades: gradeRows, subjects: [...uniqueSubjects.values()], terms });
  } catch (e) { return next(e); }
});

router.get("/academic/assignments", requireTeacher, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const classId = typeof req.query.classId === "string" ? req.query.classId : null;
    if (classId && !(await canOperateClass(req, classId))) return res.status(403).json({ error: "You are not assigned to this class." });
    const m = await member(req);
    const privileged = isSuperAdministrator(req) || m?.role === "admin";
    const filters = classId ? [eq(assignmentsTable.classId, classId)] : [];
    if (!privileged) filters.push(eq(assignmentsTable.teacherId, req.campusUserId!));
    const base = db.select({ assignment: assignmentsTable, subject: subjectsTable, classRow: schoolClassesTable }).from(assignmentsTable).leftJoin(subjectsTable, eq(subjectsTable.id, assignmentsTable.subjectId)).leftJoin(schoolClassesTable, eq(schoolClassesTable.id, assignmentsTable.classId));
    const rows = filters.length ? await base.where(and(...filters)).orderBy(desc(assignmentsTable.createdAt)).limit(100) : await base.orderBy(desc(assignmentsTable.createdAt)).limit(100);
    res.json(rows.map((r: any) => ({ ...r.assignment, subject: r.subject?.labelFr ?? r.subject?.labelAr ?? "Subject", subjectId: r.assignment.subjectId, classLabel: r.classRow?.fullLabelFr ?? r.classRow?.label ?? r.assignment.classId, title: r.assignment.titleFr ?? r.assignment.titleAr ?? "Assignment", description: r.assignment.descriptionFr ?? r.assignment.descriptionAr ?? "" })));
  } catch (e) { return next(e); }
});

router.post("/academic/assignments", requireTeacher, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, subjectId, titleAr = null, titleFr = null, descriptionAr = null, descriptionFr = null, type = "homework", dueDate, maxScore = 20, allowLate = false, status = "published" } = req.body ?? {};
    if (!classId || !subjectId || !titleFr || !dueDate) return res.status(400).json({ error: "classId, subjectId, titleFr and dueDate are required." });
    if (!(await canOperateClass(req, classId))) return res.status(403).json({ error: "You are not assigned to this class." });
    const subjectLink = await db.select({ id: timetableEntriesTable.id }).from(timetableEntriesTable).where(and(eq(timetableEntriesTable.classId, classId), eq(timetableEntriesTable.subjectId, subjectId), isSuperAdministrator(req) ? undefined : eq(timetableEntriesTable.teacherId, req.campusUserId!))).limit(1);
    if (!subjectLink.length && !isSuperAdministrator(req)) return res.status(403).json({ error: "You are not assigned to this subject in this class." });
    const [row] = await db.insert(assignmentsTable).values({ id: randomUUID(), classId, subjectId, teacherId: req.campusUserId!, titleAr, titleFr, descriptionAr, descriptionFr, type, dueDate: new Date(dueDate), maxScore: Number(maxScore), allowLate: Boolean(allowLate), status, publishedAt: status === "published" ? new Date() : null, createdAt: new Date() }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.patch("/academic/assignments/:assignmentId", requireTeacher, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [existing] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, routeParam(req, "assignmentId"))).limit(1);
    if (!existing) return res.status(404).json({ error: "Assignment not found." });
    if (!isSuperAdministrator(req) && existing.teacherId !== req.campusUserId!) return res.status(403).json({ error: "You do not own this assignment." });
    const status = req.body?.status === "draft" ? "draft" : req.body?.status === "closed" ? "closed" : "published";
    const [row] = await db.update(assignmentsTable).set({ status, publishedAt: status === "published" ? (existing.publishedAt ?? new Date()) : null }).where(eq(assignmentsTable.id, existing.id)).returning();
    res.json(row);
  } catch (e) { return next(e); }
});

router.post("/academic/timetable", requireTeacher, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!isSuperAdministrator(req)) { const m = await member(req); if (m?.role !== "admin") return res.status(403).json({ error: "Only administrators can edit the timetable." }); }
    const { classId, subjectId, teacherId, roomId = null, dayOfWeek, startTime, endTime, recurrence = "weekly" } = req.body ?? {};
    if (!classId || !subjectId || !teacherId || dayOfWeek === undefined || !startTime || !endTime) return res.status(400).json({ error: "Class, subject, teacher, day, start and end times are required." });
    if (Number(dayOfWeek) < 1 || Number(dayOfWeek) > 7 || startTime >= endTime) return res.status(400).json({ error: "Invalid timetable interval." });
    const conflict = await db.select({ id: timetableEntriesTable.id }).from(timetableEntriesTable).where(and(eq(timetableEntriesTable.dayOfWeek, Number(dayOfWeek)), sql`${timetableEntriesTable.startTime} < ${endTime}`, sql`${timetableEntriesTable.endTime} > ${startTime}`, or(eq(timetableEntriesTable.classId, classId), eq(timetableEntriesTable.teacherId, teacherId), roomId ? eq(timetableEntriesTable.roomId, roomId) : undefined))).limit(1);
    if (conflict.length) return res.status(409).json({ error: "Timetable conflict detected for the class, teacher or room." });
    const [row] = await db.insert(timetableEntriesTable).values({ id: randomUUID(), classId, subjectId, teacherId, roomId, dayOfWeek: Number(dayOfWeek), startTime, endTime, recurrence }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.patch("/academic/timetable/:id", requireTeacher, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!isSuperAdministrator(req)) { const m = await member(req); if (m?.role !== "admin") return res.status(403).json({ error: "Only administrators can edit the timetable." }); }
    const id = routeParam(req, "id");
    const [existing] = await db.select().from(timetableEntriesTable).where(eq(timetableEntriesTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Timetable entry not found." });
    const day = Number(req.body?.dayOfWeek ?? existing.dayOfWeek);
    const startTime = String(req.body?.startTime ?? existing.startTime);
    const endTime = String(req.body?.endTime ?? existing.endTime);
    const roomId = req.body?.roomId === undefined ? existing.roomId : (req.body.roomId || null);
    if (day < 1 || day > 7 || startTime >= endTime) return res.status(400).json({ error: "Invalid timetable interval." });
    const conflicts = await db.select({ id: timetableEntriesTable.id }).from(timetableEntriesTable).where(and(eq(timetableEntriesTable.dayOfWeek, day), sql`${timetableEntriesTable.startTime} < ${endTime}`, sql`${timetableEntriesTable.endTime} > ${startTime}`, sql`${timetableEntriesTable.id} <> ${id}`, or(eq(timetableEntriesTable.classId, existing.classId), eq(timetableEntriesTable.teacherId, existing.teacherId), roomId ? eq(timetableEntriesTable.roomId, roomId) : undefined))).limit(1);
    if (conflicts.length) return res.status(409).json({ error: "Timetable conflict detected for the class, teacher or room." });
    const [row] = await db.update(timetableEntriesTable).set({ roomId, dayOfWeek: day, startTime, endTime }).where(eq(timetableEntriesTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Timetable entry not found." });
    res.json(row);
  } catch (e) { return next(e); }
});

router.delete("/academic/timetable/:id", requireTeacher, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!isSuperAdministrator(req)) { const m = await member(req); if (m?.role !== "admin") return res.status(403).json({ error: "Only administrators can edit the timetable." }); }
    const [row] = await db.delete(timetableEntriesTable).where(eq(timetableEntriesTable.id, routeParam(req, "id"))).returning();
    if (!row) return res.status(404).json({ error: "Timetable entry not found." });
    res.status(204).end();
  } catch (e) { return next(e); }
});


router.get("/academic/grades", requireTeacher, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const classId = typeof req.query.classId === "string" ? req.query.classId : null;
    if (classId && !(await canOperateClass(req, classId))) return res.status(403).json({ error: "You are not assigned to this class." });
    const rows = classId ? await db.select().from(gradesTable).where(eq(gradesTable.classId, classId)).orderBy(desc(gradesTable.gradedAt)).limit(500) : await db.select().from(gradesTable).orderBy(desc(gradesTable.gradedAt)).limit(500);
    res.json(rows);
  } catch (e) { return next(e); }
});


router.get("/academic/classes/:classId/submissions", requireTeacher, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const classId = routeParam(req, "classId");
    if (!(await canOperateClass(req, classId))) return res.status(403).json({ error: "You are not assigned to this class." });
    const m = await member(req);
    const privileged = isSuperAdministrator(req) || m?.role === "admin";
    const assignmentId = typeof req.query.assignmentId === "string" ? req.query.assignmentId : null;
    const filters = [eq(assignmentsTable.classId, classId)];
    if (assignmentId) filters.push(eq(assignmentsTable.id, assignmentId));
    if (!privileged) filters.push(eq(assignmentsTable.teacherId, req.campusUserId!));
    const rows = await db.select({ submission: submissionsTable, assignment: assignmentsTable, subject: subjectsTable, student: studentProfilesTable })
      .from(submissionsTable)
      .innerJoin(assignmentsTable, eq(assignmentsTable.id, submissionsTable.assignmentId))
      .leftJoin(subjectsTable, eq(subjectsTable.id, assignmentsTable.subjectId))
      .leftJoin(studentProfilesTable, eq(studentProfilesTable.userId, submissionsTable.studentId))
      .where(and(...filters))
      .orderBy(desc(submissionsTable.submittedAt))
      .limit(500);
    const ids = [...new Set(rows.map((r: any) => r.submission.studentId).filter(Boolean))];
    let users: any[] = [];
    if (ids.length) users = (await db.execute(sql`select id, display_name_ar, display_name_fr, email from users where id = any(${ids})`) as any).rows ?? [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json(rows.map((r: any) => ({
      id: r.submission.id,
      studentId: r.submission.studentId,
      studentName: userMap.get(r.submission.studentId)?.display_name_fr ?? userMap.get(r.submission.studentId)?.display_name_ar ?? r.submission.studentId,
      studentEmail: userMap.get(r.submission.studentId)?.email ?? null,
      assignmentId: r.assignment.id,
      assignmentTitle: r.assignment.titleFr ?? r.assignment.titleAr ?? "Assignment",
      subject: r.subject?.labelFr ?? r.subject?.labelAr ?? "Subject",
      maxScore: r.assignment.maxScore,
      bodyText: r.submission.bodyText,
      files: r.submission.files,
      isLate: r.submission.isLate,
      gradeValue: r.submission.gradeValue,
      feedback: r.submission.feedback,
      status: r.submission.status,
      submittedAt: r.submission.submittedAt,
    })));
  } catch (e) { return next(e); }
});

router.patch("/academic/submissions/:submissionId", requireTeacher, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [existing] = await db.select({ submission: submissionsTable, assignment: assignmentsTable })
      .from(submissionsTable)
      .innerJoin(assignmentsTable, eq(assignmentsTable.id, submissionsTable.assignmentId))
      .where(eq(submissionsTable.id, routeParam(req, "submissionId"))).limit(1);
    if (!existing) return res.status(404).json({ error: "Submission not found." });
    const m = await member(req);
    const privileged = isSuperAdministrator(req) || m?.role === "admin";
    if (!privileged && existing.assignment.teacherId !== req.campusUserId!) return res.status(403).json({ error: "You do not own this assignment." });
    const maxScore = Number(existing.assignment.maxScore ?? 20);
    const gradeValue = req.body?.gradeValue === null || req.body?.gradeValue === undefined || req.body?.gradeValue === "" ? null : Number(req.body.gradeValue);
    if (gradeValue !== null && (!Number.isFinite(gradeValue) || gradeValue < 0 || gradeValue > maxScore)) return res.status(400).json({ error: "Grade must be within the assignment score range." });
    const feedback = typeof req.body?.feedback === "string" ? req.body.feedback.trim() || null : undefined;
    const status = ["submitted", "reviewed", "returned"].includes(req.body?.status) ? req.body.status : (gradeValue !== null ? "reviewed" : existing.submission.status);
    const [row] = await db.update(submissionsTable).set({ gradeValue, feedback: feedback === undefined ? existing.submission.feedback : feedback, status }).where(eq(submissionsTable.id, existing.submission.id)).returning();
    res.json(row);
  } catch (e) { return next(e); }
});

router.post("/academic/grades", requireTeacher, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { studentId, classId, subjectId, termId, value, maxValue = 20, coefficient = 1, type = "assessment", comment } = req.body ?? {};
    if (!studentId || !classId || !subjectId || !termId || value === undefined) return res.status(400).json({ error: "studentId, classId, subjectId, termId and value are required." });
    if (!(await canOperateClass(req, classId))) return res.status(403).json({ error: "You are not assigned to this class." });
    if (Number(value) < 0 || Number(value) > Number(maxValue)) return res.status(400).json({ error: "Grade value is outside the allowed range." });
    const student = await db.select({ userId: studentProfilesTable.userId }).from(studentProfilesTable).where(and(eq(studentProfilesTable.userId, studentId), eq(studentProfilesTable.classId, classId))).limit(1);
    if (!student.length) return res.status(400).json({ error: "The selected student is not enrolled in this class." });
    if (!isSuperAdministrator(req)) {
      const subjectLink = await db.select({ id: timetableEntriesTable.id }).from(timetableEntriesTable).where(and(eq(timetableEntriesTable.classId, classId), eq(timetableEntriesTable.subjectId, subjectId), eq(timetableEntriesTable.teacherId, req.campusUserId!))).limit(1);
      if (!subjectLink.length) return res.status(403).json({ error: "You are not assigned to this subject in this class." });
    }
    const term = await db.select({ id: academicTermsTable.id }).from(academicTermsTable).where(eq(academicTermsTable.id, termId)).limit(1);
    if (!term.length) return res.status(400).json({ error: "Academic term not found." });
    const [row] = await db.insert(gradesTable).values({ id: randomUUID(), studentId, classId, subjectId, termId, value: Number(value), maxValue: Number(maxValue), coefficient: Number(coefficient), type, comment: comment ?? null, gradedBy: req.campusUserId!, gradedAt: new Date() }).onConflictDoUpdate({ target: [gradesTable.studentId, gradesTable.subjectId, gradesTable.termId, gradesTable.type], set: { value: Number(value), maxValue: Number(maxValue), coefficient: Number(coefficient), comment: comment ?? null, gradedBy: req.campusUserId!, gradedAt: new Date() } }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

export default router;

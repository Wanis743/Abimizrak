import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Response, type NextFunction, type Request } from "express";
import { and, desc, eq, gte, lt, sql, inArray } from "drizzle-orm";
import {
  academicStreamsTable,
  academicTermsTable,
  academicYearsTable,
  assignmentsTable,
  attendanceRecordsTable,
  db,
  departmentsTable,
  gradesTable,
  roomsTable,
  schoolClassesTable,
  schoolsTable,
  studentProfilesTable,
  subjectsTable,
  teacherProfilesTable,
  campusMembersTable, campusNotificationsTable, campusEventsTable, campusModerationReportsTable, campusVerificationAuditsTable,
} from "@workspace/db";
import { isAdministrator, isSuperAdministrator } from "../lib/authz";

const router: IRouter = Router();

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] ?? "" : String(value ?? "");
}
type AuthedRequest = Request & { campusUserId?: string };

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = (req as Request & { auth?: { userId?: string } | null }).auth;
  if (!auth?.userId) return res.status(401).json({ error: "Authentication required." });
  req.campusUserId = auth.userId;
  if (!isAdministrator(req)) return res.status(403).json({ error: "Administrator access required." });
  return next();
}
router.use(requireAdmin);

async function currentSchool() {
  const [school] = await db.select().from(schoolsTable).orderBy(schoolsTable.id).limit(1);
  return school ?? null;
}

function iso(value: Date | null | undefined) { return value ? value.toISOString() : null; }

router.get("/admin/overview", async (_req: AuthedRequest, res: Response, next) => {
  try {
    const [school, yearRows, classRows, subjectRows, teacherRows, studentRows, pendingRows, roomRows, assignmentRows] = await Promise.all([
      currentSchool(),
      db.select().from(academicYearsTable).orderBy(desc(academicYearsTable.startDate)),
      db.select().from(schoolClassesTable).orderBy(schoolClassesTable.label),
      db.select().from(subjectsTable).orderBy(subjectsTable.labelFr),
      db.execute(sql`select count(*)::int as count from teacher_profiles`),
      db.execute(sql`select count(*)::int as count from student_profiles`),
      db.execute(sql`select count(*)::int as count from campus_members where membership_status <> 'approved' or role_status <> 'approved'`),
      db.select().from(roomsTable).orderBy(roomsTable.code),
      db.select().from(assignmentsTable).orderBy(desc(assignmentsTable.createdAt)).limit(12),
    ]);
    const activeYear = yearRows.find((row: any) => row.status === "active") ?? yearRows[0] ?? null;
    const termRows = activeYear ? await db.select().from(academicTermsTable).where(eq(academicTermsTable.academicYearId, activeYear.id)).orderBy(academicTermsTable.order) : [];
    const [attendanceCount, gradeCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(attendanceRecordsTable),
      db.select({ count: sql<number>`count(*)` }).from(gradesTable),
    ]);
    res.json({
      school,
      activeYear: activeYear ? { id: activeYear.id, labelAr: activeYear.labelAr, labelFr: activeYear.labelFr, status: activeYear.status, startDate: iso(activeYear.startDate), endDate: iso(activeYear.endDate) } : null,
      terms: termRows,
      counts: { academicYears: yearRows.length, classes: classRows.length, subjects: subjectRows.length, teachers: Number((teacherRows as any).rows?.[0]?.count ?? 0), students: Number((studentRows as any).rows?.[0]?.count ?? 0), pendingVerification: Number((pendingRows as any).rows?.[0]?.count ?? 0), rooms: roomRows.length, assignments: assignmentRows.length, attendanceRecords: Number(attendanceCount[0]?.count ?? 0), grades: Number(gradeCount[0]?.count ?? 0) },
      recentAssignments: assignmentRows,
    });
  } catch (e) { return next(e); }
});

router.get("/admin/academic", async (_req: AuthedRequest, res: Response, next) => {
  try {
    const [years, terms, streams, departments, subjects, classes, rooms] = await Promise.all([
      db.select().from(academicYearsTable).orderBy(desc(academicYearsTable.startDate)),
      db.select().from(academicTermsTable).orderBy(desc(academicTermsTable.startDate)),
      db.select().from(academicStreamsTable).orderBy(academicStreamsTable.code),
      db.select().from(departmentsTable).orderBy(departmentsTable.labelFr),
      db.select().from(subjectsTable).orderBy(subjectsTable.labelFr),
      db.select().from(schoolClassesTable).orderBy(schoolClassesTable.label),
      db.select().from(roomsTable).orderBy(roomsTable.code),
    ]);
    res.json({ years, terms, streams, departments, subjects, classes, rooms });
  } catch (e) { return next(e); }
});

router.post("/admin/academic/years", async (req: AuthedRequest, res: Response, next) => {
  try {
    const school = await currentSchool();
    if (!school) return res.status(400).json({ error: "Create the school record before configuring an academic year." });
    const { labelAr, labelFr, startDate, endDate, status = "planning" } = req.body ?? {};
    if (!labelAr || !labelFr || !startDate || !endDate) return res.status(400).json({ error: "Arabic label, French label, start date and end date are required." });
    const [row] = await db.insert(academicYearsTable).values({ id: `ay-${randomUUID()}`, schoolId: school.id, labelAr, labelFr, startDate: new Date(startDate), endDate: new Date(endDate), status }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.patch("/admin/academic/years/:id", async (req: AuthedRequest, res: Response, next) => {
  try {
    const allowed = ["planning", "active", "closed"];
    const status = String(req.body?.status ?? "");
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid academic year status." });
    const targetId = String(routeParam(req, "id"));
    if (status === "active") await db.update(academicYearsTable).set({ status: "planning" });
    const [row] = await db.update(academicYearsTable).set({ status }).where(eq(academicYearsTable.id, targetId)).returning();
    if (!row) return res.status(404).json({ error: "Academic year not found." });
    res.json(row);
  } catch (e) { return next(e); }
});

router.post("/admin/academic/terms", async (req: AuthedRequest, res: Response, next) => {
  try {
    const { academicYearId, labelAr, labelFr, order, startDate, endDate, status = "upcoming" } = req.body ?? {};
    if (!academicYearId || !labelAr || !labelFr || order === undefined || !startDate || !endDate) return res.status(400).json({ error: "Academic year, labels, order and dates are required." });
    const [row] = await db.insert(academicTermsTable).values({ id: `term-${randomUUID()}`, academicYearId, labelAr, labelFr, order: Number(order), startDate: new Date(startDate), endDate: new Date(endDate), status }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.post("/admin/academic/streams", async (req: AuthedRequest, res: Response, next) => {
  try {
    const { code, labelAr, labelFr, applicableLevels = [] } = req.body ?? {};
    if (!code || !labelAr || !labelFr) return res.status(400).json({ error: "Code and labels are required." });
    const [row] = await db.insert(academicStreamsTable).values({ id: `stream-${randomUUID()}`, code, labelAr, labelFr, applicableLevels }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.post("/admin/academic/departments", async (req: AuthedRequest, res: Response, next) => {
  try {
    const school = await currentSchool();
    const { labelAr, labelFr } = req.body ?? {};
    if (!school || !labelAr || !labelFr) return res.status(400).json({ error: "School and department labels are required." });
    const [row] = await db.insert(departmentsTable).values({ id: `dept-${randomUUID()}`, schoolId: school.id, labelAr, labelFr }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.post("/admin/academic/subjects", async (req: AuthedRequest, res: Response, next) => {
  try {
    const school = await currentSchool();
    const { code, labelAr, labelFr, departmentId = null, icon = null, color = null } = req.body ?? {};
    if (!school || !code || !labelAr || !labelFr) return res.status(400).json({ error: "School, code and labels are required." });
    const [row] = await db.insert(subjectsTable).values({ id: `subject-${randomUUID()}`, schoolId: school.id, code, labelAr, labelFr, departmentId, icon, color }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.post("/admin/academic/classes", async (req: AuthedRequest, res: Response, next) => {
  try {
    const school = await currentSchool();
    const { academicYearId, levelCode, streamId = null, section, label, fullLabelAr = null, fullLabelFr = null, capacity = 40, spaceId = null } = req.body ?? {};
    if (!school || !academicYearId || !levelCode || !section || !label) return res.status(400).json({ error: "School, academic year, level, section and label are required." });
    const [row] = await db.insert(schoolClassesTable).values({ id: `class-${randomUUID()}`, schoolId: school.id, academicYearId, levelCode, streamId, section, label, fullLabelAr, fullLabelFr, capacity: Number(capacity), spaceId }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.post("/admin/academic/rooms", async (req: AuthedRequest, res: Response, next) => {
  try {
    const school = await currentSchool();
    const { code, labelAr = null, labelFr = null, type = "classroom", building = null, floor = 0, capacity = 30, equipment = [] } = req.body ?? {};
    if (!school || !code) return res.status(400).json({ error: "School and room code are required." });
    const [row] = await db.insert(roomsTable).values({ id: `room-${randomUUID()}`, schoolId: school.id, code, labelAr, labelFr, type, building, floor: Number(floor), capacity: Number(capacity), equipment, status: "available" }).returning();
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.patch("/admin/staff/students/:userId", async (req: AuthedRequest, res: Response, next) => {
  try {
    const userId = String(routeParam(req, "userId"));
    const classId = req.body?.classId ? String(req.body.classId) : null;
    const [student] = await db.select({ id: studentProfilesTable.id }).from(studentProfilesTable).where(eq(studentProfilesTable.userId, userId)).limit(1);
    if (!student) return res.status(404).json({ error: "Student profile not found." });
    const [row] = await db.update(studentProfilesTable).set({ classId }).where(eq(studentProfilesTable.id, student.id)).returning();
    res.json(row);
  } catch (e) { return next(e); }
});

router.get("/admin/staff", async (_req: AuthedRequest, res: Response, next) => {
  try {
    const teachers = await db.execute(sql`select t.user_id, u.display_name_fr, u.display_name_ar, u.email, t.department_id, t.qualifications from teacher_profiles t left join users u on u.id = t.user_id order by coalesce(u.display_name_fr, u.display_name_ar)`);
    const students = await db.execute(sql`select s.user_id, u.display_name_fr, u.display_name_ar, u.email, s.class_id, c.label as class_label from student_profiles s left join users u on u.id = s.user_id left join school_classes c on c.id = s.class_id order by coalesce(u.display_name_fr, u.display_name_ar)`);
    res.json({ teachers: ((teachers as any).rows ?? []).map((r:any) => ({ userId:r.user_id, name:r.display_name_fr ?? r.display_name_ar ?? r.user_id, email:r.email ?? null, departmentId:r.department_id, qualifications:r.qualifications ?? [] })), students: ((students as any).rows ?? []).map((r:any) => ({ userId:r.user_id, name:r.display_name_fr ?? r.display_name_ar ?? r.user_id, email:r.email ?? null, classId:r.class_id, classLabel:r.class_label ?? null })) });
  } catch (e) { return next(e); }
});

router.get("/admin/attendance/summary", async (req: AuthedRequest, res: Response, next) => {
  try {
    const classId = typeof req.query.classId === "string" ? req.query.classId : null;
    const from = typeof req.query.from === "string" ? req.query.from : null;
    const to = typeof req.query.to === "string" ? req.query.to : null;
    const conditions = [] as any[];
    if (classId) conditions.push(eq(attendanceRecordsTable.classId, classId));
    if (from) conditions.push(gte(attendanceRecordsTable.date, new Date(from)));
    if (to) conditions.push(lt(attendanceRecordsTable.date, new Date(to)));
    const rows = await db.select().from(attendanceRecordsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(attendanceRecordsTable.date));
    const summary = { present: 0, late: 0, absent: 0, excused: 0, total: rows.length };
    for (const row of rows) if (row.status in summary) (summary as any)[row.status] += 1;
    res.json({ summary, records: rows });
  } catch (e) { return next(e); }
});

router.get("/admin/audit", async (_req: AuthedRequest, res: Response, next) => {
  try {
    const rows = await db.execute(sql`select id, user_id, actor_user_id, action, note, created_at from campus_verification_audits order by created_at desc limit 100`);
    res.json((rows as any).rows ?? []);
  } catch (e) { return next(e); }
});


router.get("/admin/members", async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select().from(campusMembersTable).orderBy(desc(campusMembersTable.createdAt)).limit(500);
    res.json(rows.map((m: any) => ({ userId: m.userId, name: m.name, email: m.email, className: m.className, role: m.role, requestedRole: m.requestedRole, membershipStatus: m.membershipStatus, roleStatus: m.roleStatus, verified: m.verified, createdAt: m.createdAt, lastReviewedAt: m.lastReviewedAt, lastReviewNote: m.lastReviewNote })));
  } catch (e) { return next(e); }
});

router.patch("/admin/members/:userId", async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const targetUserId = String(routeParam(req, "userId"));
    const [target] = await db.select().from(campusMembersTable).where(eq(campusMembersTable.userId, targetUserId)).limit(1);
    if (!target) return res.status(404).json({ error: "Campus member not found." });
    const role = typeof req.body?.role === "string" && ["student","teacher","admin","staff","parent"].includes(req.body.role) ? req.body.role : undefined;
    const membershipStatus = typeof req.body?.membershipStatus === "string" && ["pending","approved","suspended","expired"].includes(req.body.membershipStatus) ? req.body.membershipStatus : undefined;
    const roleStatus = typeof req.body?.roleStatus === "string" && ["pending","approved","suspended","expired"].includes(req.body.roleStatus) ? req.body.roleStatus : undefined;
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : null;
    if ((role === "admin" || (target.role === "admin" && role && role !== "admin")) && !isSuperAdministrator(req)) return res.status(403).json({ error: "Only a configured super administrator can change administrator access." });
    const patch: any = { lastReviewedAt: new Date(), lastReviewNote: note };
    if (role) { patch.role = role; patch.requestedRole = role; }
    const nextMembership = membershipStatus ?? target.membershipStatus;
    const nextRoleStatus = roleStatus ?? target.roleStatus;
    if (membershipStatus) patch.membershipStatus = membershipStatus;
    if (roleStatus) patch.roleStatus = roleStatus;
    patch.verified = nextMembership === "approved" && nextRoleStatus === "approved";
    if (patch.verified && !target.verified) { patch.verifiedAt = new Date(); patch.verifiedBy = (req as Request & { auth?: { userId?: string } | null }).auth?.userId ?? targetUserId; }
    const [updated] = await db.update(campusMembersTable).set(patch).where(eq(campusMembersTable.userId, targetUserId)).returning();
    await db.insert(campusVerificationAuditsTable).values({ id: `audit-${randomUUID()}`, userId: targetUserId, actorUserId: (req as Request & { auth?: { userId?: string } | null }).auth?.userId ?? targetUserId, action: patch.membershipStatus === "suspended" || patch.roleStatus === "suspended" ? "suspended" : patch.verified ? "approved" : "submitted", note: note ?? "Administrative member state updated." });
    if (patch.verified) await db.insert(campusNotificationsTable).values({ id: `notification-${randomUUID()}`, userId: targetUserId, kind: "identity", title: "Campus access updated", body: "Your lycée membership is now approved.", targetUrl: "/identity" });
    res.json(updated);
  } catch (e) { return next(e); }
});

router.post("/admin/notifications/broadcast", async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 160) : "";
    const body = typeof req.body?.body === "string" ? req.body.body.trim().slice(0, 4000) : "";
    const kind = typeof req.body?.kind === "string" ? req.body.kind.trim().slice(0, 32) : "announcement";
    const targetUrl = typeof req.body?.targetUrl === "string" ? req.body.targetUrl.trim().slice(0, 500) : null;
    const requested = Array.isArray(req.body?.userIds) ? req.body.userIds.filter((v:any)=>typeof v==="string") : null;
    if (!title || !body) return res.status(400).json({ error: "Title and body are required." });
    const members = requested?.length ? await db.select({ userId: campusMembersTable.userId }).from(campusMembersTable).where(inArray(campusMembersTable.userId, requested)) : await db.select({ userId: campusMembersTable.userId }).from(campusMembersTable).where(eq(campusMembersTable.membershipStatus, "approved"));
    if (!members.length) return res.status(400).json({ error: "No recipients available." });
    await db.insert(campusNotificationsTable).values(members.map((m: any) => ({ id: `notification-${randomUUID()}`, userId: m.userId, kind, title, body, targetUrl })));
    res.status(201).json({ delivered: members.length });
  } catch (e) { return next(e); }
});

router.get("/admin/events", async (_req: AuthedRequest, res: Response, next: NextFunction) => { try { res.json(await db.select().from(campusEventsTable).orderBy(campusEventsTable.startTime)); } catch (e) { next(e); } });
router.post("/admin/events", async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const { spaceId, title, description, location, startTime, endTime } = req.body ?? {};
    if (!spaceId || !title || !description || !location || !startTime || !endTime) return res.status(400).json({ error: "Space, title, description, location, start and end time are required." });
    const start = new Date(startTime), end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return res.status(400).json({ error: "Invalid event interval." });
    const [row] = await db.insert(campusEventsTable).values({ id: `event-${randomUUID()}`, spaceId, title: String(title).trim().slice(0,160), description: String(description).trim().slice(0,4000), location: String(location).trim().slice(0,300), startTime: start, endTime: end }).returning();
    const members = await db.select({ userId: campusMembersTable.userId }).from(campusMembersTable).where(eq(campusMembersTable.membershipStatus, "approved"));
    if (members.length) await db.insert(campusNotificationsTable).values(members.map((m)=>({id:`notification-${randomUUID()}`,userId:m.userId,kind:"event",title:"New campus event",body:row.title,targetUrl:"/events"})));
    res.status(201).json(row);
  } catch (e) { return next(e); }
});

router.get("/admin/moderation", async (_req: AuthedRequest, res: Response, next: NextFunction) => { try { res.json(await db.select().from(campusModerationReportsTable).orderBy(desc(campusModerationReportsTable.createdAt)).limit(250)); } catch(e){next(e);} });
router.patch("/admin/moderation/:reportId", async (req: AuthedRequest, res: Response, next: NextFunction) => { try { const status = ["open","reviewing","resolved","dismissed"].includes(req.body?.status) ? req.body.status : "resolved"; const resolution = typeof req.body?.resolution === "string" ? req.body.resolution.trim().slice(0,1000) : null; const [row]=await db.update(campusModerationReportsTable).set({status,resolution,reviewerId:(req as Request & { auth?: { userId?: string } | null }).auth?.userId ?? null,reviewedAt:new Date()}).where(eq(campusModerationReportsTable.id, routeParam(req, "reportId"))).returning(); if(!row) return res.status(404).json({error:"Report not found."}); return res.json(row); } catch(e){ return next(e); } });

export default router;

import { randomUUID } from "node:crypto";
import { isSuperAdministrator } from "../lib/authz";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
const getAuth = (req: Request) =>
  (req as Request & { auth?: import("../lib/authz").AuthUser | null }).auth ??
  null;
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  campusMembersTable,
  campusMembershipsTable,
  campusPostsTable,
  campusSpacesTable,
  campusAssignmentsTable,
  campusSubmissionsTable,
  campusAttendanceTable,
  campusChannelsTable,
  campusMessagesTable,
  campusChannelReadsTable,
  campusThreadsTable,
  campusThreadReadsTable,
  campusVerificationAuditsTable,
  campusNotificationsTable,
  campusPostCommentsTable,
  campusPostReactionsTable,
  campusModerationReportsTable,
  campusPresenceTable,
  campusEventsTable,
  campusEventAttendeesTable,
  campusClubApplicationsTable,
  campusPortfoliosTable,
  campusMemberSkillsTable,
  campusSkillsTable,
  campusProjectsTable,
  campusProjectMembersTable,
  campusProjectMilestonesTable,
  campusRoomsTable,
  campusFacilityIssuesTable,
  campusFacilityIssueHistoryTable,
} from "@workspace/db";
import {
  canTransitionFacilityIssue,
  isFacilityIssueStatus,
} from "../lib/facilities";
import { createNotificationsOnce } from "../lib/notifications";
import {
  CreateAssignmentBody,
  Assignment,
  SubmitAssignmentBody,
  Submission,
  CreatePostBody,
  CreatePostResponse,
  GetCampusActivityResponse,
  GetCampusHomeResponse,
  GetIdentityCredentialResponse,
  GetSpaceParams,
  GetSpacePostsQueryParams,
  GetSpacePostsResponse,
  GetSpaceResponse,
  GetSpacesResponse,
  JoinSpaceParams,
  JoinSpaceResponse,
  GetVerificationStatusResponse,
  GetVerificationRequestsResponse,
  UpdateIdentityProfileBody,
  UpdateVerificationBody,
  UpdateVerificationParams,
  UpdateVerificationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const seededSpaces = [
  {
    id: "school-main",
    name: "School Campus",
    type: "school",
    description: "The main Lycée Abi Mizrak campus space.",
    memberCount: 0,
    status: "active",
    accent: "teal",
    channels: ["general", "announcements"],
    spotlight: "Official school communication",
  },
  {
    id: "campus-general",
    name: "Campus General",
    type: "community",
    description: "The shared school campus space.",
    memberCount: 0,
    status: "active",
    accent: "teal",
    channels: ["general", "announcements"],
    spotlight: "School-wide communication",
  },
  {
    id: "campus-projects",
    name: "Projects Lab",
    type: "project",
    description: "Build and share student projects.",
    memberCount: 0,
    status: "active",
    accent: "violet",
    channels: ["general", "showcase"],
    spotlight: "Student projects",
  },
];

const homeTemplates = {
  student: {
    roleLabel: "Student · Campus",
    nextActions: [],
    schedule: [],
    spotlight: null,
  },
  teacher: {
    roleLabel: "Teacher · Campus",
    nextActions: [],
    schedule: [],
    spotlight: null,
  },
  admin: {
    roleLabel: "Administrator · Campus",
    nextActions: [],
    schedule: [],
    spotlight: null,
  },
  staff: {
    roleLabel: "Staff · Campus",
    nextActions: [],
    schedule: [],
    spotlight: null,
  },
  parent: {
    roleLabel: "Parent · Campus",
    nextActions: [],
    schedule: [],
    spotlight: null,
  },
} as const;

const activitySeed: Array<Record<string, unknown>> = [];

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? (value[0] ?? "") : String(value ?? "");
}

type AuthenticatedRequest = Request & { campusUserId?: string };
type MembershipStatus = "pending" | "approved" | "suspended" | "expired";
type CampusRole = "student" | "teacher" | "admin" | "staff" | "parent";

type VerificationAuditAction =
  "submitted" | "approved" | "suspended" | "renewed";

function isAdministrator(req: Request): boolean {
  if (isSuperAdministrator(req)) return true;
  const userId = getAuth(req)?.userId;
  if (!userId) return false;
  const configuredIds = new Set(
    (process.env.CAMPUS_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
  return configuredIds.has(userId);
}

function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const userId = getAuth(req)?.userId;
  if (!userId)
    return res.status(401).json({ error: "Sign in to access your campus." });
  req.campusUserId = userId;
  return next();
}

function requireAdministrator(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!isAdministrator(req))
    return res.status(403).json({ error: "Administrator access required." });
  return next();
}

function requireSuperAdministrator(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!isSuperAdministrator(req))
    return res
      .status(403)
      .json({ error: "Super administrator access required." });
  return next();
}

async function ensureSeeded() {
  for (const space of seededSpaces) {
    await db
      .insert(campusSpacesTable)
      .values({ ...space, channels: [] })
      .onConflictDoNothing();
    for (const channelName of space.channels) {
      await db
        .insert(campusChannelsTable)
        .values({
          id: `${space.id}:${channelName}`,
          spaceId: space.id,
          name: channelName,
          type: "text",
        })
        .onConflictDoNothing();
    }
  }
}

function memberNameFromClaims(req: Request, userId: string) {
  const claims = getAuth(req)?.metadata as Record<string, unknown> | undefined;
  const name =
    claims?.name ??
    [claims?.first_name, claims?.last_name].filter(Boolean).join(" ");
  return typeof name === "string" && name.trim()
    ? name.trim()
    : `Campus member ${userId.slice(-4)}`;
}

function memberEmailFromClaims(req: Request, userId: string) {
  const email = getAuth(req)?.email;
  return typeof email === "string" ? email : `${userId}@campus.local`;
}

async function notifyUsers(
  userIds: string[],
  payload: {
    kind: string;
    title: string;
    body: string;
    targetUrl?: string | null;
    sourceKey: string;
    metadata?: Record<string, unknown> | null;
  },
) {
  await createNotificationsOnce(userIds, {
    eventKind: payload.kind,
    sourceKey: payload.sourceKey,
    title: payload.title,
    body: payload.body,
    targetUrl: payload.targetUrl ?? null,
    metadata: payload.metadata ?? null,
  });
}

async function writeVerificationAudit(
  userId: string,
  actorUserId: string,
  action: VerificationAuditAction,
  note: string | null,
) {
  await db.insert(campusVerificationAuditsTable).values({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    actorUserId,
    action,
    note,
  });
}

async function ensureMember(req: Request, userId: string) {
  const [existing] = await db
    .select()
    .from(campusMembersTable)
    .where(eq(campusMembersTable.userId, userId))
    .limit(1);
  const administrator = isAdministrator(req);
  const superAdministrator = isSuperAdministrator(req);
  if (existing) {
    if (
      administrator &&
      (existing.role !== "admin" ||
        existing.membershipStatus !== "approved" ||
        existing.roleStatus !== "approved" ||
        !existing.verified ||
        (superAdministrator && existing.requestedRole !== "admin"))
    ) {
      const [updated] = await db
        .update(campusMembersTable)
        .set({
          profileCompleted: true,
          verified: true,
          role: "admin",
          membershipStatus: "approved",
          roleStatus: "approved",
          requestedRole: "admin",
          verifiedAt: existing.verifiedAt ?? new Date(),
          verifiedBy: existing.verifiedBy ?? userId,
        })
        .where(eq(campusMembersTable.userId, userId))
        .returning();
      if (superAdministrator)
        await writeVerificationAudit(
          userId,
          userId,
          "approved",
          "Platform super administrator entitlement synchronized from configured allowlist.",
        );
      return updated;
    }
    return existing;
  }
  const [member] = await db
    .insert(campusMembersTable)
    .values({
      userId,
      name: memberNameFromClaims(req, userId),
      email: memberEmailFromClaims(req, userId),
      profileCompleted: administrator,
      verified: administrator,
      role: administrator ? "admin" : "student",
      requestedRole: administrator ? "admin" : "student",
      membershipStatus: administrator ? "approved" : "pending",
      roleStatus: administrator ? "approved" : "pending",
      verifiedAt: administrator ? new Date() : null,
      verifiedBy: administrator ? userId : null,
      credentialSerial: `ABM-${new Date().getFullYear().toString().slice(-2)}-${userId.slice(-6).toUpperCase()}`,
    })
    .returning();
  await db
    .insert(campusMembershipsTable)
    .values({
      id: `membership-${userId}-school-main`,
      userId,
      spaceId: "school-main",
    })
    .onConflictDoNothing();
  if (administrator)
    await writeVerificationAudit(
      userId,
      userId,
      "approved",
      superAdministrator
        ? "Platform super administrator entitlement synchronized from configured allowlist."
        : "Administrator membership synchronized.",
    );
  else
    await writeVerificationAudit(
      userId,
      userId,
      "submitted",
      "School affiliation created; awaiting administrator review.",
    );
  return member;
}

async function verificationFor(req: Request, userId = getAuth(req)?.userId!) {
  const member = await ensureMember(req, userId);
  const administrator =
    member.role === "admin" &&
    (userId === getAuth(req)?.userId ? isAdministrator(req) : true);
  return {
    userId,
    displayName: member.name,
    profileCompleted: member.profileCompleted,
    membershipStatus: member.membershipStatus as MembershipStatus,
    roleStatus: member.roleStatus as MembershipStatus,
    requestedRole: member.requestedRole as "student" | "teacher" | "admin",
    schoolYear: member.schoolYear,
    expiresOn: member.expiresOn,
    credentialSerial: member.verified ? member.credentialSerial : null,
    isAdministrator: administrator,
    lastReviewedAt: member.lastReviewedAt?.toISOString() ?? null,
    lastReviewNote: member.lastReviewNote ?? null,
    member,
  };
}

async function requireApprovedMembership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const status = await verificationFor(req);
    if (
      status.membershipStatus !== "approved" ||
      status.roleStatus !== "approved"
    ) {
      return res.status(403).json({
        error: "School verification is required",
        membershipStatus: status.membershipStatus,
        roleStatus: status.roleStatus,
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function verificationResponse(
  record: Awaited<ReturnType<typeof verificationFor>>,
) {
  const { member: _member, ...response } = record;
  return response;
}

async function getJoinedSpaceIds(userId: string) {
  const memberships = await db
    .select({ spaceId: campusMembershipsTable.spaceId })
    .from(campusMembershipsTable)
    .where(eq(campusMembershipsTable.userId, userId));
  return new Set(memberships.map((membership) => membership.spaceId));
}

function formatPostTime(createdAt: Date) {
  const age = Date.now() - createdAt.getTime();
  if (age < 60_000) return "Just now";
  const minutes = Math.floor(age / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ago`;
}

async function assertSpaceMembership(userId: string, spaceId: string) {
  const [membership] = await db
    .select({ id: campusMembershipsTable.id })
    .from(campusMembershipsTable)
    .where(
      and(
        eq(campusMembershipsTable.userId, userId),
        eq(campusMembershipsTable.spaceId, spaceId),
      ),
    )
    .limit(1);
  return Boolean(membership);
}

async function assertProjectMembership(userId: string, projectId: string) {
  const [membership] = await db
    .select({ id: campusProjectMembersTable.id })
    .from(campusProjectMembersTable)
    .where(
      and(
        eq(campusProjectMembersTable.userId, userId),
        eq(campusProjectMembersTable.projectId, projectId),
      ),
    )
    .limit(1);
  return Boolean(membership);
}

async function assertTeacherOrAdmin(req: AuthenticatedRequest) {
  const member = await ensureMember(req, req.campusUserId!);
  if (
    !isSuperAdministrator(req) &&
    member.role !== "teacher" &&
    member.role !== "admin"
  ) {
    const error = Object.assign(
      new Error("Teacher or administrator role required."),
      { status: 403 },
    );
    throw error;
  }
  return member;
}

router.use(requireAuth);

router.get(
  "/identity/verification",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const record = await verificationFor(req);
    res.json(GetVerificationStatusResponse.parse(verificationResponse(record)));
  },
);

router.patch(
  "/identity/profile",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const parsed = UpdateIdentityProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error:
          "Please provide your full name, class or department, and requested role.",
      });
      return;
    }
    const current = await ensureMember(req, req.campusUserId!);
    const administrator = isAdministrator(req);
    await db
      .update(campusMembersTable)
      .set({
        name: parsed.data.displayName.trim(),
        className: parsed.data.className.trim(),
        role: administrator ? "admin" : current.role,
        requestedRole: administrator ? "admin" : parsed.data.requestedRole,
        profileCompleted: true,
        verified: administrator ? true : false,
        membershipStatus: administrator ? "approved" : "pending",
        roleStatus: administrator ? "approved" : "pending",
        lastReviewedAt: administrator ? new Date() : null,
        lastReviewNote: administrator ? "Configured administrator." : null,
        verifiedAt: administrator ? (current.verifiedAt ?? new Date()) : null,
        verifiedBy: administrator
          ? (current.verifiedBy ?? req.campusUserId!)
          : null,
      })
      .where(eq(campusMembersTable.userId, req.campusUserId!));
    if (!administrator)
      await writeVerificationAudit(
        req.campusUserId!,
        req.campusUserId!,
        "submitted",
        "School profile submitted for administrator review.",
      );
    const updated = await verificationFor(req);
    res.json(
      GetVerificationStatusResponse.parse(verificationResponse(updated)),
    );
  },
);

router.get(
  "/identity/verification/requests",
  requireAdministrator,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const members = await db.select().from(campusMembersTable);
    const requests = await Promise.all(
      members.map(async (member) => {
        const record = await verificationFor(req, member.userId);
        const auditRows = await db
          .select()
          .from(campusVerificationAuditsTable)
          .where(eq(campusVerificationAuditsTable.userId, member.userId))
          .orderBy(desc(campusVerificationAuditsTable.createdAt));
        return {
          ...verificationResponse(record),
          audit: auditRows.map((entry) => ({
            action: entry.action,
            actorUserId: entry.actorUserId,
            createdAt: entry.createdAt.toISOString(),
            note: entry.note,
          })),
        };
      }),
    );
    res.json(GetVerificationRequestsResponse.parse(requests));
  },
);

router.patch(
  "/identity/verification/:userId",
  requireAdministrator,
  async (req: AuthenticatedRequest, res, next): Promise<void> => {
    try {
      const parsedParams = UpdateVerificationParams.safeParse(req.params);
      if (!parsedParams.success) {
        res.status(400).json({ error: parsedParams.error.message });
        return;
      }
      const parsedBody = UpdateVerificationBody.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({ error: parsedBody.error.message });
        return;
      }
      const target = await ensureMember(req, parsedParams.data.userId);
      const action = parsedBody.data.action;
      const status: MembershipStatus =
        action === "suspend" ? "suspended" : "approved";
      const role =
        parsedBody.data.role ??
        (target.role === "teacher" || target.role === "admin"
          ? target.role
          : "student");
      if (role === "admin" && !isSuperAdministrator(req)) {
        res.status(403).json({
          error:
            "Only a configured super administrator can grant administrator access.",
        });
        return;
      }
      if (
        target.role === "admin" &&
        role !== "admin" &&
        !isSuperAdministrator(req)
      ) {
        res.status(403).json({
          error:
            "Only a configured super administrator can change administrator access.",
        });
        return;
      }
      const now = new Date();
      const expiresOn = action === "renew" ? "2027-06-30" : target.expiresOn;
      await db
        .update(campusMembersTable)
        .set({
          verified: status === "approved",
          role,
          requestedRole: role,
          membershipStatus: status,
          roleStatus: status,
          expiresOn,
          lastReviewedAt: now,
          lastReviewNote: parsedBody.data.note ?? null,
          verifiedAt: status === "approved" ? (target.verifiedAt ?? now) : null,
          verifiedBy: status === "approved" ? req.campusUserId! : null,
        })
        .where(eq(campusMembersTable.userId, target.userId));
      await writeVerificationAudit(
        target.userId,
        req.campusUserId!,
        action === "approve"
          ? "approved"
          : action === "renew"
            ? "renewed"
            : "suspended",
        parsedBody.data.note ?? null,
      );
      const [updated] = await db
        .select()
        .from(campusMembersTable)
        .where(eq(campusMembersTable.userId, target.userId))
        .limit(1);
      const auditRows = await db
        .select()
        .from(campusVerificationAuditsTable)
        .where(eq(campusVerificationAuditsTable.userId, target.userId))
        .orderBy(desc(campusVerificationAuditsTable.createdAt));
      const updatedStatus = await verificationFor(req, target.userId);
      res.json(
        UpdateVerificationResponse.parse({
          ...verificationResponse(updatedStatus),
          audit: auditRows.map((entry) => ({
            action: entry.action,
            actorUserId: entry.actorUserId,
            createdAt: entry.createdAt.toISOString(),
            note: entry.note,
          })),
        }),
      );
    } catch (error) {
      return next(error);
    }
  },
);

router.use(requireApprovedMembership);

router.get(
  "/search",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (query.length < 2) {
      res.json({ query, results: [] });
      return;
    }

    const needle = query.toLocaleLowerCase();
    const [spaces, projects, events, members, portfolios, memberSkills, skills] =
      await Promise.all([
        db.select().from(campusSpacesTable),
        db.select().from(campusProjectsTable),
        db.select().from(campusEventsTable),
        db
          .select()
          .from(campusMembersTable)
          .where(eq(campusMembersTable.membershipStatus, "approved")),
        db.select().from(campusPortfoliosTable),
        db.select().from(campusMemberSkillsTable),
        db.select().from(campusSkillsTable),
      ]);
    const skillNameById = new Map(skills.map((skill) => [skill.id, skill.name]));
    const portfolioByUserId = new Map(
      portfolios.map((portfolio) => [portfolio.userId, portfolio]),
    );
    const searchable = (value: unknown) =>
      String(value ?? "").toLocaleLowerCase().includes(needle);
    const results = [
      ...members
        .filter(
          (member) =>
            ["student", "teacher"].includes(member.role) &&
            !(
              member.email &&
              (process.env.CAMPUS_SUPERADMIN_EMAILS ?? "")
                .toLocaleLowerCase()
                .split(",")
                .map((email) => email.trim())
                .includes(member.email.toLocaleLowerCase())
            ),
        )
        .filter((member) => {
          const portfolio = portfolioByUserId.get(member.userId);
          const skillNames = memberSkills
            .filter((row) => row.userId === member.userId)
            .map((row) => skillNameById.get(row.skillId))
            .join(" " );
          return (
            searchable(member.name) ||
            searchable(member.className) ||
            searchable(portfolio?.bio) ||
            searchable(skillNames)
          );
        })
        .map((member) => ({
          id: member.userId,
          kind: "person" as const,
          title: member.name,
          detail: `${member.role} · ${member.className}`,
          href: `/talent/${encodeURIComponent(member.userId)}`,
        })),
      ...spaces
        .filter(
          (space) =>
            searchable(space.name) ||
            searchable(space.description) ||
            searchable(space.type),
        )
        .map((space) => ({
          id: space.id,
          kind: "space" as const,
          title: space.name,
          detail: space.description,
          href: `/spaces/${encodeURIComponent(space.id)}`,
        })),
      ...projects
        .filter(
          (project) =>
            searchable(project.name) || searchable(project.description),
        )
        .map((project) => ({
          id: project.id,
          kind: "project" as const,
          title: project.name,
          detail: project.description,
          href: `/projects/${encodeURIComponent(project.id)}`,
        })),
      ...events
        .filter(
          (event) =>
            searchable(event.title) ||
            searchable(event.description) ||
            searchable(event.location),
        )
        .map((event) => ({
          id: event.id,
          kind: "event" as const,
          title: event.title,
          detail: event.location || event.description || "Campus event",
          href: "/events",
        })),
    ].slice(0, 24);

    res.json({ query, results });
  },
);

router.get(
  "/campus/home",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    await ensureSeeded();
    const member = await ensureMember(req, req.campusUserId!);
    const template =
      homeTemplates[member.role as keyof typeof homeTemplates] ??
      homeTemplates.student;
    const firstName = member.name.split(" ")[0];
    res.json(
      GetCampusHomeResponse.parse({
        greeting: `Welcome back, ${firstName}.`,
        roleLabel:
          member.role === "student"
            ? `${template.roleLabel.split(" · ")[0]} · ${member.className}`
            : template.roleLabel,
        schoolPulse: 22,
        nextActions: template.nextActions,
        schedule: template.schedule,
        spotlight: template.spotlight,
      }),
    );
  },
);

router.get(
  "/campus/activity",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    await ensureSeeded();
    const posts = await db
      .select()
      .from(campusPostsTable)
      .orderBy(desc(campusPostsTable.createdAt))
      .limit(10);
    const postActivity = posts.map((post) => ({
      id: post.id,
      kind:
        post.kind === "event"
          ? "event"
          : post.kind === "project"
            ? "project"
            : "resource",
      title: `${post.authorName} posted in a campus space`,
      detail: post.body,
      time: formatPostTime(post.createdAt),
      accent: "teal",
      actor: post.authorName,
    }));
    res.json(
      GetCampusActivityResponse.parse([...postActivity, ...activitySeed]),
    );
  },
);

router.get("/spaces", async (req: AuthenticatedRequest, res): Promise<void> => {
  await ensureSeeded();
  const joinedIds = await getJoinedSpaceIds(req.campusUserId!);
  const spaces = await db.select().from(campusSpacesTable);
  res.json(
    GetSpacesResponse.parse(
      spaces.map((space) => ({
        id: space.id,
        name: space.name,
        type: space.type,
        description: space.description,
        members: space.memberCount,
        status: space.status,
        accent: space.accent,
        joined: joinedIds.has(space.id),
      })),
    ),
  );
});

router.get(
  "/spaces/:spaceId",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    await ensureSeeded();
    const { spaceId } = GetSpaceParams.parse(req.params);
    const [space] = await db
      .select()
      .from(campusSpacesTable)
      .where(eq(campusSpacesTable.id, spaceId))
      .limit(1);
    if (!space) {
      res.status(404).json({ error: "Space not found" });
      return;
    }
    const joinedIds = await getJoinedSpaceIds(req.campusUserId!);
    res.json(
      GetSpaceResponse.parse({
        id: space.id,
        name: space.name,
        type: space.type,
        description: space.description,
        members: space.memberCount,
        status: space.status,
        accent: space.accent,
        joined: joinedIds.has(space.id),
        channels: (
          await db
            .select({ name: campusChannelsTable.name })
            .from(campusChannelsTable)
            .where(eq(campusChannelsTable.spaceId, space.id))
        ).map((row) => row.name),
        spotlight: space.spotlight,
      }),
    );
  },
);

router.post(
  "/spaces/:spaceId/join",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    await ensureSeeded();
    const { spaceId } = JoinSpaceParams.parse(req.params);
    const [space] = await db
      .select()
      .from(campusSpacesTable)
      .where(eq(campusSpacesTable.id, spaceId))
      .limit(1);
    if (!space) {
      res.status(404).json({ error: "Space not found" });
      return;
    }

    const userId = req.campusUserId!;
    const [membership] = await db
      .select()
      .from(campusMembershipsTable)
      .where(
        and(
          eq(campusMembershipsTable.userId, userId),
          eq(campusMembershipsTable.spaceId, spaceId),
        ),
      )
      .limit(1);

    if (membership) {
      await db
        .delete(campusMembershipsTable)
        .where(eq(campusMembershipsTable.id, membership.id));
    } else {
      await db
        .insert(campusMembershipsTable)
        .values({
          id: `membership-${userId}-${spaceId}`,
          userId: userId,
          spaceId,
        })
        .onConflictDoNothing();
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(campusMembershipsTable)
      .where(eq(campusMembershipsTable.spaceId, spaceId));
    const memberCount = Number(total);
    await db
      .update(campusSpacesTable)
      .set({ memberCount })
      .where(eq(campusSpacesTable.id, spaceId));
    res.json(
      JoinSpaceResponse.parse({ spaceId, joined: !membership, memberCount }),
    );
  },
);

router.get(
  "/identity/credential",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const member = await ensureMember(req, req.campusUserId!);
    res.json(
      GetIdentityCredentialResponse.parse({
        id: member.userId,
        name: member.name,
        className: member.className,
        role: member.role === "student" ? "Verified Student" : member.role,
        year: member.schoolYear,
        verified: member.verified,
        expires: new Date(`${member.expiresOn}T00:00:00Z`).toLocaleDateString(
          "en-GB",
          { day: "2-digit", month: "short", year: "numeric" },
        ),
        serial: member.credentialSerial,
      }),
    );
  },
);

router.get(
  "/social/posts",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const { spaceId } = GetSpacePostsQueryParams.parse(req.query);
    if (
      !(await assertSpaceMembership(req.campusUserId!, spaceId)) &&
      !isAdministrator(req)
    ) {
      res
        .status(403)
        .json({ error: "Join the space to view its social feed." });
      return;
    }
    const posts = await db
      .select()
      .from(campusPostsTable)
      .where(eq(campusPostsTable.spaceId, spaceId))
      .orderBy(desc(campusPostsTable.createdAt));
    res.json(
      GetSpacePostsResponse.parse(
        posts.map((post) => ({
          spaceId: post.spaceId,
          kind: post.kind,
          body: post.body,
          id: post.id,
          author: post.authorName,
          time: formatPostTime(post.createdAt),
        })),
      ),
    );
  },
);

router.post(
  "/social/posts",
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const body = CreatePostBody.parse(req.body);
    const member = await ensureMember(req, req.campusUserId!);
    if (
      !(await assertSpaceMembership(member.userId, body.spaceId)) &&
      !isAdministrator(req)
    ) {
      res.status(403).json({ error: "Join the space before posting." });
      return;
    }
    const [post] = await db
      .insert(campusPostsTable)
      .values({
        ...body,
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: member.userId,
        authorName: member.name,
      })
      .returning();
    res.status(201).json(
      CreatePostResponse.parse({
        spaceId: post.spaceId,
        kind: post.kind,
        body: post.body,
        id: post.id,
        author: post.authorName,
        time: formatPostTime(post.createdAt),
      }),
    );
  },
);

router.get(
  "/social/posts/:postId/discussion",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const [post] = await db
      .select()
      .from(campusPostsTable)
      .where(eq(campusPostsTable.id, routeParam(req, "postId")))
      .limit(1);
    if (!post) {
      res.status(404).json({ error: "Post not found." });
      return;
    }
    if (
      !(await assertSpaceMembership(req.campusUserId!, post.spaceId)) &&
      !isAdministrator(req)
    ) {
      res
        .status(403)
        .json({ error: "Join the space to access this discussion." });
      return;
    }
    const [comments, reactions] = await Promise.all([
      db
        .select()
        .from(campusPostCommentsTable)
        .where(eq(campusPostCommentsTable.postId, post.id))
        .orderBy(campusPostCommentsTable.createdAt),
      db
        .select()
        .from(campusPostReactionsTable)
        .where(eq(campusPostReactionsTable.postId, post.id)),
    ]);
    const counts = reactions.reduce((acc: Record<string, number>, row) => {
      acc[row.reaction] = (acc[row.reaction] ?? 0) + 1;
      return acc;
    }, {});
    res.json({
      comments,
      reactions: counts,
      viewerReactions: reactions
        .filter((r) => r.userId === req.campusUserId!)
        .map((r) => r.reaction),
    });
  },
);

router.post(
  "/social/posts/:postId/comments",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const body =
      typeof req.body?.body === "string"
        ? req.body.body.trim().slice(0, 2000)
        : "";
    if (!body) {
      res.status(400).json({ error: "Comment text is required." });
      return;
    }
    const [post] = await db
      .select()
      .from(campusPostsTable)
      .where(eq(campusPostsTable.id, routeParam(req, "postId")))
      .limit(1);
    if (!post) {
      res.status(404).json({ error: "Post not found." });
      return;
    }
    if (
      !(await assertSpaceMembership(req.campusUserId!, post.spaceId)) &&
      !isAdministrator(req)
    ) {
      res.status(403).json({ error: "Join the space before commenting." });
      return;
    }
    const member = await ensureMember(req, req.campusUserId!);
    const [comment] = await db
      .insert(campusPostCommentsTable)
      .values({
        id: `comment-${randomUUID()}`,
        postId: post.id,
        userId: member.userId,
        body,
      })
      .returning();
    if (post.userId !== member.userId)
      await notifyUsers([post.userId], {
        kind: "social",
        sourceKey: `post-comment:${comment.id}`,
        title: `${member.name} commented on your post`,
        body: body.slice(0, 140),
        targetUrl: `/spaces/${post.spaceId}`,
      });
    res.status(201).json(comment);
  },
);

router.post(
  "/social/posts/:postId/reactions",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const reaction =
      typeof req.body?.reaction === "string"
        ? req.body.reaction.trim().slice(0, 32)
        : "like";
    if (!/^[a-z0-9_-]+$/i.test(reaction)) {
      res.status(400).json({ error: "Invalid reaction." });
      return;
    }
    const [post] = await db
      .select()
      .from(campusPostsTable)
      .where(eq(campusPostsTable.id, routeParam(req, "postId")))
      .limit(1);
    if (!post) {
      res.status(404).json({ error: "Post not found." });
      return;
    }
    if (
      !(await assertSpaceMembership(req.campusUserId!, post.spaceId)) &&
      !isAdministrator(req)
    ) {
      res.status(403).json({ error: "Join the space before reacting." });
      return;
    }
    const [existing] = await db
      .select()
      .from(campusPostReactionsTable)
      .where(
        and(
          eq(campusPostReactionsTable.postId, post.id),
          eq(campusPostReactionsTable.userId, req.campusUserId!),
          eq(campusPostReactionsTable.reaction, reaction),
        ),
      )
      .limit(1);
    if (existing)
      await db
        .delete(campusPostReactionsTable)
        .where(eq(campusPostReactionsTable.id, existing.id));
    else
      await db.insert(campusPostReactionsTable).values({
        id: `reaction-${randomUUID()}`,
        postId: post.id,
        userId: req.campusUserId!,
        reaction,
      });
    const reactions = await db
      .select()
      .from(campusPostReactionsTable)
      .where(eq(campusPostReactionsTable.postId, post.id));
    const counts = reactions.reduce((acc: Record<string, number>, row) => {
      acc[row.reaction] = (acc[row.reaction] ?? 0) + 1;
      return acc;
    }, {});
    res.json({ reaction, active: !existing, counts });
  },
);

router.post(
  "/moderation/reports",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const targetType =
      typeof req.body?.targetType === "string"
        ? req.body.targetType.trim()
        : "";
    const targetId =
      typeof req.body?.targetId === "string" ? req.body.targetId.trim() : "";
    const reason =
      typeof req.body?.reason === "string"
        ? req.body.reason.trim().slice(0, 120)
        : "";
    const details =
      typeof req.body?.details === "string"
        ? req.body.details.trim().slice(0, 2000)
        : null;
    if (
      !["post", "comment", "message", "event"].includes(targetType) ||
      !targetId ||
      !reason
    ) {
      res
        .status(400)
        .json({ error: "A valid target and reason are required." });
      return;
    }
    const [report] = await db
      .insert(campusModerationReportsTable)
      .values({
        id: `report-${randomUUID()}`,
        reporterId: req.campusUserId!,
        targetType,
        targetId,
        reason,
        details,
      })
      .returning();
    res.status(201).json(report);
  },
);

router.get(
  "/projects",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.campusUserId!;
    const memberships = await db
      .select({ projectId: campusProjectMembersTable.projectId })
      .from(campusProjectMembersTable)
      .where(eq(campusProjectMembersTable.userId, userId));
    const memberProjectIds = new Set(memberships.map((row) => row.projectId));
    const projects = (await db
      .select()
      .from(campusProjectsTable)
      .orderBy(desc(campusProjectsTable.createdAt)))
      .filter((project) => project.visibility === "public" || memberProjectIds.has(project.id) || isAdministrator(req));
    res.json(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        visibility: project.visibility,
        createdAt: project.createdAt.toISOString(),
      })),
    );
  },
);

router.post(
  "/projects",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const member = await ensureMember(req, req.campusUserId!);
    const name =
      typeof req.body?.name === "string"
        ? req.body.name.trim().slice(0, 160)
        : "";
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim().slice(0, 4000)
        : "";
    if (!name || !description) {
      res
        .status(400)
        .json({ error: "Project name and description are required." });
      return;
    }
    const status = req.body?.status === "active" ? "active" : "idea";
    const visibility = req.body?.visibility === "private" ? "private" : "public";
    const id = `project-${randomUUID()}`;
    const [project] = await db
      .insert(campusProjectsTable)
      .values({ id, name, description, status, visibility })
      .returning();
    await db.insert(campusProjectMembersTable).values({
      id: `project-member-${randomUUID()}`,
      projectId: id,
      userId: member.userId,
      role: "creator",
    });
    await db
      .insert(campusChannelsTable)
      .values({
        id: `${id}:project-general`,
        spaceId: id,
        name: "project-general",
        type: "text",
      })
      .onConflictDoNothing();
    res.status(201).json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      visibility: project.visibility,
      createdAt: project.createdAt.toISOString(),
    });
  },
);

router.get(
  "/projects/:projectId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const [project] = await db
      .select()
      .from(campusProjectsTable)
      .where(eq(campusProjectsTable.id, String(routeParam(req, "projectId"))))
      .limit(1);
    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    const viewerMembership = await db
      .select({ role: campusProjectMembersTable.role })
      .from(campusProjectMembersTable)
      .where(and(eq(campusProjectMembersTable.projectId, project.id), eq(campusProjectMembersTable.userId, req.campusUserId!)))
      .limit(1);
    if (project.visibility === "private" && !viewerMembership.length && !isAdministrator(req)) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    const [members, milestones] = await Promise.all([
      db
        .select({
          id: campusProjectMembersTable.id,
          userId: campusProjectMembersTable.userId,
          role: campusProjectMembersTable.role,
          joinedAt: campusProjectMembersTable.joinedAt,
          name: campusMembersTable.name,
        })
        .from(campusProjectMembersTable)
        .leftJoin(
          campusMembersTable,
          eq(campusMembersTable.userId, campusProjectMembersTable.userId),
        )
        .where(eq(campusProjectMembersTable.projectId, project.id)),
      db
        .select()
        .from(campusProjectMilestonesTable)
        .where(eq(campusProjectMilestonesTable.projectId, project.id))
        .orderBy(campusProjectMilestonesTable.createdAt),
    ]);
    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        visibility: project.visibility,
        createdAt: project.createdAt.toISOString(),
      },
      members: members.map((member) => ({
        ...member,
        joinedAt: member.joinedAt.toISOString(),
      })),
      milestones: milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        status: milestone.status,
        dueDate: milestone.dueDate?.toISOString() ?? null,
        createdAt: milestone.createdAt.toISOString(),
      })),
      viewer: {
        isMember: members.some(
          (member) => member.userId === req.campusUserId,
        ),
        isCreator: members.some(
          (member) =>
            member.userId === req.campusUserId && member.role === "creator",
        ),
        canManage: isAdministrator(req) || members.some((member) => member.userId === req.campusUserId && member.role === "creator"),
      },
    });
  },
);

router.post(
  "/projects/:projectId/join",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const [project] = await db
      .select({ id: campusProjectsTable.id, visibility: campusProjectsTable.visibility })
      .from(campusProjectsTable)
      .where(eq(campusProjectsTable.id, String(routeParam(req, "projectId"))))
      .limit(1);
    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    if (project.visibility === "private" && !isAdministrator(req)) {
      res.status(403).json({ error: "Private projects require an invitation." });
      return;
    }
    await db
      .insert(campusProjectMembersTable)
      .values({
        id: `project-member-${randomUUID()}`,
        projectId: project.id,
        userId: req.campusUserId!,
        role: "member",
      })
      .onConflictDoNothing();
    res.status(204).end();
  },
);

router.patch(
  "/projects/:projectId/settings",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const projectId = routeParam(req, "projectId");
    const [membership] = await db.select({ role: campusProjectMembersTable.role })
      .from(campusProjectMembersTable)
      .where(and(eq(campusProjectMembersTable.projectId, projectId), eq(campusProjectMembersTable.userId, req.campusUserId!)))
      .limit(1);
    if (membership?.role !== "creator" && !isAdministrator(req)) {
      res.status(403).json({ error: "Project creator access required." });
      return;
    }
    const status = typeof req.body?.status === "string" ? req.body.status : undefined;
    const visibility = typeof req.body?.visibility === "string" ? req.body.visibility : undefined;
    if (status !== undefined && !["idea", "active", "completed"].includes(status)) {
      res.status(400).json({ error: "Unsupported project status." });
      return;
    }
    if (visibility !== undefined && !["public", "private"].includes(visibility)) {
      res.status(400).json({ error: "Unsupported project visibility." });
      return;
    }
    const [current] = await db.select().from(campusProjectsTable).where(eq(campusProjectsTable.id, projectId)).limit(1);
    if (!current) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    const transitions: Record<string, string[]> = { idea: ["active"], active: ["completed"], completed: [] };
    if (status && status !== current.status && !transitions[current.status]?.includes(status)) {
      res.status(409).json({ error: `Cannot transition project from ${current.status} to ${status}.` });
      return;
    }
    const [updated] = await db.update(campusProjectsTable)
      .set({ ...(status ? { status } : {}), ...(visibility ? { visibility } : {}) })
      .where(eq(campusProjectsTable.id, projectId)).returning();
    res.json(updated);
  },
);

router.post(
  "/projects/:projectId/members",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const projectId = routeParam(req, "projectId");
    const [membership] = await db.select({ role: campusProjectMembersTable.role })
      .from(campusProjectMembersTable)
      .where(and(eq(campusProjectMembersTable.projectId, projectId), eq(campusProjectMembersTable.userId, req.campusUserId!))).limit(1);
    if (membership?.role !== "creator" && !isAdministrator(req)) {
      res.status(403).json({ error: "Project creator access required." });
      return;
    }
    const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
    const role = req.body?.role === "mentor" ? "mentor" : "member";
    if (!userId) { res.status(400).json({ error: "Member user ID is required." }); return; }
    const [member] = await db.select({ userId: campusMembersTable.userId }).from(campusMembersTable)
      .where(and(eq(campusMembersTable.userId, userId), eq(campusMembersTable.membershipStatus, "approved"))).limit(1);
    if (!member) { res.status(404).json({ error: "Approved campus member not found." }); return; }
    const [created] = await db.insert(campusProjectMembersTable).values({ id: `project-member-${randomUUID()}`, projectId, userId, role })
      .onConflictDoNothing().returning();
    res.status(created ? 201 : 200).json(created ?? { projectId, userId, role });
  },
);

router.delete(
  "/projects/:projectId/members/:userId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const projectId = routeParam(req, "projectId");
    const targetUserId = routeParam(req, "userId");
    const [viewer] = await db.select({ role: campusProjectMembersTable.role }).from(campusProjectMembersTable)
      .where(and(eq(campusProjectMembersTable.projectId, projectId), eq(campusProjectMembersTable.userId, req.campusUserId!))).limit(1);
    if (viewer?.role !== "creator" && !isAdministrator(req)) { res.status(403).json({ error: "Project creator access required." }); return; }
    const [target] = await db.select({ role: campusProjectMembersTable.role }).from(campusProjectMembersTable)
      .where(and(eq(campusProjectMembersTable.projectId, projectId), eq(campusProjectMembersTable.userId, targetUserId))).limit(1);
    if (!target) { res.status(404).json({ error: "Project member not found." }); return; }
    if (target.role === "creator") { res.status(409).json({ error: "The project creator cannot be removed." }); return; }
    await db.delete(campusProjectMembersTable).where(and(eq(campusProjectMembersTable.projectId, projectId), eq(campusProjectMembersTable.userId, targetUserId)));
    res.status(204).end();
  },
);

router.post(
  "/projects/:projectId/milestones",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const projectId = String(routeParam(req, "projectId"));
    const title =
      typeof req.body?.title === "string"
        ? req.body.title.trim().slice(0, 240)
        : "";
    if (!title) {
      res.status(400).json({ error: "Milestone title is required." });
      return;
    }
    const [membership] = await db
      .select({ role: campusProjectMembersTable.role })
      .from(campusProjectMembersTable)
      .where(
        and(
          eq(campusProjectMembersTable.projectId, projectId),
          eq(campusProjectMembersTable.userId, req.campusUserId!),
        ),
      )
      .limit(1);
    if (membership?.role !== "creator" && !isAdministrator(req)) {
      res.status(403).json({ error: "Project creator access required." });
      return;
    }
    const dueDate =
      typeof req.body?.dueDate === "string" && req.body.dueDate
        ? new Date(req.body.dueDate)
        : null;
    const [milestone] = await db
      .insert(campusProjectMilestonesTable)
      .values({
        id: `milestone-${randomUUID()}`,
        projectId,
        title,
        status: "pending",
        dueDate,
      })
      .returning();
    res.status(201).json({
      id: milestone.id,
      title: milestone.title,
      status: milestone.status,
      dueDate: milestone.dueDate?.toISOString() ?? null,
      createdAt: milestone.createdAt.toISOString(),
    });
  },
);

router.patch(
  "/projects/:projectId/milestones/:milestoneId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const projectId = String(routeParam(req, "projectId"));
    const milestoneId = String(routeParam(req, "milestoneId"));
    const [membership] = await db
      .select({ role: campusProjectMembersTable.role })
      .from(campusProjectMembersTable)
      .where(
        and(
          eq(campusProjectMembersTable.projectId, projectId),
          eq(campusProjectMembersTable.userId, req.campusUserId!),
        ),
      )
      .limit(1);
    if (membership?.role !== "creator" && !isAdministrator(req)) {
      res.status(403).json({ error: "Project creator access required." });
      return;
    }
    const nextStatus =
      req.body?.status === "completed" ? "completed" : "pending";
    const [milestone] = await db
      .update(campusProjectMilestonesTable)
      .set({ status: nextStatus })
      .where(
        and(
          eq(campusProjectMilestonesTable.id, milestoneId),
          eq(campusProjectMilestonesTable.projectId, projectId),
        ),
      )
      .returning();
    if (!milestone) {
      res.status(404).json({ error: "Milestone not found." });
      return;
    }
    res.json({
      id: milestone.id,
      title: milestone.title,
      status: milestone.status,
      dueDate: milestone.dueDate?.toISOString() ?? null,
      createdAt: milestone.createdAt.toISOString(),
    });
  },
);

router.get(
  "/assignments",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const member = await ensureMember(req, req.campusUserId!);
    const assignments =
      isSuperAdministrator(req) ||
      member.role === "teacher" ||
      member.role === "admin"
        ? await db
            .select()
            .from(campusAssignmentsTable)
            .orderBy(desc(campusAssignmentsTable.createdAt))
        : await db
            .select({
              id: campusAssignmentsTable.id,
              spaceId: campusAssignmentsTable.spaceId,
              title: campusAssignmentsTable.title,
              description: campusAssignmentsTable.description,
              dueDate: campusAssignmentsTable.dueDate,
              maxScore: campusAssignmentsTable.maxScore,
              createdAt: campusAssignmentsTable.createdAt,
            })
            .from(campusAssignmentsTable)
            .innerJoin(
              campusMembershipsTable,
              eq(
                campusMembershipsTable.spaceId,
                campusAssignmentsTable.spaceId,
              ),
            )
            .where(eq(campusMembershipsTable.userId, member.userId))
            .orderBy(desc(campusAssignmentsTable.createdAt));
    res.json(assignments);
  },
);

router.post(
  "/assignments",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const body = CreateAssignmentBody.parse(req.body);
    await assertTeacherOrAdmin(req);
    if (!(await assertSpaceMembership(req.campusUserId!, body.spaceId))) {
      res
        .status(403)
        .json({ error: "You must be a member of the target class space." });
      return;
    }
    const [assignment] = await db
      .insert(campusAssignmentsTable)
      .values({
        id: `assignment-${randomUUID()}`,
        spaceId: body.spaceId,
        title: body.title.trim(),
        description: body.description.trim(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        maxScore: body.maxScore,
      })
      .returning();
    res.status(201).json(assignment);
  },
);

router.post(
  "/assignments/:assignmentId/submit",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const body = SubmitAssignmentBody.parse(req.body);
    const member = await ensureMember(req, req.campusUserId!);
    if (!isSuperAdministrator(req) && member.role !== "student") {
      res.status(403).json({ error: "Only students can submit assignments." });
      return;
    }
    const [assignment] = await db
      .select()
      .from(campusAssignmentsTable)
      .where(
        eq(campusAssignmentsTable.id, String(routeParam(req, "assignmentId"))),
      )
      .limit(1);
    if (
      !assignment ||
      !(await assertSpaceMembership(member.userId, assignment.spaceId))
    ) {
      res.status(404).json({ error: "Assignment not found for this student." });
      return;
    }
    const [existing] = await db
      .select()
      .from(campusSubmissionsTable)
      .where(
        and(
          eq(campusSubmissionsTable.assignmentId, assignment.id),
          eq(campusSubmissionsTable.studentId, member.userId),
        ),
      )
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "You already submitted this assignment." });
      return;
    }
    const [submission] = await db
      .insert(campusSubmissionsTable)
      .values({
        id: `submission-${randomUUID()}`,
        assignmentId: assignment.id,
        studentId: member.userId,
        content: body.content,
      })
      .returning();
    res.status(201).json(submission);
  },
);

router.get(
  "/spaces/:spaceId/channels",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.campusUserId!;
    const spaceId = routeParam(req, "spaceId");
    const hasAccess =
      (await assertSpaceMembership(userId, spaceId)) ||
      (await assertProjectMembership(userId, spaceId));
    if (!hasAccess && !isAdministrator(req)) {
      res.status(403).json({ error: "Join the space or project to view its channels." });
      return;
    }
    const channels = await db
      .select({
        id: campusChannelsTable.id,
        name: campusChannelsTable.name,
        type: campusChannelsTable.type,
        unreadCount: sql<number>`count(${campusMessagesTable.id}) filter (where ${campusMessagesTable.userId} <> ${userId} and (${campusChannelReadsTable.lastReadAt} is null or ${campusMessagesTable.createdAt} > ${campusChannelReadsTable.lastReadAt}))`,
        lastMessageAt: sql<Date | null>`max(${campusMessagesTable.createdAt})`,
      })
      .from(campusChannelsTable)
      .leftJoin(
        campusChannelReadsTable,
        and(
          eq(campusChannelReadsTable.channelId, campusChannelsTable.id),
          eq(campusChannelReadsTable.userId, userId),
        ),
      )
      .leftJoin(
        campusMessagesTable,
        eq(campusMessagesTable.channelId, campusChannelsTable.id),
      )
      .where(eq(campusChannelsTable.spaceId, spaceId))
      .groupBy(
        campusChannelsTable.id,
        campusChannelsTable.name,
        campusChannelsTable.type,
        campusChannelReadsTable.lastReadAt,
      )
      .orderBy(campusChannelsTable.createdAt);
    res.json(channels.map((channel) => ({ ...channel, unreadCount: Number(channel.unreadCount) })));
  },
);

router.post(
  "/spaces/:spaceId/channels/:channelId/read",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.campusUserId!;
    const spaceId = routeParam(req, "spaceId");
    const channelId = routeParam(req, "channelId");
    const hasAccess =
      (await assertSpaceMembership(userId, spaceId)) ||
      (await assertProjectMembership(userId, spaceId));
    if (!hasAccess && !isAdministrator(req)) {
      res.status(403).json({ error: "Join the space or project to update channel read state." });
      return;
    }
    const [channel] = await db
      .select({ id: campusChannelsTable.id })
      .from(campusChannelsTable)
      .where(and(eq(campusChannelsTable.id, channelId), eq(campusChannelsTable.spaceId, spaceId)))
      .limit(1);
    if (!channel) {
      res.status(404).json({ error: "Channel not found." });
      return;
    }
    const lastReadAt = new Date();
    const [readState] = await db
      .insert(campusChannelReadsTable)
      .values({ id: `channel-read-${randomUUID()}`, channelId, userId, lastReadAt })
      .onConflictDoUpdate({
        target: [campusChannelReadsTable.userId, campusChannelReadsTable.channelId],
        set: { lastReadAt },
      })
      .returning();
    res.json(readState);
  },
);

router.get(
  "/spaces/:spaceId/channels/:channelId/messages",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.campusUserId!;
    const spaceId = routeParam(req, "spaceId");
    const channelId = routeParam(req, "channelId");
    const hasAccess =
      (await assertSpaceMembership(userId, spaceId)) ||
      (await assertProjectMembership(userId, spaceId));
    if (!hasAccess && !isAdministrator(req)) {
      res
        .status(403)
        .json({ error: "Join the space or project to view channel messages." });
      return;
    }
    const [channel] = await db
      .select()
      .from(campusChannelsTable)
      .where(
        and(
          eq(campusChannelsTable.id, channelId),
          eq(campusChannelsTable.spaceId, spaceId),
        ),
      )
      .limit(1);
    if (!channel) {
      res.status(404).json({ error: "Channel not found." });
      return;
    }
    const messages = await db
      .select()
      .from(campusMessagesTable)
      .where(
        and(
          eq(campusMessagesTable.channelId, channelId),
          eq(campusMessagesTable.spaceId, spaceId),
        ),
      )
      .orderBy(campusMessagesTable.createdAt);
    res.json(messages);
  },
);

router.post(
  "/spaces/:spaceId/channels/:channelId/messages",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.campusUserId!;
    const spaceId = routeParam(req, "spaceId");
    const channelId = routeParam(req, "channelId");
    const hasAccess =
      (await assertSpaceMembership(userId, spaceId)) ||
      (await assertProjectMembership(userId, spaceId));
    if (!hasAccess && !isAdministrator(req)) {
      res
        .status(403)
        .json({ error: "Join the space or project before messaging." });
      return;
    }
    const content =
      typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (!content || content.length > 4000) {
      res
        .status(400)
        .json({ error: "Message must contain 1–4000 characters." });
      return;
    }
    const [channel] = await db
      .select()
      .from(campusChannelsTable)
      .where(
        and(
          eq(campusChannelsTable.id, channelId),
          eq(campusChannelsTable.spaceId, spaceId),
        ),
      )
      .limit(1);
    if (!channel) {
      res.status(404).json({ error: "Channel not found." });
      return;
    }
    const [message] = await db
      .insert(campusMessagesTable)
      .values({
        id: `msg-${randomUUID()}`,
        spaceId,
        channelId,
        userId,
        content,
      })
      .returning();
    res.status(201).json(message);
  },
);

router.get(
  "/spaces/:spaceId/channels/:channelId/threads",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.campusUserId!;
    const spaceId = routeParam(req, "spaceId");
    const channelId = routeParam(req, "channelId");
    const hasAccess =
      (await assertSpaceMembership(userId, spaceId)) ||
      (await assertProjectMembership(userId, spaceId));
    if (!hasAccess && !isAdministrator(req)) {
      res.status(403).json({ error: "Join the space or project to view its threads." });
      return;
    }
    const [channel] = await db
      .select({ id: campusChannelsTable.id })
      .from(campusChannelsTable)
      .where(and(eq(campusChannelsTable.id, channelId), eq(campusChannelsTable.spaceId, spaceId)))
      .limit(1);
    if (!channel) {
      res.status(404).json({ error: "Channel not found." });
      return;
    }
    const threads = await db
      .select({
        id: campusThreadsTable.id,
        channelId: campusThreadsTable.channelId,
        rootMessageId: campusThreadsTable.rootMessageId,
        createdBy: campusThreadsTable.createdBy,
        createdAt: campusThreadsTable.createdAt,
        unreadCount: sql<number>`case when ${campusMessagesTable.userId} <> ${userId} and (${campusThreadReadsTable.lastReadAt} is null or ${campusMessagesTable.createdAt} > ${campusThreadReadsTable.lastReadAt}) then 1 else 0 end`,
      })
      .from(campusThreadsTable)
      .innerJoin(campusMessagesTable, eq(campusMessagesTable.id, campusThreadsTable.rootMessageId))
      .leftJoin(
        campusThreadReadsTable,
        and(
          eq(campusThreadReadsTable.threadId, campusThreadsTable.id),
          eq(campusThreadReadsTable.userId, userId),
        ),
      )
      .where(eq(campusThreadsTable.channelId, channelId))
      .orderBy(desc(campusThreadsTable.createdAt));
    res.json(threads.map((thread) => ({ ...thread, unreadCount: Number(thread.unreadCount) })));
  },
);

router.post(
  "/spaces/:spaceId/channels/:channelId/threads/:threadId/read",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.campusUserId!;
    const spaceId = routeParam(req, "spaceId");
    const channelId = routeParam(req, "channelId");
    const threadId = routeParam(req, "threadId");
    const hasAccess =
      (await assertSpaceMembership(userId, spaceId)) ||
      (await assertProjectMembership(userId, spaceId));
    if (!hasAccess && !isAdministrator(req)) {
      res.status(403).json({ error: "Join the space or project to update thread read state." });
      return;
    }
    const [thread] = await db
      .select({ id: campusThreadsTable.id })
      .from(campusThreadsTable)
      .innerJoin(campusChannelsTable, eq(campusChannelsTable.id, campusThreadsTable.channelId))
      .where(
        and(
          eq(campusThreadsTable.id, threadId),
          eq(campusThreadsTable.channelId, channelId),
          eq(campusChannelsTable.spaceId, spaceId),
        ),
      )
      .limit(1);
    if (!thread) {
      res.status(404).json({ error: "Thread not found." });
      return;
    }
    const lastReadAt = new Date();
    const [readState] = await db
      .insert(campusThreadReadsTable)
      .values({ id: `thread-read-${randomUUID()}`, threadId, userId, lastReadAt })
      .onConflictDoUpdate({
        target: [campusThreadReadsTable.userId, campusThreadReadsTable.threadId],
        set: { lastReadAt },
      })
      .returning();
    res.json(readState);
  },
);

router.post(
  "/presence/heartbeat",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.campusUserId!;
    const requestedState = typeof req.body?.state === "string" ? req.body.state : "online";
    if (!["online", "away", "busy", "offline"].includes(requestedState)) {
      res.status(400).json({ error: "Unsupported presence state." });
      return;
    }
    const updatedAt = new Date();
    const [presence] = await db
      .insert(campusPresenceTable)
      .values({ userId, state: requestedState, updatedAt })
      .onConflictDoUpdate({
        target: campusPresenceTable.userId,
        set: { state: requestedState, updatedAt },
      })
      .returning();
    res.json(presence);
  },
);

router.get(
  "/presence",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await ensureMember(req, req.campusUserId!);
    const staleBefore = new Date(Date.now() - 90_000);
    const rows = await db.select().from(campusPresenceTable);
    res.json(
      rows.map((row) => ({
        ...row,
        state: row.updatedAt < staleBefore ? "offline" : row.state,
      })),
    );
  },
);

router.put(
  "/talent/:userId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (
      routeParam(req, "userId") !== req.campusUserId &&
      !isAdministrator(req)
    ) {
      res.status(403).json({ error: "You can only edit your own portfolio." });
      return;
    }
    const member = await ensureMember(req, routeParam(req, "userId"));
    const bio =
      typeof req.body?.bio === "string"
        ? req.body.bio.trim().slice(0, 2000)
        : "";
    const githubUrl =
      typeof req.body?.github_url === "string"
        ? req.body.github_url.trim().slice(0, 500)
        : "";
    const linkedinUrl =
      typeof req.body?.linkedin_url === "string"
        ? req.body.linkedin_url.trim().slice(0, 500)
        : "";
    const lookingForTeam = Boolean(req.body?.looking_for_team);
    const [portfolio] = await db
      .insert(campusPortfoliosTable)
      .values({
        id: `portfolio-${member.userId}`,
        userId: member.userId,
        bio,
        githubUrl,
        linkedinUrl,
        lookingForTeam,
      })
      .onConflictDoUpdate({
        target: campusPortfoliosTable.userId,
        set: {
          bio,
          githubUrl,
          linkedinUrl,
          lookingForTeam,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(portfolio);
  },
);

router.post(
  "/talent/:userId/skills",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (
      routeParam(req, "userId") !== req.campusUserId &&
      !isAdministrator(req)
    ) {
      res.status(403).json({ error: "You can only edit your own skills." });
      return;
    }
    const skillId =
      typeof req.body?.skillId === "string" ? req.body.skillId : "";
    if (!skillId) {
      res.status(400).json({ error: "skillId is required." });
      return;
    }
    const [skill] = await db
      .select()
      .from(campusSkillsTable)
      .where(eq(campusSkillsTable.id, skillId))
      .limit(1);
    if (!skill) {
      res.status(404).json({ error: "Skill not found." });
      return;
    }
    const [row] = await db
      .insert(campusMemberSkillsTable)
      .values({
        id: `member-skill-${randomUUID()}`,
        userId: routeParam(req, "userId"),
        skillId,
        proficiency:
          typeof req.body?.proficiency === "string"
            ? req.body.proficiency
            : "beginner",
      })
      .onConflictDoNothing()
      .returning();
    res.status(201).json(row ?? { userId: routeParam(req, "userId"), skillId });
  },
);

router.delete(
  "/talent/:userId/skills/:skillId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (
      routeParam(req, "userId") !== req.campusUserId &&
      !isAdministrator(req)
    ) {
      res.status(403).json({ error: "You can only edit your own skills." });
      return;
    }
    await db
      .delete(campusMemberSkillsTable)
      .where(
        and(
          eq(campusMemberSkillsTable.id, routeParam(req, "skillId")),
          eq(campusMemberSkillsTable.userId, routeParam(req, "userId")),
        ),
      );
    res.status(204).end();
  },
);

router.get(
  "/events",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const member = await ensureMember(req, req.campusUserId!);
    const events = await db
      .select()
      .from(campusEventsTable)
      .orderBy(campusEventsTable.startTime);
    const attendance = await db
      .select()
      .from(campusEventAttendeesTable)
      .where(eq(campusEventAttendeesTable.userId, member.userId));
    const statusByEvent = new Map(
      attendance.map((row) => [row.eventId, row.status]),
    );
    res.json(
      events.map((event) => ({
        ...event,
        attendeeStatus: statusByEvent.get(event.id) ?? null,
      })),
    );
  },
);

router.post(
  "/events/:eventId/rsvp",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const status =
      typeof req.body?.status === "string" ? req.body.status : "going";
    if (!["going", "declined", "interested"].includes(status)) {
      res.status(400).json({ error: "Unsupported RSVP status." });
      return;
    }
    const [event] = await db
      .select()
      .from(campusEventsTable)
      .where(eq(campusEventsTable.id, routeParam(req, "eventId")))
      .limit(1);
    if (!event) {
      res.status(404).json({ error: "Event not found." });
      return;
    }
    const userId = req.campusUserId!;
    const [existing] = await db
      .select()
      .from(campusEventAttendeesTable)
      .where(
        and(
          eq(campusEventAttendeesTable.eventId, event.id),
          eq(campusEventAttendeesTable.userId, userId),
        ),
      )
      .limit(1);
    if (existing)
      await db
        .update(campusEventAttendeesTable)
        .set({ status })
        .where(eq(campusEventAttendeesTable.id, existing.id));
    else
      await db.insert(campusEventAttendeesTable).values({
        id: `attendee-${randomUUID()}`,
        eventId: event.id,
        userId,
        status,
      });
    res.status(200).json({ eventId: event.id, status });
  },
);

router.get(
  "/talent",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const members = await db
      .select()
      .from(campusMembersTable)
      .where(eq(campusMembersTable.membershipStatus, "approved"));
    const portfolios = await db.select().from(campusPortfoliosTable);
    const memberSkills = await db.select().from(campusMemberSkillsTable);
    const skills = await db.select().from(campusSkillsTable);
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
    const portfolioMap = new Map(
      portfolios.map((portfolio) => [portfolio.userId, portfolio]),
    );
    res.json(
      members
        .map((member) => ({
          ...(portfolioMap.get(member.userId) ?? {
            id: `portfolio-${member.userId}`,
            user_id: member.userId,
            bio: "",
            looking_for_team: false,
          }),
          user_id: member.userId,
          member: { ...member, display_name: member.name },
          skills: memberSkills
            .filter((row) => row.userId === member.userId)
            .map((row) => ({
              ...row,
              skill: skillMap.get(row.skillId) ?? null,
            })),
        }))
        .filter(
          (row) =>
            (row.member.role === "student" || row.member.role === "teacher") &&
            !(
              row.member.email &&
              (process.env.CAMPUS_SUPERADMIN_EMAILS ?? "")
                .toLowerCase()
                .split(",")
                .map((v) => v.trim())
                .includes(row.member.email.toLowerCase())
            ),
        ),
    );
  },
);

router.get(
  "/talent/:userId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const [member] = await db
      .select()
      .from(campusMembersTable)
      .where(eq(campusMembersTable.userId, routeParam(req, "userId")))
      .limit(1);
    if (
      !member ||
      member.membershipStatus !== "approved" ||
      !["student", "teacher"].includes(member.role)
    ) {
      res.status(404).json({ error: "Member not found." });
      return;
    }
    const [portfolio] = await db
      .select()
      .from(campusPortfoliosTable)
      .where(eq(campusPortfoliosTable.userId, member.userId))
      .limit(1);
    const memberSkills = await db
      .select()
      .from(campusMemberSkillsTable)
      .where(eq(campusMemberSkillsTable.userId, member.userId));
    const skillIds = memberSkills.map((row) => row.skillId);
    const skills = skillIds.length
      ? await db
          .select()
          .from(campusSkillsTable)
          .where(inArray(campusSkillsTable.id, skillIds))
      : [];
    res.json({
      portfolio: portfolio ?? {
        user_id: member.userId,
        bio: "",
        github_url: "",
        linkedin_url: "",
        looking_for_team: false,
      },
      member: { ...member, display_name: member.name },
      skills: memberSkills.map((row) => ({
        ...row,
        skill: skills.find((s) => s.id === row.skillId) ?? null,
      })),
      allSkills: await db.select().from(campusSkillsTable),
    });
  },
);

router.get(
  "/spaces/:spaceId/context",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.campusUserId!;
    const [membership] = await db
      .select()
      .from(campusMembershipsTable)
      .where(
        and(
          eq(campusMembershipsTable.userId, userId),
          eq(campusMembershipsTable.spaceId, routeParam(req, "spaceId")),
        ),
      )
      .limit(1);
    const [application] = await db
      .select()
      .from(campusClubApplicationsTable)
      .where(
        and(
          eq(campusClubApplicationsTable.userId, userId),
          eq(campusClubApplicationsTable.spaceId, routeParam(req, "spaceId")),
        ),
      )
      .limit(1);
    const pending = isAdministrator(req)
      ? await db
          .select()
          .from(campusClubApplicationsTable)
          .where(
            and(
              eq(
                campusClubApplicationsTable.spaceId,
                routeParam(req, "spaceId"),
              ),
              eq(campusClubApplicationsTable.status, "pending"),
            ),
          )
      : [];
    const events = await db
      .select()
      .from(campusEventsTable)
      .where(eq(campusEventsTable.spaceId, routeParam(req, "spaceId")))
      .orderBy(campusEventsTable.startTime);
    res.json({
      membership: membership ?? null,
      application: application ?? null,
      pendingApplications: pending,
      events,
    });
  },
);

router.post(
  "/spaces/:spaceId/applications",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const message =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const [space] = await db
      .select()
      .from(campusSpacesTable)
      .where(eq(campusSpacesTable.id, routeParam(req, "spaceId")))
      .limit(1);
    if (!space || space.type !== "club") {
      res.status(404).json({ error: "Club not found." });
      return;
    }
    const [existing] = await db
      .select()
      .from(campusClubApplicationsTable)
      .where(
        and(
          eq(campusClubApplicationsTable.userId, req.campusUserId!),
          eq(campusClubApplicationsTable.spaceId, routeParam(req, "spaceId")),
        ),
      )
      .limit(1);
    if (existing) {
      res
        .status(409)
        .json({ error: "You already have an application for this club." });
      return;
    }
    const [application] = await db
      .insert(campusClubApplicationsTable)
      .values({
        id: `application-${randomUUID()}`,
        spaceId: routeParam(req, "spaceId"),
        userId: req.campusUserId!,
        status: "pending",
        message,
      })
      .returning();
    res.status(201).json(application);
  },
);

router.post(
  "/spaces/:spaceId/applications/:applicationId/review",
  requireAdministrator,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const status =
      typeof req.body?.status === "string" ? req.body.status : "approved";
    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "Unsupported application status." });
      return;
    }
    const [application] = await db
      .select()
      .from(campusClubApplicationsTable)
      .where(
        and(
          eq(campusClubApplicationsTable.id, routeParam(req, "applicationId")),
          eq(campusClubApplicationsTable.spaceId, routeParam(req, "spaceId")),
        ),
      )
      .limit(1);
    if (!application) {
      res.status(404).json({ error: "Application not found." });
      return;
    }
    await db
      .update(campusClubApplicationsTable)
      .set({ status })
      .where(eq(campusClubApplicationsTable.id, application.id));
    if (status === "approved")
      await db
        .insert(campusMembershipsTable)
        .values({
          id: `membership-${application.userId}-${application.spaceId}`,
          userId: application.userId,
          spaceId: application.spaceId,
        })
        .onConflictDoNothing();
    res.status(200).json({ ...application, status });
  },
);

router.get(
  "/notifications",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(campusNotificationsTable)
      .where(eq(campusNotificationsTable.userId, req.campusUserId!))
      .orderBy(desc(campusNotificationsTable.createdAt))
      .limit(50);
    res.json(rows);
  },
);

router.get(
  "/facilities/rooms",
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const rooms = await db
      .select()
      .from(campusRoomsTable)
      .orderBy(campusRoomsTable.building, campusRoomsTable.name);
    res.json(rooms);
  },
);

router.get(
  "/facilities/issues",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(campusFacilityIssuesTable)
      .where(eq(campusFacilityIssuesTable.reporterId, req.campusUserId!))
      .orderBy(desc(campusFacilityIssuesTable.createdAt));
    res.json(rows);
  },
);

router.post(
  "/facilities/issues",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const roomId = typeof req.body?.roomId === "string" ? req.body.roomId.trim() : "";
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : "";
    if (!roomId || !title || !description) {
      res.status(400).json({ error: "Room, title and description are required." });
      return;
    }
    if (title.length > 160 || description.length > 4000) {
      res.status(400).json({ error: "The facility issue is too long." });
      return;
    }
    const [room] = await db
      .select({ id: campusRoomsTable.id })
      .from(campusRoomsTable)
      .where(eq(campusRoomsTable.id, roomId))
      .limit(1);
    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }
    const issueId = `facility-${randomUUID()}`;
    const [issue] = await db
      .insert(campusFacilityIssuesTable)
      .values({
        id: issueId,
        roomId,
        reporterId: req.campusUserId!,
        title,
        description,
        status: "reported",
      })
      .returning();
    await db.insert(campusFacilityIssueHistoryTable).values({
      id: `facility-history-${randomUUID()}`,
      issueId,
      actorId: req.campusUserId!,
      fromStatus: null,
      toStatus: "reported",
      note: "Issue reported",
    });
    res.status(201).json(issue);
  },
);

router.get(
  "/facilities/issues/:issueId/history",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const issueId = routeParam(req, "issueId");
    const [issue] = await db
      .select()
      .from(campusFacilityIssuesTable)
      .where(eq(campusFacilityIssuesTable.id, issueId))
      .limit(1);
    if (!issue || (issue.reporterId !== req.campusUserId && !isAdministrator(req))) {
      res.status(404).json({ error: "Facility issue not found." });
      return;
    }
    const history = await db
      .select()
      .from(campusFacilityIssueHistoryTable)
      .where(eq(campusFacilityIssueHistoryTable.issueId, issueId))
      .orderBy(campusFacilityIssueHistoryTable.createdAt);
    res.json(history);
  },
);

router.get(
  "/admin/facilities/issues",
  requireAdministrator,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(campusFacilityIssuesTable)
      .orderBy(desc(campusFacilityIssuesTable.createdAt));
    res.json(rows);
  },
);

router.patch(
  "/admin/facilities/issues/:issueId",
  requireAdministrator,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const issueId = routeParam(req, "issueId");
    const [issue] = await db
      .select()
      .from(campusFacilityIssuesTable)
      .where(eq(campusFacilityIssuesTable.id, issueId))
      .limit(1);
    if (!issue || !isFacilityIssueStatus(issue.status)) {
      res.status(404).json({ error: "Facility issue not found." });
      return;
    }
    const status = req.body?.status;
    const assigneeId =
      typeof req.body?.assigneeId === "string" ? req.body.assigneeId.trim() : "";
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    const resolution =
      typeof req.body?.resolution === "string" ? req.body.resolution.trim() : "";
    if (!isFacilityIssueStatus(status) || !canTransitionFacilityIssue(issue.status, status)) {
      res.status(409).json({ error: `Facility issues cannot move from ${issue.status} to ${String(status)}.` });
      return;
    }
    if (status === "assigned" && !assigneeId) {
      res.status(400).json({ error: "An assignee is required before assignment." });
      return;
    }
    if (status === "resolved" && !resolution) {
      res.status(400).json({ error: "A resolution is required before resolving an issue." });
      return;
    }
    const nextAssignee = assigneeId || issue.assigneeId;
    const [updated] = await db
      .update(campusFacilityIssuesTable)
      .set({
        status,
        assigneeId: nextAssignee,
        resolution: resolution || issue.resolution,
        resolvedAt: status === "resolved" ? new Date() : issue.resolvedAt,
      })
      .where(eq(campusFacilityIssuesTable.id, issueId))
      .returning();
    await db.insert(campusFacilityIssueHistoryTable).values({
      id: `facility-history-${randomUUID()}`,
      issueId,
      actorId: req.campusUserId!,
      fromStatus: issue.status,
      toStatus: status,
      assigneeId: nextAssignee,
      note: note || resolution || null,
    });
    await notifyUsers([issue.reporterId], {
      kind: "facility_issue",
      sourceKey: `facility-transition:${issueId}:${status}`,
      metadata: { issueId, status, assigneeId: nextAssignee },
      title: `Facility issue ${status.replace("_", " ")}`,
      body: `${issue.title} is now ${status.replace("_", " ")}.`,
      targetUrl: "/activity",
    });
    res.json(updated);
  },
);

router.post(
  "/notifications/read-all",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await db
      .update(campusNotificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(campusNotificationsTable.userId, req.campusUserId!),
          sql`${campusNotificationsTable.readAt} is null`,
        ),
      );
    res.status(204).end();
  },
);

router.post(
  "/notifications/:notificationId/read",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await db
      .update(campusNotificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(campusNotificationsTable.id, routeParam(req, "notificationId")),
          eq(campusNotificationsTable.userId, req.campusUserId!),
        ),
      );
    res.status(204).end();
  },
);

router.get(
  "/platform/superadmin",
  requireSuperAdministrator,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const member = await ensureMember(req, req.campusUserId!);
    res.json({
      accessLevel: "super_admin",
      userId: member.userId,
      email: member.email,
      role: member.role,
      capabilities: [
        "all_roles",
        "all_spaces",
        "all_academic",
        "all_communications",
        "all_identity",
        "all_workflows",
        "all_analytics",
        "all_moderation",
        "all_configuration",
        "all_audit",
      ],
      disclosure:
        "Privileged access is intentionally absent from ordinary navigation and public member discovery, while remaining auditable and subject to server-side authorization.",
    });
  },
);

export default router;

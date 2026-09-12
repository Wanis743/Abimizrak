import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const campusMembersTable = pgTable("campus_members", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  className: text("class_name").notNull().default("Community member"),
  role: text("role").notNull().default("student"),
  profileCompleted: boolean("profile_completed").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  membershipStatus: text("membership_status").notNull().default("pending"),
  roleStatus: text("role_status").notNull().default("pending"),
  requestedRole: text("requested_role").notNull().default("student"),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  lastReviewNote: text("last_review_note"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by"),
  credentialSerial: text("credential_serial").notNull(),
  schoolYear: text("school_year").notNull().default("2026 — 2027"),
  expiresOn: date("expires_on", { mode: "string" })
    .notNull()
    .default("2027-06-30"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const campusSpacesTable = pgTable("campus_spaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  memberCount: integer("member_count").notNull().default(0),
  status: text("status").notNull(),
  accent: text("accent").notNull(),
  channels: text("channels").array().notNull(),
  spotlight: text("spotlight").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusMembershipsTable = pgTable(
  "campus_memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    spaceId: text("space_id").notNull(),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    memberSpaceUnique: uniqueIndex("campus_memberships_member_space_unique").on(
      table.userId,
      table.spaceId,
    ),
  }),
);

export const campusPostsTable = pgTable("campus_posts", {
  id: text("id").primaryKey(),
  spaceId: text("space_id").notNull(),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCampusMemberSchema = createInsertSchema(
  campusMembersTable,
).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertCampusSpaceSchema = createInsertSchema(
  campusSpacesTable,
).omit({
  createdAt: true,
});
export const insertCampusMembershipSchema = createInsertSchema(
  campusMembershipsTable,
).omit({
  createdAt: true,
});
export const insertCampusPostSchema = createInsertSchema(campusPostsTable).omit(
  {
    createdAt: true,
  },
);

export const campusAssignmentsTable = pgTable("campus_assignments", {
  id: text("id").primaryKey(),
  spaceId: text("space_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  maxScore: integer("max_score"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusSubmissionsTable = pgTable("campus_submissions", {
  id: text("id").primaryKey(),
  assignmentId: text("assignment_id").notNull(),
  studentId: text("student_id").notNull(),
  content: text("content"),
  score: integer("score"),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusAttendanceTable = pgTable(
  "campus_attendance",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id").notNull(),
    studentId: text("student_id").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    status: text("status").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    attendanceUnique: uniqueIndex("campus_attendance_unique").on(
      table.spaceId,
      table.studentId,
      table.date,
    ),
  }),
);

export const insertCampusAssignmentSchema = createInsertSchema(
  campusAssignmentsTable,
).omit({ createdAt: true });
export const insertCampusSubmissionSchema = createInsertSchema(
  campusSubmissionsTable,
).omit({ submittedAt: true });
export const insertCampusAttendanceSchema = createInsertSchema(
  campusAttendanceTable,
).omit({ recordedAt: true });

export type InsertCampusMember = z.infer<typeof insertCampusMemberSchema>;
export type CampusMember = typeof campusMembersTable.$inferSelect;
export type CampusSpace = typeof campusSpacesTable.$inferSelect;
export type CampusMembership = typeof campusMembershipsTable.$inferSelect;
export type CampusPost = typeof campusPostsTable.$inferSelect;
export type CampusAssignment = typeof campusAssignmentsTable.$inferSelect;
export type CampusSubmission = typeof campusSubmissionsTable.$inferSelect;
export type CampusAttendance = typeof campusAttendanceTable.$inferSelect;

export const campusChannelsTable = pgTable(
  "campus_channels",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull().default("text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    spaceIdx: index("campus_channels_space_id_idx").on(table.spaceId),
  }),
);

export const campusMessagesTable = pgTable(
  "campus_messages",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id").notNull(),
    spaceId: text("space_id").notNull(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    channelCreatedIdx: index("campus_messages_channel_created_at_idx").on(
      table.channelId,
      table.createdAt,
    ),
  }),
);

export const campusChannelReadsTable = pgTable(
  "campus_channel_reads",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id").notNull(),
    userId: text("user_id").notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userChannelUnique: uniqueIndex("campus_channel_reads_user_channel_unique").on(
      table.userId,
      table.channelId,
    ),
    channelIdx: index("campus_channel_reads_channel_id_idx").on(table.channelId),
  }),
);

export const campusDirectMessagesTable = pgTable("campus_direct_messages", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusProjectsTable = pgTable("campus_projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("idea"), // idea, active, completed
  visibility: text("visibility").notNull().default("public"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusProjectMembersTable = pgTable(
  "campus_project_members",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("member"), // creator, member, mentor
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectMemberUnique: uniqueIndex("campus_project_members_unique").on(
      table.projectId,
      table.userId,
    ),
    projectIdx: index("campus_project_members_project_id_idx").on(
      table.projectId,
    ),
    userIdx: index("campus_project_members_user_id_idx").on(table.userId),
  }),
);

export const campusProjectMilestonesTable = pgTable(
  "campus_project_milestones",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("pending"), // pending, completed
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectIdx: index("campus_project_milestones_project_id_idx").on(
      table.projectId,
      table.createdAt,
    ),
  }),
);

export type CampusProject = typeof campusProjectsTable.$inferSelect;
export type CampusProjectMember = typeof campusProjectMembersTable.$inferSelect;
export type CampusProjectMilestone =
  typeof campusProjectMilestonesTable.$inferSelect;

export const campusSkillsTable = pgTable("campus_skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
});

export const campusMemberSkillsTable = pgTable(
  "campus_member_skills",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    skillId: text("skill_id").notNull(),
    proficiency: text("proficiency").notNull().default("intermediate"),
  },
  (table) => ({
    memberSkillUnique: uniqueIndex("campus_member_skills_unique").on(
      table.userId,
      table.skillId,
    ),
  }),
);

export const campusPortfoliosTable = pgTable("campus_portfolios", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  bio: text("bio"),
  githubUrl: text("github_url"),
  linkedinUrl: text("linkedin_url"),
  lookingForTeam: boolean("looking_for_team").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type CampusSkill = typeof campusSkillsTable.$inferSelect;
export type CampusMemberSkill = typeof campusMemberSkillsTable.$inferSelect;
export type CampusPortfolio = typeof campusPortfoliosTable.$inferSelect;

export const campusEventsTable = pgTable("campus_events", {
  id: text("id").primaryKey(),
  spaceId: text("space_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusEventAttendeesTable = pgTable(
  "campus_event_attendees",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    userId: text("user_id").notNull(),
    status: text("status").notNull().default("going"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventAttendeeUnique: uniqueIndex("campus_event_attendees_unique").on(
      table.eventId,
      table.userId,
    ),
  }),
);

export const campusClubApplicationsTable = pgTable(
  "campus_club_applications",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id").notNull(),
    userId: text("user_id").notNull(),
    status: text("status").notNull().default("pending"),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clubApplicationUnique: uniqueIndex("campus_club_applications_unique").on(
      table.spaceId,
      table.userId,
    ),
  }),
);

export type CampusEvent = typeof campusEventsTable.$inferSelect;
export type CampusEventAttendee = typeof campusEventAttendeesTable.$inferSelect;
export type CampusClubApplication =
  typeof campusClubApplicationsTable.$inferSelect;
// Production foundation tables. These are intentionally additive so the current
// vertical slice remains readable while the platform migrates toward a domain model.
export const campusVerificationAuditsTable = pgTable(
  "campus_verification_audits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const campusNotificationsTable = pgTable(
  "campus_notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    sourceKey: text("source_key").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    targetUrl: text("target_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recipientEventSourceIdx: uniqueIndex(
      "campus_notifications_recipient_event_source_idx",
    ).on(table.userId, table.kind, table.sourceKey),
  }),
);

export const campusPostCommentsTable = pgTable("campus_post_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusPostReactionsTable = pgTable(
  "campus_post_reactions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    userId: text("user_id").notNull(),
    reaction: text("reaction").notNull().default("like"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueReaction: uniqueIndex("campus_post_reactions_unique").on(
      table.postId,
      table.userId,
      table.reaction,
    ),
  }),
);

export const campusThreadsTable = pgTable("campus_threads", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  rootMessageId: text("root_message_id").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusThreadReadsTable = pgTable(
  "campus_thread_reads",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id").notNull(),
    userId: text("user_id").notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userThreadUnique: uniqueIndex("campus_thread_reads_user_thread_unique").on(
      table.userId,
      table.threadId,
    ),
    threadIdx: index("campus_thread_reads_thread_id_idx").on(table.threadId),
  }),
);

export const campusPresenceTable = pgTable("campus_presence", {
  userId: text("user_id").primaryKey(),
  state: text("state").notNull().default("offline"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusRoomsTable = pgTable("campus_rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  building: text("building"),
  capacity: integer("capacity"),
  kind: text("kind").notNull().default("classroom"),
  status: text("status").notNull().default("available"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campusFacilityIssuesTable = pgTable("campus_facility_issues", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  reporterId: text("reporter_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("reported"),
  assigneeId: text("assignee_id"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const campusFacilityIssueHistoryTable = pgTable(
  "campus_facility_issue_history",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id").notNull(),
    actorId: text("actor_id").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    assigneeId: text("assignee_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    issueCreatedIdx: index("campus_facility_issue_history_issue_created_idx").on(
      table.issueId,
      table.createdAt,
    ),
  }),
);

export const campusModerationReportsTable = pgTable(
  "campus_moderation_reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("open"),
    reviewerId: text("reviewer_id"),
    resolution: text("resolution"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => ({
    targetIdx: index("campus_moderation_reports_target_idx").on(
      table.targetType,
      table.targetId,
    ),
    statusIdx: index("campus_moderation_reports_status_idx").on(
      table.status,
      table.createdAt,
    ),
    reporterIdx: index("campus_moderation_reports_reporter_idx").on(
      table.reporterId,
      table.createdAt,
    ),
  }),
);

export type CampusVerificationAudit =
  typeof campusVerificationAuditsTable.$inferSelect;
export type CampusModerationReport =
  typeof campusModerationReportsTable.$inferSelect;
export type CampusNotification = typeof campusNotificationsTable.$inferSelect;
export type CampusFacilityIssue = typeof campusFacilityIssuesTable.$inferSelect;
export type CampusFacilityIssueHistory =
  typeof campusFacilityIssueHistoryTable.$inferSelect;
export type CampusPostComment = typeof campusPostCommentsTable.$inferSelect;
export type CampusPostReaction = typeof campusPostReactionsTable.$inferSelect;
export type CampusThread = typeof campusThreadsTable.$inferSelect;
export type CampusThreadRead = typeof campusThreadReadsTable.$inferSelect;
export type CampusPresence = typeof campusPresenceTable.$inferSelect;
export type CampusRoom = typeof campusRoomsTable.$inferSelect;

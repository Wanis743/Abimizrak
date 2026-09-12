export const FIXTURE_PREFIX = "acceptance-p12-";
export const ids = Object.freeze({
  school: `${FIXTURE_PREFIX}school`, classAuthorized: `${FIXTURE_PREFIX}class-a`, classUnauthorized: `${FIXTURE_PREFIX}class-b`,
  studentA: `${FIXTURE_PREFIX}student-a`, studentB: `${FIXTURE_PREFIX}student-b`, teacher: `${FIXTURE_PREFIX}teacher`, administrator: `${FIXTURE_PREFIX}administrator`,
  assignment: `${FIXTURE_PREFIX}assignment`, submission: `${FIXTURE_PREFIX}submission`, grade: `${FIXTURE_PREFIX}grade`, attendance: `${FIXTURE_PREFIX}attendance`, timetable: `${FIXTURE_PREFIX}timetable`,
  event: `${FIXTURE_PREFIX}event`, notificationA: `${FIXTURE_PREFIX}notification-a`, room: `${FIXTURE_PREFIX}room`, audit: `${FIXTURE_PREFIX}audit`,
  privateSpace: `${FIXTURE_PREFIX}private-space`, membershipA: `${FIXTURE_PREFIX}membership-a`, privateChannel: `${FIXTURE_PREFIX}private-channel`, privateMessage: `${FIXTURE_PREFIX}private-message`, privateThread: `${FIXTURE_PREFIX}private-thread`,
});

export const fixtureManifest = Object.freeze({
  namespace: FIXTURE_PREFIX, environment: "acceptance-only", identities: ["studentA", "studentB", "teacher", "administrator", "nonMember"],
  coverage: ["verification", "timetable", "attendance", "grades", "assignment", "submission", "event", "notification", "facility", "governance", "membership", "private-message", "private-thread", "thread-unread", "presence-expiry", "mobile-teacher", "mobile-administrator", "authorized-teacher-scope", "unauthorized-teacher-scope"],
});

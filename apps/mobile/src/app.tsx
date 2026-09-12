import React, { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  SafeAreaView,
  StatusBar,
  Text,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  getVerificationStatus,
  getCampusHome,
  getSpaces,
  getAcademic,
  getStudentAssignments,
  getStudentGrades,
  getStudentAttendance,
  getStudentTimetable,
  getEvents,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  request,
  submitAssignment,
  supabase,
} from "./api";

const palette = {
  ink: "#10231F",
  muted: "#667670",
  line: "rgba(16,35,31,0.10)",
  glass: "rgba(255,255,255,.62)",
  accent: "#1BAA8A",
  accent2: "#72D7EC",
  bg: "#EDF5F2",
};
type AcademicView =
  "overview" | "assignments" | "grades" | "attendance" | "timetable";
type MainTab = "home" | "spaces" | "events" | "notifications" | "academic";

export default function MobileApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getVerificationStatus>> | null>(null);
  const [home, setHome] = useState<Awaited<ReturnType<typeof getCampusHome>> | null>(null);
  const [spaces, setSpaces] = useState<Awaited<ReturnType<typeof getSpaces>>>([]);
  const [academic, setAcademic] = useState<Awaited<ReturnType<typeof getAcademic>> | null>(null);
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof getStudentAssignments>>>([]);
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof getStudentGrades>>>([]);
  const [attendance, setAttendance] = useState<Awaited<ReturnType<typeof getStudentAttendance>> | null>(null);
  const [timetable, setTimetable] = useState<Awaited<ReturnType<typeof getStudentTimetable>>>([]);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getEvents>>>([]);
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof getNotifications>>>([]);
  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [academicView, setAcademicView] = useState<AcademicView>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [openAssignment, setOpenAssignment] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [fileLink, setFileLink] = useState("");
  const [submissionBusy, setSubmissionBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      getVerificationStatus(),
      getCampusHome(),
      getSpaces(),
      getAcademic(),
      getStudentAssignments(),
      getStudentGrades(),
      getStudentAttendance(),
      getStudentTimetable(),
      getEvents(),
      getNotifications(),
    ])
      .then(([v, h, s, a, as, g, at, tt, e, n]) => {
        if (!alive) return;
        setStatus(v);
        setHome(h);
        setSpaces(s);
        setAcademic(a);
        setAssignments(as);
        setGrades(g);
        setAttendance(at);
        setTimetable(tt);
        setEvents(e);
        setNotifications(n);
        setError(null);
      })
      .catch(
        (e) =>
          alive &&
          setError(e instanceof Error ? e.message : "Unable to load campus"),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [session]);

  const initials = useMemo(
    () =>
      String(status?.displayName || session?.user?.email || "AB")
        .split(" ")
        .map((p: string) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [status?.displayName, session?.user?.email],
  );
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const signIn = async () => {
    setAuthBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setAuthBusy(false);
    }
  };

  const academicTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabRow}
    >
      {(
        [
          ["overview", "Overview"],
          ["assignments", "Work"],
          ["grades", "Grades"],
          ["attendance", "Attendance"],
          ["timetable", "Week"],
        ] as [AcademicView, string][]
      ).map(([key, label]) => (
        <Pressable
          key={key}
          onPress={() => setAcademicView(key)}
          style={[
            styles.smallTab,
            academicView === key && styles.smallTabActive,
          ]}
        >
          <Text
            style={[
              styles.smallTabText,
              academicView === key && styles.smallTabTextActive,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const refreshAcademic = async () => {
    try {
      const [a, as, g, at, tt] = await Promise.all([
        getAcademic(),
        getStudentAssignments(),
        getStudentGrades(),
        getStudentAttendance(),
        getStudentTimetable(),
      ]);
      setAcademic(a);
      setAssignments(as);
      setGrades(g);
      setAttendance(at);
      setTimetable(tt);
    } catch (e) {
      Alert.alert(
        "Refresh failed",
        e instanceof Error ? e.message : "Unable to refresh academic data.",
      );
    }
  };

  const renderAcademic = () => {
    if (academicView === "assignments")
      return (
        <>
          <Text style={styles.section}>ACADEMIC WORK</Text>
          {academicTabs()}
          {assignments.length === 0 ? (
            <Text style={styles.meta}>No assignments yet.</Text>
          ) : (
            assignments.map((a) => (
              <View
                key={a.id}
                style={[styles.surface, styles.space, styles.columnSpace]}
              >
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.spaceType}>{a.subject}</Text>
                    <Text style={styles.spaceTitle}>{a.title}</Text>
                  </View>
                  <Text style={styles.timeText}>{a.maxScore} pts</Text>
                </View>
                <Text style={styles.meta}>
                  Due {new Date(a.dueDate).toLocaleString()}
                </Text>
                <Text style={styles.meta}>
                  {a.submission?.status
                    ? `Status: ${a.submission.status}`
                    : "Not submitted"}
                </Text>
                <Pressable
                  onPress={() => {
                    setOpenAssignment(openAssignment === a.id ? null : a.id);
                    setSubmissionText(a.submission?.bodyText || "");
                    setFileLink(
                      Array.isArray(a.submission?.files) &&
                        a.submission.files[0]?.url
                        ? a.submission.files[0].url
                        : "",
                    );
                  }}
                  style={styles.inlineButton}
                >
                  <Text style={styles.inlineButtonText}>
                    {openAssignment === a.id
                      ? "Close"
                      : a.submission
                        ? "Edit submission"
                        : "Submit work"}
                  </Text>
                </Pressable>
                {openAssignment === a.id && (
                  <View style={{ marginTop: 10 }}>
                    <TextInput
                      value={submissionText}
                      onChangeText={setSubmissionText}
                      multiline
                      placeholder="Write your answer…"
                      placeholderTextColor={palette.muted}
                      style={[
                        styles.input,
                        { height: 110, textAlignVertical: "top" },
                      ]}
                    />
                    <TextInput
                      value={fileLink}
                      onChangeText={setFileLink}
                      placeholder="Optional file URL"
                      placeholderTextColor={palette.muted}
                      style={[styles.input, { marginTop: 8 }]}
                    />
                    <Pressable
                      disabled={submissionBusy}
                      onPress={async () => {
                        setSubmissionBusy(true);
                        try {
                          await submitAssignment(a.id, {
                            bodyText: submissionText,
                            files: fileLink
                              ? [{ url: fileLink, name: "Submission" }]
                              : [],
                          });
                          setAssignments(await getStudentAssignments());
                          setOpenAssignment(null);
                        } catch (e) {
                          Alert.alert(
                            "Submission failed",
                            e instanceof Error ? e.message : "Unable to submit.",
                          );
                        } finally {
                          setSubmissionBusy(false);
                        }
                      }}
                      style={[styles.primary, { marginTop: 10 }]}
                    >
                      <Text style={styles.primaryText}>
                        {submissionBusy ? "Sending…" : "Send submission"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))
          )}
        </>
      );

    if (academicView === "grades")
      return (
        <>
          <Text style={styles.section}>GRADE HISTORY</Text>
          {academicTabs()}
          {grades.length === 0 ? (
            <Text style={styles.meta}>No grades published.</Text>
          ) : (
            grades.map((group, i: number) => (
              <View
                key={group.term?.id || i}
                style={[styles.surface, styles.space, styles.columnSpace]}
              >
                <Text style={styles.spaceType}>
                  {group.term?.label || "Term"}
                </Text>
                {group.grades.map((r) => (
                  <View key={r.id} style={styles.rowLine}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{r.subject}</Text>
                      <Text style={styles.meta}>
                        {r.type} · coefficient {r.coefficient}
                        {r.comment ? ` · ${r.comment}` : ""}
                      </Text>
                    </View>
                    <Text style={styles.score}>
                      {r.value}/{r.maxValue}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </>
      );

    if (academicView === "attendance")
      return (
        <>
          <Text style={styles.section}>ATTENDANCE</Text>
          {academicTabs()}
          <View style={[styles.surface, styles.hero]}>
            <Text style={styles.kicker}>ATTENDANCE RATE</Text>
            <Text style={styles.heroTitle}>
              {attendance?.rate == null ? "—" : `${attendance.rate}%`}
            </Text>
            <Text style={styles.meta}>
              Present + late sessions divided by recorded sessions.
            </Text>
          </View>
          {(attendance?.records || []).map((r) => (
            <View key={r.id} style={[styles.surface, styles.space]}>
              <View>
                <Text style={styles.spaceTitle}>
                  {new Date(r.date).toLocaleDateString()}
                </Text>
                <Text style={styles.meta}>Period {r.period}</Text>
              </View>
              <Text style={styles.spaceType}>
                {String(r.status).toUpperCase()}
              </Text>
            </View>
          ))}
        </>
      );

    if (academicView === "timetable")
      return (
        <>
          <Text style={styles.section}>WEEKLY TIMETABLE</Text>
          {academicTabs()}
          {timetable.length === 0 ? (
            <Text style={styles.meta}>No timetable published.</Text>
          ) : (
            timetable.map((r) => (
              <View key={r.id} style={[styles.surface, styles.space]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.spaceType}>
                    {["", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][
                      r.dayOfWeek
                    ] || `DAY ${r.dayOfWeek}`}
                  </Text>
                  <Text style={styles.spaceTitle}>{r.subject}</Text>
                  <Text style={styles.meta}>
                    {r.startTime} — {r.endTime} · Room {r.room}
                  </Text>
                </View>
              </View>
            ))
          )}
        </>
      );

    return (
      <>
        <Text style={styles.section}>ACADEMICS</Text>
        {academicTabs()}
        <View style={[styles.surface, styles.hero]}>
          <Text style={styles.kicker}>ACADEMIC PULSE</Text>
          <Text style={styles.heroTitle}>
            {academic?.averagePercent != null
              ? `${academic.averagePercent}% academic average`
              : "Academic space ready"}
          </Text>
          <Text style={styles.meta}>
            {academic?.attendanceRate != null
              ? `${academic.attendanceRate}% attendance · ${assignments.length} assignments · ${grades.reduce((n: number, g) => n + g.grades.length, 0)} grades`
              : "Your academic data will appear as the school config is populated."}
          </Text>
          <Pressable
            onPress={() => void refreshAcademic()}
            style={styles.inlineButton}
          >
            <Text style={styles.inlineButtonText}>Refresh academic data</Text>
          </Pressable>
        </View>
        <Text style={styles.section}>TODAY</Text>
        {(home?.schedule || []).slice(0, 8).map((item, i: number) => (
          <View
            key={`${item.startTime || item.time}-${i}`}
            style={styles.timeline}
          >
            <View style={styles.time}>
              <Text style={styles.timeText}>{item.startTime || item.time}</Text>
            </View>
            <View style={styles.timelineDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {item.subject || item.title || "Campus activity"}
              </Text>
              <Text style={styles.meta}>
                {item.room || item.location || ""}
              </Text>
            </View>
          </View>
        ))}
      </>
    );
  };

  const renderBody = () => {
    if (activeTab === "academic") return renderAcademic();
    if (activeTab === "spaces")
      return (
        <>
          <Text style={styles.section}>YOUR SPACES</Text>
          {spaces.length ? (
            spaces.map((space) => (
              <View key={space.id} style={[styles.surface, styles.space]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.spaceType}>
                    {String(space.type || "space").toUpperCase()}
                  </Text>
                  <Text style={styles.spaceTitle}>{space.name}</Text>
                  <Text style={styles.meta}>{space.description}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            ))
          ) : (
            <Text style={styles.meta}>No spaces available.</Text>
          )}
        </>
      );
    if (activeTab === "events")
      return (
        <>
          <Text style={styles.section}>EVENTS</Text>
          {events.length ? (
            events.map((event) => (
              <View key={event.id} style={[styles.surface, styles.space]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.spaceType}>
                    {event.attendeeStatus === "going" ? "GOING" : "EVENT"}
                  </Text>
                  <Text style={styles.spaceTitle}>{event.title}</Text>
                  <Text style={styles.meta}>
                    {new Date(event.startTime).toLocaleString()} ·{" "}
                    {event.location || "Campus"}
                  </Text>
                </View>
                <Pressable
                  onPress={async () => {
                    const nextStatus =
                      event.attendeeStatus === "going" ? "declined" : "going";
                    await request(`/events/${event.id}/rsvp`, {
                      method: "POST",
                      body: JSON.stringify({ status: nextStatus }),
                    }).catch(() => {});
                    setEvents((rows) =>
                      rows.map((x) =>
                        x.id === event.id
                          ? { ...x, attendeeStatus: nextStatus }
                          : x,
                      ),
                    );
                  }}
                >
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.meta}>No upcoming events.</Text>
          )}
        </>
      );
    if (activeTab === "notifications")
      return (
        <>
          <View style={styles.topRow}>
            <Text style={styles.section}>NOTIFICATIONS</Text>
            <Pressable
              onPress={async () => {
                try {
                  await markAllNotificationsRead();
                  const readAt = new Date().toISOString();
                  setNotifications((rows) =>
                    rows.map((n) => ({
                      ...n,
                      readAt: n.readAt || readAt,
                    })),
                  );
                } catch (e) {
                  Alert.alert(
                    "Unable to mark notifications read",
                    e instanceof Error ? e.message : "Please try again.",
                  );
                }
              }}
            >
              <Text style={styles.signOutText}>Mark all read</Text>
            </Pressable>
          </View>
          {notifications.length ? (
            notifications.map((n) => (
              <Pressable
                key={n.id}
                onPress={async () => {
                  if (!n.readAt) {
                    await markNotificationRead(n.id).catch(() => null);
                    setNotifications((rows) =>
                      rows.map((x) =>
                        x.id === n.id
                          ? { ...x, readAt: new Date().toISOString() }
                          : x,
                      ),
                    );
                  }
                }}
                style={[
                  styles.surface,
                  styles.space,
                  { alignItems: "flex-start" },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.spaceType}>
                    {n.readAt ? "READ" : "NEW"}
                  </Text>
                  <Text style={styles.spaceTitle}>
                    {n.title || "Campus notification"}
                  </Text>
                  <Text style={styles.meta}>{n.body || ""}</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.meta}>You are all caught up.</Text>
          )}
        </>
      );
    return (
      <>
        <Text style={styles.title}>
          {home?.greeting || "Your lycée, in motion."}
        </Text>
        <Text style={styles.subtitle}>
          {status?.requestedRole
            ? String(status.requestedRole).toUpperCase()
            : "CAMPUS MEMBER"}{" "}
          · {status?.schoolYear || "2026 — 2027"}
        </Text>
        {error && (
          <View style={[styles.surface, styles.error]}>
            <Text style={styles.errorTitle}>Campus unavailable</Text>
            <Text style={styles.meta}>{error}</Text>
          </View>
        )}
        <View style={[styles.surface, styles.hero]}>
          <Text style={styles.kicker}>ACADEMIC PULSE</Text>
          <Text style={styles.heroTitle}>
            {academic?.averagePercent != null
              ? `${academic.averagePercent}% academic average`
              : "Academic space ready"}
          </Text>
          <Text style={styles.meta}>
            {academic?.attendanceRate != null
              ? `${academic.attendanceRate}% attendance · ${academic?.recentGrades?.length || 0} recent grades`
              : "Your academic data will appear as the school config is populated."}
          </Text>
        </View>
        <Text style={styles.section}>TODAY</Text>
        {(home?.schedule || []).slice(0, 6).map((item, i: number) => (
          <View
            key={`${item.startTime || item.time}-${i}`}
            style={styles.timeline}
          >
            <View style={styles.time}>
              <Text style={styles.timeText}>{item.startTime || item.time}</Text>
            </View>
            <View style={styles.timelineDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {item.subject || item.title || "Campus activity"}
              </Text>
              <Text style={styles.meta}>
                {item.room || item.location || ""}
              </Text>
            </View>
          </View>
        ))}
      </>
    );
  };

  if (loading)
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.meta}>Connecting to Abi Mizrak Campus…</Text>
        </View>
      </SafeAreaView>
    );
  if (!session)
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <Text style={styles.eyebrow}>ABI MIZRAK · MOBILE</Text>
          <Text style={styles.title}>Your lycée, in your pocket.</Text>
          <Text style={styles.subtitle}>
            Use your managed campus account. School affiliation is enforced on
            the server.
          </Text>
          <View style={[styles.surface, styles.authCard]}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="School email"
              placeholderTextColor={palette.muted}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
            <TextInput
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={palette.muted}
              value={password}
              onChangeText={setPassword}
              style={[styles.input, { marginTop: 10 }]}
            />
            <Pressable
              disabled={authBusy || !email || !password}
              onPress={signIn}
              style={[
                styles.primary,
                { opacity: authBusy || !email || !password ? 0.5 : 1 },
              ]}
            >
              <Text style={styles.primaryText}>
                {authBusy ? "Signing in…" : "Sign in"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.eyebrow}>ABI MIZRAK · CAMPUS</Text>
            <Text style={styles.date}>Digital campus</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        {renderBody()}
        <Pressable
          onPress={() => void supabase.auth.signOut()}
          style={styles.signOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.dock}>
        {(
          [
            ["home", "Home", "⌂"],
            ["spaces", "Spaces", "◈"],
            ["events", "Events", "◷"],
            ["notifications", "Inbox", "◌"],
            ["academic", "Academic", "▦"],
          ] as [MainTab, string, string][]
        ).map(([key, label, icon]) => (
          <Pressable
            key={key}
            onPress={() => setActiveTab(key)}
            style={styles.dockItem}
          >
            <Text
              style={[
                styles.dockIcon,
                { color: activeTab === key ? palette.accent : palette.muted },
              ]}
            >
              {icon}
              {key === "notifications" && unreadCount ? "•" : ""}
            </Text>
            <Text
              style={[
                styles.dockLabel,
                { color: activeTab === key ? palette.ink : palette.muted },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  authContent: { flexGrow: 1, justifyContent: "center", padding: 22 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  content: { padding: 20, paddingBottom: 120 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800",
    color: palette.muted,
  },
  date: { fontSize: 12, color: palette.muted, marginTop: 4 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "rgba(255,255,255,.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "900", color: palette.ink },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -1.3,
    color: palette.ink,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    color: palette.muted,
  },
  surface: {
    backgroundColor: palette.glass,
    borderColor: palette.line,
    borderWidth: 1,
    shadowColor: "#0B201A",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  authCard: { marginTop: 24, padding: 18, borderRadius: 26 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,.45)",
    paddingHorizontal: 14,
    color: palette.ink,
  },
  primary: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "900" },
  hero: { marginTop: 12, padding: 20, borderRadius: 26 },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "900",
    color: palette.accent,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: palette.ink,
    marginTop: 9,
  },
  meta: { fontSize: 12, lineHeight: 18, color: palette.muted, marginTop: 5 },
  section: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "900",
    color: palette.muted,
    marginTop: 20,
    marginBottom: 10,
  },
  space: {
    padding: 16,
    borderRadius: 22,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  columnSpace: { flexDirection: "column", alignItems: "stretch" },
  spaceType: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: palette.accent,
  },
  spaceTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: palette.ink,
    marginTop: 4,
  },
  chevron: { fontSize: 30, color: palette.muted },
  timeline: { flexDirection: "row", alignItems: "flex-start", minHeight: 64 },
  time: { width: 58 },
  timeText: { fontSize: 10, fontWeight: "900", color: palette.muted },
  timelineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.accent2,
    marginTop: 3,
    marginRight: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: palette.ink },
  tabRow: { paddingBottom: 4 },
  smallTab: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    marginRight: 6,
  },
  smallTabActive: { backgroundColor: palette.ink },
  smallTabText: { fontSize: 10, fontWeight: "800", color: palette.muted },
  smallTabTextActive: { color: "#fff" },
  inlineButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "rgba(255,255,255,.35)",
  },
  inlineButtonText: { fontSize: 11, fontWeight: "900", color: palette.ink },
  rowLine: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  score: { fontSize: 17, fontWeight: "900", color: palette.ink },
  error: { padding: 16, borderRadius: 20, marginTop: 16 },
  errorTitle: { fontWeight: "900", color: "#8B3D31" },
  signOut: { marginTop: 28, alignItems: "center", padding: 12 },
  signOutText: { fontWeight: "800", color: palette.muted },
  dock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,.76)",
    borderWidth: 1,
    borderColor: palette.line,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#0B201A",
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
  },
  dockItem: { alignItems: "center", justifyContent: "center", minWidth: 62 },
  dockIcon: { fontSize: 17, fontWeight: "900" },
  dockLabel: { fontSize: 10, fontWeight: "800", marginTop: 4 },
});

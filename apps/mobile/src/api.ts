import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export type VerificationStatus = {
  displayName?: string | null;
  requestedRole?: string | null;
  schoolYear?: string | null;
};
export type CampusScheduleItem = {
  startTime?: string | null;
  time?: string | null;
  subject?: string | null;
  title?: string | null;
  room?: string | null;
  location?: string | null;
};
export type CampusHome = {
  greeting?: string | null;
  schedule?: CampusScheduleItem[];
};
export type CampusSpace = {
  id: string;
  type?: string | null;
  name: string;
  description?: string | null;
};
export type AcademicOverview = {
  averagePercent?: number | null;
  attendanceRate?: number | null;
  recentGrades?: unknown[];
};
export type StudentAssignment = {
  id: string;
  subject: string;
  title: string;
  maxScore: number;
  dueDate: string;
  submission?: {
    status?: string | null;
    bodyText?: string | null;
    files?: Array<{ url: string; name?: string | null }>;
  } | null;
};
export type GradeRecord = {
  id: string;
  subject: string;
  type: string;
  coefficient: number;
  comment?: string | null;
  value: number;
  maxValue: number;
};
export type GradeGroup = {
  term?: { id?: string | null; label?: string | null } | null;
  grades: GradeRecord[];
};
export type AttendanceRecord = {
  id: string;
  date: string;
  period: string | number;
  status: string;
};
export type StudentAttendance = {
  rate?: number | null;
  records?: AttendanceRecord[];
};
export type TimetableEntry = {
  id: string;
  dayOfWeek: number;
  subject: string;
  startTime: string;
  endTime: string;
  room: string;
};
export type CampusEvent = {
  id: string;
  title: string;
  startTime: string;
  location?: string | null;
  attendeeStatus?: string | null;
};
export type CampusNotification = {
  id: string;
  readAt?: string | null;
  title?: string | null;
  body?: string | null;
  createdAt?: string | null;
};
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function request<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL.replace(/\/$/, "")}/api${path}`, {
    ...init,
    headers,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(body?.error || `Request failed (${response.status})`);
  return body as T;
}
export const getVerificationStatus = () =>
  request<VerificationStatus>("/identity/verification");
export const getCampusHome = () => request<CampusHome>("/campus/home");
export const getSpaces = () => request<CampusSpace[]>("/spaces");
export const getAcademic = () =>
  request<AcademicOverview>("/academic/overview");
export const getStudentAssignments = () =>
  request<StudentAssignment[]>("/academic/student/assignments");
export const getStudentGrades = () =>
  request<GradeGroup[]>("/academic/student/grades");
export const getStudentAttendance = () =>
  request<StudentAttendance>("/academic/student/attendance");
export const getStudentTimetable = () =>
  request<TimetableEntry[]>("/academic/student/timetable");
export const submitAssignment = (
  assignmentId: string,
  payload: { bodyText?: string; files?: Array<{ url: string; name?: string }> },
) =>
  request(`/academic/assignments/${assignmentId}/submission`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const getEvents = () => request<CampusEvent[]>("/events");
export const getNotifications = () =>
  request<CampusNotification[]>("/notifications");
export const markNotificationRead = (id: string) =>
  request(`/notifications/${id}/read`, { method: "POST" });
export const markAllNotificationsRead = () =>
  request<void>("/notifications/read-all", { method: "POST" });

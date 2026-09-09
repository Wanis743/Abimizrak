import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });

export async function request(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}
export const getVerificationStatus = () => request('/identity/verification');
export const getCampusHome = () => request('/campus/home');
export const getSpaces = () => request('/spaces');
export const getAcademic = () => request('/academic/overview');
export const getStudentAssignments = () => request('/academic/student/assignments');
export const getStudentGrades = () => request('/academic/student/grades');
export const getStudentAttendance = () => request('/academic/student/attendance');
export const getStudentTimetable = () => request('/academic/student/timetable');
export const submitAssignment = (assignmentId: string, payload: { bodyText?: string; files?: Array<{ url: string; name?: string }> }) => request(`/academic/assignments/${assignmentId}/submission`, { method: 'POST', body: JSON.stringify(payload) });
export const getEvents = () => request('/events');
export const getNotifications = () => request('/notifications');
export const markNotificationRead = (id: string) => request(`/notifications/${id}/read`, { method: 'POST' });

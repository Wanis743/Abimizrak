import type { NextFunction, Request, Response } from "express";
export type CampusRole = "student" | "teacher" | "admin" | "staff" | "parent";
export type AuthUser = { userId: string; email?: string; isSignedIn: true; metadata: Record<string, unknown> };

const normalized = (value: string) => value.trim().toLowerCase();
export function superAdminEmails(): Set<string> {
  return new Set((process.env.CAMPUS_SUPERADMIN_EMAILS ?? "").split(",").map(normalized).filter(Boolean));
}
export function requestAuth(req: Request): AuthUser | null {
  return (req as Request & { auth?: AuthUser | null }).auth ?? null;
}
export function isSuperAdministrator(req: Request): boolean {
  const email = requestAuth(req)?.email;
  return typeof email === "string" && superAdminEmails().has(normalized(email));
}
export type AuthedRequest = Request & { campusUserId?: string };
export function authUserId(req: Request): string | null { return requestAuth(req)?.userId ?? null; }
export function adminIds(): Set<string> { return new Set((process.env.CAMPUS_ADMIN_USER_IDS ?? "").split(",").map((v) => v.trim()).filter(Boolean)); }
export function isAdministrator(req: Request): boolean {
  const id = authUserId(req); if (!id) return false;
  if (isSuperAdministrator(req)) return true;
  return adminIds().has(id);
}
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!authUserId(req)) return res.status(401).json({ error: "Authentication required." });
  req.campusUserId = authUserId(req)!; return next();
}
export function requireSuperAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!isSuperAdministrator(req)) return res.status(403).json({ error: "Super administrator access required." });
  return next();
}
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!isAdministrator(req)) return res.status(403).json({ error: "Administrator access required." });
  return next();
}

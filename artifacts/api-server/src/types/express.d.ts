import type { AuthUser } from "../lib/authz";

declare module "express-serve-static-core" {
  interface Request {
    auth: AuthUser | null;
  }
}

export {};

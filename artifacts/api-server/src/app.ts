import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createClient } from "@supabase/supabase-js";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

app.disable("x-powered-by");
app.use(pinoHttp({ logger }));
const allowedOrigins = new Set((process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((v) => v.trim()).filter(Boolean));
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS."));
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(async (req: Request & { auth?: import("./lib/authz").AuthUser | null }, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { req.auth = null; return next(); }
  const token = authHeader.slice(7).trim();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  req.auth = error || !user ? null : {
    userId: user.id,
    email: user.email,
    isSignedIn: true,
    metadata: user.user_metadata ?? {},
  };
  return next();
});
app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error && err.message === "Origin not allowed by CORS.") {
    res.status(403).json({ error: err.message });
    return;
  }
  if (err && typeof err === "object" && "issues" in err) {
    res.status(400).json({ error: "Invalid request.", details: (err as { issues?: unknown }).issues ?? null });
    return;
  }
  reqLogError(err);
  res.status(500).json({ error: "Internal server error." });
});

function reqLogError(err: unknown) {
  logger.error({ err }, "Unhandled API error");
}

export default app;

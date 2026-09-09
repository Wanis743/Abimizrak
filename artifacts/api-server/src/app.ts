import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
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
app.set("trust proxy", 1);
app.use(pinoHttp({ logger }));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-site" },
  contentSecurityPolicy: false,
}));
const allowedOrigins = new Set((process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((v) => v.trim()).filter(Boolean));
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS."));
  },
}));
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  skip: (req) => req.method === "OPTIONS",
}));
app.use(express.json({ limit: "256kb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "64kb", parameterLimit: 100 }));
app.use(async (req: Request & { auth?: import("./lib/authz").AuthUser | null }, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) { req.auth = null; return next(); }
  const token = authHeader.slice(7).trim();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  req.auth = error || !user ? null : {
    userId: user.id,
    email: user.email,
    isSignedIn: true,
    // User-editable metadata is retained only for non-authoritative profile display.
    // Authorization is derived from the verified user id/email and server-side data.
    metadata: {},
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
    res.status(400).json({ error: "Invalid request." });
    return;
  }
  if (err && typeof err === "object" && "type" in err && (err as { type?: string }).type === "entity.too.large") {
    res.status(413).json({ error: "Request body is too large." });
    return;
  }
  reqLogError(err);
  res.status(500).json({ error: "Internal server error." });
});

function reqLogError(err: unknown) {
  logger.error({ err }, "Unhandled API error");
}

export default app;

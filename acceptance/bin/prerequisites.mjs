import { identityVariables, requireAcceptanceEnvironment } from "../lib/config.mjs";

const common = ["SUPABASE_TEST_URL", "SUPABASE_TEST_ANON_KEY", "ACCEPTANCE_API_URL", "ACCEPTANCE_WEB_URL", ...Object.values(identityVariables).flat()];
try {
  requireAcceptanceEnvironment(common);
  console.log("READY - isolated acceptance prerequisites are configured; secret values were not printed");
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}

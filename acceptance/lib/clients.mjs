import { createClient } from "@supabase/supabase-js";
import { identityVariables, requireAcceptanceEnvironment } from "./config.mjs";

export function publicClient() {
  const env = requireAcceptanceEnvironment(["SUPABASE_TEST_URL", "SUPABASE_TEST_ANON_KEY"]);
  return createClient(env.SUPABASE_TEST_URL, env.SUPABASE_TEST_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticatedClient(role) {
  const [emailName, passwordName] = identityVariables[role];
  const env = requireAcceptanceEnvironment(["SUPABASE_TEST_URL", "SUPABASE_TEST_ANON_KEY", emailName, passwordName]);
  const client = createClient(env.SUPABASE_TEST_URL, env.SUPABASE_TEST_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: env[emailName], password: env[passwordName] });
  if (error || !data.session) throw new Error(`Authentication failed for controlled ${role} identity`);
  return client;
}

export async function accessToken(role) {
  const client = await authenticatedClient(role);
  const { data } = await client.auth.getSession();
  return { client, token: data.session.access_token };
}

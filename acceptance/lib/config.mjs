const PLACEHOLDER = /^(replace-|https:\/\/project-ref\.|.*@example\.invalid$)/;

export class BlockedPrerequisiteError extends Error {
  constructor(message) {
    super(`BLOCKED - ${message}`);
    this.name = "BlockedPrerequisiteError";
  }
}

export function requireAcceptanceEnvironment(names) {
  if (process.env.ACCEPTANCE_ENVIRONMENT_ID !== "abi-mizrak-acceptance-only") {
    throw new BlockedPrerequisiteError("ACCEPTANCE_ENVIRONMENT_ID must identify the isolated acceptance environment");
  }
  const missing = names.filter((name) => !process.env[name] || PLACEHOLDER.test(process.env[name]));
  if (missing.length) throw new BlockedPrerequisiteError(`${missing.join(" / ")} not configured`);
  const url = process.env.SUPABASE_TEST_URL;
  if (url && /production|prod[.-]/i.test(url)) {
    throw new BlockedPrerequisiteError("SUPABASE_TEST_URL appears to reference production");
  }
  return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}

export const identityVariables = {
  studentA: ["ACCEPTANCE_STUDENT_A_EMAIL", "ACCEPTANCE_STUDENT_A_PASSWORD"],
  studentB: ["ACCEPTANCE_STUDENT_B_EMAIL", "ACCEPTANCE_STUDENT_B_PASSWORD"],
  teacher: ["ACCEPTANCE_TEACHER_EMAIL", "ACCEPTANCE_TEACHER_PASSWORD"],
  administrator: ["ACCEPTANCE_ADMIN_EMAIL", "ACCEPTANCE_ADMIN_PASSWORD"],
  nonMember: ["ACCEPTANCE_NON_MEMBER_EMAIL", "ACCEPTANCE_NON_MEMBER_PASSWORD"],
};

# Security configuration

Authorization is derived from the authenticated Supabase user id/email and trusted server-side campus records. Supabase `user_metadata` and `raw_user_meta_data` must never be used for authorization.

`CAMPUS_ADMIN_USER_IDS` and `CAMPUS_SUPERADMIN_EMAILS` are server-only settings. Configure them in the API runtime secret store. Never prefix privileged configuration with `VITE_` or `EXPO_PUBLIC_`, and never commit real privileged identities. Only configured super administrators may grant, revoke, or otherwise mutate administrator access.

The public API base path is `/api`. CORS origins are supplied as a comma-separated `CORS_ORIGIN` allowlist. The API applies security headers, body-size limits, safe error responses, and rate limiting.

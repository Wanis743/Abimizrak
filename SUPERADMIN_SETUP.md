# Platform Super Administrator

An account is configured as a **server-side super administrator** only when its email is explicitly included in `CAMPUS_SUPERADMIN_EMAILS`.

This is an explicit RBAC entitlement, not a backdoor. It is protected by the normal authenticated session, enforced server-side, and remains auditable. Ordinary member/talent discovery excludes the configured super-admin identity.

Set the environment variable in the deployment environment:

```env
CAMPUS_SUPERADMIN_EMAILS=admin@example.invalid
```

Do not put credentials or service-role keys in source control. Rotate any credential that has previously been committed to an archive.

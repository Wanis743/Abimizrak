# Platform Super Administrator

The account `muossadada@gmail.com` is configured as a **server-side super administrator** when its email is included in `CAMPUS_SUPERADMIN_EMAILS`.

This is an explicit RBAC entitlement, not a backdoor. It is protected by the normal authenticated session, enforced server-side, and remains auditable. Ordinary member/talent discovery excludes the configured super-admin identity.

Set the environment variable in the deployment environment:

```env
CAMPUS_SUPERADMIN_EMAILS=muossadada@gmail.com
```

Do not put credentials or service-role keys in source control. Rotate any credential that has previously been committed to an archive.

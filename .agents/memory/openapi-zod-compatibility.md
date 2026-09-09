---
name: OpenAPI integer compatibility
description: Compatibility constraint between the workspace OpenAPI generator and its installed Zod version.
---

Use `type: number` for count-like API fields when working in this workspace's OpenAPI spec. The current generator emits `zod.int()` for OpenAPI `integer`, but the installed Zod 3 runtime does not expose that helper, causing generated library typechecks to fail.

**Why:** Codegen completed successfully but the generated validation package failed to compile until the integer schemas were changed to numeric schemas.

**How to apply:** When adding API contracts, preserve integer semantics in application logic if needed, but avoid OpenAPI `integer` unless the workspace Zod/generator versions have been upgraded together.
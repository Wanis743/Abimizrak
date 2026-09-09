The user has requested to transition the application to use Supabase Direct with RLS (Option A).
Your task is to completely remove `@workspace/api-client-react` from `artifacts/abi-mizrak-campus` and replace all data fetching hooks with direct `@supabase/supabase-js` queries using `@tanstack/react-query`.

Instructions:
1. Look at `artifacts/abi-mizrak-campus/src/App.tsx` and all components inside `src/components/` and `src/pages/` that import from `@workspace/api-client-react`.
2. Replace hooks like `useGetCampusHome()`, `useGetSpaces()`, `useGetSpace(spaceId)`, `useGetSpacePosts()` with custom `useQuery` hooks.
3. Use `import { supabase } from '@/lib/supabase'` to make queries like `supabase.from('campus_spaces').select('*')`.
4. Import the necessary TypeScript types from `@workspace/db/schema` (e.g. `import { CampusSpace, CampusPost } from '@workspace/db/schema'`) to keep the frontend typesafe.
5. Make sure the application compiles successfully (`pnpm run typecheck` or Vite build).
6. Do NOT touch the UI styling, only the data fetching layer.

Begin by searching for all imports of `@workspace/api-client-react` in the frontend directory.

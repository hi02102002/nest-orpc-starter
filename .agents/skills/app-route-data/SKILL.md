---

name: app-route-data
description: "How routes in apps/web load data and auth state (TanStack Router + Start + Query). Use this skill whenever a task adds or changes a route's beforeLoad, loader, loaderDeps, route context, a route guard, session access, or a query a page needs before it renders (prefetch, SSR data, 'refresh shows empty/redirects'). Also use it when a page fetches with useQuery and it should be prefetched in a loader instead. Pairs with app-ui for the page itself."
---

# Route data loading (apps/web)

Reference implementations: `src/routes/__root.tsx` (session), `src/routes/_authed/route.tsx` (guard), `src/routes/_authed/admin/users/index.tsx` (prefetched list).

## Which lifecycle for what

| Need                                                            | Use                                            | Why                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Session / auth gate, redirects                                  | `beforeLoad`                                   | Runs before any loader, on every navigation; can `throw redirect()`.                                |
| Values derived from params / `loaderDeps` (e.g. `queryOptions`) | route `context: ({ params, deps }) => ({ … })` | Runs only when params or deps change; children and the component read them via `useRouteContext()`. |
| Data the page needs on first paint                              | `loader` + `ensureQueryData`                   | Prefetches on navigation, on hover (`defaultPreload: "intent"`) and during SSR.                     |
| UI-only state (sidebar collapsed)                               | `loader` returning plain values                | Not server data, no query needed.                                                                   |

Never fetch page data in `beforeLoad`: it runs on every navigation (even search-param changes) and blocks child routes.

## Session in context

- `__root.tsx` `beforeLoad` returns `{ session: Session | null }` from `context.queryClient.fetchQuery(sessionQueryOptions)` (`@/lib/session`). Every route inherits `context.session`, typed.
- `_authed` redirects to `/login` when it's null and re-returns `{ session: context.session }`, so routes below `_authed` see a **non-null** `Session`. `_auth` redirects signed-in users to `/`. Role guards read `context.session.user` (see `_authed/admin/route.tsx` + `isAdmin`).
- Don't call `authClient.getSession()` or `getSession()` in routes; read `context.session`.
- After sign-in: `queryClient.removeQueries({ queryKey: sessionQueryKey })` before navigating. After sign-out: `queryClient.clear()` (drops the session and every user-specific query). `useSignOut` already does this.

## Prefetch a page's query (the standard pattern)

Build the `queryOptions` **once** in route `context` and use them in both the loader and the component, so the two can never drift apart:

```tsx
export const Route = createFileRoute("/_authed/admin/users/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search, // every search param that is part of the query key
	context: ({ deps }) => ({ usersQueryOptions: adminUsersQueryOptions(deps) }),
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(context.usersQueryOptions),
	component: RouteComponent,
});

function RouteComponent() {
	const { usersQueryOptions } = Route.useRouteContext();
	const { data, isFetching } = useQuery(usersQueryOptions);
}
```

Rules:

- **`loaderDeps` lists exactly the search params in the query key.** Missing one = the loader doesn't re-run and the component fetches again (waterfall). Path params are always available; don't list them.
- Components get query options **only from route context**, never by rebuilding them from `useSearch()` / `useParams()`.
- Child components in other files: `getRouteApi("/route/id").useRouteContext()`.
- `useQuery` with `placeholderData: keepPreviousData` for lists whose filters change in place (no suspense flash). `useSuspenseQuery` for detail pages where the loader always has the data.
- Loaders `return` (await) `ensureQueryData` so SSR renders with data. For a secondary, non-critical query, call `context.queryClient.prefetchQuery(...)` without awaiting.
- Mutations invalidate the query key; never mutate the loader result.
- Router config (`src/router.tsx`): `defaultPreload: "intent"`, `defaultPreloadStaleTime: 0` (TanStack Query decides freshness), QueryClient `staleTime: 30_000`, `setupRouterSsrQueryIntegration` (dehydrates prefetched queries to the client). Keep these.

## Fetchers must work during SSR

Loaders run on the web server during a full page load. A fetcher used in a loader has to send the user's cookie from there:

- **oRPC** (`context.orpc` / `getOrpc()`): the SSR link forwards the cookie. Nothing to do.
- **Better Auth client calls** (`authClient.admin.*` etc.): pass `fetchOptions: authFetchOptions()` (`@/lib/auth-request`). It forwards the cookie and uses `SERVER_URL` on the server, and is a no-op in the browser.
- Plain `fetch` to the API: don't. Add an oRPC procedure instead.

Symptom of getting this wrong: refresh shows the 500 page or empty data while client-side navigation works.

## Checklist

- [ ] Guards in `beforeLoad` read `context.session`; no session fetching in routes
- [ ] Page data: `loaderDeps` + `context` (queryOptions) + `loader` (`ensureQueryData`) + component reads `useRouteContext()`
- [ ] Every query-key search param is in `loaderDeps`
- [ ] Fetchers used in loaders work on the server (oRPC, or `authFetchOptions()`)
- [ ] Hard refresh of the page renders data (check the HTML, not just client navigation)

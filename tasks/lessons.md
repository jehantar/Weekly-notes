# Lessons Learned

## Supabase Types
- **Relationships field required**: Supabase JS v2.95+ requires `Relationships: []` in each table type definition. Without it, `.insert()` and `.single()` return `never` types.
- **Views, Enums, CompositeTypes**: Must be present in the Database type even if empty (`Record<string, never>`).
- **`.single()` type narrowing**: After `.single()`, the data type can be narrowed but TypeScript sometimes infers `never`. Explicit casts (`as Type | null`) are needed.
- **RPC types**: The `Functions` type in the Database interface doesn't always get picked up by `supabase.rpc()`. Using `any` cast is a pragmatic workaround.

## React 19
- **`useRef()` requires initial value**: `useRef<T>()` without argument is an error in React 19 types. Always use `useRef<T>(undefined)` or `useRef<T>(null)`.

## Next.js 16
- **`create-next-app` npm naming**: Directory names with capital letters fail npm naming restrictions. Manual scaffolding is cleaner.
- **Params are Promises**: In App Router, `params` in page components are `Promise<{ param: string }>` and must be awaited.

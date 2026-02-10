# Entities and store

Checklist to add a new entity with a persisted store. Use one placeholder name and replace it everywhere with your entity name.

---

## Placeholder and naming

Replace the placeholder with your entity name and keep casing consistent:

| Use for | Pattern | Example |
|--------|---------|--------|
| Class, type, schema model name | PascalCase | `Todo`, `Profile`, `Counter` |
| File names | camelCase | `todo.ts`, `todoStore.ts`, `useTodoStore.ts`, `useTodo.ts` |
| Store factory | `createXxxStore` | `createTodoStore` |
| Internal hook | `useXxxStore` | `useTodoStore` |
| Public hook | `useXxx` | `useTodo` |

The schema model name (e.g. `Todo`) must match the name used in code: `client.models.Todo.list`, `client.models.Todo.create`, etc.

Do not change: `amplifyAdapter`, `ensureConfigured`, `getDataClient`, paths under `app/domain`, `app/shared`, `app/shared/amplify`.

---

## What already exists (do not modify)

- **app/shared/amplify/amplifyAdapter.ts** – Configures Amplify once; used only by the store layer.
- **app/shared/amplify/counterStore.ts** and **useCounterStore.ts** – Reference implementation. Add new entity stores in the same folder using the same pattern.

---

## Checklist

- [ ] **1. Domain entity** – Create `app/domain/<entity>.ts` (e.g. `todo.ts`). Immutable class: constructor + readonly fields; methods return new instances (e.g. `increment()`, `updateTitle('x')`). Export from `app/domain/index.ts`.
- [ ] **2. Schema** – In `amplify/data/resource.ts`, add a model inside `a.schema({ ... })` with your fields and `.authorization((allow) => [allow.guest()])` or `allow.authenticated()`. Model name = PascalCase entity name (must match `client.models.<Name>`).
- [ ] **3. Deploy** – From repo root run `npm run sandbox`. Ensures `amplify_outputs.json` is updated. Schema changes apply only after deploy.
- [ ] **4. Store factory** – Add `app/shared/amplify/<entity>Store.ts` (e.g. `todoStore.ts`). Export type `XxxStore` and async `createXxxStore()` that calls `ensureConfigured()`, `getDataClient()`, then returns `{ get, set }`. get: `list({ limit: 1 })`, if row map to domain instance else create default and return it. set: list limit 1, if row update by id else create. Use `client.models.<Name>`.
- [ ] **5. Store hook** – Add `app/shared/amplify/useXxxStore.ts`. Use `createXxxStore()` in useEffect, hold store in state, expose `get`, `set`, `ready: store !== null`. When store is null, get returns default instance. Do not export this hook from `app/shared/index.ts`.
- [ ] **6. Public hook** – Add `app/shared/useXxx.ts`. Import store hook from `./amplify/useXxxStore`. On ready, load once with `get().then(setEntity)`. useState for entity (null until first load). useEffect: when `entity !== null` call `set(entity)` (fire-and-forget). Action callbacks update state only (e.g. setEntity with functional update). Return entity (or default), action callbacks, `isLoading: entity === null`. Export from `app/shared/index.ts`.
- [ ] **7. App** – In web/mobile, import the public hook from `app-shared`. Use `isLoading` to show loading until first fetch; then show entity and actions.

---

## Rules

**Do**

- Keep the entity class immutable; methods return new instances.
- Add the store in `app/shared/amplify/` (factory + useXxxStore hook).
- Guard the sync effect: only call `set(entity)` when `entity !== null` so you never persist before the first load.
- Use full callback names (e.g. `increment`, `decrement`) and functional state updates so callbacks are stable.
- Export only the public hook (e.g. `useTodo`) from `app/shared/index.ts`. Apps must not import the store hook.

**Do not**

- Mutate the entity instance.
- Create or change `amplifyAdapter.ts`.
- Add a `synced` flag; fire-and-forget persist in the effect is enough.
- Export the store hook from `app/shared/index.ts`.
- Use the store hook from app code; use only the public hook.

**Auth**

- `allow.guest()` – use when the screen works without sign-in (one row per guest/device).
- `allow.authenticated()` – use only when the user is signed in before using the entity; otherwise `list()` is empty and get/set will keep creating rows.

---

## Schema example

Inside `a.schema({ ... })` in `amplify/data/resource.ts`:

```ts
Todo: a
  .model({
    title: a.string().required(),
    value: a.integer().required(),
  })
  .authorization((allow) => [allow.guest()]),
```

---

## Domain entity example

```ts
// app/domain/todo.ts
export class Todo {
  readonly title: string;
  readonly value: number;

  constructor(title: string = '', value: number = 0) {
    this.title = title;
    this.value = value;
  }

  updateTitle(title: string): Todo {
    return new Todo(title, this.value);
  }

  increment(): Todo {
    return new Todo(this.title, this.value + 1);
  }
}
```

Export in `app/domain/index.ts`: `export { Todo } from './todo';`

---

## Store factory example (get/set pattern)

```ts
// app/shared/amplify/todoStore.ts
import { Todo } from 'app-domain';
import { ensureConfigured, getDataClient } from './amplifyAdapter';

export type TodoStore = {
  get: () => Promise<Todo>;
  set: (todo: Todo) => Promise<void>;
};

export async function createTodoStore(): Promise<TodoStore> {
  await ensureConfigured();
  const client = getDataClient();
  return {
    async get() {
      const { data } = await client.models.Todo.list({ limit: 1 });
      const row = data[0];
      if (row) return new Todo(row.title, row.value);
      await client.models.Todo.create({ title: '', value: 0 });
      return new Todo('', 0);
    },
    async set(todo) {
      const { data } = await client.models.Todo.list({ limit: 1 });
      const row = data[0];
      if (row) {
        await client.models.Todo.update({ id: row.id, title: todo.title, value: todo.value });
      } else {
        await client.models.Todo.create({ title: todo.title, value: todo.value });
      }
    },
  };
}
```

---

## Store hook example

```ts
// app/shared/amplify/useTodoStore.ts
import { useCallback, useEffect, useState } from 'react';
import { Todo } from 'app-domain';
import { createTodoStore } from './todoStore';

export function useTodoStore() {
  const [store, setStore] = useState<Awaited<ReturnType<typeof createTodoStore>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    createTodoStore().then((s) => {
      if (!cancelled) setStore(s);
    });
    return () => { cancelled = true; };
  }, []);

  const get = useCallback<() => Promise<Todo>>(
    async () => (store ? store.get() : new Todo('', 0)),
    [store]
  );
  const set = useCallback(
    async (todo: Todo) => { if (store) await store.set(todo); },
    [store]
  );

  return { get, set, ready: store !== null };
}
```

---

## Public hook example

```ts
// app/shared/useTodo.ts
import { useCallback, useEffect, useState } from 'react';
import { Todo } from 'app-domain';
import { useTodoStore } from './amplify/useTodoStore';

export function useTodo() {
  const { get, set, ready } = useTodoStore();
  const [todo, setTodo] = useState<Todo | null>(null);

  useEffect(() => {
    if (!ready) return;
    get().then(setTodo);
  }, [ready, get]);

  useEffect(() => {
    if (todo === null) return;
    set(todo);
  }, [todo, set]);

  const updateTitle = useCallback((title: string) => {
    setTodo((t) => (t ? t.updateTitle(title) : t));
  }, []);
  const increment = useCallback(() => {
    setTodo((t) => (t ? t.increment() : t));
  }, []);

  return {
    todo: todo ?? new Todo('', 0),
    updateTitle,
    increment,
    isLoading: todo === null,
  };
}
```

Add to `app/shared/index.ts`: `export { useTodo } from './useTodo';`

---

## App usage example

```tsx
import { useTodo } from 'app-shared';

export default function TodoScreen() {
  const { todo, updateTitle, increment, isLoading } = useTodo();

  if (isLoading) return <Text>Loading…</Text>;

  return (
    <View>
      <Text>{todo.title}</Text>
      <Text>{todo.value}</Text>
      <Pressable onPress={increment}><Text>+</Text></Pressable>
    </View>
  );
}
```

---

## Before and after

**Before starting:** `amplify_outputs.json` exists at repo root (run `npm run sandbox` once).

**After finishing:** Run the app, change the entity, reload; the value should persist.

**If `client.models.<Name>` has TypeScript errors:** Deploy the schema and ensure the model name in code matches the schema. If `list()` is always empty, check auth: use `allow.guest()` for unauthenticated usage or ensure the user is signed in when using `allow.authenticated()`.

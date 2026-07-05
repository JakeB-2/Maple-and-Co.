# Drawer + form system — API reference & canonical usage

Copied from Portal (M1). This doc is the distilled contract; the code in
`components/screens/` and `lib/hooks/` is near-byte-identical to Portal's.

## URL grammar (everything keys off this)

- `?selected=<id>` — open the detail surface for a row
- `?new=1` — open the create FormDrawer
- `?edit=<id>` — open the edit FormDrawer
- Secondary entity on the same route: `selected_<entity>` / `new_<entity>` / `edit_<entity>`
- Occurrences (M4): `?selected=<id>:<date>`

`lib/nav/preserve-drawer-nav.ts` is the single source of truth. Every drawer
navigation must preserve all OTHER params (sort/q/filters/page) — that is
`layerDrawerHrefOntoCurrentUrl(...)`, reached via `useDrawerNavHref()`.

## Core components (`components/screens/`)

- **DetailDrawer** — `DrawerNavProps & { children, size?: 'sm'|'md'|'lg', header?: {mode?, eyebrow?, title, subtitle?, extraActions?}, footer?, expandHref?, isBack? }`.
  `DrawerNavProps` = `{paramKey, paramValue}` (URL-driven; close = router.replace stripping the key) XOR `{open, onOpenChange}`.
- **DrawerPortalContext** — drawer body publishes its scroll container; popover/select/combobox MUST portal there or the Sheet focus trap eats clicks (their Portal fallback reads this context — restored to Portal shape in M1).
- **FormDrawer** — `DrawerNavProps & { title, mode?: 'create'|'edit', size?, mobilePresentation?: 'side'|'bottom' (bottom-sheet default on phones) }`. Owns the dirty-close "Discard changes?" dialog via `form-drawer-context`.
- **ResourceFormDrawers** — `{isNew, editId, newTitle, editTitle, newBody, editBody, newParam?, editParam?}` — the canonical pair of create/edit drawers with `<Suspense fallback={<FormSkeleton/>}>` around async server-component bodies.
- **FormShell** — `AppForm{schema, defaultValues, onSubmit, autoFocusFirstField?}` (RHF + zodResolver, mode 'onBlur', Ctrl/Cmd+S submits), `FormSection{title}`, `FormActions{cancelHref?, submitLabel?, error?}`, `FieldWrapper`.
- **Form fields** (`form-fields-*.tsx`) — all typed `<T extends FieldValues>` with `name: Path<T>`; auto-wired to RHF errors: TextField, TextareaField, NumberField (`nullable?`), CheckboxField, FileField, SelectField (`options[], allowNone?`), ComboboxField, DateField (emits `Date|null`; convert with `formatLocalDate` before writing DATE columns), ColorField (+`COLOR_PALETTE`), RatingField, ScaleField.
- **CrudForm / ResourceCrudForm** — form scaffolds. For this app use the **`kind: 'action'`** variant (or `useActionSubmit` directly) pointing at our bespoke `lib/actions/*` — we did NOT copy Portal's `crudMutation` entity registry.
- **use-url-row-selection** — `useUrlRowSelection(selectedId)` → `{selectRow(id), newHref(), selectedRowClassName(id)}`; selectRow toggles `?selected=` and always clears `?new`/`?edit`.

## Hooks (`lib/hooks/`)

- **useActionSubmit** (`use-crud-submit.ts`) — `{onSubmit: (values, force) => Promise<ActionResult<{id}>>, redirect?, successMessage?}` → `{handleSubmit, submitError, submitWarnings, force, setForce, isPending}`. Warnings-without-error = NOT committed; UI renders `<ActionWarnings/>` + force checkbox; resubmit with force=true commits (payload change drops the force flag).
- **useSoftDeleteWithUndo** — `runDelete({table, id, label?, noun?})`: calls `softDelete(table, id)` (our fresh `lib/actions/soft-delete.ts`, whitelist-gated), then 15s sonner toast with Undo → `restoreSoftDelete`. `refreshNow()` around both.
- **useMutationRefresh** — `{refreshNow, pushAndRefresh(href), replaceAndRefresh}`; post-save navigation = `pushAndRefresh(layered '?selected=<id>' href)` which closes the form drawer, opens the detail, preserves list state, and refreshes the server list in one shot.
- **useOptimisticList** — `[optimisticItems, applyOptimistic]` with add/update/remove; call inside `startTransition` before awaiting the action (M2 shopping mode).
- **useViewportKeyboardInset / useAutoFocusFirstField** — internals of the drawer/form system.

## Canonical page wiring (Portal's "brands" pattern, ~6 files)

```tsx
// page.tsx (server)
export default async function Page({ searchParams }: { searchParams: Promise<{selected?, new?, edit?}> }) {
  const params = await searchParams
  const [rows, selected] = await Promise.all([fetchList(), params.selected ? fetchOne(params.selected) : null])
  return (<>
    <List rows={rows} selectedId={params.selected ?? null} />
    {selected && <EntityDetailDrawer row={selected} />}          {/* ?selected= */}
    <ResourceFormDrawers isNew={params.new === '1'} editId={params.edit ?? null}
      newTitle="New X" editTitle="Edit X"
      newBody={<XFormBody mode="new" />} editBody={params.edit ? <XFormBody mode="edit" id={params.edit} /> : null} />
  </>)
}
```
- List rows: `const { selectRow } = useUrlRowSelection(selectedId)` → `onClick={() => selectRow(row.id)}`.
- Detail header edit link: `?selected=<id>&edit=<id>` (closing edit lands back on detail).
- Form body = async server component (fetch row, map nulls → `''` for RHF) rendering a `'use client'` form: `AppForm` + fields + `FormActions`, submitting via `useActionSubmit({onSubmit: (v) => updateSpend(id, v), redirect: ...})`.
- Delete: `useSoftDeleteWithUndo().runDelete({table: 'spends', id, label, noun: 'Spend'})`.
- Every read filters `.is('deleted_at', null)`.

## Gotchas

- `route-help-link.tsx` is a null-rendering stub (Portal's help system not copied) — keep passing `helpArticleId` through untouched.
- `ActionResult.warnings` is `ActionWarning[]` (`{kind, message, meta?}`), not strings — widened in M1 to match this machinery.
- `use-mutation-refresh` uses `protec:`-prefixed sessionStorage/event keys — harmless, kept for byte-fidelity.
- DateField emits `Date | null`; DATE columns want `'YYYY-MM-DD'` via `formatLocalDate` (lib/format-date).

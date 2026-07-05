'use client'

// ResourceCrudForm — collapses the "mode==='new' ? <CrudForm create> :
// <CrudForm edit>" double-spell that every single-table settings/catalog drawer
// body would otherwise re-implement. Both branches differ only in mechanical,
// derivable bits:
//   - title:       `New ${label}` / `Edit ${label}`
//   - submitLabel: `Create ${label}` (overridable) / "Save Changes"
//   - back/cancel: listHref (new) / `${listHref}?selected=${id}` (edit)
//   - redirect:    to the ?selected= drawer (default) or the bare list
//
// Unlike Portal (entity registry), the caller supplies the two bespoke server
// actions. For asymmetric create paths (multi-table, side-writes) use
// CrudForm / AppForm directly; this is only the symmetric create+edit case.

import type { FieldValues, DefaultValues } from 'react-hook-form'
import { type ZodType } from 'zod'
import { CrudForm } from '@/components/screens/crud-form'
import type { CrudActionResult } from '@/lib/hooks/use-crud-submit'

type CommonProps<
  T extends FieldValues & Record<string, unknown>,
  TInput extends FieldValues = FieldValues,
> = {
  schema: ZodType<T, TInput>
  /** Base list route, e.g. '/settings/categories'. Drawer URLs derive from it. */
  listHref: string
  /** Singular noun, e.g. 'Category'. Drives the default title + create label. */
  label: string
  /** Client-side payload shaping before the write (else CrudForm nullifyEmpty). */
  transform?: (values: T) => Record<string, unknown>
  /** Override the create submit label (default `Create ${label}`). */
  createLabel?: string
  /** After save, go to the ?selected= drawer (default) or the bare list. */
  redirectMode?: 'selected' | 'list'
  /**
   * The ?selected= row to return to when it differs from the edited record's
   * id (editing a secondary entity from another row's drawer).
   */
  selectedId?: string
  /** The form fields (a <*FormFields /> element). */
  children: React.ReactNode
}

export type ResourceCrudFormProps<
  T extends FieldValues & Record<string, unknown>,
  TInput extends FieldValues = FieldValues,
> =
  CommonProps<T, TInput> &
    (
      | {
          mode: 'new'
          defaultValues: DefaultValues<TInput>
          createAction: (values: Record<string, unknown>) => Promise<CrudActionResult>
        }
      | {
          mode: 'edit'
          id: string
          defaultValues: DefaultValues<TInput>
          updateAction: (id: string, values: Record<string, unknown>) => Promise<CrudActionResult>
        }
    )

export function ResourceCrudForm<
  T extends FieldValues & Record<string, unknown>,
  TInput extends FieldValues = FieldValues,
>(props: ResourceCrudFormProps<T, TInput>) {
  const {
    schema,
    listHref,
    label,
    transform,
    createLabel,
    redirectMode = 'selected',
    selectedId,
    children,
  } = props
  const toSelected = redirectMode !== 'list'

  if (props.mode === 'new') {
    return (
      <CrudForm<T, TInput>
        schema={schema}
        defaultValues={props.defaultValues}
        transform={transform}
        onSubmit={(values) => props.createAction(values)}
        redirect={toSelected ? (id) => `${listHref}?selected=${id}` : { mode: 'list', listHref }}
        title={`New ${label}`}
        backHref={listHref}
        cancelHref={listHref}
        submitLabel={createLabel ?? `Create ${label}`}
        chrome="drawer"
      >
        {children}
      </CrudForm>
    )
  }

  const selectedHref = `${listHref}?selected=${selectedId ?? props.id}`
  const backHref = toSelected ? selectedHref : listHref
  return (
    <CrudForm<T, TInput>
      schema={schema}
      defaultValues={props.defaultValues}
      transform={transform}
      onSubmit={(values) => props.updateAction(props.id, values)}
      redirect={toSelected ? () => selectedHref : { mode: 'list', listHref }}
      title={`Edit ${label}`}
      backHref={backHref}
      cancelHref={backHref}
      submitLabel="Save Changes"
      chrome="drawer"
    >
      {children}
    </CrudForm>
  )
}

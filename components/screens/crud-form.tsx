'use client'

// CrudForm — the standard form chrome (AppForm + FormHeader + ActionWarnings +
// FormActions with error/toast/redirect lifecycle) around a CALLER-SUPPLIED
// server action.
//
// Portal's version also had entity-registry variants driven by a generic
// crudMutation chokepoint; this app deliberately has no entity registry —
// every write is a bespoke action in lib/actions/* — so only the action
// variant exists here. The action must return ActionResult<T> and honour the
// warning/force contract (warnings + no error => NOT committed; re-submit
// with force=true after the user acknowledges).

import type { FieldValues, DefaultValues } from 'react-hook-form'
import { type ZodType } from 'zod'
import { AppForm, FormScreen, FormHeader, FormActions } from '@/components/screens/form-shell'
import { ActionWarnings } from '@/components/ui/action-warnings'
import {
  useActionSubmit,
  type RedirectSpec,
  type CrudActionResult,
} from '@/lib/hooks/use-crud-submit'

export type CrudFormProps<
  T extends FieldValues & Record<string, unknown>,
  TInput extends FieldValues = FieldValues,
> = {
  schema: ZodType<T, TInput>
  defaultValues: DefaultValues<TInput>
  /** Client-side payload shaping before the write (default: nullifyEmpty). */
  transform?: (values: T) => Record<string, unknown>
  title: string
  backHref: string
  backLabel?: string
  cancelHref: string
  submitLabel?: string
  chrome?: 'page' | 'drawer'
  children: React.ReactNode
  /**
   * Bespoke server action. Receives the transformed values and the resolved
   * `force` flag, returns an ActionResult. When `data.id` is present it is
   * threaded into a function-style `redirect`.
   */
  onSubmit: (values: Record<string, unknown>, force: boolean) => Promise<CrudActionResult>
  /** Post-success navigation. Omit to stay put (e.g. drawer closes via onSuccess). */
  redirect?: RedirectSpec
  /** Success-side hook (close a drawer, refresh a parent) before redirect. */
  onSuccess?: (result: CrudActionResult) => void
  /** Pass null to suppress the success toast entirely. */
  successMessage?: string | null
  errorPrefix?: string
}

// Inner component lives inside AppForm so FormActions can call useFormContext.
function CrudFormContent<
  T extends FieldValues & Record<string, unknown>,
  TInput extends FieldValues = FieldValues,
>(props: CrudFormProps<T, TInput>) {
  const {
    title,
    backHref,
    backLabel = 'Back',
    cancelHref,
    submitLabel = 'Save',
    chrome = 'page',
    children,
  } = props

  const { submitError, submitWarnings, force, setForce, handleSubmit } = useActionSubmit<T>({
    onSubmit: props.onSubmit,
    transform: props.transform,
    redirect: props.redirect,
    onSuccess: props.onSuccess,
    successMessage: props.successMessage,
    errorPrefix: props.errorPrefix,
  })

  const body = (
    <>
      {children}
      <ActionWarnings
        warnings={submitWarnings}
        force={force}
        onForceChange={setForce}
        forceLabel="I reviewed this warning - save anyway"
      />
      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} error={submitError} />
    </>
  )

  return (
    <AppForm
      schema={props.schema}
      defaultValues={props.defaultValues}
      onSubmit={handleSubmit}
      autoFocusFirstField
    >
      {chrome === 'page' ? (
        <FormScreen>
          <FormHeader title={title} backHref={backHref} backLabel={backLabel} />
          {body}
        </FormScreen>
      ) : (
        <div className="space-y-6">{body}</div>
      )}
    </AppForm>
  )
}

export function CrudForm<
  T extends FieldValues & Record<string, unknown>,
  TInput extends FieldValues = FieldValues,
>(props: CrudFormProps<T, TInput>) {
  return <CrudFormContent {...props} />
}

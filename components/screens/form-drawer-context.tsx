'use client'

import * as React from 'react'

type FormDrawerContextValue = {
  reportDirty: (dirty: boolean) => void
  requestClose: () => void
}

const FormDrawerContext = React.createContext<FormDrawerContextValue | null>(null)

export function FormDrawerGuardProvider({
  value,
  children,
}: {
  value: FormDrawerContextValue
  children: React.ReactNode
}) {
  return (
    <FormDrawerContext.Provider value={value}>
      {children}
    </FormDrawerContext.Provider>
  )
}

export function useFormDrawerGuard() {
  return React.useContext(FormDrawerContext)
}

export function useReportFormDrawerDirty(dirty: boolean) {
  const guard = useFormDrawerGuard()

  React.useEffect(() => {
    guard?.reportDirty(dirty)
  }, [dirty, guard])
}

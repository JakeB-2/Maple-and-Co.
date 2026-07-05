'use client'

import { Suspense, type ReactNode } from 'react'
import {
  FormDrawer,
  type FormDrawerMobilePresentation,
  type FormDrawerSize,
} from './form-drawer'
import { FormSkeleton } from './form-skeleton'

type Props = {
  isNew: boolean
  editId?: string | null
  newTitle: ReactNode
  editTitle: ReactNode
  newBody: ReactNode
  editBody: ReactNode
  newParam?: string
  editParam?: string
  newValue?: string
  newSize?: FormDrawerSize
  editSize?: FormDrawerSize
  mobilePresentation?: FormDrawerMobilePresentation
  fallback?: ReactNode
}

type CreateDrawerProps = {
  isOpen: boolean
  title: ReactNode
  body: ReactNode
  param?: string
  value?: string
  size?: FormDrawerSize
  mobilePresentation?: FormDrawerMobilePresentation
  fallback?: ReactNode
}

export function ResourceCreateDrawer({
  isOpen,
  title,
  body,
  param = 'new',
  value = '1',
  size = 'md',
  mobilePresentation = 'bottom',
  fallback = <FormSkeleton />,
}: CreateDrawerProps) {
  return (
    <FormDrawer
      paramKey={param}
      paramValue={isOpen ? value : null}
      title={title}
      mode="create"
      size={size}
      mobilePresentation={mobilePresentation}
    >
      <Suspense fallback={fallback}>{isOpen ? body : null}</Suspense>
    </FormDrawer>
  )
}

export function ResourceFormDrawers({
  isNew,
  editId,
  newTitle,
  editTitle,
  newBody,
  editBody,
  newParam = 'new',
  editParam = 'edit',
  newValue = '1',
  newSize = 'md',
  editSize = 'md',
  mobilePresentation = 'bottom',
  fallback = <FormSkeleton />,
}: Props) {
  return (
    <>
      <FormDrawer
        paramKey={newParam}
        paramValue={isNew ? newValue : null}
        title={newTitle}
        mode="create"
        size={newSize}
        mobilePresentation={mobilePresentation}
      >
        <Suspense fallback={fallback}>{isNew ? newBody : null}</Suspense>
      </FormDrawer>

      <FormDrawer
        paramKey={editParam}
        paramValue={editId}
        title={editTitle}
        mode="edit"
        size={editSize}
        mobilePresentation={mobilePresentation}
      >
        <Suspense fallback={fallback}>{editId ? editBody : null}</Suspense>
      </FormDrawer>
    </>
  )
}

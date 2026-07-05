'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ButtonProps = React.ComponentProps<typeof Button>

type CreateActionButtonProps = Omit<
  ButtonProps,
  'aria-label' | 'asChild' | 'children' | 'size' | 'title'
> & {
  label: string
  href?: string
  size?: 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg'
}

export function CreateActionButton({
  label,
  href,
  size = 'icon-sm',
  variant = 'default',
  ...buttonProps
}: CreateActionButtonProps) {
  if (href) {
    return (
      <Button
        {...buttonProps}
        asChild
        size={size}
        variant={variant}
        aria-label={label}
        title={label}
      >
        <Link href={href}>
          <Plus className="size-4" aria-hidden />
        </Link>
      </Button>
    )
  }

  return (
    <Button
      {...buttonProps}
      size={size}
      variant={variant}
      aria-label={label}
      title={label}
    >
      <Plus className="size-4" aria-hidden />
    </Button>
  )
}

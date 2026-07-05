import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-2 py-0.5 text-micro font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary-soft)] text-primary [a]:hover:bg-[var(--primary-soft-2)]",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // Semantic variants pull from app-level tokens through data-variant
        // attribute selectors in globals.css. Keeping those colours out of
        // utility classes makes the badge shape and tone easy to audit.
        success: "",
        warning: "",
        info: "",
        // Reads as "inactive / unavailable / none" — faded text on a flat grey
        // fill with a faint visible border, clearly distinct from the active
        // colour chips above (which are saturated and borderless).
        muted:
          "bg-muted text-muted-foreground/70 border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

// Left-edge row-stripe colour for a status rendered as a Badge — lets a list
// reuse the same status→variant mapping it already feeds the badge to colour the
// row (DataTable `rowAccent`). Only semantic tones return a colour; neutral
// variants (secondary/outline/ghost/link/muted) return undefined so calm rows
// stay un-striped and the eye goes to rows that carry meaning.
export function badgeVariantAccent(variant: BadgeVariant): string | undefined {
  switch (variant) {
    case "success": return "var(--color-success)"
    case "warning": return "var(--color-warning)"
    case "info": return "var(--color-info)"
    case "destructive": return "var(--color-danger)"
    case "default": return "var(--primary)"
    default: return undefined
  }
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

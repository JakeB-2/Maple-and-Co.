"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, useSonner, type ToastT, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const DEFAULT_POSITION: NonNullable<ToasterProps["position"]> = "bottom-right"

// The tab bar is fixed bottom (~64px + safe area) and the capture FAB sits at
// bottom-24 (96px) on the right, ~40px tall. A default bottom-right toast lands
// right on the FAB — bad, because the Undo action toast (spend/grocery/pet
// delete, task-complete undo, occurrence-delete undo) is the one you most need
// to tap. Lift the stack above the FAB so Undo stays reachable (R-review R2).
const DEFAULT_OFFSET: NonNullable<ToasterProps["offset"]> = { bottom: "5rem", right: "1.5rem" }
const DEFAULT_MOBILE_OFFSET: NonNullable<ToasterProps["mobileOffset"]> = {
  bottom: "calc(env(safe-area-inset-bottom) + 9rem)",
  left: "1rem",
  right: "1rem",
}

function renderedToastId(
  toasts: ToastT[],
  toastElement: HTMLElement,
  position: NonNullable<ToasterProps["position"]>
) {
  const index = Number(toastElement.dataset.index)
  const yPosition = toastElement.dataset.yPosition
  const xPosition = toastElement.dataset.xPosition

  if (!Number.isInteger(index) || !yPosition || !xPosition) return null

  const renderedPosition = `${yPosition}-${xPosition}`
  const positionedToasts = toasts.filter((item) => (item.position ?? position) === renderedPosition)

  return positionedToasts[index]?.id ?? null
}

function ClickToDismissToasts({
  position,
}: {
  position: NonNullable<ToasterProps["position"]>
}) {
  const { toasts } = useSonner()
  const toastsRef = useRef(toasts)

  useEffect(() => {
    toastsRef.current = toasts
  }, [toasts])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return

      const toastElement = event.target.closest("[data-sonner-toast]")
      if (!(toastElement instanceof HTMLElement)) return
      if (toastElement.dataset.dismissible === "false") return

      const toastId = renderedToastId(toastsRef.current, toastElement, position)
      if (toastId !== null) toast.dismiss(toastId)
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [position])

  return null
}

const Toaster = ({
  className,
  position = DEFAULT_POSITION,
  offset = DEFAULT_OFFSET,
  mobileOffset = DEFAULT_MOBILE_OFFSET,
  theme: themeProp,
  toastOptions,
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const toastClassName = ["cn-toast", toastOptions?.classNames?.toast].filter(Boolean).join(" ")

  return (
    <>
      <ClickToDismissToasts position={position} />
      <Sonner
        {...props}
        theme={(themeProp ?? theme) as ToasterProps["theme"]}
        position={position}
        offset={offset}
        mobileOffset={mobileOffset}
        className={["toaster group", className].filter(Boolean).join(" ")}
        icons={{
          success: (
            <CircleCheckIcon className="size-4" />
          ),
          info: (
            <InfoIcon className="size-4" />
          ),
          warning: (
            <TriangleAlertIcon className="size-4" />
          ),
          error: (
            <OctagonXIcon className="size-4" />
          ),
          loading: (
            <Loader2Icon className="size-4 animate-spin" />
          ),
        }}
        style={
          {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)",
            ...props.style,
          } as React.CSSProperties
        }
        toastOptions={{
          ...toastOptions,
          classNames: {
            ...toastOptions?.classNames,
            toast: toastClassName,
          },
        }}
      />
    </>
  )
}

export { Toaster }

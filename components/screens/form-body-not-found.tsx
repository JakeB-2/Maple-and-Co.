// The "record vanished under you" state every edit form-body renders when its
// async fetch comes back null (the row was soft-deleted between the list
// render and the drawer open). Was a verbatim `<p>` clone in ~12 *-form-body
// files; folded here so the copy + spacing live in one place.

export function FormBodyNotFound({ noun }: { noun: string }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      This {noun} is gone — it may have just been deleted.
    </p>
  )
}

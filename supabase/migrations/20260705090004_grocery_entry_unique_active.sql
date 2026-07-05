-- ============================================================================
-- The need list is a set, not a bag: one live, un-purchased entry per item.
-- The toggle UI and the reuse-or-insert add path both assume it; enforcing it
-- here closes the two-phone check-then-insert race (the losing insert gets a
-- 23505 and reuses the winner's row).
-- ============================================================================

CREATE UNIQUE INDEX grocery_list_entries_active_item_idx
    ON public.grocery_list_entries (grocery_item_id)
    WHERE deleted_at IS NULL AND purchased_at IS NULL;

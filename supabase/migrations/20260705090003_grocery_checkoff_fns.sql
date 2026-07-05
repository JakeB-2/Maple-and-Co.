-- ============================================================================
-- Check-off is TWO writes that must commit together (D-014): stamp the list
-- entry AND append the price observation. supabase-js has no transactions, so
-- the pair lives in one SECURITY INVOKER function (RLS still applies).
-- Un-check is the mirror: clear the stamps AND retract the checkoff-sourced
-- observation — a retracted check-off was a mis-tap, not a price fact, so
-- deleting it keeps append-only history truthful.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_check_off_grocery_entry(
    p_entry_id uuid,
    p_store_id uuid,
    p_price numeric,
    p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_item_id uuid;
BEGIN
    UPDATE public.grocery_list_entries
    SET purchased_at = now(),
        purchased_by_user_id = p_user_id,
        purchased_store_id = p_store_id,
        purchased_price = p_price,
        updated_at = now(),
        updated_by_user_id = p_user_id
    WHERE id = p_entry_id
      AND deleted_at IS NULL
      AND purchased_at IS NULL
    RETURNING grocery_item_id INTO v_item_id;

    -- NULL = nothing matched (already checked, deleted, or unknown id);
    -- the caller turns that into a friendly error.
    IF v_item_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF p_price IS NOT NULL THEN
        INSERT INTO public.grocery_item_prices
            (grocery_item_id, store_id, price, observed_on, source,
             list_entry_id, created_by_user_id, updated_by_user_id)
        VALUES
            (v_item_id, p_store_id, p_price,
             (now() AT TIME ZONE 'America/Cancun')::date, 'checkoff',
             p_entry_id, p_user_id, p_user_id);
    END IF;

    RETURN v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_uncheck_grocery_entry(
    p_entry_id uuid,
    p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
BEGIN
    UPDATE public.grocery_list_entries
    SET purchased_at = NULL,
        purchased_by_user_id = NULL,
        purchased_store_id = NULL,
        purchased_price = NULL,
        updated_at = now(),
        updated_by_user_id = p_user_id
    WHERE id = p_entry_id
      AND deleted_at IS NULL
      AND purchased_at IS NOT NULL
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RETURN NULL;
    END IF;

    DELETE FROM public.grocery_item_prices
    WHERE list_entry_id = p_entry_id AND source = 'checkoff';

    RETURN v_id;
END;
$$;

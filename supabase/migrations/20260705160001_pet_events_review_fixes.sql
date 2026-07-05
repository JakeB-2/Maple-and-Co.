-- ============================================================================
-- M3 review fixes.
--
-- 1. fn_latest_pet_events_per_type — recency chips + the meds last-done line
--    need the newest event PER TYPE, not the newest 60 events overall (a
--    monthly med dose falls out of a 60-row window within a week once daily
--    feed/walk/potty logging fills it). DISTINCT ON rides the
--    (event_type_id, occurred_at DESC) partial index built for exactly this.
--
-- 2. fn_update_pet_event — the old version deleted ALL of an event's values
--    then re-inserted only what the (live-attributes-only) form sent, so
--    editing an old event's note silently hard-deleted values whose attribute
--    was soft-deleted since. Now it deletes only the values for the attributes
--    the form actually rendered (p_attribute_ids), preserving orphans.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_latest_pet_events_per_type(p_pet_id uuid)
RETURNS TABLE (event_type_id uuid, occurred_at timestamptz)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    SELECT DISTINCT ON (e.event_type_id) e.event_type_id, e.occurred_at
    FROM public.pet_events e
    WHERE e.pet_id = p_pet_id AND e.deleted_at IS NULL
    ORDER BY e.event_type_id, e.occurred_at DESC;
$$;

-- Signature changes (adds p_attribute_ids), so drop the old overload first.
DROP FUNCTION IF EXISTS public.fn_update_pet_event(uuid, timestamptz, uuid, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.fn_update_pet_event(
    p_event_id uuid,
    p_occurred_at timestamptz,
    p_done_by_user_id uuid,
    p_note text,
    p_values jsonb,
    p_attribute_ids uuid[],
    p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
BEGIN
    UPDATE public.pet_events
    SET occurred_at = p_occurred_at,
        done_by_user_id = p_done_by_user_id,
        note = p_note,
        updated_at = now(),
        updated_by_user_id = p_user_id
    WHERE id = p_event_id AND deleted_at IS NULL
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Only clear values for attributes the form rendered; values whose
    -- attribute was soft-deleted since logging (not in the form) survive.
    DELETE FROM public.pet_event_values
    WHERE event_id = p_event_id
      AND attribute_id = ANY(coalesce(p_attribute_ids, ARRAY[]::uuid[]));

    INSERT INTO public.pet_event_values
        (event_id, attribute_id, value_text, value_number, value_boolean,
         choice_ids, file_path, created_by_user_id, updated_by_user_id)
    SELECT p_event_id,
           (v->>'attribute_id')::uuid,
           v->>'value_text',
           (v->>'value_number')::numeric,
           (v->>'value_boolean')::boolean,
           v->'choice_ids',
           v->>'file_path',
           p_user_id, p_user_id
    FROM jsonb_array_elements(coalesce(p_values, '[]'::jsonb)) AS v;

    RETURN v_id;
END;
$$;

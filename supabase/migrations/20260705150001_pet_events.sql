-- ============================================================================
-- M3 Maple: EAV pet log (D-013 — types/attributes/values with system_key
-- anchors, adapted from Portal's form engine). Analytics (weight sparkline,
-- recency chips) query stable system_keys, never user-editable names —
-- renames re-label history by design.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- pets — seeded with Maple; a second pet is a seed away, not a schema change.
-- ----------------------------------------------------------------------------
CREATE TABLE public.pets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    photo_path text,
    birthday date,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT pets_name_check CHECK (btrim(name) <> '')
);

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.pets
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.pets
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.pets ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.pets ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY pets_all ON public.pets TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- pet_event_types — ≈ Portal form_defs. system_key anchors the seeded types
-- ('feed', 'walk', …; NULL for household-created ones). config carries
-- {recency: {expect_every_hours, warn_after_hours}, show_on_today}.
-- ----------------------------------------------------------------------------
CREATE TABLE public.pet_event_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    emoji text NOT NULL DEFAULT '🐾',
    system_key text,
    config jsonb NOT NULL DEFAULT '{}',
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT pet_event_types_name_check CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX pet_event_types_system_key_idx
    ON public.pet_event_types (system_key) WHERE system_key IS NOT NULL;
CREATE UNIQUE INDEX pet_event_types_name_live_idx
    ON public.pet_event_types (lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX pet_event_types_sort_idx
    ON public.pet_event_types (sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.pet_event_types
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.pet_event_types
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.pet_event_types ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.pet_event_types ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.pet_event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY pet_event_types_all ON public.pet_event_types TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- pet_event_attributes — ≈ Portal form_questions. config carries choice
-- options as [{id, label, emoji}] (append-only; removing an option would
-- orphan history). system_key anchors analytics ('weight_kg').
-- ----------------------------------------------------------------------------
CREATE TABLE public.pet_event_attributes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type_id uuid NOT NULL REFERENCES public.pet_event_types(id) ON DELETE CASCADE,
    label text NOT NULL,
    system_key text,
    value_kind text NOT NULL,
    unit text,
    required boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    config jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT pet_event_attributes_label_check CHECK (btrim(label) <> ''),
    CONSTRAINT pet_event_attributes_value_kind_check CHECK (
        value_kind IN ('text', 'long_text', 'number', 'boolean', 'single_choice', 'multi_choice', 'photo')
    )
);

CREATE UNIQUE INDEX pet_event_attributes_system_key_idx
    ON public.pet_event_attributes (system_key)
    WHERE system_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX pet_event_attributes_type_idx
    ON public.pet_event_attributes (event_type_id, sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.pet_event_attributes
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.pet_event_attributes
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.pet_event_attributes ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.pet_event_attributes ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.pet_event_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pet_event_attributes_all ON public.pet_event_attributes TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- pet_events — ≈ Portal form_submissions. done_by_user_id is the
-- actor-of-record (either member may log the other's walk), distinct from
-- created_by (D-006's pattern).
-- ----------------------------------------------------------------------------
CREATE TABLE public.pet_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id uuid NOT NULL REFERENCES public.pets(id),
    event_type_id uuid NOT NULL REFERENCES public.pet_event_types(id),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    done_by_user_id uuid NOT NULL REFERENCES public.profiles(id),
    note text,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid
);

-- Feeds recency chips + the weight sparkline (latest-per-type scans).
CREATE INDEX pet_events_type_occurred_idx
    ON public.pet_events (event_type_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX pet_events_pet_occurred_idx
    ON public.pet_events (pet_id, occurred_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.pet_events
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.pet_events
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.pet_events ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.pet_events ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.pet_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY pet_events_all ON public.pet_events TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- pet_event_values — ≈ Portal form_answers, typed columns per value_kind.
-- Replaced as a set on every edit; no soft delete (they live and die with
-- their event).
-- ----------------------------------------------------------------------------
CREATE TABLE public.pet_event_values (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.pet_events(id) ON DELETE CASCADE,
    attribute_id uuid NOT NULL REFERENCES public.pet_event_attributes(id),
    value_text text,
    value_number numeric,
    value_boolean boolean,
    choice_ids jsonb,
    file_path text,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    CONSTRAINT pet_event_values_unique UNIQUE (event_id, attribute_id)
);

CREATE INDEX pet_event_values_attribute_idx
    ON public.pet_event_values (attribute_id);

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.pet_event_values
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.pet_event_values
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.pet_event_values ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.pet_event_values ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.pet_event_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY pet_event_values_all ON public.pet_event_values TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Log/update are event + N values that must commit together (the D-021
-- pattern: supabase-js has no transactions, so the pair lives in SECURITY
-- INVOKER functions; RLS still applies). p_values is a jsonb array of
-- {attribute_id, value_text?, value_number?, value_boolean?, choice_ids?,
-- file_path?}. Update replaces the value set wholesale (D-013).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_log_pet_event(
    p_pet_id uuid,
    p_event_type_id uuid,
    p_occurred_at timestamptz,
    p_done_by_user_id uuid,
    p_note text,
    p_values jsonb,
    p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_event_id uuid;
BEGIN
    INSERT INTO public.pet_events
        (pet_id, event_type_id, occurred_at, done_by_user_id, note,
         created_by_user_id, updated_by_user_id)
    VALUES
        (p_pet_id, p_event_type_id, p_occurred_at, p_done_by_user_id, p_note,
         p_user_id, p_user_id)
    RETURNING id INTO v_event_id;

    INSERT INTO public.pet_event_values
        (event_id, attribute_id, value_text, value_number, value_boolean,
         choice_ids, file_path, created_by_user_id, updated_by_user_id)
    SELECT v_event_id,
           (v->>'attribute_id')::uuid,
           v->>'value_text',
           (v->>'value_number')::numeric,
           (v->>'value_boolean')::boolean,
           v->'choice_ids',
           v->>'file_path',
           p_user_id, p_user_id
    FROM jsonb_array_elements(coalesce(p_values, '[]'::jsonb)) AS v;

    RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_pet_event(
    p_event_id uuid,
    p_occurred_at timestamptz,
    p_done_by_user_id uuid,
    p_note text,
    p_values jsonb,
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

    DELETE FROM public.pet_event_values WHERE event_id = p_event_id;

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

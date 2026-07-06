-- ============================================================================
-- M6: generalize the pets-only log into cross-entity Needs (D-032…).
--
-- Shape (approved by Jake 2026-07-05):
--   pets            → entities   (+ kind 'pet'|'plant'; plants are rows, not clones)
--   pet_event_types → event_types (+ entity_kind; recency/show_on_today config
--                                   REMOVED — cadence is per-entity now)
--   pet_event_attributes → event_type_attributes (EAV unchanged, D-013)
--   pet_events      → entity_events (pet_id → entity_id)
--   pet_event_values → entity_event_values
--   NEW needs       — per-entity-instance cadence config. A Need's
--                     last-fulfilled is always DERIVED from entity_events
--                     (never stored), so a quick-log and a task completion can
--                     never disagree about "when was Feed last done".
--   tasks           — pet_id + log_pet_event_type_id → need_id (or a free-text
--                     entity_label with no link at all); fn_complete_task now
--                     fulfills the linked Need by logging an entity event
--                     (D-031 generalized, symmetric on undo).
--   NEW household_settings — singleton (editable app title + household photo).
--
-- Hours-based cadence is kept (not the date-only recurrence engine): pet
-- cadences are sub-day (feed 12h, walk 8h) and the recencyState math is
-- already proven; "every 3 days" is 72h.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 · pets → entities (+ kind)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pets RENAME TO entities;
ALTER TABLE public.entities RENAME CONSTRAINT pets_name_check TO entities_name_check;
ALTER POLICY pets_all ON public.entities RENAME TO entities_all;

ALTER TABLE public.entities
    ADD COLUMN kind text NOT NULL DEFAULT 'pet'
    CONSTRAINT entities_kind_check CHECK (kind IN ('pet', 'plant'));
ALTER TABLE public.entities ALTER COLUMN kind DROP DEFAULT;

COMMENT ON TABLE public.entities IS 'Cared-for household members that are not people: pets and plants. One table — the two kinds are column-for-column identical, so separate tables would be clones (D-032).';

-- ----------------------------------------------------------------------------
-- 2 · pet_event_types → event_types (+ entity_kind)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pet_event_types RENAME TO event_types;
ALTER TABLE public.event_types RENAME CONSTRAINT pet_event_types_name_check TO event_types_name_check;
ALTER POLICY pet_event_types_all ON public.event_types RENAME TO event_types_all;
ALTER INDEX public.pet_event_types_system_key_idx RENAME TO event_types_system_key_idx;
ALTER INDEX public.pet_event_types_name_live_idx RENAME TO event_types_name_live_idx;
ALTER INDEX public.pet_event_types_sort_idx RENAME TO event_types_sort_idx;

ALTER TABLE public.event_types
    ADD COLUMN entity_kind text NOT NULL DEFAULT 'pet'
    CONSTRAINT event_types_entity_kind_check CHECK (entity_kind IN ('pet', 'plant'));
ALTER TABLE public.event_types ALTER COLUMN entity_kind DROP DEFAULT;

-- The per-type name uniqueness now scopes per kind ('Feed' for pets and a
-- future 'Feed' for plants may coexist).
DROP INDEX public.event_types_name_live_idx;
CREATE UNIQUE INDEX event_types_name_live_idx
    ON public.event_types (entity_kind, lower(name)) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.event_types.entity_kind IS 'Which entity kind this loggable type applies to. The type catalog is global per kind; per-entity cadence lives in needs (D-032).';

-- ----------------------------------------------------------------------------
-- 3 · pet_event_attributes → event_type_attributes
-- ----------------------------------------------------------------------------
ALTER TABLE public.pet_event_attributes RENAME TO event_type_attributes;
ALTER TABLE public.event_type_attributes RENAME CONSTRAINT pet_event_attributes_label_check TO event_type_attributes_label_check;
ALTER TABLE public.event_type_attributes RENAME CONSTRAINT pet_event_attributes_value_kind_check TO event_type_attributes_value_kind_check;
ALTER POLICY pet_event_attributes_all ON public.event_type_attributes RENAME TO event_type_attributes_all;
ALTER INDEX public.pet_event_attributes_system_key_idx RENAME TO event_type_attributes_system_key_idx;
ALTER INDEX public.pet_event_attributes_type_idx RENAME TO event_type_attributes_type_idx;

-- ----------------------------------------------------------------------------
-- 4 · pet_events → entity_events (pet_id → entity_id)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pet_events RENAME TO entity_events;
ALTER TABLE public.entity_events RENAME COLUMN pet_id TO entity_id;
ALTER POLICY pet_events_all ON public.entity_events RENAME TO entity_events_all;
ALTER INDEX public.pet_events_type_occurred_idx RENAME TO entity_events_type_occurred_idx;
ALTER INDEX public.pet_events_pet_occurred_idx RENAME TO entity_events_entity_occurred_idx;

-- ----------------------------------------------------------------------------
-- 5 · pet_event_values → entity_event_values
-- ----------------------------------------------------------------------------
ALTER TABLE public.pet_event_values RENAME TO entity_event_values;
ALTER TABLE public.entity_event_values RENAME CONSTRAINT pet_event_values_unique TO entity_event_values_unique;
ALTER POLICY pet_event_values_all ON public.entity_event_values RENAME TO entity_event_values_all;
ALTER INDEX public.pet_event_values_attribute_idx RENAME TO entity_event_values_attribute_idx;

-- ----------------------------------------------------------------------------
-- 6 · comments/reactions: 'pet_event' → 'entity_event' (data + CHECKs)
-- ----------------------------------------------------------------------------
ALTER TABLE public.comments DROP CONSTRAINT comments_entity_type_check;
ALTER TABLE public.reactions DROP CONSTRAINT reactions_entity_type_check;

UPDATE public.comments SET entity_type = 'entity_event' WHERE entity_type = 'pet_event';
UPDATE public.reactions SET entity_type = 'entity_event' WHERE entity_type = 'pet_event';

ALTER TABLE public.comments ADD CONSTRAINT comments_entity_type_check
    CHECK (entity_type IN ('spend', 'grocery_item', 'entity_event', 'calendar_event', 'task'));
ALTER TABLE public.reactions ADD CONSTRAINT reactions_entity_type_check
    CHECK (entity_type IN ('spend', 'grocery_item', 'entity_event', 'calendar_event', 'task'));

-- ----------------------------------------------------------------------------
-- 7 · needs — per-entity-instance cadence (D-032). Cadence hours are NULLable:
-- a need with NULL hours is "track last-done only" (its schedule, if any, lives
-- on a linked task — the Meds pattern, D-026/D-031). warn defaults to
-- expect × 1.5 in code when absent (existing recencyState behavior).
-- ----------------------------------------------------------------------------
CREATE TABLE public.needs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id uuid NOT NULL REFERENCES public.entities(id),
    event_type_id uuid NOT NULL REFERENCES public.event_types(id),
    expect_every_hours numeric,
    warn_after_hours numeric,
    show_on_today boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT needs_expect_positive_check
        CHECK (expect_every_hours IS NULL OR expect_every_hours > 0),
    CONSTRAINT needs_warn_positive_check
        CHECK (warn_after_hours IS NULL OR warn_after_hours > 0),
    -- A warn threshold without an expectation is meaningless.
    CONSTRAINT needs_warn_needs_expect_check
        CHECK (warn_after_hours IS NULL OR expect_every_hours IS NOT NULL)
);

COMMENT ON TABLE public.needs IS 'What a specific entity instance needs, how often (hours; per-entity, NOT per-shared-type — Maple walks 2x/day, a second dog may differ). Last-fulfilled is always derived from entity_events; nothing is stored here (D-032).';

-- One live need per (entity, type) — logging one event refreshes exactly one need.
CREATE UNIQUE INDEX needs_entity_type_live_idx
    ON public.needs (entity_id, event_type_id) WHERE deleted_at IS NULL;
CREATE INDEX needs_entity_idx
    ON public.needs (entity_id, sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.needs
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.needs
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.needs ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.needs ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY needs_all ON public.needs TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 8 · data migration: the old global config.recency becomes needs rows for
-- every live pet (today: Maple), then the config keys are retired.
-- ----------------------------------------------------------------------------
INSERT INTO public.needs
    (entity_id, event_type_id, expect_every_hours, warn_after_hours, show_on_today, sort_order)
SELECT e.id,
       t.id,
       (t.config #>> '{recency,expect_every_hours}')::numeric,
       (t.config #>> '{recency,warn_after_hours}')::numeric,
       coalesce((t.config ->> 'show_on_today')::boolean, false),
       t.sort_order
FROM public.entities e
CROSS JOIN public.event_types t
WHERE e.kind = 'pet' AND e.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND t.config ? 'recency';

UPDATE public.event_types
SET config = config - 'recency' - 'show_on_today'
WHERE config ? 'recency' OR config ? 'show_on_today';

-- ----------------------------------------------------------------------------
-- 9 · tasks: (pet_id, log_pet_event_type_id) → need_id | entity_label
-- ----------------------------------------------------------------------------
ALTER TABLE public.tasks ADD COLUMN need_id uuid REFERENCES public.needs(id);
ALTER TABLE public.tasks ADD COLUMN entity_label text;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_entity_label_check
    CHECK (entity_label IS NULL OR btrim(entity_label) <> '');
-- A linked need already names its entity; a free label is for UNlinked tasks.
ALTER TABLE public.tasks ADD CONSTRAINT tasks_need_xor_label_check
    CHECK (need_id IS NULL OR entity_label IS NULL);

COMMENT ON COLUMN public.tasks.need_id IS 'When set, completing this task fulfills the Need by auto-logging a bare entity event of its type (D-031 generalized).';
COMMENT ON COLUMN public.tasks.entity_label IS 'Free-typed subject for tasks with no Need link ("Clean Fridge" → "Fridge"). Mutually exclusive with need_id.';

-- Every task that linked a pet-event type gets a need for that (pet, type) —
-- with NULL hours when no recency existed (the Meds case: its schedule stays on
-- the task, D-026). Soft-deleted tasks included: restore must find its need.
INSERT INTO public.needs (entity_id, event_type_id, show_on_today, sort_order)
SELECT DISTINCT tk.pet_id, tk.log_pet_event_type_id, false,
       coalesce(t.sort_order, 0)
FROM public.tasks tk
JOIN public.event_types t ON t.id = tk.log_pet_event_type_id
WHERE tk.pet_id IS NOT NULL
  AND tk.log_pet_event_type_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.needs n
      WHERE n.entity_id = tk.pet_id
        AND n.event_type_id = tk.log_pet_event_type_id
        AND n.deleted_at IS NULL
  );

UPDATE public.tasks tk
SET need_id = n.id
FROM public.needs n
WHERE tk.pet_id = n.entity_id
  AND tk.log_pet_event_type_id = n.event_type_id
  AND n.deleted_at IS NULL
  AND tk.log_pet_event_type_id IS NOT NULL;

ALTER TABLE public.tasks DROP CONSTRAINT tasks_pet_link_check;
DROP INDEX public.tasks_log_type_idx;
ALTER TABLE public.tasks DROP COLUMN log_pet_event_type_id;
ALTER TABLE public.tasks DROP COLUMN pet_id;

-- Reverse lookup: "the task fulfilling this need" powers per-need countdowns
-- (generalizes D-026's meds countdown).
CREATE INDEX tasks_need_idx
    ON public.tasks (need_id) WHERE deleted_at IS NULL AND need_id IS NOT NULL;

ALTER TABLE public.task_completions RENAME COLUMN logged_pet_event_id TO logged_event_id;

-- ----------------------------------------------------------------------------
-- 10 · household_settings — singleton (id is always true). The two global
-- settings that survive the Settings-page removal: editable app title and the
-- household profile photo. APP_NAME in code becomes the seed/fallback.
-- ----------------------------------------------------------------------------
CREATE TABLE public.household_settings (
    id boolean PRIMARY KEY DEFAULT true,
    app_title text NOT NULL,
    photo_path text,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    CONSTRAINT household_settings_singleton_check CHECK (id),
    CONSTRAINT household_settings_title_check CHECK (btrim(app_title) <> '')
);

COMMENT ON TABLE public.household_settings IS 'Exactly one row (id = true). App title + household photo, editable from More Actions. No soft delete — settings are edited, never deleted.';

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.household_settings
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.household_settings
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.household_settings ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.household_settings ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.household_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY household_settings_all ON public.household_settings TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.household_settings (id, app_title) VALUES (true, 'Maple & Co')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11 · RPCs. Renamed log/update/latest functions swap table/param names only;
-- fn_complete_task / fn_undo_task_completion keep their signatures but now
-- resolve the linked Need (both-or-neither semantics unchanged, D-031).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_log_pet_event(uuid, uuid, timestamptz, uuid, text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.fn_update_pet_event(uuid, timestamptz, uuid, text, jsonb, uuid[], uuid);
DROP FUNCTION IF EXISTS public.fn_latest_pet_events_per_type(uuid);

CREATE OR REPLACE FUNCTION public.fn_log_entity_event(
    p_entity_id uuid,
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
    INSERT INTO public.entity_events
        (entity_id, event_type_id, occurred_at, done_by_user_id, note,
         created_by_user_id, updated_by_user_id)
    VALUES
        (p_entity_id, p_event_type_id, p_occurred_at, p_done_by_user_id, p_note,
         p_user_id, p_user_id)
    RETURNING id INTO v_event_id;

    INSERT INTO public.entity_event_values
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

CREATE OR REPLACE FUNCTION public.fn_update_entity_event(
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
    UPDATE public.entity_events
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
    DELETE FROM public.entity_event_values
    WHERE event_id = p_event_id
      AND attribute_id = ANY(coalesce(p_attribute_ids, ARRAY[]::uuid[]));

    INSERT INTO public.entity_event_values
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

CREATE OR REPLACE FUNCTION public.fn_latest_entity_events_per_type(p_entity_id uuid)
RETURNS TABLE (event_type_id uuid, occurred_at timestamptz)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    SELECT DISTINCT ON (e.event_type_id) e.event_type_id, e.occurred_at
    FROM public.entity_events e
    WHERE e.entity_id = p_entity_id AND e.deleted_at IS NULL
    ORDER BY e.event_type_id, e.occurred_at DESC;
$$;

-- Completing a task is still TWO writes that must commit together (D-021/D-031):
-- the completion row AND, when the task links a LIVE need, a bare entity event
-- that fulfills it. A soft-deleted need degrades gracefully: the completion
-- still lands, no event is logged. NULL return = task gone → friendly fail.
CREATE OR REPLACE FUNCTION public.fn_complete_task(
    p_task_id uuid,
    p_completed_at timestamptz,
    p_completed_by_user_id uuid,
    p_note text,
    p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_entity_id uuid;
    v_event_type_id uuid;
    v_event_id uuid;
    v_completion_id uuid;
BEGIN
    SELECT n.entity_id, n.event_type_id
    INTO v_entity_id, v_event_type_id
    FROM public.tasks t
    LEFT JOIN public.needs n ON n.id = t.need_id AND n.deleted_at IS NULL
    WHERE t.id = p_task_id AND t.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Fulfill the linked need (D-031 generalized). Bare event, no values —
    -- detail can be added from the entity's feed later.
    IF v_entity_id IS NOT NULL AND v_event_type_id IS NOT NULL THEN
        INSERT INTO public.entity_events
            (entity_id, event_type_id, occurred_at, done_by_user_id,
             created_by_user_id, updated_by_user_id)
        VALUES
            (v_entity_id, v_event_type_id, p_completed_at, p_completed_by_user_id,
             p_user_id, p_user_id)
        RETURNING id INTO v_event_id;
    END IF;

    INSERT INTO public.task_completions
        (task_id, completed_at, completed_by_user_id, note, logged_event_id,
         created_by_user_id, updated_by_user_id)
    VALUES
        (p_task_id, p_completed_at, p_completed_by_user_id, p_note, v_event_id,
         p_user_id, p_user_id)
    RETURNING id INTO v_completion_id;

    RETURN v_completion_id;
END;
$$;

-- Undo a completion: soft-delete it AND retract the entity event it auto-logged,
-- so every need/countdown reverts in lock-step. NULL return = already undone.
CREATE OR REPLACE FUNCTION public.fn_undo_task_completion(
    p_completion_id uuid,
    p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
    v_event_id uuid;
BEGIN
    UPDATE public.task_completions
    SET deleted_at = now(),
        deleted_by_user_id = p_user_id,
        updated_at = now(),
        updated_by_user_id = p_user_id
    WHERE id = p_completion_id AND deleted_at IS NULL
    RETURNING id, logged_event_id INTO v_id, v_event_id;

    IF v_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF v_event_id IS NOT NULL THEN
        UPDATE public.entity_events
        SET deleted_at = now(),
            deleted_by_user_id = p_user_id,
            updated_at = now(),
            updated_by_user_id = p_user_id
        WHERE id = v_event_id AND deleted_at IS NULL;
    END IF;

    RETURN v_id;
END;
$$;

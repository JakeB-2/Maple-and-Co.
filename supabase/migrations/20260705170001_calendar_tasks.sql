-- ============================================================================
-- M4 Calendar + tasks. The shared thing between events and tasks is NOT a rules
-- table (D-015) — it is the embedded recurrence block below, mirrored on both
-- tables so the pure engine's RecurrenceDbColumns (lib/recurrence/types.ts)
-- maps 1:1 through toDb/fromDb. The engine is date-only in HOUSEHOLD_TZ;
-- time-of-day is presentation, applied by the renderer.
--
-- Recurrence block (identical column set on calendar_events and tasks):
--   recur_unit      text  day|week|month|year   (NULL = one-off)
--   recur_interval  int   >= 1
--   recur_weekdays  smallint[]  0=Sun..6=Sat     (weekly only; [] = anchor's own)
--   recur_month_day smallint 1..31               (fixed monthly only; clamped)
--   recur_semantics text  fixed|after_done       (events: fixed only, D-015)
--   recur_until     date  inclusive end          (NULL = open-ended)
-- All-or-none: the (unit, interval, semantics) trio is all-null (one-off) or
-- all-present (recurring).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- calendar_events — the household rhythm. Date-anchored with optional wall-clock
-- time (D-029): starts_on is the calendar day AND the recurrence grid origin;
-- start_time/end_time are presentation wall-clock, NULL when all_day. Only
-- `fixed` recurrence — an event does not chase completions (D-015).
-- ----------------------------------------------------------------------------
CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    note text,
    location text,
    starts_on date NOT NULL,
    start_time time,
    end_time time,
    all_day boolean NOT NULL DEFAULT false,
    recur_unit text,
    recur_interval integer,
    recur_weekdays smallint[],
    recur_month_day smallint,
    recur_semantics text,
    recur_until date,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT calendar_events_title_check CHECK (btrim(title) <> ''),
    -- All-day owns the whole day; a timed event needs a start before any end.
    CONSTRAINT calendar_events_all_day_check
        CHECK (NOT all_day OR (start_time IS NULL AND end_time IS NULL)),
    CONSTRAINT calendar_events_end_needs_start_check
        CHECK (end_time IS NULL OR start_time IS NOT NULL),
    CONSTRAINT calendar_events_end_after_start_check
        CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT calendar_events_recur_unit_check
        CHECK (recur_unit IS NULL OR recur_unit IN ('day', 'week', 'month', 'year')),
    CONSTRAINT calendar_events_recur_interval_check
        CHECK (recur_interval IS NULL OR recur_interval >= 1),
    CONSTRAINT calendar_events_recur_month_day_check
        CHECK (recur_month_day IS NULL OR recur_month_day BETWEEN 1 AND 31),
    -- Events never chase completion (D-015).
    CONSTRAINT calendar_events_recur_semantics_check
        CHECK (recur_semantics IS NULL OR recur_semantics = 'fixed'),
    CONSTRAINT calendar_events_recur_all_or_none_check CHECK (
        (recur_unit IS NULL AND recur_interval IS NULL AND recur_semantics IS NULL)
        OR (recur_unit IS NOT NULL AND recur_interval IS NOT NULL AND recur_semantics IS NOT NULL)
    )
);

COMMENT ON COLUMN public.calendar_events.starts_on IS 'The event day and the recurrence grid origin (engine anchor). Time-of-day lives in start_time/end_time.';

CREATE INDEX calendar_events_starts_idx
    ON public.calendar_events (starts_on) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.calendar_events ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.calendar_events ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendar_events_all ON public.calendar_events TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- calendar_event_exclusions — "delete this one occurrence" (D-016). A row here
-- suppresses the series' occurrence on occurs_on. Edit-this-occurrence = an
-- exclusion here + a standalone event. No edit-this-and-future in v1 (D-016).
-- Hard-delete to un-exclude — it is a marker, not content (no soft delete).
-- ----------------------------------------------------------------------------
CREATE TABLE public.calendar_event_exclusions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    occurs_on date NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    CONSTRAINT calendar_event_exclusions_unique UNIQUE (event_id, occurs_on)
);

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.calendar_event_exclusions
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.calendar_event_exclusions
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.calendar_event_exclusions ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.calendar_event_exclusions ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.calendar_event_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendar_event_exclusions_all ON public.calendar_event_exclusions TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- tasks — chores and cadences. anchor_on is the grid origin (fixed) AND the
-- after_done baseline before any completion. Both recurrence semantics allowed.
-- A task may LINK a pet-event type (D-017): completing "Flea meds" auto-logs a
-- Meds pet event so Maple's next-dose countdown is truthful — that needs a pet,
-- hence the pet-link CHECK.
-- ----------------------------------------------------------------------------
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    note text,
    emoji text NOT NULL DEFAULT '✅',
    anchor_on date NOT NULL,
    recur_unit text,
    recur_interval integer,
    recur_weekdays smallint[],
    recur_month_day smallint,
    recur_semantics text,
    recur_until date,
    pet_id uuid REFERENCES public.pets(id),
    log_pet_event_type_id uuid REFERENCES public.pet_event_types(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT tasks_title_check CHECK (btrim(title) <> ''),
    CONSTRAINT tasks_recur_unit_check
        CHECK (recur_unit IS NULL OR recur_unit IN ('day', 'week', 'month', 'year')),
    CONSTRAINT tasks_recur_interval_check
        CHECK (recur_interval IS NULL OR recur_interval >= 1),
    CONSTRAINT tasks_recur_month_day_check
        CHECK (recur_month_day IS NULL OR recur_month_day BETWEEN 1 AND 31),
    CONSTRAINT tasks_recur_semantics_check
        CHECK (recur_semantics IS NULL OR recur_semantics IN ('fixed', 'after_done')),
    CONSTRAINT tasks_recur_all_or_none_check CHECK (
        (recur_unit IS NULL AND recur_interval IS NULL AND recur_semantics IS NULL)
        OR (recur_unit IS NOT NULL AND recur_interval IS NOT NULL AND recur_semantics IS NOT NULL)
    ),
    -- A pet-event linkage needs a pet to log against.
    CONSTRAINT tasks_pet_link_check
        CHECK (log_pet_event_type_id IS NULL OR pet_id IS NOT NULL)
);

COMMENT ON COLUMN public.tasks.anchor_on IS 'Grid origin for fixed recurrence AND the after_done baseline before the first completion.';
COMMENT ON COLUMN public.tasks.log_pet_event_type_id IS 'When set, completing this task auto-logs a bare pet event of this type against pet_id (D-017).';

CREATE INDEX tasks_live_idx
    ON public.tasks (anchor_on) WHERE deleted_at IS NULL;
-- Reverse lookup: "the task that logs Meds" powers the Maple next-dose countdown (D-026).
CREATE INDEX tasks_log_type_idx
    ON public.tasks (log_pet_event_type_id)
    WHERE deleted_at IS NULL AND log_pet_event_type_id IS NOT NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.tasks ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.tasks ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_all ON public.tasks TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- task_completions — append-only completion log (D-017). Undo = soft-delete the
-- completion (NOT the generic whitelist path — undo also retracts the linked
-- pet event, so it rides fn_undo_task_completion). freshness reads the latest
-- LIVE completion. logged_pet_event_id ties a completion to the pet event it
-- auto-created so undo can retract that too.
-- ----------------------------------------------------------------------------
CREATE TABLE public.task_completions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    completed_at timestamptz NOT NULL DEFAULT now(),
    completed_by_user_id uuid NOT NULL REFERENCES public.profiles(id),
    note text,
    logged_pet_event_id uuid REFERENCES public.pet_events(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid
);

-- Latest-completion-per-task scan (freshness + after_done projection).
CREATE INDEX task_completions_task_idx
    ON public.task_completions (task_id, completed_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.task_completions
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.task_completions
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.task_completions ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.task_completions ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_completions_all ON public.task_completions TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Completing a task is TWO writes that must commit together (D-021): the
-- completion row AND, if the task links a pet-event type, a bare pet event so
-- Maple's countdown is truthful (D-017). supabase-js has no transactions, so
-- the pair lives in one SECURITY INVOKER function (RLS still applies).
-- NULL return = the task was gone/unknown → the caller shows a friendly error.
-- ----------------------------------------------------------------------------
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
    v_pet_id uuid;
    v_log_type_id uuid;
    v_pet_event_id uuid;
    v_completion_id uuid;
BEGIN
    SELECT pet_id, log_pet_event_type_id
    INTO v_pet_id, v_log_type_id
    FROM public.tasks
    WHERE id = p_task_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- The pet-event linkage (D-017). Bare event, no values — detail can be added
    -- from Maple later. The CHECK guarantees a pet_id when a type is linked, but
    -- guard both anyway.
    IF v_log_type_id IS NOT NULL AND v_pet_id IS NOT NULL THEN
        INSERT INTO public.pet_events
            (pet_id, event_type_id, occurred_at, done_by_user_id,
             created_by_user_id, updated_by_user_id)
        VALUES
            (v_pet_id, v_log_type_id, p_completed_at, p_completed_by_user_id,
             p_user_id, p_user_id)
        RETURNING id INTO v_pet_event_id;
    END IF;

    INSERT INTO public.task_completions
        (task_id, completed_at, completed_by_user_id, note, logged_pet_event_id,
         created_by_user_id, updated_by_user_id)
    VALUES
        (p_task_id, p_completed_at, p_completed_by_user_id, p_note, v_pet_event_id,
         p_user_id, p_user_id)
    RETURNING id INTO v_completion_id;

    RETURN v_completion_id;
END;
$$;

-- Undo a completion: soft-delete it AND retract the pet event it auto-logged,
-- so the countdown reverts in lock-step (mirrors D-021's uncheck-retracts-price
-- symmetry). NULL return = already undone / unknown id.
CREATE OR REPLACE FUNCTION public.fn_undo_task_completion(
    p_completion_id uuid,
    p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
    v_pet_event_id uuid;
BEGIN
    UPDATE public.task_completions
    SET deleted_at = now(),
        deleted_by_user_id = p_user_id,
        updated_at = now(),
        updated_by_user_id = p_user_id
    WHERE id = p_completion_id AND deleted_at IS NULL
    RETURNING id, logged_pet_event_id INTO v_id, v_pet_event_id;

    IF v_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF v_pet_event_id IS NOT NULL THEN
        UPDATE public.pet_events
        SET deleted_at = now(),
            deleted_by_user_id = p_user_id,
            updated_at = now(),
            updated_by_user_id = p_user_id
        WHERE id = v_pet_event_id AND deleted_at IS NULL;
    END IF;

    RETURN v_id;
END;
$$;

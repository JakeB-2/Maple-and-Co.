-- ============================================================================
-- M1 Spending: categories + the shared spending diary (D-006 — no budgets).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- spend_categories — household-curated, small list, admin in settings.
-- ----------------------------------------------------------------------------
CREATE TABLE public.spend_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    emoji text NOT NULL DEFAULT '💸',
    color text NOT NULL DEFAULT '#8b8b8b',
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT spend_categories_name_check CHECK (btrim(name) <> '')
);

-- One live category per name; tombstoned names may be reused.
CREATE UNIQUE INDEX spend_categories_name_live_idx
    ON public.spend_categories (lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX spend_categories_sort_idx
    ON public.spend_categories (sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.spend_categories
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.spend_categories
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.spend_categories ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.spend_categories ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.spend_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY spend_categories_all ON public.spend_categories TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- spends — the diary. spent_by_user_id is the actor-of-record and is distinct
-- from created_by (Jake can log Kayla's cash spend). Currency is per-entry;
-- totals are always grouped per currency, never converted (D-008).
-- ----------------------------------------------------------------------------
CREATE TABLE public.spends (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    amount numeric(10,2) NOT NULL,
    currency text NOT NULL DEFAULT 'MXN',
    spent_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Cancun')::date),
    category_id uuid REFERENCES public.spend_categories(id),
    spent_by_user_id uuid NOT NULL REFERENCES public.profiles(id),
    note text,
    photo_path text,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT spends_amount_check CHECK (amount > 0),
    CONSTRAINT spends_currency_check CHECK (currency IN ('MXN', 'USD'))
);

COMMENT ON COLUMN public.spends.spent_by_user_id IS 'Actor-of-record (whose spend this was), independent of created_by (who typed it in).';
COMMENT ON COLUMN public.spends.photo_path IS 'Storage path in the private media bucket (spends/...), served via /media proxy.';

CREATE INDEX spends_spent_on_idx ON public.spends (spent_on DESC) WHERE deleted_at IS NULL;
CREATE INDEX spends_category_idx ON public.spends (category_id) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.spends
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.spends
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.spends ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.spends ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.spends ENABLE ROW LEVEL SECURITY;
CREATE POLICY spends_all ON public.spends TO authenticated USING (true) WITH CHECK (true);

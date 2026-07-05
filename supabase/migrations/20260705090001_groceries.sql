-- ============================================================================
-- M2 Groceries: stores + aisle-ordered sections, learned item catalog, the
-- shared need list, and append-only price history (D-014 — price is
-- deliberately denormalized: hot path on the entry, analytics in history;
-- ONE server action writes both atomically).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- stores — where the household shops. Currency is per-store (D-008): the
-- running total during a trip is shown in the store's currency, never mixed.
-- ----------------------------------------------------------------------------
CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    emoji text NOT NULL DEFAULT '🏪',
    currency text NOT NULL DEFAULT 'MXN',
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT stores_name_check CHECK (btrim(name) <> ''),
    CONSTRAINT stores_currency_check CHECK (currency IN ('MXN', 'USD'))
);

CREATE UNIQUE INDEX stores_name_live_idx
    ON public.stores (lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX stores_sort_idx
    ON public.stores (sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.stores ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.stores ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY stores_all ON public.stores TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- store_sections — sort_order is the AISLE WALK ORDER for that store; shopping
-- mode groups the list by section in this order.
-- ----------------------------------------------------------------------------
CREATE TABLE public.store_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT store_sections_name_check CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX store_sections_name_live_idx
    ON public.store_sections (store_id, lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX store_sections_walk_idx
    ON public.store_sections (store_id, sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.store_sections
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.store_sections
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.store_sections ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.store_sections ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.store_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_sections_all ON public.store_sections TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- grocery_items — the LEARNED catalog. Grows from whatever the household adds;
-- "recently used" is derived from list entries, never denormalized here.
-- ----------------------------------------------------------------------------
CREATE TABLE public.grocery_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    emoji text NOT NULL DEFAULT '🧺',
    default_qty text,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT grocery_items_name_check CHECK (btrim(name) <> '')
);

COMMENT ON COLUMN public.grocery_items.default_qty IS 'Free text ("2", "1 kg", "big bag") — prefills the entry qty on re-add.';

CREATE UNIQUE INDEX grocery_items_name_live_idx
    ON public.grocery_items (lower(name)) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.grocery_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.grocery_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.grocery_items ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.grocery_items ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY grocery_items_all ON public.grocery_items TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- grocery_item_placements — which section an item lives in, PER STORE.
-- Hard-delete row to "forget" a placement; no tombstone (it is a mapping,
-- not content).
-- ----------------------------------------------------------------------------
CREATE TABLE public.grocery_item_placements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    grocery_item_id uuid NOT NULL REFERENCES public.grocery_items(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    section_id uuid NOT NULL REFERENCES public.store_sections(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    CONSTRAINT grocery_item_placements_unique UNIQUE (grocery_item_id, store_id)
);

CREATE INDEX grocery_item_placements_store_idx
    ON public.grocery_item_placements (store_id);

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.grocery_item_placements
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.grocery_item_placements
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.grocery_item_placements ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.grocery_item_placements ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.grocery_item_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY grocery_item_placements_all ON public.grocery_item_placements TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- grocery_list_entries — the shared need list. Active list = purchased_at IS
-- NULL. Check-off stamps purchased_at/by/store (+ optional price); un-check
-- clears all four. Price also lands in grocery_item_prices (D-014).
-- ----------------------------------------------------------------------------
CREATE TABLE public.grocery_list_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    grocery_item_id uuid NOT NULL REFERENCES public.grocery_items(id),
    qty text,
    note text,
    purchased_at timestamptz,
    purchased_by_user_id uuid REFERENCES public.profiles(id),
    purchased_store_id uuid REFERENCES public.stores(id),
    purchased_price numeric(10,2),
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT grocery_list_entries_price_check
        CHECK (purchased_price IS NULL OR purchased_price > 0),
    -- Purchase stamps travel together (price stays optional).
    CONSTRAINT grocery_list_entries_purchase_stamps_check CHECK (
        (purchased_at IS NULL AND purchased_by_user_id IS NULL
            AND purchased_store_id IS NULL AND purchased_price IS NULL)
        OR (purchased_at IS NOT NULL AND purchased_by_user_id IS NOT NULL
            AND purchased_store_id IS NOT NULL)
    )
);

CREATE INDEX grocery_list_entries_active_idx
    ON public.grocery_list_entries (created_at DESC)
    WHERE deleted_at IS NULL AND purchased_at IS NULL;
-- Recently-used rail + per-item usage history.
CREATE INDEX grocery_list_entries_item_idx
    ON public.grocery_list_entries (grocery_item_id, created_at DESC)
    WHERE deleted_at IS NULL;
-- Trip review: what we bought at a store, most recent first.
CREATE INDEX grocery_list_entries_trip_idx
    ON public.grocery_list_entries (purchased_store_id, purchased_at DESC)
    WHERE deleted_at IS NULL AND purchased_at IS NOT NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.grocery_list_entries
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.grocery_list_entries
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.grocery_list_entries ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.grocery_list_entries ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.grocery_list_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY grocery_list_entries_all ON public.grocery_list_entries TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- grocery_item_prices — APPEND-ONLY price observations (D-014). Currency is
-- the store's. capture_job_id gains its FK in the capture_jobs migration.
-- No soft delete: observations are facts, not content.
-- ----------------------------------------------------------------------------
CREATE TABLE public.grocery_item_prices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    grocery_item_id uuid NOT NULL REFERENCES public.grocery_items(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    price numeric(10,2) NOT NULL,
    observed_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Cancun')::date),
    source text NOT NULL,
    list_entry_id uuid REFERENCES public.grocery_list_entries(id),
    capture_job_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    CONSTRAINT grocery_item_prices_price_check CHECK (price > 0),
    CONSTRAINT grocery_item_prices_source_check CHECK (source IN ('checkoff', 'manual', 'receipt'))
);

CREATE INDEX grocery_item_prices_lookup_idx
    ON public.grocery_item_prices (grocery_item_id, store_id, observed_on DESC);

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.grocery_item_prices
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.grocery_item_prices
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.grocery_item_prices ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.grocery_item_prices ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.grocery_item_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY grocery_item_prices_all ON public.grocery_item_prices TO authenticated USING (true) WITH CHECK (true);

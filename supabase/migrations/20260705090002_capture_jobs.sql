-- ============================================================================
-- Capture seam (D-002 — AI capture deferred, seam only; ZERO UI in v1).
--
-- One generic queue for receipt scanning AND future AI capture (voice/photo/
-- text). Pipeline when it wakes up post-v1: photo → private `captures` bucket
-- → pending row here → server action/cron parses when the AI env key exists
-- (parse code self-disables when absent) → review screen writes
-- grocery_item_prices rows (source='receipt', capture_job_id set) + an
-- optional spend, then records what it did in reviewed_into.
-- ============================================================================

CREATE TABLE public.capture_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    kind text NOT NULL,
    storage_path text,
    raw_text text,
    status text NOT NULL DEFAULT 'pending',
    result jsonb,
    error text,
    store_id uuid REFERENCES public.stores(id),
    reviewed_into jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT capture_jobs_kind_check CHECK (kind IN ('receipt', 'voice', 'photo', 'text')),
    CONSTRAINT capture_jobs_status_check CHECK (status IN ('pending', 'processing', 'parsed', 'reviewed', 'failed'))
);

COMMENT ON TABLE public.capture_jobs IS 'Generic capture queue (D-002). No UI in v1 — the seam exists so receipt/AI capture is cheap to add later.';
COMMENT ON COLUMN public.capture_jobs.storage_path IS 'Path in the private captures bucket for photo/voice kinds.';
COMMENT ON COLUMN public.capture_jobs.result IS 'Parser output awaiting review (e.g. line items with candidate item matches).';
COMMENT ON COLUMN public.capture_jobs.reviewed_into IS 'What the review created: {price_ids: [], spend_id: ...} — an audit of the handoff.';

CREATE INDEX capture_jobs_status_idx
    ON public.capture_jobs (status, created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.capture_jobs
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.capture_jobs
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.capture_jobs ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.capture_jobs ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.capture_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY capture_jobs_all ON public.capture_jobs TO authenticated USING (true) WITH CHECK (true);

-- Deferred FK from the groceries migration: price observations can point at
-- the capture job that produced them (source='receipt').
ALTER TABLE public.grocery_item_prices
    ADD CONSTRAINT grocery_item_prices_capture_job_fkey
    FOREIGN KEY (capture_job_id) REFERENCES public.capture_jobs(id);

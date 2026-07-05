-- ============================================================================
-- Storage: two private buckets.
--   media    — curated app media: spends/…, pets/…, avatars/…
--   captures — raw inbox for receipt photos and future AI capture (the seam:
--              nothing writes here in v1 UI; capture_jobs consumes it later).
-- Both private; images are served through the authed /media route-handler
-- proxy, never public URLs.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', false), ('captures', 'captures', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated household members can do everything in both buckets.
CREATE POLICY objects_household_all ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id IN ('media', 'captures'))
    WITH CHECK (bucket_id IN ('media', 'captures'));

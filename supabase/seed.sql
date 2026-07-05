-- ============================================================================
-- Seed — idempotent, re-runnable after every milestone (grows with the app).
-- Profiles are keyed by EMAIL because remote auth UUIDs are unknowable:
-- fn_handle_new_user creates the bare row on signup; this upgrades it.
--
-- >>> ACTION NEEDED: replace Kayla's placeholder email below when known. <<<
-- ============================================================================

-- ----------------------------------------------------------------------------
-- M0: household members — names + signature colors
-- ----------------------------------------------------------------------------
UPDATE public.profiles p
SET display_name = v.display_name,
    signature_color = v.signature_color,
    updated_at = now()
FROM (VALUES
    ('jakekbul@gmail.com', 'Jake', '#4e7c5c'),
    ('kayla@REPLACE-ME.invalid', 'Kayla', '#d95f69')
) AS v(email, display_name, signature_color)
JOIN auth.users u ON lower(u.email) = lower(v.email)
WHERE p.id = u.id
  AND (p.display_name, p.signature_color) IS DISTINCT FROM (v.display_name, v.signature_color);

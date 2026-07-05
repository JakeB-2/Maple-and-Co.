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

-- ----------------------------------------------------------------------------
-- M1: starter spend categories (insert-if-missing; renames/reorders in the
-- app win over the seed on re-runs)
-- ----------------------------------------------------------------------------
INSERT INTO public.spend_categories (name, emoji, color, sort_order)
SELECT v.name, v.emoji, v.color, v.sort_order
FROM (VALUES
    ('Groceries',  '🛒', '#4e7c5c', 10),
    ('Dining out', '🌮', '#d95f69', 20),
    ('Home',       '🏠', '#8a6d3b', 30),
    ('Maple',      '🐕', '#c9702e', 40),
    ('Transport',  '🚗', '#4a6f8a', 50),
    ('Health',     '💊', '#6b5b95', 60),
    ('Fun',        '🎉', '#c76b98', 70),
    ('Travel',     '✈️', '#3d8a8a', 80)
) AS v(name, emoji, color, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM public.spend_categories c
    WHERE lower(c.name) = lower(v.name) AND c.deleted_at IS NULL
);

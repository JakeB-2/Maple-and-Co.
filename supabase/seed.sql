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

-- ----------------------------------------------------------------------------
-- M2: one starter store (rename it in settings) + generic sections in a
-- sensible walk order. Insert-if-missing; in-app edits win on re-runs.
-- ----------------------------------------------------------------------------
INSERT INTO public.stores (name, emoji, currency, sort_order)
SELECT 'Grocery store', '🛒', 'MXN', 10
WHERE NOT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE lower(s.name) = 'grocery store' AND s.deleted_at IS NULL
);

INSERT INTO public.store_sections (store_id, name, sort_order)
SELECT s.id, v.name, v.sort_order
FROM (VALUES
    ('Produce',   10),
    ('Dairy',     20),
    ('Meat',      30),
    ('Frozen',    40),
    ('Pantry',    50),
    ('Household', 60),
    ('Checkout',  70)
) AS v(name, sort_order)
JOIN public.stores s
    ON lower(s.name) = 'grocery store' AND s.deleted_at IS NULL
WHERE NOT EXISTS (
    SELECT 1 FROM public.store_sections sec
    WHERE sec.store_id = s.id
      AND lower(sec.name) = lower(v.name)
      AND sec.deleted_at IS NULL
);

-- ----------------------------------------------------------------------------
-- M3: Maple herself + the six anchored event types and their attributes.
-- Types are keyed on system_key (renames in the app win over the seed);
-- attributes are keyed on (type, system_key) or (type, lower(label)).
-- ----------------------------------------------------------------------------
INSERT INTO public.pets (name)
SELECT 'Maple'
WHERE NOT EXISTS (
    SELECT 1 FROM public.pets p WHERE lower(p.name) = 'maple' AND p.deleted_at IS NULL
);

INSERT INTO public.pet_event_types (name, emoji, system_key, config, sort_order)
SELECT v.name, v.emoji, v.system_key, v.config::jsonb, v.sort_order
FROM (VALUES
    ('Feed',   '🍖', 'feed',   '{"recency": {"expect_every_hours": 12, "warn_after_hours": 16}, "show_on_today": true}',  10),
    ('Walk',   '🦮', 'walk',   '{"recency": {"expect_every_hours": 8,  "warn_after_hours": 14}, "show_on_today": true}',  20),
    ('Potty',  '💩', 'potty',  '{"recency": {"expect_every_hours": 8,  "warn_after_hours": 12}, "show_on_today": true}',  30),
    ('Meds',   '💊', 'meds',   '{"show_on_today": false}', 40),
    ('Weight', '⚖️', 'weight', '{"show_on_today": false}', 50),
    ('Vet',    '🩺', 'vet',    '{"show_on_today": false}', 60)
) AS v(name, emoji, system_key, config, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM public.pet_event_types t WHERE t.system_key = v.system_key
);

INSERT INTO public.pet_event_attributes
    (event_type_id, label, system_key, value_kind, unit, required, sort_order, config)
SELECT t.id, v.label, v.attr_key, v.value_kind, v.unit, v.required, v.sort_order, v.config::jsonb
FROM (VALUES
    ('feed',   'Meal',      NULL,        'single_choice', NULL, false, 10,
     '{"options": [{"id": "breakfast", "label": "Breakfast", "emoji": "🌅"}, {"id": "dinner", "label": "Dinner", "emoji": "🌆"}, {"id": "snack", "label": "Snack", "emoji": "🦴"}]}'),
    ('walk',   'Length',    NULL,        'single_choice', NULL, false, 10,
     '{"options": [{"id": "short", "label": "Short", "emoji": "🐾"}, {"id": "normal", "label": "Normal", "emoji": "🚶"}, {"id": "long", "label": "Long", "emoji": "🥾"}]}'),
    ('potty',  'What',      NULL,        'single_choice', NULL, false, 10,
     '{"options": [{"id": "pee", "label": "Pee", "emoji": "💛"}, {"id": "poop", "label": "Poop", "emoji": "💩"}, {"id": "both", "label": "Both", "emoji": "✨"}]}'),
    ('meds',   'Which med', NULL,        'text',          NULL, false, 10, '{}'),
    ('weight', 'Weight',    'weight_kg', 'number',        'kg', true,  10, '{}'),
    ('vet',    'Notes',     NULL,        'long_text',     NULL, false, 10, '{}')
) AS v(type_key, label, attr_key, value_kind, unit, required, sort_order, config)
JOIN public.pet_event_types t ON t.system_key = v.type_key
WHERE NOT EXISTS (
    SELECT 1 FROM public.pet_event_attributes a
    WHERE a.event_type_id = t.id
      AND a.deleted_at IS NULL
      AND (a.system_key = v.attr_key OR lower(a.label) = lower(v.label))
);

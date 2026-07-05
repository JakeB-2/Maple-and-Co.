-- ============================================================================
-- Foundations: audit trigger functions, profiles, signup trigger,
-- polymorphic comments, reactions.
--
-- Conventions established here (every later table follows them):
--   [audit] = created_at/by, updated_at/by columns + both fill triggers
--             (ENABLE ALWAYS). Actor columns are stamped app-side (lib/audit.ts);
--             triggers are a fill-if-null backstop, copied from Portal baseline
--             with SET search_path = '' added (Portal omits it).
--   [soft]  = deleted_at/deleted_by_user_id + partial indexes; hard delete is
--             never exposed in the UI (undo = clear the tombstone).
--   RLS: one permissive authenticated policy per table. Both household members
--        may do everything; the trust boundary is requireAuth() in server code.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Audit fill triggers (Portal baseline ~5405, hardened with empty search_path)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_fill_created_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
BEGIN
  IF NEW.created_at IS NULL THEN NEW.created_at := now(); END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_fill_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
BEGIN
  IF NEW.updated_at IS NULL THEN NEW.updated_at := now(); END IF;
  RETURN NEW;
END $$;

-- ----------------------------------------------------------------------------
-- profiles — one row per household member, 1:1 with auth.users.
-- No soft delete: members don't get deleted, and auth.users cascade covers it.
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    avatar_path text,
    signature_color text DEFAULT '#8b8b8b' NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid
);

COMMENT ON TABLE public.profiles IS 'Household members (exactly two, plus whatever the future brings). Created automatically on signup by fn_handle_new_user; names/colors upserted by seed keyed on email.';
COMMENT ON COLUMN public.profiles.signature_color IS 'The person''s color, used app-wide to show "who" without names (avatar chips, spend rows). Hex; the design pass may re-point these.';
COMMENT ON COLUMN public.profiles.avatar_path IS 'Storage path inside the private media bucket (avatars/...), served via the authed /media proxy route.';

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.profiles ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.profiles ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_all ON public.profiles TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Signup trigger: every new auth user gets a profiles row immediately.
-- SECURITY DEFINER because auth.users triggers run as supabase_auth_admin,
-- which has no grant on public.profiles. Seed then upgrades display_name and
-- signature_color by email (remote auth UUIDs are unknowable ahead of time).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, created_by_user_id)
  VALUES (NEW.id, COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'New member'), NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- ----------------------------------------------------------------------------
-- comments — one polymorphic table over all commentable entities (no per-entity
-- clone tables). Orphaning is neutralized because every parent table
-- soft-deletes: a comment's parent may be tombstoned but never vanishes.
-- ----------------------------------------------------------------------------
CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by_user_id uuid,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT comments_entity_type_check CHECK (entity_type IN ('spend', 'grocery_item', 'pet_event', 'calendar_event', 'task')),
    CONSTRAINT comments_body_check CHECK (btrim(body) <> '')
);

COMMENT ON TABLE public.comments IS 'Polymorphic comments over the five commentable entities. entity_id has no FK by design (five parents); parents soft-delete, so comments never truly orphan.';

CREATE INDEX comments_entity_idx ON public.comments (entity_type, entity_id) WHERE deleted_at IS NULL;

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
CREATE TRIGGER a_fill_updated_at BEFORE INSERT OR UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_updated_at();
ALTER TABLE public.comments ENABLE ALWAYS TRIGGER a_fill_created_at;
ALTER TABLE public.comments ENABLE ALWAYS TRIGGER a_fill_updated_at;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_all ON public.comments TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- reactions — created-only emoji toggle. Hard delete (a removed reaction is
-- not content worth tombstoning), so no updated/soft columns.
-- ----------------------------------------------------------------------------
CREATE TABLE public.reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by_user_id uuid NOT NULL,
    CONSTRAINT reactions_entity_type_check CHECK (entity_type IN ('spend', 'grocery_item', 'pet_event', 'calendar_event', 'task')),
    CONSTRAINT reactions_emoji_check CHECK (btrim(emoji) <> ''),
    CONSTRAINT reactions_unique_per_user UNIQUE (created_by_user_id, emoji, entity_type, entity_id)
);

COMMENT ON TABLE public.reactions IS 'Emoji reactions (the Honeydue touch). Toggle = insert/delete; UNIQUE makes double-taps idempotent.';

CREATE INDEX reactions_entity_idx ON public.reactions (entity_type, entity_id);

CREATE TRIGGER a_fill_created_at BEFORE INSERT ON public.reactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_fill_created_at();
ALTER TABLE public.reactions ENABLE ALWAYS TRIGGER a_fill_created_at;

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY reactions_all ON public.reactions TO authenticated USING (true) WITH CHECK (true);

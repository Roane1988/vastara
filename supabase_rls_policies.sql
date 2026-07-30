-- ============================================================================
-- Vastara — Supabase Row Level Security (RLS) Policies
-- Generated: Production-ready policies for core tables
-- Execute this entire script in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TABLE: profiles
-- Stores user profile data (first_name, whatsapp, role, etc.)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view profiles; full access only for own profile
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert their own profile
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile only
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile only
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ============================================================================
-- TABLE: forum_posts
-- Stores forum discussion posts
-- ============================================================================
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read forum posts
CREATE POLICY "forum_posts_select" ON forum_posts
  FOR SELECT
  USING (true);

-- Authenticated users can create posts (author_id must match their uid)
CREATE POLICY "forum_posts_insert" ON forum_posts
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Only the author can update their post
CREATE POLICY "forum_posts_update" ON forum_posts
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Only the author can delete their post
CREATE POLICY "forum_posts_delete" ON forum_posts
  FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================================
-- TABLE: forum_replies
-- Stores replies to forum posts
-- ============================================================================
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

-- Anyone can read replies
CREATE POLICY "forum_replies_select" ON forum_replies
  FOR SELECT
  USING (true);

-- Authenticated users can reply (author_id must match their uid)
CREATE POLICY "forum_replies_insert" ON forum_replies
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Only the author can update their reply
CREATE POLICY "forum_replies_update" ON forum_replies
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Only the author can delete their reply
CREATE POLICY "forum_replies_delete" ON forum_replies
  FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================================
-- TABLE: properties
-- Stores property listings (if exists)
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'properties') THEN
    ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

    -- Anyone can view verified properties; sellers can view their own regardless of status
    CREATE POLICY "properties_select" ON properties
      FOR SELECT
      USING (status = 'verified' OR auth.uid() = seller_id);

    -- Authenticated users can list properties (owner_id must match their uid)
    CREATE POLICY "properties_insert" ON properties
      FOR INSERT
      WITH CHECK (auth.uid() = seller_id);

    -- Only the owner can update their listing
    CREATE POLICY "properties_update" ON properties
      FOR UPDATE
      USING (auth.uid() = seller_id)
      WITH CHECK (auth.uid() = seller_id);

    -- Only the owner can delete their listing
    CREATE POLICY "properties_delete" ON properties
      FOR DELETE
      USING (auth.uid() = seller_id);
  END IF;
END $$;

-- ============================================================================
-- TABLE: direct_messages
-- Stores direct/chat messages between users
-- ============================================================================
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "direct_messages_select" ON direct_messages
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "direct_messages_insert" ON direct_messages
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "direct_messages_delete" ON direct_messages
    FOR DELETE
    USING (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLE: site_visits
-- Stores scheduled property visit requests
-- ============================================================================
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "site_visits_select" ON site_visits
    FOR SELECT
    USING (auth.uid() = buyer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "site_visits_insert" ON site_visits
    FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "site_visits_update" ON site_visits
    FOR UPDATE
    USING (auth.uid() = buyer_id)
    WITH CHECK (auth.uid() = buyer_id AND status IN ('cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

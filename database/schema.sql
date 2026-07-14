-- ============================================================
-- LiveForum Database Schema (Full Reference)
-- ============================================================

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forums Table
CREATE TABLE public.forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  member_count INT DEFAULT 0,
  tags TEXT[],
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages Table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING ( auth.uid() = id );

-- Forums Policies
CREATE POLICY "Forums are viewable by everyone."
  ON public.forums FOR SELECT USING ( true );

CREATE POLICY "Authenticated users can create forums."
  ON public.forums FOR INSERT WITH CHECK ( auth.role() = 'authenticated' );

CREATE POLICY "Forum creator can update their forum."
  ON public.forums FOR UPDATE USING ( auth.uid() = created_by );

CREATE POLICY "Forum creator can delete their forum."
  ON public.forums FOR DELETE USING ( auth.uid() = created_by );

-- Messages Policies
CREATE POLICY "Messages are viewable by everyone."
  ON public.messages FOR SELECT USING ( true );

CREATE POLICY "Authenticated users can insert messages."
  ON public.messages FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = user_id );

CREATE POLICY "Users can delete their own messages."
  ON public.messages FOR DELETE USING ( auth.uid() = user_id );

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forums;

-- ============================================================
-- Storage Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('forum-thumbnails', 'forum-thumbnails', true);

-- chat-images policies
CREATE POLICY "Anyone can view chat images"
  ON storage.objects FOR SELECT USING ( bucket_id = 'chat-images' );
CREATE POLICY "Authenticated users can upload chat images"
  ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'chat-images' AND auth.role() = 'authenticated' );

-- forum-thumbnails policies
CREATE POLICY "Anyone can view forum thumbnails"
  ON storage.objects FOR SELECT USING ( bucket_id = 'forum-thumbnails' );
CREATE POLICY "Authenticated users can upload forum thumbnails"
  ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'forum-thumbnails' AND auth.role() = 'authenticated' );
CREATE POLICY "Users can delete their own forum thumbnails"
  ON storage.objects FOR DELETE USING ( bucket_id = 'forum-thumbnails' AND auth.role() = 'authenticated' );

-- ============================================================
-- Trigger: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User_' || substr(new.id::text, 1, 6)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

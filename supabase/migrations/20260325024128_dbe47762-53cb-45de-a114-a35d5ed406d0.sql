
-- Create draft_media table to track media files per draft
CREATE TABLE public.draft_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES public.drafts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.draft_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own draft media" ON public.draft_media
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for draft media
INSERT INTO storage.buckets (id, name, public) VALUES ('draft-media', 'draft-media', false);

-- Storage policies for draft-media bucket
CREATE POLICY "Users can upload draft media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'draft-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own draft media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'draft-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own draft media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'draft-media' AND (storage.foldername(name))[1] = auth.uid()::text);

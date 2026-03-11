
CREATE TABLE public.media_diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  video_count integer NOT NULL DEFAULT 0,
  image_count integer NOT NULL DEFAULT 0,
  audio_count integer NOT NULL DEFAULT 0,
  summary_text text,
  content_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  week_start date,
  salesforce_synced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diary entries are viewable by everyone" ON public.media_diary_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert diary entries" ON public.media_diary_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update diary entries" ON public.media_diary_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete diary entries" ON public.media_diary_entries FOR DELETE USING (true);

CREATE TRIGGER update_media_diary_entries_updated_at
  BEFORE UPDATE ON public.media_diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

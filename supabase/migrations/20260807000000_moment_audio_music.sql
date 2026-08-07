-- Ambient music bed: a second, voice+music MP3 stored alongside the voice-only
-- audio_path. Nullable — pre-existing moments and any moment whose best-effort
-- mix failed simply have no music file and play voice-only.
alter table public.moments
  add column audio_music_path text;

comment on column public.moments.audio_music_path is
  'Storage path to the voice+ambient-bed MP3 (audio/{user}/{moment}-music.mp3). Null = play voice-only (audio_path).';

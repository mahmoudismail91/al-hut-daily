-- Listener ratings for the Daily Mixer page. Run once in the Supabase SQL editor of a new free project,
-- then put the project URL and its anon (public) key into DAILY_RATINGS in index.html.
-- Visitors can only add one rating (1 to 5) per piece and read the averages; they can't read, change or delete rows.
create table public.ratings (
  piece text not null check (piece ~ '^\d{4}-\d{2}-\d{2}$'),
  visitor uuid not null,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (piece, visitor)
);
alter table public.ratings enable row level security;
create policy "anyone can rate once" on public.ratings for insert to anon with check (true);

create function public.piece_stats() returns table (piece text, average numeric, votes bigint)
language sql security definer set search_path = public as $$
  select piece, round(avg(stars), 1), count(*) from ratings group by piece
$$;
revoke execute on function public.piece_stats() from public;
grant execute on function public.piece_stats() to anon;

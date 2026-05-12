alter table meal_entries
add column if not exists logged_at_utc timestamptz,
add column if not exists logged_at_local text,
add column if not exists logged_date_local date,
add column if not exists timezone text,
add column if not exists timezone_offset_minutes integer;

update meal_entries
set
  logged_at_utc = coalesce(logged_at_utc, logged_at),
  logged_at_local = coalesce(
    logged_at_local,
    to_char(logged_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
  ),
  logged_date_local = coalesce(logged_date_local, (logged_at at time zone 'UTC')::date),
  timezone = coalesce(timezone, 'UTC'),
  timezone_offset_minutes = coalesce(timezone_offset_minutes, 0)
where logged_at_utc is null
   or logged_at_local is null
   or logged_date_local is null
   or timezone is null
   or timezone_offset_minutes is null;


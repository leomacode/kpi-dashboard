-- KPI Dashboard — Supabase schema and seed data
-- Run this in your Supabase SQL editor to set up the table and sample KPIs.

-- Create table
create table kpis (
  id            text primary key,
  name          text not null,
  unit          text not null,
  value         float8 not null,
  plan_value    float8,
  min           float8 not null default 0,
  bronze        float8 not null,
  silver        float8 not null,
  gold          float8 not null,
  platinum      float8 not null,
  plateau_label text not null,
  explanation   text not null,
  -- Only two values are valid; the app rejects anything else (mappers.ts).
  -- Existing database: alter table kpis add constraint kpis_directionality_check
  --   check (directionality in ('higher-is-better', 'lower-is-better'));
  directionality text not null
    check (directionality in ('higher-is-better', 'lower-is-better'))
);

-- Seed data
insert into kpis values
  ('kpi-1', 'Pasture Access', 'hrs/year', 2000, 1500, 0, 720, 900, 1440, 4000, 'Gold',
   'Pasture access measures how many hours per year dairy cows spend outdoors. Higher values indicate better animal welfare and biodiversity outcomes.',
   'higher-is-better'),
  ('kpi-2', 'Bulk Milk Urea', 'mg/100mg', 17.5, 17, 0, 90, 20, 17, 5, 'Gold',
   'Bulk milk urea reflects the protein and energy balance in the cow''s diet. Lower values indicate more efficient nitrogen utilisation and reduced environmental impact.',
   'lower-is-better'),
  ('kpi-3', 'Nitrogen Farm Surplus', 'kg/ha', 105.9, 160, 0, 399, 165, 100, -40, 'Silver',
   'Farm nitrogen surplus is the difference between nitrogen inputs and outputs on the farm. Lower values indicate more efficient nitrogen use and less risk of environmental losses.',
   'lower-is-better'),
  ('kpi-4', 'Nitrogen Soil Surplus', 'kg N/ha', 57, 145, 0, 399, 150, 90, -20, 'Gold',
   'Soil nitrogen surplus reflects how much nitrogen remains in the soil after crop uptake. Reducing this surplus helps prevent groundwater contamination.',
   'lower-is-better'),
  ('kpi-5', 'Ammonia Emissions', 'kg NH3/ha', 50.9, 50, 0, 399, 60, 45, 0, 'Silver',
   'Ammonia emissions contribute to air pollution and nitrogen deposition in nature areas. Farms with lower emissions have better environmental performance.',
   'lower-is-better'),
  ('kpi-6', 'Species-Rich Grassland', '%', 18.4, 40, 0, 0, 10, 20, 60, 'Gold',
   'The percentage of species-rich grassland on the farm. Higher values indicate greater biodiversity and a healthier ecosystem.',
   'higher-is-better'),
  ('kpi-7', 'Nature Management Area', '%', 5.8, 4, 0, 0, 2.5, 10, 20, 'Silver',
   'The share of farmland under formal nature management agreements. Higher values show a stronger commitment to landscape and biodiversity conservation.',
   'higher-is-better');

-- Monthly history (Nov 2025 → Oct 2026). The last month of each series equals
-- the KPI's current `value`. Mirrors src/components/KPISection/data/mockHistory.ts.
create table kpi_history (
  kpi_id text not null references kpis(id) on delete cascade,
  month  text not null check (month ~ '^\d{4}-\d{2}$'),
  value  float8 not null,
  primary key (kpi_id, month)
);

insert into kpi_history values
  ('kpi-1', '2025-11', 1650),
  ('kpi-1', '2025-12', 1680),
  ('kpi-1', '2026-01', 1700),
  ('kpi-1', '2026-02', 1720),
  ('kpi-1', '2026-03', 1760),
  ('kpi-1', '2026-04', 1800),
  ('kpi-1', '2026-05', 1850),
  ('kpi-1', '2026-06', 1900),
  ('kpi-1', '2026-07', 1950),
  ('kpi-1', '2026-08', 2120),
  ('kpi-1', '2026-09', 2080),
  ('kpi-1', '2026-10', 2000),
  ('kpi-2', '2025-11', 21),
  ('kpi-2', '2025-12', 20.5),
  ('kpi-2', '2026-01', 20.1),
  ('kpi-2', '2026-02', 19.8),
  ('kpi-2', '2026-03', 19.2),
  ('kpi-2', '2026-04', 18.9),
  ('kpi-2', '2026-05', 18.5),
  ('kpi-2', '2026-06', 18.2),
  ('kpi-2', '2026-07', 17.9),
  ('kpi-2', '2026-08', 17.6),
  ('kpi-2', '2026-09', 17.2),
  ('kpi-2', '2026-10', 17.5),
  ('kpi-3', '2025-11', 142),
  ('kpi-3', '2025-12', 138),
  ('kpi-3', '2026-01', 135),
  ('kpi-3', '2026-02', 131),
  ('kpi-3', '2026-03', 128),
  ('kpi-3', '2026-04', 124),
  ('kpi-3', '2026-05', 120),
  ('kpi-3', '2026-06', 117),
  ('kpi-3', '2026-07', 113),
  ('kpi-3', '2026-08', 110),
  ('kpi-3', '2026-09', 108.4),
  ('kpi-3', '2026-10', 105.9),
  ('kpi-4', '2025-11', 98),
  ('kpi-4', '2025-12', 95),
  ('kpi-4', '2026-01', 90),
  ('kpi-4', '2026-02', 86),
  ('kpi-4', '2026-03', 81),
  ('kpi-4', '2026-04', 77),
  ('kpi-4', '2026-05', 72),
  ('kpi-4', '2026-06', 68),
  ('kpi-4', '2026-07', 65),
  ('kpi-4', '2026-08', 61),
  ('kpi-4', '2026-09', 59),
  ('kpi-4', '2026-10', 57),
  ('kpi-5', '2025-11', 58),
  ('kpi-5', '2025-12', 57.4),
  ('kpi-5', '2026-01', 56.8),
  ('kpi-5', '2026-02', 56),
  ('kpi-5', '2026-03', 55.1),
  ('kpi-5', '2026-04', 54.3),
  ('kpi-5', '2026-05', 53.6),
  ('kpi-5', '2026-06', 52.8),
  ('kpi-5', '2026-07', 52.2),
  ('kpi-5', '2026-08', 51.5),
  ('kpi-5', '2026-09', 51.1),
  ('kpi-5', '2026-10', 50.9),
  ('kpi-6', '2025-11', 12),
  ('kpi-6', '2025-12', 12.5),
  ('kpi-6', '2026-01', 13.1),
  ('kpi-6', '2026-02', 13.8),
  ('kpi-6', '2026-03', 14.6),
  ('kpi-6', '2026-04', 15.5),
  ('kpi-6', '2026-05', 16.4),
  ('kpi-6', '2026-06', 17.3),
  ('kpi-6', '2026-07', 18.9),
  ('kpi-6', '2026-08', 21.2),
  ('kpi-6', '2026-09', 22.6),
  ('kpi-6', '2026-10', 18.4),
  ('kpi-7', '2025-11', 4.2),
  ('kpi-7', '2025-12', 4.3),
  ('kpi-7', '2026-01', 4.5),
  ('kpi-7', '2026-02', 4.6),
  ('kpi-7', '2026-03', 4.8),
  ('kpi-7', '2026-04', 5),
  ('kpi-7', '2026-05', 5.1),
  ('kpi-7', '2026-06', 5.3),
  ('kpi-7', '2026-07', 5.5),
  ('kpi-7', '2026-08', 5.6),
  ('kpi-7', '2026-09', 5.8),
  ('kpi-7', '2026-10', 5.8);

alter table kpi_history enable row level security;
create policy "Allow public read" on kpi_history for select using (true);

-- Enable Row Level Security
alter table kpis enable row level security;

-- Reads are public by design: seeded benchmark reference data, no per-user rows.
create policy "Allow public read" on kpis for select using (true);

-- Deliberately NO client write policy. The anon key ships in the browser
-- bundle, so a `for update using (true)` policy would let anyone rewrite
-- measured values, thresholds and explanations for every visitor. The one
-- legitimate client write — setting a plan target — goes through the narrow
-- function below, which is the authorization boundary.
create function set_plan_value(kpi_id text, plan float8)
returns void
language sql
security definer
set search_path = public
as $$
  update kpis set plan_value = plan where id = kpi_id;
$$;

revoke execute on function set_plan_value(text, float8) from public;
grant execute on function set_plan_value(text, float8) to anon, authenticated;

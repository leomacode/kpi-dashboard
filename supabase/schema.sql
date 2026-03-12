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
  directionality text not null
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

-- Enable Row Level Security
alter table kpis enable row level security;
create policy "Allow public read" on kpis for select using (true);
create policy "Allow public update" on kpis for update using (true);
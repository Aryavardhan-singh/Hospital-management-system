# Claude project handoff

## Project at a glance

**MedNet Ops** is a React + TypeScript web app for coordinating a demo hospital network and ambulance fleet in Jaipur. It has an admin dashboard and a citizen-facing hospital finder. Supabase is the optional persistence and realtime layer; without credentials, the app uses built-in sample data.

This file describes the implementation currently present in the repository. Treat README feature claims and future roadmap items as proposals unless they are listed below as implemented.

## Instructions for Claude when changing this project

Before making any change, inspect the relevant files and understand how the existing feature works. Preserve the current UI, layout, styling, routes, data flow, and user-facing behavior unless the task explicitly asks to change them. Make the smallest complete change that solves the request; do not rewrite, remove, rename, or reorganize unrelated code, and do not replace working functionality with placeholders or mock behavior. Follow the project's existing React, TypeScript, Tailwind, and Supabase patterns. Check all affected call sites and related screens so the change stays consistent across the app. If a request is ambiguous or would require a significant design or behavior decision, ask before proceeding rather than guessing. After editing, run the relevant checks (at minimum `npm run build`; also `npm run lint` when practical), fix any issues introduced by the change, and summarize exactly what changed and what was verified. Do not claim a feature or test works unless you have verified it.

## Implemented features

### Admin command center (`/`)

- Overview dashboard with hospital and ambulance KPIs, analytics, quick actions, live/mock status, refresh and sample-data seeding.
- Hospitals network page with hospital search, specialty filtering, ICU/ventilator requirement filters, oxygen-status filtering, sorting by capacity/name, facility cards, and a detail modal.
- Hospital resource records include total/available ICU beds, available ventilators, oxygen status, and available blood types.
- Bed occupancy adjustment controls and a demo action to set a hospital to full capacity.
- Emergency fleet page with a Leaflet map, ambulance status/location panel, and dispatch controls for idle ambulances.
- Response analytics view with modeled dispatch-to-arrival estimates, network bed/ICU utilization, fleet utilization, hospital occupancy comparison, and a 24-hour dispatch-volume chart.
- Fleet incident simulator for Jaipur traffic zones, mass-casualty ambulance batches, and capacity surges; traffic zones affect route scoring and incident areas appear on the map.
- SQL setup viewer, accessible from the dashboard navigation.

### Smart dispatch and simulation

- [`src/lib/routing.ts`](./src/lib/routing.ts) scores candidate hospitals using weighted straight-line distance, bed capacity, optional specialty match, and a simulated congestion factor. Dispatch can require ICU beds and/or ventilators; critical severity requires both. Hospitals without required resources are never selected.
- Hospitals at or above 95% occupancy are excluded when alternatives exist; if all are over the threshold, the router falls back to considering all hospitals.
- Dispatching an idle ambulance assigns the highest-scoring hospital and displays a score breakdown.
- [`src/hooks/useAmbulanceSimulation.ts`](./src/hooks/useAmbulanceSimulation.ts) moves en-route ambulances toward their assigned hospital at fixed intervals, marks them occupied near arrival, and checks for capacity-threshold crossings to reroute affected ambulances when another destination is selected.
- Reroutes are shown as in-app toast notifications.

### Citizen finder (`/public` and `/find-help`)

- Requests browser location; if permission is denied, the user can enter coordinates or use a Jaipur-center fallback.
- Ranks and displays up to three hospitals with availability labels, distance/ETA, and a Leaflet map. Citizen results can be enriched with OSRM driving distance and duration; straight-line estimates remain the fallback.
- Supports an optional specialty preference.
- “Request Emergency Ambulance” reuses an idle Supabase ambulance or inserts a new one, setting its location to the citizen and destination to the top recommendation. In mock mode it displays a simulated confirmation.
- The UI advises users to call emergency services for life-threatening emergencies.

### Data and database

- Hospital and ambulance records have shared TypeScript types in [`src/types/index.ts`](./src/types/index.ts).
- [`src/hooks/useSupabaseData.ts`](./src/hooks/useSupabaseData.ts) fetches hospital and ambulance data, subscribes to Supabase Realtime changes, exposes refresh/seeding/update helpers, and uses built-in Jaipur mock records if credentials are absent.
- [`hospital_resources_migration.sql`](./hospital_resources_migration.sql) safely adds resource-tracking columns to an existing database; run it before using the updated sample-data seeding with an existing Supabase project.
- Supabase environment variables are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; see [`.env.example`](./.env.example). Do not put credentials in this handoff or commit them.
- [`schema.sql`](./schema.sql) defines the two tables, demo RLS policies, Realtime publication, and Jaipur sample rows.

## Main code map

- [`src/main.tsx`](./src/main.tsx): React Router setup and public/admin routes.
- [`src/App.tsx`](./src/App.tsx): admin shell and tab/page composition.
- [`src/pages/HospitalsNetworkPage.tsx`](./src/pages/HospitalsNetworkPage.tsx): searchable/filterable hospital directory and detail modal.
- [`src/pages/FleetDispatchPage.tsx`](./src/pages/FleetDispatchPage.tsx): fleet monitor, dispatch UI, incident controls, map and reroute notifications.
- [`src/components/AnalyticsPanel.tsx`](./src/components/AnalyticsPanel.tsx): network response and utilization metrics and chart views.
- [`src/components/IncidentSimulationControls.tsx`](./src/components/IncidentSimulationControls.tsx): demo incident and traffic scenario controls.
- [`src/pages/PublicPage.tsx`](./src/pages/PublicPage.tsx): citizen-facing location, hospital ranking and ambulance request flow.
- [`src/hooks/useSupabaseData.ts`](./src/hooks/useSupabaseData.ts): data loading, mock fallback, Realtime subscription, demo mutations.
- [`src/hooks/useAmbulanceSimulation.ts`](./src/hooks/useAmbulanceSimulation.ts): simulated movement, dispatch and capacity-based rerouting.
- [`src/lib/routing.ts`](./src/lib/routing.ts): shared hospital scoring and dispatch destination selection.
- [`src/lib/citizenRouting.ts`](./src/lib/citizenRouting.ts): citizen result ranking, labels and ETA calculation.
- [`src/components/DispatchMap.tsx`](./src/components/DispatchMap.tsx): admin Leaflet map.
- [`src/components/SqlViewer.tsx`](./src/components/SqlViewer.tsx): SQL shown in the admin UI.
- [`src/pages/Dashboard.tsx`](./src/pages/Dashboard.tsx): another dashboard implementation exists, but the current route renders `App.tsx`; check usage before changing or removing it.

## Important boundaries and caveats

- This is a demo/prototype, not a production emergency-dispatch service. There is no authentication or role-based access.
- Ambulance movement and traffic/congestion are simulated; dispatch ranking uses approximate straight-line distance, not road routes or a live traffic feed. Citizen-facing distance/ETA may use the public OSRM demo service.
- Analytics response times are modeled from active ambulance-to-hospital straight-line distances at an assumed speed; the dispatch chart uses recorded ambulance creation timestamps when present or a clearly labeled simulated preview.
- Incident controls write simulated ambulance rows and hospital capacity changes to Supabase when configured. Clearing overlays removes map visuals only; it does not delete generated requests or restore hospital occupancy.
- The OSRM endpoint is a public demo service and is not suitable for guaranteed production availability.
- The README mentions pre-arrival hospital alerts, but there is no separate hospital notification workflow implemented. Current notifications are in-app reroute toasts.
- Public ambulance requests can update/insert Supabase rows, but they are not a connection to real emergency services. Confirm the result/error handling before relying on this flow.
- [`schema.sql`](./schema.sql) starts by dropping the existing `ambulances` and `hospitals` tables. Running it deletes their data; use only for a disposable/demo Supabase project unless the script is made non-destructive.
- The SQL embedded in [`src/components/SqlViewer.tsx`](./src/components/SqlViewer.tsx) has the current resource columns but still contains older sample data and coordinates than [`schema.sql`](./schema.sql).
- The Supabase demo policies allow public read/write access. They are not suitable for production.
- When Supabase is configured but a table returns no rows, the data hook currently displays mock data for that table.

## Development

- Install dependencies: `npm install`
- Start local development: `npm run dev`
- Build and type-check: `npm run build`
- Lint: `npm run lint`
- There is no test script currently defined in `package.json`.

## Near-term work to consider

1. Reconcile the sample data shown in the in-app SQL viewer with `schema.sql`.
2. Harden database error handling and public dispatch confirmation so failed Supabase writes cannot look successful.
3. Replace demo-open RLS policies and add authentication/authorization before any real deployment.
4. Decide whether advertised pre-arrival alerts and live road/traffic routing are in scope; they are not complete today.

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
- Hospital ER pre-arrival portal with incoming-unit status, triage handoff information, arrival ETAs, accept actions, and a manual divert workflow.
- Response analytics view with modeled dispatch-to-arrival estimates, network bed/ICU utilization, fleet utilization, hospital occupancy comparison, and a 24-hour dispatch-volume chart.
- Fleet incident simulator for Jaipur traffic zones, mass-casualty ambulance batches, and capacity surges; traffic zones affect route scoring and incident areas appear on the map.
- Dashboard role switcher for Admin / Network Manager, Dispatcher, Hospital ER Staff, and Public / Citizen. Each dashboard role receives a filtered set of tabs; choosing Citizen opens the public finder.
- SQL setup viewer, accessible from the dashboard navigation.

### Smart dispatch and simulation

- [`src/lib/routing.ts`](./src/lib/routing.ts) scores candidate hospitals using weighted straight-line distance, bed capacity, optional specialty match, and a simulated congestion factor. Dispatch can require ICU beds and/or ventilators; critical severity requires both. Hospitals without required resources are never selected. Specialty selection is wired into citizen ranking and dispatch routing where supplied.
- Hospitals at or above 95% occupancy are excluded when alternatives exist; if all are over the threshold, the router falls back to considering all hospitals.
- Dispatching an idle ambulance assigns the highest-scoring hospital and displays a score breakdown.
- [`src/hooks/useAmbulanceSimulation.ts`](./src/hooks/useAmbulanceSimulation.ts) moves en-route ambulances toward their assigned hospital at fixed intervals, marks them occupied near arrival, and checks for capacity-threshold crossings to reroute affected ambulances when another destination is selected.
- Reroutes are shown as in-app toast notifications; ER staff can also manually accept or divert incoming ambulances from the pre-arrival portal.

### Citizen finder (`/public` and `/find-help`)

- Requests browser location; if permission is denied, the user can enter coordinates or use a Jaipur-center fallback.
- Ranks and displays up to three hospitals with availability labels, distance/ETA, and a Leaflet map. [`src/lib/osrm.ts`](./src/lib/osrm.ts) requests OSRM driving routes and route geometry for the citizen list, tracking view, and ER arrival estimates; requests that fail, time out, or return no route fall back to straight-line distance/estimated time.
- Supports an optional specialty preference.
- Includes a critical/moderate/minor triage-severity selector and a two-stage citizen tracking view for ambulance-to-patient pickup and onward hospital transport.
- “Request Emergency Ambulance” reuses an idle ambulance or inserts a new demo ambulance, assigning the citizen location and recommended hospital. In mock mode it updates only local demo state. This is not a connection to emergency services.
- The UI advises users to call emergency services for life-threatening emergencies.

### Data and database

- Hospital and ambulance records have shared TypeScript types in [`src/types/index.ts`](./src/types/index.ts).
- [`src/hooks/useSupabaseData.ts`](./src/hooks/useSupabaseData.ts) fetches hospital and ambulance data, subscribes to Supabase Realtime changes, exposes refresh/seeding/update helpers, and uses built-in Jaipur mock records if credentials are absent.
- Hospital resource fields include general-bed occupancy, total/available ICU beds, available ventilators, oxygen status, and a list of reported available blood types. Blood types are availability labels, not unit-level blood-bank inventory.
- [`hospital_resources_migration.sql`](./hospital_resources_migration.sql) safely adds hospital resource-tracking and ambulance ER/pre-arrival columns to an existing database; run it before using updated sample-data seeding with an existing Supabase project.
- Supabase mutation helpers check returned write errors before updating local state, report failures in the UI, and keep simulated writes local when Supabase is not configured.
- The in-app role selector is a demonstration UI filter. Supabase RLS remains demo-open and does not enforce these roles; this project has no authentication or server-side authorization.
- Supabase environment variables are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; see [`.env.example`](./.env.example). Do not put credentials in this handoff or commit them.
- [`schema.sql`](./schema.sql) defines the two tables, demo RLS policies, Realtime publication, and Jaipur sample rows.

## Main code map

- [`src/main.tsx`](./src/main.tsx): React Router setup and public/admin routes.
- [`src/App.tsx`](./src/App.tsx): admin shell and tab/page composition.
- [`src/pages/HospitalsNetworkPage.tsx`](./src/pages/HospitalsNetworkPage.tsx): searchable/filterable hospital directory and detail modal.
- [`src/pages/FleetDispatchPage.tsx`](./src/pages/FleetDispatchPage.tsx): fleet monitor, dispatch UI, incident controls, map and reroute notifications.
- [`src/components/AnalyticsPanel.tsx`](./src/components/AnalyticsPanel.tsx): network response and utilization metrics and chart views.
- [`src/components/IncidentSimulationControls.tsx`](./src/components/IncidentSimulationControls.tsx): demo incident and traffic scenario controls.
- [`src/components/HospitalPreArrivalPanel.tsx`](./src/components/HospitalPreArrivalPanel.tsx): incoming ambulance view with accept and divert actions.
- [`src/components/CitizenTrackingMap.tsx`](./src/components/CitizenTrackingMap.tsx): citizen-facing ambulance, route, pickup and hospital tracking display.
- [`src/components/HospitalBedAdjustmentPanel.tsx`](./src/components/HospitalBedAdjustmentPanel.tsx): ER-staff bed adjustment view.
- [`src/components/StickyHeader.tsx`](./src/components/StickyHeader.tsx) and [`src/types/roles.ts`](./src/types/roles.ts): role selector and client-side role/tab mapping.
- [`src/pages/PublicPage.tsx`](./src/pages/PublicPage.tsx): citizen-facing location, hospital ranking and ambulance request flow.
- [`src/hooks/useSupabaseData.ts`](./src/hooks/useSupabaseData.ts): data loading, mock fallback, Realtime subscription, demo mutations.
- [`src/hooks/useAmbulanceSimulation.ts`](./src/hooks/useAmbulanceSimulation.ts): simulated movement, dispatch and capacity-based rerouting.
- [`src/lib/osrm.ts`](./src/lib/osrm.ts): OSRM route requests and straight-line fallback.
- [`src/lib/dataErrors.ts`](./src/lib/dataErrors.ts): shared notification event for database write failures.
- [`src/components/NewSidebar.tsx`](./src/components/NewSidebar.tsx): role-filtered dashboard navigation and live/mock indicator.
- [`src/lib/routing.ts`](./src/lib/routing.ts): shared hospital scoring and dispatch destination selection.
- [`src/lib/citizenRouting.ts`](./src/lib/citizenRouting.ts): citizen result ranking, labels and ETA calculation.
- [`src/components/DispatchMap.tsx`](./src/components/DispatchMap.tsx): admin Leaflet map.
- [`src/components/SqlViewer.tsx`](./src/components/SqlViewer.tsx): SQL shown in the admin UI.
- [`src/pages/Dashboard.tsx`](./src/pages/Dashboard.tsx): another dashboard implementation exists, but the current route renders `App.tsx`; check usage before changing or removing it.

## Important boundaries and caveats

- This is a demo/prototype, not a production emergency-dispatch service. The role selector filters the dashboard UI only; it is not authentication or a security boundary. Protect production data with authenticated Supabase policies and server-side authorization.
- Ambulance movement and traffic/congestion are simulated; dispatch ranking uses approximate straight-line distance and simulated traffic penalties, not road routing or a live traffic feed. OSRM road routes are used for citizen route/ETA displays and ER arrival estimates, with straight-line fallback.
- Analytics response times are modeled from active ambulance-to-hospital straight-line distances at an assumed speed; the dispatch chart uses recorded ambulance creation timestamps when present or a clearly labeled simulated preview.
- Incident controls write simulated ambulance rows and hospital capacity changes to Supabase when configured. Clearing overlays removes map visuals only; it does not delete generated requests or restore hospital occupancy.
- The OSRM endpoint is a public demo service and is not suitable for guaranteed production availability.
- The pre-arrival portal is an in-app dashboard workflow, not an external push, SMS, or hospital paging notification service. Accept/divert actions update the demo ambulance record.
- Supabase writes check returned errors before updating local state. Failures are shown in the admin toast/error banner and the citizen request flow displays its error; mock mode updates only local demo state. Public ambulance requests are not connected to real emergency services.
- [`schema.sql`](./schema.sql) starts by dropping the existing `ambulances` and `hospitals` tables. Running it deletes their data; use only for a disposable/demo Supabase project unless the script is made non-destructive.
- [`src/components/SqlViewer.tsx`](./src/components/SqlViewer.tsx) imports [`schema.sql`](./schema.sql) as raw text for display and copy, so the in-app setup script stays synchronized with the canonical file.
- The Supabase demo policies allow public read/write access. They are not suitable for production and do not enforce the dashboard role selector. Role-based authorization and authenticated RLS policies remain future work.
- When Supabase is configured but either table returns no rows or a query fails, the data hook displays mock data and the dashboard marks the fallback state.

## Development

- Install dependencies: `npm install`
- Start local development: `npm run dev`
- Build and type-check: `npm run build`
- Lint: `npm run lint`
- There is no test script currently defined in `package.json`.

## Near-term work to consider

1. Replace demo-open RLS policies and add authentication/authorization before any real deployment.
2. Add a production traffic source and reliable OSRM deployment if live traffic-aware dispatch routing is required.
3. Add external hospital alert delivery and inventory-level blood bank tracking if those workflows are required.

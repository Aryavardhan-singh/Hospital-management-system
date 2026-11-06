# Hospital-management-system
MedNet Ops — a Jaipur hospital coordination prototype with bed/resource tracking, simulated dispatch and capacity rerouting, OSRM-backed citizen route previews, and a public hospital finder. React + Supabase + Leaflet.
---------------------------------------------------------------------------------------------------------------------------------------
# 🏥 MedNet Ops

**A hospital coordination and emergency-response prototype for Jaipur.**

MedNet Ops brings hospital capacity, ambulance dispatch, ER pre-arrival coordination, analytics, and a citizen-facing hospital finder into one React dashboard. Supabase can provide persistence and realtime updates; without a live database, the app uses local demo data and simulated operations.

---

## 🚨 The Problem - THAT WE SOLVED !!

During medical emergencies, every minute matters — but today's hospital and ambulance systems operate in silos:

- Ambulances can arrive at hospitals that are already at full capacity
- Patients aren't matched to hospitals with the right specialty for their condition
- Advance coordination depends on staff monitoring a shared dashboard rather than external paging
- There's no city-wide, real-time view of bed availability

**MedNet Ops solves this by turning a city's hospitals into one connected, intelligent network.**

---

## ✨ Key Features

### Core System
- **Bed and resource tracking** — general-bed occupancy, total/available ICU beds, available ventilators, oxygen status, and reported available blood types per hospital
- **Hospital network directory** — searchable, filterable list of hospitals with specialty, capacity, ICU/ventilator requirements, and oxygen-status filters
- **Resource-aware hospital filters** — filter facilities by ICU bed or ventilator availability and oxygen status
- **Ambulance fleet map** — Jaipur Leaflet map showing hospitals, ambulance status, and simulated movement
- **ER pre-arrival portal** — incoming ambulance list, triage handoff, estimated arrival, accept action, and manual divert workflow
- **Citizen tracking and triage** — severity selection and a two-stage pickup-to-hospital tracking view after requesting a demo ambulance
- **OSRM road routes** — driving distance, ETA, and route geometry for citizen/ER views, with a straight-line fallback when OSRM is unavailable
- **Response analytics** — modeled response time, network bed/ICU utilization, fleet usage, hospital occupancy comparisons, and a 24-hour dispatch-volume view
- **Incident simulator** — demo traffic-jam zones, mass-casualty dispatch batches, and hospital capacity surges with map overlays and routing/diversion feedback
- **Role-based dashboard views** — Admin / Network Manager, Dispatcher, Hospital ER Staff, and Public / Citizen switcher with role-filtered dashboard tabs

### Differentiators
- 🧠 **Smart Routing Engine** — dispatch scoring uses distance, current bed load, specialty match, and simulated congestion penalties; it excludes hospitals missing required ICU beds or ventilators. OSRM road routes power citizen-facing route/ETA displays, not dispatch scoring.
- 🔄 **Capacity diversion** — simulated capacity thresholds can trigger automatic ambulance rerouting; ER staff can also manually accept or divert an incoming unit.
- 📢 **In-app pre-arrival coordination** — ER staff can review incoming units and their triage information in the dashboard. This is not an external push, SMS, or paging service.
- 🌍 **Public Citizen Portal** — users can share or enter a location, compare nearby hospitals, select triage severity, and request a simulated ambulance with a tracking view.

### Interface guide

- **Command Center:** network KPIs, overview charts, quick actions, and database connection/sample-data status.
- **Hospitals:** searchable network directory, resource filters, and per-hospital detail view.
- **Fleet & Dispatch:** map, ambulance operations, and incident simulation controls.
- **ER Pre-Arrival Alerts:** incoming-unit triage, accept, and divert actions.
- **Response Analytics:** modeled response and utilization metrics with occupancy and dispatch-volume charts.
- **Citizen Finder (`/public`):** hospital recommendations, severity selection, ambulance request, and simulated route tracking.

No screenshots are currently maintained in this repository; the guide above describes the implemented views rather than implying screenshot assets exist.

## Quickstart

1. Install dependencies with `npm install`.
2. Optionally copy [`.env.example`](./.env.example) to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Without these values, the app runs with local demo data.
3. For an existing Supabase project, run [`hospital_resources_migration.sql`](./hospital_resources_migration.sql) in the SQL Editor before using the new resource and ER fields. It is additive and preserves existing table data.
4. For a disposable demo database, [`schema.sql`](./schema.sql) creates the tables and sample rows, but starts by dropping and recreating the demo tables. Do not run it against data you need to keep.
5. Start the app with `npm run dev`. Use `npm run build` for a production build and `npm run lint` for lint checks.

## Data, security, and simulation notes

- Dashboard roles filter the interface only; they are not authenticated access control. Supabase RLS policies in the demo schema remain open for public read/write and are not suitable for production.
- Supabase write errors are surfaced in the UI and do not update local state as if persistence succeeded. When credentials are absent, demo interactions are local-only.
- Road routes use the public OSRM demo service and fall back to straight-line estimates. Traffic zones, ambulance movement, capacity incidents, and analytics are simulated; this is not a real emergency dispatch service.
- Blood types indicate reported availability only; unit-level blood-bank quantities and stock sharing are not implemented.

---

## 🚀 Future Roadmap

- Predictive bed availability using historical admission/discharge patterns
- Unit-level blood bank inventory and stock sharing between hospitals
- Live traffic data integration with dispatch routing
- Authenticated users and server-enforced roles/RLS policies
- External hospital alert delivery

---

## 👥 Team

- ARYAVARDHAN SINGH
- PAARTH

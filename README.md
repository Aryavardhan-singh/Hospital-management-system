# Hospital-management-system
MedNet Ops — real-time hospital network for Jaipur. Live bed tracking, smart ambulance routing (distance + capacity + specialty + traffic), auto-reroute during capacity crises, and a public portal for citizens to find nearby hospitals and request emergency transport. React + Supabase + Leaflet.
---------------------------------------------------------------------------------------------------------------------------------------
# 🏥 MedNet Ops

**A real-time, city-wide hospital coordination system for emergency response — built for [Hackathon Name] 2026.**

MedNet Ops connects hospitals across a city into a single live network, enabling smart ambulance dispatch, real-time bed tracking, automatic crisis rerouting, and a public portal so citizens can find help fast.

---

## 🚨 The Problem - THAT WE SOLVED !!

During medical emergencies, every minute matters — but today's hospital and ambulance systems operate in silos:

- Ambulances can arrive at hospitals that are already at full capacity
- Patients aren't matched to hospitals with the right specialty for their condition
- Hospitals get no advance warning before a patient arrives
- There's no city-wide, real-time view of bed availability

**MedNet Ops solves this by turning a city's hospitals into one connected, intelligent network.**

---

## ✨ Key Features

### Core System
- **Live bed tracking** — real-time occupied/available counts for general and ICU beds across all connected hospitals
- **Critical resource tracking** — available ICU beds, ventilators, oxygen supply status, and blood types per hospital
- **Hospital network directory** — searchable, filterable list of hospitals with specialties, capacity status, and live updates
- **Resource-aware hospital filters** — filter facilities by ICU bed or ventilator availability and oxygen status
- **Live ambulance fleet map** — real Jaipur map (Leaflet) showing all hospitals and ambulances with live status
- **Response analytics** — modeled response time, network bed/ICU utilization, fleet usage, hospital occupancy comparisons, and a 24-hour dispatch-volume view
- **Incident simulator** — demo traffic-jam zones, mass-casualty dispatch batches, and hospital capacity surges with map overlays and routing/diversion feedback

### Differentiators
- 🧠 **Smart Routing Engine** — scores hospitals by distance, current bed load, specialty match, and simulated traffic conditions; excludes facilities without explicitly required ICU beds or ventilators
- 🔄 **Auto-Diversion** — automatically detects when a hospital nears full capacity and reroutes any en-route ambulances to the next-best hospital **mid-transit**, in real time, with no manual intervention
- 📢 **Pre-Arrival Alerts** — hospitals are notified the moment an ambulance is dispatched to them, so staff can prepare before the patient arrives
- 🌍 **Public Citizen Portal** — anyone can visit the site, share their location, and instantly see nearby hospitals ranked by availability and specialty match, with a one-tap "Request Emergency Ambulance" button

For an existing Supabase project, run [`hospital_resources_migration.sql`](./hospital_resources_migration.sql) in the SQL Editor before using the new resource fields. This migration adds columns without dropping existing data. The full demo setup in [`schema.sql`](./schema.sql) still drops and recreates the demo tables.

---

## 🚀 Future Roadmap

- Predictive bed availability using historical admission/discharge patterns
- Blood bank inventory sharing between hospitals
- Real-time traffic API integration for routing accuracy
- Severity-based patient triage tagging from the ambulance side
- Hospital staff authentication and role-based access

---

## 👥 Team

- ARYAVARDHAN SINGH
- PAARTH

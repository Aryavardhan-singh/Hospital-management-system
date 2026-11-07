# 🏥 MedNet Ops — Smart Hospital & Emergency Dispatch Management System

MedNet Ops is a high-performance emergency response and hospital coordination system designed for Jaipur. It brings real-time hospital resource tracking, intelligent ambulance dispatching, citizen emergency requests, driver navigation terminals, and ER pre-arrival feeds into a unified web application.

---

## 🚨 Core Problem Solved

During critical medical emergencies, seconds matter — yet legacy infrastructure operates in disconnected silos:
- Ambulances arrive at emergency rooms that are already at 100% capacity.
- Patients are transported to hospitals lacking required specialists, ICUs, or ventilators.
- No live bidirectional communication links citizen requests, ambulance telemetry, and ER staff.
- Paramedics lack direct patient contact info and turn-by-turn navigation targets.

**MedNet Ops connects citizens, paramedics, hospital ER teams, and city coordinators into one synchronized, intelligent response network.**

---

## ✨ Key Features & Portals

### 1. 🌍 Frictionless Citizen Emergency Portal (`/find-help` / `/public`)
- **Instant Geolocation & Triage**: Automatic GPS location detection with manual coordinate and Jaipur-center fallbacks. Critical / Moderate / Minor triage selection.
- **Smart Hospital Recommendations**: Ranks nearby facilities by distance, road travel time (OSRM), bed availability, and specialty match.
- **Direct Paramedic Request**: Collects citizen phone number and landmark information for real-time driver contact.
- **Reverse Geocoding**: Automatically translates latitude/longitude into human-friendly street addresses via Nominatim.
- **Live 2-Stage Interactive Tracking**: Street, Satellite, and 3D map views tracking the assigned ambulance from dispatch to patient pickup, and onward to the ER.
- **Cancellation & Safety**: One-tap request cancellation with automated vehicle and bed release. Direct hotline links for **108 (Ambulance)**, **100 (Police)**, and **101 (Fire)**.

### 2. 🚑 Ambulance Driver Portal (`/driver`)
- **Driver Profile Authentication**: Persistent driver profile selection linking staff to vehicles (e.g., *Rajesh Meena [EMS-JP-409] -> Unit AMB-101*).
- **Active Trip Terminal**: Real-time pickup coordinates with one-tap **"Open in Google Maps ↗"** turn-by-turn navigation.
- **Direct Patient Contact**: Call the patient or caller directly with one click.
- **Patient Vitals Telemetry**: Toggle real-time acuity tags (`Cardiac`, `Breathing Difficulty`, `Severe Trauma`, `Unconscious`) that broadcast directly to the receiving hospital ER.
- **Trip Lifecycle & History**: Step-by-step dispatch workflow (`Confirm Patient Picked Up` -> `Complete Run & Arrive at ER`) and past trip audit logs.

### 3. 🏥 Hospital ER Pre-Arrival Portal (`/hospital`)
- **Incoming Ambulance Radar**: Live inbound vehicle feeds filtered by hospital facility with arrival ETAs and triage priority.
- **Live Vitals Warning Badges**: Real-time broadcast alerts of in-transit patient vitals and pickup street addresses.
- **Capacity Control**: Instant 1-tap ER `Accept` or `Divert` protocols with permanent audit logging.
- **Shift Activity Log**: Historical tracking of bed count adjustments, admissions, and diverts.

### 4. 🎛️ Command Center & Operations Dashboard (`/`)
- **Network Overview**: Citywide KPIs for available general beds, ICU beds, ventilators, and fleet utilization.
- **Streamlined Header & Navigation**: Clean access controls with a consolidated **Preferences & Tools** popover (Language switcher, Theme mode, PWA update, DB seed).
- **Hospitals Network Directory**: Searchable, filterable database by ICU, ventilator availability, oxygen status, and medical specialties.
- **Fleet Dispatch & 3D Emergency Map**: Full-width MapLibre map with Street, Satellite, and 3D terrain/building extrusion layers, traffic congestion zones, and incident simulation.
- **Bed Reservation Locking**: When an ambulance is dispatched for a critical patient, an ICU bed is automatically reserved in the database to prevent overbooking across the network.
- **Fleet Facility Re-assignment**: One-tap facility re-routing if an enroute ambulance encounters an issue.

---

## 🌐 Multi-Language, Offline & PWA Support
- **Full Bilingual Localization**: Instant English (`en`) and Hindi (`hi`) switching across all interfaces with persistence.
- **Progressive Web App (PWA)**: Installable on mobile and desktop devices with offline caching and service worker updates.
- **Offline Resilient**: Local state fallbacks and IndexedDB queuing ensure continuous operation even during connectivity loss.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Mapping & GIS**: MapLibre GL JS, Leaflet, Three.js, OSRM (Open Source Routing Machine), OpenStreetMap Nominatim
- **State & Realtime**: Supabase (PostgreSQL, Realtime subscriptions, Row-Level Security)
- **Internationalization**: i18next & react-i18next
- **Testing**: Vitest, React Testing Library, JSDOM

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Aryavardhan-singh/Hospital-management-system.git
cd Hospital-management-system
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env.local` to connect to Supabase:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
*(If no Supabase credentials are provided, MedNet Ops runs in full demo mode with local mock data).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build & Test
```bash
npm run build   # Production bundle with Vite & TypeScript check
npm run lint    # Code linting
npm run test    # Automated unit and component test suite
```

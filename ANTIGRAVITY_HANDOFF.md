# Antigravity Handoff

## Current Request
Continue the hospital-management app map work. The user asked to fix fullscreen/zoom-control overlap, add a proper 3D ambulance model, and commit all changes made so far. The latest instruction is to stop and hand off; do not make more implementation changes until taking over.

## Current App Behavior
- `/` is the dashboard; `/dashboard` is an alias. The map is inside Fleet & Dispatch, not a standalone home page.
- Fleet & Dispatch now has a full-width MapLibre map above the fleet monitor, with Street, Satellite, and 3D modes. Hospital and ambulance symbols open details; hospital details show network availability and a validated “Dispatch here” action when an idle unit is available.
- The Citizen Finder and Citizen tracking view use the shared `MapLibreMapView` with the same Street/Satellite/3D controls, fullscreen, markers, and route line.
- NASA mode was removed.
- Fullscreen controls were moved into the left map-style toolbar, away from MapLibre's top-right zoom/compass controls.
- The 3D ambulance is a locally generated Three.js mesh in a MapLibre custom layer, dynamically loaded only for a map containing an ambulance in 3D mode. Street/Satellite keep the simple van icon. The custom model uses live ambulance coordinates and a route heading.
- Overpass facility lookup can fail in this environment; Supabase-backed hospitals remain visible. OSRM route fallback remains in place.

## Important Pending Issue
The Three.js custom layer compiled and a Three.js renderer canvas was observed in the browser, but the ambulance mesh was not visually confirmed in the last screenshot. A likely terrain-elevation issue was addressed by setting the model altitude from `map.queryTerrainElevation(...) + 2.5m` and increasing marker scale. That latest fix built successfully, but the browser page reloaded to the pre-request Finder state, so the tracking map/model was not verified after the altitude fix. Retest using an existing active tracking session or a safe local/mock fixture; do not create a real Supabase ambulance request just for testing.

The 3D view should be tested for: visible ambulance mesh, correct position at the tracked ambulance marker, orientation along the route, no WebGL errors, and correct fallback to the 2D van icon in Street/Satellite.

## Verification So Far
- `npm run build` passed after the terrain-height adjustment. Vite still reports large chunks for MapLibre (~1.07 MB) and Three (~743 KB); these are warnings, not build failures.
- `npm run lint` passed before the final Three.js custom-layer edits; rerun lint now.
- Earlier browser checks confirmed the map modes, full-screen control, Citizen Finder map, route line, and availability card. Fullscreen no longer overlaps the navigation controls.
- The live “Dispatch here” action was not clicked during testing because the database currently had no idle units and a click could write to Supabase.
- Public Overpass endpoints have timed out or failed DNS here; the fallback network hospitals display correctly.

## Worktree And Commit
- Branch: `main`, previously aligned with `origin/main` at commit `5853e14` (`Add role-based dashboard and write safeguards`).
- Current edits are uncommitted. The user explicitly requested committing all current work, but no commit was made before the handoff request.
- There are many existing modified/untracked project files from prior tasks. Inspect `git status --short --branch` and review `git diff` before staging. Do not include `.env`/`.env.local` or other secrets. Stage the intended paths explicitly and commit only after final verification. Do not force-push or rewrite history.
- `npm install` reported 2 high severity dependency vulnerabilities; no `npm audit fix` was run.

## Main Files
- `src/components/MapLibreMapView.tsx`: shared Citizen Finder/tracking MapLibre renderer, styles, fullscreen, markers, route, and 3D custom-layer integration.
- `src/lib/ambulanceModelLayer.ts`: Three.js ambulance geometry and MapLibre custom-layer transform/rendering.
- `src/pages/PublicPage.tsx`: Citizen Finder map markers and OSRM preview route.
- `src/components/CitizenTrackingMap.tsx`: tracking stages, ETAs, route geometry, and ambulance heading passed to the 3D map layer.
- `src/components/EmergencyMap.jsx`: full-width Fleet Dispatch map, availability/details card, targeted dispatch, GPS share, satellite/3D modes, facility discovery.
- `src/hooks/useAmbulanceSimulation.ts`: targeted dispatch function honoring existing resource/capacity routing rules.
- `src/main.tsx`: dashboard root routing; public routes remain intact.
- `src/lib/overpass.ts`: Overpass query with endpoint fallback.
- `src/types/jsx-components.d.ts`: props declaration for the Fleet map's `.jsx` module.
- `README.md` and `CLAUDE.md`: route and map documentation.

## Next Steps
1. Inspect `git status` and diff; confirm no secrets or unrelated user changes will be committed.
2. Diagnose/verify the 3D ambulance model in a tracking-map view without writing a real request to Supabase. If the altitude transform still fails, use MapLibre's official Three.js custom-layer transform as the reference and keep the 2D van marker visible as a fallback.
3. Fix any remaining fullscreen overlap on both Citizen and Fleet maps; the current code places fullscreen beside the style buttons, but verify the mobile layout too.
4. Run `npm run build`, `npm run lint`, and `git diff --check`.
5. Stage intended project changes explicitly and create the requested descriptive commit. Do not push unless separately requested.

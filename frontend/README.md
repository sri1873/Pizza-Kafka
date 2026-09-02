# Pizza Kafka — Frontend

A three-role React dashboard (customer, restaurant, rider) for a real-time food delivery platform, built to consume an event-driven Spring Boot + Kafka backend live — order tracking, sequential rider dispatch, and live map tracking, all reflected in the UI as they happen.
---

## What this demonstrates

The interesting part of this frontend isn't the UI polish — it's that three completely different dashboards stay in sync with a live backend event stream using three different real-time mechanisms, each chosen deliberately for what it needed to do:

- **Server-Sent Events** for order status pushed from the server (no polling for status)
- **WebSocket** for streaming a rider's live location up to the server every few seconds
- **REST polling** for the customer reading a rider's current position back out of Redis.
---

## The three dashboards

### Customer
- Places an order, then watches it move through its lifecycle in a single status timeline (placed → accepted → ready → rider assigned → out for delivery → delivered), driven entirely by SSE push events
- Once a rider is assigned, a live Mapbox map appears showing the rider's real position (polled from the backend's Redis store) walking an actual road route to the delivery address, with the route line rendered from the Mapbox Directions API

### Restaurant
- Tab-based order queue (Placed / Preparing / Ready / Delivered), fetched per-status from the backend rather than fetching everything and filtering client-side
- New orders arrive instantly via SSE and are prepended into the Placed tab without a refetch
- Accepting/advancing an order removes it from the current tab immediately — no need to poll; the next tab fetch handles the correct list

### Rider
- Online/offline toggle; while online, the rider's simulated position streams to the backend over WebSocket
- Incoming order offers appear as a popup with a live 10-second countdown ring, matching the backend's sequential single-rider offer window — decline or timeout automatically moves the offer to the next-closest rider
- Once accepted, the rider walks an actual Mapbox-routed path from restaurant to customer, pacing itself to a fixed demo duration regardless of route length, and automatically fires the pickup/delivered transitions when each leg completes

---

## Key frontend decisions

### Route-following simulation, not random walk
Early versions moved the simulated rider with random lat/lng drift, which looked unconvincing and had no relationship to the actual delivery path. The final version fetches a real route from the Mapbox Directions API between the two relevant points for the current leg (rider→restaurant, then restaurant→customer) and steps the simulated position through the actual returned coordinates — paced dynamically so a route with 20 points and one with 200 points both take the same total demo duration.

### Refs over state for values read inside intervals
Anything read *inside* a `setInterval` callback that also needs to reflect the latest value — route progress index, current route coordinates, assignment status — is kept in a `useRef`, not `useState`. State captured in a closure at the time the interval was created goes stale; refs are read live on every tick. This was one of the trickier bugs to track down in the rider simulation and is worth calling out explicitly.

### SSE reconnection
The backend caches the last notification sent per user and replays it immediately on a new SSE connection — this closes a real race condition where a status update could otherwise fire before the browser's `EventSource` finished connecting (e.g. immediately after placing an order and navigating to the tracking view).

---

## Tech stack

- **React** + **Vite**
- **Tailwind CSS**
- **Mapbox GL JS** (`react-map-gl`) — live map, custom markers, Directions API for route rendering
- **Axios**
- Native **EventSource** (SSE) and **WebSocket** APIs — no external real-time library

---

## Getting started

### Prerequisites
- Node 18+

### Install & run
```bash
npm install
npm run dev
```

### Environment variables
```env
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
```

A free Mapbox account and default public token is enough — no elevated scopes needed for maps, markers, or the Directions API.

---

## Project structure

```
src/
├── pages/
│   ├── Login.jsx
│   ├── CustomerDashboard.jsx
│   ├── RestaurantDashboard.jsx
│   └── RiderDashboard.jsx
├── components/
│   └── NavBar.jsx
├── utils/
│   └── useSSE.js          # shared SSE hook used across all three dashboards
└── App.jsx                # role-based protected routing
```

---

## Try it end to end

1. Open three browser tabs, log in as `customer`, `restaurant`, and `rider` respectively
2. Place an order as the customer
3. Accept it as the restaurant, then mark it ready
4. Accept the incoming offer as the rider before the 10-second countdown runs out
5. Watch the rider's marker walk the real road route on the customer's map, through pickup and delivery, while every dashboard's status updates live without a single manual refresh

---
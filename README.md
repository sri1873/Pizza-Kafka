# Pizza Kafka

A full-stack, event-driven food delivery platform built with **React, Spring Boot, Apache Kafka, Redis, and H2**.

Pizza Kafka simulates a food delivery workflow where **Customer, Restaurant, and Rider** applications react to the same order lifecycle in real time.

Instead of having services directly call each other to coordinate an order, the system uses **Apache Kafka as the event backbone**. Redis handles live rider geolocation and nearby-rider discovery, while **Server-Sent Events (SSE)** and **WebSockets** keep the frontend synchronized with what is happening in the backend.

The project was built primarily to explore **event-driven architecture, Kafka, real-time communication, geospatial queries, and distributed-service design** in a practical system rather than as isolated examples.

---

## What it demonstrates

* **Event-driven architecture** using Apache Kafka
* Independent backend services communicating through Kafka events
* Kafka message ordering using `orderId` as the partition key
* **Sequential rider assignment** with timeout-based offers
* **Redis GEOADD / GEORADIUS** for nearby rider discovery
* **Server-Sent Events (SSE)** for server → browser updates
* **WebSockets** for continuous rider location → server updates
* Three role-based React dashboards: **Customer, Restaurant, and Rider**
* Live rider route simulation using the **Mapbox Directions API**
* Dockerized infrastructure using **Docker Compose**
* File-based H2 persistence for local development

---

## Architecture

```text
                              ┌─────────────────────┐
                              │     Apache Kafka    │
                              │       KRaft         │
                              │     order_info      │
                              └──────────┬──────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
             ┌──────▼──────┐      ┌──────▼───────┐     ┌─────▼──────┐
             │    Order    │      │  Restaurant  │     │  Customer  │
             │   Service   │      │    Service   │     │   Service   │
             └─────────────┘      └──────────────┘     └────────────┘
                                         │
                                  Order ready
                                         │
                                  ┌──────▼──────┐
                                  │    Rider    │
                                  │   Service   │
                                  └──────┬──────┘
                                         │
                               GEOADD / GEORADIUS
                                         │
                                  ┌──────▼──────┐
                                  │    Redis    │
                                  │   Geospatial│
                                  │    Store    │
                                  └─────────────┘


              React Frontend
       ┌───────────────────────────────┐
       │                               │
 ┌─────▼─────┐  ┌──────────────┐  ┌───▼───────┐
 │ Customer  │  │  Restaurant  │  │   Rider   │
 │ Dashboard │  │  Dashboard   │  │ Dashboard │
 └─────┬─────┘  └──────┬───────┘  └─────┬─────┘
       │                │                │
       │ REST           │ REST           │ REST
       │ SSE            │ SSE            │ SSE
       │                │                │ WebSocket
       └────────────────┴────────────────┘
```

### How the architecture works

The order lifecycle is driven by Kafka events:

```text
PLACED
   ↓
ORDER_ACCEPTED
   ↓
READY_FOR_PICKUP
   ↓
RIDER_ASSIGNED
   ↓
OUT_FOR_DELIVERY
   ↓
DELIVERED
```

Each service consumes the events relevant to it, performs its own work, and publishes the resulting state back to Kafka.

The services therefore don't need to directly call each other's REST APIs to coordinate order state.

The `orderId` is used as the Kafka message key, ensuring events belonging to the same order are sent to the same partition and processed in order.

---

## Real-time communication

One of the main goals of the project was to use different communication mechanisms for different problems rather than forcing everything through a single protocol.

| Mechanism     | Direction         | Purpose                                         |
| ------------- | ----------------- | ----------------------------------------------- |
| **Kafka**     | Service ↔ Service | Durable order lifecycle events                  |
| **SSE**       | Server → Browser  | Order status and rider-assignment notifications |
| **WebSocket** | Browser → Server  | Continuous rider location updates               |
| **REST**      | Browser ↔ Server  | Commands and regular data retrieval             |
| **Redis**     | Backend ↔ Redis   | Live rider positions and geospatial queries     |

For example, when a restaurant marks an order as ready:

```text
Restaurant
    │
    │ publish READY_FOR_PICKUP
    ▼
 Kafka
    │
    ├──────────────► Rider Service
    │                    │
    │                    ├── Find nearby riders in Redis
    │                    ├── Offer to closest rider
    │                    └── Wait up to 10 seconds
    │
    └──────────────► Customer Service
                         │
                         └── Push update through SSE
```

This lets the different parts of the system react independently to the same event.

---

## Rider assignment

Rider assignment is deliberately **sequential rather than broadcasting an offer to every nearby rider**.

When an order becomes ready:

1. Rider Service queries Redis for nearby online riders.
2. Riders are ordered by distance.
3. The closest rider receives the offer.
4. They have **10 seconds** to accept.
5. If they decline or time out, the next rider is offered the order.
6. Once accepted, the order is assigned immediately.

The current implementation uses an in-memory `CompletableFuture` to wait for the rider response.

```java
Boolean accepted = future.get(10, TimeUnit.SECONDS);
```

This keeps the demo simple and avoids a double-accept race between multiple riders.

For a horizontally scaled production system, this would need to move to persistent, shared state such as a database-backed offer table with expiry handling.

---

## Live rider tracking

Rider locations are stored in Redis using its geospatial functionality.

```text
Rider location
      │
      │ WebSocket
      ▼
Rider Service
      │
      │ GEOADD
      ▼
    Redis
      │
      │ GEORADIUS
      ▼
Nearby rider discovery
```

The frontend also uses Mapbox to make the simulation visually represent the actual delivery route.

Rather than randomly moving a marker around the map, the rider follows coordinates returned by the **Mapbox Directions API**:

```text
Rider → Restaurant
       ↓
Restaurant → Customer
```

The simulation adjusts its movement speed so different route lengths still complete within a predictable demonstration time.

---

## Frontend

The frontend provides three role-based dashboards:

### Customer

* Place an order
* Follow the complete order lifecycle
* Receive status updates through SSE
* View the assigned rider
* Track the rider on a live Mapbox map

### Restaurant

* View orders by status
* Accept incoming orders
* Mark orders as ready
* Receive new orders through SSE without manually refreshing

### Rider

* Toggle online/offline availability
* Receive delivery offers
* Accept or decline offers
* See the 10-second offer countdown
* Stream simulated location through WebSocket
* Follow the restaurant → customer delivery route

For the detailed frontend architecture, implementation decisions, project structure, and setup instructions:

**[Frontend README](./frontend/README.md)**

---

## Backend

The backend is split conceptually into four independent services:

* **Order Service** — creates orders and initiates the lifecycle
* **Restaurant Service** — handles order acceptance and preparation
* **Customer Service** — handles customer-facing updates and SSE notifications
* **Rider Service** — handles rider availability, assignment, location tracking, pickup, and delivery

The backend uses:

* Java 17
* Spring Boot
* Apache Kafka
* Redis
* Spring Data JPA / Hibernate
* H2
* Spring WebSocket
* Server-Sent Events

For detailed backend architecture, Kafka behaviour, Redis geospatial operations, service implementation, and backend-specific setup:

**[Backend README](./backend/README.md)**

---

## Tech Stack

| Frontend           | Backend                     | Infrastructure |
| ------------------ | --------------------------- | -------------- |
| React              | Java 17                     | Docker         |
| Vite               | Spring Boot 3.3.2           | Docker Compose |
| Tailwind CSS       | Apache Kafka                | Kafka KRaft    |
| Axios              | Redis                       | Redis          |
| Mapbox GL JS       | Spring Data JPA / Hibernate | H2             |
| Server-Sent Events | Spring WebSocket            |                |
| WebSocket API      | Lombok                      |                |

---

## Project Structure

```text
Pizza-Kafka/
│
├── frontend/                # React application
│   └── README.md            # Frontend-specific documentation
│
├── backend/                 # Spring Boot application
│   └── README.md            # Backend-specific documentation
│
├── docker-compose.yml       # Kafka, Redis and application services
│
└── README.md                # This document
```

The root README focuses on the system as a whole. Implementation-specific documentation lives inside each project.

---

## Quick Start

### Prerequisites

* Docker
* Docker Compose
* Node.js 18+
* Java 17
* Maven

### Clone

```bash
git clone https://github.com/sri1873/Pizza-Kafka.git
cd Pizza-Kafka
```

### Run with Docker

Start the complete application:

```bash
docker compose up
```

Or run in the background:

```bash
docker compose up -d
```

The application will be available at:

```text
Frontend → http://localhost:3000
Backend  → http://localhost:8080
Kafka    → localhost:9092
Redis    → localhost:6379
```

Stop the application:

```bash
docker compose down
```

> The frontend requires a Mapbox public access token. See the [Frontend README](./frontend/README.md) for configuration details.

For running the frontend and backend independently or developing without the complete Docker stack, see their respective READMEs.

---

## Try it end-to-end

The easiest way to see the architecture in action is to run three browser sessions.

### 1. Open three dashboards

Log in as:

```text
Customer
Restaurant
Rider
```

### 2. Place an order

The customer creates an order.

```text
Customer
   ↓
PLACED
   ↓
Kafka
```

### 3. Process the order

The restaurant accepts the order and marks it ready.

```text
ORDER_ACCEPTED
      ↓
READY_FOR_PICKUP
```

### 4. Rider assignment

The Rider Service finds nearby riders through Redis and sends the offer to the closest available rider.

Accept the offer before the 10-second timeout.

### 5. Delivery

The rider's simulated position begins moving along the Mapbox route.

```text
Rider
  ↓
Restaurant
  ↓
Customer
```

At the same time, the customer and restaurant dashboards receive the corresponding state changes in real time.

The complete flow is:

```text
Customer places order
        ↓
      Kafka
        ↓
Restaurant accepts
        ↓
      Kafka
        ↓
Restaurant marks ready
        ↓
      Kafka
        ↓
Rider matching
        ↓
     Redis GEO
        ↓
Sequential rider offer
        ↓
      Rider accepts
        ↓
      Kafka
        ↓
Live location via WebSocket
        ↓
      Redis
        ↓
Customer reads live position
        ↓
      Delivered
```

---

## Known limitations / Future improvements

This is a learning project focused on demonstrating the underlying architecture, so several areas are intentionally simplified.

* **Order history** — only the latest state is currently retained. Persisting the complete event/status history would allow timelines to survive page refreshes.
* **Rider offer state** — currently stored in memory using `CompletableFuture`. A production implementation would use persistent shared state so assignment survives restarts and multiple service instances.
* **Delivery addresses** — the demo currently uses fixed coordinates rather than geocoding arbitrary addresses.
* **Database** — H2 is used for simplicity. PostgreSQL would be more appropriate for a production deployment.
* **Deployment** — the current Docker setup is intended primarily for local demonstration rather than production deployment.
* **Authentication and authorization** — the role-based login is a simplified demo rather than a production identity system.
* **Kafka resilience** — production deployments would require more extensive retry, failure-handling, observability, and dead-letter strategies.

---

## Why this project?

The project started as a way to learn **Apache Kafka**, but evolved into a small system for exploring how several backend concepts fit together:

```text
             Event-driven architecture
                       │
              ┌────────┴────────┐
              │                 │
            Kafka             Redis
              │                 │
       Service events     Geospatial state
              │                 │
              └────────┬────────┘
                       │
                Real-time APIs
                       │
             ┌─────────┴─────────┐
             │                   │
            SSE              WebSocket
             │                   │
             └─────────┬─────────┘
                       │
                 React dashboards
```

The interesting part isn't any individual technology. It is seeing how **Kafka, Redis, REST, SSE, WebSockets, and a React frontend can work together in one coherent workflow**, with each technology solving a different problem.

---

## Acknowledgement

Most of the README and the ideation process included the use of AI.

The architecture, technology choices, and learning process were explored deliberately, with the original documentation for **Kafka, Redis, and Mapbox** used to understand the technologies rather than treating AI-generated output as the source of truth.

---

## Detailed Documentation

| Area         | Documentation                               |
| ------------ | ------------------------------------------- |
| Frontend     | **[Frontend README](./frontend/README.md)** |
| Backend      | **[Backend README](./backend/README.md)**   |
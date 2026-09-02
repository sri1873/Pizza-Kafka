# Pizza Kafka

A full-stack event-driven application built with **React, Spring Boot, Apache Kafka, Redis, and H2**.

This parent repository includes the frontend and backend as Git submodules and provides a Docker Compose setup to run the entire application with a single command.

## Quick Start

### Clone

```bash
git clone --recurse-submodules https://github.com/sri1873/Pizza-Kafka.git
cd Pizza-Kafka
```

If already cloned:

```bash
git submodule update --init --recursive
```

### Run

Make sure Docker is installed, then:

```bash
docker compose up
```

The application will start:

* **Frontend:** http://localhost:3000
* **Backend:** http://localhost:8080
* **Kafka**
* **Redis**

Run in the background:

```bash
docker compose up -d
```

Stop the application:

```bash
docker compose down
```

For service-specific setup and development instructions, see the README in each submodule.

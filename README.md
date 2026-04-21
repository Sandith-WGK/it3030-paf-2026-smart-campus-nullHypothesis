# Smart Campus — IT3030 PAF 2026

Monorepo for the Smart Campus project: **Spring Boot 4** REST API (MongoDB) and **React + Vite** frontend.

---

## Repository layout

| Path | Description |
|------|-------------|
| `backend/smart-campus-api/` | Java 21, Spring Boot 4, Spring Data MongoDB, Spring Security |
| `frontend/` | React 19, Vite 8, Tailwind CSS v4, Axios |

---

## Prerequisites

Install these on your machine (versions align with CI where noted):

| Tool | Version | Notes |
|------|---------|--------|
| **Git** | recent | For cloning and branching |
| **JDK** | **21** | Eclipse Temurin or another JDK 21 distribution |
| **Maven** | bundled | Use the project **Maven Wrapper** (`mvnw` / `mvnw.cmd`) inside `backend/smart-campus-api` |
| **Node.js** | **20+** | LTS recommended (CI uses Node 20) |
| **npm** | ships with Node | Package manager for the frontend |
| **MongoDB** | — | Use **MongoDB Atlas** (cloud) **or** **Docker** for a local server |

Optional:

- **Docker** — easiest way to run MongoDB locally
- **IDE** — IntelliJ IDEA / VS Code / Cursor for Java and React

---

## MongoDB: choose one approach

The API connects to MongoDB using **`spring.mongodb.uri`** (Spring Boot 4). The default database name in shared config is **`smart_campus`**.

### Option A — MongoDB Atlas (recommended for teams)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a **database user** (username + password).
3. Under **Network Access**, add your IP (or `0.0.0.0/0` only for short-term class demos — less secure).
4. **Database → Connect → Drivers** and copy the **SRV** connection string.
5. Replace `<password>` with your user’s password (URL-encode special characters if needed).
6. Ensure the path includes your database name, e.g. `...mongodb.net/smart_campus?retryWrites=true&w=majority`.

Example shape (do not commit real credentials):

```text
mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/smart_campus?retryWrites=true&w=majority
```

### Option B — Local MongoDB with Docker

From a terminal:

```bash
docker run -d --name smart-campus-mongo -p 27017:27017 mongo:7
```

Use this URI in `application-local.properties`:

```text
mongodb://localhost:27017/smart_campus
```

Stop/remove when finished:

```bash
docker stop smart-campus-mongo
docker rm smart-campus-mongo
```

---

## Backend (Spring Boot API)

### 1. Checkout your branch

```bash
git fetch origin
git checkout <your-branch>
git pull origin <your-branch>
```

### 2. Local configuration (secrets — never commit)

1. Go to `backend/smart-campus-api/src/main/resources/`.
2. Copy **`application-local.properties.example`** to **`application-local.properties`**.
3. Edit **`application-local.properties`** and set your connection string:

```properties
spring.mongodb.uri=<paste your MongoDB URI here>
```

**Important (Spring Boot 4):** use **`spring.mongodb.uri`**, not `spring.data.mongodb.uri`.

Shared settings (committed) live in **`application.properties`**, including:

- **`spring.profiles.active=local`** — loads `application-local.properties` when present
- **`server.port=8081`** — API listens on **8081**
- **`spring.mongodb.database=smart_campus`**

These files are **gitignored** and must stay local:

- `backend/smart-campus-api/src/main/resources/application-local.properties`

### 3. Run the API

From **`backend/smart-campus-api`**:

**Windows (PowerShell or CMD):**

```bat
mvnw.cmd spring-boot:run
```

**macOS / Linux:**

```bash
chmod +x mvnw
./mvnw spring-boot:run
```

Wait for a log line similar to **Started `SmartCampusApiApplication`** and confirm the port (**8081** unless you changed it).

### 4. Backend tests

```bash
mvnw.cmd -f backend/smart-campus-api/pom.xml test
```

If tests load the `local` profile, they expect a reachable MongoDB URI in `application-local.properties` (same as running the app). CI runs these tests on push/PR to `main`.

---

## Frontend (React + Vite)

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Environment variables

1. Copy **`.env.example`** to **`.env`** in the `frontend/` folder.
2. Vite only exposes variables prefixed with **`VITE_`**.

Default in **`.env.example`** (must match backend port and API prefix):

```env
VITE_API_BASE_URL=http://localhost:8081/api/v1
```

If you change the backend port in `application.properties`, update **`VITE_API_BASE_URL`** accordingly.

**After any change to `.env`**, restart the dev server (`Ctrl+C`, then `npm run dev` again).

Git ignores:

- `frontend/.env`
- `frontend/.env.local`

### 3. Run the dev server

```bash
cd frontend
npm run dev
```

By default Vite serves at **http://localhost:5173**.

### 4. API client

`frontend/src/services/api/axios.js` creates an Axios instance with:

- **`baseURL`:** `import.meta.env.VITE_API_BASE_URL`
- **`withCredentials: true`** — sends cookies when you use cookie-based auth

### 5. CORS

`CorsConfig` allows browser requests from **`http://localhost:5173`** to paths under **`/api/**`**. Use that exact origin in the browser (not `127.0.0.1:5173`) unless the team updates CORS to match.

### 6. Production build (optional)

```bash
cd frontend
npm run build
npm run preview
```

---

## Run full stack (typical day)

1. Start **MongoDB** (Atlas always on, or Docker container running).
2. Start **backend**: `mvnw.cmd spring-boot:run` from `backend/smart-campus-api`.
3. Start **frontend**: `npm run dev` from `frontend`.
4. Open **http://localhost:5173**.

---

## Role model and migration

Current single-role model:

- `UNDERGRADUATE_STUDENT`
- `INSTRUCTOR`
- `LECTURER`
- `MANAGER`
- `TECHNICIAN`

Legacy role mapping:

- `USER -> UNDERGRADUATE_STUDENT`
- `ADMIN -> MANAGER`
- `TECHNICIAN -> TECHNICIAN`

Run one-time MongoDB migration before first deployment of this role model:

```javascript
// from project root, inside mongosh
load("backend/smart-campus-api/scripts/role-migration.js")
```

After migration, users with manager-only features (admin dashboard, approvals) must have role `MANAGER`.

---

## Troubleshooting

| Symptom | Things to check |
|--------|-------------------|
| **Connection refused** to MongoDB | URI wrong; Atlas IP not allowlisted; local Docker not running; typo in `spring.mongodb.uri` |
| **Still connecting to localhost:27017** | Missing or misnamed `application-local.properties`; wrong property key (must be `spring.mongodb.uri` on Spring Boot 4) |
| Frontend **network / CORS errors** | Backend running? `.env` base URL correct? Using **http://localhost:5173** (not 127.0.0.1) vs current CORS config |
| **`VITE_API_BASE_URL` is undefined** | File must be named `.env` in `frontend/`; variable must start with `VITE_`; restart dev server |
| **Port already in use** | Change `server.port` in `application.properties` or stop the other process; update `VITE_API_BASE_URL` to match |

---

## Git hygiene (whole team)

**Commit (safe):**

- `application-local.properties.example`
- `frontend/.env.example`
- Source code and shared config

**Do not commit:**

- `application-local.properties` (Mongo credentials)
- `frontend/.env` / `frontend/.env.local`

---

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) on **`main`**:

- Runs **`mvn -B test`** for `backend/smart-campus-api`
- Builds the **frontend** when `frontend/package.json` exists (`npm install && npm run build`)

---

## Further reading

- Vite + React template notes: [`frontend/README.md`](frontend/README.md)

---

## Team / module info

**Course / project:** IT3030 PAF 2026 — Smart Campus (`nullHypothesis` org/repo name as on GitHub).

For branch workflow, follow your module’s Git strategy (feature branches, PRs to `main`, etc.).

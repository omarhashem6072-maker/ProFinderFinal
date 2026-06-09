# ProFinderFinal

Capstone project: **Profinder** — professor office hours with a public UI, admin PDF upload, TA signup, and MySQL storage.


## Architecture (two ways to run)

| Mode | Compose file | What runs |
|------|----------------|-----------|
| **Microservices** (recommended for capstone demo) | `ProFinderDocker.yml` | **Gateway** (UI + session + `/api/auth/*`) → **Auth** service → **API** service; MySQL with split schemas (`profinder_auth`, `profinder_core`, `profinder_oh`) |
| **Monolith** | `docker-compose.yml` | Single Node app + one `profinder` database |

---

## Microservices — how to run

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Start

From the **project root** (this folder):

```powershell
docker compose -f ProFinderDocker.yml up --build
```

### App URL

- **Site (gateway):** [http://localhost:3000](http://localhost:3000)  
- Auth and API are **not** exposed on the host; the browser only talks to port **3000**.

### Stop

- `Ctrl+C` in the terminal, or in another terminal:

```powershell
docker compose -f ProFinderDocker.yml down
```

### Wipe database volumes (fresh MySQL + re-run init SQL)

Use this if schemas or seed data changed, or you want an empty `office_hours` table:

```powershell
docker compose -f ProFinderDocker.yml down -v
docker compose -f ProFinderDocker.yml up --build
```

### What the stack includes

- **db** — MySQL 8; host port **3307** → container `3306`
- **auth** — `server/services/authServer.js` (`profinder_auth`)
- **api** — `server/server.js` with `PROFINDER_SERVICE=api` (split DB: `profinder_core` + `profinder_oh`)
- **gateway** — `server/services/gatewayServer.js` (static site + proxies `/api/*` except auth routes)

First boot applies SQL under `docker/mysql-init-micro/` (schemas, demo super-admin, empty `office_hours` — add data via **Admin** PDF upload or manual entry).

### MySQL (Workbench / CLI) — microservices

- **Host:** `127.0.0.1`  
- **Port:** `3307`  
- **User:** `root`  
- **Password:** `rootpassword`  
- **Schemas:** `profinder_auth`, `profinder_core`, `profinder_oh`

---

## Monolith — how to run (optional)

```powershell
docker compose up --build
```

- **App:** [http://localhost:3000](http://localhost:3000)  
- **MySQL host port:** `3307`  
- **Database:** `profinder`  

On first app start, `server/scripts/initDb.js` creates the DB, runs `server/schema.sql`, and runs `server/seed.sql` only if `office_hours` is empty (seed file has no default rows; table stays empty until you add data).

```powershell
docker compose down
docker compose down -v
```

---

## Admin & TA

- **Admin UI:** open [http://localhost:3000/admin-login.html](http://localhost:3000/admin-login.html) (or use **Admin** in the nav).
- **Microservices demo super-admin** (from Docker init): username **`admin`**, password **`admin`** — can clear all office hours. Change in production.
- **TA signup:** [http://localhost:3000/ta-signup.html](http://localhost:3000/ta-signup.html) — invite code defaults to **`123456`** (override with `DEMO_TA_SIGNUP_CODE` in Compose).

---

## Dev without Docker

```powershell
cd server
npm install
copy .env.example .env
# Edit .env for your MySQL
node server.js
```

For **split DB** locally, set `PROFINDER_USE_SPLIT_DB=1` and the `PROFINDER_*_SCHEMA` variables (see `server/db.js` / `server/lib/splitSql.js`). For microservices-style auth, run `authServer.js` and `gatewayServer.js` separately or use Docker.

---

## Push to GitHub (replace remote with this tree)

From the project root, with your branch checked out (e.g. `main`):

```powershell
git status
git add -A
git commit -m "Describe your update (e.g. microservices layout, README)"
git push origin main
```

That updates the remote with your latest files. Use **`git push --force`** only if you intend to rewrite history on a branch (avoid on shared `main` unless you know the impact).

---

## Common issues

- **Port busy:** MySQL is mapped to **3307** on the host to avoid clashing with local MySQL on 3306.
- **Browser can’t connect:** Ensure Compose is running; try [http://127.0.0.1:3000](http://127.0.0.1:3000).
- **Microservices auth / DB errors after an old volume:** run `docker compose -f ProFinderDocker.yml down -v` then `up --build` again.

---

## More docs

- `ARCHITECTURE.md`, `HOW_TO_RUN.md` — extra notes in this repo (and under `ProFinder/` if duplicated).

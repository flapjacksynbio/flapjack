# Local Docker

This guide runs Flapjack locally with Docker Compose from the repository root. It starts:

1. Postgres database
2. Redis
3. Django API
4. React frontend

The API waits for Postgres and Redis, runs Django migrations, then starts Gunicorn.

## Prerequisites

Use these apps:

1. Docker Desktop: must be installed and running.
2. Terminal: used for all commands below.
3. Web browser: used after the containers start.

Check Docker from Terminal:

```sh
docker --version
docker compose version
```

If either command fails, open Docker Desktop first and wait until it says Docker is running.

## 1. Open the project folder

App to use: Terminal.

The expected project path is:

```txt
/Users/carolusvitalis/Downloads/Flapjack
```

Change into that folder:

```sh
cd /Users/carolusvitalis/Downloads/Flapjack
```

Confirm you are in the right folder:

```sh
pwd
ls
```

You should see files and folders like:

```txt
docker-compose.yml
LOCAL_DOCKER.md
flapjack_api
flapjack_frontend
```

## 2. Start Flapjack

App to use: Terminal.

Run this from `/Users/carolusvitalis/Downloads/Flapjack`:

```sh
docker compose up --build
```

The first run can take several minutes because Docker has to build the API and frontend images and download base images.

During startup, the API container runs:

```sh
python manage.py migrate
```

Those migrations are required for a fresh database because they create the Django and Flapjack database tables. In this local Docker workflow they run automatically before the API starts.

## 3. Open the app

App to use: Web browser.

Open:

```txt
http://localhost:3000
```

The local services are:

```txt
Frontend:  http://localhost:3000
API:       http://localhost:8000/api/
WebSocket: ws://localhost:8000/ws/
Postgres:  localhost:5433
```

The frontend environment is set by `docker-compose.yml`:

```txt
REACT_APP_HTTP_API=http://localhost:8000/api/
REACT_APP_WS_API=ws://localhost:8000/ws/
```

You do not need to create a frontend `.env` file when using the root Docker Compose workflow.

## 4. Watch logs

App to use: Terminal.

If `docker compose up --build` is still running, logs are already visible in that Terminal window.

In a second Terminal window, you can also run:

```sh
cd /Users/carolusvitalis/Downloads/Flapjack
docker compose ps
```

To follow logs for one service:

```sh
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f db
docker compose logs -f redis
```

Useful signs of success:

1. The `db` and `redis` services show as healthy.
2. The `api` service finishes migrations without errors.
3. The `frontend` service reports that the app is available on port `3000`.

## 5. Stop Flapjack

App to use: Terminal.

If the `docker compose up --build` command is still running, press:

```txt
Control+C
```

Then stop containers cleanly:

```sh
cd /Users/carolusvitalis/Downloads/Flapjack
docker compose down
```

This stops the containers but keeps the database volume, Redis volume, and frontend `node_modules` volume.

## 6. Start again later

App to use: Terminal.

```sh
cd /Users/carolusvitalis/Downloads/Flapjack
docker compose up
```

Use `--build` again when Dockerfiles, package files, requirements, or Compose settings change:

```sh
docker compose up --build
```

## 7. Back up and restore the database

App to use: Terminal.

Take a backup before any change that alters the database schema or merges
existing rows. Migrations that add tables are safe to run without one; the ones
that rewrite or de-duplicate existing data are not.

```sh
cd /Users/carolusvitalis/Downloads/Flapjack
./scripts/backup_db.sh
```

This writes a timestamped, gzipped SQL dump to `backups/` and verifies it: the
gzip stream must be intact and the dump must end with Postgres's completion
marker, so a truncated dump is caught immediately rather than at restore time.

To restore, stop the API first so it is not holding open connections:

```sh
docker compose stop api
./scripts/restore_db.sh backups/flapjack-registry-<timestamp>.sql.gz
docker compose start api
```

The restore script prompts for confirmation before overwriting, because it
replaces the target database.

To check that a backup is actually restorable without touching the live
database, restore it into a scratch database instead:

```sh
./scripts/restore_db.sh backups/flapjack-registry-<timestamp>.sql.gz registry_scratch
```

Then compare row counts, and drop it when done:

```sh
docker compose exec db dropdb -U guillermo registry_scratch
```

The `backups/` directory holds real data. Keep it out of version control.

## 8. Reset local Docker data

App to use: Terminal.

Only do this if you want to delete the local database and start fresh:

```sh
cd /Users/carolusvitalis/Downloads/Flapjack
docker compose down -v
```

The next `docker compose up --build` will recreate volumes and rerun migrations against a new empty database.

## Apple Silicon notes

On Apple Silicon Macs, including M1 and M2 machines, the API service is configured to run as:

```yaml
platform: linux/amd64
```

This improves local compatibility with the older Python scientific dependency stack. It is a local compatibility measure, not the long-term server deployment target.

The long-term server goal is to modernize the backend runtime and dependencies so the API can build cleanly without this compatibility setting.

The frontend Dockerfile installs from `package.json` without using the stale `package-lock.json` so the local build uses Dart Sass (`sass`) instead of the old native `node-sass` lockfile entry. Regenerate `flapjack_frontend/package-lock.json` with npm before adopting a reproducible `npm ci` build.

## Server deployment note

This file is for local development. For a later server deployment, migrations should be run as an explicit release step instead of having every API container run migrations automatically on boot.

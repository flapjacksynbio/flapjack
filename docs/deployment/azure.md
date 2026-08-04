# Deploying Flapjack 2 on Azure

Step-by-step for a single Azure VM, building the images on the host. No container
registry or registry credentials are needed.

For local development use `LOCAL_DOCKER.md` in the repository root. For general
production notes and the update runbook use `DEPLOYMENT.md`. This file is the
Azure-specific path.

---

## Before you start

Two things must be done on the server and cannot be skipped.

Generate new secrets. The `SECRET_KEY` and `SQL_PASSWORD` currently in
`flapjack_api/.env.prod` are in the git history. Anything committed to a repository
should be treated as public. Generate fresh values on the server (step 4) and never
reuse the committed ones.

Do not expose port 8000 or 5433. The production compose file publishes only nginx on
port 80. The API and database are reachable only from inside the Docker network. Keep it
that way in the Azure network security group.

---

## 1. Provision the VM

- Ubuntu 22.04 LTS or 24.04 LTS, x86-64.
- Size: 4 vCPU and 16 GB RAM is comfortable. Analysis is CPU-bound and single-sample
  inference takes on the order of ten seconds, so cores matter more than RAM for
  responsiveness with several users.
- Disk: 64 GB or more. Measurement volume grows quickly; a single 96-well plate with
  three signals produces roughly 40,000 rows.
- Network security group inbound rules: allow 80 and 443 from the internet, and 22 from
  your admin range only. Do not open 8000, 3000, or 5433.

## 2. Install Docker

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in so the group change applies.

## 3. Get the code

```sh
git clone <repository-url> flapjack
cd flapjack
```

## 4. Create the environment file

```sh
cp flapjack_api/.env.prod.example flapjack_api/.env.prod
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Edit `flapjack_api/.env.prod` and set:

| Variable | Value |
|---|---|
| `DJANGO_SECRET_KEY` | the freshly generated string above |
| `DJANGO_SETTINGS_MODULE` | `flapjack_api.settings_prod` |
| `DJANGO_ALLOWED_HOSTS` | your hostname, comma separated, no scheme |
| `DJANGO_CORS_ALLOWED_ORIGINS` | origins allowed to call the API, **with** scheme |
| `SQL_USER`, `SQL_PASSWORD`, `SQL_DATABASE` | a new database user and a new strong password |
| `FLAPJACK_PUBLIC_HTTP_API` | `https://<host>/api/` (keep the trailing `/api/`) |
| `FLAPJACK_PUBLIC_WS_API` | `wss://<host>/ws/` (keep the trailing `/ws/`) |

`settings_prod.py` reads every one of these with no fallback and refuses to start if any
is missing, so a half-configured server fails immediately rather than running with
development defaults.

> Do not use a `$` anywhere in `SECRET_KEY` or `SQL_PASSWORD`. Docker Compose treats
> `$` as variable interpolation, so the value that reaches the container is silently
> truncated or blanked. The stack then starts and looks healthy while authenticating
> with the wrong password. Generate secrets from an alphabet that excludes it, for
> example `openssl rand -base64 48 | tr -d '$=+/'`.

---

## 5. Build and start

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

The first build takes a while: the API image compiles a few packages from source. Later
builds reuse the cache.

The frontend then compiles the React application inside the container after it starts,
which takes roughly two minutes. Until it finishes, nginx has nothing to proxy to and the
site returns 502. This is expected on a first start and after every restart. Watch it
with `docker compose -f docker-compose.prod.yml logs -f frontend` and wait for the
`Available on:` line before concluding anything is wrong.

## 6. Migrate and create an administrator

```sh
docker compose -f docker-compose.prod.yml exec api python manage.py migrate
docker compose -f docker-compose.prod.yml exec api python manage.py collectstatic --noinput
docker compose -f docker-compose.prod.yml exec api python manage.py createsuperuser
```

> Why this step exists in production but not locally.
>
> The local `docker-compose.yml` runs `manage.py migrate` automatically on every API
> start, so during development you never run it by hand. `docker-compose.prod.yml`
> deliberately does not.
>
> The first reason is rollback. If a release ships a bad migration and you revert to the
> previous code, a container that migrates on boot has already changed the schema. The
> older code then starts against a database it does not understand. Keeping migration
> explicit makes a schema change a decision rather than a side effect of a restart.
>
> The second is concurrency. As soon as more than one API container runs, each one races
> to migrate the same database on start.
>
> The practical consequence is that this step is easy to forget on a first deployment.
> If the application starts but every request fails with a database error, this is
> almost always the reason. Run `migrate` and try again.
>
> `createsuperuser` is interactive by nature: the first account needs a password that
> someone chooses, so it cannot be automated here.

## 7. Check it is up

```sh
curl -s http://<host>/api/info/
```

Expect JSON with `name`, `version`, `http_api`, and `ws_api`. If `http_api` and `ws_api`
do not match your public URLs, correct `FLAPJACK_PUBLIC_HTTP_API` and
`FLAPJACK_PUBLIC_WS_API` and restart the API service.

## 8. Add TLS

The bundled nginx listens on port 80 only. Terminate TLS in front of it. The simplest
route on a single VM:

```sh
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d <host>
```

Then either mount the certificate into the nginx container and add a `listen 443 ssl`
server block, or place Azure Application Gateway or Front Door in front of the VM and
let it terminate TLS.

`settings_prod.py` already trusts the `X-Forwarded-Proto` header that the bundled nginx
sets, so Django builds correct `https://` URLs behind a terminator. Set
`DJANGO_SECURE_SSL_REDIRECT=0` only if something upstream already forces HTTPS.

---

## Connecting SynBioSuite

Flapjack exposes what an external client needs to find it:

- `GET /api/info/` returns the canonical HTTP and WebSocket base URLs. A client can call
  this instead of hardcoding them.
- The REST API is under `https://<host>/api/`.
- WebSockets are under `wss://<host>/ws/`, covering `plot/plot`, `analysis/analysis`,
  `registry/upload`, and `registry/measurements`.
- Authentication is JWT. `POST /api/auth/log_in/` with username or email plus password
  returns an access and a refresh token. Send the access token as
  `Authorization: Bearer <token>`. WebSocket connections take the token as a `token`
  query parameter.

Add the SynBioSuite origin to `DJANGO_CORS_ALLOWED_ORIGINS`, with scheme, or browser
requests from it will be refused. This is the most common cause of a client appearing to
be unable to reach the API.

The API reference covering both interfaces is in `docs/api/` in this repository.

Note that Flapjack does not currently export SBOL documents. Every registry object stores
an SBOL uniform resource identifier, and those are visible in the interface, but document
export is not implemented. If SynBioSuite expects SBOL from Flapjack, that integration is
not available yet.

---

## Updating a running server

> The frontend image compiles the React bundle at **image build time**, not at container
> start, so `--build` is required rather than optional and a compile failure appears
> during the build instead of as a container that starts and never serves. Budget a few
> minutes for it, and do not `restart` after pulling new frontend code.

```sh
./scripts/backup_db.sh                     # always first
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api python manage.py migrate
docker compose -f docker-compose.prod.yml exec api python manage.py collectstatic --noinput
```

Copy the file written to `backups/` off the VM. A backup on the same disk does not
protect against losing the disk.

## Backups

`scripts/backup_db.sh` writes a verified, compressed dump to `backups/`. It is manual.
For a server, schedule it and copy the output to Azure Blob Storage:

```sh
0 3 * * * cd /home/<user>/flapjack && ./scripts/backup_db.sh && \
  az storage blob upload-batch -d flapjack-backups -s backups/
```

Test a restore before relying on it. `scripts/restore_db.sh <file> <scratch-db-name>`
restores into a scratch database so you can verify without touching the live one.

---

## Known issues to be aware of before opening this up

These are tracked and unresolved as of 2026-08-04. Four items that used to sit here
have been fixed and were removed: anonymous browsing of public studies now works,
uploads report a readable error instead of failing silently, websocket rejections
return 403 rather than 500, and the reference-data endpoints are scoped per user.

- **No password reset.** A user who forgets their password cannot recover the account.
  There is no email backend, so the only route is an administrator resetting it by hand
  through the Django shell. This is the first support request you should expect.
- **No account self-service beyond the settings page.** Password, email and username can
  be changed while signed in, and a user can leave a study shared with them. There is no
  way to delete an account or export data.
- **Mobile is unsupported.** The interface targets desktop. The Manage menu in Browse
  opens on hover, so it cannot be reached by touch at all.
- **Two analysis parameters are misleading.** In the velocity and indirect expression
  rate analyses, selecting lowess has no effect on the result, which is always
  Savitzky-Golay, and `pre_smoothing` is the derivative window rather than a separate
  pre-smoothing pass. Neither crashes any more. See `docs/analysis-smoothing-report.md`
  before quoting these parameters in a methods section.
- **Dependencies are not pinned.** Backend packages and the frontend lockfile are
  unpinned, so an image rebuilt months from now may resolve different versions. Rebuild
  from a known-good state rather than assuming a fresh build reproduces this one.

---

## If the application comes back up with no data and nobody can sign in

Seen in practice on the original Flapjack. The instinct is to blame missing
migrations. It is almost never migrations, and the difference is diagnosable in
one step.

An unmigrated database fails **loudly**: Django raises
`ProgrammingError: relation ... does not exist` and requests return 500. An
application that starts cleanly, shows an empty Browse and rejects every sign-in
is not unmigrated. It is pointed at an **empty database**.

Check whether the data is orphaned rather than gone:

```sh
docker volume ls | grep db
```

Docker names volumes after the compose project, which defaults to the directory
name. Bringing the stack up from `flapjack/` and later from `flapjack-2/` creates
`flapjack_db` and `flapjack-2_db`, two separate volumes. The first still holds
every row. Inspect a candidate before assuming anything:

```sh
docker run --rm -v <volume-name>:/v postgres:12.1 \
  sh -c 'ls -la /v && cat /v/PG_VERSION'
```

The three ways this happens, in order of how often:

1. The stack was started from a directory with a different name, so a new empty
   volume was created and the old one left behind.
2. `docker compose down -v` was run. The `-v` deletes named volumes. Use
   `docker compose down` without it; `restart` and `up -d` never touch volumes.
3. The VM itself was rebuilt or replaced, taking its disk with it. Nothing on the
   VM survives that, which is the argument for a managed database below.

**Do not "fix" this by making migrations run automatically in production.** It
would not have prevented any of the three, and it makes all of them quieter:
`migrate` against a fresh empty volume builds a valid empty schema and the
application reports healthy. The loud database error is the signal that something
is pointed at the wrong storage. Keep migrations an explicit release step, for
the reasons already given above.

---

## Using Azure Database for PostgreSQL instead of a container

`docker-compose.azure-managed.yml` is `docker-compose.prod.yml` with the `db`
service removed. Postgres becomes a managed server, so the database no longer
depends on a Docker volume surviving anything, and backups and point-in-time
restore come from Azure rather than from a cron job somebody has to remember.

Worth doing if the data matters more than the hosting bill, which for
experimental results that cannot be regenerated is usually the case.

1. Create an **Azure Database for PostgreSQL Flexible Server**. Match the major
   version to the container the data came from; the stack currently pins
   `postgres:12.1`, and a dump from 12 restores into a newer server but not the
   other way round.
2. Allow the VM's IP in the server firewall. Do not open it to the internet.
3. In `flapjack_api/.env.prod` set `SQL_HOST` to the server hostname, `SQL_PORT`
   to `5432`, and `SQL_SSLMODE` to `require`. Keep `SQL_USER`, `SQL_PASSWORD` and
   `SQL_DATABASE` as the managed server's credentials, which are not the ones the
   container used.
4. Move existing data across before switching:

```sh
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$SQL_USER" "$SQL_DATABASE" > flapjack.sql
psql "host=<server>.postgres.database.azure.com port=5432 dbname=<db> \
      user=<user> sslmode=require" < flapjack.sql
```

5. Bring up the managed stack and run migrations as the same explicit step:

```sh
docker compose -f docker-compose.azure-managed.yml up -d --build
docker compose -f docker-compose.azure-managed.yml exec api python manage.py migrate
```

Verify before trusting it: sign in, open Browse, and confirm a known study is
present. Keep the old `db` volume until you have.

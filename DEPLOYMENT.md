# Server deployment

For local development use `LOCAL_DOCKER.md`. This file covers running Flapjack
on a server and updating it once it is running.

## What differs from local

| | Local | Production |
|---|---|---|
| Settings | `flapjack_api.settings` | `flapjack_api.settings_prod` |
| Secrets | hardcoded in `settings.py` | required from the environment, no fallback |
| `DEBUG` | `True` | `False` |
| `ALLOWED_HOSTS` | `["*"]` | explicit list |
| CORS | all origins | explicit list |
| Migrations | run automatically on every API start | explicit release step |
| Exposed ports | api 8000, frontend 3000, db 5433 | nginx 80 only |

`settings_prod.py` reads every secret with no default and raises
`ImproperlyConfigured` at startup if one is missing, so a half-configured
server fails immediately instead of running with development defaults.

## First deployment

1. Install Docker and Docker Compose on the server, and clone the project.

2. Create the environment file from the template:

   ```sh
   cp flapjack_api/.env.prod.example flapjack_api/.env.prod
   ```

3. Generate a new secret key. Do not reuse any key that has ever been in
   version control:

   ```sh
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

4. Fill in `flapjack_api/.env.prod`: the secret key, `DJANGO_ALLOWED_HOSTS`,
   `DJANGO_CORS_ALLOWED_ORIGINS`, the database credentials, and the public
   `FLAPJACK_PUBLIC_HTTP_API` / `FLAPJACK_PUBLIC_WS_API` URLs.

5. Build and start:

   ```sh
   docker compose -f docker-compose.prod.yml up -d --build
   ```

6. Run migrations as an explicit step, then collect static files:

   ```sh
   docker compose -f docker-compose.prod.yml exec api python manage.py migrate
   docker compose -f docker-compose.prod.yml exec api python manage.py collectstatic --noinput
   ```

7. Create an admin user:

   ```sh
   docker compose -f docker-compose.prod.yml exec api python manage.py createsuperuser
   ```

8. Confirm the service answers:

   ```sh
   curl -s http://<host>/api/info/
   ```

## Updating a running server

This is the routine update procedure.

1. Back up the database first. Any update that includes a migration can alter
   data.

   ```sh
   ./scripts/backup_db.sh
   ```

   Copy the resulting file in `backups/` somewhere off the server.

2. Fetch the new code.

3. Rebuild and restart:

   ```sh
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. Apply migrations and refresh static files:

   ```sh
   docker compose -f docker-compose.prod.yml exec api python manage.py migrate
   docker compose -f docker-compose.prod.yml exec api python manage.py collectstatic --noinput
   ```

5. Check health and logs:

   ```sh
   curl -s http://<host>/api/info/
   docker compose -f docker-compose.prod.yml logs --tail=50 api
   ```

### If an update goes wrong

```sh
docker compose -f docker-compose.prod.yml stop api
./scripts/restore_db.sh backups/<file>.sql.gz
# check out the previous revision, then
docker compose -f docker-compose.prod.yml up -d --build
```

Restoring the database only undoes data changes. Reverting the code is a
separate step, and the two must be kept consistent: a restored database will
not satisfy migrations from a newer revision.

## TLS

The bundled nginx listens on port 80 only. Terminate TLS in front of it, either
with a certificate mounted into the nginx container and a `listen 443 ssl`
server block, or with a separate proxy such as Caddy or a cloud load balancer.

`settings_prod.py` trusts `X-Forwarded-Proto`, which the bundled nginx sets, so
Django builds correct `https://` URLs behind a TLS terminator. Set
`DJANGO_SECURE_SSL_REDIRECT=0` only if something in front already forces HTTPS.

## Before the first real deployment

Two items are tracked and not resolved by these files:

- The secret key and database password currently committed in
  `flapjack_api/.env.prod` must be rotated and that file removed from version
  control. Anything that has been committed should be treated as public.
- Scheduled off-server backups. `scripts/backup_db.sh` is manual; production
  needs it on a timer with retention and an off-host copy.

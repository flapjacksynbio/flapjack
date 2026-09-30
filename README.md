# Flapjack

Flapjack is a data management and analysis tool for the characterization of genetic
circuits. It stores measurements together with the part composition and experimental
context that produced them, and provides querying, plotting, and analysis through a web
interface and a REST API.

---

## History of Flapjack

Flapjack was published in 2021 by the Rudge Lab at Newcastle University together with
collaborators:

> Yáñez Feliú, G.; Earle Gómez, B.; Codoceo Berrocal, V.; Muñoz Silva, M.; Nuñez, I. N.;
> Matute, T. F.; Arce Medina, A.; Vidal, G.; Vitalis, C.; Dahlin, J.; Federici, F.;
> Rudge, T. J. *Flapjack: Data Management and Analysis for Genetic Circuit
> Characterization.* ACS Synthetic Biology **2021**, 10 (1), 183-191.
> <https://doi.org/10.1021/acssynbio.0c00554>

If you use Flapjack in published work, please cite that paper. 

### Consolidated from three repositories

Flapjack was developed across three separate repositories, which are now archived and
read-only:

| Repository | Role |
|---|---|
| `flapjacksynbio/flapjack_api` | Django backend and analysis engine |
| `flapjacksynbio/flapjack_frontend` | React web client |
| `flapjacksynbio/flapjack_fullstack` | a later, more advanced line of development |

Flapjack now consolidates all three into a single repository. Work that existed only on
unmerged branches was reviewed and carried across, including the asynchronous database
handling, the API reference, and multi-strain sample parsing. The archived repositories
remain publicly readable.

---

## What is new in Flapjack

### Data model

- A sample may hold any number of strains, so a defined consortium is representable.
  Upload accepts a comma-separated list of strains per well.
- Measurements from a consortium are grouped rather than duplicated. Retrieval returns
  one row per measurement regardless of how many strains a sample carries.
- Strain names are unique, with a migration that merges pre-existing duplicates and
  repoints affected samples.

### Platform

- Analysis and upload no longer block other users. Database work in the WebSocket
  consumers runs off the event loop, and `DJANGO_ALLOW_ASYNC_UNSAFE` is gone.
- Builds and runs natively on both x86-64 and ARM64. The previous `linux/amd64` pin,
  six numerical build dependencies, and a forked inference library are no longer needed.
- Production deployment configuration, a reverse proxy serving HTTP and WebSocket
  traffic, and verified backup and restore scripts.

### Interface and accounts

- The web client was rebuilt on Ant Design 6 and React 18, replacing a block of style
  overrides and two hand-written components with library primitives, and adding a
  light and dark theme that follows the operating system.
- Public studies are readable without an account. Anonymous visitors see studies marked
  public and the assays, samples and measurements beneath them, and nothing else.
- Account self-service: change your password, email address or username, and leave a
  study that was shared with you. A password change signs every other session out.
- Sharing resolves one exact username or email rather than searching a directory, so no
  endpoint lists accounts or discloses addresses.
- Password validation is enforced at registration and on change. It was previously
  configured but never invoked.
- The interface calls the entities plasmids and chassis; the API, database and Python
  client continue to call them vectors and strains.
- SBOL identifiers are shown in the Browse tables and link to the corresponding record.
- A shared link to a specific view explains that sign-in is required and returns the
  user to the requested view afterward, instead of silently landing on the home page.
- Sign-out invalidates the refresh token at the server. Sign-in accepts a username or an
  email address.
- A user-lookup endpoint that previously returned password hashes now returns only the
  fields the interface needs.

---

## Quick start

Requires Docker and Docker Compose.

```sh
git clone <repository-url> flapjack
cd flapjack
docker compose up --build
```

Open <http://localhost:3000>. The API is on <http://localhost:8000>. Migrations run
automatically for local development.

Full instructions, including reset and troubleshooting, are in
[`LOCAL_DOCKER.md`](LOCAL_DOCKER.md).

## Deployment

- [`DEPLOYMENT.md`](DEPLOYMENT.md) covers production configuration and the update
  runbook.
- [`docs/deployment/azure.md`](docs/deployment/azure.md) is a step-by-step guide for a
  single Azure virtual machine, including a section on using Azure Database for
  PostgreSQL rather than a database container.

Production settings read every secret from the environment and refuse to start if one is
missing. Never reuse the values in the tracked example file.

## API

The REST and WebSocket API reference is in [`docs/api/`](docs/api/). A running instance
also serves `GET /api/info/`, which returns the canonical HTTP and WebSocket base URLs so
a client can discover the backend rather than hardcoding it.

A Python client is available at
[pyFlapjack](https://github.com/flapjacksynbio/pyFlapjack).

## Backups

`scripts/backup_db.sh` writes a verified, compressed dump to `backups/`.
`scripts/restore_db.sh` restores one, and accepts a scratch database name so a backup can
be tested without touching the live database. Dumps contain account data and are excluded
from version control.

---

## Current limitations

- **No password reset.** A user who forgets their password cannot recover the account.
  There is no email backend, so recovery means an administrator resetting it by hand.
- **SBOL documents cannot be exported.** Every registry object stores an SBOL identifier
  and these are visible and linked in the interface, but document export is not
  implemented.
- **Desktop only.** The interface is not designed for small screens, and the Manage menu
  in Browse opens on hover, so it cannot be reached by touch.
- **Two analysis parameters are misleading.** In the velocity and indirect expression
  rate analyses, selecting lowess does not change the result, which is always
  Savitzky-Golay, and `pre_smoothing` sets the derivative window rather than applying a
  separate pre-smoothing pass. Neither crashes. See
  [`docs/analysis-smoothing-report.md`](docs/analysis-smoothing-report.md) before
  quoting these parameters in a methods section.
- **Dependencies are not pinned.** An image rebuilt much later may resolve different
  versions than this one.

## License

MIT. See [`LICENSE`](LICENSE). Copyright is retained by the original
authors; Flapjack 2 continues under the same terms.

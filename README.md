# selfhosted-plasmic-example

Next.js 14 app that renders **multiple** Plasmic projects from a self-hosted
Plasmic instance, one per **subdomain**.

Projects are stored in a JSON file on a persistent volume and registered
**via a webhook** — adding a new project = configure its publish webhook
once and publish. No redeploy, no env edits.

---

## Stack

- Next.js 14 (App Router, `output: "standalone"` for Docker)
- `@plasmicapp/loader-nextjs` pointed at the self-hosted Plasmic API
- Middleware extracts subdomain → routes to the right project loader
- `/api/projects/register` — webhook endpoint that upserts a project into the
  persistent store on each publish
- `/api/revalidate` — on-demand re-rendering when content changes
- Dockerfile (multi-stage) — Coolify builds & runs this directly

---

## URL shape

Each project gets its own subdomain. The middleware reads the `Host` header,
takes the first label as the slug, and looks it up in the project store.

```
marketing.157.90.224.29.sslip.io  → project "marketing"
blog.157.90.224.29.sslip.io       → project "blog"
docs.157.90.224.29.sslip.io       → project "docs"
```

Unknown slugs return 404.

---

## How projects get registered

Each project's Plasmic publish webhook hits `/api/projects/register` with the
slug, id, and token. The endpoint upserts the entry into
`PROJECTS_FILE` (default `/data/projects.json`) on the mounted volume and
revalidates the cache. After that, content updates are picked up automatically
on every subsequent publish.

**One-time setup per project in Plasmic Studio:**

1. Get the project's `id` (from the URL `/projects/<id>`) and `token`
   (Code button → API token).
2. In the project's **Publish → Call webhooks** dialog, add:

   ```
   URL:    https://any.157.90.224.29.sslip.io/api/projects/register
           ?secret=<REVALIDATE_SECRET>
           &slug=marketing
           &id=<projectId>
           &token=<projectToken>
   Method: POST
   ```

3. Click **Publish**. The endpoint registers the project and revalidates;
   `https://marketing.157.90.224.29.sslip.io` is now live.

Subsequent publishes re-hit the same URL → upserts (idempotent) and
revalidates → new content goes live within seconds.

---

## Environment variables

| Var | Required | Purpose |
| --- | --- | --- |
| `PLASMIC_HOST` | ✅ for self-host | Plasmic Studio URL, e.g. `http://157.90.224.29:3003`. |
| `REVALIDATE_SECRET` | ✅ | Long random string. Used by `/api/projects/register` and `/api/revalidate`. |
| `PROJECTS_FILE` | optional | Path to the projects JSON. Default `/data/projects.json`. |
| `PLASMIC_PROJECTS` | optional | JSON fallback if `PROJECTS_FILE` doesn't exist yet (used until first registration). |
| `PLASMIC_APEX_HOSTS` | optional | Comma-separated apex hosts that should 404. |
| `PLASMIC_DEV_SLUG` | optional | Slug to use when serving from `localhost` (local dev only). |
| `PLASMIC_PREVIEW` | optional | `"true"` to render unpublished drafts. |

`PLASMIC_HOST` is read at both build and runtime — tick **"Is Build Variable?"** in Coolify.

---

## Coolify setup

### 1. Create the application

- Coolify → **New Resource** → **Public Repository** → select this repo.
- **Build Pack**: `Dockerfile`.
- **Port**: `3000`.

### 2. Set environment variables

`PLASMIC_HOST` (build ✅), `REVALIDATE_SECRET`. Everything else can be left
to defaults.

### 3. Add persistent storage

- Coolify → app → **Persistent Storage** → **Add**.
- **Mount Path**: `/data`.
- Name it `plasmic-projects` (or anything).
- This is where `projects.json` lives across redeploys.

### 4. Domains

For each project, add a subdomain entry in **General → Domains**, e.g.
`http://marketing.157.90.224.29.sslip.io`. Or configure Traefik with a
wildcard route (see "Wildcard routing" below) to avoid adding entries.

### 5. Deploy

Click **Deploy**. Once green, register your first project via the webhook
URL above.

---

## Wildcard routing (optional, recommended)

To skip adding a Coolify Domains entry per project, give the app a wildcard
Traefik rule via custom labels. In Coolify → app → **Advanced → Custom Labels**:

```
traefik.http.routers.app.rule=HostRegexp(`{sub:[a-z0-9-]+}.157.90.224.29.sslip.io`)
traefik.http.routers.app.entrypoints=http
```

After this, any `<slug>.157.90.224.29.sslip.io` hits this container.
Combined with the register endpoint, adding a project really is one click
of Publish.

For HTTPS, the same rule needs a TLS resolver and a wildcard cert
(Let's Encrypt DNS-01 — sslip.io won't work for wildcards via HTTP-01).

---

## Local dev

```bash
npm install
PLASMIC_HOST=http://157.90.224.29:3003 \
PROJECTS_FILE=./data/projects.json \
PLASMIC_DEV_SLUG=marketing \
REVALIDATE_SECRET=devsecret \
npm run dev
```

The file lives at `./data/projects.json` in dev. Register a project with curl:

```bash
curl -X POST "http://localhost:3000/api/projects/register?secret=devsecret&slug=marketing&id=<id>&token=<token>"
```

Then open `http://localhost:3000` (uses `PLASMIC_DEV_SLUG` → marketing) or
`http://marketing.localtest.me:3000` to test subdomain routing.

---

## Adding a new project

1. Create the project in Plasmic Studio.
2. Copy its `id` and `token` (Code button).
3. Add a publish webhook in Studio with the URL pattern above (using your
   chosen slug).
4. Click **Publish**. Done — the project is live at
   `https://<slug>.157.90.224.29.sslip.io`.

If you're not using wildcard routing, also add `<slug>.157.90.224.29.sslip.io`
to the Coolify Domains list.

---

## Endpoints

| Path | Auth | What it does |
| --- | --- | --- |
| `POST /api/projects/register?secret&slug&id&token` | secret | Upsert a project into the store, revalidate. |
| `POST /api/revalidate?secret&path?` | secret | Revalidate a specific path or everything. |

---

## Troubleshooting

- **404 on a subdomain** → slug not in the store. Hit the register endpoint
  for that slug, or check `/data/projects.json` in the container.
- **`projects.json` not persisting** → the persistent volume isn't mounted,
  or the `nextjs` user (uid 1001) can't write to `/data`. In Coolify, the
  mount must be writable by the container user.
- **`/api/projects/register` returns 401** → `REVALIDATE_SECRET` mismatch.
- **`/api/projects/register` returns 400** → check the slug format
  (alphanumeric + hyphens, 1–63 chars) and that all three params are present.
- **Content not updating after publish** → check the webhook URL is correct
  in Studio; check container logs for the request hitting `/api/projects/register`.

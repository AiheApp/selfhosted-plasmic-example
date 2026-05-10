# selfhosted-plasmic-example

Next.js 14 app that renders **multiple** Plasmic projects from a self-hosted
Plasmic instance, one per **subdomain**, deployed via Coolify with auto-deploy
on push.

Add a new project = add a JSON entry + a DNS record. No code change.

---

## Stack

- Next.js 14 (App Router, `output: "standalone"` for Docker)
- `@plasmicapp/loader-nextjs` pointed at the self-hosted Plasmic API
- Middleware extracts subdomain → routes to the right project loader
- `/api/revalidate` endpoint for on-demand re-rendering when you publish
- Dockerfile (multi-stage) — Coolify builds & runs this directly

---

## URL shape

Each project gets its own subdomain:

```
marketing.yoursite.com  → project "marketing"
blog.yoursite.com       → project "blog"
docs.yoursite.com       → project "docs"
```

The middleware reads the `Host` header, takes the first label as the slug,
looks it up in `PLASMIC_PROJECTS`, and constructs a Plasmic loader for that
project. Unknown slugs and the apex domain return 404 by default.

---

## Local dev

```bash
cp .env.example .env
# edit .env with PLASMIC_PROJECTS, PLASMIC_HOST, etc.
npm install
npm run dev
```

Localhost has no real subdomain, so set `PLASMIC_DEV_SLUG=marketing` (or
whichever project you're working on) to map `http://localhost:3000` → that
project.

For multi-project testing locally, edit `/etc/hosts`:

```
127.0.0.1  marketing.localtest.me  blog.localtest.me  docs.localtest.me
```

Then visit `http://marketing.localtest.me:3000`.

---

## Environment variables

| Var | Required | Purpose |
| --- | --- | --- |
| `PLASMIC_PROJECTS` | ✅ | JSON object mapping subdomain slugs to `{id, token}`. See below. |
| `PLASMIC_HOST` | ✅ for self-host | e.g. `http://157.90.224.29:3003`. Omit for Plasmic cloud. |
| `PLASMIC_APEX_HOSTS` | optional | Comma-separated apex hosts that should 404 (e.g. `yoursite.com,www.yoursite.com`). |
| `PLASMIC_DEV_SLUG` | optional | Slug to use when serving from `localhost` (local dev only). |
| `REVALIDATE_SECRET` | ✅ | Long random string. Shared with the Plasmic publish webhook. |
| `PLASMIC_PREVIEW` | optional | `"true"` to render unpublished drafts. Default is published only. |

`PLASMIC_PROJECTS` example:

```json
{
  "marketing": { "id": "abc123", "token": "tok_xxx" },
  "blog":      { "id": "def456", "token": "tok_yyy" },
  "docs":      { "id": "ghi789", "token": "tok_zzz" }
}
```

Set it in Coolify as a **single-line JSON string**:

```
PLASMIC_PROJECTS={"marketing":{"id":"abc123","token":"tok_xxx"},"blog":{"id":"def456","token":"tok_yyy"}}
```

`PLASMIC_PROJECTS` and `PLASMIC_HOST` are needed at **both build and runtime**
— tick "Is Build Variable?" in Coolify.

---

## DNS + TLS (wildcard)

1. Create a wildcard `A` record `*.yoursite.com` → server IP.
2. Issue a wildcard certificate via Let's Encrypt **DNS-01** challenge
   (HTTP-01 cannot issue wildcards). In Traefik, configure a DNS provider
   (Cloudflare / Route53 / etc.) under `certificatesResolvers`.
3. In Coolify, set the app's domain to `*.yoursite.com` so Traefik routes any
   subdomain into this app's container.

---

## Coolify setup

### 1. Create the application

- Coolify → **New Resource** → **Public Repository** or **GitHub (App)** → select
  `AiheApp/selfhosted-plasmic-example`.
- **Build Pack**: `Dockerfile`.
- **Port**: `3000`.
- **Branch**: `main`.
- **Domain**: `*.yoursite.com` (wildcard).

### 2. Set environment variables

In the app's **Environment Variables** tab, add the vars from the table above.
Tick **"Is Build Variable?"** for `PLASMIC_PROJECTS` and `PLASMIC_HOST`.

### 3. Enable auto-deploy

- In the app settings → **Source** → copy the **Webhook URL**.
- In GitHub repo settings → **Webhooks** → **Add webhook** → paste the Coolify
  URL, content type `application/json`, "Just the push event".
- (If Coolify is using a GitHub App source, this is already automatic.)

### 4. First deploy

Click **Deploy**. Once green, visit `https://marketing.yoursite.com` (or any
slug you defined).

### 5. Wire up the Plasmic publish webhook (per project)

For each project, in Plasmic Studio → **Publish** dialog → add a
**"Call webhooks"** action:

- URL: `https://<any-subdomain>.yoursite.com/api/revalidate?secret=<REVALIDATE_SECRET>`
- Method: `POST`

The revalidate endpoint nukes the layout cache globally, so any subdomain
works as the target. For path-scoped invalidation, add `&path=/about`.

---

## Adding a new project

1. Create the project in Plasmic Studio → copy its `id` and `token`.
2. Update `PLASMIC_PROJECTS` env var in Coolify (add a new slug).
3. **Redeploy** so the new env value takes effect.
4. DNS: ensure your wildcard `A` record covers the new subdomain (no change
   needed if you used `*.yoursite.com`).
5. Add the publish webhook in Studio.

---

## Redeploys vs. content updates

- **Content changed in Plasmic** → Publish fires the webhook → `/api/revalidate`
  → Next.js re-fetches on next request. **No Docker rebuild.**
- **`PLASMIC_PROJECTS` changed** → bump env in Coolify and redeploy.
- **Code in this repo changed** → push to `main` → Coolify webhook → rebuild.

---

## Troubleshooting

- **All routes 404** → `PLASMIC_PROJECTS` missing or invalid JSON, or the host
  header doesn't have a 3-part subdomain (and `PLASMIC_DEV_SLUG` isn't set for
  localhost). Check container logs for "PLASMIC_PROJECTS is empty".
- **One subdomain 404s but others work** → that slug isn't in `PLASMIC_PROJECTS`,
  or the project has no page at the requested path.
- **`/api/revalidate` returns 401** → `REVALIDATE_SECRET` mismatch.
- **Self-signed cert errors fetching `PLASMIC_HOST`** → use HTTP for
  server-to-server, or install a real cert on the Plasmic instance.
- **Wildcard cert won't issue** → Let's Encrypt needs DNS-01 for wildcards;
  HTTP-01 will keep failing. Configure a DNS provider in Traefik.

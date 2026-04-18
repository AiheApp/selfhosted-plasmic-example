# selfhosted-plasmic-example

Next.js 14 app that renders a Plasmic project from a **self-hosted** Plasmic
instance, deployed via Coolify with auto-deploy on push.

Project ID and token are **environment variables**, so this repo is a reusable
template — point it at a different project by changing env vars, not code.

---

## Stack

- Next.js 14 (App Router, `output: "standalone"` for Docker)
- `@plasmicapp/loader-nextjs` pointed at the self-hosted Plasmic API
- `/api/revalidate` endpoint for on-demand re-rendering when you publish
- Dockerfile (multi-stage) — Coolify builds & runs this directly

---

## Local dev

```bash
cp .env.example .env
# edit .env with your project id / token / self-hosted host
npm install
npm run dev
```

Open http://localhost:3000.

---

## Environment variables

| Var | Required | Purpose |
| --- | --- | --- |
| `PLASMIC_PROJECT_ID` | ✅ | The project's ID (from the Studio URL). |
| `PLASMIC_PROJECT_TOKEN` | ✅ | Read-only API token. Find via Studio → "Code" button. |
| `PLASMIC_HOST` | ✅ for self-host | e.g. `http://157.90.224.29:3003`. Omit for Plasmic cloud. |
| `REVALIDATE_SECRET` | ✅ | Any long random string. Shared with the Plasmic webhook. |
| `PLASMIC_PREVIEW` | optional | `"true"` to render unpublished drafts. Default is published only. |

Needed **at build time** (baked into the static pages): `PLASMIC_PROJECT_ID`,
`PLASMIC_PROJECT_TOKEN`, `PLASMIC_HOST`. Also needed at runtime.

---

## Coolify setup

### 1. Create the application

- Coolify → **New Resource** → **Public Repository** or **GitHub (App)** → select
  `AiheApp/selfhosted-plasmic-example`.
- **Build Pack**: `Dockerfile`.
- **Port**: `3000`.
- **Branch**: `main`.

### 2. Set environment variables

In the app's **Environment Variables** tab, add all of the vars from the table
above. Tick **"Is Build Variable?"** for `PLASMIC_PROJECT_ID`,
`PLASMIC_PROJECT_TOKEN`, `PLASMIC_HOST` — they're needed during `next build`.

### 3. Enable auto-deploy

- In the app settings → **Source** → copy the **Webhook URL**.
- In GitHub repo settings → **Webhooks** → **Add webhook** → paste the Coolify
  URL, content type `application/json`, "Just the push event".
- (If Coolify is using a GitHub App source, this is already automatic.)

### 4. First deploy

Click **Deploy**. Coolify will clone, `docker build`, and start the container.
Once green, note the assigned URL (e.g. `https://my-app.coolify.yourdomain.com`).

### 5. Wire up the Plasmic "publish" webhook

So clicking Publish in Plasmic re-renders your site without a redeploy:

- In Plasmic Studio (your self-hosted instance) → open the project → **Publish**
  dialog → add a **"Call webhooks"** action.
- URL: `https://<your-coolify-url>/api/revalidate?secret=<REVALIDATE_SECRET>`
- Method: `POST`

Now every click of **Publish** triggers a revalidation, and Next.js re-fetches
the latest content from your self-hosted Plasmic on the next request.

---

## Redeploys vs. content updates

- **Content changed in Plasmic** → Publish fires the webhook → `/api/revalidate`
  → Next.js re-renders on next request. **No Docker rebuild.**
- **Code in this repo changed** → push to `main` → Coolify webhook fires →
  `docker build` → new container rolls out.

---

## Troubleshooting

- **Build fails with "Missing PLASMIC_PROJECT_ID..."** → the build-time env vars
  aren't set in Coolify. Tick "Is Build Variable?" on each.
- **Pages return 404** → your Plasmic project has no pages with the matching
  path. Check in Studio that at least one page has path `/`.
- **`/api/revalidate` returns 401** → `REVALIDATE_SECRET` mismatch between
  Coolify env and the webhook URL.
- **Self-signed cert errors fetching from `PLASMIC_HOST`** → if your self-hosted
  instance uses HTTPS with a self-signed cert, either use HTTP for server-to-server
  fetches or add a proper cert.

# Pace marketing site

**Role:** the public `pacevenues.com` site — what Pace is, what it costs, and how to get in
touch.
**Port:** 4300 · **Package:** `pace-marketing`

Part of the Pace platform; see the [root README](../README.md) for how the six surfaces
fit together.

## Role

A statically exported Next.js site covering the homepage, pricing, platform, the feature
and use-case pages, comparison, integrations, developers/API, FAQs, contact and the legal
pages — around 40 route directories. It is the only surface aimed at people who are not
yet customers, so it carries the SEO work: per-page metadata, canonicals, sitemap, robots,
JSON-LD and a generated 1200×630 Open Graph image.

Product content lives in `app/HomePage.tsx`, `lib/features.ts` and `lib/seo.ts`; styling
is in `app/globals.css` and page metadata in `app/layout.tsx`. Brand files are in
`public/branding`.

## Local development

```sh
cd marketing
npm ci
npm run dev
```

Open http://localhost:4300. `./start.sh` from the repository root starts it too.

## Configuration

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Canonical HTTPS origin, e.g. `https://pacevenues.com` |
| `SITE_NOINDEX` | `true` on staging; `false` only on the public deployment |
| `NEXT_PUBLIC_BACKEND_URL` | Public API origin used by the contact form |
| `GOOGLE_SITE_VERIFICATION` | Optional Search Console verification token |

Without `SITE_URL` the pages are noindex and the sitemap is empty, so these values are
baked in at build time and require a rebuild.

## What it talks to

The Pace API's `POST /contact` for enquiries. The backend needs `MAILTRAP_API_KEY`,
`MAIL_FROM_ADDRESS`, `MAIL_TO_ADDRESS` and `MAIL_FROM_NAME`, and the marketing origin must
be in the API's `CORS_ORIGIN`.

## Tests

No test script is defined; `npm run build` is the check that the export still compiles.

## Deploy

The live site is served from the VPS web root behind nginx, built and uploaded by the
deployment script at the repository root:

```sh
./deploy-marketing-vps.sh --dry-run   # preview the rsync
./deploy-marketing-vps.sh
```

It reads `deploy.env`, builds with production values (`SITE_URL=https://pacevenues.com`,
`SITE_NOINDEX=false`, API origin from `API_URL`) and uploads `marketing/out/` to
`/var/www/pace/marketing/` over SSH/rsync. A normal run then verifies that the public
`/contact/` HTML matches the new build and exits non-zero if it does not, which is how you
know the upload actually reached the live site. The same script is available as
`npm run deploy:vps`.

`npm run deploy` is the older FTP path for a separate Fasthosts static hosting account; it
does **not** update `pacevenues.com`. It uses `marketing/.env.deploy` and leaves the
password out of Git.

`./deploy_vsp.sh` is a deprecated typo-named forwarder to `deploy-marketing-vps.sh`.

## Production checklist

- set `SITE_URL` to the final HTTPS origin and rebuild;
- set `SITE_NOINDEX=false` only on the public deployment;
- set `NEXT_PUBLIC_BACKEND_URL` to the public API origin;
- add the marketing origin to the backend `CORS_ORIGIN` list;
- configure the backend mail settings and send a real enquiry, confirming delivery,
  Reply-To behaviour and the success state;
- verify `/robots.txt`, `/sitemap.xml`, canonical URLs and the social preview after
  deploying;
- submit `/sitemap.xml` in Search Console and monitor indexing and Core Web Vitals.

A local build cannot verify the live domain, DNS, the deployment environment, the email
provider or production CORS.

## Known limits

- Static export only: the contact form needs the API to be reachable from the visitor's
  browser, so a missing `CORS_ORIGIN` entry looks like a silent failure.
- The pricing and feature copy is edited by hand in the components listed above; there is
  no CMS.

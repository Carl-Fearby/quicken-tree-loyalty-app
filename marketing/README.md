# Pace marketing

Standalone Next.js marketing site for Pace, using the supplied brand artwork.

```sh
cd marketing
npm install
npm run dev
```

Open http://localhost:4300. Production: `npm run build`, then `npm start`.

For the live Pace site, deploy the marketing export to the VPS-backed web root rather than the legacy FTP target:

```sh
cd /Users/F7905607/Dropbox/Projects/hoe
./deploy-marketing-vps.sh
```

That script reads `deploy.env`, builds with production values (`SITE_URL=https://pacevenues.com`, `SITE_NOINDEX=false`, public API origin from `API_URL`) and uploads `marketing/out/` to `/var/www/pace/marketing/` over SSH/rsync. You can also run it from the marketing project with:

```sh
cd /Users/F7905607/Dropbox/Projects/hoe/marketing
npm run deploy:vps
```

Use `./deploy-marketing-vps.sh --dry-run` to preview the rsync changes without uploading. A normal run now also verifies that the public `/contact/` HTML matches the newly built export; if it does not, the script exits with a failure so you know the upload did not reach the live site.

If you still have old notes referencing `./deploy_vsp.sh`, that script now forwards to `./deploy-marketing-vps.sh` and prints a deprecation warning.

The older FTP-based command below is only for the separate Fasthosts static hosting account and does not update the current public `pacevenues.com` site:

```sh
cd /Users/F7905607/Dropbox/Projects/hoe/marketing
npm run deploy
```

It uses `marketing/.env.deploy`, uploads files and `.htaccess` into the FTP account's current website root, and leaves the password out of Git. Leave `FTP_REMOTE_DIR` empty when the account opens directly in the site root. Use `FTP_PROTOCOL=ftp` for ordinary FTP, `FTP_PROTOCOL=ftps` for explicit FTP over TLS, or `FTP_PROTOCOL=sftp` only if SFTP is enabled for the hosting account.

The site includes responsive navigation, interactive Bookings / Menus / Rewards sections, illustrative product previews, accessible expandable FAQs, and a backend-connected enquiry form. The form posts to `POST /contact` on the Pace API; set `NEXT_PUBLIC_BACKEND_URL` for the target API origin and configure the backend Mailtrap settings before launch.

Edit content in `app/page.tsx`, styling in `app/globals.css`, and page metadata in `app/layout.tsx`. Brand files live in `public/branding`. The site is not deployed automatically.

## Search and sharing

The homepage and three feature pages are statically rendered with unique titles/descriptions and crawlable internal links. JSON-LD describes the organisation, website and software; feature pages include breadcrumbs. `/opengraph-image` provides a 1200×630 social image.

Before the public production build, set `SITE_URL` to the real HTTPS origin and `SITE_NOINDEX=false`. Canonicals, sitemap and structured-data URLs use that origin. Without it, pages are noindex and the sitemap is empty. Set `SITE_NOINDEX=true` on staging. Rebuild after changing these variables. Optional `GOOGLE_SITE_VERIFICATION` adds Search Console verification.

After deployment, verify the domain in Google Search Console, submit `/sitemap.xml`, inspect all four URLs, and monitor indexing and Core Web Vitals. These require the live domain and owner access; local builds cannot establish rankings or real-world performance.

## Production checklist

Before launch:

- set `SITE_URL` to the final HTTPS marketing origin and rebuild;
- set `SITE_NOINDEX=false` only on the public deployment;
- set `NEXT_PUBLIC_BACKEND_URL` to the public API origin;
- add the marketing origin to the backend `CORS_ORIGIN` list;
- configure `MAILTRAP_API_KEY`, `MAIL_FROM_ADDRESS`, `MAIL_TO_ADDRESS` and `MAIL_FROM_NAME` on the backend;
- submit a real contact enquiry and confirm delivery, reply-to behaviour and the user-facing success state;
- verify `/robots.txt`, `/sitemap.xml`, canonical URLs and the social preview after deployment.

The local build cannot verify the live domain, DNS, deployment environment, email provider or production CORS configuration.

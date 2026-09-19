# Pace marketing

Standalone Next.js marketing site for Pace, using the supplied brand artwork.

```sh
cd marketing
npm install
npm run dev
```

Open http://localhost:4300. Production: `npm run build`, then `npm start`.

For Fasthosts static hosting, copy `.env.deploy.example` to `.env.deploy`, enter the FTP password locally, and run `npm run deploy`. The script builds the static export, uploads the contents and `.htaccess` directly into the FTP account's current website root, and never stores the password in Git. Leave `FTP_REMOTE_DIR` empty when the account opens directly in the site root. Use `FTP_PROTOCOL=ftp` for ordinary FTP, `FTP_PROTOCOL=ftps` for explicit FTP over TLS, or `FTP_PROTOCOL=sftp` only if SFTP is enabled for the hosting account.

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

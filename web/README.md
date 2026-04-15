# Caloric Web App

Next.js web application for Caloric, hosting legal documents and landing page.

## Pages

- **Home:** `/` - Landing page
- **Privacy Policy:** `/privacy` - GDPR/CCPA compliant privacy policy
- **Terms of Service:** `/terms` - App terms and conditions
- **Password Reset:** `/reset` - Password reset redirect bridge

## Development

```bash
npm run dev
```

Visit: http://localhost:3000

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

```bash
vercel --prod
```

Current deployment: https://caloric-sage.vercel.app

## Legal Pages

The privacy policy and terms of service are linked from the mobile app's Settings screen.

**URLs:**

- Privacy: https://caloric-sage.vercel.app/privacy
- Terms: https://caloric-sage.vercel.app/terms

**Last Updated:** April 11, 2026

### Updating Legal Documents

1. Edit `app/privacy/page.tsx` or `app/terms/page.tsx`
2. Update the "Last Updated" date
3. Deploy to Vercel: `vercel --prod`
4. Legal changes take effect immediately

### Compliance Notes

- **GDPR (EU):** Privacy policy includes data rights, deletion, portability
- **CCPA (California):** Privacy policy includes opt-out and data access rights
- **App Store:** Both documents are required for app submission
- **Google Play:** Both documents are required in Data Safety form

## Custom Domain (Optional)

To use a custom domain (e.g., caloric.app):

1. Purchase domain
2. Add domain in Vercel dashboard: Settings → Domains
3. Update DNS records as instructed
4. Update mobile app URLs in `app/settings.tsx`

## Environment Variables

No environment variables required for legal pages.

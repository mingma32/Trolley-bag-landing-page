# KN Trolley Bag — Next.js on Vercel

Next.js App Router with Tailwind CSS. Includes the landing page, images, checkout, thank-you page and What happens next section.

## Run
Node 22. Run npm ci, then npm run dev. Production: npm run build then npm start.

## Vercel
Branch main. Framework: Next.js. Root Directory: repository root. Build: npm run build. Install: npm ci. Output Directory: leave override disabled (Next.js default .next). Use the latest commit, not an older failed Vinext deployment. Redeploy without build cache if necessary.

Add GOOGLE_APPS_SCRIPT_URL (your existing /exec URL) and ORDER_WEBHOOK_SECRET (the matching Google Script Property) as server variables for Production and Preview. Redeploy afterward. Never commit their values or use NEXT_PUBLIC for these variables.

## Orders
The Node.js server reads process.env and sends validated orders to the owner-authorized Apps Script over HTTPS. Price: Rs. 3,999 each, free delivery. The script saves the row and sends both emails before returning success. The script in integrations is a reference; updating it in GitHub does not change the Google deployment.

## Verification
Production build must generate .next/routes-manifest.json. Test an order using an inbox you control after deployment to verify production secrets, Google Sheets and email delivery.

The separate chatgpt.site deployment keeps its Sites runtime. This repository now targets Vercel using standard Next.js and does not require Vinext, Wrangler, Cloudflare bindings or a custom Output Directory.

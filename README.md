# KN Trolley Bag

Responsive App Router React/Tailwind funnel, hosted through Vinext on Sites. Routes: /, /checkout, /thank-you, POST /api/order. Offer NPR 3,999; quantity 1–10; delivery free throughout Nepal. Prices are calculated on the server. Product photos and logo supplied by the owner. No reels until video links are supplied. Colours and warranty are confirmed by the team.

## Order flow
Checkout validates customer details, sends them and quantity to the same-origin API. The API validates, generates an order ID, computes totals, saves a RAW row in Sheets, sends two styled emails using Resend, then returns success. Only then is the customer redirected. Buttons lock during submission. Saved orders with email failure show the order ID and block resubmission in the current checkout; contact support to recover email failures. Google Sheets and email do not support a cross-service transaction. Network ambiguity, reloads, or simultaneous independent submissions can still duplicate orders; reconcile by customer and timestamp before fulfilment. A durable idempotency store and rate limiting are recommended before opening to high-volume public traffic.

## Google Sheets
1. Use your supplied spreadsheet ID in GOOGLE_SHEET_ID, server-side only.
2. Create a tab named `orders`.
3. Add row 1: Order ID | Date & Time | Customer Name | Phone Number | Email Address | Exact Location | Product Name | Quantity | Price Per Piece | Total Price | Payment Method | Order Status | Notes
4. Freeze row 1, bold it, add alternating row colours and Data → Create a filter.
5. Add a data-validation dropdown to L2:L: New Order, Order Confirmed, Order Ongoing, Delivered, Cancelled.
6. Enable Google Sheets API in your Google Cloud project. Create a service account and download its JSON key securely. Share the spreadsheet with that service account email as Editor.
7. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY from the JSON. Literal \\n and actual key newlines are both supported. Never commit the JSON key.

## Email
Set EMAIL_SERVICE_API_KEY to a Resend key and EMAIL_FROM to an address on a domain verified in Resend. Gmail addresses cannot be used as a verified custom sending domain. Business notifications go to khumbunuru@gmail.com and replies go there too. Verify your sender before testing customer mail. Hosted Workers use HTTP email delivery; SMTP variables are documented for future Vercel SMTP adaptation and are unused.

## Configuration and deployment
Copy .env.example for local configuration; use Sites runtime secret settings for hosted credentials and redeploy. All credential values stay server-side. NEXT_PUBLIC_SITE_URL and FRONTEND_URL are reserved for future metadata/configuration; same-origin enforcement currently uses the request origin. BRAND_NAME is fixed to KN in the current UI/templates.

This hosted project uses Vinext and a Cloudflare Worker build. To migrate to Vercel, retain app/, public/, Tailwind CSS and React, use standard next dev/build/start scripts, replace the cloudflare:workers env import in app/api/order/route.ts with process.env, and remove Sites/Vinext Vite and Worker configuration. Add server environment values in Vercel then deploy. This source is not an unchanged standard Next.js Vercel project.

## Validation
Build: node /root/.codex/plugins/cache/openai-curated-remote/sites/1.1.0/scripts/build-site.mjs
After configuring credentials, submit one order with an inbox you control. Confirm exactly one sheet row, business email, customer email, accurate totals and redirect. Test invalid fields, missing config, Sheets failure, email failure and multiple button clicks. Live integration tests cannot pass before credentials are configured. Do not treat the live website alone as proof of order delivery.

## Gmail without Resend: prepared Apps Script integration
`integrations/KN-Google-Setup.gs` contains the complete owner-authorized backend and numbered deployment instructions. This is the preferred route for khumbunuru@gmail.com on this HTTP-only host. Use MailApp (send-only authorization) and execute as the Gmail owner. No App Password is stored or used. Google authorization and Web App deployment must be completed by the account owner. Configure GOOGLE_APPS_SCRIPT_URL and ORDER_WEBHOOK_SECRET as Sites server secrets, then redeploy. When both are present, /api/order uses this path instead of Resend.

setupKN applies a navy header, teal tab, alternating white/pale-teal rows, frozen header/ID column, filters, currency/date formats, column widths, status dropdowns and status colours. It preserves existing order values and refuses mismatched headers. Notification timestamp columns track both emails. Formatting is PREPARED, not applied until setupKN runs in the owner's Google account. MailApp limits apply. Sent-email timestamps indicate API acceptance, not inbox delivery.

The Apps Script uses a script lock and a stable checkout order ID to avoid duplicate rows on retries; exact matching of details prevents reusing a reference for a different order. A crash between sending an email and recording its sent marker can still duplicate that email on retry. Saved orders with email failures remain visible with notes and require operator review. Do not create triggers to automatically email arbitrary sheet edits.

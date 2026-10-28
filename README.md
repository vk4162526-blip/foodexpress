# FoodExpress Full Project

This is a Node.js starter with customer menu/cart, server-validated order totals, SQLite order storage, and an admin dashboard.

## Important
GitHub Pages only hosts static files and cannot run this backend. Deploy this project to a Node.js hosting service with persistent storage for `data/foodexpress.sqlite` and HTTPS.

## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Set a unique `ADMIN_PASSWORD` of at least 12 characters and a random `SESSION_SECRET` of at least 24 characters.
4. In this folder run `npm install`, then `npm start`.
5. Visit `http://localhost:3000` for customers and `http://localhost:3000/admin` for the restaurant dashboard.

## Included
- Food menu search, cart and quantity controls
- Customer details and checkout
- Server-side price calculation and validation
- Orders saved in SQLite
- Admin login, order list, status updates and logout
- Basic security headers and API rate limiting

## Online payment
Online payment is not enabled in this starter. Add a verified payment-provider integration, server-side payment order creation, and signature/webhook verification before accepting real payments. Never store card or UPI PIN details or commit secret keys to GitHub. Before a public launch, use a production database/persistent disk, HTTPS, stronger authentication, backups, privacy/terms pages and test thoroughly.

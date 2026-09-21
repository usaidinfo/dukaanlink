# DukaanLink — MVP

A digital menu + WhatsApp ordering page for local shops. This is the working
MVP scope from the project brief: menu builder (seller side), public shop
page with cart (buyer side), WhatsApp order handoff, and an owner dashboard
with order tracking + daily sales summary.

## What's built

- **Auth** — email/password signup & login (see note below on phone OTP)
- **Seller dashboard** (`/dashboard`) — create shop profile, get shareable
  link + QR code
- **Menu builder** (`/dashboard/menu`) — add/edit/delete items, toggle
  in-stock/sold-out
- **Public shop page** (`/shop/[slug]`) — customers browse by category, build
  a cart, and tap "Order on WhatsApp" — opens WhatsApp with a pre-filled
  message, no login needed
- **Orders dashboard** (`/dashboard/orders`) — see incoming orders, advance
  status (received → preparing → done), today's order count + sales total +
  best-selling item

## One deliberate scope decision: email login, not phone OTP

The brief calls for phone-number OTP login for shop owners. Supabase
supports this, but it requires wiring up an SMS provider (Twilio, MSG91,
etc.) and that provider's own account/billing — extra setup that would slow
down getting this running today. This build uses email/password instead so
you can test the whole flow immediately. Swapping to phone OTP later is a
localized change (just the `/app/login/page.js` file and Supabase Auth
settings) — happy to do that once you've picked an SMS provider.

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), create a free project, and note
your Project URL and anon public key (Settings → API).

### 2. Run the database schema
Open the Supabase SQL Editor and run the contents of `supabase/schema.sql`.
This creates the three tables (`businesses`, `menu_items`, `orders`) with
row-level security policies already set up.

### 3. Configure environment variables
```bash
cp .env.local.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 4. Install and run
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 5. Try the full flow
1. Go to `/login`, create an account
2. You'll land on `/dashboard` — fill in your shop name, category, and
   WhatsApp number
3. Go to **Menu** and add a couple of items with prices
4. Copy your shop link (or open "View shop page")
5. On the shop page, add items to the cart and tap "Order on WhatsApp" —
   it'll open WhatsApp Web/app with the order pre-filled
6. Go back to **Orders** in the dashboard to see it logged, with the daily
   summary updating

## Deploying

This is a standard Next.js app — deploys straight to
[Vercel](https://vercel.com) (free tier is enough for early traction). Add
the same two environment variables in the Vercel project settings.

## Next steps (from the brief, not yet built)

- **Consent/T&Cs** — not part of DukaanLink's scope (that's the separate
  SahmatiOS project)
- **Official WhatsApp Business API** — only worth it once volume justifies
  the approval process; `wa.me` links are fine at this stage
- **Payments** — deliberately out of scope for v1 (COD / UPI-on-delivery)
- **Image uploads** — menu photos currently take a pasted URL; wiring up
  Supabase Storage for direct upload is a natural next add

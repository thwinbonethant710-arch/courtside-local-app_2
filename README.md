# Courtside — Basketball Reselling Business Dashboard

A Shopify-style admin dashboard for a Dewu/Poizon → Myanmar basketball
resale/pre-order business: a **Product Catalog** for research/pricing (GenZ,
AG Sea, AG Air, Marlar Air, and CX logistics, each fully editable, plus a
side-by-side logistics comparison per product), a separate **Orders** page
with a 14-stage status tracker, supplier and packaging selection per order,
and an **Analytics**/**Settings** page tying it all together. Nothing is
hardcoded — exchange rates, per-carrier rates, payment fee %, marketing %,
target margin %, packaging options, and suppliers all live in Settings.

Marketing cost is calculated as a percentage of *final profit* (after
marketing is itself deducted) — the circular formula is solved mathematically.
Suggested selling price and break-even price are derived the same way,
accounting for payment fees.

## Cloud sync (Supabase)

By default, data is only saved in the browser you're using (local storage) —
it won't show up on your phone or another computer. To make products/orders
sync everywhere, connect a free [Supabase](https://supabase.com) project:

1. **Create a project.** Sign up at supabase.com (free tier is plenty for
   this), create a new project, and wait ~1 minute for it to finish setting up.
2. **Run the schema.** In your Supabase project, go to **SQL Editor → New
   query**, paste the entire contents of `supabase-schema.sql` (included in
   this folder), and click **Run**. This creates the `products`, `orders`,
   and `settings` tables and turns on live sync.
3. **Get your keys.** Go to **Project Settings → API**. You need the
   **Project URL** and the **anon public** key (not the `service_role` key —
   never put that one in frontend code).
4. **Add them to Vercel.** In your Vercel project, go to **Settings →
   Environment Variables** and add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key

   Then redeploy (Vercel → Deployments → ⋯ → Redeploy).
5. **For local dev**, copy `.env.example` to `.env.local` and fill in the
   same two values, then `npm run dev`.

Once connected, the sidebar shows a small **Synced** indicator. The first
time it connects, if your Supabase tables are empty, whatever's already in
that browser's local storage is uploaded automatically — nothing already
entered is lost. From then on, every add/edit/delete syncs to the cloud and
pushes live to every other open tab or device within a second or two, no
refresh needed.

**Security note:** the setup above has no login — anyone who has your Vercel
URL and reads the (public, unavoidably-visible-in-the-browser) anon key from
your site's network requests could read and write your data. That's normal
for a small private tool only you use, but don't share the link publicly. If
you want this locked behind a password/login later, that's a straightforward
follow-up using Supabase Auth — just ask.

If Supabase isn't configured (or the connection fails), the app automatically
falls back to browser-only storage so it still works — you'll see a banner
explaining that changes aren't syncing.

## Run it locally

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd courtside
npm install
npm run dev
```

Then open the URL it prints — usually **http://localhost:5173** (use
`http://127.0.0.1:5173` instead if `localhost` doesn't load).

To use it from your phone on the same Wi-Fi, run `npm run dev -- --host`
instead, and open the "Network" URL it prints on your phone's browser.

## Build a static version (optional)

```bash
npm run build
npm run preview
```

`npm run build` outputs a `dist/` folder — this is what Vercel builds and
deploys automatically from your repo.

## Notes

- Product images need a URL you paste in — there's no image upload/hosting.
- All rates, packaging options, and suppliers live in Settings — edit them
  any time, no code changes needed.
- If you're upgrading from an older version of this app, your existing data
  (local, or already-connected Supabase) is migrated automatically — nothing
  is deleted.

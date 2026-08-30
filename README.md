# Hoop Corner — Basketball Store Dashboard

A Shopify-style admin dashboard for Hoop Corner's Dewu/Poizon → Myanmar
basketball resale/pre-order business: a **Product Catalog** for
research/pricing (Cat China Land/Air, Golden City, DeQuick Normal/Premium,
AG Sea/Flight, GenZ, Marlar, and CX — each with its own exact weight-charging
rule, fully editable, plus a side-by-side logistics comparison per product), a
separate **Orders** page with a 14-stage status tracker, supplier and
packaging selection per order, a **Socials** page for your platform links,
and an **Analytics**/**Settings** page tying it all together. Nothing is
hardcoded — exchange rates, per-carrier rates and rounding rules, payment fee
%, marketing %, target margin %, packaging options, and suppliers all live in
Settings, and you can add new logistics providers from there too.

Marketing cost is calculated as a percentage of *final profit* (after
marketing is itself deducted) — the circular formula is solved mathematically.
Suggested selling price and break-even price are derived the same way,
accounting for payment fees.

## Organizing a big catalog

- **Status**: Researching, Active, Paused, Archived, Posted, Planning to Post.
- **Group name** + **color tag**: your own freeform grouping (e.g. a drop or
  batch), shown as a colored stripe on each card and sortable — pick "Sort:
  Group name" on the Products page to cluster everything into labeled
  sections instead of one long list.
- **Posted to**: toggle Instagram/TikTok/Facebook/Messenger/FB Manager
  directly from a product's card in the catalog (no need to open it), or from
  the product page. Filter the catalog by platform, or by "not posted
  anywhere" to see what's still queued.

## Socials

The Socials page holds your five platform links — paste each URL once and
the icon button opens it directly. The logo in the sidebar links straight to
this page.

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
cd hoop-corner
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

- Product images still need a URL you paste in — there's no image upload,
  but the logo/banner images are already bundled in `public/`.
- All logistics providers, rates, packaging options, and suppliers live in
  Settings — edit them any time, no code changes needed.
- If you're upgrading from an older version of this app, your existing data
  (local, or already-connected Supabase) is migrated automatically — nothing
  is deleted, including old logistics numbers, which get mapped onto the new
  per-provider rules.

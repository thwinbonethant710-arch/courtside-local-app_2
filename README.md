# Courtside — Basketball Reselling Business Dashboard

A local Shopify-style admin dashboard for a Dewu/Poizon → Myanmar basketball
resale/pre-order business: a **Product Catalog** for research/pricing (GenZ,
AG Sea, AG Air, Marlar Air, and CX logistics, each fully editable, plus a
side-by-side logistics comparison per product), a separate **Orders** page
with a 14-stage status tracker for actual customer sales, and an
**Analytics**/**Settings** page tying it all together. Nothing is hardcoded —
exchange rates, per-carrier rates, payment fee %, marketing %, and target
margin % all live in Settings.

Marketing cost is calculated correctly as a percentage of *final profit*
(after marketing is itself deducted) — the circular formula is solved
mathematically rather than approximated. Suggested selling price and
break-even price are derived the same way, accounting for payment fees.

Data is saved in your browser's local storage, so it survives refreshes and
restarts, but it's tied to this browser on this machine (it won't sync across
devices, and clearing browser data will clear it too). If you're upgrading
from the earlier single-page calculator version, your old products are
migrated automatically into the new catalog the first time you open it —
nothing is deleted.

## Run it locally

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd courtside
npm install
npm run dev
```

Then open the URL it prints — usually **http://localhost:5173**.

To use it from your phone on the same Wi-Fi, run `npm run dev -- --host`
instead, and open the "Network" URL it prints on your phone's browser.

## Build a static version (optional)

```bash
npm run build
npm run preview
```

`npm run build` outputs a `dist/` folder you can host anywhere (Netlify,
Vercel, a spare server, etc.) if you ever want it reachable outside your
own machine.

## Notes

- Product images need a URL you paste in — there's no image upload/hosting.
- The four starter products are pulled from your original spreadsheet so you
  can sanity-check the new math against numbers you already know.
- All rates (exchange rates, GenZ/Air/Sea/Hand-Carry per-kg pricing, default
  marketing %, minimum profit floor) live in Settings — edit them any time.

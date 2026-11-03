# Recovering missing images

The wardrobe database and user-uploaded images depend on the Supabase project
configured by `NEXT_PUBLIC_SUPABASE_URL`. If the project is paused, both images
and `/api/items` can fail even while Vercel continues to serve the pages.

1. Open the project's Supabase dashboard and check its status. Resume or restore
   the existing project when that option is available. Do not replace the
   project or reseed the wardrobe just to fix a paused service.
2. Wait for the database and Storage service to finish starting. A resolving
   hostname alone is not enough: Storage may still return `544 DatabaseTimeout`
   while restoration is in progress.
3. Verify `/api/items?userId=demo-user` returns HTTP 200 and the original items.
   Open several returned `imageUrl` values and confirm they return images.
4. Check the home and wardrobe pages on desktop and mobile, then generate an
   outfit to verify both garment thumbnails and full-body look images.

The 2026-11-03 incident was resolved by restoring the original Supabase project.
All 20 demo garment images and all 15 curated look images returned HTTP 200
after restoration. No wardrobe records needed replacement.

The Dressy portrait is now bundled in `public/images/dressy.png`, using the
original recovered portrait. Image components show their existing placeholders
on load failure; a failed full-body look falls back to its garment collage.
Wardrobe service failures show a retry action instead of an empty closet.

These fallbacks preserve the interface during outages; they do not replace
database or Storage backups. Keep backups of user records and uploaded files,
and check Supabase's current project inactivity policy for the chosen plan.

# Placeholder photos — REPLACE BEFORE LAUNCH

Abby's own photos are in place everywhere except the places below. Everything else is listed in `src/data/photos.ts`.

To add a photo: edit `src/data/photos.ts`, then run `node scripts/photos.mjs ~/Desktop/abby-eyelash` (macOS is needed for HEIC, via `sips`).

## About collage (stock photos)

These are free-licence stock photos from Unsplash (Unsplash License: free to use, no attribution required).
They are not Abby's work, and they must be replaced with Abby's own photos before launch.
They live in `src/assets/` (not `public/`) so that Astro can generate AVIF/WebP at responsive sizes.
To replace one, overwrite the file with the same name, or change the import in `src/components/home/About.astro`.

| File | Used in | Source |
|---|---|---|
| `src/assets/home/placeholder-about-1.jpg` | About collage, large | https://unsplash.com/photos/beautician-applying-eyelash-extensions-to-a-client-ToLhVLEbiRg |
| `src/assets/home/placeholder-about-2.jpg` | About collage, small | https://unsplash.com/photos/tweezers-resting-on-a-tray-of-false-eyelashes-irXGNGSuWW4 |
| `src/assets/home/placeholder-about-3.jpg` | About collage, small | https://unsplash.com/photos/a-woman-getting-her-nails-done-at-a-nail-salon-gb6gtiTZKB8 |

When you replace one, also update its EN and ZH alt text: `about.photo1`–`photo3` in `src/i18n/common.ts`.

## Powder brows service page

The powder brows page has no photo yet. `src/components/service/ServiceImage.astro` draws a token-coloured block in the hero and detail slots.
To fill them, add photos to `src/data/photos.ts` and set the page's hero and detail photo ids.

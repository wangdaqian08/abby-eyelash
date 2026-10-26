# Placeholder photos — REPLACE BEFORE LAUNCH

These are free-licence stock photos from Unsplash (Unsplash License: free to use, no attribution required).
They are preview stand-ins only. They are not Abby's work, and they must be replaced with Abby's own photos before launch.
They live in `src/assets/` (not `public/`) so that Astro can generate AVIF/WebP at responsive sizes.
To replace one, overwrite the file with the same name, or change the import in the component listed below.

| File | Used in | Source |
|---|---|---|
| `src/assets/home/placeholder-hero.jpg` | Home hero (`src/components/home/Hero.astro`) | https://unsplash.com/photos/eyelash-extensions-application-in-salon-sRSRuxkOuzI |
| `src/assets/home/placeholder-about-1.jpg` | About collage, large | https://unsplash.com/photos/beautician-applying-eyelash-extensions-to-a-client-ToLhVLEbiRg |
| `src/assets/home/placeholder-about-2.jpg` | About collage, small | https://unsplash.com/photos/tweezers-resting-on-a-tray-of-false-eyelashes-irXGNGSuWW4 |
| `src/assets/home/placeholder-about-3.jpg` | About collage, small | https://unsplash.com/photos/a-woman-getting-her-nails-done-at-a-nail-salon-gb6gtiTZKB8 |
| `src/assets/gallery/placeholder-1.jpg` | Gallery | https://unsplash.com/photos/a-close-up-of-a-persons-eye-with-long-lashes-GEct9d7zgos |
| `src/assets/gallery/placeholder-2.jpg` | Gallery | https://unsplash.com/photos/hand-with-black-and-tortoiseshell-nails-tXwBDZS2JxQ |
| `src/assets/gallery/placeholder-3.jpg` | Gallery | https://unsplash.com/photos/a-close-up-of-a-persons-eye-with-long-eyelashes-hxp1rPHSUzI |
| `src/assets/gallery/placeholder-4.jpg` | Gallery | https://unsplash.com/photos/hand-with-light-pink-manicured-nails-vtQHwU4F13s |
| `src/assets/gallery/placeholder-5.jpg` | Gallery | https://unsplash.com/photos/womans-hands-with-ornate-navy-gold-and-white-nails-v9agFscJCIE |
| `src/assets/gallery/placeholder-6.jpg` | Gallery | https://unsplash.com/photos/hand-with-mauve-and-glitter-nails-Y14F-1vzVds |

When you replace a photo, also update its EN and ZH alt text so it describes the new photo:
- Gallery: `photos` in `src/components/home/Gallery.astro`
- Hero and About: `hero.imageAlt` and `about.photo1`–`photo3` in `src/i18n/common.ts`

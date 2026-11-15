// A service page's link preview (og:image: Facebook, WeChat, iMessage), 1200 × 630.
// `og` is the photo Abby cropped to that shape in the admin (fixed place 預覽圖) and is used as it is. Without one the hero is
// cut automatically. Most heroes are portrait, so that cut keeps under half of the photo: sharp's 'entropy' picks the busiest
// band (the nails, the eye), where a fixed centre or top cut showed bare wall or a forehead. It can still cut badly (a
// before-and-after pair stacked top and bottom): that is what the admin place is for.
import { getImage } from 'astro:assets';
import { OUT } from './photo-admin';
import { photoSrc } from './photo-src';

const [W, H] = OUT['1.91:1'];
/** `width` below 1200 gives a WebP thumbnail of the same cut (the admin's list). undefined: the page has no photo. */
export function ogImage(s: { hero?: string; og?: string }, width = W) {
  const id = s.og ?? s.hero;
  if (!id) return undefined;
  return getImage({ src: photoSrc(id), width, height: Math.round((width * H) / W), fit: 'cover', position: 'entropy', format: width === W ? 'jpg' : 'webp', quality: 82 });
}

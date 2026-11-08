import { findOption, priceText, type Lang } from './services.ts';
import { localePath } from '../lib/i18n.ts';

type L10n = Record<Lang, string>;
export type Ratio = '4:3' | '3:4' | 'original';
/** Fractions of the (EXIF-rotated) source, applied before the ratio crop. */
export interface Box { left: number; top: number; width: number; height: number }
export interface Photo {
  id: string; // ASCII; master = src/assets/photos/<dir>/<id>.jpg
  dir: 'lash' | 'nails' | 'brows';
  source: string; // relative to the source dir; a leading '/' means an absolute path
  ratio: Ratio;
  box?: Box; // pre-crop (top-half splits, $180 removal)
  position?: 'centre' | 'top' | 'bottom' | 'left' | 'right'; // sharp cover position, default 'centre'
  alt: L10n;
}

const TOP_HALF: Box = { left: 0, top: 0, width: 1, height: 0.5 };
type Extra = Partial<Pick<Photo, 'ratio' | 'box' | 'position'>>;
const lash = (id: string, source: string, en: string, zh: string, extra: Extra = {}): Photo =>
  ({ id, dir: 'lash', source, ratio: '4:3', ...extra, alt: { en, zh } });
const nail = (n: string, source: string, en: string, zh: string, extra: Extra = {}): Photo =>
  ({ id: `nail-${n}`, dir: 'nails', source: source.startsWith('/') ? source : `nails/${source}`, ratio: '3:4', ...extra, alt: { en, zh } });

const brow = (n: string, source: string, en: string, zh: string, extra: Extra = {}): Photo =>
  ({ id: `brow-${n}`, dir: 'brows', source: source.startsWith('/') ? source : `eyebrow/${source}`, ratio: '4:3', ...extra, alt: { en, zh } });

// AI-generated style illustrations (not client work). Shown only in the labelled style guide, never as results.
const aiLash = (id: string, source: string, en: string, zh: string): Photo =>
  ({ id, dir: 'lash', source, ratio: 'original', alt: { en: `AI-generated illustration, not a real client: ${en}`, zh: `AI 生成示意图，非真实客人：${zh}` } });
export const photos: Photo[] = [
  lash('classic-natural', '睫毛/单根自然.jpg', 'Japanese classic natural lash extensions on a brown eye, Burwood', '棕色眼睛上的日式单根自然款嫁接睫毛，细密整齐，Burwood'),
  lash('classic-full-bottom', '睫毛/单根浓+下睫毛.JPG', 'Japanese classic full lash extensions with dense bottom lashes on a brown eye, Burwood', '棕色眼睛上的日式单根浓密款嫁接睫毛，搭配浓密下睫毛，Burwood'),
  lash('hybrid-natural', '睫毛/轻盈-自然.jpg', 'Light hybrid natural lash extensions with soft fanned tips on a grey-green eye, Burwood', '灰绿色眼睛上的开花轻盈自然款嫁接睫毛，睫毛尖柔和散开，Burwood'),
  // Not used: 开花-浓密-整脸.jpg looks AI-made (owner, 2026-11-08). Only real client work goes in the gallery.
  // Half-face portrait: a 4:3 crop would shrink it to an eye close-up, so it stays portrait (lash-extensions hero).
  lash('styled-half-face', '睫毛/造型款-半脸.jpg', 'Half-face portrait showing spiky, wispy styled lash extensions with defined bottom lashes', '半脸近照，造型款嫁接睫毛尖翘分明，搭配清晰下睫毛', { ratio: '3:4', position: 'top' }),
  lash('styled-fairy', '睫毛/造型款-仙子.JPG', 'Fairy styled lash set with a few long wispy spikes on top, Burwood', '仙子造型款嫁接睫毛，上睫毛间插几根纤长尖翘的长毛，Burwood'),
  lash('styled-layered', '睫毛/造型款-单根层次.JPG', 'Layered classic styled lash set, fine single lashes in staggered lengths', '单根层次造型款嫁接睫毛，纤细单根长短错落'),
  lash('styled-mermaid', '睫毛/造型款-人鱼.JPG', 'Mermaid styled lash set on a dark brown eye, sweeping lashes with a graceful curve', '深棕色眼睛上的人鱼造型款嫁接睫毛，睫毛弧度柔美、向眼尾延伸'),
  lash('styled-mermaid-selfie', '睫毛/造型款-人鱼+下睫毛.JPG', 'Close-up selfie of both eyes with mermaid styled lash extensions and bottom lashes', '双眼近景自拍，展示人鱼造型款嫁接睫毛和下睫毛', { ratio: '3:4' }),
  lash('styled-manga', '睫毛/造型款-漫画.JPG', 'Manga styled lash set with spiky, defined lash clusters on a hazel eye', '榛色眼睛上的漫画造型款嫁接睫毛，睫毛簇分明、根根尖翘', { box: { left: 0, top: 0, width: 0.64, height: 0.5 } }),
  lash('styled-liner', '睫毛/造型款-眼线加浓.JPG', 'Liner-effect thickened styled lash set, dense and dark along the lash line, on a blue-grey eye', '蓝灰色眼睛上的眼线加浓造型款嫁接睫毛，睫毛根部浓黑如眼线'),
  lash('styled-liner-2', '睫毛/造型款-眼线加浓2.JPG', 'Liner-effect thickened styled lash set with dense lashes and defined brows, brown eye', '棕色眼睛上的眼线加浓造型款嫁接睫毛，睫毛浓密，眉形清晰'),
  lash('styled-liner-bottom', '睫毛/造型款-眼线加浓+下睫毛.JPG', 'Liner-effect styled lash set with dense top and bottom lashes on a dark brown eye', '深棕色眼睛上的眼线加浓造型款嫁接睫毛，上下睫毛浓密', { box: { left: 0.08, top: 0.56, width: 0.68, height: 0.44 } }),
  lash('styled-sunflower', '睫毛/造型款-太阳花+下睫毛.JPG', 'Sunflower styled lash set with radiating long lashes and bottom lashes', '太阳花造型款嫁接睫毛，长睫毛向外放射，搭配下睫毛'),
  lash('styled-pompom', '睫毛/造型款-小绒花+下睫毛.JPG', 'Little pompom styled lash set with long, spiky wispy lashes, worn with a lilac face mask', '戴着淡紫色口罩的客人，小绒花造型款嫁接睫毛，睫毛纤长尖翘'),
  lash('styled-bottom', '睫毛/造型款+下睫毛.jpg', 'Styled lash set with long, flared top lashes and bottom lashes', '造型款嫁接睫毛，上睫毛纤长向外散开，搭配下睫毛', { box: { left: 0.02, top: 0.55, width: 0.86, height: 0.45 } }),
  lash('styled-bottom-2', '睫毛/造型款+下睫毛2.JPG', 'Styled lash set with spiky, dark top lashes and defined bottom lashes on a brown eye', '棕色眼睛上的造型款嫁接睫毛，上睫毛浓黑尖翘，下睫毛分明'),
  lash('styled-close', '睫毛/造型款.JPG', 'Close-up of a styled lash set with long, dark, criss-crossed lashes on a green-brown eye', '绿棕色眼睛上的造型款嫁接睫毛特写，睫毛浓黑纤长、交错有致'),
  lash('classic-natural-2', '睫毛/单根自然2.JPG', 'Japanese classic natural lash extensions, fine and separated, on an amber eye, Burwood', '琥珀色眼睛上的日式单根自然款嫁接睫毛，根根分明，Burwood'),
  lash('classic-natural-colour', '睫毛/单根自然+彩色+下睫毛.JPG', 'Japanese classic natural lash extensions with blue colour accents at the outer corner and bottom lashes', '日式单根自然款嫁接睫毛，眼尾点缀蓝色彩色睫毛，搭配下睫毛'),
  lash('hybrid-full-eye', '睫毛/开花-浓密.JPG', 'Dense, fluffy hybrid full lash extensions on a brown eye, Burwood', '棕色眼睛上的开花浓密款嫁接睫毛，蓬松浓密，Burwood'),
  lash('hybrid-full-2', '睫毛/开花-浓密2.JPG', 'Hybrid full lash extensions with soft fanned volume on a hazel eye', '榛色眼睛上的开花浓密款嫁接睫毛，开花柔和饱满'),
  lash('hybrid-full-bottom', '睫毛/开花-浓密+下睫毛.JPG', 'Hybrid full lash extensions with bottom lashes on a dark brown eye', '深棕色眼睛上的开花浓密款嫁接睫毛，搭配下睫毛'),
  lash('face-natural', 'IMG_7446.JPG', 'Client selfie with soft, natural-looking lash extensions, Burwood', '客人自拍，嫁接睫毛自然柔和，Burwood', { ratio: '3:4', position: 'top' }),
  lash('face-smile', 'IMG_7444.HEIC', 'Smiling client selfie showing light, natural lash extensions', '客人微笑自拍，嫁接睫毛轻盈自然', { ratio: '3:4', position: 'top' }),
  lash('selfie', '睫毛/造型款.HEIC', "Client's face close-up showing dark, wispy styled lash extensions", '客人面部近景，展示深色纤长的造型款嫁接睫毛', { ratio: '3:4' }),
  lash('hero-mirror', '睫毛/hero.JPG', 'Client lying back with fresh lash extensions, a hand mirror showing her lifted, wispy lashes up close', '刚做完嫁接睫毛的客人躺着，手镜里映出她根根上翘、轻盈纤长的睫毛', { ratio: '3:4' }),
  // Before/after two-panel: the card shows only the lower "after" panel.
  lash('lift-1', '睫毛/角蛋白-翘睫1.JPG', 'Keratin lash lift result on a brown eye, natural lashes lifted and curled from the root, Burwood', '棕色眼睛上的角蛋白翘睫效果，自然睫毛从根部上翘卷翘，Burwood', { box: { left: 0, top: 0.53, width: 1, height: 0.47 } }),
  lash('lift-3', '睫毛/角蛋白-翘睫3.JPG', 'Keratin lash lift before and after: the same eye with straight lashes, then lifted and curled from the root, Burwood', '角蛋白翘睫前后对比：同一只眼睛，做之前睫毛下垂，做之后从根部上翘卷翘，Burwood', { ratio: '3:4' }),

  nail('6920', 'IMG_6920.JPG', 'Long almond nude pink nails under a rainbow light', '彩虹光影下的长杏仁形裸粉色美甲'),
  nail('3406', 'IMG_3406.JPG', 'Nude pink French tip nails with small flower art', '裸粉色法式美甲，带小花彩绘'),
  nail('4067', 'IMG_4067.JPG', 'Nude pink nails with tiny pink gem details', '裸粉色美甲，点缀粉色小钻'),
  nail('2112', 'IMG_2112.JPG', 'Long nude pink almond nails with coloured gems', '裸粉色长杏仁形美甲，镶彩色小钻'),
  nail('2441', 'IMG_2441.JPG', 'Soft pink nails with gold foil on white tulle', '柔粉色美甲配金箔，白纱背景'),
  nail('2223', 'IMG_2223.JPG', 'Nude nails with dried-flower art beside a glass cup', '裸色美甲配干花装饰，玻璃杯背景'),
  nail('fc1a', 'FC1A5AA1-AD73-4855-AFF4-6F4DC0C0A719.JPG', 'Gold mirror and cat-eye nails on a textured wall', '金色镜面和猫眼美甲'),
  nail('4915', 'IMG_4915.JPG', 'Gold chrome nails with a red accent', '金色镜面美甲，点缀红色'),
  nail('2020', 'IMG_2020.JPG', 'Silver chrome nails with coloured gems', '银色镜面美甲，镶彩色小钻'),
  nail('9011', 'IMG_9011.JPG', 'Lilac chrome 3D nails on white tulle', '淡紫色镜面立体美甲，白纱背景', { position: 'right' }),
  nail('b029', 'B0297EC5-3953-40D6-8344-D3761BAD7D3F.JPG', 'Nude nails with yellow flower art', '裸色美甲配黄色小花彩绘'),
  nail('6e6c', '6E6C1734-F327-4B6E-8D11-66682911A6F6.jpg', 'Warm gold and yellow floral nails with foil', '暖金色和黄色花朵美甲，配金箔'),
  nail('8353', 'IMG_8353.jpg', 'Burgundy red nails with dark art on a grey wall', '酒红色美甲配深色彩绘'),
  nail('1848', 'IMG_1848.jpg', 'Deep red nails with black art beside a white statue', '深红色美甲配黑色彩绘，白色雕像背景'),
  nail('3029', 'IMG_3029.JPG', 'Deep navy blue nails with silver details', '深蓝色美甲配银色点缀', { box: { left: 0, top: 0, width: 1, height: 0.455 }, position: 'left' }),
  nail('9024', 'IMG_9024.jpg', 'Grey and white marble nails', '灰白色大理石纹美甲'),
  nail('7334', 'IMG_7334.jpg', 'Black French tip nails with small art', '黑色法式美甲配小彩绘', { box: { left: 0.46, top: 0, width: 0.54, height: 1 }, position: 'top' }),
  nail('8351', 'IMG_8351.JPG', 'Black and white cartoon hand-painted nails', '黑白卡通手绘美甲'),
  nail('2473', 'IMG_2473.jpg', 'Black, grey and white marble nails outdoors', '黑灰白渐变大理石纹美甲，户外', { box: { left: 0, top: 0, width: 1, height: 0.93 } }),
  nail('4630', 'IMG_4630.JPG', 'Black nails with yellow letter art', '黑色美甲配黄色字母彩绘'),
  nail('9264', 'IMG_9264.heic', 'Pink nails with black squiggle art and dried flowers behind', '粉色美甲配黑色线条彩绘，干花背景'),
  nail('7242', 'IMG_7242.JPG', 'Nude nails with small colourful art over a phone case', '裸色美甲配彩色小彩绘'),
  nail('video-poster', '/tmp/abby-video-poster.jpg', 'Yellow little-flower French nails, video still', '黄色小花法式美甲，视频封面'),
  aiLash('ai-classic-natural', 'geneation/download (1).png', 'face and both eyes with light, separated natural lash extensions', '整脸与双眼，轻盈根根分明的自然款嫁接睫毛'),
  aiLash('ai-classic-full', 'geneation/download.png', 'face and both eyes with fuller, darker lash extensions', '整脸与双眼，更浓更黑的浓密款嫁接睫毛'),
  // Powder brows (eyebrow/), all real client work by Abby.
  brow('9795', 'IMG_9795.JPG', 'Powder brows before and after, side by side: sparse natural brows, then soft, even shaded brows', '雾眉前后并排对比：左边眉毛稀疏，右边是柔和均匀的粉雾眉'),
  brow('8979', 'IMG_8979.JPG', 'Powder brows before and after on one face: the left half before, the right half with soft shaded brows', '同一张脸的雾眉前后对比：左半边是做之前，右半边是柔和的粉雾眉', { ratio: '3:4' }),
  brow('8645', 'IMG_8645.JPG', 'Powder brows before and after on one face: faint brows on one side, defined soft brows on the other', '同一张脸的雾眉前后对比：一边眉色浅淡，一边眉形清晰柔和', { ratio: '3:4' }),
  brow('6863', 'IMG_6863.jpg', 'Client with fresh powder brows, soft arched shape with a natural shaded finish', '刚做完雾眉的客人，眉形柔和上扬，粉雾感自然', { ratio: '3:4' }),
  brow('3166', 'IMG_3166.JPG', 'Close-up of powder brows: a soft shaded brow above a brown eye', '雾眉特写：棕色眼睛上方柔和的粉雾眉', { ratio: '3:4', box: { left: 0.27, top: 0, width: 0.544, height: 1 } }),
  // Video still (ffmpeg -ss 3 from eyebrow/雾眉留色度3个月.MP4); once /tmp is cleared the photo script skips it and keeps the master.
  brow('video-poster', '/tmp/abby-brow-video-poster.jpg', 'Powder brows touch-up at 3 months, video still', '雾眉 3 个月补色，视频封面', { ratio: '3:4' }),
  brow('6069', 'IMG_6069.JPG', 'Close-up of a freshly done powder brow with a clean, softly shaded shape', '刚做完的雾眉特写，眉形干净，粉雾过渡柔和', { ratio: '3:4' }),
];

const byId = new Map(photos.map((p) => [p.id, p]));
export const photo = (id: string): Photo => {
  const p = byId.get(id);
  if (!p) throw new Error(`unknown photo ${id}`);
  return p;
};

export const lashCards: { serviceId: string; optionId: string; photo: string }[] = [
  { serviceId: 'lash-extensions', optionId: 'classic-natural', photo: 'classic-natural' },
  { serviceId: 'lash-extensions', optionId: 'classic-full', photo: 'classic-full-bottom' },
  { serviceId: 'lash-extensions', optionId: 'hybrid-natural', photo: 'hybrid-natural' },
  { serviceId: 'lash-extensions', optionId: 'hybrid-full', photo: 'hybrid-full-2' },
  { serviceId: 'lash-extensions', optionId: 'styled', photo: 'styled-fairy' },
  { serviceId: 'lash-lift', optionId: 'keratin-lift', photo: 'lift-1' },
];

export const lashLooks = (lang: Lang) => lashCards.map((c) => {
  const o = findOption(c.serviceId, c.optionId)!;
  return { href: localePath(lang, `/book?service=${c.serviceId}&option=${c.optionId}`), name: o.name[lang],
    price: priceText(o, lang), minutes: o.minutes, photo: c.photo };
});

export const nailVideo = {
  src: '/media/nails-yellow-french.mp4',
  poster: 'nail-video-poster',
  alt: { en: 'Video: yellow little-flower French nails', zh: '视频：黄色小花法式美甲' } as L10n,
};
// ffmpeg -i ~/Desktop/abby-eyelash/eyebrow/雾眉留色度3个月.MP4 -an -vf "scale=540:-2" -c:v libx264 -crf 30 -preset slow -movflags +faststart public/media/brows-touch-up.mp4
export const browVideo = {
  src: '/media/brows-touch-up.mp4',
  poster: 'brow-video-poster',
  alt: { en: 'Video: powder brows touch-up 3 months after the first session, colour still holding', zh: '视频：第一次做完 3 个月后来补色，雾眉留色依然明显' } as L10n,
};
/** Gallery items that are videos, by id (every other item id is a photo). */
export const videos: Record<string, typeof nailVideo> = { 'nail-video': nailVideo, 'brow-video': browVideo };

export const NAIL_VISIBLE = 3; // items shown per group before "show all"

export const nailGroups: { id: string; name: L10n; swatch: string; items: string[] }[] = [
  { id: 'nude-french', name: { en: 'Nude · French', zh: '裸粉 · 法式' }, swatch: '#e8c4b8',
    items: ['nail-6920', 'nail-3406', 'nail-4067', 'nail-2112', 'nail-2441', 'nail-2223'] },
  { id: 'gold-mirror', name: { en: 'Gold · Mirror', zh: '金色 · 镜面' }, swatch: '#c9a24b',
    items: ['nail-fc1a', 'nail-4915', 'nail-2020', 'nail-9011'] },
  { id: 'warm-floral', name: { en: 'Warm yellow · Floral', zh: '暖黄 · 花朵' }, swatch: '#f0c33c',
    items: ['nail-video', 'nail-b029', 'nail-6e6c'] },
  { id: 'wine-navy', name: { en: 'Wine · Navy', zh: '酒红 · 深蓝' }, swatch: '#6b1e2e',
    items: ['nail-8353', 'nail-1848', 'nail-3029'] },
  { id: 'mono-art', name: { en: 'Black & white · Art', zh: '黑白 · 彩绘' }, swatch: '#2b2b2b',
    items: ['nail-9024', 'nail-2473', 'nail-8351', 'nail-7334', 'nail-4630', 'nail-9264', 'nail-7242'] },
];

export const styleGuide: { photo: string; optionId: string; desc: L10n }[] = [
  { photo: 'ai-classic-natural', optionId: 'classic-natural', desc: { en: 'Light and separated; like your own lashes, only longer.', zh: '根根分明、轻盈清透，像自己的睫毛变长了。' } },
  { photo: 'ai-classic-full', optionId: 'classic-full', desc: { en: 'Thicker and darker along the lash line, a little like eyeliner.', zh: '更浓更黑，睫毛根部像画了一道眼线。' } },
];

export const styledLooks: { photo: string; name: L10n }[] = [
  { photo: 'styled-fairy', name: { en: 'Fairy', zh: '仙子' } },
  { photo: 'styled-layered', name: { en: 'Layered classic', zh: '单根层次' } },
  { photo: 'styled-mermaid', name: { en: 'Mermaid', zh: '人鱼' } },
  { photo: 'styled-manga', name: { en: 'Manga', zh: '漫画' } },
  { photo: 'styled-liner', name: { en: 'Liner thickened', zh: '眼线加浓' } },
  { photo: 'styled-liner-2', name: { en: 'Liner thickened II', zh: '眼线加浓 2' } },
  { photo: 'styled-liner-bottom', name: { en: 'Liner thickened + bottom lashes', zh: '眼线加浓 + 下睫毛' } },
  { photo: 'styled-sunflower', name: { en: 'Sunflower + bottom lashes', zh: '太阳花 + 下睫毛' } },
  { photo: 'styled-pompom', name: { en: 'Little pompom + bottom lashes', zh: '小绒花 + 下睫毛' } },
  { photo: 'styled-bottom', name: { en: 'Styled + bottom lashes', zh: '造型款 + 下睫毛' } },
  { photo: 'styled-bottom-2', name: { en: 'Styled + bottom lashes II', zh: '造型款 + 下睫毛 2' } },
  { photo: 'styled-close', name: { en: 'Styled close-up', zh: '造型款特写' } },
];

export const LASH_VISIBLE = 4; // lash photos shown per group before "show all"
/** Home portfolio, lash part: grouped by look; one ratio per group so each grid is uniform. The six "lash looks" cards and the hero aren't repeated. */
/** Home portfolio, brows part. The brows page shows brow-9795 and brow-6863, so they aren't repeated here. */
export const BROW_VISIBLE = 4;
export const browGroups: { id: string; name: L10n; ratio: '3:4'; items: string[] }[] = [ // 3:4 like the nail tiles
  { id: 'before-after', name: { en: 'Before and after', zh: '术前术后对比' }, ratio: '3:4', items: ['brow-video', 'brow-8979', 'brow-8645'] },
  { id: 'close-ups', name: { en: 'Close-ups', zh: '效果特写' }, ratio: '3:4', items: ['brow-3166', 'brow-6069'] },
];

export const lashGroups: { id: string; name: L10n; ratio: '3:4' | '4:3'; items: string[] }[] = [
  { id: 'face', name: { en: 'Full-face looks', zh: '整脸效果' }, ratio: '3:4', items: ['face-natural', 'selfie', 'face-smile', 'styled-half-face', 'styled-mermaid-selfie'] },
  { id: 'natural-full', name: { en: 'Natural and full sets', zh: '自然款 · 浓密款' }, ratio: '4:3',
    items: ['classic-natural-2', 'hybrid-full-eye', 'classic-natural-colour', 'hybrid-full-bottom'] },
  { id: 'styled', name: { en: 'Styled sets', zh: '造型款' }, ratio: '4:3', items: styledLooks.map((l) => l.photo).filter((p) => p !== 'styled-fairy') },
];

/** Per service slot: manifest photo, optional object-position, optional literal aspect classes (default in ServicePage). */
export interface ServiceSlots {
  hero?: string; heroPos?: string; heroAspect?: string;
  detail?: string; detailPos?: string; detailAspect?: string;
}
// Slots follow the master's ratio (4:3 shown 4:3, 3:4 shown 4:5) so no eye, nail or watermark is cropped. Literal classes so Tailwind sees them.
const NAIL = 'aspect-[4/5]';
const WIDE = 'aspect-[4/3]';
export const servicePhotos: Record<string, ServiceSlots> = {
  'lash-extensions': { hero: 'styled-half-face', heroAspect: NAIL, heroPos: '50% 0%', detail: 'styled-mermaid-selfie', detailAspect: NAIL, detailPos: '50% 0%' },
  'lash-lift': { hero: 'lift-3', heroAspect: NAIL }, // no detail photo: the sidebar shows only the Book button
  'powder-brows': { hero: 'brow-9795', heroAspect: WIDE, detail: 'brow-6863', detailAspect: NAIL },
  'gel-nails': { hero: 'nail-3406', heroAspect: NAIL, detail: 'nail-2020', detailAspect: NAIL },
  'handcrafted-nails': { hero: 'nail-8351', heroAspect: NAIL, heroPos: '50% 100%', detail: 'nail-4630', detailAspect: NAIL },
  'nail-extensions': { hero: 'nail-2112', heroAspect: NAIL, heroPos: '50% 100%', detail: 'nail-6920', detailAspect: NAIL },
};

export const homeHero = 'hero-mirror';

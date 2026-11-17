import { findOption, mainOptions, priceText, services, type Lang } from './services.ts';
import { localePath } from '../lib/i18n.ts';
import { aliasHant } from '../lib/hant.ts';
import admin from './photo-admin.json' with { type: 'json' };

// Written in en + zh; aliasHant (end of file) adds 'zh-hant', read as the zh text and converted after the build.
export type L10n = { en: string; zh: string; readonly 'zh-hant'?: string };
export type Ratio = '4:3' | '3:4' | '1.91:1' | 'original';
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

export type Dir = Photo['dir'];
export type AdminRatio = '4:3' | '3:4' | '1.91:1'; // 1.91:1: a service page's link preview (og:image, 1200 × 630); admin uploads only
/** A photo added in the admin (/admin/). `where`: the group id or place key it was uploaded to (used for its alt text). */
export interface Upload { dir: Dir; ratio: AdminRatio; where: string }
/** Written in en + zh in the admin; 'zh-hant' is converted from zh. */
export type Text = { en: string; zh: string };
/**
 * What the admin edits (src/data/photo-admin.json):
 * groups: portfolio lists by '<service>/<option>', '<service>/other' and 'face'; the group a photo is in is its style.
 * slots: fixed-place overrides. uploads: photos added in the admin.
 * labels: the style of a 'face' photo ('option:lash-extensions/<option>') or the look name of a styled-set photo ('look:<id>').
 * names: service and style names changed in the admin ('<service>' or '<service>/<option>'; read by services.ts).
 * alts: photo descriptions changed in the admin. numbers: each photo's GA4 number ('gel-nails-cat-eye-1');
 * counters: the highest number given per prefix, so a number is never given twice.
 */
export interface AdminData {
  groups: Record<string, string[]>; slots: Record<string, string>; uploads: Record<string, Upload>; labels: Record<string, string>;
  names: Record<string, Text>; alts: Record<string, Text>; numbers: Record<string, string>; counters: Record<string, number>;
}
export const adminData = admin as AdminData;
const G = adminData.groups;
const placed = (key: string, def: string) => adminData.slots[key] ?? def;

const cardDefs: { serviceId: string; optionId: string; photo: string }[] = [
  { serviceId: 'lash-extensions', optionId: 'classic-natural', photo: 'classic-natural' },
  { serviceId: 'lash-extensions', optionId: 'classic-full', photo: 'classic-full-bottom' },
  { serviceId: 'lash-extensions', optionId: 'hybrid-natural', photo: 'hybrid-natural' },
  { serviceId: 'lash-extensions', optionId: 'hybrid-full', photo: 'hybrid-full-2' },
  { serviceId: 'lash-extensions', optionId: 'styled', photo: 'styled-fairy' },
  { serviceId: 'lash-lift', optionId: 'keratin-lift', photo: 'lift-1' },
];
export const lashCards = cardDefs.map((c) => ({ ...c, photo: placed(`card:${c.serviceId}/${c.optionId}`, c.photo) }));

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

export const styleGuide: { photo: string; optionId: string; desc: L10n }[] = [
  { photo: 'ai-classic-natural', optionId: 'classic-natural', desc: { en: 'Light and separated; like your own lashes, only longer.', zh: '根根分明、轻盈清透，像自己的睫毛变长了。' } },
  { photo: 'ai-classic-full', optionId: 'classic-full', desc: { en: 'Thicker and darker along the lash line, a little like eyeliner.', zh: '更浓更黑，睫毛根部像画了一道眼线。' } },
];

// Names of the twelve styled photos that were on the site before the admin existed. A photo with a style name chosen in the admin uses that instead.
const legacyLooks: Record<string, L10n> = {
  'styled-fairy': { en: 'Fairy', zh: '仙子' },
  'styled-layered': { en: 'Layered classic', zh: '单根层次' },
  'styled-mermaid': { en: 'Mermaid', zh: '人鱼' },
  'styled-manga': { en: 'Manga', zh: '漫画' },
  'styled-liner': { en: 'Liner thickened', zh: '眼线加浓' },
  'styled-liner-2': { en: 'Liner thickened II', zh: '眼线加浓 2' },
  'styled-liner-bottom': { en: 'Liner thickened + bottom lashes', zh: '眼线加浓 + 下睫毛' },
  'styled-sunflower': { en: 'Sunflower + bottom lashes', zh: '太阳花 + 下睫毛' },
  'styled-pompom': { en: 'Little pompom + bottom lashes', zh: '小绒花 + 下睫毛' },
  'styled-bottom': { en: 'Styled + bottom lashes', zh: '造型款 + 下睫毛' },
  'styled-bottom-2': { en: 'Styled + bottom lashes II', zh: '造型款 + 下睫毛 2' },
  'styled-close': { en: 'Styled close-up', zh: '造型款特写' },
};
const serviceOf = (id: string) => services.find((s) => s.id === id)!;
// 定制款 alone says nothing: a hand-painted photo is named by its service.
const styleName = (serviceId: string, optionId: string): L10n =>
  (serviceId === 'handcrafted-nails' ? serviceOf(serviceId).name : findOption(serviceId, optionId)!.name) as L10n;
/** The styles a photo can show: a service's main options (not add-ons, infills or removal). */
const styles = (serviceId: string) => mainOptions(serviceOf(serviceId)).filter((o) => !o.extra);

/** Names the admin's dropdown offers: the style of a 整脸效果 photo, or the look name of a styled-set photo. `group`: where it is offered. */
export const adminLabels: { key: string; group: string; name: L10n }[] = [
  ...styles('lash-extensions').map((o) => ({ key: `option:lash-extensions/${o.id}`, group: 'face', name: o.name as L10n })),
  ...([['fairy', legacyLooks['styled-fairy']], ['layered', legacyLooks['styled-layered']], ['mermaid', legacyLooks['styled-mermaid']], ['manga', legacyLooks['styled-manga']],
    ['liner', legacyLooks['styled-liner']], ['sunflower', { en: 'Sunflower', zh: '太阳花' }], ['pompom', { en: 'Little pompom', zh: '小绒花' }]] as const)
    .map(([id, name]) => ({ key: `look:${id}`, group: 'lash-extensions/styled', name: name as L10n })),
];
/** The look name of a styled-set photo: the one chosen in the admin, else the name it had before the admin existed. */
export const lookName = (id: string, data: AdminData = adminData): L10n | undefined =>
  adminLabels.find((l) => l.key === data.labels[id] && l.key.startsWith('look:'))?.name ?? legacyLooks[id];

// ── Portfolio groups: service → style (photo-admin.json `groups`) ──
export const OTHER: L10n = { en: 'Other', zh: '其他' };
export const FACE: L10n = { en: 'Full-face looks', zh: '整脸效果' };
/** The services the portfolio shows, in site order, and the photo dir of each (lash, nails, brows: the three parts). */
const PORTFOLIO: { service: string; dir: Dir }[] = [
  { service: 'lash-extensions', dir: 'lash' }, { service: 'lash-lift', dir: 'lash' },
  { service: 'gel-nails', dir: 'nails' }, { service: 'handcrafted-nails', dir: 'nails' }, { service: 'nail-extensions', dir: 'nails' },
  { service: 'powder-brows', dir: 'brows' },
];
const VISIBLE: Record<Dir, number> = { lash: 4, nails: 3, brows: 4 }; // items shown per group before "show all"
export interface AdminGroup { id: string; dir: Dir; service: string; option?: string; ratio: '4:3' | '3:4'; visible: number; cols: 2 | 3; name: L10n }
/** Every portfolio group in site order: 整脸效果 (portrait, lashes only), then each service's styles and its "Other".
 * Lash style groups are landscape, nails and brows portrait. The site hides a group with no photos; the admin shows it. */
export const adminGroups: AdminGroup[] = [
  { id: 'face', dir: 'lash', service: 'lash-extensions', ratio: '3:4', visible: VISIBLE.lash, cols: 2, name: FACE },
  ...PORTFOLIO.flatMap(({ service, dir }) => {
    const base = { dir, service, ratio: dir === 'lash' ? '4:3' : '3:4', visible: VISIBLE[dir], cols: dir === 'lash' ? 2 : 3 } as const;
    return [
      ...styles(service).map((o) => ({ ...base, id: `${service}/${o.id}`, option: o.id, name: styleName(service, o.id) })),
      { ...base, id: `${service}/other`, name: OTHER },
    ];
  }),
];
export const groupOf = (id: string, data: AdminData = adminData) => adminGroups.find((g) => data.groups[g.id]?.includes(id));

/** The booking a portfolio photo opens and the name on its card: its style, or (no style: "Other") its service, muted. */
export interface PhotoBooking { service: string; option?: string; look?: true; name: L10n; muted?: true }
export function photoBooking(id: string, data: AdminData = adminData): PhotoBooking | undefined {
  const g = groupOf(id, data);
  if (!g) return undefined;
  const label = data.labels[id];
  const [service, option] = g.id === 'face' ? (label?.startsWith('option:') ? label.slice(7).split('/') : [g.service]) : [g.service, g.option];
  if (!option) return { service, name: serviceOf(service).name as L10n, muted: true };
  const look = service === 'lash-extensions' && option === 'styled' && g.id !== 'face' ? lookName(id, data) : undefined;
  return look ? { service, option, look: true, name: look } : { service, option, name: styleName(service, option) };
}
// A photo of an add-on-only service (nail extensions) opens the service it is booked with (booking-client.ts: bookableWith).
export const bookingHref = (lang: Lang, id: string, b: PhotoBooking) =>
  localePath(lang, `/book?service=${b.service}${b.option ? `&option=${b.option}` : ''}${b.look ? `&look=${id}` : ''}`);
/** The photo's number in GA4 (book_click photo=…); never shown to visitors. */
export const photoNumber = (id: string) => adminData.numbers[id] ?? id;

/** Styled looks (lash-extensions page): the admin's styled-set list, in its order. A photo without a look name shows no caption. */
export const styledLooks: { photo: string; name?: L10n }[] = G['lash-extensions/styled'].map((photo) => ({ photo, name: lookName(photo) }));

/** Per service slot: manifest photo, optional object-position, optional literal aspect classes (default in ServicePage). */
export interface ServiceSlots {
  hero?: string; heroPos?: string; heroAspect?: string;
  detail?: string; detailPos?: string; detailAspect?: string;
  og?: string; // the link preview Abby cropped in the admin; without it the hero is cut automatically (lib/og-image.ts)
}
// Slots follow the master's ratio (4:3 shown 4:3, 3:4 shown 4:5) so no eye, nail or watermark is cropped. Literal classes so Tailwind sees them.
const NAIL = 'aspect-[4/5]';
const WIDE = 'aspect-[4/3]';
const pageDefs: Record<string, ServiceSlots> = {
  'lash-extensions': { hero: 'styled-half-face', heroAspect: NAIL, heroPos: '50% 0%', detail: 'styled-mermaid-selfie', detailAspect: NAIL, detailPos: '50% 0%' },
  'lash-lift': { hero: 'lift-3', heroAspect: NAIL }, // no detail photo: the sidebar shows only the Book button
  'powder-brows': { hero: 'brow-9795', heroAspect: WIDE, detail: 'brow-6863', detailAspect: NAIL },
  'gel-nails': { hero: 'nail-3406', heroAspect: NAIL, detail: 'nail-2020', detailAspect: NAIL },
  'handcrafted-nails': { hero: 'nail-8351', heroAspect: NAIL, heroPos: '50% 100%', detail: 'nail-4630', detailAspect: NAIL },
  'nail-extensions': { hero: 'nail-2112', heroAspect: NAIL, heroPos: '50% 100%', detail: 'nail-6920', detailAspect: NAIL },
};

const HERO_DEF = 'hero-mirror';
export const homeHero = placed('home-hero', HERO_DEF);
// A place replaced in the admin shows the new photo; the position tweak belonged to the old photo, so it is dropped.
const replaced = (serviceId: string, s: ServiceSlots): ServiceSlots => {
  const out = { ...s };
  for (const kind of ['hero', 'detail'] as const) {
    const id = adminData.slots[`page:${serviceId}:${kind}`];
    if (s[kind] && id) { out[kind] = id; delete out[`${kind}Pos`]; }
  }
  const og = adminData.slots[`page:${serviceId}:og`];
  if (og) out.og = og;
  return out;
};
export const servicePhotos: Record<string, ServiceSlots> = Object.fromEntries(Object.entries(pageDefs).map(([id, s]) => [id, replaced(id, s)]));

// ── Admin definitions (shared by the site build, /admin/ and the publish API) ──
const serviceName = (id: string) => services.find((s) => s.id === id)!.name as L10n;
const place = (key: string, def: string, name: L10n) => ({ key, dir: photo(def).dir, ratio: photo(def).ratio as AdminRatio, def, name });
// A service page's link preview: no photo of that shape exists before the admin, so `def` is the page's hero as it is now
// (the automatic cut of it is what the page uses until Abby crops her own).
const ogPlace = (id: string) => ({ key: `page:${id}:og`, dir: photo(pageDefs[id].hero!).dir, ratio: '1.91:1' as AdminRatio, def: servicePhotos[id].hero!, name: serviceName(id) });
/** The twenty-four fixed places: replace only. `def` is the photo shown when the admin has not replaced it. */
export const adminSlots: { key: string; dir: Dir; ratio: AdminRatio; def: string; name: L10n }[] = [
  place('home-hero', HERO_DEF, { en: 'Home', zh: '首页' }),
  ...cardDefs.map((c) => place(`card:${c.serviceId}/${c.optionId}`, c.photo, findOption(c.serviceId, c.optionId)!.name as L10n)),
  ...Object.entries(pageDefs).flatMap(([id, s]) => [...(['hero', 'detail'] as const).filter((k) => s[k]).map((k) => place(`page:${id}:${k}`, s[k]!, serviceName(id))), ogPlace(id)]),
];
/** The prefix of each photo's GA4 number: '<service>-<option>' with a style, '<service>' without. Portfolio photos by their group;
 * a photo only in a fixed place by that place (card: its style; page: its service; the home hero: lash extensions). */
export function numberPrefixes(data: AdminData): Map<string, string> {
  const out = new Map<string, string>();
  for (const g of adminGroups) for (const id of data.groups[g.id] ?? []) {
    const b = photoBooking(id, data)!;
    out.set(id, b.option ? `${b.service}-${b.option}` : b.service);
  }
  for (const s of adminSlots) {
    const id = data.slots[s.key] ?? s.def;
    if (out.has(id)) continue;
    const [, service, option] = s.key.match(/^card:([^/]+)\/(.+)$/) ?? s.key.match(/^page:([^:]+):/) ?? [, 'lash-extensions'];
    out.set(id, option ? `${service}-${option}` : service!);
  }
  return out;
}
const NOUN: Record<Dir, L10n> = { lash: { en: 'lash extensions', zh: '嫁接睫毛' }, nails: { en: 'nails', zh: '美甲' }, brows: { en: 'powder brows', zh: '雾眉' } };
/** Alt text of an admin upload until one is written for it: its style name, else the name of the place it was uploaded to. */
export function uploadAlt(id: string, u: Upload, data: AdminData = adminData): L10n {
  const x = photoBooking(id, data)?.name ?? adminSlots.find((p) => p.key === u.where)?.name ?? NOUN[u.dir];
  return { en: `${x.en} – ${NOUN[u.dir].en} by Abby, Burwood`, zh: `${x.zh}，Abby ${NOUN[u.dir].zh}，Burwood` };
}
// Admin uploads join the manifest (no source file: their master is committed by the admin, scripts/photos.mjs skips them).
for (const [id, u] of Object.entries(adminData.uploads)) {
  const p: Photo = { id, dir: u.dir, source: '', ratio: u.ratio, alt: uploadAlt(id, u) };
  photos.push(p); byId.set(id, p);
}
// Descriptions written in the admin replace the ones above.
for (const [id, alt] of Object.entries(adminData.alts)) { const p = videos[id] ?? byId.get(id); if (p) p.alt = { ...alt }; }


aliasHant([photos, nailVideo, browVideo, styleGuide, styledLooks, adminGroups, servicePhotos, adminLabels, adminSlots, legacyLooks, OTHER, FACE]);

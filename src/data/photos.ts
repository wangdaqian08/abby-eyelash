import type { Lang } from './services.ts';

type L10n = Record<Lang, string>;
export type Ratio = '4:3' | '3:4' | 'original';
/** Fractions of the (EXIF-rotated) source, applied before the ratio crop. */
export interface Box { left: number; top: number; width: number; height: number }
export interface Photo {
  id: string; // ASCII; master = src/assets/photos/<dir>/<id>.jpg
  dir: 'lash' | 'nails';
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
  ({ id: `nail-${n}`, dir: 'nails', source: `nails/${source}`, ratio: '3:4', ...extra, alt: { en, zh } });

export const photos: Photo[] = [
  lash('classic-natural', '单根自然.jpg', 'Japanese classic natural lash extensions, Burwood', '日式单根自然款嫁接睫毛效果，Burwood'),
  lash('classic-natural-2', '单根自然2.JPG', 'Japanese classic natural lash extensions, close-up', '日式单根自然款嫁接睫毛特写'),
  lash('classic-full-bottom', '单根浓+下睫毛.JPG', 'Japanese classic full lash extensions with bottom lashes, Burwood', '日式单根浓密款加下睫毛嫁接效果，Burwood'),
  lash('classic-colour-bottom', '单根自然+彩色+下睫毛.JPG', 'Classic natural lash extensions with a coloured accent and bottom lashes', '日式单根自然款加彩色睫毛和下睫毛'),
  lash('hybrid-natural', '轻盈-自然.jpg', 'Light hybrid natural lash extensions, Burwood', '开花轻盈自然款嫁接睫毛效果，Burwood'),
  lash('hybrid-full', '开花-浓密.JPG', 'Hybrid full volume lash extensions, Burwood', '开花浓密款嫁接睫毛效果，Burwood'),
  lash('hybrid-full-2', '开花-浓密2.JPG', 'Hybrid full volume lash extensions, side view', '开花浓密款嫁接睫毛侧面效果'),
  lash('hybrid-full-bottom', '开花-浓密+下睫毛.JPG', 'Hybrid full volume lash extensions with bottom lashes', '开花浓密款加下睫毛嫁接效果', { ratio: '4:3' }),
  lash('styled-fairy', '造型款-仙子.JPG', 'Fairy styled lash set, Burwood', '仙子造型款嫁接睫毛效果，Burwood'),
  lash('styled-layered', '造型款-单根层次.JPG', 'Layered classic styled lash set', '单根层次造型款嫁接睫毛'),
  lash('styled-mermaid', '造型款-人鱼.JPG', 'Mermaid styled lash set', '人鱼造型款嫁接睫毛'),
  lash('styled-mermaid-selfie', '造型款-人鱼+下睫毛.JPG', 'Mermaid styled lash set with bottom lashes, selfie', '人鱼造型款加下睫毛嫁接效果，自拍', { ratio: '3:4' }),
  lash('styled-manga', '造型款-漫画.JPG', 'Manga styled lash set', '漫画造型款嫁接睫毛', { box: TOP_HALF }),
  lash('styled-liner', '造型款-眼线加浓.JPG', 'Liner-effect thickened styled lash set', '眼线加浓造型款嫁接睫毛'),
  lash('styled-liner-2', '造型款-眼线加浓2.JPG', 'Liner-effect thickened styled lash set, second look', '眼线加浓造型款嫁接睫毛，另一款'),
  lash('styled-liner-bottom', '造型款-眼线加浓+下睫毛.JPG', 'Liner-effect styled lash set with bottom lashes', '眼线加浓造型款加下睫毛嫁接效果', { box: TOP_HALF }),
  lash('styled-sunflower', '造型款-太阳花+下睫毛.JPG', 'Sunflower styled lash set with bottom lashes', '太阳花造型款加下睫毛嫁接效果'),
  lash('styled-pompom', '造型款-小绒花+下睫毛.JPG', 'Little pompom styled lash set with bottom lashes', '小绒花造型款加下睫毛嫁接效果'),
  lash('styled-bottom', '造型款+下睫毛.jpg', 'Styled lash set with bottom lashes', '造型款加下睫毛嫁接效果', { box: TOP_HALF }),
  lash('styled-bottom-2', '造型款+下睫毛2.JPG', 'Styled lash set with bottom lashes, second look', '造型款加下睫毛嫁接效果，另一款'),
  lash('styled-close', '造型款.JPG', 'Styled lash set, single-eye close-up', '造型款嫁接睫毛单眼特写'),
  lash('selfie', '造型款.HEIC', 'Client smiling with fresh styled lash extensions', '客人做完造型款嫁接睫毛后的整脸自拍', { ratio: '3:4' }),
  lash('lift-1', '角蛋白-翘睫1.JPG', 'Keratin lash lift before and after (top: before, bottom: after)', '角蛋白翘睫前后对比（上为做之前，下为做之后）', { ratio: 'original' }),
  lash('lift-2', '角蛋白-翘睫2.JPG', 'Keratin lash lift result, Burwood', '角蛋白翘睫效果，Burwood', { ratio: '4:3' }),
  lash('lift-3', '角蛋白-翘睫3.JPG', 'Keratin lash lift before and after (top: before, bottom: after)', '角蛋白翘睫前后对比（上为做之前，下为做之后）', { ratio: 'original' }),

  nail('6920', 'IMG_6920.JPG', 'Long almond nude pink nails under a rainbow light', '彩虹光影下的长杏仁形裸粉色美甲'),
  nail('3406', 'IMG_3406.JPG', 'Nude pink French tip nails with small flower art', '裸粉色法式美甲，带小花彩绘'),
  nail('4067', 'IMG_4067.JPG', 'Nude pink nails with tiny pink gem details', '裸粉色美甲，点缀粉色小钻'),
  nail('2112', 'IMG_2112.JPG', 'Long nude pink almond nails with coloured gems', '裸粉色长杏仁形美甲，镶彩色小钻'),
  nail('2441', 'IMG_2441.JPG', 'Soft pink nails with gold foil on white tulle', '柔粉色美甲配金箔，白纱背景'),
  nail('2223', 'IMG_2223.JPG', 'Nude nails with dried-flower art beside a glass cup', '裸色美甲配干花装饰，玻璃杯背景'),
  nail('fc1a', 'FC1A5AA1-AD73-4855-AFF4-6F4DC0C0A719.JPG', 'Gold mirror and cat-eye nails on a textured wall', '金色镜面和猫眼美甲'),
  nail('4915', 'IMG_4915.JPG', 'Gold chrome nails with a red accent', '金色镜面美甲，点缀红色'),
  nail('2020', 'IMG_2020.JPG', 'Silver chrome nails with coloured gems', '银色镜面美甲，镶彩色小钻'),
  nail('9011', 'IMG_9011.JPG', 'Lilac chrome 3D nails on white tulle', '淡紫色镜面立体美甲，白纱背景'),
  nail('b029', 'B0297EC5-3953-40D6-8344-D3761BAD7D3F.JPG', 'Nude nails with yellow flower art', '裸色美甲配黄色小花彩绘'),
  nail('6e6c', '6E6C1734-F327-4B6E-8D11-66682911A6F6.jpg', 'Warm gold and yellow floral nails with foil', '暖金色和黄色花朵美甲，配金箔'),
  nail('8353', 'IMG_8353.jpg', 'Burgundy red nails with dark art on a grey wall', '酒红色美甲配深色彩绘'),
  nail('1848', 'IMG_1848.jpg', 'Deep red nails with black art beside a white statue', '深红色美甲配黑色彩绘，白色雕像背景'),
  nail('3029', 'IMG_3029.JPG', 'Deep navy blue nails with silver details', '深蓝色美甲配银色点缀'),
  nail('9024', 'IMG_9024.jpg', 'Grey and white marble nails', '灰白色大理石纹美甲'),
  nail('7334', 'IMG_7334.jpg', 'Black French tip nails with small art', '黑色法式美甲配小彩绘'),
  nail('8351', 'IMG_8351.JPG', 'Black and white cartoon hand-painted nails', '黑白卡通手绘美甲'),
  // The "$180" price tag sits in the bottom ~8%; shortcut: estimated from a thumbnail, fine-tune after viewing the crop.
  nail('2473', 'IMG_2473.jpg', 'Black, grey and white marble nails outdoors', '黑灰白渐变大理石纹美甲，户外', { box: { left: 0, top: 0, width: 1, height: 0.9 } }),
  nail('4630', 'IMG_4630.JPG', 'Black nails with yellow letter art', '黑色美甲配黄色字母彩绘'),
  nail('9264', 'IMG_9264.heic', 'Pink nails with black squiggle art and dried flowers behind', '粉色美甲配黑色线条彩绘，干花背景'),
  nail('7242', 'IMG_7242.JPG', 'Nude nails with small colourful art over a phone case', '裸色美甲配彩色小彩绘'),
  nail('video-poster', '/tmp/abby-video-poster.jpg', 'Yellow little-flower French nails, video still', '黄色小花法式美甲，视频封面'),
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
  { serviceId: 'lash-extensions', optionId: 'hybrid-full', photo: 'hybrid-full' },
  { serviceId: 'lash-extensions', optionId: 'styled', photo: 'styled-fairy' },
  { serviceId: 'lash-lift', optionId: 'keratin-lift', photo: 'lift-2' },
];

export const nailVideo = {
  src: '/media/nails-yellow-french.mp4',
  poster: 'nail-video-poster',
  alt: { en: 'Video: yellow little-flower French nails', zh: '视频：黄色小花法式美甲' } as L10n,
};

export const NAIL_VISIBLE = 3; // items shown per group before "show all"

export const nailGroups: { id: string; name: L10n; swatch: string; items: string[] }[] = [
  { id: 'nude-french', name: { en: 'Nude · French', zh: '裸粉 · 法式' }, swatch: '#e8c4b8',
    items: ['nail-6920', 'nail-3406', 'nail-4067', 'nail-2112', 'nail-2441', 'nail-2223'] },
  { id: 'gold-mirror', name: { en: 'Gold · Mirror', zh: '金色 · 镜面' }, swatch: '#c9a24b',
    items: ['nail-fc1a', 'nail-4915', 'nail-2020', 'nail-9011'] },
  { id: 'warm-floral', name: { en: 'Warm yellow · Floral', zh: '暖黄 · 花朵' }, swatch: '#f0c33c',
    items: ['video', 'nail-b029', 'nail-6e6c'] },
  { id: 'wine-navy', name: { en: 'Wine · Navy', zh: '酒红 · 深蓝' }, swatch: '#6b1e2e',
    items: ['nail-8353', 'nail-1848', 'nail-3029'] },
  { id: 'mono-art', name: { en: 'Black & white · Art', zh: '黑白 · 彩绘' }, swatch: '#2b2b2b',
    items: ['nail-9024', 'nail-7334', 'nail-8351', 'nail-2473', 'nail-4630', 'nail-9264', 'nail-7242'] },
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

export const servicePhotos: Record<string, { hero?: string; detail?: string; beforeAfter?: [string, string] }> = {
  'lash-extensions': { hero: 'styled-mermaid-selfie', detail: 'hybrid-full-bottom' },
  'lash-lift': { hero: 'lift-2', beforeAfter: ['lift-1', 'lift-3'] },
  'gel-nails': { hero: 'nail-3406', detail: 'nail-9011' },
  'handcrafted-nails': { hero: 'nail-8351', detail: 'nail-4630' },
  'nail-extensions': { hero: 'nail-2112', detail: 'nail-6920' },
};

export const homeHero = 'selfie';

// Shared UI copy (header, footer, home page) in EN + natively written Simplified Chinese,
// plus small pure formatters. Only type imports here so `node --test` can load this file directly.
import type { Lang, Service } from '../data/services';
import type { Site } from '../data/site';

const en = {
  nav: {
    services: 'Services',
    about: 'About',
    gallery: 'Gallery',
    reviews: 'Reviews',
    faq: 'FAQ',
    contact: 'Contact',
    book: 'Book now',
    menu: 'Menu',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    main: 'Main',
    home: 'Abby Eyelash home',
    tagline: 'Lash & Nail Studio',
    language: 'Language',
  },
  footer: {
    visit: 'Visit',
    services: 'Services',
    hours: 'Opening hours',
    contact: 'Contact',
    follow: 'Follow',
    bookOnline: 'Book online',
    wechat: 'WeChat ID',
    copied: 'Copied',
    copyWechat: 'Copy WeChat ID',
    rights: 'All rights reserved.',
  },
  hero: {
    eyebrow: 'Burwood, Sydney',
    titleA: 'Lashes & nails,',
    accent: 'made by hand',
    titleB: 'in Burwood.',
    // {name} {suburb} {region} {postcode} {owner} are filled from site.ts
    body: '{name} is a lash and nail studio in {suburb} {region} {postcode}, Sydney, run by {owner}. Eyelash extensions, lash lifts, hand-painted nail art, gel polish and nail extensions — every appointment is done by {owner} herself.',
    book: 'Book an appointment',
    services: 'Our services',
    rating: 'Google reviews',
    imageAlt: 'Lash artist placing individual eyelash extensions with fine tweezers',
  },
  services: {
    eyebrow: 'What we offer',
    title: 'Five services,',
    accent: 'one pair of hands.',
    intro: 'Lashes and nails are all Abby does, so each service gets her full attention. Prices and times below are the starting point — your exact quote depends on the look you choose.',
    details: 'Prices & details',
    ctaTitle: 'Know what you want?',
    ctaBody: 'Pick a service, a day and a time online in under a minute.',
    ctaLink: 'Book online',
  },
  about: {
    eyebrow: 'Meet Abby',
    title: 'One artist,',
    accent: 'every appointment.',
    p1: '{name} is {owner}’s own studio in {suburb}. There are no juniors and no hand-offs: the person you talk to when you book is the person who does your lashes or nails.',
    years: '{n} years of experience in lash and nail work.',
    certifications: 'Training & certifications:',
    products: 'Products used:',
    statYears: 'Years experience',
    statServices: 'Services',
    statDays: 'Days open a week',
    photo1: 'Lash artist applying eyelash extensions to a client lying on a treatment bed',
    photo2: 'Fine tweezers resting on a tray of lash extension strips',
    photo3: 'Client’s hand on a towel during a manicure appointment',
  },
  gallery: {
    eyebrow: 'Gallery',
    title: 'Fresh from',
    accent: 'the studio.',
    more: 'See more on Instagram',
  },
  reviews: {
    eyebrow: 'Client love',
    title: 'Kind words',
    accent: 'from clients.',
    readAll: 'Read all reviews on Google',
    leave: 'Leave us a review on Google',
    google: 'Google review',
    sample: 'Sample reviews for the website preview — to be replaced with real Google reviews.',
  },
  faq: {
    eyebrow: 'Good to know',
    title: 'Questions,',
    accent: 'answered.',
    intro: 'Short answers to what clients ask most. Anything else — just ask when you book.',
  },
  contact: {
    eyebrow: 'Hours & contact',
    title: 'When to',
    accent: 'visit.',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    // PLACEHOLDER — confirm walking directions once the real street address is known.
    findUs: 'How to find us: a short walk from Burwood station and Westfield Burwood, on the Burwood Road side of the town centre.',
    byAppointment: 'By appointment — Abby works alone, so please book ahead.',
    openMaps: 'Open in Google Maps',
    mapTitle: 'Map showing Abby Eyelash in Burwood',
    bookOnline: 'Book your appointment online',
    call: 'Call to book',
  },
  closed: 'Closed',
};

type Strings = typeof en;

const zh: Strings = {
  nav: {
    services: '服务项目',
    about: '关于 Abby',
    gallery: '作品',
    reviews: '顾客评价',
    faq: '常见问题',
    contact: '联系我们',
    book: '立即预约',
    menu: '菜单',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    main: '主导航',
    home: 'Abby Eyelash 首页',
    tagline: '美睫 · 美甲工作室',
    language: '语言',
  },
  footer: {
    visit: '店铺地址',
    services: '服务项目',
    hours: '营业时间',
    contact: '联系方式',
    follow: '关注我们',
    bookOnline: '在线预约',
    wechat: '微信号',
    copied: '已复制',
    copyWechat: '复制微信号',
    rights: '版权所有。',
  },
  hero: {
    eyebrow: '悉尼 · 宝活 Burwood',
    titleA: '美睫与美甲，',
    accent: '一根一笔',
    titleB: '皆由手作。',
    body: '{name} 是位于悉尼宝活（{suburb} {region} {postcode}）的美睫美甲工作室，由 {owner} 一人主理。嫁接睫毛、睫毛翘睫、手绘美甲、光疗甲与延长甲，每一位顾客都由 {owner} 亲手完成。',
    book: '在线预约',
    services: '查看服务',
    rating: 'Google 评价',
    imageAlt: '美睫师用细镊子为顾客逐根嫁接睫毛',
  },
  services: {
    eyebrow: '服务项目',
    title: '五项服务，',
    accent: '同一双手。',
    intro: 'Abby 只专注睫毛与美甲，所以每一项都做得用心。下方是起步价格与所需时间，最终价格以你选择的款式为准。',
    details: '价格与详情',
    ctaTitle: '已经想好做什么？',
    ctaBody: '在线选择项目、日期和时间，一分钟就能约好。',
    ctaLink: '在线预约',
  },
  about: {
    eyebrow: '认识 Abby',
    title: '一位美睫师，',
    accent: '全程亲手服务。',
    p1: '{name} 是 {owner} 在{suburb}的个人工作室。没有学徒，也不会中途换人：预约时和你沟通的是她，为你做睫毛和美甲的也是她。',
    years: '{n} 年美睫与美甲从业经验。',
    certifications: '培训与资质：',
    products: '使用产品：',
    statYears: '年从业经验',
    statServices: '项服务',
    statDays: '每周营业天数',
    photo1: '美睫师为躺在美容床上的顾客嫁接睫毛',
    photo2: '细镊子放在一排嫁接睫毛的托盘上',
    photo3: '美甲时顾客的手放在毛巾上',
  },
  gallery: {
    eyebrow: '作品集',
    title: '工作室',
    accent: '近期作品。',
    more: '在 Instagram 查看更多',
  },
  reviews: {
    eyebrow: '顾客口碑',
    title: '听听顾客',
    accent: '怎么说。',
    readAll: '在 Google 查看全部评价',
    leave: '在 Google 给我们写评价',
    google: 'Google 评价',
    sample: '以下为网站预览用的示例评价，上线前将替换为真实的 Google 评价。',
  },
  faq: {
    eyebrow: '预约须知',
    title: '常见问题，',
    accent: '一次说清。',
    intro: '整理了顾客最常问的问题。还有其他疑问，预约时直接问 Abby 就好。',
  },
  contact: {
    eyebrow: '营业时间与联系方式',
    title: '欢迎',
    accent: '到店。',
    address: '地址',
    phone: '电话',
    email: '邮箱',
    // PLACEHOLDER — confirm walking directions once the real street address is known.
    findUs: '怎么来：从宝活火车站（Burwood station）和 Westfield Burwood 步行即可到达，位于 Burwood Road 一侧的市中心。',
    byAppointment: '仅限预约 —— Abby 一人工作，请提前预约。',
    openMaps: '在 Google 地图中打开',
    mapTitle: 'Abby Eyelash 在宝活的位置地图',
    bookOnline: '在线预约',
    call: '致电预约',
  },
  closed: '休息',
};

export const common: Record<Lang, Strings> = { en, zh };

/** Replace `{key}` placeholders. */
export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** "from $65 · 60–150 min" — computed from the service's options (services.ts is the only price source). */
export function priceLine(s: Service, lang: Lang) {
  const min = Math.min(...s.options.map((o) => o.price));
  const mins = s.options.map((o) => o.minutes);
  const lo = Math.min(...mins);
  const hi = Math.max(...mins);
  const from = s.options.length > 1 || s.options[0].from;
  const price = from ? (lang === 'zh' ? `$${min} 起` : `from $${min}`) : `$${min}`;
  return `${price} · ${lo === hi ? lo : `${lo}–${hi}`} ${lang === 'zh' ? '分钟' : 'min'}`;
}

/** Postal address on one line — identical text on every page and in both languages (must match GBP). */
export const napAddress = (site: Pick<Site, 'address'>) =>
  `${site.address.street}, ${site.address.locality} ${site.address.region} ${site.address.postcode}`;

export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, '')}`;

export const mapsUrl = (site: Pick<Site, 'name' | 'address'>) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name}, ${napAddress(site)}`)}`;

const DAYS: Record<Lang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
};
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first (AU)

const time = (hhmm: string, lang: Lang) => {
  const [h, m] = hhmm.split(':').map(Number);
  const mm = String(m).padStart(2, '0');
  return lang === 'zh' ? `${h}:${mm}` : `${h % 12 || 12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
};

/** Group consecutive days with identical hours: [{ days: 'Monday – Friday', time: '9:00 am – 7:00 pm' }, …]. Missing days = closed. */
export function hoursRows(hours: readonly { day: number; open: string; close: string }[], lang: Lang) {
  const groups: { from: number; to: number; key: string; h?: (typeof hours)[number] }[] = [];
  for (const d of WEEK) {
    const h = hours.find((x) => x.day === d);
    const key = h ? `${h.open}-${h.close}` : 'closed';
    const last = groups.at(-1);
    if (last?.key === key) last.to = d;
    else groups.push({ from: d, to: d, key, h });
  }
  return groups.map((g) => ({
    days: g.from === g.to ? DAYS[lang][g.from] : `${DAYS[lang][g.from]}${lang === 'zh' ? '至' : ' – '}${DAYS[lang][g.to]}`,
    time: g.h ? `${time(g.h.open, lang)} – ${time(g.h.close, lang)}` : common[lang].closed,
  }));
}

/** Review dates: "September 2026" / "2026年9月". */
export const monthYear = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-AU', { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso));

/**
 * Home FAQ — answers are always visible (GEO-STRATEGY #2) and each answer stands on its own.
 * `{phone}` / `{address}` are filled from site.ts. PLACEHOLDER: payment methods and parking details — confirm with Abby.
 */
export const homeFaq: Record<Lang, { q: string; a: string }[]> = {
  en: [
    {
      q: 'How do I book, and what is the cancellation policy?',
      a: 'Book online at any time, or call or text {phone}. Please give at least 24 hours’ notice to cancel or reschedule, so the time can be offered to another client.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'Payment is made at the end of your appointment by card (Visa, Mastercard, contactless) or cash. No deposit is needed to book online.',
    },
    {
      q: 'Where is the studio, and where can I park?',
      a: 'Abby Eyelash is at {address}, a short walk from Burwood station and Westfield Burwood. Westfield Burwood has a large shopping-centre car park, and there is time-limited street parking on the surrounding streets.',
    },
    {
      q: 'What happens at my first visit?',
      a: 'Abby starts with a short chat about the look you want, your natural lashes or nails, and any allergies or sensitivities. For lash services, please arrive with clean, make-up-free eyes; for nails, remove any old gel or extensions done elsewhere, or mention it when booking.',
    },
    {
      q: 'Can I have a patch test first?',
      a: 'Yes. If you have sensitive eyes, known allergies or it is your first time with lash extensions or a lash lift, ask for a patch test when you book. A small amount of product is applied and you wait 24–48 hours before the full appointment.',
    },
    {
      q: 'How long do lash extensions and lash lifts last?',
      a: 'Lash extensions shed naturally with your own lashes, so most clients book a refill every 2–3 weeks. A lash lift and tint usually lasts 6–8 weeks.',
    },
    {
      q: 'How long do gel polish and nail extensions last?',
      a: 'Gel polish typically lasts 2–3 weeks without chipping. BIAB and Gel-X extensions are usually infilled or redone every 3–4 weeks as your natural nail grows.',
    },
  ],
  zh: [
    {
      q: '怎么预约？取消政策是什么？',
      a: '可以随时在线预约，也可以致电或发短信至 {phone}。如需取消或改期，请至少提前 24 小时告知，以便把时间留给其他顾客。',
    },
    {
      q: '可以用哪些方式付款？',
      a: '服务结束后付款，支持刷卡（Visa、Mastercard、手机或卡片感应支付）和现金。在线预约无需支付订金。',
    },
    {
      q: '工作室在哪里？方便停车吗？',
      a: 'Abby Eyelash 的地址是 {address}，从宝活火车站（Burwood station）和 Westfield Burwood 步行即可到达。Westfield Burwood 设有大型商场停车场，周边街道也有限时路边车位。',
    },
    {
      q: '第一次去需要注意什么？',
      a: 'Abby 会先和你简单沟通想要的效果、自身睫毛或指甲的状况，以及是否有过敏或敏感情况。做睫毛请素颜、保持眼部清洁；做美甲如有在别处做的光疗或延长甲未卸，请在预约时说明。',
    },
    {
      q: '可以先做皮肤测试吗？',
      a: '可以。如果你眼睛敏感、有已知过敏，或是第一次嫁接睫毛、做翘睫，预约时请说明需要做测试。会先少量试用产品，观察 24–48 小时后再做正式项目。',
    },
    {
      q: '嫁接睫毛和翘睫能维持多久？',
      a: '嫁接睫毛会随自身睫毛自然脱落，大多数顾客每 2–3 周补一次。翘睫加染色一般可维持 6–8 周。',
    },
    {
      q: '光疗甲和延长甲能维持多久？',
      a: '光疗甲油一般可维持 2–3 周不易剥落。BIAB 和 Gel-X 延长甲随着自甲生长，通常每 3–4 周需要补甲或重做。',
    },
  ],
};

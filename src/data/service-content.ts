// Long-form service-page copy, EN + natively written Simplified Chinese (owner reviews).
// Prices/durations are interpolated from services.ts so the visible copy always matches the price table and JSON-LD.
// Body strings are trusted HTML (rendered with set:html) so they can carry citation links.
// Every `// OWNER-REVIEW` marks a claim Abby must confirm before launch (products, aftercare, policies).
import { services, type Lang } from './services';
import { site } from './site';

export interface Section {
  h2: [string, string]; // "Line one " + <em>accent</em>
  body?: string[];
  steps?: string[]; // ordered list
  list?: string[]; // unordered list
  after?: string[];
}
export interface ServiceContent {
  title: string; // ≤ 60 chars
  description: string; // ≤ 155 chars
  h1: [string, string];
  intro: string;
  sections: Section[];
  faq: { q: string; a: string }[];
  alt: { hero: string; detail: string };
}

const opt = (s: string, o: string) => {
  const x = services.find((v) => v.id === s)?.options.find((v) => v.id === o);
  if (!x) throw new Error(`service-content: unknown option ${s}/${o}`);
  return x;
};
const $ = (s: string, o: string) => `$${opt(s, o).price}`;
const m = (s: string, o: string) => opt(s, o).minutes;
/** Duration range over options, e.g. "60–75" (single value when equal). */
const span = (s: string, ...os: string[]) => {
  const v = os.map((o) => m(s, o));
  const [lo, hi] = [Math.min(...v), Math.max(...v)];
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
};
// Options priced as a share of the full set (lash infill tiers), and "$X–$Y" for ranged prices — both from prices.csv.
const shares = (s: string) => services.find((v) => v.id === s)!.options.filter((o) => o.pct);
const range = (s: string, o: string) => (opt(s, o).maxPrice ? `$${opt(s, o).price}–$${opt(s, o).maxPrice}` : $(s, o));

const { deposit, cancelHours: h } = site.booking;
// One cancellation answer for every service page, built from site.ts so the rule can't drift between pages.
const CANCEL = {
  en: { q: 'What is your cancellation policy?', a: `A $${deposit} deposit by WeChat (${site.social.wechatId}) secures your booking. Please give at least ${h} hours’ notice to cancel or reschedule; within ${h} hours the deposit is not refunded and the time can’t be changed.` },
  zh: { q: '取消预约有什么规定？', a: `预约需通过微信（${site.social.wechatId}）支付 $${deposit} 订金。如需取消或改期，请至少提前 ${h} 小时告知；${h} 小时以内取消或改期，订金不退，也不能更改时间。` },
};

const cite = (href: string, text: string) =>
  `<a href="${href}" target="_blank" rel="noopener" class="underline underline-offset-4 hover:text-fg">${text}</a>`;
// Verified 2026-10-26 (see final report for what each supports).
const AAO = 'https://www.aao.org/eye-health/drugs/eyelash-extension-facts-safety';
const CLEVELAND = 'https://health.clevelandclinic.org/are-lash-lifts-safe';
const BAD = 'https://www.skinhealthinfo.org.uk/dermatologists-issue-warning-about-uk-artificial-nail-allergy-epidemic/';
const CANCER = 'https://cancer.org.au/iheard/do-the-uv-lights-used-in-nail-salons-for-shellac-and-other-nail-polishes-cause-skin-cancer';

const L = 'lash-extensions', LL = 'lash-lift', B = 'powder-brows', G = 'gel-nails', H = 'handcrafted-nails', X = 'nail-extensions';
const was = (s: string, o: string) => opt(s, o).wasPrice;
const ext = () => `$${opt(X, 'extension').price}`; // per nail
const link = (lang: Lang, id: string, text: string) => {
  const s = services.find((v) => v.id === id)!;
  return `<a href="${lang === 'zh' ? '/zh' : ''}/${s.slug}" class="underline underline-offset-4 hover:text-fg">${text}</a>`;
};

// Shared nail-safety copy (gel products + curing lamps).
const nailSafety = {
  en: [
    `Gel colour, builder gel and the gel used with nail tips all contain (meth)acrylates. The British Association of Dermatologists has ${cite(BAD, 'warned about a rise in (meth)acrylate allergy')}: it can develop when uncured product touches the skin, and the risk is higher with home kits, insufficient technician training, or a lamp that doesn’t match the gel. Abby keeps product off your skin and cuticles and cures each layer with the lamp made for the gel system she uses.`, // OWNER-REVIEW: confirm gel brand + matching lamp
    `Nail lamps give off UV. Cancer Council Australia says ${cite(CANCER, 'nail lamps emit low levels of radiation for short exposure times')}, and suggests SPF50 or SPF50+ sunscreen on your hands 20 minutes beforehand, or fingerless gloves, if you’re concerned. You’re welcome to bring either.`,
    `If you’ve had itching, redness, swelling or nails lifting after gel before, tell Abby before you book; she may suggest seeing your GP about patch testing before having gel again.`, // OWNER-REVIEW
  ],
  zh: [
    `凝胶、建构胶和粘贴甲片用的凝胶都含有（甲基）丙烯酸酯类成分。英国皮肤科医师协会曾${cite(BAD, '就（甲基）丙烯酸酯过敏病例增多发出提醒')}：未固化的胶接触皮肤就可能致敏，自己在家用套装、美甲师培训不足、或灯与胶不匹配时风险更高。Abby 操作时会避免胶碰到皮肤和甲缘，每一层都用与所用胶系统配套的灯照干。`, // OWNER-REVIEW: confirm gel brand + matching lamp
    `美甲灯会发出紫外线。澳洲癌症协会（Cancer Council Australia）表示${cite(CANCER, '美甲灯的辐射量低、照射时间短')}；如果你仍有顾虑，可以提前 20 分钟在手上涂 SPF50 或 SPF50+ 防晒霜，或戴露指手套，欢迎自带。`,
    `如果你以前做完凝胶甲出现过发痒、发红、肿胀或甲面翘起，请在预约前告诉 Abby，她可能建议你先找家庭医生（GP）做过敏原测试，再决定是否继续做凝胶。`, // OWNER-REVIEW
  ],
};

const content: Record<string, Record<Lang, ServiceContent>> = {
  [L]: {
    en: {
      title: 'Eyelash Extensions in Burwood | Abby Eyelash',
      description: `Japanese classic and hybrid eyelash extensions by Abby in Burwood NSW. Full sets from ${$(L, 'classic-natural')}, infills from ${$(L, 'infill-2w')}. Aftercare and patch tests.`,
      h1: ['Eyelash extensions ', 'in Burwood.'],
      intro: `Eyelash extensions are single synthetic lashes bonded one at a time to your natural lashes with a cosmetic adhesive. At Abby Eyelash in Burwood NSW 2134, a Japanese classic set is ${$(L, 'classic-natural')} natural or ${$(L, 'classic-full')} full (about ${m(L, 'classic-natural')} minutes), and a hybrid set is ${$(L, 'hybrid-natural')} natural or ${$(L, 'hybrid-full')} full. Each extension lasts as long as the natural lash it sits on, so most clients book an infill every 2–3 weeks; the price depends on how soon you come back.`,
      sections: [
        {
          h2: ['Classic, hybrid or styled: ', 'which suits you?'],
          list: [
            `<strong>Japanese classic</strong>: one extension on each natural lash. A defined, mascara-like look that suits you if you have plenty of healthy natural lashes.`,
            `<strong>Hybrid</strong>: a mix of classic lashes and light, airy fans, for more texture and a little more fullness.`,
            `<strong>Natural or full</strong>: both styles come in a natural or a fuller density.`,
            `<strong>Styled set</strong> (from ${$(L, 'styled')}): a custom shape designed with you. <strong>Bottom lashes</strong> can be added (${$(L, 'bottom-natural')} natural, ${$(L, 'bottom-full')} full).`,
          ],
          after: [
            `Abby matches length, curl and thickness to your natural lashes and eye shape, so the set is never too heavy for the lash carrying it.`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['What happens ', 'during your appointment'],
          steps: [
            `A short consultation: the look you want, your eye shape, contact lenses, and any allergies or past reactions.`,
            `You lie back with your eyes closed while Abby covers your lower lashes with gel pads.`,
            `Your natural lashes are cleansed and primed so the adhesive bonds well.`,
            `Each extension is isolated onto a single natural lash, placed just off the skin so it never touches your eyelid.`,
            `Abby brushes through, checks that no lashes are stuck together, and shows you the result.`,
          ],
          after: [`Allow about ${span(L, 'classic-natural', 'classic-full', 'hybrid-natural', 'hybrid-full', 'styled')} minutes for a full set. Many clients nap.`],
        },
        {
          h2: ['How long they last ', 'and when to infill'],
          body: [
            `You shed a few natural lashes every day, and each extension falls out with its lash. To keep the set looking full, most clients book an infill every 2–3 weeks. An infill removes grown-out extensions and fills the gaps.`,
          ],
          list: [
            ...shares(L).map((o) => `${o.name.en}: ${o.pct}% of your set’s full price`),
            `After 4 weeks: full price`,
          ],
          after: [
            `For example, an infill on a Japanese classic natural set (${$(L, 'classic-natural')}) within 2 weeks is ${$(L, 'infill-2w')}. Removal on its own is ${range(L, 'removal')}; it’s free if your last set was done here and you’re having a new set straight after.`,
          ],
        },
        {
          h2: ['Before ', 'you come in'],
          list: [
            `Arrive with clean lashes: no mascara or eye makeup.`,
            `If you wear contact lenses, bring your case so you can take them out.`, // OWNER-REVIEW
            `Skip the lash curler and oil-based eye products on the day.`,
            `Tell Abby about any eye condition or past reaction to lash glue in the booking notes.`,
          ],
        },
        {
          h2: ['Aftercare: ', 'Abby’s steps'],
          list: [
            `Keep your lashes dry for the first 24 hours while the adhesive fully sets.`, // OWNER-REVIEW
            `Cleanse them gently every day or two with an oil-free lash cleanser, and brush through with a clean spoolie each morning.`, // OWNER-REVIEW
            `Avoid oil-based makeup removers, waterproof mascara and lash curlers.`,
            `Don’t rub, tug or pull extensions off: the American Academy of Ophthalmology notes that ${cite(AAO, 'rubbing or pulling can break natural lashes and damage follicles')}. Ask Abby to remove them.`,
          ],
        },
        {
          h2: ['Patch tests ', 'and sensitive eyes'],
          body: [
            `The American Academy of Ophthalmology ${cite(AAO, 'lists allergic reactions to the glue, eyelid or eye infection, and lash loss')} as possible risks. It advises choosing a trained technician who works hygienically, checking the adhesive’s ingredients, and asking for a patch test before your first set.`,
            `Abby uses a cyanoacrylate-based lash adhesive and can show you its ingredient list. First-time clients can have a free patch test at least 48 hours before their appointment. A patch test lowers the risk but can’t rule out a reaction.`, // OWNER-REVIEW: adhesive brand, patch-test price/timing
            `If your eyes become painful, very red or swollen, or your vision changes, don’t remove the extensions yourself. The AAO advises seeing an eye doctor straight away. Please wait if you have an eye infection or recent eye surgery.`, // OWNER-REVIEW: contraindication list
          ],
        },
      ],
      faq: [
        { q: 'How long does a full set take?', a: `About ${span(L, 'classic-natural', 'classic-full', 'hybrid-natural', 'hybrid-full', 'styled')} minutes for a full set. An infill takes about ${span(L, 'infill-2w', 'infill-3w', 'infill-4w')} minutes.` },
        { q: 'Can I wear mascara with extensions?', a: 'You usually won’t need it. If you do, use a water-based mascara on the tips only, never waterproof, and remove it with an oil-free cleanser.' }, // OWNER-REVIEW
        { q: 'Do eyelash extensions damage natural lashes?', a: 'Lash loss is a known risk, mostly from extensions that are too heavy, rubbing, or pulling them off. Sizing the set to your own lashes and having them removed professionally keeps that risk low.' },
        { q: 'How do I get them removed?', a: `Book a removal with Abby: ${range(L, 'removal')} on its own, or free if your last set was done here and you’re having a new set straight after. She dissolves the adhesive with a professional remover so your natural lashes aren’t pulled out. Never pick them off.` }, // OWNER-REVIEW: removal time
        { q: 'I reacted to lash glue before. Can I still have extensions?', a: 'Tell Abby before booking. A patch test is essential, and after a significant reaction a lash lift may be the better choice.' }, // OWNER-REVIEW
        CANCEL.en,
      ],
      alt: {
        hero: 'Close-up of a Japanese classic eyelash extension set applied by Abby at her Burwood studio',
        detail: 'Abby isolating a single natural lash with tweezers while applying an extension',
      },
    },
    zh: {
      title: '宝活 Burwood 嫁接睫毛 | Abby Eyelash 美睫',
      description: `悉尼宝活 Burwood 嫁接睫毛：日式单根 ${$(L, 'classic-natural')} 起，回补 ${$(L, 'infill-2w')} 起。Abby 亲手逐根嫁接，附术后护理、回补价格和皮试说明。`,
      h1: ['宝活 Burwood ', '嫁接睫毛'],
      intro: `嫁接睫毛是用专用睫毛胶，把一根根合成睫毛逐根粘在你的真睫毛上。在 Burwood NSW 2134 的 Abby Eyelash，日式单根自然款 ${$(L, 'classic-natural')}、浓密款 ${$(L, 'classic-full')}（约 ${m(L, 'classic-natural')} 分钟），开花 / 轻盈自然款 ${$(L, 'hybrid-natural')}、浓密款 ${$(L, 'hybrid-full')}。嫁接的睫毛会随真睫毛自然脱落，大多数客人每 2–3 周回补一次，越早回补越便宜。`,
      sections: [
        {
          h2: ['日式单根、开花还是造型款？', '怎么选'],
          list: [
            `<strong>日式单根</strong>：每根真睫毛接一根。效果清晰自然，像刷了睫毛膏，适合自身睫毛多且健康的人。`,
            `<strong>开花 / 轻盈</strong>：单根和轻盈的开花睫毛混搭，更有层次，也更浓一点。`,
            `<strong>自然或浓密</strong>：两种款式都可以选自然或浓密。`,
            `<strong>造型款</strong>（${$(L, 'styled')} 起）：和你一起设计的定制款式。也可以加做<strong>下睫毛</strong>（自然 ${$(L, 'bottom-natural')}，浓密 ${$(L, 'bottom-full')}）。`,
          ],
          after: [`Abby 会根据你的真睫毛和眼型选择长度、翘度和粗细，不会让嫁接睫毛给真睫毛造成负担。`], // OWNER-REVIEW
        },
        {
          h2: ['做睫毛时的', '流程'],
          steps: [
            `简单沟通：想要的效果、眼型、是否戴隐形眼镜、有没有过敏或过往不适。`,
            `你闭眼平躺，Abby 用眼贴把下睫毛隔开。`,
            `清洁并处理真睫毛，让胶水粘得更牢。`,
            `逐根分离真睫毛再嫁接，接点离开皮肤，不会碰到眼皮。`,
            `梳理检查，确保没有粘连，再给你看效果。`,
          ],
          after: [`全套预留约 ${span(L, 'classic-natural', 'classic-full', 'hybrid-natural', 'hybrid-full', 'styled')} 分钟。很多客人会直接睡一觉。`],
        },
        {
          h2: ['能维持多久，', '多久回补一次'],
          body: [
            `真睫毛每天都会自然掉几根，嫁接的睫毛也跟着一起掉。想保持浓密，大多数客人每 2–3 周回补一次，会取下长出来的旧睫毛并补满空位。`,
          ],
          list: [
            ...shares(L).map((o) => `${o.name.zh}：全套价格的 ${o.pct}%`),
            `超过 4 周：原价`,
          ],
          after: [
            `例如日式单根自然款（${$(L, 'classic-natural')}）2 周内回补为 ${$(L, 'infill-2w')}。单独卸睫毛 ${range(L, 'removal')}；如果上一次是在这里做的，卸完接着做新睫毛，免收卸睫毛费。`,
          ],
        },
        {
          h2: ['到店前', '准备'],
          list: [
            `睫毛保持干净，不要涂睫毛膏或眼妆。`,
            `戴隐形眼镜的话请带上镜盒，做之前需要摘下。`, // OWNER-REVIEW
            `当天不要夹睫毛，也不要用含油的眼部产品。`,
            `如有眼部问题或对睫毛胶有过反应，请在预约备注里写明。`,
          ],
        },
        {
          h2: ['术后护理：', 'Abby 的建议'],
          list: [
            `做完 24 小时内不要碰水，让胶水完全固化。`, // OWNER-REVIEW
            `之后每一两天用无油的睫毛清洁液轻轻清洗，每天早上用干净的睫毛刷梳一下。`, // OWNER-REVIEW
            `避免含油卸妆产品、防水睫毛膏和睫毛夹。`,
            `不要揉、扯或自己拔：美国眼科学会指出${cite(AAO, '揉搓或拉扯可能弄断真睫毛、损伤毛囊')}。需要卸睫毛请找 Abby。`,
          ],
        },
        {
          h2: ['皮试与', '敏感眼睛'],
          body: [
            `美国眼科学会（AAO）列出的可能风险包括${cite(AAO, '对睫毛胶过敏、眼睑或眼部感染以及睫毛脱落')}，并建议选择受过培训、注重卫生的美睫师，了解胶水成分，第一次做之前先做皮试。`,
            `Abby 使用氰基丙烯酸酯类睫毛胶，可以给你看成分表。首次到店的客人可以在预约前至少 48 小时免费做皮试。皮试能降低风险，但不能完全排除过敏。`, // OWNER-REVIEW: adhesive brand, patch-test price/timing
            `如果眼睛疼痛、明显发红肿胀或视力有变化，不要自己卸，AAO 建议尽快看眼科医生。有眼部感染或近期做过眼部手术，请先暂缓。`, // OWNER-REVIEW
          ],
        },
      ],
      faq: [
        { q: '做一套要多久？', a: `全套约 ${span(L, 'classic-natural', 'classic-full', 'hybrid-natural', 'hybrid-full', 'styled')} 分钟，回补约 ${span(L, 'infill-2w', 'infill-3w', 'infill-4w')} 分钟。` },
        { q: '嫁接后还能涂睫毛膏吗？', a: '一般不需要。如果要涂，只在睫毛尾端用水性睫毛膏，不要用防水款，并用无油清洁产品卸掉。' }, // OWNER-REVIEW
        { q: '嫁接睫毛会伤真睫毛吗？', a: '睫毛脱落确实是已知风险，多数来自睫毛过重、经常揉或自己拔。按你的真睫毛选合适的款式，并由专业人员卸除，风险就能降到很低。' },
        { q: '想卸掉怎么办？', a: `预约 Abby 帮你卸：单独卸睫毛 ${range(L, 'removal')}；上一次在这里做、卸完接着做新睫毛的免费。她会用专业卸睫膏溶解胶水，不会扯掉真睫毛。请不要自己拔。` }, // OWNER-REVIEW: removal time
        { q: '以前对睫毛胶过敏，还能做吗？', a: '请在预约前告诉 Abby。一定要先做皮试；如果以前反应比较严重，翘睫可能更适合你。' }, // OWNER-REVIEW
        CANCEL.zh,
      ],
      alt: {
        hero: 'Abby 在 Burwood 工作室完成的日式单根嫁接睫毛近照',
        detail: 'Abby 用镊子分离单根真睫毛并进行嫁接',
      },
    },
  },

  [LL]: {
    en: {
      title: 'Keratin Lash Lift in Burwood | Abby Eyelash',
      description: `Keratin lash lift in Burwood NSW: ${$(LL, 'keratin-lift')}, about ${m(LL, 'keratin-lift')} minutes, results last 6–8 weeks. What happens, aftercare, patch tests and who it suits.`,
      h1: ['Keratin lash lift ', 'in Burwood.'],
      intro: `A keratin lash lift curls your own lashes upward from the root with a lifting solution and a keratin treatment, so they look longer and more open without mascara or extensions. Tinting is not included. At Abby Eyelash in Burwood NSW 2134, a keratin lash lift is ${$(LL, 'keratin-lift')} and takes about ${m(LL, 'keratin-lift')} minutes. Results usually last 6–8 weeks, until those lashes naturally grow out.`,
      sections: [
        {
          h2: ['Who a lash lift ', 'suits'],
          body: [
            `A lift is ideal if your lashes are straight or point downward, you want a low-maintenance look, or you’d rather not have refills. It works with the length and number of lashes you already have. It won’t add length or density. For a fuller look, see ${link('en', L, 'eyelash extensions')}.`,
          ],
        },
        {
          h2: ['What happens ', 'during your appointment'],
          steps: [
            `A quick check of your lashes and eyes, and a chat about how much curl you want.`,
            `Your lashes are cleansed so they’re free of oil and makeup.`,
            `A soft silicone shield, sized to your lash length, is placed on the eyelid and your lashes are combed up onto it.`,
            `Lifting solution goes on the lashes (not the skin) for a time set by your lash thickness, followed by a setting solution.`,
            `Everything is gently cleaned off and a keratin treatment conditions the lashes.`,
          ],
          after: [`Your eyes stay closed the whole time, and most clients find it relaxing.`],
        },
        {
          h2: ['How long it lasts ', 'and when to rebook'],
          body: [
            `The curl stays in the lashes that were lifted. As they shed and new straight lashes grow in, the effect softens, usually after 6–8 weeks. Abby spaces lifts at least 6 weeks apart so lashes aren’t over-processed.`, // OWNER-REVIEW: minimum interval
          ],
        },
        {
          h2: ['Before ', 'you come in'],
          list: [
            `Come with clean lashes: no mascara or eye makeup.`,
            `Bring your contact-lens case if you wear lenses.`,
            `Any lash extensions need to be fully removed first.`,
          ],
        },
        {
          h2: ['Aftercare: ', 'Abby’s steps'],
          list: [
            `Keep lashes dry, and avoid steam, saunas and swimming, for 24 hours.`, // OWNER-REVIEW
            `No mascara for 24 hours; after that, skip waterproof formulas.`, // OWNER-REVIEW
            `Try not to rub your eyes or sleep face-down on the first night.`,
            `After 24 hours, keep the lash line clean. A Cleveland Clinic ophthalmologist ${cite(CLEVELAND, 'warns that not cleaning around your lashes lets things build up')}.`,
            `No lash curler needed. It can bend the lift.`,
          ],
        },
        {
          h2: ['Patch tests ', 'and sensitive eyes'],
          body: [
            `The lifting solutions are used very close to your eyes. A Cleveland Clinic ophthalmologist notes that ${cite(CLEVELAND, 'sensitivity to fragrances or added chemicals is common')}, showing as redness, swelling or a rash, and recommends a patch test beforehand, while pointing out that a patch test is not a guarantee.`,
            `First-time clients can have a free patch test at least 48 hours before their lift. If anything stings during the treatment, tell Abby straight away so she can rinse it. If irritation lasts after you leave, see your GP or optometrist.`, // OWNER-REVIEW: patch-test price/timing, products used
            `Please wait if you have an eye infection or have had recent eye surgery.`, // OWNER-REVIEW
          ],
        },
      ],
      faq: [
        { q: 'Does a lash lift hurt?', a: 'No. Your eyes stay closed and nothing touches the eye itself. Tell Abby at once if you feel any stinging.' },
        { q: 'Lash lift or eyelash extensions?', a: `A lift uses your own lashes, needs no refills and lasts 6–8 weeks. Extensions add length and fullness but need a refill every 2–3 weeks.` },
        { q: 'Can I wear mascara after a lift?', a: 'Yes, after 24 hours. Water-based mascara is easiest to remove without disturbing the curl.' }, // OWNER-REVIEW
        { q: 'My lashes are short. Will a lift work?', a: 'Lashes need enough length to wrap onto the shield. Abby checks this at the start and will tell you honestly if a lift won’t show much.' },
        CANCEL.en,
      ],
      alt: {
        hero: 'Natural lashes curled upward after a keratin lash lift at Abby Eyelash, Burwood',
        detail: 'Lashes combed onto a silicone shield during a lash lift',
      },
    },
    zh: {
      title: '宝活 Burwood 角蛋白翘睫 | Abby Eyelash',
      description: `悉尼宝活 Burwood 角蛋白翘睫：${$(LL, 'keratin-lift')}，约 ${m(LL, 'keratin-lift')} 分钟，效果约 6–8 周。流程、术后护理、皮试和适合人群说明。`,
      h1: ['宝活 Burwood ', '角蛋白翘睫'],
      intro: `翘睫（也叫睫毛翘、角蛋白翘睫）是用专用药水把你自己的睫毛从根部往上定型，再做角蛋白护理，不用睫毛膏、不用嫁接也显得更长更有神。不含染色。在 Burwood NSW 2134 的 Abby Eyelash，角蛋白翘睫 ${$(LL, 'keratin-lift')}，约 ${m(LL, 'keratin-lift')} 分钟。效果一般维持 6–8 周，直到这批睫毛自然换掉。`,
      sections: [
        {
          h2: ['哪些人', '适合翘睫'],
          body: [
            `睫毛天生直、往下垂，想要省心、不想定期补的人最适合。翘睫只改变你现有睫毛的弧度，不会增加长度或数量；想要更浓密的效果，可以看看${link('zh', L, '嫁接睫毛')}。`,
          ],
        },
        {
          h2: ['做翘睫时的', '流程'],
          steps: [
            `先看看睫毛和眼睛的状态，确认你想要的卷翘程度。`,
            `清洁睫毛，去掉油脂和眼妆。`,
            `按你的睫毛长度选合适的硅胶垫贴在眼皮上，把睫毛梳到垫子上。`,
            `软化药水只涂在睫毛上，不碰皮肤，停留时间按睫毛粗细调整，然后上定型药水。`,
            `最后清洁干净，用角蛋白给睫毛做营养护理。`,
          ],
          after: [`全程闭眼，大多数客人都觉得很放松。`],
        },
        {
          h2: ['能维持多久，', '多久再做'],
          body: [
            `卷翘会保留在做过的睫毛上。随着它们自然脱落、新的直睫毛长出来，效果会慢慢变淡，一般 6–8 周。Abby 建议两次翘睫至少间隔 6 周，避免睫毛过度受损。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['到店前', '准备'],
          list: [
            `睫毛保持干净，不涂睫毛膏和眼妆。`,
            `戴隐形眼镜请带上镜盒。`,
            `如果有嫁接睫毛，需要先完全卸掉。`,
          ],
        },
        {
          h2: ['术后护理：', 'Abby 的建议'],
          list: [
            `24 小时内不要碰水，避免蒸汽、桑拿和游泳。`, // OWNER-REVIEW
            `24 小时内不涂睫毛膏，之后也尽量不用防水款。`, // OWNER-REVIEW
            `尽量不要揉眼睛，第一晚别趴着睡。`,
            `24 小时后要保持睫毛根部清洁。克利夫兰诊所的眼科医生提醒，${cite(CLEVELAND, '不清洁睫毛周围会让脏东西堆积')}。`,
            `不需要再用睫毛夹，反而可能把弧度夹乱。`,
          ],
        },
        {
          h2: ['皮试与', '敏感眼睛'],
          body: [
            `翘睫药水和染膏都要在离眼睛很近的地方使用。克利夫兰诊所的眼科医生指出，${cite(CLEVELAND, '对香料或添加化学成分敏感的情况很常见')}，表现为发红、肿胀或起疹，并建议事先做皮试，同时提醒皮试并不能百分之百保证不过敏。`,
            `首次到店的客人可以在预约前至少 48 小时免费做皮试。过程中如果感到刺痛，请马上告诉 Abby，她会立刻冲洗。离店后仍有不适，请看家庭医生（GP）或验光师。`, // OWNER-REVIEW
            `有眼部感染或近期做过眼部手术，请先暂缓。`, // OWNER-REVIEW
          ],
        },
      ],
      faq: [
        { q: '翘睫会痛吗？', a: '不会。全程闭眼，药水不接触眼球。如果有刺痛感请马上告诉 Abby。' },
        { q: '翘睫和嫁接睫毛怎么选？', a: '翘睫用的是你自己的睫毛，不用补，维持 6–8 周；嫁接能增加长度和浓密度，但每 2–3 周要补一次。' },
        { q: '翘睫后能涂睫毛膏吗？', a: '24 小时后可以。水性睫毛膏最好卸，不容易破坏卷度。' }, // OWNER-REVIEW
        { q: '睫毛很短也能做吗？', a: '睫毛需要有一定长度才能贴到硅胶垫上。Abby 开始前会先看，如果效果不明显会直接告诉你。' },
        CANCEL.zh,
      ],
      alt: {
        hero: 'Abby Eyelash（Burwood）角蛋白翘睫后自然上翘的睫毛',
        detail: '翘睫过程中睫毛被梳到硅胶垫上定型',
      },
    },
  },

  [B]: {
    en: {
      title: 'Powder Brows in Burwood | Semi-Permanent | Abby Eyelash',
      description: `Semi-permanent powder brows by Abby in Burwood NSW: ${$(B, 'powder')} (was $${was(B, 'powder')}), about ${m(B, 'powder')} minutes, one free touch-up within 3 months. Healing and aftercare.`,
      h1: ['Powder brows ', 'in Burwood.'],
      intro: `Powder brows (also called ombré brows or a powder brow tattoo) are a semi-permanent brow treatment: fine dots of cosmetic pigment are placed in the skin to build a soft, filled-in look, like a light brow powder that doesn’t wash off. At Abby Eyelash in Burwood NSW 2134, powder brows are currently ${$(B, 'powder')} (usually $${was(B, 'powder')}) and take about ${m(B, 'powder')} minutes, including mapping the shape with you. One touch-up within 3 months is included free.`,
      sections: [
        {
          h2: ['Who powder brows ', 'suit'],
          body: [
            `Powder brows suit you if you fill your brows in most days, want a soft, defined shape that stays put, or have sparse or uneven brows. The finish is soft and powdery rather than hair-like strokes.`,
            `Because pigment fades and shifts over time, the look is designed to be natural rather than heavy. Abby maps the shape to your face and natural brow line before any pigment goes in.`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['What happens ', 'during your appointment'],
          steps: [
            `Consultation: the shape and depth you want, your skin, and any health questions (see below).`,
            `Brow mapping: Abby measures and draws the shape, and you approve it before she starts.`,
            `Pigment is applied in fine layers of tiny dots to build an even, powdery finish.`,
            `The brows are cleaned and Abby explains the aftercare for the next two weeks.`,
          ],
          after: [`Allow about ${m(B, 'powder')} minutes in total.`],
        },
        {
          h2: ['Healing ', 'and the free touch-up'],
          body: [
            `Straight after the appointment the brows look darker and sharper than the final result. Over the first one to two weeks they flake lightly and soften, and some areas can look patchy while the skin heals; this is normal.`, // OWNER-REVIEW: healing timeline
            `Your free touch-up within 3 months fills any spots that didn’t hold and fine-tunes the shape. Touch-ups aren’t booked online: message Abby by WhatsApp, SMS or WeChat to arrange it.`,
            `Powder brows usually last one to three years, depending on your skin, sun exposure and skincare. A paid colour refresh keeps them looking fresh after that.`, // OWNER-REVIEW: longevity, refresh pricing
          ],
        },
        {
          h2: ['Before ', 'you come in'],
          list: [
            `Come with your usual brows (no tinting or waxing in the week before) so Abby can see your natural shape.`, // OWNER-REVIEW
            `Avoid alcohol and caffeine on the day; they can increase bleeding.`, // OWNER-REVIEW
            `Tell Abby when you book if you are pregnant or breastfeeding, take blood thinners, use retinoids on your face, have a skin condition on your brows, or tend to scar or keloid. She may suggest waiting or checking with your GP first.`, // OWNER-REVIEW: contraindication list
          ],
        },
        {
          h2: ['Aftercare: ', 'Abby’s steps'],
          list: [
            `Keep the brows clean and dry, and follow the aftercare balm instructions Abby gives you.`, // OWNER-REVIEW
            `For about 10 days avoid swimming, saunas, heavy sweating, makeup on the brows and direct sun.`, // OWNER-REVIEW
            `Don’t pick or scratch the flakes; let them fall off on their own.`,
            `Once healed, sunscreen on your brows helps the colour last.`,
          ],
        },
      ],
      faq: [
        { q: 'Does it hurt?', a: 'Most clients describe it as a scratchy feeling rather than pain. Tell Abby if anything feels uncomfortable and she will pause.' }, // OWNER-REVIEW: numbing
        { q: 'How long do powder brows last?', a: 'Usually one to three years. Oily skin, sun and some skincare make pigment fade faster.' }, // OWNER-REVIEW
        { q: 'Is the touch-up included?', a: `Yes. One touch-up within 3 months of your appointment is free. Message Abby to book it; it isn’t available online.` },
        { q: 'Powder brows or microblading?', a: 'Microblading draws hair-like strokes; powder brows build a soft shaded finish with tiny dots. Abby offers powder brows.' },
        CANCEL.en,
      ],
      alt: {
        hero: 'Soft, shaded powder brows after a semi-permanent brow appointment at Abby Eyelash, Burwood',
        detail: 'Abby mapping a brow shape before a powder brows treatment',
      },
    },
    zh: {
      title: '宝活 Burwood 半永久雾眉 | Abby Eyelash',
      description: `悉尼宝活 Burwood 半永久雾眉：现价 ${$(B, 'powder')}（原价 $${was(B, 'powder')}），约 ${m(B, 'powder')} 分钟，3 个月内免费补色一次。流程、恢复期与护理说明。`,
      h1: ['宝活 Burwood ', '半永久雾眉'],
      intro: `雾眉（也就是常说的半永久纹眉、粉雾眉）是一种半永久眉妆：用很细的点状手法把色料打入皮肤浅层，形成柔和的粉雾感，像淡淡的眉粉，但不会被洗掉。在 Burwood NSW 2134 的 Abby Eyelash，雾眉现价 ${$(B, 'powder')}（原价 $${was(B, 'powder')}），约 ${m(B, 'powder')} 分钟，包含和你一起设计眉形。3 个月内免费补色一次。`,
      sections: [
        {
          h2: ['哪些人', '适合雾眉'],
          body: [
            `如果你几乎每天都要画眉、想要一个不会掉的柔和眉形，或者眉毛稀疏、不对称，雾眉都很合适。效果是柔和的粉雾感，而不是一根根的线条。`,
            `色料会随时间慢慢变淡，所以整体设计以自然为主，不会太浓。Abby 会先根据你的脸型和原生眉形设计眉形，再开始上色。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['做雾眉时的', '流程'],
          steps: [
            `沟通：想要的眉形和深浅、皮肤状况，以及下面提到的健康情况。`,
            `设计眉形：Abby 测量并画出眉形，你确认后才开始。`,
            `用细密的点状手法分层上色，做出均匀的粉雾效果。`,
            `清洁眉毛，并讲解之后两周的护理方法。`,
          ],
          after: [`整个过程约 ${m(B, 'powder')} 分钟。`],
        },
        {
          h2: ['恢复期与', '免费补色'],
          body: [
            `刚做完时颜色会比最终效果深、线条也更明显。之后一到两周会轻微脱皮、慢慢变柔和，恢复期间局部看起来不均匀是正常的。`, // OWNER-REVIEW
            `3 个月内的免费补色，会补上没有留住颜色的地方，并微调眉形。补色不开放在线预约，请通过 WhatsApp、短信或微信联系 Abby 约时间。`,
            `雾眉一般能维持一到三年，取决于肤质、日晒和护肤习惯。之后可以付费补色，让颜色保持新鲜。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['到店前', '准备'],
          list: [
            `做之前一周不要染眉或修眉，让 Abby 看到你本来的眉形。`, // OWNER-REVIEW
            `当天避免喝酒和咖啡，它们可能让出血更多。`, // OWNER-REVIEW
            `如果你怀孕或在哺乳期、在服用抗凝血药、脸上使用 A 醇类产品、眉部有皮肤问题，或者是容易留疤、疤痕体质，请在预约时告诉 Abby。她可能建议你先暂缓，或先咨询家庭医生（GP）。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['术后护理：', 'Abby 的建议'],
          list: [
            `保持眉毛清洁干燥，按 Abby 给你的修复膏说明使用。`, // OWNER-REVIEW
            `大约 10 天内避免游泳、桑拿、大量出汗、眉部化妆和直接日晒。`, // OWNER-REVIEW
            `不要抠或抓掉皮屑，让它自然脱落。`,
            `恢复后在眉部涂防晒，颜色能维持更久。`,
          ],
        },
      ],
      faq: [
        { q: '做雾眉疼吗？', a: '大多数客人觉得是轻微的刮擦感，而不是疼。如果有不舒服可以随时告诉 Abby，她会停下来。' }, // OWNER-REVIEW
        { q: '雾眉能维持多久？', a: '一般一到三年。油性皮肤、日晒和部分护肤品会让颜色褪得更快。' }, // OWNER-REVIEW
        { q: '补色包含在价格里吗？', a: '包含。做完后 3 个月内免费补色一次，请直接联系 Abby 预约，不开放在线预约。' },
        { q: '雾眉和线条眉有什么区别？', a: '线条眉是画出一根根仿真眉毛；雾眉是用细小的点做出柔和的粉雾效果。Abby 做的是雾眉。' },
        CANCEL.zh,
      ],
      alt: {
        hero: 'Abby Eyelash（Burwood）完成的柔和半永久雾眉',
        detail: 'Abby 在做雾眉前为客人设计眉形',
      },
    },
  },

  [H]: {
    en: {
      title: 'Hand-Painted Nail Art in Burwood | Abby Eyelash',
      description: `Custom hand-painted nail art designed with you and painted by Abby in Burwood NSW. Priced per design, from about ${m(H, 'nail-art')} minutes. Extensions ${ext()} per nail.`,
      h1: ['Hand-painted nail art ', 'in Burwood.'],
      intro: `Hand-painted nail art is a custom design that Abby plans with you and paints by hand with fine brushes, not stickers or printed wraps. At Abby Eyelash in Burwood NSW 2134, each design is priced individually because it depends on the detail and the number of nails; Abby confirms the price with you before she starts. Allow at least ${m(H, 'nail-art')} minutes. Painted over gel and sealed with a gel top coat, it typically lasts 2–3 weeks.`, // OWNER-REVIEW: wear time
      sections: [
        {
          h2: ['Designs ', 'made with you'],
          body: [
            `Bring screenshots from Xiaohongshu, Instagram or Pinterest, or just a mood, and Abby will adapt the idea to your nail shape, length and skin tone. Popular requests include fine florals, line art, characters and seasonal sets.`,
            `Add your references to the booking notes; Abby replies with a price when she confirms your appointment.`, // OWNER-REVIEW: quoting process
          ],
        },
        {
          h2: ['What happens ', 'during your appointment'],
          steps: [
            `Design chat: references, colours, which nails get art.`,
            `Prep: shaping, cuticles pushed back and tidied, a light buff of the surface.`,
            `Gel base, builder gel and background colour, each layer cured under the lamp.`,
            `Hand-painting layer by layer with fine brushes, curing between details.`,
            `Gel top coat to seal the design, then cuticle oil.`,
          ],
        },
        {
          h2: ['How long it lasts ', 'and adding length'],
          body: [
            `Expect 2–3 weeks of wear before regrowth shows at the cuticle. Most clients rebook at around 3 weeks.`, // OWNER-REVIEW
            `Want longer nails under your art? Add ${link('en', X, 'nail extensions')} when you book: ${ext()} per nail.`,
          ],
        },
        {
          h2: ['Before ', 'you come in'],
          list: [
            `Add your reference photos or ideas to the booking notes.`,
            `Come with bare nails, or tell Abby if there’s gel or extensions to remove first.`, // OWNER-REVIEW: removal time/charge
            `Skip hand cream right before your appointment; oils can stop gel from bonding.`,
          ],
        },
        {
          h2: ['Aftercare: ', 'Abby’s steps'],
          list: [
            `Wear gloves for cleaning and washing up.`,
            `Massage in cuticle oil daily to keep the nail and skin flexible.`,
            `Don’t pick or peel the gel: it takes layers of your nail with it.`,
            `Book a professional soak-off rather than removing it yourself.`,
          ],
        },
        { h2: ['Gel allergy ', 'and UV lamps'], body: nailSafety.en },
      ],
      faq: [
        { q: 'How much does hand-painted nail art cost?', a: 'It is priced per design, because the time depends on the detail and how many nails are painted. Abby confirms the price before she starts.' },
        { q: 'Can you copy a design I found online?', a: 'Abby uses it as a reference and paints her own version by hand, adjusting the scale and colours so it suits your nails.' },
        { q: 'How long will hand-painted nails last?', a: 'Usually 2–3 weeks on gel. Wearing gloves for chores and using cuticle oil helps.' }, // OWNER-REVIEW
        { q: 'Can I have nail art on extensions?', a: `Yes. Add extensions when you book (${ext()} per nail).` },
        CANCEL.en,
      ],
      alt: {
        hero: 'Hand-painted floral nail art by Abby on short natural nails, Burwood',
        detail: 'Abby painting fine line art on a nail with a detail brush',
      },
    },
    zh: {
      title: '宝活 Burwood 手绘造型美甲 | Abby Eyelash',
      description: `悉尼宝活 Burwood 手绘造型美甲：和你一起设计，由 Abby 亲手绘制。按款式报价，约 ${m(H, 'nail-art')} 分钟起。延长每只 ${ext()}。`,
      h1: ['宝活 Burwood ', '手绘造型'],
      intro: `手绘造型是 Abby 和你一起设计、再用细笔一笔一笔手绘的定制款，不用贴纸，也不是印花甲片。在 Burwood NSW 2134 的 Abby Eyelash，每款都单独报价，价格取决于图案的复杂程度和画几根，Abby 会在开始前跟你确认价格。时间请预留 ${m(H, 'nail-art')} 分钟以上。图案画在凝胶上，再用封层封住，一般能维持 2–3 周。`, // OWNER-REVIEW
      sections: [
        {
          h2: ['和你一起', '设计'],
          body: [
            `可以带上小红书、Instagram 或 Pinterest 的截图，或者只说想要的感觉，Abby 会根据你的甲型、长度和肤色调整。常见款式有细碎小花、线条画、卡通人物和节日主题。`,
            `把参考图写在预约备注里，Abby 确认预约时会告诉你价格。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['做美甲时的', '流程'],
          steps: [
            `沟通设计：参考图、颜色、哪几根画图案。`,
            `修型、推死皮、修整甲缘，轻轻打磨甲面。`,
            `上底胶、建构胶和底色，每层都照灯固化。`,
            `用细笔一层层手绘，细节之间照灯。`,
            `上封层锁住图案，最后涂指缘油。`,
          ],
        },
        {
          h2: ['能维持多久，', '想要加长怎么办'],
          body: [
            `一般能戴 2–3 周，之后甲根会露出新长的指甲，大多数客人约 3 周后再来。`, // OWNER-REVIEW
            `想要更长的指甲？预约时加选${link('zh', X, '延长甲')}，每只 ${ext()}。`,
          ],
        },
        {
          h2: ['到店前', '准备'],
          list: [
            `把参考图或想法写在预约备注里。`,
            `最好是裸甲到店；如果有旧的凝胶甲或延长甲需要卸，请提前告诉 Abby。`, // OWNER-REVIEW
            `来之前别涂护手霜，油分会影响凝胶附着。`,
          ],
        },
        {
          h2: ['日常护理：', 'Abby 的建议'],
          list: [
            `做家务、洗碗时戴手套。`,
            `每天涂指缘油，让指甲和甲周保持柔软。`,
            `不要抠或撕凝胶，会把自己的甲面一起撕掉。`,
            `想卸甲请找专业卸甲，不要自己硬撕。`,
          ],
        },
        { h2: ['凝胶过敏与', '美甲灯'], body: nailSafety.zh },
      ],
      faq: [
        { q: '手绘造型多少钱？', a: '按款式报价，因为时间取决于图案的细节和画几根。Abby 会在开始前确认价格。' },
        { q: '网上看到的款式能照着做吗？', a: '可以作为参考。Abby 会亲手画出自己的版本，并调整比例和颜色，让它更适合你的指甲。' },
        { q: '手绘美甲能维持多久？', a: '做在凝胶上一般 2–3 周。做家务戴手套、常涂指缘油会更持久。' }, // OWNER-REVIEW
        { q: '延长甲上可以画图案吗？', a: `可以，预约时加选延长即可（每只 ${ext()}）。` },
        CANCEL.zh,
      ],
      alt: {
        hero: 'Abby 在 Burwood 为自然短甲手绘的小花美甲',
        detail: 'Abby 用细笔在指甲上手绘线条图案',
      },
    },
  },

  [G]: {
    en: {
      title: 'Gel Nails Burwood | Cat-Eye · Aurora · French | Abby Eyelash',
      description: `Gel nails in Burwood NSW by Abby: solid colour ${$(G, 'solid')}, cat-eye or aurora ${$(G, 'cat-eye')}, French ${$(G, 'french')}, builder gel included. Extensions ${ext()} per nail.`,
      h1: ['Gel nails ', 'in Burwood.'],
      intro: `Gel nails (a gel manicure) are coloured gel cured under a lamp, so they leave the studio dry and glossy and stay chip-resistant for weeks. At Abby Eyelash in Burwood NSW 2134, every gel set includes a builder gel layer for strength: solid colour is ${$(G, 'solid')} (about ${m(G, 'solid')} minutes), cat-eye and aurora are ${$(G, 'cat-eye')} (about ${m(G, 'cat-eye')} minutes), and French is ${$(G, 'french')} (about ${m(G, 'french')} minutes). Extensions can be added for ${ext()} per nail.`,
      sections: [
        {
          h2: ['Four finishes: ', 'which one?'],
          list: [
            `<strong>Solid colour</strong> (${$(G, 'solid')}): one shade, from sheer nude to bold, in a glossy or matte top coat.`, // OWNER-REVIEW: matte option
            `<strong>Cat-eye</strong> (${$(G, 'cat-eye')}): magnetic gel that a magnet pulls into a shimmering band of light, like a cat’s eye.`,
            `<strong>Aurora</strong> (${$(G, 'aurora')}): a pearly, colour-shifting finish that changes with the light.`,
            `<strong>French</strong> (${$(G, 'french')}): a natural base with crisp painted tips, classic or in colour.`,
          ],
          after: [`Want a custom design rather than a finish? See ${link('en', H, 'hand-painted nail art')}.`],
        },
        {
          h2: ['What happens ', 'during your appointment'],
          steps: [
            `Shape and length agreed, then nails filed.`,
            `Cuticles gently pushed back and tidied; the surface is lightly buffed and cleansed so the gel bonds.`,
            `Base and builder gel for strength, cured under the lamp.`,
            `Colour or finish in thin layers, each cured, then a gel top coat.`,
            `Cuticle oil to finish.`,
          ],
        },
        {
          h2: ['How long it lasts ', 'and removal'],
          body: [
            `Gel nails typically last 2–3 weeks, and most clients rebook at about 3 weeks as the nail grows out.`, // OWNER-REVIEW
            `If you’re arriving with gel on, mention it in your booking notes so Abby can allow time to soak it off properly.`, // OWNER-REVIEW: removal time/charge
          ],
        },
        {
          h2: ['Before ', 'you come in'],
          list: [
            `Skip hand cream just before your appointment; oils can affect how gel bonds.`,
            `Bring a photo of the colour or finish you love if you have one.`,
          ],
        },
        {
          h2: ['Aftercare: ', 'Abby’s steps'],
          list: [
            `Wear gloves for cleaning and washing up.`,
            `Use cuticle oil daily.`,
            `Don’t pick or peel gel: it strips layers of the nail plate. Book a soak-off instead.`,
          ],
        },
        { h2: ['Gel allergy ', 'and UV lamps'], body: nailSafety.en },
      ],
      faq: [
        { q: 'How long does a gel set take?', a: `About ${span(G, 'solid', 'cat-eye', 'aurora', 'french')} minutes, plus time for any extensions.` },
        { q: 'Is builder gel included?', a: 'Yes. Every gel set has a builder gel layer for strength at no extra cost.' },
        { q: 'Is gel bad for my nails?', a: 'Most damage comes from peeling gel off or rough removal, which strips layers of the nail. Having it soaked off properly and using cuticle oil keeps nails in good condition.' }, // OWNER-REVIEW
        { q: 'Can I add length?', a: `Yes. Add extensions when you book: ${ext()} per nail, on any finish.` },
        CANCEL.en,
      ],
      alt: {
        hero: 'Glossy gel nails on short rounded nails, Abby Eyelash Burwood',
        detail: 'Gel being cured under an LED nail lamp',
      },
    },
    zh: {
      title: '宝活 Burwood 凝胶美甲 | 猫眼 · 极光 · 法式 | Abby Eyelash',
      description: `悉尼宝活 Burwood 凝胶美甲：单色 ${$(G, 'solid')}，猫眼或极光 ${$(G, 'cat-eye')}，法式 ${$(G, 'french')}，已含 Gel 建构。延长每只 ${ext()}。`,
      h1: ['宝活 Burwood ', '凝胶美甲'],
      intro: `凝胶美甲（也叫光疗甲）是照灯固化的彩色凝胶，做完就干、有光泽，几周都不容易掉色。在 Burwood NSW 2134 的 Abby Eyelash，每一套凝胶美甲都已包含 Gel 建构，让指甲更坚固：单色 ${$(G, 'solid')}（约 ${m(G, 'solid')} 分钟），猫眼和极光 ${$(G, 'cat-eye')}（约 ${m(G, 'cat-eye')} 分钟），法式 ${$(G, 'french')}（约 ${m(G, 'french')} 分钟）。需要加长可加选延长，每只 ${ext()}。`,
      sections: [
        {
          h2: ['四种款式，', '怎么选'],
          list: [
            `<strong>单色</strong>（${$(G, 'solid')}）：一种颜色，从透明裸色到浓郁色都可以，亮面或哑光封层。`, // OWNER-REVIEW
            `<strong>猫眼</strong>（${$(G, 'cat-eye')}）：用磁铁吸出一道流动的光带，像猫的眼睛。`,
            `<strong>极光</strong>（${$(G, 'aurora')}）：珠光感、随光线变色的效果。`,
            `<strong>法式</strong>（${$(G, 'french')}）：自然底色配干净的甲尖，经典白边或彩色都可以。`,
          ],
          after: [`想要定制图案？可以看看${link('zh', H, '手绘造型')}。`],
        },
        {
          h2: ['做美甲时的', '流程'],
          steps: [
            `确定甲型和长度，修型。`,
            `轻推死皮、修整甲缘，轻轻打磨并清洁甲面，帮助凝胶附着。`,
            `上底胶和建构胶增加硬度，照灯固化。`,
            `分薄层上颜色或做效果，每层照灯，最后上封层。`,
            `最后涂指缘油。`,
          ],
        },
        {
          h2: ['能维持多久，', '怎么卸'],
          body: [
            `凝胶美甲一般维持 2–3 周，大多数客人约 3 周后随着指甲长出来再做。`, // OWNER-REVIEW
            `如果到店时手上有旧的凝胶甲，请在预约备注里说明，Abby 会预留时间帮你正确泡卸。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['到店前', '准备'],
          list: [
            `来之前别涂护手霜，油分会影响附着。`,
            `有喜欢的颜色或款式可以带张图。`,
          ],
        },
        {
          h2: ['日常护理：', 'Abby 的建议'],
          list: [
            `做家务、洗碗时戴手套。`,
            `每天涂指缘油。`,
            `不要抠或撕凝胶，会把甲面一层层撕薄，请预约专业卸甲。`,
          ],
        },
        { h2: ['凝胶过敏与', '美甲灯'], body: nailSafety.zh },
      ],
      faq: [
        { q: '做一套凝胶美甲要多久？', a: `约 ${span(G, 'solid', 'cat-eye', 'aurora', 'french')} 分钟，加延长需要另外的时间。` },
        { q: 'Gel 建构要另外收费吗？', a: '不用。每一套凝胶美甲都已包含 Gel 建构。' },
        { q: '凝胶美甲伤指甲吗？', a: '损伤大多来自硬撕或粗暴卸甲，会把甲面一层层带掉。专业泡卸、平时涂指缘油，指甲就能保持健康。' }, // OWNER-REVIEW
        { q: '可以加长吗？', a: `可以，预约时加选延长，每只 ${ext()}，任何款式都可以加。` },
        CANCEL.zh,
      ],
      alt: {
        hero: 'Abby Eyelash（Burwood）完成的亮面凝胶美甲，短圆甲型',
        detail: '凝胶在 LED 美甲灯下照灯固化',
      },
    },
  },

  [X]: {
    en: {
      title: 'Nail Extensions in Burwood | $6 per Nail | Abby Eyelash',
      description: `Nail tip extensions in Burwood NSW by Abby: ${ext()} per nail, added to any gel or hand-painted design. How it works, how long it lasts and aftercare.`,
      h1: ['Nail extensions ', 'in Burwood.'],
      intro: `Nail extensions add length and shape with a nail tip bonded to your natural nail and finished in gel. At Abby Eyelash in Burwood NSW 2134, extensions are ${ext()} per nail and are added to any ${link('en', G, 'gel nail')} or ${link('en', H, 'hand-painted')} design, so you only pay for the nails you want longer. When you book, choose your design first and then the number of nails to extend.`,
      sections: [
        {
          h2: ['How the price ', 'works'],
          list: [
            `Choose a design: gel solid colour from ${$(G, 'solid')}, cat-eye, aurora, French, or hand-painted art.`,
            `Add extensions at ${ext()} per nail, from one nail to all ten.`,
            `For example, a solid-colour gel set with all ten nails extended is $${opt(G, 'solid').price + 10 * opt(X, 'extension').price}.`,
          ],
        },
        {
          h2: ['What happens ', 'during your appointment'],
          steps: [
            `Length and shape agreed (round, almond, square and more).`,
            `Prep: shaping, cuticle care and a light buff.`,
            `A tip sized to each nail is bonded and shaped.`,
            `Builder gel, your colour or design, and a gel top coat, each cured under the lamp.`,
            `Cuticle oil to finish.`,
          ],
        },
        {
          h2: ['How long they last ', 'and removal'],
          body: [
            `Extensions usually wear well for about 3 weeks. As your nail grows the balance point moves forward, so leaving them much longer makes lifting and breaks more likely.`, // OWNER-REVIEW
            `Have extensions soaked off professionally; pulling them off tears the natural nail.`,
          ],
        },
        {
          h2: ['Before ', 'you come in'],
          list: [
            `Come with bare nails, or tell Abby in the booking notes if you have product on.`, // OWNER-REVIEW: removal time/charge
            `Bring photos of the shape and length you like.`,
            `Let Abby know if any nail is damaged, sore or infected; extensions can’t go on it until it heals.`,
          ],
        },
        {
          h2: ['Aftercare: ', 'Abby’s steps'],
          list: [
            `Wear gloves for cleaning and washing up.`,
            `Use cuticle oil daily.`,
            `Don’t use your nails as tools, and don’t pick or bite a lifted edge. Message Abby for a repair.`,
          ],
        },
        { h2: ['Gel allergy ', 'and UV lamps'], body: nailSafety.en },
      ],
      faq: [
        { q: 'How much are nail extensions?', a: `${ext()} per nail, on top of the design you choose.` },
        { q: 'Can I extend just a few nails?', a: 'Yes. You choose how many nails to extend, from one to ten, and pay only for those.' },
        { q: 'Will extensions ruin my natural nails?', a: 'Damage usually comes from peeling, biting or forcing extensions off. With proper soak-off removal your natural nails stay in good shape.' },
        { q: 'How do I book extensions?', a: 'On the booking page choose Gel Nails or Hand-painted Nail Art, pick your design, then set how many nails to extend.' },
        CANCEL.en,
      ],
      alt: {
        hero: 'Almond-shaped nail extensions in a soft pink gel finish, Abby Eyelash Burwood',
        detail: 'A nail tip being shaped during an extension appointment',
      },
    },
    zh: {
      title: '宝活 Burwood 延长甲 | 每只 $6 | Abby Eyelash',
      description: `悉尼宝活 Burwood 甲片延长：每只 ${ext()}，可加在任何凝胶或手绘款上。流程、能维持多久和护理方法。`,
      h1: ['宝活 Burwood ', '延长甲'],
      intro: `延长甲是在真指甲上接上甲片、再用凝胶完成的加长方式，马上就有长度和甲型。在 Burwood NSW 2134 的 Abby Eyelash，延长每只 ${ext()}，可以加在任何${link('zh', G, '凝胶美甲')}或${link('zh', H, '手绘造型')}上，想加长几只就付几只。预约时先选款式，再选要延长几只。`,
      sections: [
        {
          h2: ['价格', '怎么算'],
          list: [
            `先选款式：凝胶单色 ${$(G, 'solid')} 起，还有猫眼、极光、法式或手绘造型。`,
            `再加选延长，每只 ${ext()}，一只到十只都可以。`,
            `例如凝胶单色加十只延长，共 $${opt(G, 'solid').price + 10 * opt(X, 'extension').price}。`,
          ],
        },
        {
          h2: ['做延长甲时的', '流程'],
          steps: [
            `确定长度和甲型（圆形、杏仁、方形等）。`,
            `修型、甲缘护理、轻磨甲面。`,
            `每根手指选合适的甲片，粘贴并塑形。`,
            `上建构胶、颜色或图案，再上封层，每层照灯固化。`,
            `最后涂指缘油。`,
          ],
        },
        {
          h2: ['能维持多久，', '怎么卸'],
          body: [
            `延长甲一般能戴 3 周左右。指甲长长后受力点会往前移，拖太久更容易翘边或断裂。`, // OWNER-REVIEW
            `请专业泡卸，硬拔会撕伤真指甲。`,
          ],
        },
        {
          h2: ['到店前', '准备'],
          list: [
            `最好裸甲到店；如果手上有旧甲，请在预约备注里说明。`, // OWNER-REVIEW
            `带上喜欢的甲型和长度参考图。`,
            `如果有指甲受损、疼痛或感染，请告诉 Abby，痊愈前不能做延长。`,
          ],
        },
        {
          h2: ['日常护理：', 'Abby 的建议'],
          list: [
            `做家务、洗碗时戴手套。`,
            `每天涂指缘油。`,
            `不要把指甲当工具用，翘边了别抠也别咬，请联系 Abby 修补。`,
          ],
        },
        { h2: ['凝胶过敏与', '美甲灯'], body: nailSafety.zh },
      ],
      faq: [
        { q: '延长甲多少钱？', a: `每只 ${ext()}，另加你选的款式价格。` },
        { q: '可以只延长几只吗？', a: '可以。一只到十只自己选，只按延长的数量收费。' },
        { q: '延长甲会伤真指甲吗？', a: '损伤通常来自撕、咬或硬拔。正确泡卸，真指甲就能保持健康。' },
        { q: '怎么预约延长甲？', a: '在预约页选凝胶美甲或手绘造型，选好款式后再选要延长几只。' },
        CANCEL.zh,
      ],
      alt: {
        hero: 'Abby Eyelash（Burwood）完成的杏仁形淡粉色延长甲',
        detail: '延长甲过程中为甲片塑形',
      },
    },
  },
};

export const serviceContent = (serviceId: string, lang: Lang): ServiceContent => {
  const c = content[serviceId]?.[lang];
  if (!c) throw new Error(`service-content: missing copy for ${serviceId}/${lang}`);
  return c;
};

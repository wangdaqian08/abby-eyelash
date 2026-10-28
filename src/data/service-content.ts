// Long-form service-page copy, EN + natively written Simplified Chinese (owner reviews).
// Prices/durations are interpolated from services.ts so the visible copy always matches the price table and JSON-LD.
// Body strings are trusted HTML (rendered with set:html) so they can carry citation links.
// Every `// OWNER-REVIEW` marks a claim Abby must confirm before launch (products, aftercare, policies).
import { services, type Lang } from './services';

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
// Infill share of the full-set price, from Abby's menu (after 4 weeks: full price).
const INFILL = [['2', 50], ['3', 70], ['4', 85]] as const;

const cite = (href: string, text: string) =>
  `<a href="${href}" target="_blank" rel="noopener" class="underline underline-offset-4 hover:text-fg">${text}</a>`;
// Verified 2026-10-26 (see final report for what each supports).
const AAO = 'https://www.aao.org/eye-health/drugs/eyelash-extension-facts-safety';
const CLEVELAND = 'https://health.clevelandclinic.org/are-lash-lifts-safe';
const BAD = 'https://www.skinhealthinfo.org.uk/dermatologists-issue-warning-about-uk-artificial-nail-allergy-epidemic/';
const CANCER = 'https://cancer.org.au/iheard/do-the-uv-lights-used-in-nail-salons-for-shellac-and-other-nail-polishes-cause-skin-cancer';

const L = 'lash-extensions', LL = 'lash-lift', H = 'handcrafted-nails', P = 'nail-polish', X = 'nail-extensions';
const link = (lang: Lang, id: string, text: string) => {
  const s = services.find((v) => v.id === id)!;
  return `<a href="${lang === 'zh' ? '/zh' : ''}/${s.slug}" class="underline underline-offset-4 hover:text-fg">${text}</a>`;
};

// Shared nail-safety copy (gel products + curing lamps).
const nailSafety = {
  en: [
    `Gel polish, builder gel and soft-gel tips all contain (meth)acrylates. The British Association of Dermatologists has ${cite(BAD, 'warned about a rise in (meth)acrylate allergy')}: it can develop when uncured product touches the skin, and the risk is higher with home kits, insufficient technician training, or a lamp that doesn’t match the gel. Abby keeps product off your skin and cuticles and cures each layer with the lamp made for the gel system she uses.`, // OWNER-REVIEW: confirm gel brand + matching lamp
    `Nail lamps give off UV. Cancer Council Australia says ${cite(CANCER, 'nail lamps emit low levels of radiation for short exposure times')}, and suggests SPF50 or SPF50+ sunscreen on your hands 20 minutes beforehand, or fingerless gloves, if you’re concerned. You’re welcome to bring either.`,
    `If you’ve had itching, redness, swelling or nails lifting after gel before, tell Abby before you book; she may suggest regular polish instead and seeing your GP about patch testing.`, // OWNER-REVIEW
  ],
  zh: [
    `甲油胶、建构胶（BIAB）和 Gel-X 软甲片都含有（甲基）丙烯酸酯类成分。英国皮肤科医师协会曾${cite(BAD, '就（甲基）丙烯酸酯过敏病例增多发出提醒')}：未固化的胶接触皮肤就可能致敏，自己在家用套装、美甲师培训不足、或灯与胶不匹配时风险更高。Abby 操作时会避免胶碰到皮肤和甲缘，每一层都用与所用胶系统配套的灯照干。`, // OWNER-REVIEW: confirm gel brand + matching lamp
    `美甲灯会发出紫外线。澳洲癌症协会（Cancer Council Australia）表示${cite(CANCER, '美甲灯的辐射量低、照射时间短')}；如果你仍有顾虑，可以提前 20 分钟在手上涂 SPF50 或 SPF50+ 防晒霜，或戴露指手套，欢迎自带。`,
    `如果你以前做完光疗甲出现过发痒、发红、肿胀或甲面翘起，请在预约前告诉 Abby，她可能建议你改做普通甲油，并建议你找家庭医生（GP）做过敏原测试。`, // OWNER-REVIEW
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
          after: [`Allow about ${m(L, 'classic-natural')}–${m(L, 'hybrid-full')} minutes for a full set. Many clients nap.`],
        },
        {
          h2: ['How long they last ', 'and when to infill'],
          body: [
            `You shed a few natural lashes every day, and each extension falls out with its lash. To keep the set looking full, most clients book an infill every 2–3 weeks. An infill removes grown-out extensions and fills the gaps.`,
          ],
          list: [
            ...INFILL.map(([w, pct]) => `Within ${w} weeks: ${pct}% of your set’s full price`),
            `After 4 weeks: full price`,
          ],
          after: [
            `For example, an infill on a Japanese classic natural set (${$(L, 'classic-natural')}) within 2 weeks is ${$(L, 'infill-2w')}. Removal is $10–$20.`,
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
        { q: 'How long does a full set take?', a: `About ${m(L, 'classic-natural')}–${m(L, 'hybrid-full')} minutes for a full set. An infill takes about ${m(L, 'infill-2w')} minutes.` },
        { q: 'Can I wear mascara with extensions?', a: 'You usually won’t need it. If you do, use a water-based mascara on the tips only, never waterproof, and remove it with an oil-free cleanser.' }, // OWNER-REVIEW
        { q: 'Do eyelash extensions damage natural lashes?', a: 'Lash loss is a known risk, mostly from extensions that are too heavy, rubbing, or pulling them off. Sizing the set to your own lashes and having them removed professionally keeps that risk low.' },
        { q: 'How do I get them removed?', a: 'Book a removal ($10–$20) with Abby. She dissolves the adhesive with a professional remover so your natural lashes aren’t pulled out. Never pick them off.' }, // OWNER-REVIEW: removal time
        { q: 'I reacted to lash glue before. Can I still have extensions?', a: 'Tell Abby before booking. A patch test is essential, and after a significant reaction a lash lift may be the better choice.' }, // OWNER-REVIEW
        { q: 'What is your cancellation policy?', a: 'Please give at least 24 hours’ notice to cancel or reschedule.' }, // OWNER-REVIEW (SPEC placeholder)
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
          after: [`全套预留约 ${m(L, 'classic-natural')}–${m(L, 'hybrid-full')} 分钟。很多客人会直接睡一觉。`],
        },
        {
          h2: ['能维持多久，', '多久回补一次'],
          body: [
            `真睫毛每天都会自然掉几根，嫁接的睫毛也跟着一起掉。想保持浓密，大多数客人每 2–3 周回补一次，会取下长出来的旧睫毛并补满空位。`,
          ],
          list: [
            ...INFILL.map(([w, pct]) => `${w} 周内：全套价格的 ${pct}%`),
            `超过 4 周：原价`,
          ],
          after: [
            `例如日式单根自然款（${$(L, 'classic-natural')}）2 周内回补为 ${$(L, 'infill-2w')}。卸睫毛 $10–$20。`,
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
        { q: '做一套要多久？', a: `全套约 ${m(L, 'classic-natural')}–${m(L, 'hybrid-full')} 分钟，回补约 ${m(L, 'infill-2w')} 分钟。` },
        { q: '嫁接后还能涂睫毛膏吗？', a: '一般不需要。如果要涂，只在睫毛尾端用水性睫毛膏，不要用防水款，并用无油清洁产品卸掉。' }, // OWNER-REVIEW
        { q: '嫁接睫毛会伤真睫毛吗？', a: '睫毛脱落确实是已知风险，多数来自睫毛过重、经常揉或自己拔。按你的真睫毛选合适的款式，并由专业人员卸除，风险就能降到很低。' },
        { q: '想卸掉怎么办？', a: '预约 Abby 帮你卸（$10–$20）。她会用专业卸睫膏溶解胶水，不会扯掉真睫毛。请不要自己拔。' }, // OWNER-REVIEW: removal time
        { q: '以前对睫毛胶过敏，还能做吗？', a: '请在预约前告诉 Abby。一定要先做皮试；如果以前反应比较严重，翘睫可能更适合你。' }, // OWNER-REVIEW
        { q: '取消预约有什么规定？', a: '如需取消或改期，请至少提前 24 小时告知。' }, // OWNER-REVIEW
      ],
      alt: {
        hero: 'Abby 在 Burwood 工作室完成的日式单根嫁接睫毛近照',
        detail: 'Abby 用镊子分离单根真睫毛并进行嫁接',
      },
    },
  },

  [LL]: {
    en: {
      title: 'Lash Lift & Tint in Burwood | Abby Eyelash',
      description: `Lash lift and tint in Burwood NSW: ${$(LL, 'lift-tint')}, about ${m(LL, 'lift-tint')} minutes, results last 6–8 weeks. What happens, aftercare, patch tests and who it suits.`,
      h1: ['Lash lift & tint ', 'in Burwood.'],
      intro: `A lash lift curls your own lashes upward from the root with a lifting solution, and a tint darkens them so they look longer without mascara or extensions. At Abby Eyelash in Burwood NSW 2134, a lash lift and tint is ${$(LL, 'lift-tint')} and takes about ${m(LL, 'lift-tint')} minutes. Results usually last 6–8 weeks, until those lashes naturally grow out.`,
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
            `Tint is applied to darken the lashes, then everything is gently cleaned off and the lashes are conditioned.`,
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
            `The lifting and tint solutions are used very close to your eyes. A Cleveland Clinic ophthalmologist notes that ${cite(CLEVELAND, 'sensitivity to fragrances or added chemicals is common')}, showing as redness, swelling or a rash, and recommends a patch test beforehand, while pointing out that a patch test is not a guarantee.`,
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
        { q: 'What is your cancellation policy?', a: 'Please give at least 24 hours’ notice to cancel or reschedule.' }, // OWNER-REVIEW
      ],
      alt: {
        hero: 'Natural lashes curled and tinted after a lash lift at Abby Eyelash, Burwood',
        detail: 'Lashes combed onto a silicone shield during a lash lift',
      },
    },
    zh: {
      title: '宝活 Burwood 睫毛翘睫 + 染色 | Abby Eyelash',
      description: `悉尼宝活 Burwood 翘睫 + 染色：${$(LL, 'lift-tint')}，约 ${m(LL, 'lift-tint')} 分钟，效果约 6–8 周。流程、术后护理、皮试和适合人群说明。`,
      h1: ['宝活 Burwood ', '翘睫 + 染色'],
      intro: `翘睫（也叫睫毛翘、角蛋白翘睫）是用专用药水把你自己的睫毛从根部往上定型，再染深颜色，不用睫毛膏、不用嫁接也显得更长。在 Burwood NSW 2134 的 Abby Eyelash，翘睫 + 染色 ${$(LL, 'lift-tint')}，约 ${m(LL, 'lift-tint')} 分钟。效果一般维持 6–8 周，直到这批睫毛自然换掉。`,
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
            `染色让睫毛更黑，最后清洁干净并做营养护理。`,
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
        { q: '取消预约有什么规定？', a: '如需取消或改期，请至少提前 24 小时告知。' }, // OWNER-REVIEW
      ],
      alt: {
        hero: 'Abby Eyelash（Burwood）翘睫 + 染色后自然上翘的睫毛',
        detail: '翘睫过程中睫毛被梳到硅胶垫上定型',
      },
    },
  },

  [H]: {
    en: {
      title: 'Hand-Painted Nail Art in Burwood | Abby Eyelash',
      description: `Custom hand-painted nail art designed with you and painted by Abby in Burwood NSW. From ${$(H, 'nail-art')}, about ${m(H, 'nail-art')} minutes. How it works, wear time and aftercare.`,
      h1: ['Hand-painted nail art ', 'in Burwood.'],
      intro: `Handcrafted nails are custom nail art that Abby designs with you and paints by hand with fine brushes, not stickers or printed wraps. At Abby Eyelash in Burwood NSW 2134, hand-painted nail art starts from ${$(H, 'nail-art')} for about ${m(H, 'nail-art')} minutes, and the final price depends on how detailed the design is. Painted over a gel base and sealed with a gel top coat, it typically lasts 2–3 weeks.`, // OWNER-REVIEW: gel base, wear time
      sections: [
        {
          h2: ['Designs ', 'made with you'],
          body: [
            `Bring screenshots from Xiaohongshu, Instagram or Pinterest, or just a mood, and Abby will adapt the idea to your nail shape, length and skin tone. Popular requests include fine florals, line art, characters, detailed French tips and seasonal sets.`,
            `A few accent nails sit at the lower end of the price; a full set of detailed art costs more. Abby confirms the price before she starts painting.`, // OWNER-REVIEW: pricing tiers
          ],
        },
        {
          h2: ['What happens ', 'during your appointment'],
          steps: [
            `Design chat: references, colours, which nails get art.`,
            `Prep: shaping, cuticles pushed back and tidied, a light buff of the surface.`,
            `Gel base and background colour, each layer cured under the lamp.`,
            `Hand-painting layer by layer with fine brushes, curing between details.`,
            `Gel top coat to seal the design, then cuticle oil.`,
          ],
        },
        {
          h2: ['How long it lasts ', 'and adding length'],
          body: [
            `Expect 2–3 weeks of wear before regrowth shows at the cuticle. Most clients rebook at around 3 weeks.`, // OWNER-REVIEW
            `Want longer nails under your art? Combine it with BIAB or Gel-X from ${link('en', X, 'nail extensions')} and mention it when you book so enough time is set aside.`, // OWNER-REVIEW: combined booking
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
            `Use your fingertips, not your nails, to open cans and peel labels.`,
            `Book a professional soak-off rather than removing it yourself.`,
          ],
        },
        { h2: ['Gel allergy ', 'and UV lamps'], body: nailSafety.en },
      ],
      faq: [
        { q: 'How much does custom nail art cost?', a: `From ${$(H, 'nail-art')}. Simple accents cost less than a full set of detailed art, and Abby confirms the price before she starts.` },
        { q: 'Can you copy a design I found online?', a: 'Abby uses it as a reference and paints her own version by hand, adjusting the scale and colours so it suits your nails.' },
        { q: 'How long will hand-painted nails last?', a: 'Usually 2–3 weeks on a gel base. Wearing gloves for chores and using cuticle oil helps.' }, // OWNER-REVIEW
        { q: 'Can I have nail art on extensions?', a: 'Yes. Pair it with BIAB or Gel-X and mention it when booking.' },
        { q: 'What is your cancellation policy?', a: 'Please give at least 24 hours’ notice to cancel or reschedule.' }, // OWNER-REVIEW
      ],
      alt: {
        hero: 'Hand-painted floral nail art by Abby on short natural nails, Burwood',
        detail: 'Abby painting fine line art on a nail with a detail brush',
      },
    },
    zh: {
      title: '宝活 Burwood 手绘美甲 | 定制款 | Abby Eyelash',
      description: `悉尼宝活 Burwood 手绘定制美甲：和你一起设计，由 Abby 亲手绘制。${$(H, 'nail-art')} 起，约 ${m(H, 'nail-art')} 分钟。流程、持久度与护理说明。`,
      h1: ['宝活 Burwood ', '手绘定制美甲'],
      intro: `手绘美甲是 Abby 和你一起设计、再用细笔一笔一笔手绘的定制款，不用贴纸，也不是印花甲片。在 Burwood NSW 2134 的 Abby Eyelash，手绘定制款 ${$(H, 'nail-art')} 起，约 ${m(H, 'nail-art')} 分钟，最终价格取决于图案的复杂程度。图案画在甲油胶底色上，再用封层封住，一般能维持 2–3 周。`, // OWNER-REVIEW
      sections: [
        {
          h2: ['和你一起', '设计'],
          body: [
            `可以带上小红书、Instagram 或 Pinterest 的截图，或者只说想要的感觉，Abby 会根据你的甲型、长度和肤色调整。常见款式有细碎小花、线条画、卡通人物、精致法式和节日主题。`,
            `只画几根点缀价格较低，整套细节图案会高一些。Abby 会在动笔前先跟你确认价格。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['做美甲时的', '流程'],
          steps: [
            `沟通设计：参考图、颜色、哪几根画图案。`,
            `修型、推死皮、修整甲缘，轻轻打磨甲面。`,
            `上底胶和底色，每层都照灯固化。`,
            `用细笔一层层手绘，细节之间照灯。`,
            `上封层锁住图案，最后涂指缘油。`,
          ],
        },
        {
          h2: ['能维持多久，', '想要加长怎么办'],
          body: [
            `一般能戴 2–3 周，之后甲根会露出新长的指甲，大多数客人约 3 周后再来。`, // OWNER-REVIEW
            `想要更长的指甲？可以搭配${link('zh', X, '延长甲')}（BIAB 或 Gel-X），预约时备注一下，方便预留足够时间。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['到店前', '准备'],
          list: [
            `把参考图或想法写在预约备注里。`,
            `最好是裸甲到店；如果有旧的甲油胶或延长甲需要卸，请提前告诉 Abby。`, // OWNER-REVIEW
            `来之前别涂护手霜，油分会影响甲油胶附着。`,
          ],
        },
        {
          h2: ['日常护理：', 'Abby 的建议'],
          list: [
            `做家务、洗碗时戴手套。`,
            `每天涂指缘油，让指甲和甲周保持柔软。`,
            `不要抠或撕甲油胶，会把自己的甲面一起撕掉。`,
            `开易拉罐、撕标签用指腹，不要用指甲。`,
            `想卸甲请找专业卸甲，不要自己硬撕。`,
          ],
        },
        { h2: ['甲油胶过敏与', '美甲灯'], body: nailSafety.zh },
      ],
      faq: [
        { q: '手绘美甲多少钱？', a: `${$(H, 'nail-art')} 起。简单点缀比整套细节图便宜，Abby 会在开始前确认价格。` },
        { q: '网上看到的款式能照着做吗？', a: '可以作为参考。Abby 会亲手画出自己的版本，并调整比例和颜色，让它更适合你的指甲。' },
        { q: '手绘美甲能维持多久？', a: '做在甲油胶底上一般 2–3 周。做家务戴手套、常涂指缘油会更持久。' }, // OWNER-REVIEW
        { q: '延长甲上可以画图案吗？', a: '可以，搭配 BIAB 或 Gel-X，预约时备注即可。' },
        { q: '取消预约有什么规定？', a: '如需取消或改期，请至少提前 24 小时告知。' }, // OWNER-REVIEW
      ],
      alt: {
        hero: 'Abby 在 Burwood 为自然短甲手绘的小花美甲',
        detail: 'Abby 用细笔在指甲上手绘线条图案',
      },
    },
  },

  [P]: {
    en: {
      title: 'Gel Manicure & Nail Polish in Burwood | Abby Eyelash',
      description: `Gel manicure (${$(P, 'gel')}, ${m(P, 'gel')} min) and regular polish (${$(P, 'regular')}, ${m(P, 'regular')} min) in Burwood NSW, with cuticle prep and shaping. Wear time and aftercare.`,
      h1: ['Gel & regular polish ', 'in Burwood.'],
      intro: `Abby offers two kinds of manicure colour: gel polish, cured under a lamp so it’s dry and chip-resistant when you leave, and regular polish, which air-dries and is easy to change at home. At Abby Eyelash in Burwood NSW 2134, a gel manicure is ${$(P, 'gel')} (about ${m(P, 'gel')} minutes) and regular polish is ${$(P, 'regular')} (about ${m(P, 'regular')} minutes), both with cuticle prep and shaping. Gel usually lasts 2–3 weeks; regular polish typically lasts about a week before it chips.`, // OWNER-REVIEW: wear times
      sections: [
        {
          h2: ['Gel or regular: ', 'how to choose'],
          list: [
            `<strong>Gel manicure</strong>: fully dry when you leave, stays glossy for 2–3 weeks, and is removed by soaking off, never peeling. Good for holidays and busy weeks.`,
            `<strong>Regular polish</strong>: lower cost, no lamp, and you can take it off at home with polish remover whenever you like. Good if you change colour often.`,
          ],
          after: [`Want a design rather than a plain colour? Hand-painted art is booked as ${link('en', H, 'handcrafted nails')}.`],
        },
        {
          h2: ['What happens ', 'during your appointment'],
          steps: [
            `Shape and length agreed, then nails filed.`,
            `Cuticles gently pushed back and tidied.`,
            `For gel, the surface is lightly buffed and cleansed so it bonds.`,
            `Base coat, two coats of colour and a top coat, cured under the lamp for gel or air-dried for regular.`,
            `Cuticle oil to finish.`,
          ],
        },
        {
          h2: ['How long it lasts ', 'and removal'],
          body: [
            `Gel typically lasts 2–3 weeks, and most clients rebook at about 3 weeks as the nail grows out. Regular polish usually lasts around a week, depending on how much you use your hands.`, // OWNER-REVIEW
            `If you’re arriving with gel on, mention it in your booking notes so Abby can allow time to soak it off properly.`, // OWNER-REVIEW: removal time/charge
          ],
        },
        {
          h2: ['Before ', 'you come in'],
          list: [
            `Skip hand cream just before your appointment; oils can affect how polish bonds.`,
            `Bring a photo of the colour you love if you have one.`,
            `For regular polish, allow time afterwards: it needs a while to harden fully.`,
          ],
        },
        {
          h2: ['Aftercare: ', 'Abby’s steps'],
          list: [
            `Regular polish: avoid hot water and heavy hand use for a couple of hours while it hardens.`, // OWNER-REVIEW
            `Gel: wear gloves for cleaning and washing up.`,
            `Use cuticle oil daily.`,
            `Don’t pick or peel gel: it strips layers of the nail plate. Book a soak-off instead.`,
          ],
        },
        { h2: ['Gel allergy ', 'and UV lamps'], body: [...nailSafety.en.slice(0, 2), `Regular polish isn’t cured under a lamp, so it’s an easy alternative if you’d rather avoid UV or gel.`] },
      ],
      faq: [
        { q: 'How long does a gel manicure take?', a: `About ${m(P, 'gel')} minutes. Regular polish takes about ${m(P, 'regular')} minutes.` },
        { q: 'Is gel bad for my nails?', a: 'Most damage comes from peeling gel off or rough removal, which strips layers of the nail. Having it soaked off properly and using cuticle oil keeps nails in good condition.' }, // OWNER-REVIEW
        { q: 'Which lasts longer for a holiday?', a: 'Gel. It is dry when you leave and usually lasts 2–3 weeks, while regular polish lasts around a week.' },
        { q: 'Can I add nail art?', a: `Yes. Hand-painted designs are booked as Handcrafted Nails, from ${$(H, 'nail-art')}.` },
        { q: 'What is your cancellation policy?', a: 'Please give at least 24 hours’ notice to cancel or reschedule.' }, // OWNER-REVIEW
      ],
      alt: {
        hero: 'Glossy nude gel manicure on short rounded nails, Abby Eyelash Burwood',
        detail: 'Gel polish being cured under an LED nail lamp',
      },
    },
    zh: {
      title: '宝活 Burwood 光疗甲 · 普通甲油 | Abby Eyelash',
      description: `悉尼宝活 Burwood 光疗甲（${$(P, 'gel')}，${m(P, 'gel')} 分钟）和普通甲油（${$(P, 'regular')}，${m(P, 'regular')} 分钟），含修型和甲缘护理。持久度与护理说明。`,
      h1: ['宝活 Burwood ', '光疗甲与普通甲油'],
      intro: `Abby 提供两种纯色美甲：光疗甲（甲油胶）需要照灯固化，做完就干、不易掉色；普通甲油自然风干，回家随时可以自己卸了换色。在 Burwood NSW 2134 的 Abby Eyelash，光疗甲 ${$(P, 'gel')}（约 ${m(P, 'gel')} 分钟），普通甲油 ${$(P, 'regular')}（约 ${m(P, 'regular')} 分钟），都包含修型和甲缘护理。光疗甲一般能维持 2–3 周，普通甲油大约一周后开始掉色。`, // OWNER-REVIEW
      sections: [
        {
          h2: ['光疗甲还是普通甲油？', '怎么选'],
          list: [
            `<strong>光疗甲</strong>：做完即干，亮泽维持 2–3 周，需要专业泡卸，不能硬撕。适合旅行或忙碌的时候。`,
            `<strong>普通甲油</strong>：价格更低，不用照灯，在家用洗甲水就能随时卸掉。适合喜欢经常换颜色的人。`,
          ],
          after: [`想要图案而不只是纯色？手绘款请预约${link('zh', H, '手绘定制美甲')}。`],
        },
        {
          h2: ['做美甲时的', '流程'],
          steps: [
            `确定甲型和长度，修型。`,
            `轻推死皮，修整甲缘。`,
            `光疗甲会轻轻打磨并清洁甲面，帮助附着。`,
            `底油、两层颜色、封层；光疗甲每层照灯，普通甲油自然风干。`,
            `最后涂指缘油。`,
          ],
        },
        {
          h2: ['能维持多久，', '怎么卸'],
          body: [
            `光疗甲一般维持 2–3 周，大多数客人约 3 周后随着指甲长出来再做。普通甲油大约一周，取决于你平时用手的多少。`, // OWNER-REVIEW
            `如果到店时手上有旧的甲油胶，请在预约备注里说明，Abby 会预留时间帮你正确泡卸。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['到店前', '准备'],
          list: [
            `来之前别涂护手霜，油分会影响附着。`,
            `有喜欢的颜色可以带张图。`,
            `做普通甲油的话，结束后要给它一点时间完全变硬。`,
          ],
        },
        {
          h2: ['日常护理：', 'Abby 的建议'],
          list: [
            `普通甲油：做完后几个小时内避免热水和用力用手。`, // OWNER-REVIEW
            `光疗甲：做家务、洗碗时戴手套。`,
            `每天涂指缘油。`,
            `不要抠或撕甲油胶，会把甲面一层层撕薄，请预约专业卸甲。`,
          ],
        },
        { h2: ['甲油胶过敏与', '美甲灯'], body: [...nailSafety.zh.slice(0, 2), `普通甲油不需要照灯，如果你想避开紫外线或甲油胶，可以选择普通甲油。`] },
      ],
      faq: [
        { q: '光疗甲要做多久？', a: `约 ${m(P, 'gel')} 分钟；普通甲油约 ${m(P, 'regular')} 分钟。` },
        { q: '光疗甲伤指甲吗？', a: '损伤大多来自硬撕或粗暴卸甲，会把甲面一层层带掉。专业泡卸、平时涂指缘油，指甲就能保持健康。' }, // OWNER-REVIEW
        { q: '去旅行选哪种更持久？', a: '光疗甲。做完就干，一般维持 2–3 周；普通甲油大约一周。' },
        { q: '可以加图案吗？', a: `可以，手绘款请预约手绘定制美甲，${$(H, 'nail-art')} 起。` },
        { q: '取消预约有什么规定？', a: '如需取消或改期，请至少提前 24 小时告知。' }, // OWNER-REVIEW
      ],
      alt: {
        hero: 'Abby Eyelash（Burwood）完成的裸色光疗甲，短圆甲型',
        detail: '甲油胶在 LED 美甲灯下照灯固化',
      },
    },
  },

  [X]: {
    en: {
      title: 'BIAB & Gel-X Nail Extensions in Burwood | Abby Eyelash',
      description: `BIAB (${$(X, 'biab')}) and Gel-X (${$(X, 'gel-x')}) nail extensions in Burwood NSW, about ${m(X, 'gel-x')} minutes; infills ${$(X, 'infill')}. Which to choose, how long they last and aftercare.`,
      h1: ['Nail extensions ', 'in Burwood.'],
      intro: `Abby offers two nail extension systems: BIAB, a builder gel that strengthens your natural nails and can add a little length, and Gel-X, soft-gel tips that cover the whole nail for instant length and shape. At Abby Eyelash in Burwood NSW 2134, BIAB is ${$(X, 'biab')} and Gel-X is ${$(X, 'gel-x')}, each taking about ${m(X, 'gel-x')} minutes, and an infill is ${$(X, 'infill')} (about ${m(X, 'infill')} minutes). Most clients come back every 3–4 weeks for an infill or a fresh set.`, // OWNER-REVIEW: wear time
      sections: [
        {
          h2: ['BIAB or Gel-X: ', 'which is right for you?'],
          list: [
            `<strong>BIAB</strong> (“builder in a bottle”): a thicker builder gel layered over your natural nail for strength and structure. Choose it if you want your own nails to grow without breaking, or a natural look with a little extra length. Grown-out BIAB can be infilled rather than removed.`,
            `<strong>Gel-X</strong>: pre-shaped soft-gel tips, bonded with gel adhesive and cured. Choose it for instant length and a set shape (almond, coffin, square) when your natural nails are short. Gel-X is soaked off and replaced with a new set rather than infilled.`, // OWNER-REVIEW: genuine Aprés Gel-X? infill policy
          ],
        },
        {
          h2: ['What happens ', 'during your appointment'],
          steps: [
            `Consultation: length, shape and colour.`,
            `Prep: shaping, cuticle care, a light buff, then dehydrator and primer.`,
            `BIAB: builder gel layered, cured and filed to shape. Gel-X: a tip sized to each nail, bonded with gel adhesive and cured.`,
            `Colour or nail art, then a top coat.`,
            `Cuticle oil to finish.`,
          ],
        },
        {
          h2: ['How long they last ', 'and infills'],
          body: [
            `Both systems usually wear well for 3–4 weeks. As your nail grows, the extension moves forward and the balance point shifts, so leaving it much longer makes lifting and breaks more likely.`, // OWNER-REVIEW
            `A BIAB infill (about ${m(X, 'infill')} minutes, ${$(X, 'infill')}) files back the old product and rebuilds the regrowth area, so your natural nail stays protected as it grows.`,
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
            `Use cuticle oil daily to keep the nail and gel flexible.`,
            `Don’t use your nails as tools, and don’t pick or bite a lifted edge. Book a repair.`,
            `Have extensions soaked off professionally; pulling them off tears the natural nail.`,
          ],
        },
        { h2: ['Gel allergy ', 'and UV lamps'], body: nailSafety.en },
      ],
      faq: [
        { q: 'Is BIAB the same as gel polish?', a: 'No. BIAB is a thicker builder gel that adds strength and structure; gel polish is a thin colour layer. BIAB can be worn clear, tinted, or with colour on top.' },
        { q: 'How long does BIAB last?', a: 'Usually 3–4 weeks before an infill is due.' }, // OWNER-REVIEW
        { q: 'Can Gel-X be infilled?', a: 'Abby soaks Gel-X off and applies a fresh set rather than infilling it, which keeps the tip and your natural nail well bonded.' }, // OWNER-REVIEW
        { q: 'Will extensions ruin my natural nails?', a: 'Damage usually comes from peeling, biting or forcing extensions off. With proper soak-off removal and regular infills, your natural nails stay in good shape.' },
        { q: 'Can I add nail art?', a: `Yes. Hand-painted art on top is booked as Handcrafted Nails, from ${$(H, 'nail-art')}.` },
        { q: 'What is your cancellation policy?', a: 'Please give at least 24 hours’ notice to cancel or reschedule.' }, // OWNER-REVIEW
      ],
      alt: {
        hero: 'Almond-shaped Gel-X nail extensions in a soft pink finish, Abby Eyelash Burwood',
        detail: 'Builder gel being shaped over a natural nail during a BIAB appointment',
      },
    },
    zh: {
      title: '宝活 Burwood 延长甲 | BIAB · Gel-X | Abby Eyelash',
      description: `悉尼宝活 Burwood 延长甲：BIAB 加固甲 ${$(X, 'biab')}，Gel-X 延长甲 ${$(X, 'gel-x')}，约 ${m(X, 'gel-x')} 分钟；补甲 ${$(X, 'infill')}。怎么选、能维持多久和护理方法。`,
      h1: ['宝活 Burwood ', '延长甲：BIAB 与 Gel-X'],
      intro: `Abby 提供两种延长甲：BIAB 加固甲是用建构胶加固你的真指甲，也可以稍微加长；Gel-X 是覆盖整个甲面的软胶甲片，马上就有长度和甲型。在 Burwood NSW 2134 的 Abby Eyelash，BIAB ${$(X, 'biab')}，Gel-X ${$(X, 'gel-x')}，各约 ${m(X, 'gel-x')} 分钟；补甲 ${$(X, 'infill')}（约 ${m(X, 'infill')} 分钟）。大多数客人每 3–4 周来补甲或重做一套。`, // OWNER-REVIEW
      sections: [
        {
          h2: ['BIAB 还是 Gel-X？', '怎么选'],
          list: [
            `<strong>BIAB 加固甲</strong>：比甲油胶更厚的建构胶，叠在真指甲上增加硬度和弧度。适合想把自己的指甲留长又怕断、或想要自然微加长效果的人。长出来后可以补甲，不用全部卸掉。`,
            `<strong>Gel-X 延长甲</strong>：预先塑形的软胶甲片，用甲片胶粘贴后照灯固化。适合自身指甲短、想马上拥有长度和固定甲型（杏仁、梯形、方形）的人。Gel-X 到期后泡卸重做，不做补甲。`, // OWNER-REVIEW
          ],
        },
        {
          h2: ['做延长甲时的', '流程'],
          steps: [
            `沟通长度、甲型和颜色。`,
            `修型、甲缘护理、轻磨甲面，再上干燥剂和结合剂。`,
            `BIAB：分层上建构胶、照灯、打磨塑形。Gel-X：每根手指选合适的甲片，粘贴后照灯固化。`,
            `上颜色或画图案，再上封层。`,
            `最后涂指缘油。`,
          ],
        },
        {
          h2: ['能维持多久，', '什么时候补甲'],
          body: [
            `两种延长甲一般能戴 3–4 周。指甲长长后，延长部分会往前移、受力点改变，拖太久更容易翘边或断裂。`, // OWNER-REVIEW
            `BIAB 补甲约 ${m(X, 'infill')} 分钟，${$(X, 'infill')}，会磨掉旧胶并重建新长出来的部分，让真指甲在生长时继续受到保护。`,
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
            `每天涂指缘油，保持指甲和胶面柔韧。`,
            `不要把指甲当工具用，翘边了别抠也别咬，请预约修补。`,
            `请专业泡卸，硬拔会撕伤真指甲。`,
          ],
        },
        { h2: ['甲油胶过敏与', '美甲灯'], body: nailSafety.zh },
      ],
      faq: [
        { q: 'BIAB 和甲油胶一样吗？', a: '不一样。BIAB 是更厚的建构胶，用来增加硬度和结构；甲油胶是很薄的颜色层。BIAB 可以做透明、裸色，也可以再上颜色。' },
        { q: 'BIAB 能维持多久？', a: '一般 3–4 周后需要补甲。' }, // OWNER-REVIEW
        { q: 'Gel-X 可以补甲吗？', a: 'Abby 会把 Gel-X 泡卸后重新做一套，而不是补甲，这样甲片和真指甲贴合得更牢。' }, // OWNER-REVIEW
        { q: '延长甲会伤真指甲吗？', a: '损伤通常来自撕、咬或硬拔。正确泡卸、按时补甲，真指甲就能保持健康。' },
        { q: '可以加图案吗？', a: `可以，手绘图案请预约手绘定制美甲，${$(H, 'nail-art')} 起。` },
        { q: '取消预约有什么规定？', a: '如需取消或改期，请至少提前 24 小时告知。' }, // OWNER-REVIEW
      ],
      alt: {
        hero: 'Abby Eyelash（Burwood）完成的杏仁形淡粉色 Gel-X 延长甲',
        detail: 'BIAB 加固甲过程中在真指甲上塑形建构胶',
      },
    },
  },
};

export const serviceContent = (serviceId: string, lang: Lang): ServiceContent => {
  const c = content[serviceId]?.[lang];
  if (!c) throw new Error(`service-content: missing copy for ${serviceId}/${lang}`);
  return c;
};

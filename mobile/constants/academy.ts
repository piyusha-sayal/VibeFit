/**
 * Beauty Academy content.
 *
 * Every guide here has a real body. The library is deliberately small rather
 * than padded with titles that open an empty screen.
 */
export interface Guide {
  slug: string;
  title: string;
  category: 'colour' | 'face' | 'makeup' | 'fashion' | 'routine';
  minutes: number;
  level: 'Start here' | 'Going deeper';
  summary: string;
  sections: { heading: string; body: string }[];
  related?: { label: string; route: string }[];
}

export const ACADEMY_GUIDES: Guide[] = [
  {
    slug: 'understanding-personal-color',
    title: 'Understanding personal colour',
    category: 'colour',
    minutes: 5,
    level: 'Start here',
    summary: 'What a season actually describes, and what it cannot tell you.',
    sections: [
      {
        heading: 'Three things, not one',
        body: 'A season combines undertone (whether your skin leans warm, cool, neutral or olive), depth (how light or deep your colouring is overall) and clarity (whether colours look better clear and saturated, or softened and greyed). Two people can share an undertone and still suit different palettes because their depth differs.',
      },
      {
        heading: 'Why a photo can only estimate',
        body: 'Every phone camera white-balances a scene before you ever see it. Warm indoor light makes skin read warmer; a cool screen makes it read cooler. That is why MyLookFit reports a confidence rather than a verdict, and always offers a runner-up season to compare against.',
      },
      {
        heading: 'How to check it yourself',
        body: 'Stand by a window, no makeup, hair back. Hold two fabrics of the same lightness but different undertone under your chin. Watch the shadows under your eyes and around your mouth rather than the fabric. The better colour softens them.',
      },
      {
        heading: 'What it is not',
        body: 'A season is not a rule and not a ranking. Colours outside your palette are not mistakes; they simply ask more of the rest of the outfit. Wear the red you love, and let the palette guide what sits next to your face.',
      },
    ],
    related: [{ label: 'My colour report', route: '/colors/report' }],
  },
  {
    slug: 'choosing-a-haircut',
    title: 'Choosing a haircut that fits your week',
    category: 'face',
    minutes: 4,
    level: 'Start here',
    summary: 'Face shape is half the answer. Texture, upkeep and your morning are the other half.',
    sections: [
      {
        heading: 'Start with proportion, not shape names',
        body: 'The useful question is not "what shape am I" but "where does the eye land". A cut adds width where it has volume and length where it falls straight. A rounder face is often served by height through the crown; a longer one by width at the cheekbone.',
      },
      {
        heading: 'Texture decides what a cut will do',
        body: 'The same layered cut behaves differently on straight, wavy, curly and coily hair. Curls shrink, so length is cut long and worn shorter. Fine straight hair loses weight fast with layers. Bring your texture, not a photo of someone else.',
      },
      {
        heading: 'Cost the upkeep before you commit',
        body: 'A blunt bob needs a trim every six weeks to stay blunt. A shag forgives growth. Ask the stylist what it looks like at eight weeks, not only on the day.',
      },
    ],
    related: [{ label: 'Hair recommendations', route: '/analysis/hair' }],
  },
  {
    slug: 'finding-lipstick-colors',
    title: 'Finding lipstick colours you will actually wear',
    category: 'makeup',
    minutes: 4,
    level: 'Start here',
    summary: 'Undertone narrows the field; depth and finish decide the rest.',
    sections: [
      {
        heading: 'Match the undertone first',
        body: 'Warm colouring tends to suit lipsticks with orange, brick or gold in them; cool colouring suits blue-reds, berries and true pinks. This is the one rule worth following, because a mismatched undertone is what makes a shade look like it is sitting on top of a face rather than belonging to it.',
      },
      {
        heading: 'Then choose the depth',
        body: 'A shade much deeper than your natural lip reads as a statement; one close to it reads as everyday. Neither is more correct. If you want exactly one lipstick, take one shade deeper than your lip, in your undertone.',
      },
      {
        heading: 'Finish changes everything',
        body: 'The same pigment in matte, satin and gloss looks like three different colours. Matte reads deeper and flatter, gloss lighter and fuller. If a shade is almost right, try the other finish before giving up on it.',
      },
      {
        heading: 'On exact product matches',
        body: 'MyLookFit names colour families, not brand shades. A screen cannot tell you how a particular product will oxidise on your lips, and an app that claims otherwise is guessing.',
      },
    ],
    related: [{ label: 'Lipstick explorer', route: '/colors/lipstick' }],
  },
  {
    slug: 'selecting-saree-colors',
    title: 'Selecting saree and lehenga colours',
    category: 'fashion',
    minutes: 5,
    level: 'Going deeper',
    summary: 'Where the colour sits matters as much as which colour it is.',
    sections: [
      {
        heading: 'The pallu and blouse do the work',
        body: 'In a saree, the fabric near your face is the pallu and the blouse. Those are the pieces that need to be in your palette. The body of the drape can travel further afield, because it sits away from your skin.',
      },
      {
        heading: 'Zari is a colour, not a finish',
        body: 'Gold zari warms an entire drape; silver cools it. A colour that is marginal for you can come right with the other metal. If you sit between warm and cool, antique gold is the middle ground.',
      },
      {
        heading: 'When the colour is not yours to choose',
        body: 'Family and ceremony often fix the colour before you do. When that happens, move the decision to what sits beside your face: the blouse, the dupatta edge, the jewellery metal and the lipstick.',
      },
    ],
    related: [{ label: 'Clothing colours', route: '/colors/clothing' }],
  },
  {
    slug: 'coordinating-jewellery',
    title: 'Coordinating jewellery metals',
    category: 'fashion',
    minutes: 3,
    level: 'Start here',
    summary: 'Gold, silver, rose gold, and when mixing them works.',
    sections: [
      {
        heading: 'Warm to gold, cool to silver — mostly',
        body: 'Warm colouring usually looks lit by yellow gold, cool colouring by silver and white gold. Rose gold sits between them and flatters most people, which is why it became the default gift metal.',
      },
      {
        heading: 'Mixing is not a mistake',
        body: 'Mixed metals read as deliberate when one metal dominates and the other appears at least twice — gold earrings and a gold ring against a silver watch and chain. An even split reads as an accident.',
      },
      {
        heading: 'Finish carries the occasion',
        body: 'Antique and oxidised finishes sit naturally with traditional Indian wear; polished finishes suit tailoring. The same pair of jhumkas reads ceremonial or casual depending on the finish.',
      },
    ],
    related: [{ label: 'Jewellery colours', route: '/colors/jewellery' }],
  },
  {
    slug: 'building-a-capsule-wardrobe',
    title: 'Building a capsule wardrobe from your palette',
    category: 'fashion',
    minutes: 6,
    level: 'Going deeper',
    summary: 'Neutrals carry the weight; your season decides which neutrals.',
    sections: [
      {
        heading: 'Pick your neutrals, not the standard ones',
        body: 'Black and white is a palette, not the palette. Warm colouring is often better served by cream, camel and chocolate than by stark black. Your season lists four neutrals; those are the pieces worth buying well.',
      },
      {
        heading: 'Two accents, repeated',
        body: 'A capsule works when everything combines. Two accent colours from your palette, repeated across tops and accessories, produce far more outfits than six colours bought one at a time.',
      },
      {
        heading: 'Spend the attention near your face',
        body: 'Trousers and skirts are forgiving. Anything within a hand-width of your jaw is not. That is where the palette earns its keep.',
      },
    ],
  },
];

export const ACADEMY_CATEGORIES = [
  { key: 'colour', label: 'Personal Colour Academy' },
  { key: 'face', label: 'Face and Hair Academy' },
  { key: 'makeup', label: 'Makeup Academy' },
  { key: 'fashion', label: 'Fashion Academy' },
  { key: 'routine', label: 'Beauty Routine Academy' },
] as const;

export const guideBySlug = (slug: string): Guide | undefined =>
  ACADEMY_GUIDES.find((g) => g.slug === slug);

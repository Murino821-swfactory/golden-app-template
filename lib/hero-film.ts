/**
 * The hero asset database (films: T-460, 2026-11-17, after the cinematic landings of wismeo and
 * PropCheck; still scenes: founder, 2026-11-25): the pictures the editorial hero can lie on
 * instead of the light loop. An asset is shown in its own colours — like the AI hero image, it is
 * a picture, not light the palette tints (`components/editorial/hero-film.tsx`, placed by
 * `stage.css`).
 *
 * `HERO_ASSETS` is the database: ONE RECORD PER PICTURE, and its order is the order "Change
 * image" walks. A record's `name` is its file name under `public/film/`. Two kinds:
 *
 * FILMS — real footage, told in TWO PARTS (founder, 2026-11-18): a film plays to the moment its
 * story pauses and rests there (`hold` — the van has arrived and the door stands open); the
 * visitor's first scroll plays the rest (the van drives away) and the film rests on its last
 * frame. They are the factory's own footage from HeyGen — the clean generations behind the videos
 * in its assets folder (the finished videos carry burnt-in captions, so they cannot lie under a
 * headline):
 *   tower-dusk    (e617b644… wide, 55e6cf91… phone; the opening film of tokenwise.sk/how-it-works)
 *   tower-night   (65f6a98e… wide, c649205c… phone)
 *   bakery-oven   (77f8273f…, reel "what matters")
 *   bakery-house  (96f969a8…)
 *   rail-yard     (da77f618…, reel v5)
 * Each ships as a 1280 × 720 film, a 540 × 960 phone cut and the first frame of both as posters
 * (encoded by `scripts/film/encode.sh`, removed 2026-11-22 — git history), H.264 only; sources of
 * the last three are 9:16 only, so their wide cut is a band of the same shot.
 *
 * STILLS — ten scenes of businesses a visitor may recognise as their own, so the golden demo
 * reads as THEIR page whatever they do. Generated in ChatGPT on 2026-11-25 from one frame of a
 * prompt: a photorealistic 16:9 film still, 35 mm, available light; the upper 40 % calm, because
 * the headline stands there; the subject in the lower half and the central third; no people, no
 * text, no logos. Each ships as two WebP pictures: 1672 × 899 (the generation less a strip of
 * sky) and a 506 × 899 phone cut around its subject. No film, no hold.
 *
 * Adding an asset = its files in `public/film/` and one record here; a film also needs
 * `npm run schema`, because a config may name it.
 *
 * A config names a FILM with `patterns.landing.film`; a config that names none keeps its light
 * loop and its export carries no asset at all (`scripts/prune-film.mjs`). The stills are only
 * what "Change image" shows a visitor. The content call never sets the key — the pictures are
 * the factory's, not a customer's.
 */
export type HeroAsset =
  | {
      name: string;
      kind: "film";
      /** What the picture shows — for whoever picks one, and for whoever adds the next. */
      scene: string;
      /**
       * Where the film rests until the visitor's first scroll, in seconds — `[wide, phone]`,
       * because the two cuts of a tower film are different takes. Read off the frames: the last
       * moment before the second half of the story starts.
       */
      hold: readonly [number, number];
    }
  | { name: string; kind: "still"; scene: string };

export const HERO_ASSETS = [
  { name: "tower-dusk", kind: "film", scene: "A van arrives at the tower at sunset and a door opens; the van leaves and a floor lights up", hold: [4.2, 4.2] },
  { name: "cafe-blue-hour", kind: "still", scene: "A corner café at blue hour after rain: lit windows, two bistro tables, wet cobblestones" },
  { name: "thermal-pool", kind: "still", scene: "An outdoor thermal pool at dawn: steam over turquoise water, two loungers on a wooden deck, misty hills" },
  { name: "workshop-dusk", kind: "still", scene: "A carpenter's workshop at dusk with its doors open: a lit workbench, an unfinished chair, stacked timber" },
  { name: "ice-rink", kind: "still", scene: "An empty ice hockey rink after resurfacing, seen from centre ice towards one goal" },
  { name: "riverside-office", kind: "still", scene: "A glass-and-timber office pavilion on a riverbank at dusk, mirrored in the water" },
  { name: "depot-sunrise", kind: "still", scene: "A small logistics depot at sunrise: an open loading bay with pallets, a white van at the dock" },
  { name: "hillside-house", kind: "still", scene: "A timber-clad family house on a hillside at twilight, a stone path to its door, village lights in the valley" },
  { name: "flower-shop", kind: "still", scene: "A flower shop front in morning light: buckets of tulips, peonies and eucalyptus by an open door" },
  { name: "vineyard-sunset", kind: "still", scene: "Rows of autumn vines running down to a stone winery at sunset, a crate of grapes in front" },
  { name: "mountain-guesthouse", kind: "still", scene: "A wooden mountain guesthouse in fresh snow at blue hour, every window lit, a ridge behind" },
  { name: "tower-night", kind: "film", scene: "A helicopter lowers to the roof of the tower at night, takes a crate and flies away", hold: [4.0, 4.0] },
  { name: "bakery-oven", kind: "film", scene: "A baker draws loaves from a wood oven", hold: [2.6, 2.6] },
  { name: "bakery-house", kind: "film", scene: "A bakery at night with its front open, every floor at work", hold: [2.4, 2.4] },
  { name: "rail-yard", kind: "film", scene: "A freight train leaves a rain-wet yard at night", hold: [2.2, 2.2] },
] as const satisfies readonly HeroAsset[];

type HeroAssetRecord = (typeof HERO_ASSETS)[number];
type HeroFilmRecord = Extract<HeroAssetRecord, { kind: "film" }>;
export type HeroAssetName = HeroAssetRecord["name"];
export type HeroFilmName = HeroFilmRecord["name"];
export type HeroStillName = Exclude<HeroAssetName, HeroFilmName>;

const isFilm = (asset: HeroAssetRecord): asset is HeroFilmRecord => asset.kind === "film";

/** The films, in the database's order — what a config may name. */
export const HERO_FILMS = HERO_ASSETS.filter(isFilm).map((asset) => asset.name) as [HeroFilmName, ...HeroFilmName[]];
/** The still scenes, in the database's order. */
export const HERO_STILLS = HERO_ASSETS.filter((asset) => !isFilm(asset)).map((asset) => asset.name) as [HeroStillName, ...HeroStillName[]];

/** One asset's record. Pure. */
export function heroAsset(name: HeroAssetName): HeroAssetRecord {
  return HERO_ASSETS.find((asset) => asset.name === name)!;
}

/** Whether this asset is a film (it plays) or a still scene (it is a picture only). Pure. */
export function isHeroFilm(name: HeroAssetName): name is HeroFilmName {
  return isFilm(heroAsset(name));
}

/** The film a config names, or `null` when it names none (or something stale, or a still). Pure. */
export function heroFilm(film: string | undefined): HeroFilmName | null {
  return (HERO_FILMS as readonly string[]).includes(film ?? "") ? (film as HeroFilmName) : null;
}

/** The next asset of the database, round and round — what "Change image" shows a visitor. Pure. */
export function nextHeroAsset(current: HeroAssetName): HeroAssetName {
  return HERO_ASSETS[(HERO_ASSETS.findIndex((asset) => asset.name === current) + 1) % HERO_ASSETS.length]!.name;
}

/** The second at which this film's first part ends on this screen. Pure. */
export function heroFilmHold(name: HeroFilmName, small: boolean): number {
  return HERO_ASSETS.filter(isFilm).find((asset) => asset.name === name)!.hold[small ? 1 : 0];
}

export interface HeroPictureFiles {
  /** The wide picture: a still scene itself, or a film's first frame — what is painted before the film, and instead of it under reduced motion. */
  poster: string;
  /** The same for a phone (`FILM_SMALL_QUERY`). */
  posterSmall: string;
}

export interface HeroFilmFiles extends HeroPictureFiles {
  /** The 16:9 film a wide screen plays. */
  src: string;
  /** The 9:16 cut a phone plays (`FILM_SMALL_QUERY`). */
  small: string;
}

/** A phone, by the page's own `sm` breakpoint — the same line the light loops draw. */
export const FILM_SMALL_QUERY = "(max-width: 639px)";

/** The pictures of one asset under this build's base path — all a still has. */
export function heroPictureFiles(basePath: string, name: HeroAssetName): HeroPictureFiles {
  const base = `${basePath}/film/${name}`;
  return { poster: `${base}.webp`, posterSmall: `${base}-sm.webp` };
}

/** One film's files under this build's base path. */
export function heroFilmFiles(basePath: string, name: HeroFilmName): HeroFilmFiles {
  const base = `${basePath}/film/${name}`;
  return { src: `${base}.mp4`, small: `${base}-sm.mp4`, ...heroPictureFiles(basePath, name) };
}

/** What one film's four files may weigh together. */
export const FILM_BUDGET_BYTES = 1_000_000;
/** What one still's two pictures may weigh together. */
export const STILL_BUDGET_BYTES = 300_000;

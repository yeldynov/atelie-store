// Sample catalog loaded by `pnpm db:seed`.
// Images are from Unsplash (https://unsplash.com/license).

import { ONE_SIZE, type ProductImage } from "@/lib/products";

const PHOTO_BASE = "https://images.unsplash.com/photo-";

const unsplash = (id: string) =>
  `${PHOTO_BASE}${id}?auto=format&fit=crop&w=2400&q=80`;

/** Zoomed crop around a focal point (0–1 on each axis) for detail shots. */
const unsplashDetail = (id: string, x: number, y: number, zoom = 2.2) =>
  `${PHOTO_BASE}${id}?auto=format&fit=crop&crop=focalpoint&fp-x=${x}&fp-y=${y}&fp-z=${zoom}&w=2400&q=80`;

type FocalPoint = [x: number, y: number, zoom?: number];

// Main shot plus a zoomed detail. Pass `main` to crop the main shot too,
// e.g. to keep third-party labels out of frame.
function gallery(
  id: string,
  alt: string,
  detail: FocalPoint,
  main?: FocalPoint,
): ProductImage[] {
  return [
    { src: main ? unsplashDetail(id, ...main) : unsplash(id), alt },
    { src: unsplashDetail(id, ...detail), alt: `${alt}, detail` },
  ];
}

export type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  // Whole USD; the seed stores cents.
  price: number;
  badge?: string;
  images: ProductImage[];
  description: string;
  details: string[];
  // [size, units on hand], in display order.
  stock: [size: string, quantity: number][];
};

export const seedProducts: SeedProduct[] = [
  {
    slug: "lambskin-biker-jacket",
    name: "Lambskin biker jacket",
    category: "Outerwear",
    price: 2450,
    badge: "New in",
    images: gallery(
      "1551028719-00167b16eac5",
      "Black lambskin biker jacket",
      [0.15, 0.85],
      [0.3, 0.72, 1.8],
    ),
    description:
      "An asymmetric biker in supple lambskin, cut close through the body with a notched lapel and belted hem. Softens and shapes to the wearer over time.",
    details: [
      "100% lambskin leather",
      "Cupro lining",
      "Asymmetric zip closure",
      "Three zipped pockets",
      "Specialist leather clean only",
      "Made in Italy",
    ],
    stock: [["XS", 2], ["S", 4], ["M", 5], ["L", 3], ["XL", 0]],
  },
  {
    slug: "round-metal-sunglasses",
    name: "Round metal sunglasses",
    category: "Eyewear",
    price: 420,
    images: gallery("1511499767150-a48a237f0083", "Round gold-frame sunglasses with green lenses", [0.35, 0.5]),
    description:
      "A slim round frame in brushed gold-tone metal with bottle-green mineral lenses and adjustable nose pads.",
    details: [
      "Gold-tone metal frame",
      "Mineral glass lenses, 100% UV protection",
      "Lens width 49 mm",
      "Leather case included",
      "Made in Italy",
    ],
    stock: [[ONE_SIZE, 3]],
  },
  {
    slug: "leather-strap-watch",
    name: "Leather strap watch",
    category: "Watches",
    price: 1150,
    images: gallery("1524592094714-0f0654e20314", "Minimal watch with white dial and taupe leather strap", [0.5, 0.45]),
    description:
      "A pared-back three-hand watch with a white lacquered dial, rose-gold-tone case and taupe calfskin strap.",
    details: [
      "38 mm stainless steel case",
      "Swiss quartz movement",
      "Sapphire crystal",
      "Calfskin strap, pin buckle",
      "Water resistant to 30 m",
    ],
    stock: [[ONE_SIZE, 8]],
  },
  {
    slug: "fringed-knit-poncho",
    name: "Fringed knit poncho",
    category: "Knitwear",
    price: 890,
    badge: "New in",
    images: gallery("1434389677669-e08b4cac3105", "Cream open-knit poncho with fringed hem on a hanger", [0.5, 0.6]),
    description:
      "An airy open-stitch poncho in undyed cotton and linen, finished with a hand-knotted fringe. Layers over tailoring or a simple slip.",
    details: [
      "60% cotton, 40% linen",
      "Open mesh stitch",
      "Hand-knotted fringe",
      "Hand wash cold",
      "Made in Portugal",
    ],
    stock: [[ONE_SIZE, 6]],
  },
  {
    slug: "floral-satin-pumps",
    name: "Floral satin pumps",
    category: "Shoes",
    price: 780,
    images: gallery("1543163521-1bf539c55dd2", "Blue floral satin pointed-toe pumps", [0.55, 0.6]),
    description:
      "A pointed-toe pump in printed duchess satin on a slender 105 mm heel, with a leather sole and padded insole.",
    details: [
      "Silk-blend duchess satin",
      "105 mm heel",
      "Leather sole and lining",
      "Dust bag included",
      "Made in Italy",
    ],
    stock: [["36", 0], ["37", 0], ["38", 0], ["39", 0], ["40", 0]],
  },
  {
    slug: "nylon-bomber-jacket",
    name: "Nylon bomber jacket",
    category: "Outerwear",
    price: 1290,
    images: gallery("1591047139829-d91aecb6caea", "Rust nylon bomber jacket on a hanger", [0.5, 0.3]),
    description:
      "A lightweight bomber in technical nylon with a ribbed collar, cuffs and hem, and a utility sleeve pocket.",
    details: [
      "100% recycled nylon",
      "Two-way zip",
      "Sleeve utility pocket",
      "Machine wash cold",
      "Made in Italy",
    ],
    stock: [["S", 3], ["M", 6], ["L", 4], ["XL", 2]],
  },
  {
    slug: "canvas-day-backpack",
    name: "Canvas day backpack",
    category: "Bags",
    price: 690,
    images: gallery("1553062407-98eeb64c6a62", "Navy canvas backpack on a pale floor", [0.5, 0.5]),
    description:
      "A structured everyday backpack in water-resistant cotton canvas with a padded laptop sleeve and leather-trimmed handle.",
    details: [
      "Waxed cotton canvas, leather trims",
      "Padded 15\" laptop sleeve",
      "Two interior pockets",
      "H 44 × W 30 × D 13 cm",
      "Made in Italy",
    ],
    stock: [[ONE_SIZE, 12]],
  },
  {
    slug: "pearl-strand-necklace",
    name: "Pearl strand necklace",
    category: "Jewellery",
    price: 1980,
    badge: "Limited",
    images: gallery("1515562141207-7a88fb7ce338", "Single strand of white pearls in a presentation box", [0.45, 0.65]),
    description:
      "A single strand of hand-knotted freshwater pearls, graduated from 7 to 8 mm, closed with a pavé flower clasp.",
    details: [
      "Freshwater pearls, 7–8 mm",
      "Hand-knotted on silk",
      "Sterling silver clasp with crystals",
      "Length 45 cm",
      "Numbered edition of 100",
    ],
    stock: [[ONE_SIZE, 2]],
  },
  {
    slug: "garment-dyed-cotton-tee",
    name: "Garment-dyed cotton tee",
    category: "Essentials",
    price: 220,
    images: gallery("1523381210434-271e8be1f52b", "Sage-green cotton t-shirts on wooden hangers", [0.5, 0.2]),
    description:
      "A relaxed crew-neck tee in heavyweight jersey, garment-dyed for a softly lived-in colour.",
    details: [
      "100% organic cotton jersey, 240 gsm",
      "Garment dyed",
      "Relaxed fit",
      "Machine wash cold",
      "Made in Portugal",
    ],
    stock: [["S", 10], ["M", 14], ["L", 9], ["XL", 1]],
  },
  {
    slug: "layered-pendant-necklace",
    name: "Layered pendant necklace",
    category: "Jewellery",
    price: 640,
    images: gallery("1599643478518-a784e5dc4c8f", "Layered gold chains with a blue stone pendant", [0.5, 0.2]),
    description:
      "Two fine chains worn together: a faceted blue topaz drop and an open circle pendant set with crystals.",
    details: [
      "Gold-plated sterling silver",
      "Blue topaz, crystals",
      "Lengths 42 and 50 cm",
      "Presented in a gift box",
    ],
    stock: [[ONE_SIZE, 5]],
  },
  {
    slug: "satin-jogger",
    name: "Satin jogger",
    category: "Ready-to-wear",
    price: 560,
    images: gallery("1594633312681-425c7b97ccd1", "Blush satin joggers with elasticated cuffs", [0.5, 0.3]),
    description:
      "An easy pull-on trouser in fluid satin with patch pockets and elasticated cuffs. Dresses up with a heel, down with a sneaker.",
    details: [
      "100% viscose satin",
      "Elasticated waist and cuffs",
      "Patch pockets",
      "Dry clean",
      "Made in Italy",
    ],
    stock: [["XS", 4], ["S", 5], ["M", 0], ["L", 2]],
  },
  {
    slug: "tailored-wool-suit",
    name: "Tailored wool suit",
    category: "Tailoring",
    price: 3200,
    images: gallery("1507679799987-c73779587ccf", "Man in a navy wool suit fastening his jacket", [0.5, 0.55]),
    description:
      "A two-piece single-breasted suit in navy Super 120s wool, cut with a soft shoulder and slim, flat-front trouser.",
    details: [
      "100% Super 120s virgin wool",
      "Half-canvas construction",
      "Notch lapel, two-button closure",
      "Dry clean only",
      "Made in Italy",
    ],
    stock: [["46", 0], ["48", 2], ["50", 3], ["52", 0]],
  },
];

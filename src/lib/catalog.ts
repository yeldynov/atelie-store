// Homepage content: campaign imagery, collections and curated product lists.
// Images are from Unsplash (https://unsplash.com/license).

import { unsplash } from "./products";

// Editorial tile for a category collection; the title comes from the
// category in the database, and tiles for missing categories are skipped.
export type Collection = {
  categorySlug: string;
  description: string;
  image: string;
  imageAlt: string;
};

export const hero = {
  eyebrow: "Autumn–Winter 2026",
  title: "The Quiet Season",
  description:
    "Soft tailoring, sculpted outerwear and pieces made to be lived in.",
  image: unsplash("1539109136881-3be0616acf4b"),
  imageAlt: "Woman in a long blue coat on a city square",
};

export const collections: Collection[] = [
  {
    categorySlug: "ready-to-wear",
    description: "Fluid pieces for the new season.",
    image: unsplash("1496747611176-843222e1e57c"),
    imageAlt: "Woman in a floral wrap dress by the sea",
  },
  {
    categorySlug: "tailoring",
    description: "Tailoring cut close, in deep navy wool.",
    image: unsplash("1617137968427-85924c800a22"),
    imageAlt: "Man in a navy suit",
  },
  {
    categorySlug: "eyewear",
    description: "Round metal frames for bright winter days.",
    image: unsplash("1483985988355-763728e1935b"),
    imageAlt: "Woman in sunglasses and leather gloves carrying shopping bags",
  },
];

// Curated product lists, by slug; loaded with getProductsBySlugs.
export const newArrivalSlugs = [
  "lambskin-biker-jacket",
  "round-metal-sunglasses",
  "leather-strap-watch",
  "fringed-knit-poncho",
  "floral-satin-pumps",
  "nylon-bomber-jacket",
  "canvas-day-backpack",
  "pearl-strand-necklace",
];

// Editorial tile placed inside the product grid.
export const gridFeature = {
  title: "Leather, reconsidered",
  description: "Supple lambskin outerwear, cut sharp.",
  href: "/collections/outerwear",
  image: unsplash("1520975954732-35dd22299614"),
  imageAlt: "Man in a black leather jacket crouching on a rooftop",
};

export const story = {
  eyebrow: "The Atelier",
  title: "Made slowly, by hand",
  body: "Every piece begins in our workshop, where patterns are cut by hand and garments are finished by the same artisans who designed them. Fewer pieces, made to last.",
  image: unsplash("1490481651871-ab68de25d43d"),
  imageAlt: "Neutral garments hanging on a rail in a bright studio",
};

export const focusSlugs = [
  "garment-dyed-cotton-tee",
  "layered-pendant-necklace",
  "satin-jogger",
  "tailored-wool-suit",
];

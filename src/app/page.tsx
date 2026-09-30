import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import {
  collections,
  focusSlugs,
  gridFeature,
  hero,
  newArrivalSlugs,
  story,
} from "@/lib/catalog";
import { getProductsBySlugs } from "@/lib/product-queries";

// Re-read the catalog (prices, stock) at most once a minute.
export const revalidate = 60;

const services = [
  {
    title: "Complimentary shipping",
    body: "Free express delivery and returns on every order.",
  },
  {
    title: "Book an appointment",
    body: "Shop with a client advisor in store or by video call.",
  },
  {
    title: "Personalisation",
    body: "Add hand-painted initials to selected leather goods.",
  },
];

export default async function Home() {
  const [newArrivals, productsFocus] = await Promise.all([
    getProductsBySlugs(newArrivalSlugs),
    getProductsBySlugs(focusSlugs),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative h-[80svh] min-h-[32rem] max-h-[56rem] overflow-hidden bg-ink">
        <Image
          src={hero.image}
          alt={hero.imageAlt}
          fill
          preload
          sizes="100vw"
          className="object-cover object-[50%_15%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-ink/30 via-45% to-transparent" />
        <div className="container-bleed absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 pb-10 text-paper md:pb-16">
          <p className="text-label">{hero.eyebrow}</p>
          <h1 className="text-display max-w-3xl">{hero.title}</h1>
          <p className="max-w-md text-sm">{hero.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-6">
            <Link href="/collections/new-season" className="btn btn-secondary">
              Shop the collection
            </Link>
            <Link href="/stories/the-quiet-season" className="link text-label">
              Watch the film
            </Link>
          </div>
        </div>
      </section>

      {/* Featured collections */}
      <section className="section" aria-labelledby="collections-title">
        <div className="container-bleed mb-8 flex items-end justify-between gap-4">
          <h2 id="collections-title" className="text-title">
            Shop by collection
          </h2>
        </div>
        <ul className="grid gap-px md:grid-cols-3">
          {collections.map((collection) => (
            <li key={collection.slug}>
              <Link
                href={`/collections/${collection.slug}`}
                className="group relative block"
              >
                <div className="media-editorial">
                  <Image
                    src={collection.image}
                    alt={collection.imageAlt}
                    fill
                    sizes="(min-width: 48rem) 33vw, 100vw"
                    className="transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="absolute inset-0 bg-linear-to-t from-ink/60 to-transparent to-50%" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 text-paper md:p-8">
                  <h3 className="text-title">{collection.title}</h3>
                  <p className="max-w-xs">{collection.description}</p>
                  <span className="mt-2 inline-flex items-center gap-2 text-label">
                    Shop now <ArrowIcon />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* New arrivals with an editorial tile inside the grid */}
      <section className="pb-12 md:pb-20" aria-labelledby="new-title">
        <div className="container-bleed mb-8 flex items-end justify-between gap-4">
          <h2 id="new-title" className="text-title">
            New arrivals
          </h2>
          <Link href="/new" className="link text-label">
            View all
          </Link>
        </div>
        <ul className="grid-products grid-flow-row-dense border-y border-line">
          {newArrivals.slice(0, 2).map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} />
            </li>
          ))}
          <li className="tile-feature relative min-h-[28rem]">
            <Link href={gridFeature.href} className="group absolute inset-0 block overflow-hidden bg-subtle">
              <Image
                src={gridFeature.image}
                alt={gridFeature.imageAlt}
                fill
                sizes="(min-width: 48rem) 50vw, 100vw"
                className="object-cover object-[50%_25%] transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-ink/60 to-transparent to-50%" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 text-paper md:p-8">
                <h3 className="text-title">{gridFeature.title}</h3>
                <p>{gridFeature.description}</p>
                <span className="mt-2 inline-flex items-center gap-2 text-label">
                  Discover <ArrowIcon />
                </span>
              </div>
            </Link>
          </li>
          {newArrivals.slice(2).map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>

      {/* Brand story */}
      <section className="grid bg-surface md:grid-cols-2" aria-labelledby="story-title">
        <div className="media-editorial md:aspect-auto md:min-h-[40rem]">
          <Image
            src={story.image}
            alt={story.imageAlt}
            fill
            sizes="(min-width: 48rem) 50vw, 100vw"
          />
        </div>
        <div className="flex flex-col items-start justify-center gap-5 px-gutter py-12 md:px-16 lg:px-24">
          <p className="text-label">{story.eyebrow}</p>
          <h2 id="story-title" className="text-title max-w-md md:text-3xl md:leading-[3.25rem]">
            {story.title}
          </h2>
          <p className="max-w-md text-sm text-muted">{story.body}</p>
          <Link href="/about" className="btn btn-primary mt-3">
            Discover the atelier
          </Link>
        </div>
      </section>

      {/* Product focus: swipeable on mobile, four-up on desktop */}
      <section className="section" aria-labelledby="essentials-title">
        <div className="container-bleed mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-label text-muted">Everyday</p>
            <h2 id="essentials-title" className="text-title">
              The essentials
            </h2>
          </div>
          <Link href="/collections/essentials" className="link text-label">
            Shop all
          </Link>
        </div>
        <ul className="scroll-row gap-px md:grid md:grid-cols-4">
          {productsFocus.map((product) => (
            <li key={product.slug} className="w-[72vw] shrink-0 sm:w-[40vw] md:w-auto">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>

      {/* Services */}
      <section className="border-t border-line" aria-label="Client services">
        <ul className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {services.map((service) => (
            <li key={service.title} className="flex flex-col items-center gap-2 px-gutter py-10 text-center">
              <h3 className="text-label">{service.title}</h3>
              <p className="max-w-xs text-muted">{service.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

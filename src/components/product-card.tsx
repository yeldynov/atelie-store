import Image from "next/image";
import Link from "next/link";
import {
  formatPrice,
  productStock,
  stockLabel,
  type Product,
} from "@/lib/products";

// Matches grid-products: 2 → 3 → 4 columns
const sizes = "(min-width: 64rem) 25vw, (min-width: 48rem) 33vw, 50vw";

export function ProductCard({ product }: { product: Product }) {
  const [image] = product.images;
  const soldOut = productStock(product) === "out_of_stock";
  const badge = soldOut ? stockLabel.out_of_stock : product.badge;

  return (
    <Link href={`/products/${product.slug}`} className="group block bg-paper">
      <div className="media-product">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          className="transition-transform duration-700 group-hover:scale-[1.03]"
        />
        {badge && (
          <span className="absolute top-3 left-3 bg-paper px-1.5 py-0.5 text-caption">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-3 pt-3 pb-6 md:px-4">
        <span className="text-muted">{product.category}</span>
        <h3 className="font-medium">{product.name}</h3>
        <span className={soldOut ? "text-muted" : undefined}>
          {formatPrice(product.price)}
        </span>
      </div>
    </Link>
  );
}

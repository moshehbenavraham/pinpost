import carousel1 from "@/assets/carousel-1.jpg";
import carousel2 from "@/assets/carousel-2.jpg";
import carousel3 from "@/assets/carousel-3.jpg";
import carousel4 from "@/assets/carousel-4.jpg";
import carousel6 from "@/assets/carousel-6.jpg";
import carousel7 from "@/assets/carousel-7.jpg";

const images = [carousel1, carousel2, carousel3, carousel4, carousel6, carousel7];
// Duplicate for seamless loop
const allImages = [...images, ...images];

export function SocialCarousel() {
  return (
    <div className="mt-20 overflow-hidden opacity-0 animate-scale-in">
      <div className="flex gap-4 animate-carousel-scroll">
        {allImages.map((src, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[200px] md:w-[240px] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg border border-border/50"
          >
            <img
              src={src}
              alt={`Social media post example ${(i % images.length) + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

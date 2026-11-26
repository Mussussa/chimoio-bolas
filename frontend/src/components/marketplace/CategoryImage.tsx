import type { SyntheticEvent } from "react";
import { FALLBACK_IMAGE } from "../../lib/categoryPlaceholders";

type Props = Readonly<{
  src?: string | null;
  placeholder?: string;
  alt: string;
  className: string;
}>;

export default function CategoryImage({ src, placeholder = FALLBACK_IMAGE, alt, className }: Props) {
  function useFallback(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    image.onerror = null;
    image.src = FALLBACK_IMAGE;
  }

  return (
    <img
      className={className}
      src={src || placeholder}
      alt={alt}
      onError={useFallback}
    />
  );
}

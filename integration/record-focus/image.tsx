import type { ImgHTMLAttributes } from "react";

// Next's image runtime is outside this client bundle; preserve native image semantics.
export default function Image({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} {...props} />;
}

"use client";

import { useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { isDisplayableImage } from "@/lib/domain/image";

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src?: string;
  alt: string;
  fallback: ReactNode;
};

export function SafeImage({ src, alt, fallback, onError, ...props }: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string>();

  if (!isDisplayableImage(src) || src === failedSrc) return <>{fallback}</>;

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      onError={(event) => {
        setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
}

"use client";

import { useState } from "react";

export function NftImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-panel-2 font-mono text-[10px] tracking-[0.2em] text-mist">
        NO ART
      </div>
    );
  }
  return (
    // NFT art comes from arbitrary token URIs, including data: images.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

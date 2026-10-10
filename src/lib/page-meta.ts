import type { Metadata } from "next";
import { BRAND } from "@/config/brand";

const SITE = "https://dex.aibusiness.fun";

export function pageMeta(input: {
  title: string;
  description: string;
  path: string;
  card: string;
}): Metadata {
  const url = input.path === "/" ? SITE : `${SITE}${input.path}`;
  const socialTitle = `${input.title} · ${BRAND}`;
  const image = {
    url: `/card/${input.card}`,
    width: 1200,
    height: 630,
    alt: socialTitle,
  };
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: socialTitle,
      description: input.description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: input.description,
      images: [image.url],
    },
  };
}

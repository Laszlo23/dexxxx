import type { MetadataRoute } from "next";
import { COLLECTIONS } from "@/data/collections";
import { SHARE_POSTS } from "@/data/share-posts";

const SITE = "https://dex.aibusiness.fun";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [
    "",
    "/pools",
    "/vibe",
    "/friends",
    "/collections",
    "/portfolio",
    "/bound",
    "/trends",
    "/terms",
    "/privacy",
    "/risk",
    "/rfgame",
    "/mark",
    ...COLLECTIONS.map((collection) => `/collections/${collection.slug}`),
    ...SHARE_POSTS.map((post) => `/share/${post.id}`),
  ];
  return paths.map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/trends" ? "hourly" : "daily",
    priority: path === "" ? 1 : 0.7,
  }));
}

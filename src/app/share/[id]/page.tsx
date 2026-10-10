import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CARDS, findSharePost, SHARE_POSTS, type CardId } from "@/data/share-posts";
import { pageMeta } from "@/lib/page-meta";

export function generateStaticParams() {
  return SHARE_POSTS.map((post) => ({ id: post.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = findSharePost(id);
  if (!post) return { title: "Share card" };
  return pageMeta({
    title: post.headline.replace(/\.$/, ""),
    description: post.line,
    path: `/share/${post.id}`,
    card: post.id,
  });
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = findSharePost(id);
  if (!post) notFound();
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="font-mono text-[11px] tracking-[0.22em] text-lime">{CARDS[post.id as CardId].kicker}</p>
      <h1 className="mt-2 text-4xl tracking-tight">{post.headline}</h1>
      <p className="mt-3 max-w-xl text-mist">{post.line}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/card/${post.id}`}
        alt={post.headline}
        width={1200}
        height={630}
        className="mt-6 w-full rounded-3xl border border-line"
      />
      <Link href={post.href} className="mt-6 inline-block rounded-2xl bg-lime px-4 py-2.5 text-sm font-semibold text-ink">
        {post.cta}
      </Link>
    </article>
  );
}

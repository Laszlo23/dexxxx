import { MarkRun } from "@/components/mark-run";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "The Mark",
  description: "Five rooms. Some pictures keep a wallet. Pass the run when you can tell them apart.",
  path: "/mark",
  card: "mark",
});

export default function MarkPage() {
  return <MarkRun />;
}

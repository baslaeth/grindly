import { ResearchScreen } from "@/components/research-screen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Grind Intelligence" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ alpha?: string }>;
}) {
  const { alpha } = await searchParams;
  return <ResearchScreen view="intelligence" id={alpha} />;
}

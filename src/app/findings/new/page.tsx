import { ResearchScreen } from "@/components/research-screen";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; revise?: string }>;
}) {
  const { message, revise } = await searchParams;
  return <ResearchScreen view="new" message={message} revise={revise} />;
}

import { ResearchScreen } from "@/components/research-screen";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResearchScreen view="record" id={id} />;
}

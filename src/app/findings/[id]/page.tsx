import { ResearchScreen } from "@/components/research-screen";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  return (
    <ResearchScreen view="record" id={id} saved={(await searchParams).saved} />
  );
}

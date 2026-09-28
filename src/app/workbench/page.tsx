import { ResearchScreen } from "@/components/research-screen";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; profile?: string }>;
}) {
  const { room, profile } = await searchParams;
  return <ResearchScreen view="workbench" room={room} profile={profile} />;
}

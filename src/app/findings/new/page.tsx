import { ResearchScreen } from "@/components/research-screen";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    revise?: string;
    room?: string;
    sourceRevision?: string;
  }>;
}) {
  const { message, revise, room, sourceRevision } = await searchParams;
  return (
    <ResearchScreen
      view="new"
      message={message}
      revise={revise}
      room={room}
      sourceRevision={sourceRevision}
    />
  );
}

import { notFound } from "next/navigation";
import { ShowroomApp } from "@/components/showroom/showroom-app";
import { withDb } from "@/lib/repo";
import { buildShowroom } from "@/lib/services/present";

export const dynamic = "force-dynamic";

export default async function ShowroomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await withDb((db) => buildShowroom(db, slug));
  if (!data) notFound();
  return <ShowroomApp data={data} />;
}

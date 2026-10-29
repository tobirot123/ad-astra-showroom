import { notFound } from "next/navigation"
import { HavApp } from "@/components/web3d/hav-app"
import { havLotsByNumber } from "@/lib/demo/seed-hav"

export default async function ShowroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lote?: string }>
}) {
  const { slug } = await params
  if (slug !== "hav") notFound()
  const { lote } = await searchParams
  const parsed = lote ? Number(lote) : NaN
  const initialLote = Number.isInteger(parsed) && havLotsByNumber[parsed] ? parsed : null
  return <HavApp initialLote={initialLote} />
}

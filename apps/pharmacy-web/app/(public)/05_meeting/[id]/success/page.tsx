import { SuccessPageClient } from "@/components/public/05_meeting/checkout/SuccessPageClient";

export default async function SuccessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ orderId?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <SuccessPageClient eventId={id} orderId={query.orderId ?? ""} />;
}

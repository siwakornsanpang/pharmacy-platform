import { PaymentPageClient } from "@/components/public/05_meeting/checkout/PaymentPageClient";

export default async function PaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ orderId?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <PaymentPageClient eventId={id} orderId={query.orderId ?? ""} />;
}

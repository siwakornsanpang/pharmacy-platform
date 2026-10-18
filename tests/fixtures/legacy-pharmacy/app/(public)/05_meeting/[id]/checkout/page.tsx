import { CheckoutPageClient } from "@/components/public/05_meeting/checkout/CheckoutPageClient";

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CheckoutPageClient eventId={id} />;
}

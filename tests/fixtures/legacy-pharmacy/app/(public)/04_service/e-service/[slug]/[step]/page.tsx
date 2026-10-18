import { notFound } from "next/navigation";
import { getEServiceModule } from "@/components/public/04_service/e-service/eServiceConfig";
import Sap33ApplyPage from "@/components/public/04_service/e-service/pages/Sap33ApplyPage";
import Sap22ApplyPage from "@/components/public/04_service/e-service/pages/Sap22ApplyPage";
import PaymentPage from "@/components/public/04_service/e-service/pages/PaymentPage";
import PaymentStatusPage from "@/components/public/04_service/e-service/pages/PaymentStatusPage";
import DetailPage from "@/components/public/04_service/e-service/pages/DetailPage";
import DeliveryPage from "@/components/public/04_service/e-service/pages/DeliveryPage";
import HistoryPage from "@/components/public/04_service/e-service/pages/HistoryPage";

type Props = {
  params: Promise<{ slug: string; step: string }>;
  searchParams: Promise<{ state?: string; demo?: string }>;
};

export default async function EServiceStepPage({ params, searchParams }: Props) {
  const { slug, step } = await params;
  const { state, demo } = await searchParams;
  const module = getEServiceModule(slug);
  if (!module) notFound();

  if (step === "apply") {
    if (slug === "sap-33") return <Sap33ApplyPage module={module} />;
    if (slug === "sap-22") {
      return (
        <Sap22ApplyPage
          module={module}
          mode="thaid"
          initialThaiIdPhase={
            demo === "scan"
              ? "scanning"
              : demo === "connected"
                ? "connected"
                : "idle"
          }
        />
      );
    }
  }

  if (step === "apply-manual" && slug === "sap-22") {
    return <Sap22ApplyPage module={module} mode="manual" />;
  }

  if (step === "payment") return <PaymentPage module={module} />;
  if (step === "payment-status") return <PaymentStatusPage module={module} />;
  if (step === "detail") {
    const detailState =
      state === "rejected" || state === "refund" || state === "preparing"
        ? state
        : "preparing";
    return <DetailPage module={module} initialState={detailState} />;
  }
  if (step === "delivery") {
    const deliveryState =
      state === "pickup" || state === "success" || state === "shipping"
        ? state
        : "shipping";
    return <DeliveryPage module={module} state={deliveryState} />;
  }
  if (step === "history") return <HistoryPage module={module} />;

  notFound();
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getEServiceModule } from "@/components/public/04_service/e-service/eServiceConfig";
import EServiceShell from "@/components/public/04_service/e-service/EServiceShell";
import styles from "@/components/public/04_service/e-service/EServiceShell.module.css";

type Props = { params: Promise<{ slug: string }> };

type Node = { code: string; title: string; href: string; hint: string };

function FlowRow({ title, nodes }: { title: string; nodes: Node[] }) {
  return (
    <section className={styles.card}>
      <h2 className={`${styles.cardTitle} ThaiFont`}>{title}</h2>
      <div className={styles.flowMap} style={{ marginTop: "1rem" }}>
        {nodes.map((node, index) => (
          <div key={`${node.href}-${index}`} className={styles.flowMapItem}>
            {index > 0 && <div className={`${styles.flowMapArrow} ThaiFont`}>→</div>}
            <Link href={node.href} className={styles.hubCard}>
              <span className={styles.hubCode}>{node.code}</span>
              <h3 className={`${styles.hubTitle} ThaiFont`}>{node.title}</h3>
              <p className={`${styles.hubHint} ThaiFont`}>{node.hint}</p>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function EServiceModulePage({ params }: Props) {
  const { slug } = await params;
  const module = getEServiceModule(slug);
  if (!module) notFound();

  // สภ.33 / สภ.22 เข้าหน้ายื่นคำขอเลย ไม่ผ่าน hub เลือกหน้า
  if (slug === "sap-33") {
    redirect("/service/e-service/sap-33/apply");
  }
  if (slug === "sap-22") {
    redirect("/service/e-service/sap-22/apply");
  }

  const base = `/service/e-service/${slug}`;
  const mainFlow: Node[] = [
    { code: "S1", title: "ยื่นคำขอ", href: `${base}/apply`, hint: "เริ่มต้น" },
    { code: "S2", title: "ชำระเงิน", href: `${base}/payment`, hint: "ชำระเงิน" },
    { code: "S3", title: "จัดเตรียมเอกสาร", href: `${base}/detail`, hint: "สถานะคำขอ" },
    { code: "S4", title: "จัดส่งเอกสาร", href: `${base}/delivery`, hint: "จัดส่ง" },
  ];

  return (
    <EServiceShell
      module={module}
      showStepper={false}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/home" },
        { label: "งานบริการ", href: "/service" },
        { label: module.formCode },
      ]}
    >
      <FlowRow title="เส้นทางบริการ" nodes={mainFlow} />
    </EServiceShell>
  );
}

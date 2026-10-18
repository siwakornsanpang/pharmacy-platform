import BannerCarousel from "@/components/public/01_home/BannerCarousel";
import MemberBanner from "@/components/member/home/MemberBanner";
import MemberOnlySection from "@/components/member/home/MemberOnlySection";
import OtherServiceSection from "@/components/member/home/OtherServiceSection";
import PopularServices from "@/components/member/service/PopularServices";
import HomeMeetings from "@/components/public/01_home/HomeMeetings";
import { getHomeContent, getPharmacistHomeContent, getWebSettings, getPopularServices } from "@/lib/api";
import styles from "./home.module.css";

export const dynamic = 'force-dynamic';

export default async function MemberHome() {
  const [homeContent, pharmacistContent, settings, popularServices] = await Promise.all([
    getHomeContent(),
    getPharmacistHomeContent(),
    getWebSettings(),
    getPopularServices(),
  ]);

  const activeBanners = (homeContent.banners || [])
    .filter(b => b.active)
    .sort((a, b) => a.order - b.order);

  const pharmacistBanners = (pharmacistContent.banners || [])
    .filter(b => b.active)
    .sort((a, b) => a.order - b.order);

  return (
    <div className={styles.page}>
      <BannerCarousel
        banners={activeBanners}
        pharmacistBanners={pharmacistBanners}
        slogan={settings.slogan}
      />

      <MemberOnlySection>
        {/* 1. สถานะของฉัน */}
        <MemberBanner />

        {/* 2. E-service (คำขอเด่น) */}
        <PopularServices services={popularServices} viewAllHref="/service" />

        {/* 3. การประชุม */}
        <HomeMeetings />

        {/* 4. บริการอื่นๆ */}
        <OtherServiceSection />
      </MemberOnlySection>
    </div>
  );
}

import BannerCarousel from "@/components/public/01_home/BannerCarousel";
import LicenseSearch from "@/components/public/01_home/LicenseSearch";
import HomeStats from "@/components/public/01_home/HomeStats";
import PharmacyCarousel from "@/components/public/01_home/PharmacyCarousel";
import HomeMeetings from "@/components/public/01_home/HomeMeetings";
import PublicServiceSection from "@/components/public/01_home/PublicServiceSection";
import PharmacistRolesSection from "@/components/public/01_home/PharmacistRolesSection";
import HomeNewsSection from "@/components/public/01_home/HomeNewsSection";
import PopularServices from "@/components/member/service/PopularServices";
import { getHomeContent, getWebSettings, getNews, getPopularServices } from "@/lib/api";
import styles from "./home.module.css";
import SplashScreen from "@/components/public/01_home/SplashScreen";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [homeContent, settings, allNews, popularServices] = await Promise.all([
    getHomeContent(),
    getWebSettings(),
    getNews(),
    getPopularServices(),
  ]);

  const highlights = allNews.filter(n => n.isHighlight && n.status === 'published');
  const regularNews = allNews.filter(n => !n.isHighlight && n.status === 'published');

  const activeBanners = (homeContent.banners || [])
    .filter(b => b.active)
    .sort((a, b) => a.order - b.order);

  const activePopups = (homeContent.popups || [])
    .filter(p => p.active)
    .sort((a, b) => a.order - b.order);

  return (
    <div className={styles.page}>
      {/* Immersive Splash Screen */}
      <SplashScreen popups={activePopups} />

      {/* === Banner Carousel 16:9 === (Everyone) */}
      <BannerCarousel
        banners={activeBanners}
        slogan={settings.slogan}
      />

      {/* 1. ค้นหารายชื่อ */}
      <section className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <LicenseSearch />
        </div>
      </section>

      {/* 2. บริการประชาชน */}
      <PublicServiceSection />

      {/* 3. E-service (คำขอเด่น) */}
      <PopularServices services={popularServices} viewAllHref="/service" />
      <PharmacistRolesSection />

      {/* 4. สถิติ + สายงานวิชาชีพเภสัชกร */}
      <HomeStats />
      <PharmacyCarousel />

      {/* 5. การประชุม */}
      <HomeMeetings />

      {/* 6. เรื่องเด่นและข่าวสาร */}
      <HomeNewsSection highlights={highlights} newsList={regularNews} />
    </div>
  );
}


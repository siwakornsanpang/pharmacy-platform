"use client";

import styles from "./profile.module.css";
import ProfileBanner from "@/components/member/profile/ProfileBanner";
import PassportProfileContent from "@/components/member/profile/PassportProfileContent";

export default function ProfilePage() {
  return (
    <div className={`${styles.pageWrapper} ThaiFont`}>
      <ProfileBanner />
      <main className={styles.contentBody}>
        <PassportProfileContent />
      </main>
    </div>
  );
}

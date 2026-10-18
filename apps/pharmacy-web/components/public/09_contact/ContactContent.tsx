import { getWebSettings } from "@/features/content/server-api";
import { contentGoogleMapsEmbedUrl } from "@pharmacy/contracts/content";
import styles from "./ContactContent.module.css";
import { FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import { SiLine } from "react-icons/si";
import { User, Phone, Mail, RefreshCw } from "lucide-react";

function softBreak(value: string) {
    const slash = value.lastIndexOf("/");
    if (slash >= 10 && slash < value.length - 1) {
        return value.slice(0, slash + 1) + "\u200b" + value.slice(slash + 1);
    }
    const at = value.lastIndexOf("@");
    const dot = value.lastIndexOf(".");
    if (at > 0 && dot > at + 1) {
        const name = value.slice(at + 1, dot);
        if (name.length > 10) {
            const cut = at + 1 + Math.ceil(name.length / 2);
            return value.slice(0, cut) + "\u200b" + value.slice(cut);
        }
    }
    return value;
}

export default async function ContactContent() {
    const settings = await getWebSettings();

    const renderMap = () => {
        const embedUrl = contentGoogleMapsEmbedUrl(settings.googleMapsEmbedUrl ?? "");
        if (!embedUrl) return null;
        return (
            <div className={styles.mapWrapper}>
                <iframe
                    src={embedUrl}
                    width="100%"
                    height="450"
                    allowFullScreen={true}
                    loading="lazy"
                    title="Google Maps"
                ></iframe>
            </div>
        );
    };

    return (
        <div className={styles.pageWrapper}>
            {/* Banner Section */}
            <header className={styles.banner}>
                <div className={styles.bannerOverlay}>
                    <div className={styles.bannerContent}>
                        <h1 className={styles.bannerTitle}>ติดต่อ</h1>
                        <p className={styles.bannerSubtitle}>ช่องทางการติดต่อสภาเภสัชกรรม</p>
                    </div>
                </div>
            </header>

            <div className={styles.container}>
                {/* Form + Contact Info */}
                <div className={styles.contactFormSection}>
                    <div className={styles.formContainer}>
                        <h2 className={styles.formTitle}>แบบฟอร์มติดต่อสอบถาม</h2>
                        <form className={styles.contactForm}>
                            <div className={styles.inputGroup}>
                                <User className={styles.inputIcon} size={18} />
                                <input type="text" placeholder="ชื่อ - นามสกุล" className={styles.inputField} />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.inputGroup}>
                                    <Phone className={styles.inputIcon} size={18} />
                                    <input type="tel" placeholder="โทรศัพท์" className={styles.inputField} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <Mail className={styles.inputIcon} size={18} />
                                    <input type="email" placeholder="อีเมล" className={styles.inputField} />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <input type="text" placeholder="หัวข้อที่ต้องการติดต่อ" className={styles.inputFieldNoIcon} />
                            </div>

                            <div className={styles.inputGroup}>
                                <textarea placeholder="ข้อความ" className={styles.textareaField} rows={5}></textarea>
                            </div>

                            <div className={styles.captchaSection}>
                                <div className={styles.captchaWrapper}>
                                    <div className={styles.captchaHead}>
                                        <div className={styles.captchaBox}>
                                            <span className={styles.captchaText}>W6 8HP</span>
                                        </div>
                                        <button type="button" className={styles.captchaRefresh} aria-label="โหลดรหัสใหม่">
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>
                                    <input type="text" placeholder="กรุณากรอกตัวอักษรตามรูปภาพ" className={styles.inputFieldNoIcon} />
                                </div>
                            </div>

                            <button type="button" className={styles.submitBtn}>
                                ส่งข้อความ
                            </button>
                        </form>
                    </div>

                    <aside className={styles.sideInfo}>
                        <h2 className={`${styles.siteName} ThaiFont`}>
                            {settings.siteNameTh || "สำนักงานเลขาธิการสภาเภสัชกรรม"}
                        </h2>
                        <p className={`${styles.address} ThaiFont`}>
                            {settings.address ||
                                "สำนักงานเลขาธิการสภาเภสัชกรรม อาคารมหิตลาธิเบศร ชั้น 8 กระทรวงสาธารณสุข เลขที่ 88/19 หมู่ 4 ถนนติวานนท์ ตำบลตลาดขวัญ อำเภอเมือง จังหวัดนนทบุรี 11000"}
                        </p>

                        <div className={`${styles.contactDetails} ThaiFont`}>
                            <p>
                                <strong>โทรศัพท์ :</strong> {settings.phone || "0 2591 9992"}
                            </p>
                            {settings.fax && (
                                <p>
                                    <strong>โทรสาร :</strong> {settings.fax}
                                </p>
                            )}
                            <p>
                                <strong>Email :</strong>{" "}
                                {settings.email || "pharthai@pharmacycouncil.org"}
                            </p>
                        </div>

                        <div className={styles.sideCards}>
                            <div className={styles.sideCard}>
                                <div className={styles.cardIconBox}>
                                    <FaPhoneAlt className={styles.icon} />
                                </div>
                                <div className={styles.cardInfo}>
                                    <h3>เบอร์โทรศัพท์</h3>
                                    <p>{settings.phone || "0 2591 9992"}</p>
                                </div>
                            </div>
                            <div className={styles.sideCard}>
                                <div className={styles.cardIconBox}>
                                    <FaEnvelope className={styles.icon} />
                                </div>
                                <div className={styles.cardInfo}>
                                    <h3>อีเมล</h3>
                                    <p>{softBreak(settings.email || "pharthai@pharmacycouncil.org")}</p>
                                </div>
                            </div>
                            <div className={styles.sideCard}>
                                <div className={styles.cardIconBox}>
                                    <SiLine className={styles.icon} />
                                </div>
                                <div className={styles.cardInfo}>
                                    <h3>LINE</h3>
                                    <p>{softBreak(settings.lineId || "@pharmacycouncil")}</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Map Section */}
                <div className={styles.mapSection}>
                    {renderMap()}
                </div>
            </div>
        </div>
    );
}

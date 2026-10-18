"use client";

import React, { useState } from 'react';
import { Sparkles, ExternalLink, Search, Bot, BookOpen, Pill, FlaskConical, BarChart3, ChevronDown, ListFilter } from 'lucide-react';
import styles from './tools.module.css';

interface Tool {
    id: number;
    name: string;
    description: string;
    url: string;
    icon: React.ReactNode;
    color: string;
    tags: string[];
}

const TOOLS: Tool[] = [
    {
        id: 1,
        name: "Google Gemini",
        description: "AI จาก Google ช่วยตอบคำถาม วิเคราะห์ข้อมูล สรุปเอกสาร และช่วยงานเภสัชกรรมอัจฉริยะ",
        url: "https://gemini.google.com",
        icon: <Sparkles size={28} />,
        color: "#4285F4",
        tags: ["AI", "สรุปเอกสาร", "วิเคราะห์"],
    },
    {
        id: 2,
        name: "ChatGPT",
        description: "AI Chatbot จาก OpenAI ช่วยเขียน ค้นคว้า แปลภาษา และให้คำปรึกษาทางวิชาการ",
        url: "https://chat.openai.com",
        icon: <Bot size={28} />,
        color: "#10A37F",
        tags: ["AI", "Chatbot", "ค้นคว้า"],
    },
    {
        id: 3,
        name: "PubMed",
        description: "ฐานข้อมูลงานวิจัยทางการแพทย์และเภสัชศาสตร์ที่ใหญ่ที่สุดในโลก ค้นหา Journal ได้ฟรี",
        url: "https://pubmed.ncbi.nlm.nih.gov",
        icon: <BookOpen size={28} />,
        color: "#2E4057",
        tags: ["วิจัย", "Journal", "ฐานข้อมูล"],
    },
    {
        id: 4,
        name: "Drugs.com",
        description: "ฐานข้อมูลยาครอบคลุมกว่า 24,000 รายการ พร้อมข้อมูล Drug Interaction และผลข้างเคียง",
        url: "https://www.drugs.com",
        icon: <Pill size={28} />,
        color: "#E63946",
        tags: ["ยา", "Drug Interaction", "ข้อมูลยา"],
    },
    {
        id: 5,
        name: "Canva",
        description: "เครื่องมือออกแบบกราฟิกออนไลน์ สร้างโปสเตอร์ นำเสนอผลงาน และสื่อประชาสัมพันธ์ได้ง่าย",
        url: "https://www.canva.com",
        icon: <FlaskConical size={28} />,
        color: "#7B2FF7",
        tags: ["ออกแบบ", "Presentation", "กราฟิก"],
    },
    {
        id: 6,
        name: "Google Scholar",
        description: "เครื่องมือค้นหางานวิจัยและบทความวิชาการ ครอบคลุมทุกสาขาวิชาจากทั่วโลก",
        url: "https://scholar.google.com",
        icon: <BarChart3 size={28} />,
        color: "#4285F4",
        tags: ["วิจัย", "บทความ", "วิชาการ"],
    },
];

export default function ToolsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
    const [catDropdownOpen, setCatDropdownOpen] = useState(false);

    const CATEGORIES = ["ทั้งหมด", "AI", "วิจัย", "ข้อมูลยา", "ออกแบบ", "วิชาการ"];

    const filteredTools = TOOLS.filter((tool) => {
        const matchesSearch = !searchTerm.trim() || 
            tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategory === "ทั้งหมด" ||
            tool.tags.some((t) => t.toLowerCase().includes(selectedCategory.toLowerCase()));

        return matchesSearch && matchesCategory;
    });

    return (
        <div className={styles.page}>
            {/* Banner */}
            <div className={styles.banner}>
                <div className={styles.bannerOverlay}>
                    <div className={styles.bannerContent}>
                        <h1 className={`${styles.bannerTitle} ThaiFont`}>เครื่องมือสำหรับเภสัชกร</h1>
                        <p className={`${styles.bannerSubtitle} ThaiFont`}>
                            รวมเครื่องมือออนไลน์ที่เป็นประโยชน์ ช่วยให้การทำงานของเภสัชกรง่ายและมีประสิทธิภาพมากยิ่งขึ้น
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className={styles.container}>
                {/* Search Card */}
                <div className={styles.filterCard}>
                    <div className={styles.filterHeader}>
                        <h2 className={`${styles.filterTitle} ThaiFont`}>ค้นหาเครื่องมือ</h2>
                        <span className={`${styles.filterSubtitle} ThaiFont`}>เลือกหมวดหมู่หรือพิมพ์คำค้นหาเพื่อค้นหาเครื่องมือที่ต้องการ</span>
                    </div>
                    <div className={styles.filterRow}>
                        {/* Category Dropdown */}
                        <div className={styles.dropdown}>
                            <button
                                type="button"
                                className={`${styles.dropdownButton} ThaiFont`}
                                onClick={() => setCatDropdownOpen(!catDropdownOpen)}
                            >
                                <ListFilter size={16} className={styles.dropdownIcon} />
                                <span>{selectedCategory}</span>
                                <ChevronDown size={16} className={`${styles.chevron} ${catDropdownOpen ? styles.chevronRotate : ''}`} />
                            </button>
                            {catDropdownOpen && (
                                <ul className={styles.dropdownMenu}>
                                    {CATEGORIES.map((cat) => (
                                        <li key={cat}>
                                            <button
                                                type="button"
                                                className={`${styles.dropdownItem} ThaiFont ${cat === selectedCategory ? styles.dropdownItemActive : ''}`}
                                                onClick={() => { setSelectedCategory(cat); setCatDropdownOpen(false); }}
                                            >
                                                {cat}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Search Input */}
                        <div className={styles.inputWrap}>
                            <Search size={18} className={styles.inputIcon} />
                            <input
                                type="text"
                                className={`${styles.input} ThaiFont`}
                                placeholder="ชื่อเครื่องมือ หรือคำอธิบาย..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Search Button */}
                        <button type="button" className={`${styles.searchButton} ThaiFont`}>
                            ค้นหา
                        </button>
                    </div>
                </div>

                {/* Tools Grid */}
                <div className={styles.grid}>
                    {filteredTools.map((tool) => (
                        <a
                            key={tool.id}
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.card}
                        >
                            <div className={styles.cardHeader}>
                                <div
                                    className={styles.iconWrap}
                                    style={{ background: `${tool.color}15`, color: tool.color }}
                                >
                                    {tool.icon}
                                </div>
                                <ExternalLink size={16} className={styles.externalIcon} />
                            </div>

                            <h3 className={`${styles.cardTitle} ThaiFont`}>{tool.name}</h3>
                            <p className={`${styles.cardDesc} ThaiFont`}>{tool.description}</p>

                            <div className={styles.tags}>
                                {tool.tags.map((tag, i) => (
                                    <span key={i} className={`${styles.tag} ThaiFont`}>{tag}</span>
                                ))}
                            </div>

                            <div className={styles.cardFooter}>
                                <span className={`${styles.visitBtn} ThaiFont`}>
                                    เปิดเว็บไซต์
                                    <ExternalLink size={14} />
                                </span>
                            </div>
                        </a>
                    ))}
                </div>

                {filteredTools.length === 0 && (
                    <div className={styles.emptyState}>
                        <Search size={48} className={styles.emptyIcon} />
                        <h3 className="ThaiFont">ไม่พบเครื่องมือที่ตรงกับการค้นหา</h3>
                        <p className="ThaiFont">ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง</p>
                    </div>
                )}
            </div>
        </div>
    );
}

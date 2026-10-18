"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { geoCentroid } from "d3-geo";

import styles from "./MembersContent.module.css";
import { Clock } from "lucide-react";

// URL สำหรับโหลดไฟล์ GeoJSON ของแผนที่ประเทศไทย
const geoUrl = "/data/thailand.json";

// Mapping ชื่อจังหวัดภาษาอังกฤษ -> ภาษาไทย (ครบ 77 จังหวัด)
const provinceMapping: { [key: string]: string } = {
  "Bangkok Metropolis": "กรุงเทพมหานคร",
  "Amnat Charoen": "อำนาจเจริญ",
  "Ang Thong": "อ่างทอง",
  "Bueng Kan": "บึงกาฬ",
  "Buri Ram": "บุรีรัมย์",
  "Chachoengsao": "ฉะเชิงเทรา",
  "Chai Nat": "ชัยนาท",
  "Chaiyaphum": "ชัยภูมิ",
  "Chanthaburi": "จันทบุรี",
  "Chiang Mai": "เชียงใหม่",
  "Chiang Rai": "เชียงราย",
  "Chon Buri": "ชลบุรี",
  "Chumphon": "ชุมพร",
  "Kalasin": "กาฬสินธุ์",
  "Kamphaeng Phet": "กำแพงเพชร",
  "Kanchanaburi": "กาญจนบุรี",
  "Khon Kaen": "ขอนแก่น",
  "Krabi": "กระบี่",
  "Lampang": "ลำปาง",
  "Lamphun": "ลำพูน",
  "Loei": "เลย",
  "Lop Buri": "ลพบุรี",
  "Mae Hong Son": "แม่ฮ่องสอน",
  "Maha Sarakham": "มหาสารคาม",
  "Mukdahan": "มุกดาหาร",
  "Nakhon Nayok": "นครนายก",
  "Nakhon Pathom": "นครปฐม",
  "Nakhon Phanom": "นครพนม",
  "Nakhon Ratchasima": "นครราชสีมา",
  "Nakhon Sawan": "นครสวรรค์",
  "Nakhon Si Thammarat": "นครศรีธรรมราช",
  "Nan": "น่าน",
  "Narathiwat": "นราธิวาส",
  "Nong Bua Lam Phu": "หนองบัวลำภู",
  "Nong Khai": "หนองคาย",
  "Nonthaburi": "นนทบุรี",
  "Pathum Thani": "ปทุมธานี",
  "Pattani": "ปัตตานี",
  "Phangnga": "พังงา",
  "Phatthalung": "พัทลุง",
  "Phayao": "พะเยา",
  "Phetchabun": "เพชรบูรณ์",
  "Phetchaburi": "เพชรบุรี",
  "Phichit": "พิจิตร",
  "Phitsanulok": "พิษณุโลก",
  "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา",
  "Phrae": "แพร่",
  "Phuket": "ภูเก็ต",
  "Prachin Buri": "ปราจีนบุรี",
  "Prachuap Khiri Khan": "ประจวบคีรีขันธ์",
  "Ranong": "ระนอง",
  "Ratchaburi": "ราชบุรี",
  "Rayong": "ระยอง",
  "Roi Et": "ร้อยเอ็ด",
  "Sa Kaeo": "สระแก้ว",
  "Sakon Nakhon": "สกลนคร",
  "Samut Prakan": "สมุทรปราการ",
  "Samut Sakhon": "สมุทรสาคร",
  "Samut Songkhram": "สมุทรสงคราม",
  "Saraburi": "สระบุรี",
  "Satun": "สตูล",
  "Si Sa Ket": "ศรีสะเกษ",
  "Sing Buri": "สิงห์บุรี",
  "Songkhla": "สงขลา",
  "Sukhothai": "สุโขทัย",
  "Suphan Buri": "สุพรรณบุรี",
  "Surat Thani": "สุราษฎร์ธานี",
  "Surin": "สุรินทร์",
  "Tak": "ตาก",
  "Trang": "ตรัง",
  "Trat": "ตราด",
  "Ubon Ratchathani": "อุบลราชธานี",
  "Udon Thani": "อุดรธานี",
  "Uthai Thani": "อุทัยธานี",
  "Uttaradit": "อุตรดิตถ์",
  "Yala": "ยะลา",
  "Yasothon": "ยโสธร"
};

/** ชื่อย่อบนแผนที่ (เมื่อซูมออก) เพื่อลดการทับกัน */
const provinceShortLabels: { [key: string]: string } = {
  "Bangkok Metropolis": "กทม.",
  "Phra Nakhon Si Ayutthaya": "อยุธยา",
  "Nakhon Si Thammarat": "นครศรีฯ",
  "Prachuap Khiri Khan": "ประจวบฯ",
  "Ubon Ratchathani": "อุบลฯ",
  "Nakhon Ratchasima": "นครราชฯ",
  "Surat Thani": "สุราษฎร์ฯ",
  "Samut Prakan": "สมุทรปราการ",
  "Samut Sakhon": "สมุทรสาคร",
  "Samut Songkhram": "สมุทรสงคราม",
  "Nong Bua Lam Phu": "หนองบัวฯ",
  "Kanchanaburi": "กาญจนฯ",
  "Kamphaeng Phet": "กำแพงเพชร",
  "Chachoengsao": "ฉะเชิงเทรา",
};

/** เลื่อนตำแหน่งป้ายชื่อเล็กน้อยสำหรับจังหวัดที่ centroid ทับกัน */
const labelOffsets: { [key: string]: [number, number] } = {
  "Bangkok Metropolis": [0.15, -0.05],
  "Nonthaburi": [-0.15, -0.08],
  "Pathum Thani": [0.12, 0.12],
  "Samut Prakan": [0.18, 0.1],
  "Samut Sakhon": [-0.2, 0.05],
  "Samut Songkhram": [-0.25, 0.12],
  "Nakhon Pathom": [-0.2, -0.05],
};

// ชุดสี ขาว -> เขียวมะกอก (Olive Palette)
const colorScale = scaleLinear<string>()
  .domain([0, 200, 500, 1000, 3000])
  .range(["#ffffff", "#f4f7dc", "#d9e28d", "#879127", "#737300"]);

// โครงสร้างข้อมูลจังหวัด
interface ProvinceData {
  id: string;   // ชื่อภาษาอังกฤษ (ใช้เป็น ID สำหรับแผนที่)
  name: string; // ชื่อภาษาไทย
  count: number; // จำนวนเภสัชกร
}

const MembersContent = () => {
  // สร้างสถานะ (States) สำหรับเก็บข้อมูลต่างๆ
  const [data, setData] = useState<ProvinceData[]>([]); // ข้อมูลสถิติทุกจังหวัด
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null); // จังหวัดที่กำลังเลือก
  const [hoveredData, setHoveredData] = useState<{ id: string; name: string; count: number; x: number; y: number } | null>(null); // ข้อมูลขณะเอาเมาส์ชี้
  const [position, setPosition] = useState({ coordinates: [100.5, 13.0], zoom: 1 }); // ตำแหน่งและระดับการซูมของแผนที่
  const [searchQuery, setSearchQuery] = useState(""); // ข้อความค้นหา
  const [isSearchOpen, setIsSearchOpen] = useState(false); // สถานะเปิด/ปิด Dropdown ค้นหา
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // รายชื่อจังหวัดทั้งหมดสำหรับใช้ในการค้นหา
  const allProvincesList = Object.keys(provinceMapping).map(key => ({
    id: key,
    name: provinceMapping[key]
  })).sort((a, b) => a.name.localeCompare(b.name, 'th'));

  // ปิด Dropdown ค้นหาเมื่อคลิกนอกพื้นที่
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // โหลดข้อมูลสถิติจากไฟล์ JSON
  useEffect(() => {
    fetch("/data/pharmacist-stats.json")
      .then((res) => res.json())
      .then((stats: ProvinceData[]) => {
        setData(stats);
        // เลือกกรุงเทพฯ เป็นค่าเริ่มต้น
        const bkk = stats.find((s) => s.id === "Bangkok Metropolis");
        if (bkk) {
          setSelectedProvince({ ...bkk, name: provinceMapping[bkk.id] || bkk.name });
        }
      })
      .catch((err) => console.error("Error loading stats:", err));
  }, []);

  // ดึงข้อมูลสถิติของจังหวัดตามชื่อ ID
  const getProvinceData = (name: string) => {
    return data.find((s) => s.id.trim().toLowerCase() === name.trim().toLowerCase());
  };

  // ดึง 5 อันดับแรกที่มีจำนวนมากที่สุด
  const topProvinces = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // คำนวณจำนวนเภสัชกรรวมทั้งประเทศ
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  // จัดการเมื่อเมาส์เคลื่อนที่บนแผนที่ (แสดง Tooltip)
  const handleMouseMove = (e: React.MouseEvent, id: string, name: string, count: number) => {
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect();
      setHoveredData({
        id,
        name: provinceMapping[id] || name,
        count,
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top - 10,
      });
    }
  };

  // ฟังก์ชันซูมเข้า
  const handleZoomIn = () => {
    if (position.zoom >= 5) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  // ฟังก์ชันซูมออก
  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  // จัดการเมื่อแตะหน้าจอบนมือถือ (Touch Capture) เพื่อแก้ปัญหาการถูก ZoomableGroup หรือ Browser scrolling กลืน/กวน Event
  const handleMapTouchStartCapture = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleMapTouchEndCapture = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    
    // หากนิ้วเลื่อนน้อยกว่า 30px และกดยกเร็วภายใน 500ms ถือเป็น Tap (คลิกสัมผัส)
    if (Math.sqrt(dx * dx + dy * dy) < 30 && dt < 500) {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const provinceId = element.getAttribute("data-province-id");
        if (provinceId) {
          if (e.cancelable) {
            e.preventDefault(); // ป้องกันการเบิ้ลคลิกบนอุปกรณ์มือถือ
          }
          const provinceStats = getProvinceData(provinceId);
          const thaiName = provinceMapping[provinceId] || provinceId;
          if (provinceStats) {
            setSelectedProvince({ ...provinceStats, name: thaiName });
          } else {
            setSelectedProvince({ id: provinceId, name: thaiName, count: 0 });
          }
        }
      }
    }
    touchStartRef.current = null;
  };

  // จัดการเมื่อการซูมหรือเลื่อนแผนที่สิ้นสุดลง
  const handleMoveEnd = (newPosition: { coordinates: [number, number]; zoom: number }) => {
    setPosition(newPosition);
  };

  return (
    <div ref={containerRef} className={`${styles.container} ThaiFont`}>

      {/* กล่องแสดงข้อมูลเมื่อเมาส์ชี้ (Tooltip) */}
      {hoveredData && (
        <div
          className={styles.tooltip}
          style={{ left: hoveredData.x, top: hoveredData.y, transform: "translate(-50%, -110%)" }}
        >
          <span className={styles.tooltipLabel}>จังหวัด</span>
          <span className={styles.tooltipValue}>{hoveredData.name}</span>
          <div className={styles.tooltipCount}>
            <span className={styles.tooltipNumber}>{hoveredData.count.toLocaleString()}</span>
            <span className={styles.tooltipUnit}>คน</span>
          </div>
        </div>
      )}

      {/* ส่วนของแผนที่ */}
      <div 
        className={`${styles.mapWrapper} ${styles.animateFadeInUp}`}
        onTouchStartCapture={handleMapTouchStartCapture}
        onTouchEndCapture={handleMapTouchEndCapture}
      >
        {/* ปุ่มควบคุมการซูม */}
        <div className={styles.zoomControls}>
          <button onClick={handleZoomIn} className={styles.zoomButton} title="ซูมเข้า">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button onClick={handleZoomOut} className={styles.zoomButton} title="ซูมออก">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button onClick={() => setPosition({ coordinates: [100.5, 13.0], zoom: 1 })} className={styles.zoomButton} title="คืนค่าเริ่มต้น">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
          </button>
        </div>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 3200,
            center: [100.5, 13.0],
          }}
          width={800}
          height={800}
          style={{ 
            width: "100%", 
            height: "100%",
            filter: "drop-shadow(0px 15px 25px rgba(0, 0, 0, 0.1)) drop-shadow(0px 5px 10px rgba(0, 0, 0, 0.05))",
            touchAction: "none"
          }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates as [number, number]}
            onMoveEnd={handleMoveEnd}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }: { geographies: any[] }) => {
                // แยกจังหวัดที่ Active (ถูกเลือกหรือกำลัง Hover) ออกมา
                const activeGeos = geographies.filter(geo => {
                  const id = (geo.properties.name || geo.properties.NAME || geo.properties.name_en || "").trim().toLowerCase();
                  return id === selectedProvince?.id.trim().toLowerCase() || id === hoveredData?.id.trim().toLowerCase();
                });

                return (
                  <>
                    {/* Layer 1: แผนที่พื้นฐาน (วาดเฉพาะจังหวัดที่ไม่ได้ Active) */}
                    {geographies.map((geo) => {
                      const provinceId = geo.properties.name || geo.properties.NAME || geo.properties.name_en || "";
                      const provinceStats = getProvinceData(provinceId);
                      const count = provinceStats?.count || 0;
                      const isSelected = selectedProvince?.id.trim().toLowerCase() === provinceId.trim().toLowerCase();
                      const isHovered = hoveredData?.id.trim().toLowerCase() === provinceId.trim().toLowerCase();

                      // ถ้าเป็นจังหวัดที่ Active ให้ข้ามไปวาดใน Layer 2 แทน เพื่อไม่ให้เกิดภาพซ้อน
                      if (isSelected || isHovered) return null;

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          data-province-id={provinceId}
                          onMouseEnter={(e: React.MouseEvent) => handleMouseMove(e, provinceId, provinceId, count)}
                          onMouseMove={(e: React.MouseEvent) => handleMouseMove(e, provinceId, provinceId, count)}
                          onMouseLeave={() => setHoveredData(null)}
                          onClick={() => {
                            const thaiName = provinceMapping[provinceId] || provinceId;
                            if (provinceStats) setSelectedProvince({ ...provinceStats, name: thaiName });
                            else setSelectedProvince({ id: provinceId, name: thaiName, count: 0 });
                          }}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          style={{
                            default: {
                              fill: provinceStats ? colorScale(count) : "#ffffff",
                              outline: "none",
                              stroke: "#94a3b8",
                              strokeWidth: 0.5,
                              transition: "all 300ms ease",
                            },
                            hover: {
                              fill: "#fbbf24", // ส้มอ่อน (Amber) สำหรับ Hover
                              outline: "none",
                              stroke: "#737300",
                              strokeWidth: 0.5,
                              cursor: "pointer",
                            },
                            pressed: { fill: "#879127", outline: "none" },
                          }}
                        />
                      );
                    })}

                    {/* Layer 2: จังหวัดที่กำลัง Active (วาดทับด้านบนสุดเพียงอันเดียว) */}
                    {activeGeos.map((activeGeo) => {
                      const provinceId = activeGeo.properties.name || activeGeo.properties.NAME || activeGeo.properties.name_en || "";
                      const provinceStats = getProvinceData(provinceId);
                      const count = provinceStats?.count || 0;
                      const isSelected = selectedProvince?.id.trim().toLowerCase() === provinceId.trim().toLowerCase();

                      const activeStyle = {
                        fill: isSelected ? "#d97706" : "#fbbf24", // Select ส้มเข้ม, Hover ส้มอ่อน
                        outline: "none",
                        stroke: "none",
                        strokeWidth: 0,
                        filter: isSelected 
                          ? "drop-shadow(0px 8px 20px rgba(0,0,0,0.4))" 
                          : "drop-shadow(0px 4px 10px rgba(0,0,0,0.15))",
                        transform: isSelected ? "scale(1.05)" : "scale(1)",
                        transformOrigin: "center",
                        transition: "all 200ms ease",
                      };

                      return (
                        <Geography
                          key={`active-${activeGeo.rsmKey}`}
                          geography={activeGeo}
                          data-province-id={provinceId}
                          onMouseEnter={!isSelected ? (e: React.MouseEvent) => handleMouseMove(e, provinceId, provinceId, count) : undefined}
                          onMouseMove={!isSelected ? (e: React.MouseEvent) => handleMouseMove(e, provinceId, provinceId, count) : undefined}
                          onMouseLeave={() => setHoveredData(null)}
                          onClick={() => {
                            const thaiName = provinceMapping[provinceId] || provinceId;
                            if (provinceStats) setSelectedProvince({ ...provinceStats, name: thaiName });
                            else setSelectedProvince({ id: provinceId, name: thaiName, count: 0 });
                          }}
                          style={{
                            default: activeStyle,
                            hover: activeStyle,
                            pressed: activeStyle
                          }}
                        />
                      );
                    })}

                    {/* Layer 3: ชื่อจังหวัด */}
                    {geographies.map((geo) => {
                      const provinceId = geo.properties.name || geo.properties.NAME || geo.properties.name_en || "";
                      const [cx, cy] = geoCentroid(geo);
                      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

                      const [dx, dy] = labelOffsets[provinceId] || [0, 0];
                      const useShort = position.zoom < 2;
                      const label = useShort
                        ? (provinceShortLabels[provinceId] || provinceMapping[provinceId] || provinceId)
                        : (provinceMapping[provinceId] || provinceId);
                      const fontSize = Math.max(5.5, 7.5 / Math.sqrt(position.zoom));
                      const strokeWidth = Math.max(1.5, 2.4 / Math.sqrt(position.zoom));

                      return (
                        <Marker key={`label-${geo.rsmKey}`} coordinates={[cx + dx, cy + dy]}>
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            className={styles.provinceLabel}
                            style={{
                              fontSize: `${fontSize}px`,
                              strokeWidth: `${strokeWidth}px`,
                            }}
                          >
                            {label}
                          </text>
                        </Marker>
                      );
                    })}
                  </>
                );
              }}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* แถบอธิบายสัญลักษณ์สี (Legend) */}
        <div className={styles.legend}>
          <p className={styles.legendTitle}>ความหนาแน่นของสมาชิก</p>
          <div className={styles.legendList}>
            {[
              { label: "0 - 200", color: "#ffffff", desc: "น้อย" },
              { label: "201 - 500", color: "#f4f7dc", desc: "ปกติ" },
              { label: "501 - 1,000", color: "#d9e28d", desc: "ปานกลาง" },
              { label: "1,001 - 3,000", color: "#879127", desc: "มาก" },
              { label: "3,001 ขึ้นไป", color: "#737300", desc: "หนาแน่นสูง" },
            ].map((item) => (
              <div key={item.label} className={styles.legendItem}>
                <div className={styles.legendColorBox} style={{ backgroundColor: item.color }} />
                <div className={styles.legendText}>
                  <span className={styles.legendLabel}>{item.label}</span>
                  <span className={styles.legendDesc}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.legendMobile}>
          <p className={styles.legendMobileTitle}>จำนวนเภสัชกรในแต่ละจังหวัด</p>
          <div className={styles.legendMobileRow}>
            {[
              { label: "0 - 200", color: "#f4f7dc" },
              { label: "201 - 1,200", color: "#d9e28d" },
              { label: "1,201 - 3,000", color: "#8a9040" },
              { label: "3,001 - 17,000", color: "#737300" },
            ].map((item) => (
              <div key={item.label} className={styles.legendMobileItem}>
                <span className={styles.legendMobileSwatch} style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ส่วนแสดงข้อมูลสถิติและการค้นหา */}
      <div className={styles.statsSection}>
        {/* ช่องค้นหาจังหวัด */}
        <div className={`${styles.searchWrapper} ${styles.animateFadeInUp}`}>
          <div className={styles.searchInputContainer}>
            <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              placeholder="ค้นหาจังหวัด..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
            />
            {searchQuery && (
              <button className={styles.clearSearchBtn} onClick={() => { setSearchQuery(""); setIsSearchOpen(false); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
          </div>

          {isSearchOpen && searchQuery && (
            <div className={styles.searchResults}>
              {allProvincesList
                .filter(p => p.name.includes(searchQuery))
                .map((p) => {
                  const provinceStats = getProvinceData(p.id);
                  return (
                    <div 
                      key={p.id} 
                      className={styles.searchResultItem}
                      onClick={() => {
                        const thaiName = p.name;
                        if (provinceStats) setSelectedProvince({ ...provinceStats, name: thaiName });
                        else setSelectedProvince({ id: p.id, name: thaiName, count: 0 });
                        setSearchQuery("");
                        setIsSearchOpen(false);
                      }}
                    >
                      <span className={styles.searchResultName}>{p.name}</span>
                      <span className={styles.searchResultCount}>{provinceStats?.count.toLocaleString() || 0} คน</span>
                    </div>
                  );
                })}
              {allProvincesList.filter(p => p.name.includes(searchQuery)).length === 0 && (
                <div className={styles.searchResultEmpty}>ไม่พบชื่อจังหวัดที่ค้นหา</div>
              )}
            </div>
          )}
        </div>

        <div className={styles.statsCardsContainer}>
          <div className={`${styles.statsCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.cardGlow} />

            <div className={styles.totalBlock}>
              <div className={styles.lastUpdated}>
                <Clock size={16} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
                อัพเดทข้อมูล ณ วันที่ 14 มิถุนายน 2569
              </div>

              <div className={styles.totalSummarySection}>
                <span className={styles.totalSummaryLabel}>เภสัชกรทั้งหมด</span>
                <span className={styles.totalSummaryLabelMobile}>จำนวนเภสัชกรทั่วประเทศ</span>
                <div className={styles.totalSummaryValueWrapper}>
                  <span className={styles.totalSummaryNumber}>{totalCount.toLocaleString()}</span>
                  <span className={styles.totalSummaryUnit}>คน</span>
                </div>
              </div>
            </div>

            <div className={styles.provinceBlock}>
            <div className={styles.cardDivider} />

            <h4 className={styles.statsHeader}>ข้อมูลรายจังหวัด</h4>
            <h2 className={styles.statsTitle}>
              {selectedProvince?.name || "ประเทศไทย"}
            </h2>

            <div className={styles.statsMain}>
              <div className={styles.statsCountWrapper}>
                <span className={styles.statsNumber}>
                  {selectedProvince?.count.toLocaleString() || 0}
                </span>
                <div className={styles.statsUnitWrapper}>
                  <span className={styles.statsUnit}>คน</span>
                </div>
              </div>

              <div className={styles.statsProgressInfo}>
                <div className={styles.statsProgressHeader}>
                  <span className={styles.statsProgressLabel}>สัดส่วนจากทั้งหมด</span>
                  <span className={styles.statsProgressStatus}>
                    {selectedProvince && totalCount > 0 
                      ? `${((selectedProvince.count / totalCount) * 100).toFixed(2)}%` 
                      : "0.00%"}
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${selectedProvince && totalCount > 0 ? (selectedProvince.count / totalCount) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* รายการ 5 อันดับสูงสุด */}
          <div className={`${styles.rankingCard} ${styles.animateFadeInUp}`} style={{ animationDelay: '0.2s' }}>
            <div className={styles.rankingHeader}>
              <div className={styles.rankingTitleWrapper}>
                <div className={`${styles.rankingIndicator} ${styles.animatePulseGlow}`} />
                <div className={styles.rankingTitleMain}>
                  <div className={styles.rankingTitleBig}>5 อันดับ</div>
                  <div className={styles.rankingTitleSub}>จังหวัดที่มีเภสัชกรมากที่สุด</div>
                </div>
              </div>
            </div>
            <div className={styles.rankingList}>
              {topProvinces.map((p, index) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProvince({ ...p, name: provinceMapping[p.id] || p.name })}
                  className={`${styles.rankingItem} ${selectedProvince?.id === p.id
                    ? styles.rankingItemActive
                    : styles.rankingItemDefault
                    }`}
                >
                  <div className={styles.rankingItemLeft}>
                    <span className={`${styles.rankingIndex} ${selectedProvince?.id === p.id ? styles.rankingIndexActive : styles.rankingIndexDefault
                      }`}>0{index + 1}</span>
                    <span className={`${styles.rankingName} ${selectedProvince?.id === p.id ? styles.rankingNameActive : styles.rankingNameDefault
                      }`}>{provinceMapping[p.id] || p.name}</span>
                  </div>
                  <div className={`${styles.rankingCountBox} ${selectedProvince?.id === p.id ? styles.rankingCountBoxActive : styles.rankingCountBoxDefault
                    }`}>
                    <span className={`${styles.rankingCount} ${selectedProvince?.id === p.id ? styles.rankingCountActive : styles.rankingCountDefault
                      }`}>
                      {p.count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembersContent;

// src/app/backoffice/web/law/[category]/page.tsx
"use client";

import { useParams } from "next/navigation";
import {
  Save, Plus, Trash2, FileText, Download, UploadCloud, Edit,
  Globe, Power, Loader2, Search// 🔥 เพิ่ม Icon ใหม่
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import styles from "./law.module.css";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { authFetch } from '@/app/utils/authFetch';

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const LAW_TITLES: Record<string, string> = {
  law1: "พระราชบัญญัติวิชาชีพเภสัชกรรม",
  law2: "ข้อบังคับสภาเภสัชกรรม",
  law3: "ประกาศสภาเภสัชกรรม",
  law4: "กฎกระทรวง",
  law5: "กฎหมายอื่นที่เกี่ยวข้อง",
  law6: "คำสั่งสภาเภสัชกรรม",
  law7: "ระเบียบสภาเภสัชกรรม",
};

interface LawItem {
  id: number;
  title: string;
  announcedAt: string;
  order: number;
  pdfUrl: string;
  status: string; // 🔥 มี status
}

export default function LawDynamicPage() {
  const params = useParams();
  const categorySlug = (Array.isArray(params.category) ? params.category[0] : params.category) || "";
  const titleTH = LAW_TITLES[categorySlug] || categorySlug;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [laws, setLaws] = useState<LawItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 🔥 State เก็บ ID ที่กำลังเปลี่ยนสถานะ (เพื่อโชว์ Loading หมุนๆ เฉพาะปุ่มนั้น)
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    announcedAt: string;
    order: number | string;
    status: string;
  }>({
    title: "", announcedAt: "", order: 0, status: "online",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const fetchLaws = async () => {
    if (!API_URL) return;
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/laws/${categorySlug}`);
      if (!res.ok) { setLaws([]); return; }
      const data = await res.json();
      setLaws(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setLaws([]); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchLaws(); }, [categorySlug]);

  // --- 🔥 2. Logic การกรองข้อมูล (Filtered Laws) ---
  const filteredLaws = useMemo(() => {
    return laws.filter((law) => {
      // 2.1 ค้นหา (Search)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        law.title.toLowerCase().includes(searchLower) ||
        law.order.toString().includes(searchLower) ||
        (law.announcedAt && law.announcedAt.includes(searchLower));

      // 2.2 สถานะ (Status)
      const matchesStatus = filterStatus === 'all' || law.status === filterStatus;

      // 2.3 ช่วงเวลา (Date Range)
      let matchesDate = true;
      if (startDate || endDate) {
        if (!law.announcedAt) {
          matchesDate = false; // ถ้าไม่มีวันที่ในข้อมูล แต่มีการกรองวันที่ -> ไม่แสดง
        } else {
          const lawDate = new Date(law.announcedAt);
          if (startDate) matchesDate = matchesDate && lawDate >= new Date(startDate);
          if (endDate) matchesDate = matchesDate && lawDate <= new Date(endDate);
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [laws, searchTerm, filterStatus, startDate, endDate]);



  // 🔥 ฟังก์ชันกดเปลี่ยนสถานะทันที (Quick Toggle)
  const handleToggleStatus = async (item: LawItem) => {
    const newStatus = item.status === 'online' ? 'offline' : 'online';
    setTogglingId(item.id); // เริ่มหมุน

    try {
      const form = new FormData();
      form.append('status', newStatus); // ส่งไปแค่ status ก็พอ

      const res = await authFetch(`${API_URL}/laws/${item.id}`, {
        method: 'PUT',
        body: form
      });

      if (res.ok) {
        // อัปเดต state ในหน้าเว็บทันที (ไม่ต้องโหลดใหม่ให้เสียเวลา)
        setLaws(prev => prev.map(l => l.id === item.id ? { ...l, status: newStatus } : l));

        // แจ้งเตือนเล็กๆ ที่มุมจอ (Toast)
        const Toast = MySwal.mixin({
          toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true
        });
        Toast.fire({
          icon: 'success',
          title: `เปลี่ยนสถานะเป็น ${newStatus === 'online' ? 'ออนไลน์' : 'ออฟไลน์'} แล้ว`
        });
      }
    } catch (err) {
      console.error(err);
      MySwal.fire("Error", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    } finally {
      setTogglingId(null); // หยุดหมุน
    }
  };

  const handleEdit = (law: LawItem) => {
    setEditId(law.id);
    setFormData({
      title: law.title,
      announcedAt: law.announcedAt ? law.announcedAt.split("T")[0] : "",
      order: law.order,
      status: law.status || "online",
    });
    setPdfFile(null);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditId(null);
    setFormData({ title: "", announcedAt: "", order: 0, status: "online" });
    setPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!formData.title) return MySwal.fire({ icon: "warning", title: "ข้อมูลไม่ครบ", text: "กรุณากรอกชื่อกฎหมาย" });
    if (!editId && !pdfFile) return MySwal.fire({ icon: "warning", title: "ข้อมูลไม่ครบ", text: "กรุณาแนบไฟล์ PDF" });

    MySwal.fire({ title: "กำลังบันทึก...", didOpen: () => Swal.showLoading() });

    try {
      const data = new FormData();
      data.append("category", categorySlug);
      data.append("title", formData.title);
      data.append("announcedAt", formData.announcedAt);
      data.append("order", formData.order.toString());
      data.append("status", formData.status);
      if (pdfFile) data.append("pdf", pdfFile);

      const url = editId ? `${API_URL}/laws/${editId}` : `${API_URL}/laws`;
      const res = await authFetch(url, { method: editId ? "PUT" : "POST", body: data });

      if (res.ok) {
        await MySwal.fire({ icon: "success", title: "สำเร็จ!", timer: 1500, showConfirmButton: false });
        handleCancel();
        fetchLaws();
      } else {
        throw new Error("บันทึกไม่สำเร็จ");
      }
    } catch (err: any) {
      MySwal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: "ยืนยันการลบ?", text: "ข้อมูลจะถูกลบถาวร", icon: "warning",
      showCancelButton: true, confirmButtonColor: "#d33", confirmButtonText: "ลบเลย"
    });
    if (!result.isConfirmed) return;
    await authFetch(`${API_URL}/laws/${id}`, { method: "DELETE" });
    fetchLaws();
    MySwal.fire("ลบสำเร็จ", "", "success");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h2><FileText className="text-blue-600" size={32} /> {titleTH}</h2>
          <p className={styles.breadcrumb}>จัดการเว็บไซต์ / กฎหมาย / <span className="text-blue-600 font-medium">{titleTH}</span></p>
        </div>
      </div>

      <div className={styles.toolbar}>

        {/* ช่องค้นหา */}
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหาชื่อกฎหมาย, ลำดับ, หรือวันที่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter: ช่วงวันที่ */}
        <div className={styles.filterGroup}>
          <span className={styles.dateLabel}>ประกาศ:</span>
          <input
            type="date"
            className={styles.filterInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="วันที่เริ่มต้น"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            className={styles.filterInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="วันที่สิ้นสุด"
          />
        </div>

        {/* Filter: สถานะ */}
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">สถานะทั้งหมด</option>
          <option value="online">🟢 Online</option>
          <option value="offline">⚪️ Offline</option>
        </select>

        {/* ปุ่มเพิ่มข้อมูล (ย้ายมาขวาสุด) */}
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className={styles.mainActionBtn}>
            <Plus size={20} /> เพิ่มข้อมูลใหม่
          </button>
        )}
      </div>

      {isAdding && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>{editId ? "แก้ไขข้อมูล" : "เพิ่มข้อมูลใหม่"}</h3>
          </div>
          <div className={styles.formBody}>
            <div className={styles.formGrid}>
              <div className="space-y-6">

                {/* ช่องเลือกสถานะในฟอร์ม (Dropdown) */}
                <div className={styles.inputGroup}>
                  <label className={styles.label}>สถานะการแสดงผล</label>
                  <select
                    className={styles.select}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="online">🟢 แสดงผล (Online)</option>
                    <option value="offline">⚪️ ซ่อน (Offline)</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>ชื่อกฎหมาย <span className={styles.required}>*</span></label>
                  <input type="text" className={styles.input} placeholder="ระบุชื่อกฎหมาย..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>วันที่ประกาศ</label>
                    <input type="date" className={styles.input} value={formData.announcedAt} onChange={(e) => setFormData({ ...formData, announcedAt: e.target.value })} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>ลำดับ</label>
                    <input type="number" className={styles.input} value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value === "" ? "" : parseInt(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{editId ? "เปลี่ยนไฟล์ PDF" : "แนบไฟล์ PDF *"}</label>
                <div className={styles.fileUploadBox} onClick={() => fileInputRef.current?.click()}>
                  <input type="file" hidden ref={fileInputRef} accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                  {pdfFile ? (
                    <>
                      <div className="p-3 bg-red-50 rounded-full text-red-500"><FileText size={32} /></div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">{pdfFile.name}</p>
                        <p className="text-xs text-gray-400">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-xs text-red-500 hover:underline mt-2">ยกเลิกไฟล์นี้</button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-blue-50 rounded-full text-blue-500"><UploadCloud size={32} /></div>
                      <div><p className={styles.fileUploadText}>คลิกเพื่อ{editId ? "เปลี่ยนไฟล์" : "อัปโหลดไฟล์"}</p><p className={styles.fileUploadHint}>รองรับไฟล์ PDF (ไม่เกิน 10MB)</p></div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.formActions}>
              <button onClick={handleCancel} className={styles.cancelBtn}>ยกเลิก</button>
              <button onClick={handleSave} className={styles.saveBtn}><Save size={18} /> บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: "80px", textAlign: "center" }}>ลำดับ</th>

              <th style={{ textAlign: "left" }}>ชื่อกฎหมาย</th>


              <th style={{ width: "150px", textAlign: "center" }}>วันที่ประกาศ</th>
              <th style={{ width: "110px", textAlign: "center" }}>เอกสาร</th>

              <th style={{ width: "120px", textAlign: "center" }}>สถานะ</th>
              <th style={{ width: "120px", textAlign: "center" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && filteredLaws.map((law) => (
              <tr key={law.id} className={law.status === 'offline' ? 'bg-gray-50 opacity-75' : ''}>
                <td className="text-center font-medium text-gray-500">{law.order}</td>

                <td className="font-medium text-gray-700 text-left">{law.title}</td>

                {/* 🔥 แก้ไข 2: เพิ่ม className="text-center" ให้เนื้อหาอยู่ตรงกลาง */}
                <td className="text-center">
                  {law.announcedAt ? new Date(law.announcedAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "-"}
                </td>

                <td className="text-center">
                  {law.pdfUrl ? (
                    <a href={law.pdfUrl} target="_blank" rel="noreferrer" className={styles.pdfLink}>
                      <Download size={16} /> <span>PDF</span>
                    </a>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>

                <td className="text-center">
                  <div
                    className={`${styles.statusBadge} ${law.status === 'online' ? styles.statusOnline : styles.statusOffline}`}
                    onClick={() => handleToggleStatus(law)}
                    title="คลิกเพื่อเปลี่ยนสถานะ"
                    style={{ justifyContent: 'center' }} // จัด icon กับ text ให้กลางปุ่ม
                  >
                    {togglingId === law.id ? (
                      <Loader2 size={14} className={styles.loadingSpin} />
                    ) : (
                      law.status === 'online' ? <Globe size={14} /> : <Power size={14} />
                    )}
                    <span>{law.status === 'online' ? 'Online' : 'Offline'}</span>
                  </div>
                </td>
                <td className="text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(law)} className={`${styles.btnEdit} !border-blue-300 !text-blue-600 hover:!bg-blue-50`}><Edit size={18} /></button>
                    <button onClick={() => handleDelete(law.id)} className={styles.deleteBtn}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
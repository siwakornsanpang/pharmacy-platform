'use client';

import React, { useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import './quill-size.css'; // ✅ Global CSS สำหรับ Font Size Picker
import styles from './editor.module.css';
import Swal from 'sweetalert2';
import { sanitizeRichText } from "@/features/content/sanitize";

// ✅ ขนาดที่อนุญาตให้เลือก
const Font_Size = ['16px', '18px', '20px', '24px', '28px', '32px', '48px', '64px'];

const ReactQuill = dynamic(async () => {
    const { default: RQ } = await import('react-quill-new');
    const Quill = RQ.Quill;

    // ✅ สร้าง Font Size Attributor จาก Parchment โดยตรง (รองรับ Quill 2)
    const Parchment = Quill.import('parchment') as any;
    const SizeStyle = new Parchment.StyleAttributor('size', 'font-size', {
        scope: Parchment.Scope.INLINE,
        whitelist: Font_Size
    });
    Quill.register(SizeStyle, true);

    // ✅ นำเข้าและลงทะเบียน Module สำหรับ Resize รูปภาพ (เฉพาะฝั่ง Client)
    const { default: ImageResize } = await import('@mgreminger/quill-image-resize-module');
    Quill.register('modules/imageResize', ImageResize);

    return RQ;
}, {
    ssr: false,
    loading: () => <p className="p-4 text-gray-500">กำลังโหลดเครื่องมือแก้ไข...</p>,
}) as any;

// ✅ กำหนด Toolbar แบบต่างๆ (เพิ่ม size เข้าไป)
const TOOLBAR_OPTIONS = {
    full: [
        [{ 'header': [1, 2, 3, 4, false] }, { 'size': Font_Size }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image'],
        ['clean']
    ],
    simple: [
        [{ 'header': [1, 2, 3, 4, false] }, { 'size': Font_Size }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
    ],
    essential: [
        [{ 'header': [1, 2, 3, 4, false] }, { 'size': Font_Size }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['clean']
    ]
};

interface EditorProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    variant?: 'full' | 'simple' | 'essential';
    uploadImage?: (file: File, signal?: AbortSignal) => Promise<{ assetId: string; url: string }>;
}

export default function Editor({ label, value, onChange, placeholder, variant = 'full', uploadImage }: EditorProps) {
    const quillRef = useRef<any>(null);

    // ✅ ฟังก์ชันอัปโหลดรูป (ยิงไป Backend ทันทีที่เลือกไฟล์)
    const imageHandler = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            if (!uploadImage) {
                Swal.fire({titleText: 'Error', text: 'อัปโหลดรูปไม่สำเร็จ', icon: 'error'});
                return;
            }
            try {
                const staged = await uploadImage(file);
                const editor = quillRef.current?.getEditor?.();
                const range = editor?.getSelection?.(true);
                if (editor && range) {
                    editor.insertEmbed(range.index, 'image', staged.url, 'user');
                    editor.setSelection(range.index + 1);
                }
            } catch {
                Swal.fire({titleText: 'Error', text: 'อัปโหลดรูปไม่สำเร็จ', icon: 'error'});
            }
        };
    }, [uploadImage]);

    const modules = useMemo(() => ({
        toolbar: {
            container: TOOLBAR_OPTIONS[variant],
            handlers: {
                image: imageHandler
            },
        },
        imageResize: {
            displaySize: true
        }
    }), [variant, imageHandler]);

    return (
        <div className={styles.container}>
            {label && <label className={styles.label}>{label}</label>}
            <ReactQuill
                ref={quillRef}
                theme="snow"
                value={sanitizeRichText(value)}
                onChange={(html: string) => onChange(sanitizeRichText(html))}
                modules={modules}
                formats={["header", "size", "bold", "italic", "underline", "strike", "list", "align", "color", "background", "link", "image", "indent", "direction", "font", "code-block", "blockquote", "script"]}
                placeholder={placeholder}
                className={styles.quillEditor}
            />
        </div>
    );
}

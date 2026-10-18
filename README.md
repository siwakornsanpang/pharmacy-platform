# Pharmacy platform

โมโนเรโปของเว็บสภาเภสัชกรรม หน้าบ้าน หลังบ้าน และ API อยู่ในที่เดียว

| แอป | หน้าที่ |
| --- | --- |
| `apps/pharmacy-web` | เว็บสาธารณะและโซนสมาชิก |
| `apps/backoffice` | หลังบ้านเจ้าหน้าที่ |
| `apps/backend-api` | API, สิทธิ์, เนื้อหา, สื่อ |
| `packages/contracts` | ชนิดข้อมูลที่ใช้ร่วมกัน |
| `packages/http` | ตัวช่วยเรียก HTTP |

## เริ่มทำงาน

ใช้ Node 24 จากรากของ repo นี้

```sh
npm ci --legacy-peer-deps
npm run build:shared
npm run dev --workspace apps/backend-api
npm run dev --workspace apps/backoffice
npm run dev --workspace apps/pharmacy-web
```

รายละเอียด env และฐานข้อมูลทดสอบอยู่ที่ [docs/development/setup.md](docs/development/setup.md) กับ [docs/development/environment.md](docs/development/environment.md)

## สิ่งที่ควรอ่านต่อ

- [เจ้าของข้อมูลแต่ละโดเมน](docs/architecture/data-ownership.md)
- [สื่อและสิทธิ์ไฟล์](docs/architecture/media-ownership.md)
- [เพิ่มโมดูล](docs/development/add-module.md)
- [Conference ภายนอก](docs/development/add-conference-module.md)
- [deploy](docs/operations/deployment.md)
- [ชื่อตัวแปรสภาพแวดล้อม](docs/operations/env-inventory.md)
- [ข้อจำกัดที่ยังอยู่](docs/verification/known-limitations.md)

## ขอบเขตที่ทีมรับช่วงต้องรู้

- ล็อกอินสมาชิกบน production ยังไม่ใช่ผู้ให้บริการตัวจริง อย่าตั้ง `PHARMACY_POC_MODE=true` บนโดเมนสาธารณะ
- Conference เป็นบริการภายนอก repo นี้ทำหน้าที่พร็อกซี
- บัญชีเจ้าหน้าที่ย้ายรหัสผ่านมาด้วยไม่ได้ สร้างใหม่ด้วย `staff:create`
- `/ready` ตรวจ schema ถึง migration `0009`

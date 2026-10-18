import { json, pgEnum, pgTable, serial, text, timestamp, integer, date, boolean, numeric, unique, uuid, varchar } from 'drizzle-orm/pg-core';

type BannerItem = {
  id: string;
  url: string;
  originalUrl: string;
  title: string;
  clickable: boolean;
  linkUrl: string;
  active: boolean;
  order: number;
};

type PopupItem = {
  id: string;
  url: string;
  title: string;
  active: boolean;
  order: number;
};

export const homeContent = pgTable('home_content', {
  id: serial('id').primaryKey(),
  // Staged additive declaration; the owning unreleased migration is assembled later.
  revision: integer('revision').notNull().default(1),
  banners: json('banners').$type<BannerItem[]>().default([]),
  popups: json('popups').$type<PopupItem[]>().default([]),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const pharmacistHomeContent = pgTable('pharmacist_home_content', {
  id: serial('id').primaryKey(),
  // Staged additive declaration; the owning unreleased migration is assembled later.
  revision: integer('revision').notNull().default(1),
  banners: json('banners').$type<BannerItem[]>().default([]),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const laws = pgTable('laws', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(), // เก็บหมวดหมู่ (เช่น law1, law2)
  title: text('title').notNull(),       // ชื่อกฎหมาย
  year: integer('year'),                // ปี พ.ศ.
  announcedAt: date('announced_at'),    // วันที่ประกาศ
  order: integer('order').default(0),   // ลำดับการแสดงผล
  pdfUrl: text('pdf_url'),              // ลิงก์ไฟล์ PDF
  status: text('status').default('online'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const councilMembers = pgTable('council_members', {
  id: serial('id').primaryKey(),
  prefix: text('prefix'), // คำนำหน้าชื่อ
  name: text('name').notNull(),
  position: text('position').notNull(),
  type: text('type').notNull(),
  imageUrl: text('image_url'),
  originalImageUrl: text('original_image_url'),
  order: integer('order').notNull(),
  background: text('background'),
});

export const newsStatusEnum = pgEnum('news_status', ['draft', 'published']);

export const newsCategoryEnum = pgEnum('news_category', ['news', 'recruitment', 'procurement']);

export const news = pgTable('news', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),               // หัวข้อข่าว
  content: text('content').notNull(),           // เนื้อหาข่าว
  excerpt: text('excerpt'),                     // เนื้อหาข่าวโดยย่อ

  thumbnailUrl: text('thumbnail_url'),          // รูปหน้าปก (Thumbnail)
  status: newsStatusEnum('status').default('draft').notNull(),
  category: newsCategoryEnum('category').notNull(), // หมวดหมู่ข่าว
  createdAt: timestamp('created_at').defaultNow(),     // วันที่สร้าง
  updatedAt: timestamp('updated_at').defaultNow(),     // วันที่แก้ไขล่าสุด
  publishedAt: timestamp('published_at'), // วันที่เผยแพร่
  isHighlight: boolean('is_highlight').default(false), // ข่าวเด่น
});

export const medicineArticles = pgTable('medicine_articles', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),               // หัวข้อบทความ
  content: text('content').notNull(),           // เนื้อหา
  excerpt: text('excerpt'),                     // เนื้อหาโดยย่อ
  thumbnailUrl: text('thumbnail_url'),          // รูปหน้าปก (Thumbnail)
  category: text('category').notNull().default('medicine'), // ประเภท (ตอนนี้ fix เป็น medicine)
  status: newsStatusEnum('status').default('draft').notNull(), // ใช้ enum เดียวกับข่าว
  createdAt: timestamp('created_at').defaultNow(),     // วันที่สร้าง
  updatedAt: timestamp('updated_at').defaultNow(),     // วันที่แก้ไขล่าสุด
  publishedAt: timestamp('published_at'),              // วันที่เผยแพร่
});

export const publicProjectArticles = pgTable('public_project_articles', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),               // หัวข้อโครงการ
  content: text('content').notNull(),           // รายละเอียดโครงการ
  excerpt: text('excerpt'),                     // รายละเอียดโดยย่อ
  thumbnailUrl: text('thumbnail_url'),          // รูปหน้าปก (Thumbnail)
  category: text('category').notNull().default('public_project'), // ประเภท (ตอนนี้ fix เป็น public_project)
  status: newsStatusEnum('status').default('draft').notNull(), // ใช้ enum เดียวกับข่าว
  createdAt: timestamp('created_at').defaultNow(),     // วันที่สร้าง
  updatedAt: timestamp('updated_at').defaultNow(),     // วันที่แก้ไขล่าสุด
  publishedAt: timestamp('published_at'),              // วันที่เผยแพร่
});

export const councilHistory = pgTable('council_history', {
  id: serial('id').primaryKey(),
  term: text('term').notNull(),           // 1. วาระ (เช่น "13")
  startYear: text('start_year').notNull().default(''), // 2.1 ปีเริ่มวาระ
  endYear: text('end_year').notNull().default(''),     // 2.2 ปีสิ้นสุดวาระ
  presidentName: text('president_name').notNull(), // 3. ชื่อนายก
  secretaryName: text('secretary_name').notNull(), // 4. ชื่อเลขา
  presidentImage: text('president_image'),         // 5. รูปนายก (cropped)
  originalPresidentImage: text('original_president_image'), // รูปนายกต้นฉบับ
  secretaryImage: text('secretary_image'),         // 6. รูปเลขา (cropped)
  originalSecretaryImage: text('original_secretary_image'), // รูปเลขาต้นฉบับ
  createdAt: timestamp('created_at').defaultNow(),
});

export const agencies = pgTable('agencies', {
  id: serial('id').primaryKey(),
  order: integer('order').notNull().default(0),
  name: text('name').notNull(),              // ชื่อหน่วยงาน
  title: text('title'),                      // ชื่อ title
  description: text('description'),          // คำอธิบายหน่วยงาน
  thumbnailUrl: text('thumbnail_url'),       // Thumbnail (cropped 3:2 — website hero card)
  originalThumbnailUrl: text('original_thumbnail_url'), // ต้นฉบับสำหรับ re-crop
  logoUrl: text('logo_url'),                 // Logo (ไม่ครอป)
  iconUrl: text('icon_url'),                 // Icon (ไม่ครอป)
  url: text('url').notNull(),                // ลิงก์เว็บไซต์
  category: text('category').notNull(),      // ประเภทหน่วยงาน
  createdAt: timestamp('created_at').defaultNow(),
});

export const webSettings = pgTable('web_settings', {
  id: serial('id').primaryKey(),

  // ข้อมูลทั่วไป
  siteNameTh: varchar('site_name_th', { length: 255 }).notNull().default('สภาเภสัชกรรม'),
  siteNameEn: varchar('site_name_en', { length: 255 }).notNull().default('The Pharmacy Council of Thailand'),
  slogan: text('slogan'),
  logoPath: varchar('logo_path', { length: 512 }),

  // ข้อมูลติดต่อ
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  fax: varchar('fax', { length: 50 }),
  email: varchar('email', { length: 255 }),
  googleMapsUrl: text('google_maps_url'),
  googleMapsEmbed: text('google_maps_embed'),

  // โซเชียลมีเดีย
  facebookUrl: varchar('facebook_url', { length: 512 }),
  lineId: varchar('line_id', { length: 100 }),
  youtubeUrl: varchar('youtube_url', { length: 512 }),

  // ข้อมูลอื่นๆ
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const honorAwards = pgTable('honor_awards', {
  id: serial('id').primaryKey(),
  order: integer('order').notNull().default(0),
  name: text('name').notNull(),            // ชื่อรางวัล
  description: text('description'),         // คำอธิบายรางวัล
  createdAt: timestamp('created_at').defaultNow(),
});

export const honors = pgTable('honors', {
  id: serial('id').primaryKey(),
  awardId: integer('award_id').notNull().default(0),   // FK → honor_awards.id
  order: integer('order').notNull().default(0),
  prefix: text('prefix'),                    // คำนำหน้าชื่อ
  name: text('name').notNull(),              // ชื่อ-นามสกุล
  awardName: text('award_name'),             // ชื่อรางวัล (legacy, kept for migration)
  workName: text('work_name'),              // ชื่อผลงาน
  awardDetail: text('award_detail'),         // รายละเอียดรางวัล (text ยาว)
  fullDetail: text('full_detail'),           // ข้อมูลผู้ได้รับรางวัลฉบับเต็ม (rich text)
  imageUrl: text('image_url'),               // รูปเภสัช (cropped 4:3)
  originalImageUrl: text('original_image_url'), // รูปต้นฉบับ
  videoUrl: text('video_url'),               // ลิงก์วิดีโอ YouTube
  createdAt: timestamp('created_at').defaultNow(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),                    // ชื่อของบริการ
  shortName: text('short_name'),                   // ชื่อย่อ / ชื่อสั้นของบริการ (ยาวได้)
  iconUrl: text('icon_url'),                       // URL ไอคอน
  order: integer('order').notNull().default(0),    // ลำดับการแสดงผล
  description: text('description'),                // รายละเอียดของบริการ
  linkUrl: text('link_url'),                       // ลิงก์ URL
  isPopular: boolean('is_popular').default(false), // เป็นบริการเด่นหรือไม่
  popularOrder: integer('popular_order').default(0), // ลำดับ Popular (ใช้เรียงเมื่อ is_popular = true, มีได้สูงสุด 4)
  createdAt: timestamp('created_at').defaultNow(),
});

export const policyCategories = pgTable('policy_categories', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const policyProjects = pgTable('policy_projects', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => policyCategories.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  summaryPdfUrl: text('summary_pdf_url'), // ลิงก์ไฟล์ PDF สรุปโครงการ
  status: text('status').notNull().default('planned'), // planned | ongoing | completed | delayed | terminated
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  category: text('category').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const otherServiceCategories = pgTable('other_service_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const otherServiceItems = pgTable('other_service_items', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => otherServiceCategories.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('online'), // online | offline
  pdfUrl: text('pdf_url'),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Owned by the coordinated 0009 media/content-intent migration.
export const contentAssetRefs = pgTable('content_asset_refs', {
  id: serial('id').primaryKey(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  assetId: uuid('asset_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, table => ({
  ownerAsset: unique('content_asset_refs_owner_asset')
    .on(table.ownerType, table.ownerId, table.ownerSlot, table.assetId),
}));

export const contentMediaIntents = pgTable('content_media_intents', {
  id: serial('id').primaryKey(),
  operationId: varchar('operation_id', { length: 128 }).notNull().unique(),
  ownerType: varchar('owner_type', { length: 64 }).notNull(),
  ownerId: varchar('owner_id', { length: 128 }).notNull(),
  ownerSlot: varchar('owner_slot', { length: 64 }).notNull(),
  attachAssetIds: json('attach_asset_ids').$type<string[]>().notNull(),
  releaseAssetIds: json('release_asset_ids').$type<string[]>().notNull(),
  status: varchar('status', { length: 16 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

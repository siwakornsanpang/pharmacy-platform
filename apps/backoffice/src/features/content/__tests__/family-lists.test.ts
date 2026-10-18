import { expect, it } from 'vitest';
import { mapAgencyList } from '../agency/mapping';
import { mapCouncilList } from '../council/mapping';
import { mapHome } from '../home/mapping';
import { mapHonorAwardList } from '../honor-awards/mapping';
import { mapHonorList } from '../honor/mapping';
import { mapLawList } from '../law/mapping';
import { mapMedicineList } from '../medicine/mapping';
import { mapOtherServiceCategoryList, mapOtherServiceItemList } from '../other-service/mapping';
import { mapPolicyCategoryList, mapPolicyProjectList } from '../policy/mapping';
import { mapProductList } from '../product/mapping';
import { mapPublicProjectList } from '../public-project/mapping';
import { mapServiceList } from '../service/mapping';
import { mapWebSettings } from '../settings/mapping';

it('unwraps admin content pages into family records', () => {
  expect(mapMedicineList({ items: [{ id: 1, title: 'ยา', status: 'draft' }], total: 1 })[0]).toMatchObject({ id: 1, title: 'ยา', category: 'medicine' });
  expect(mapPublicProjectList({ items: [{ id: 2, title: 'โครงการ' }] })[0].category).toBe('public_project');
  expect(mapProductList({ items: [{ id: 3, name: 'สินค้า', price: '12.50', category: 'book' }] })[0]).toMatchObject({ price: '12.50', category: 'book' });
  expect(mapLawList({ items: [{ id: 4, category: 'law1', title: 'พ.ร.บ.', order: 2, status: 'online' }] })[0]).toMatchObject({ category: 'law1', order: 2 });
  expect(mapCouncilList({ items: [{ id: 5, name: 'สมชาย', type: 'elected', order: 1 }] })[0].type).toBe('elected');
  expect(mapAgencyList({ items: [{ id: 6, name: 'หน่วยงาน', category: 'college', order: 1, url: 'https://example.test' }] })[0].category).toBe('college');
  expect(mapHonorAwardList({ items: [{ id: 7, name: 'รางวัล', recipientCount: 3, order: 1 }] })[0].recipientCount).toBe(3);
  expect(mapHonorList({ items: [{ id: 8, awardId: 7, name: 'ผู้รับ', order: 1 }] })[0].awardId).toBe(7);
  expect(mapServiceList({ items: [{ id: 9, name: 'บริการ', isPopular: true, popularOrder: 2, order: 1 }] })[0]).toMatchObject({ isPopular: true, popularOrder: 2 });
  expect(mapPolicyCategoryList({ items: [{ id: 10, title: 'นโยบาย', projectCount: 4, order: 1 }] })[0].projectCount).toBe(4);
  expect(mapPolicyProjectList({ items: [{ id: 11, categoryId: 10, name: 'โครงการ', status: 'planned', order: 1 }] })[0].categoryId).toBe(10);
  expect(mapOtherServiceCategoryList({ items: [{ id: 12, name: 'หมวด', itemCount: 2, order: 0 }] })[0].itemCount).toBe(2);
  expect(mapOtherServiceItemList({ items: [{ id: 13, categoryId: 12, name: 'ไฟล์', status: 'online', order: 0 }] })[0].pdfUrl).toBeNull();
});

it('maps singleton home and settings without requiring files', () => {
  const home = mapHome({ id: 1, revision: 4, banners: [{ id: 'b1', url: '/b.png', originalUrl: '/o.png', title: 'แบนเนอร์', clickable: false, linkUrl: '', active: true, order: 1 }], popups: [] });
  expect(home.revision).toBe(4);
  expect(home.banners[0]).toMatchObject({ id: 'b1', originalUrl: '/o.png' });
  const settings = mapWebSettings({ siteNameTh: 'สภา', siteNameEn: 'Council', slogan: '', logoPath: '/logo.png' });
  expect(settings.logoPath).toBe('/logo.png');
  expect(settings.siteNameTh).toBe('สภา');
});

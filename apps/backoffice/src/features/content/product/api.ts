import { browserApi } from '@/lib/api/browser';
import { stagedWebsiteImage } from '@/shared/media/family-upload';
import { mapProductItem, mapProductList, type ProductRecord } from './mapping';

export const productLoadError = 'ไม่สามารถโหลดข้อมูลสินค้าได้';
export const productSaveError = 'Failed to save product';

export function listProducts(signal?: AbortSignal): Promise<ProductRecord[]> {
  return browserApi('/admin/content/products?pageSize=100', { signal }).then(mapProductList);
}

export function getProduct(id: number, signal?: AbortSignal): Promise<ProductRecord> {
  return browserApi(`/admin/content/products/${id}`, { signal }).then(mapProductItem);
}

export function saveProduct(payload: Record<string, unknown>, id?: number) {
  return browserApi(id ? `/products/${id}` : '/products', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: number) {
  return browserApi(`/products/${id}`, { method: 'DELETE' });
}

export async function uploadProductImage(file: File, signal?: AbortSignal) {
  return stagedWebsiteImage('products', file, signal);
}

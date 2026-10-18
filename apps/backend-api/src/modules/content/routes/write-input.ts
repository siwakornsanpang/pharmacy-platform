import { contentId, contentInteger } from '@pharmacy/contracts/content';

export interface OrderItem { id: number; order: number }
export const orderArraySchema = { type: 'array', items: {
  type: 'object', additionalProperties: false, required: ['id','order'], properties: { id: contentId, order: contentInteger },
} } as const;
export const orderObjectSchema = { type: 'object', additionalProperties: false, required: ['items'], properties: { items: orderArraySchema } } as const;
export const successSchema = { type: 'object', additionalProperties: false, required: ['success'], properties: { success: { const: true } } } as const;
export const notFoundSchema = { type: 'object', additionalProperties: false, required: ['message'], properties: { message: { type: 'string' } } } as const;

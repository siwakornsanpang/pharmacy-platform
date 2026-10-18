import type { Database, QueryClient } from '../../db/client';
import type { createAccessService } from '../access/service';
import type { AssetId, AssetOwner } from '@pharmacy/contracts/media';
import type { RegistryPort } from '../registry';
import { executeIdempotent, type OperationAuthority, type OperationResult } from './idempotency';
import { isRequestAssetReferenced } from './media';

export const requestStatuses = ['draft', 'pending', 'processing', 'incomplete', 'ready_to_ship', 'shipping', 'success'] as const;
export const paymentMethods = ['qr_payment', 'credit_card', 'bank_transfer'] as const;
export const taxpayerTypes = ['individual', 'corporate'] as const;
export type RequestStatus = typeof requestStatuses[number];
export type PaymentMethod = typeof paymentMethods[number];
export type TaxpayerType = typeof taxpayerTypes[number];

export interface ShippingInput {
  shippingAddress?: string | null;
  trackingNumber?: string | null;
}
export interface TaxInput {
  taxpayerType?: TaxpayerType | null;
  taxInvoiceName?: string | null;
  taxIdNumber?: string | null;
  branchCode?: string | null;
  registeredTaxAddress?: string | null;
  taxInvoiceNumber?: string | null;
}
export interface CreateRequestInput {
  id: string;
  pharmacistLicenseId: string;
  licenseType?: string | null;
  shippingDetails?: ShippingInput;
  taxInvoice?: TaxInput;
}
export interface UpdateRequestInput {
  requestStatus?: RequestStatus | null;
  licenseType?: string | null;
  shippingDetails?: ShippingInput;
  taxInvoice?: TaxInput;
}
export interface PaymentInput {
  paymentDate?: string;
  amountPaid?: number;
  paymentMethod: PaymentMethod;
  paymentReferenceId: string;
}
export interface RequestListQuery { status?: RequestStatus; q?: string }
export interface RequestsDependencies {
  db: Database;
  registry: Pick<RegistryPort, 'getPharmacistByLicense'>;
  access: Pick<ReturnType<typeof createAccessService>, 'requireCapability'>;
  clock: () => Date;
}

const timestamp = (column: string) => `${column} AT TIME ZONE 'UTC' AS ${column}`;
const headerFields = `id,pharmacist_license_id,${timestamp('request_date')},request_status,license_type,${timestamp('created_at')},${timestamp('updated_at')}`;
const shippingFields = `id,request_id,shipping_address,tracking_number,${timestamp('created_at')},${timestamp('updated_at')}`;
const paymentFields = `id,request_id,${timestamp('payment_date')},amount_paid,payment_method,payment_reference_id,${timestamp('created_at')}`;
const taxFields = `id,request_id,taxpayer_type,tax_invoice_name,tax_id_number,branch_code,registered_tax_address,tax_invoice_number,${timestamp('created_at')},${timestamp('updated_at')}`;

function iso(value: unknown): string | null {
  if (value === null) return null;
  if (!(value instanceof Date)) throw new Error('Expected database timestamp');
  return value.toISOString();
}
function header(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    pharmacistLicenseId: row.pharmacist_license_id as string,
    requestDate: iso(row.request_date),
    requestStatus: row.request_status as RequestStatus | null,
    licenseType: row.license_type as string | null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}
function shipping(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    requestId: row.request_id as string,
    shippingAddress: row.shipping_address as string | null,
    trackingNumber: row.tracking_number as string | null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}
function payment(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    requestId: row.request_id as string,
    paymentDate: iso(row.payment_date),
    amountPaid: row.amount_paid as string | null,
    paymentMethod: row.payment_method as PaymentMethod | null,
    paymentReferenceId: row.payment_reference_id as string | null,
    createdAt: iso(row.created_at),
  };
}
function tax(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    requestId: row.request_id as string,
    taxpayerType: row.taxpayer_type as TaxpayerType | null,
    taxInvoiceName: row.tax_invoice_name as string | null,
    taxIdNumber: row.tax_id_number as string | null,
    branchCode: row.branch_code as string | null,
    registeredTaxAddress: row.registered_tax_address as string | null,
    taxInvoiceNumber: row.tax_invoice_number as string | null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}
function escapeLike(value: string): string {
  return `%${value.replace(/[\\%_]/g, character => `\\${character}`)}%`;
}
function now(clock: () => Date): string {
  const value = clock();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error('Invalid Requests clock');
  return value.toISOString();
}
function normalizePaymentInput(input: PaymentInput): PaymentInput {
  const normalized: PaymentInput = {
    paymentMethod: input.paymentMethod,
    paymentReferenceId: input.paymentReferenceId,
  };
  if (input.amountPaid !== undefined) {
    if (!Number.isFinite(input.amountPaid) || input.amountPaid < 0 || input.amountPaid > 99_999_999.99 ||
      Number(input.amountPaid.toFixed(2)) !== input.amountPaid) throw new RequestServiceError(400, 'Invalid payment amount');
    normalized.amountPaid = Number(input.amountPaid.toFixed(2));
  }
  if (input.paymentDate !== undefined) {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.paymentDate);
    const zoned = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(input.paymentDate);
    const parsed = new Date(dateOnly ? `${input.paymentDate}T00:00:00.000Z` : input.paymentDate);
    if ((!dateOnly && !zoned) || !Number.isFinite(parsed.getTime()) ||
      (dateOnly && parsed.toISOString().slice(0, 10) !== input.paymentDate))
      throw new RequestServiceError(400, 'Invalid payment date');
    normalized.paymentDate = parsed.toISOString();
  }
  return normalized;
}
function authority(base: Omit<OperationAuthority, 'operation' | 'targetId'>, operation: string, targetId: string): OperationAuthority {
  return { ...base, operation, targetId };
}

export class RequestServiceError extends Error {
  constructor(public readonly statusCode: 400 | 404 | 409 | 503, message: string) { super(message); }
}

async function canonicalChild(tx: QueryClient, table: 'request_shipping_details' | 'request_tax_invoices', requestId: string) {
  return (await tx.query(`SELECT id FROM ${table} WHERE request_id=$1 ORDER BY id ASC LIMIT 1 FOR UPDATE`, [requestId])).rows[0];
}

export function createRequestsService({ db, registry, clock }: RequestsDependencies) {
  async function list(query: RequestListQuery) {
    const values: unknown[] = [];
    const clauses: string[] = [];
    if (query.status !== undefined) { values.push(query.status); clauses.push(`request_status=$${values.length}`); }
    if (query.q !== undefined) {
      values.push(escapeLike(query.q));
      clauses.push(`(id ILIKE $${values.length} ESCAPE E'\\\\' OR pharmacist_license_id ILIKE $${values.length} ESCAPE E'\\\\')`);
    }
    const rows = await db.query(`SELECT ${headerFields} FROM requests${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY created_at DESC NULLS LAST,id ASC`, values);
    return rows.rows.map(header);
  }

  async function paymentsFor(client: QueryClient, requestId: string) {
    return (await client.query(`SELECT ${paymentFields} FROM request_payment_logs WHERE request_id=$1
      ORDER BY payment_date ASC NULLS LAST,id ASC`, [requestId])).rows.map(payment);
  }

  async function detail(requestId: string) {
    const request = (await db.query(`SELECT ${headerFields} FROM requests WHERE id=$1`, [requestId])).rows[0];
    if (!request) return null;
    const [shippingRow, paymentLogs, taxRow, pharmacist] = await Promise.all([
      db.query(`SELECT ${shippingFields} FROM request_shipping_details WHERE request_id=$1 ORDER BY id ASC LIMIT 1`, [requestId]),
      paymentsFor(db, requestId),
      db.query(`SELECT ${taxFields} FROM request_tax_invoices WHERE request_id=$1 ORDER BY id ASC LIMIT 1`, [requestId]),
      registry.getPharmacistByLicense(request.pharmacist_license_id as string),
    ]);
    return {
      ...header(request),
      shippingDetails: shippingRow.rows[0] ? shipping(shippingRow.rows[0]) : null,
      paymentLogs,
      taxInvoice: taxRow.rows[0] ? tax(taxRow.rows[0]) : null,
      pharmacist,
    };
  }

  async function readPayments(requestId: string) {
    if (!(await db.query('SELECT id FROM requests WHERE id=$1', [requestId])).rows[0]) return null;
    return paymentsFor(db, requestId);
  }

  async function create(input: CreateRequestInput, base: Omit<OperationAuthority, 'operation' | 'targetId'>) {
    return executeIdempotent(db, authority(base, 'requests.create', input.id), input, async tx => {
      if (!await registry.getPharmacistByLicense(input.pharmacistLicenseId))
        return { status: 404, body: { message: 'Pharmacist not found' } };
      if ((await tx.query('SELECT id FROM requests WHERE id=$1', [input.id])).rows[0])
        return { status: 409, body: { message: 'Request ID already exists' } };
      const at = now(clock);
      const row = (await tx.query(`INSERT INTO requests
        (id,pharmacist_license_id,request_date,request_status,license_type,created_at,updated_at)
        VALUES($1,$2,$3::timestamptz AT TIME ZONE 'UTC','draft',$4,$3::timestamptz AT TIME ZONE 'UTC',$3::timestamptz AT TIME ZONE 'UTC')
        RETURNING ${headerFields}`, [input.id, input.pharmacistLicenseId, at, input.licenseType ?? null])).rows[0]!;
      if (input.shippingDetails) await tx.query(`INSERT INTO request_shipping_details
        (request_id,shipping_address,tracking_number,created_at,updated_at)
        VALUES($1,$2,$3,$4::timestamptz AT TIME ZONE 'UTC',$4::timestamptz AT TIME ZONE 'UTC')`,
      [input.id, input.shippingDetails.shippingAddress ?? null, input.shippingDetails.trackingNumber ?? null, at]);
      if (input.taxInvoice) await tx.query(`INSERT INTO request_tax_invoices
        (request_id,taxpayer_type,tax_invoice_name,tax_id_number,branch_code,registered_tax_address,tax_invoice_number,created_at,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8::timestamptz AT TIME ZONE 'UTC',$8::timestamptz AT TIME ZONE 'UTC')`,
      [input.id, input.taxInvoice.taxpayerType ?? null, input.taxInvoice.taxInvoiceName ?? null,
        input.taxInvoice.taxIdNumber ?? null, input.taxInvoice.branchCode ?? null,
        input.taxInvoice.registeredTaxAddress ?? null, input.taxInvoice.taxInvoiceNumber ?? null, at]);
      return { status: 200, body: { success: true, data: header(row) } };
    });
  }

  async function update(requestId: string, input: UpdateRequestInput, base: Omit<OperationAuthority, 'operation' | 'targetId'>) {
    return executeIdempotent(db, authority(base, 'requests.update', requestId), input, async tx => {
      if (!(await tx.query('SELECT id FROM requests WHERE id=$1 FOR UPDATE', [requestId])).rows[0])
        return { status: 404, body: { message: 'Request not found' } };
      const at = now(clock);
      const sets: string[] = [];
      const values: unknown[] = [];
      if ('requestStatus' in input) { values.push(input.requestStatus); sets.push(`request_status=$${values.length}`); }
      if ('licenseType' in input) { values.push(input.licenseType); sets.push(`license_type=$${values.length}`); }
      values.push(at); sets.push(`updated_at=$${values.length}::timestamptz AT TIME ZONE 'UTC'`);
      values.push(requestId);
      await tx.query(`UPDATE requests SET ${sets.join(',')} WHERE id=$${values.length}`, values);
      if (input.shippingDetails) {
        const child = await canonicalChild(tx, 'request_shipping_details', requestId);
        if (child) {
          const childSets: string[] = [];
          const childValues: unknown[] = [];
          if ('shippingAddress' in input.shippingDetails) {
            childValues.push(input.shippingDetails.shippingAddress);
            childSets.push(`shipping_address=$${childValues.length}`);
          }
          if ('trackingNumber' in input.shippingDetails) {
            childValues.push(input.shippingDetails.trackingNumber);
            childSets.push(`tracking_number=$${childValues.length}`);
          }
          childValues.push(at);
          childSets.push(`updated_at=$${childValues.length}::timestamptz AT TIME ZONE 'UTC'`);
          childValues.push(child.id);
          await tx.query(`UPDATE request_shipping_details SET ${childSets.join(',')} WHERE id=$${childValues.length}`, childValues);
        }
        else await tx.query(`INSERT INTO request_shipping_details(request_id,shipping_address,tracking_number,created_at,updated_at)
          VALUES($1,$2,$3,$4::timestamptz AT TIME ZONE 'UTC',$4::timestamptz AT TIME ZONE 'UTC')`,
        [requestId, input.shippingDetails.shippingAddress ?? null, input.shippingDetails.trackingNumber ?? null, at]);
      }
      if (input.taxInvoice) {
        const child = await canonicalChild(tx, 'request_tax_invoices', requestId);
        const fields = [
          ['taxpayerType', 'taxpayer_type'], ['taxInvoiceName', 'tax_invoice_name'],
          ['taxIdNumber', 'tax_id_number'], ['branchCode', 'branch_code'],
          ['registeredTaxAddress', 'registered_tax_address'], ['taxInvoiceNumber', 'tax_invoice_number'],
        ] as const;
        if (child) {
          const childSets: string[] = [];
          const childValues: unknown[] = [];
          for (const [property, column] of fields) if (property in input.taxInvoice) {
            childValues.push(input.taxInvoice[property]);
            childSets.push(`${column}=$${childValues.length}`);
          }
          childValues.push(at);
          childSets.push(`updated_at=$${childValues.length}::timestamptz AT TIME ZONE 'UTC'`);
          childValues.push(child.id);
          await tx.query(`UPDATE request_tax_invoices SET ${childSets.join(',')} WHERE id=$${childValues.length}`, childValues);
        }
        else await tx.query(`INSERT INTO request_tax_invoices(request_id,taxpayer_type,tax_invoice_name,tax_id_number,
          branch_code,registered_tax_address,tax_invoice_number,created_at,updated_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8::timestamptz AT TIME ZONE 'UTC',$8::timestamptz AT TIME ZONE 'UTC')`,
        [requestId, input.taxInvoice.taxpayerType ?? null, input.taxInvoice.taxInvoiceName ?? null,
          input.taxInvoice.taxIdNumber ?? null, input.taxInvoice.branchCode ?? null,
          input.taxInvoice.registeredTaxAddress ?? null, input.taxInvoice.taxInvoiceNumber ?? null, at]);
      }
      return { status: 200, body: { success: true } };
    });
  }

  async function addPayment(requestId: string, raw: PaymentInput, base: Omit<OperationAuthority, 'operation' | 'targetId'>) {
    const input = normalizePaymentInput(raw);
    return executeIdempotent(db, authority(base, 'requests.payment', requestId), input, async tx => {
      if (!(await tx.query('SELECT id FROM requests WHERE id=$1 FOR UPDATE', [requestId])).rows[0])
        return { status: 404, body: { message: 'Request not found' } };
      const at = now(clock);
      const paymentAt = input.paymentDate ?? at;
      const row = (await tx.query(`INSERT INTO request_payment_logs
        (request_id,payment_date,amount_paid,payment_method,payment_reference_id,created_at)
        VALUES($1,$2::timestamptz AT TIME ZONE 'UTC',$3,$4,$5,$6::timestamptz AT TIME ZONE 'UTC')
        RETURNING ${paymentFields}`,
      [requestId, paymentAt, input.amountPaid?.toFixed(2) ?? '0.00', input.paymentMethod, input.paymentReferenceId, at])).rows[0]!;
      return { status: 200, body: { success: true, data: payment(row) } };
    });
  }

  async function remove(requestId: string, base: Omit<OperationAuthority, 'operation' | 'targetId'>) {
    return executeIdempotent(db, authority(base, 'requests.delete', requestId), {}, async tx => {
      if (!(await tx.query('SELECT id FROM requests WHERE id=$1 FOR UPDATE', [requestId])).rows[0])
        return { status: 404, body: { message: 'Request not found' } };
      await tx.query('DELETE FROM requests WHERE id=$1', [requestId]);
      return { status: 200, body: { success: true, message: 'ลบข้อมูลคำขอเรียบร้อย' } };
    });
  }

  return {
    list, detail, readPayments, create, update, addPayment, remove,
    isAssetReferenced: (owner: AssetOwner, assetId: AssetId) => isRequestAssetReferenced(db, owner, assetId),
  };
}

export type RequestsService = ReturnType<typeof createRequestsService>;
export type { OperationResult };

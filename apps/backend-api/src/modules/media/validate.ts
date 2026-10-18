import { MediaError } from './types';

const jpeg = Buffer.from([0xff, 0xd8, 0xff]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const gif87 = Buffer.from('GIF87a');
const gif89 = Buffer.from('GIF89a');
const pdf = Buffer.from('%PDF-');
const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const html = [Buffer.from('<!DOCTYPE'), Buffer.from('<html'), Buffer.from('<HTML'), Buffer.from('<script')];
const svg = Buffer.from('<svg');
const exe = Buffer.from('MZ');

function startsWith(buffer: Buffer, signature: Buffer): boolean {
  return buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);
}
function includesAscii(buffer: Buffer, value: string): boolean {
  return buffer.toString('latin1').toLowerCase().includes(value.toLowerCase());
}

export function sniffMime(declared: string, sniff: Buffer): string {
  if (html.some(signature => startsWith(sniff, signature)) || startsWith(sniff, svg) || startsWith(sniff, exe))
    throw new MediaError(415, 'Unsupported media type');
  if (declared === 'image/jpeg' && startsWith(sniff, jpeg)) return declared;
  if (declared === 'image/png' && startsWith(sniff, png)) return declared;
  if (declared === 'image/gif' && (startsWith(sniff, gif87) || startsWith(sniff, gif89))) return declared;
  if (declared === 'image/webp' && startsWith(sniff, Buffer.from('RIFF')) && sniff.subarray(8, 12).equals(Buffer.from('WEBP')))
    return declared;
  if (declared === 'application/pdf' && startsWith(sniff, pdf)) return declared;
  if (declared.startsWith('application/vnd.openxmlformats-officedocument') && startsWith(sniff, zip) &&
    includesAscii(sniff, '[content_types].xml')) return declared;
  if ((declared === 'application/msword' || declared === 'application/vnd.ms-excel' ||
    declared === 'application/vnd.ms-powerpoint') && startsWith(sniff, ole)) return declared;
  throw new MediaError(415, 'Unsupported media type');
}

export const maxSniffBytes = 65536;

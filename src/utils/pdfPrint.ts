import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JsBarcode from 'jsbarcode';
import { Member } from '../types';

interface ReceiptPayload {
  transactionId?: string;
  documentKind?: 'fine' | 'return' | 'circulation';
  issuedBy?: string;
  receivedBy?: string;
  paymentMethod?: string;
  memberName?: string;
  memberId?: string;
  memberGrade?: string;
  memberType?: string;
  bookTitle?: string;
  bookIsbn?: string;
  copyBarcode?: string;
  borrowDate?: string;
  dueDate?: string;
  returnDate?: string;
  fineAmount?: number;
}

const COLORS = {
  maroon: rgb(0.36, 0.055, 0.12),
  maroonDark: rgb(0.24, 0.035, 0.08),
  gold: rgb(0.82, 0.68, 0.39),
  ink: rgb(0.13, 0.14, 0.16),
  muted: rgb(0.42, 0.43, 0.46),
  line: rgb(0.87, 0.87, 0.88),
  paper: rgb(0.98, 0.975, 0.96),
  white: rgb(1, 1, 1),
};

const safeFilePart = (value: string) => value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'document';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const pdfBlob = (bytes: Uint8Array) => {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
};

const truncateToWidth = (value: string, font: any, size: number, maxWidth: number) => {
  let shortened = value;
  while (shortened.length > 1 && font.widthOfTextAtSize(`${shortened}...`, size) > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened}...`;
};

const wrapText = (value: string, font: any, size: number, maxWidth: number, maxLines = 2) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['—'];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = font.widthOfTextAtSize(word, size) <= maxWidth ? word : truncateToWidth(word, font, size, maxWidth);
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  const joined = lines.join(' ');
  if (joined !== words.join(' ')) lines[lines.length - 1] = truncateToWidth(lines[lines.length - 1], font, size, maxWidth);
  return lines;
};

const drawRightText = (page: any, value: string, xRight: number, y: number, size: number, font: any, color: any) => {
  const width = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: xRight - width, y, size, font, color });
};

const drawInfo = (page: any, regular: any, bold: any, label: string, value: string | undefined, x: number, y: number, width: number, maxLines = 2) => {
  page.drawText(label.toUpperCase(), { x, y, size: 7, font: bold, color: COLORS.muted });
  const lines = wrapText(value || '—', bold, 10, width, maxLines);
  page.drawText(lines.join('\n'), { x, y: y - 15, size: 10, font: bold, color: COLORS.ink, lineHeight: 12, maxWidth: width });
  return lines.length;
};

const drawSectionLabel = (page: any, bold: any, label: string, x: number, y: number) => {
  page.drawText(label.toUpperCase(), { x, y, size: 8, font: bold, color: COLORS.maroon });
};

const drawCode128 = async (pdf: PDFDocument, page: any, value: string, x: number, y: number, maxWidth: number, maxHeight: number) => {
  if (!value.trim() || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format: 'CODE128',
      lineColor: '#191619',
      background: '#FFFFFF',
      width: 1.35,
      height: 46,
      displayValue: false,
      margin: 2,
    });
    const encoded = canvas.toDataURL('image/png').split(',')[1];
    const png = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const image = await pdf.embedPng(png);
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, { x: x + (maxWidth - width) / 2, y: y + (maxHeight - height) / 2, width, height });
    return true;
  } catch {
    return false;
  }
};

export async function downloadReceiptPdf(data: ReceiptPayload) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const isFine = data.documentKind === 'fine';
  const isReturn = data.documentKind === 'return';
  const title = isFine ? 'Fine payment receipt' : isReturn ? 'Return & clearance slip' : 'Circulation receipt';
  const now = new Date();
  const reference = data.transactionId || 'TXN-AUTO';
  const amount = Number(data.fineAmount || 0);

  // Branded masthead
  page.drawRectangle({ x: 0, y: 690, width: 595, height: 152, color: COLORS.maroon });
  page.drawRectangle({ x: 0, y: 836, width: 595, height: 6, color: COLORS.gold });
  page.drawRectangle({ x: 42, y: 772, width: 38, height: 38, color: COLORS.white });
  page.drawText('RC', { x: 49, y: 783, size: 15, font: bold, color: COLORS.maroon });
  page.drawText('RAHULA COLLEGE', { x: 94, y: 794, size: 16, font: bold, color: COLORS.white });
  page.drawText('LIBRARY  /  MATARA, SRI LANKA', { x: 95, y: 777, size: 8, font: regular, color: rgb(0.94, 0.88, 0.86) });
  page.drawText('OFFICIAL RECORD', { x: 363, y: 806, size: 7, font: bold, color: COLORS.gold });
  page.drawText(title, { x: 340, y: 781, size: 15, font: bold, color: COLORS.white, maxWidth: 213 });
  page.drawText('Keep this document for your records', { x: 340, y: 762, size: 8, font: regular, color: rgb(0.94, 0.88, 0.86), maxWidth: 213 });

  // Receipt reference and amount/date summary
  page.drawRectangle({ x: 42, y: 606, width: 511, height: 68, color: COLORS.paper, borderColor: COLORS.line, borderWidth: 0.8 });
  page.drawText('RECEIPT REFERENCE', { x: 58, y: 654, size: 7, font: bold, color: COLORS.muted });
  page.drawText(reference, { x: 58, y: 636, size: 11, font: bold, color: COLORS.ink, maxWidth: 245 });
  page.drawText(now.toLocaleString('en-GB'), { x: 58, y: 620, size: 8, font: regular, color: COLORS.muted, maxWidth: 245 });
  if (isFine) {
    drawRightText(page, 'AMOUNT PAID', 537, 654, 7, bold, COLORS.muted);
    drawRightText(page, `LKR ${amount.toFixed(2)}`, 537, 628, 17, bold, COLORS.maroon);
  } else {
    drawRightText(page, 'DOCUMENT', 537, 654, 7, bold, COLORS.muted);
    drawRightText(page, isReturn ? 'RETURN' : 'CIRCULATION', 537, 636, 10, bold, COLORS.maroon);
    drawRightText(page, '1 copy', 537, 620, 8, regular, COLORS.muted);
  }

  // Member information
  page.drawRectangle({ x: 42, y: 480, width: 511, height: 112, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.8 });
  drawSectionLabel(page, bold, 'Member details', 58, 570);
  page.drawLine({ start: { x: 58, y: 558 }, end: { x: 537, y: 558 }, thickness: 0.7, color: COLORS.line });
  drawInfo(page, regular, bold, 'Member name', data.memberName, 58, 542, 250);
  drawInfo(page, regular, bold, 'Member ID', data.memberId, 326, 542, 205);
  drawInfo(page, regular, bold, 'Grade / member type', data.memberGrade || data.memberType, 58, 506, 250);
  if (data.issuedBy || data.receivedBy) drawInfo(page, regular, bold, 'Processed by', data.issuedBy || data.receivedBy, 326, 506, 205);

  // Fine invoice line item or circulation record
  page.drawRectangle({ x: 42, y: 314, width: 511, height: 150, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.8 });
  drawSectionLabel(page, bold, isFine ? 'Fee details' : 'Book details', 58, 442);
  page.drawRectangle({ x: 58, y: 412, width: 479, height: 22, color: COLORS.paper });
  page.drawText(isFine ? 'DESCRIPTION' : 'TITLE / COPY', { x: 68, y: 420, size: 7, font: bold, color: COLORS.muted });
  page.drawText(isFine ? 'AMOUNT' : 'REFERENCE', { x: 447, y: 420, size: 7, font: bold, color: COLORS.muted });
  const bookTitle = data.bookTitle || (isFine ? 'Overdue library fee' : 'Library copy');
  page.drawText(wrapText(isFine ? 'Overdue library fine' : bookTitle, bold, 10, 330, 2).join('\n'), {
    x: 68, y: 389, size: 10, font: bold, color: COLORS.ink, lineHeight: 12, maxWidth: 330,
  });
  if (isFine) {
    page.drawText(`Book: ${bookTitle}`, { x: 68, y: 367, size: 8, font: regular, color: COLORS.muted, maxWidth: 325 });
    drawRightText(page, `LKR ${amount.toFixed(2)}`, 527, 386, 10, bold, COLORS.ink);
    page.drawText(`Payment method: ${data.paymentMethod || 'Recorded at circulation desk'}`, { x: 68, y: 343, size: 8, font: regular, color: COLORS.muted, maxWidth: 440 });
  } else {
    drawRightText(page, data.copyBarcode || '—', 527, 389, 8, bold, COLORS.ink);
    page.drawText(`ISBN: ${data.bookIsbn || '—'}`, { x: 68, y: 367, size: 8, font: regular, color: COLORS.muted, maxWidth: 210 });
    page.drawText(`Copy barcode: ${data.copyBarcode || '—'}`, { x: 68, y: 351, size: 8, font: regular, color: COLORS.muted, maxWidth: 210 });
    page.drawText(`Issued: ${data.borrowDate || '—'}`, { x: 310, y: 367, size: 8, font: regular, color: COLORS.muted, maxWidth: 210 });
    page.drawText(`Due: ${data.dueDate || '—'}`, { x: 310, y: 351, size: 8, font: regular, color: COLORS.muted, maxWidth: 210 });
    if (data.returnDate) page.drawText(`Returned: ${data.returnDate}`, { x: 310, y: 335, size: 8, font: regular, color: COLORS.muted, maxWidth: 210 });
  }
  if (isFine) {
    page.drawLine({ start: { x: 68, y: 333 }, end: { x: 527, y: 333 }, thickness: 0.7, color: COLORS.line });
    page.drawText('TOTAL RECEIVED', { x: 68, y: 321, size: 7, font: bold, color: COLORS.muted });
    drawRightText(page, `LKR ${amount.toFixed(2)}`, 527, 318, 11, bold, COLORS.maroon);
  }

  // A genuine, scannable Code 128 barcode (not a decorative approximation)
  page.drawRectangle({ x: 42, y: 115, width: 511, height: 175, color: COLORS.paper, borderColor: COLORS.line, borderWidth: 0.8 });
  drawSectionLabel(page, bold, 'Scan or file by reference', 58, 270);
  const codeValue = data.copyBarcode || reference;
  const barcodeDrawn = await drawCode128(pdf, page, codeValue, 86, 158, 423, 92);
  page.drawText(codeValue, { x: 58, y: 136, size: 9, font: bold, color: COLORS.ink, maxWidth: 479 });
  if (!barcodeDrawn) page.drawText('Barcode unavailable for this reference.', { x: 58, y: 159, size: 8, font: regular, color: COLORS.muted });

  page.drawLine({ start: { x: 42, y: 91 }, end: { x: 553, y: 91 }, thickness: 0.8, color: COLORS.gold });
  page.drawText('RAHULA COLLEGE LIBRARY', { x: 42, y: 72, size: 7, font: bold, color: COLORS.maroon });
  page.drawText('Institutional copy  /  Generated by the Library Management System', { x: 42, y: 57, size: 7, font: regular, color: COLORS.muted });
  drawRightText(page, 'Matara, Sri Lanka', 553, 57, 7, regular, COLORS.muted);

  const bytes = await pdf.save();
  downloadBlob(pdfBlob(bytes), `rahula-library-${isFine ? 'fine-receipt' : isReturn ? 'return-slip' : 'receipt'}-${safeFilePart(reference)}.pdf`);
}

export async function downloadLibraryCardPdf(member: Member) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([540, 340]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: 540, height: 340, color: COLORS.paper, borderColor: COLORS.maroon, borderWidth: 2 });
  page.drawRectangle({ x: 0, y: 252, width: 540, height: 88, color: COLORS.maroon });
  page.drawRectangle({ x: 0, y: 248, width: 540, height: 4, color: COLORS.gold });
  page.drawRectangle({ x: 28, y: 276, width: 38, height: 38, color: COLORS.white });
  page.drawText('RC', { x: 35, y: 287, size: 15, font: bold, color: COLORS.maroon });
  page.drawText('RAHULA COLLEGE', { x: 80, y: 299, size: 16, font: bold, color: COLORS.white });
  page.drawText('LIBRARY  /  STUDENT IDENTITY CARD', { x: 81, y: 280, size: 8, font: regular, color: rgb(0.94, 0.88, 0.86) });
  drawRightText(page, member.type.toUpperCase(), 512, 300, 8, bold, COLORS.gold);

  page.drawRectangle({ x: 28, y: 118, width: 112, height: 112, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.8 });
  page.drawCircle({ x: 84, y: 183, size: 27, color: COLORS.maroon });
  const initials = member.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const initialsWidth = bold.widthOfTextAtSize(initials, 17);
  page.drawText(initials, { x: 84 - initialsWidth / 2, y: 177, size: 17, font: bold, color: COLORS.white });
  page.drawText(member.admissionNo || 'RC-PASS', { x: 36, y: 132, size: 8, font: bold, color: COLORS.muted, maxWidth: 96 });

  page.drawText(wrapText(member.name, bold, 15, 350, 2).join('\n'), { x: 160, y: 218, size: 15, font: bold, color: COLORS.ink, lineHeight: 17, maxWidth: 350 });
  page.drawText(member.grade || member.department || 'Rahula College', { x: 160, y: 185, size: 9, font: regular, color: COLORS.muted, maxWidth: 340 });
  page.drawText('MEMBER ID', { x: 160, y: 159, size: 7, font: bold, color: COLORS.muted });
  page.drawText(member.memberId, { x: 160, y: 144, size: 10, font: bold, color: COLORS.ink });
  page.drawText(`VALID UNTIL  ${member.expiryDate || '—'}`, { x: 312, y: 144, size: 8, font: regular, color: COLORS.muted });

  page.drawRectangle({ x: 28, y: 28, width: 484, height: 72, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.8 });
  await drawCode128(pdf, page, member.memberId, 76, 47, 388, 42);
  page.drawText(member.memberId, { x: 210, y: 34, size: 7, font: bold, color: COLORS.muted, maxWidth: 240 });

  const bytes = await pdf.save();
  downloadBlob(pdfBlob(bytes), `rahula-library-id-${safeFilePart(member.memberId)}.pdf`);
}

export function downloadMemberZpl(member: Member) {
  const barcode = member.memberId.trim();
  const escapedName = member.name.replace(/[\^~\\]/g, ' ');
  const zpl = [
    '^XA',
    '^PW784',
    '^LL320',
    '^LH0,0',
    '^BY1,3,42',
    `^FO32,24^FB720,1,0,C^A0N,28,26^FDRAHULA COLLEGE LIBRARY^FS`,
    `^FO32,64^FB720,1,0,C^A0N,24,22^FD${escapedName}^FS`,
    `^FO32,98^FB720,1,0,C^A0N,18,16^FD${barcode}^FS`,
    `^FO272,132^BCN,56,N,N,N,A^FD${barcode}^FS`,
    `^FO32,204^FB720,1,0,C^A0N,16,14^FD${member.grade || member.department || 'Rahula College'}^FS`,
    `^FO32,228^FB720,1,0,C^A0N,14,13^FDVALID UNTIL ${member.expiryDate || '—'}^FS`,
    '^XZ',
  ].join('\n');
  downloadBlob(new Blob([zpl], { type: 'text/plain' }), `rahula-library-id-${safeFilePart(member.memberId)}.zpl`);
}

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Member } from '../types';

interface ReceiptPayload {
  transactionId?: string;
  issuedBy?: string;
  receivedBy?: string;
  memberName?: string;
  memberId?: string;
  memberGrade?: string;
  memberType?: string;
  bookTitle?: string;
  bookIsbn?: string;
  copyBarcode?: string;
  borrowDate?: string;
  dueDate?: string;
  fineAmount?: number;
}

const safeFilePart = (value: string) => value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'document';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const pdfBlob = (bytes: Uint8Array) => {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
};

const barcodeBars = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  const pattern = [2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 2, 1, 3, 1, 2, 3, 1, 2, 1, 2];
  return Array.from({ length: 28 }, (_, i) => {
    const index = (hash + i * 7) % pattern.length;
    return { width: pattern[index] || 2, space: pattern[(index + 1) % pattern.length] || 1 };
  });
};

const drawBarcode = (page: any, value: string, x: number, y: number, width: number, height: number) => {
  const bars = barcodeBars(value || 'RC-CODE');
  const scale = (width - 20) / 180;
  page.drawRectangle({ x, y, width: 2.5 * scale, height, color: rgb(0, 0, 0) });
  page.drawRectangle({ x: x + 4 * scale, y, width: 1.5 * scale, height, color: rgb(0, 0, 0) });
  bars.forEach((bar, index) => {
    const barX = x + (10 + index * 5.8) * scale;
    if (barX > x + width - 14 * scale) return;
    page.drawRectangle({ x: barX, y, width: bar.width * 0.9 * scale, height, color: rgb(0, 0, 0) });
  });
  page.drawRectangle({ x: x + width - 20 * scale, y, width: 1.5 * scale, height, color: rgb(0, 0, 0) });
  page.drawRectangle({ x: x + width - 16 * scale, y, width: 2.5 * scale, height, color: rgb(0, 0, 0) });
};

const drawLabel = (page: any, font: any, label: string, value: string, y: number, pageWidth: number) => {
  page.drawText(label, { x: 42, y, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(value || '—', { x: 150, y, size: 10, font, color: rgb(0.05, 0.05, 0.05), maxWidth: pageWidth - 192 });
};

export async function downloadReceiptPdf(data: ReceiptPayload) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText('RAHULA COLLEGE LIBRARY', { x: 42, y: 790, size: 18, font: bold, color: rgb(0.05, 0.05, 0.05) });
  page.drawText('Circulation receipt', { x: 42, y: 768, size: 11, font, color: rgb(0.35, 0.35, 0.35) });
  page.drawLine({ start: { x: 42, y: 748 }, end: { x: 553, y: 748 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

  drawLabel(page, font, 'Transaction', data.transactionId || 'TXN-AUTO', 716, 595);
  drawLabel(page, font, 'Date and time', new Date().toLocaleString('en-GB'), 694, 595);
  drawLabel(page, font, 'Desk officer', data.issuedBy || data.receivedBy || 'Library staff', 672, 595);

  page.drawText('MEMBER', { x: 42, y: 630, size: 10, font: bold, color: rgb(0.05, 0.05, 0.05) });
  drawLabel(page, font, 'Name', data.memberName || '', 606, 595);
  drawLabel(page, font, 'Member ID', `${data.memberId || '—'} (${data.memberGrade || data.memberType || '—'})`, 584, 595);

  page.drawText('BOOK', { x: 42, y: 540, size: 10, font: bold, color: rgb(0.05, 0.05, 0.05) });
  drawLabel(page, font, 'Title', data.bookTitle || '', 516, 595);
  drawLabel(page, font, 'ISBN', data.bookIsbn || '—', 494, 595);
  drawLabel(page, font, 'Barcode', data.copyBarcode || '—', 472, 595);
  if (data.borrowDate) drawLabel(page, font, 'Issue date', data.borrowDate, 450, 595);
  if (data.dueDate) drawLabel(page, font, 'Due date', data.dueDate, 428, 595);
  if (data.fineAmount && data.fineAmount > 0) drawLabel(page, font, 'Fee', `LKR ${data.fineAmount.toFixed(2)}`, 406, 595);

  drawBarcode(page, data.copyBarcode || data.transactionId || 'RC-CIRC', 150, 270, 295, 70);
  page.drawText(data.copyBarcode || data.transactionId || 'RC-CIRC', { x: 205, y: 250, size: 10, font: bold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Please keep this receipt for your library record.', { x: 166, y: 220, size: 9, font, color: rgb(0.4, 0.4, 0.4) });

  const bytes = await pdf.save();
  downloadBlob(pdfBlob(bytes), `rahula-library-receipt-${safeFilePart(data.transactionId || 'receipt')}.pdf`);
}

export async function downloadLibraryCardPdf(member: Member) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([540, 340]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.06, 0.06, 0.06);
  const mid = rgb(0.38, 0.38, 0.38);
  const paper = rgb(1, 1, 1);
  const pale = rgb(0.94, 0.94, 0.94);

  page.drawRectangle({ x: 0, y: 0, width: 540, height: 340, color: paper, borderColor: ink, borderWidth: 2 });
  page.drawRectangle({ x: 0, y: 260, width: 540, height: 80, color: ink });
  page.drawText('RAHULA COLLEGE', { x: 28, y: 302, size: 18, font: bold, color: paper });
  page.drawText('LIBRARY  /  STUDENT IDENTITY CARD', { x: 29, y: 282, size: 9, font, color: rgb(0.82, 0.82, 0.82) });
  page.drawText(member.type.toUpperCase(), { x: 422, y: 302, size: 9, font: bold, color: paper });
  page.drawLine({ start: { x: 28, y: 268 }, end: { x: 512, y: 268 }, thickness: 1, color: rgb(0.55, 0.55, 0.55) });

  page.drawRectangle({ x: 28, y: 120, width: 92, height: 126, color: pale, borderColor: ink, borderWidth: 1 });
  const initials = member.name.split(' ').map((part) => part[0]).slice(0, 2).join('');
  page.drawCircle({ x: 74, y: 190, size: 27, color: ink });
  page.drawText(initials, { x: 57, y: 181, size: 20, font: bold, color: paper });
  page.drawText(member.admissionNo || 'RC-PASS', { x: 39, y: 137, size: 9, font: bold, color: mid });

  page.drawText(member.name, { x: 145, y: 220, size: 17, font: bold, color: ink, maxWidth: 360 });
  page.drawText(member.grade || member.department || 'Rahula College', { x: 145, y: 198, size: 10, font, color: mid });
  page.drawText('MEMBER ID', { x: 145, y: 169, size: 8, font: bold, color: mid });
  page.drawText(member.memberId, { x: 145, y: 153, size: 11, font: bold, color: ink });
  page.drawText(`VALID UNTIL  ${member.expiryDate || '—'}`, { x: 145, y: 134, size: 9, font, color: mid });
  if (member.house) page.drawText(`${member.house} HOUSE`, { x: 145, y: 119, size: 8, font: bold, color: mid });

  page.drawRectangle({ x: 28, y: 32, width: 484, height: 68, color: paper, borderColor: ink, borderWidth: 1 });
  drawBarcode(page, member.memberId, 100, 49, 340, 36);
  page.drawText(member.memberId, { x: 210, y: 37, size: 8, font: bold, color: ink });

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

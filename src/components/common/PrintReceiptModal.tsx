import React from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Modal } from './Modal';
import { Barcode } from './Barcode';
import { Download } from 'lucide-react';
import { downloadReceiptPdf } from '../../utils/pdfPrint';

export const PrintReceiptModal: React.FC = () => {
  const { printData, setPrintData } = useLibrary();

  if (!printData || printData.type !== 'receipt') return null;

  const data = printData.payload;
  const isFine = data.documentKind === 'fine';
  const title = printData.title || (isFine ? 'Fine Payment Receipt' : 'Circulation Receipt');
  const reference = data.transactionId || 'TXN-AUTO';
  const barcodeValue = data.copyBarcode || reference;

  const handleDownload = async () => {
    await downloadReceiptPdf(data);
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => setPrintData(null)}
      title={title}
      subtitle="Official Rahula College Library record"
      size="md"
    >
      <div className="space-y-4">
        <article className="mx-auto max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-lg">
          <header className="relative bg-[#5c0e1f] px-5 py-5 text-white">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#d1ad63]" />
            <div className="flex items-start justify-between gap-4 pt-1">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white text-sm font-black tracking-tight text-[#5c0e1f]">RC</span>
                <div className="min-w-0">
                  <h3 className="font-heading text-sm font-extrabold uppercase tracking-[0.08em]">Rahula College</h3>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/75">Library · Matara, Sri Lanka</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#e5cf9b]">Official record</p>
                <p className="mt-1 max-w-36 text-xs font-semibold leading-tight text-white">{title}</p>
              </div>
            </div>
          </header>

          <div className="space-y-4 p-5">
            <section className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-[#faf9f6] p-3">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-500">Receipt reference</p>
                <p className="mt-1 truncate font-mono text-xs font-bold text-neutral-900">{reference}</p>
                <p className="mt-1 text-[10px] text-neutral-500">{new Date().toLocaleString('en-GB')}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-500">{isFine ? 'Amount paid' : 'Document'}</p>
                {isFine ? (
                  <p className="mt-1 text-lg font-bold tracking-tight text-[#5c0e1f]">LKR {Number(data.fineAmount || 0).toFixed(2)}</p>
                ) : (
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#5c0e1f]">{data.documentKind === 'return' ? 'Return' : 'Circulation'}</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 p-3.5">
              <h4 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#5c0e1f]">Member details</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wide text-neutral-500">Member name</p>
                  <p className="mt-1 break-words text-xs font-semibold text-neutral-900">{data.memberName || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wide text-neutral-500">Member ID</p>
                  <p className="mt-1 break-all font-mono text-xs font-semibold text-neutral-900">{data.memberId || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wide text-neutral-500">Grade / member type</p>
                  <p className="mt-1 text-xs font-medium text-neutral-800">{data.memberGrade || data.memberType || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wide text-neutral-500">Processed by</p>
                  <p className="mt-1 break-words text-xs font-medium text-neutral-800">{data.issuedBy || data.receivedBy || 'Library staff'}</p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-neutral-200">
              <div className="border-b border-neutral-200 bg-[#faf9f6] px-3.5 py-2.5">
                <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#5c0e1f]">{isFine ? 'Fee details' : 'Book details'}</h4>
              </div>
              {isFine ? (
                <div className="space-y-3 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900">Overdue library fine</p>
                      <p className="mt-1 break-words text-[10px] text-neutral-500">Book: {data.bookTitle || '—'}</p>
                    </div>
                    <p className="shrink-0 font-mono text-xs font-bold text-neutral-900">LKR {Number(data.fineAmount || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between border-t border-neutral-100 pt-2 text-[10px]">
                    <span className="text-neutral-500">Payment method</span>
                    <span className="max-w-[65%] text-right font-medium text-neutral-800">{data.paymentMethod || 'Recorded at circulation desk'}</span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-2 text-xs font-bold">
                    <span>Total received</span>
                    <span className="text-[#5c0e1f]">LKR {Number(data.fineAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 p-3.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-neutral-500">Title</span>
                    <span className="text-right font-semibold text-neutral-900">{data.bookTitle || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-2">
                    <div><span className="block text-[9px] uppercase tracking-wide text-neutral-500">ISBN</span><span className="mt-1 block break-all text-[10px] text-neutral-800">{data.bookIsbn || '—'}</span></div>
                    <div><span className="block text-[9px] uppercase tracking-wide text-neutral-500">Copy barcode</span><span className="mt-1 block break-all font-mono text-[10px] text-neutral-800">{data.copyBarcode || '—'}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-2 text-[10px]">
                    <div><span className="text-neutral-500">Issued:</span><span className="ml-1 font-medium text-neutral-800">{data.borrowDate || '—'}</span></div>
                    <div><span className="text-neutral-500">Due:</span><span className="ml-1 font-medium text-neutral-800">{data.dueDate || '—'}</span></div>
                    {data.returnDate && <div className="col-span-2"><span className="text-neutral-500">Returned:</span><span className="ml-1 font-medium text-neutral-800">{data.returnDate}</span></div>}
                    {data.fineAmount > 0 && <div className="col-span-2 flex justify-between border-t border-neutral-100 pt-2 font-semibold"><span>Fee recorded</span><span className="text-[#5c0e1f]">LKR {Number(data.fineAmount).toFixed(2)}</span></div>}
                  </div>
                </div>
              )}
            </section>

            <div className="flex flex-col items-center rounded-lg border border-neutral-200 bg-[#faf9f6] p-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-500">Scan or file by reference</p>
              <Barcode value={barcodeValue} width={250} height={42} showText={false} className="!border-0 !p-0" />
              <p className="mt-1 break-all text-center font-mono text-[10px] font-semibold text-neutral-700">{barcodeValue}</p>
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-[#d1ad63] pt-3 text-[9px] text-neutral-500">
              <span className="font-semibold uppercase tracking-wide text-[#5c0e1f]">Rahula College Library</span>
              <span>Institutional copy · Matara, Sri Lanka</span>
            </footer>
          </div>
        </article>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <button
            onClick={() => setPrintData(null)}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-xl bg-[#5c0e1f] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#74172d]"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

import React from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Modal } from './Modal';
import { CollegeCrest } from './CollegeCrest';
import { Barcode } from './Barcode';
import { Download } from 'lucide-react';
import { downloadReceiptPdf } from '../../utils/pdfPrint';

export const PrintReceiptModal: React.FC = () => {
  const { printData, setPrintData } = useLibrary();

  if (!printData || printData.type !== 'receipt') return null;

  const data = printData.payload;

  const handleDownload = async () => {
    await downloadReceiptPdf(data);
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => setPrintData(null)}
      title="Circulation Slip / Official Receipt"
      subtitle="Institutional clearance & member record"
      size="md"
    >
      <div className="space-y-4">
        {/* Printable Paper Canvas */}
        <div
          id="printable-section"
          className="bg-white text-neutral-900 border border-neutral-300 p-6 rounded-2xl shadow-xs font-mono text-xs max-w-md mx-auto"
        >
          {/* Header */}
          <div className="text-center border-b pb-3 border-neutral-200">
            <div className="flex justify-center mb-1">
              <CollegeCrest size="sm" showText={false} />
            </div>
            <h3 className="font-heading font-extrabold text-sm uppercase text-neutral-900 tracking-wider">
              Rahula College Library
            </h3>
            <p className="text-[10px] text-neutral-500 font-sans">
              Resource Centre & Circulation Desk • Matara, Sri Lanka
            </p>
          </div>

          {/* Receipt Info */}
          <div className="py-3 border-b border-neutral-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-neutral-500">Transaction Ref:</span>
              <span className="font-bold">{data.transactionId || 'TXN-AUTO'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Timestamp:</span>
              <span>{new Date().toLocaleString('en-GB')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Desk Officer:</span>
              <span>{data.issuedBy || data.receivedBy || 'Staff Librarian'}</span>
            </div>
          </div>

          {/* Member Details */}
          <div className="py-3 border-b border-neutral-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-neutral-500">Borrower:</span>
              <span className="font-bold">{data.memberName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Member ID:</span>
              <span>{data.memberId} ({data.memberGrade || data.memberType})</span>
            </div>
          </div>

          {/* Book Details */}
          <div className="py-3 border-b border-neutral-200 space-y-1.5">
            <div className="flex justify-between font-bold text-neutral-800">
              <span className="truncate max-w-[200px]">{data.bookTitle}</span>
              <span>1 Copy</span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-600">
              <span>ISBN: {data.bookIsbn}</span>
              <span>Barcode: {data.copyBarcode}</span>
            </div>
            {data.borrowDate && (
              <div className="flex justify-between text-neutral-600">
                <span>Issue Date:</span>
                <span>{data.borrowDate}</span>
              </div>
            )}
            {data.dueDate && (
              <div className="flex justify-between font-bold text-red-900">
                <span>Due Return Date:</span>
                <span>{data.dueDate}</span>
              </div>
            )}
            {data.fineAmount > 0 && (
              <div className="flex justify-between font-bold text-red-600 pt-1 border-t border-neutral-100">
                <span>Settled Fee:</span>
                <span>LKR {data.fineAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Barcode representation */}
          <div className="pt-4 flex flex-col items-center">
            <Barcode value={data.copyBarcode || data.transactionId || 'RC-CIRC'} width={180} height={40} />
            <p className="text-[9px] text-neutral-400 font-sans text-center mt-2">
              Please present this clearance slip or return books on/before the due date.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={() => setPrintData(null)}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-xs font-bold text-white bg-red-800 hover:bg-red-700 rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

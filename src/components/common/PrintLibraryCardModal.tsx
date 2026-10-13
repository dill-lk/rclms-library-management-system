import React from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Modal } from './Modal';
import { CollegeCrest } from './CollegeCrest';
import { Barcode } from './Barcode';
import { Download, FileCode } from 'lucide-react';
import { downloadLibraryCardPdf, downloadMemberZpl } from '../../utils/pdfPrint';

export const PrintLibraryCardModal: React.FC = () => {
  const { printData, setPrintData } = useLibrary();

  if (!printData || printData.type !== 'card') return null;

  const member = printData.payload;

  const handleDownloadPdf = async () => {
    await downloadLibraryCardPdf(member);
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => setPrintData(null)}
      title="Student library card"
      subtitle="Black-and-white printable ID card"
      size="md"
    >
      <div className="space-y-4">
        {/* Printable Card Container */}
        <div
          id="printable-section"
          className="w-full max-w-sm mx-auto bg-white text-neutral-950 p-5 rounded-3xl shadow-xl border border-neutral-300 relative overflow-hidden select-none"
        >
          {/* Top Brand Header */}
          <div className="flex items-center justify-between border-b-2 border-neutral-950 pb-3">
            <CollegeCrest size="sm" />
            <div className="text-right">
              <span className="text-[9px] font-mono tracking-[0.2em] text-neutral-500 uppercase block font-semibold">
                LIBRARY CARD
              </span>
              <span className="text-[10px] font-bold text-neutral-950 uppercase tracking-wider block font-mono mt-0.5">
                {member.type}
              </span>
            </div>
          </div>

          {/* Middle Body */}
          <div className="mt-5 flex gap-4 items-center">
            {/* Photo Avatar Frame */}
            <div className="w-20 h-24 rounded-2xl bg-neutral-100 border border-neutral-300 overflow-hidden flex flex-col items-center justify-center text-center p-1 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-base">
                {member.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
              </div>
              <span className="text-[8px] font-mono text-neutral-600 mt-1 uppercase">
                {member.admissionNo || 'RC-PASS'}
              </span>
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-extrabold text-sm text-neutral-950 truncate leading-tight">
                {member.name}
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                {member.grade || member.department || 'Rahula College'}
              </p>

              {member.house && (
                <div className="mt-2">
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-300 inline-block">
                    {member.house} House
                  </span>
                </div>
              )}

              <div className="mt-2 text-[9px] text-neutral-500 space-y-0.5 font-mono">
                <div>ID: {member.memberId}</div>
                <div>EXP: {member.expiryDate}</div>
              </div>
            </div>
          </div>

          {/* Barcode Strip */}
          <div className="mt-5 pt-3 border-t-2 border-neutral-950 bg-white rounded-xl p-2 flex flex-col items-center">
            <Barcode value={member.memberId} width={180} height={35} showText={false} />
            <span className="text-[9px] font-mono font-bold text-neutral-950 tracking-wider mt-1">
              {member.memberId}
            </span>
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
            onClick={() => downloadMemberZpl(member)}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-1.5 transition"
          >
            <FileCode className="w-4 h-4" />
            <span>Download ZPL</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 text-xs font-bold text-white bg-red-800 hover:bg-red-700 rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download ID PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

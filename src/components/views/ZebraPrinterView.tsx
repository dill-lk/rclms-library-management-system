import React, { useState, useMemo, useEffect } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Barcode } from '../common/Barcode';
import { Book, LabelQueueItem } from '../../types';
import { checkZebraBrowserPrintStatus, sendZplToZebraBrowserPrint, ZebraPrinterDevice } from '../../utils/zebraService';
import {
  Printer,
  Copy,
  Download,
  Settings,
  Layers,
  Sparkles,
  CheckCircle2,
  FileCode,
  Tag,
  BookOpen,
  Info,
  Check,
  Zap,
  Plus,
  Trash2,
  Send,
  Usb,
  ZoomIn,
  AlertCircle,
  Wifi,
  ExternalLink
} from 'lucide-react';

export const ZebraPrinterView: React.FC = () => {
  const {
    books,
    labelQueue,
    addToLabelQueue,
    addManyToLabelQueue,
    removeFromLabelQueue,
    clearLabelQueue,
    flushNextLabelRow,
    assignShelfToCopies,
    addToast,
  } = useLibrary();

  // Mode: 3-Sticker Strip Queue vs Catalog Book vs Batch Generator
  const [activeTabMode, setActiveTabMode] = useState<'queue_buffer' | 'quick_book' | 'batch_series'>('queue_buffer');

  // Exact 3-Across Physical Dimensions matching Zebra Designer Setup Wizard
  const labelWidthMm = 30.0; // 30.00 mm
  const labelHeightMm = 15.0; // 15.00 mm
  const marginHorizontalMm = 2.0; // 2.00 mm Left / Right margin
  const marginTopMm = 3.0; // 3.00 mm Top margin
  const labelGapMm = 2.0; // 2.00 mm Horizontal gap between stickers
  const totalRollWidthMm = 98.0; // 2mm + 30mm + 2mm + 30mm + 2mm + 30mm + 2mm = 98.00 mm

  // Print Darkness & Speed
  const [printDarkness, setPrintDarkness] = useState<number>(22);
  const [printSpeed, setPrintSpeed] = useState<number>(4);

  const [zebraDevice, setZebraDevice] = useState<ZebraPrinterDevice | null>(null);
  const [isBrowserPrintActive, setIsBrowserPrintActive] = useState(false);
  const [activeHost, setActiveHost] = useState('http://127.0.0.1:9100');
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedZpl, setCopiedZpl] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<boolean>(true);

  // Catalog Book Selector
  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || '');
  const [quickCopiesCount, setQuickCopiesCount] = useState<number>(3);

  // Quick Book Entry
  const [quickBarcode, setQuickBarcode] = useState<string>('');

  // Registered catalogue copy batch and shelf assignment
  const [batchCount, setBatchCount] = useState(6);
  const [batchShelf, setBatchShelf] = useState('');

  useEffect(() => {
    checkZebraBrowserPrintStatus().then((result) => {
      setIsBrowserPrintActive(result.isAvailable);
      if (result.activeHost) setActiveHost(result.activeHost);
      if (result.defaultPrinter) setZebraDevice(result.defaultPrinter);
    }).catch(() => setIsBrowserPrintActive(false));
  }, []);

  const selectedBook = books.find((b) => b.id === selectedBookId) || books[0];

  // Derived 3-sticker physical rows
  const queueRows = useMemo(() => {
    const rows: (LabelQueueItem | null)[][] = [];
    for (let i = 0; i < labelQueue.length; i += 3) {
      rows.push([
        labelQueue[i] || null,
        labelQueue[i + 1] || null,
        labelQueue[i + 2] || null,
      ]);
    }
    return rows;
  }, [labelQueue]);

  const currentSticker1 = labelQueue[0] || null;
  const currentSticker2 = labelQueue[1] || null;
  const currentSticker3 = labelQueue[2] || null;
  const currentStickerCount = [currentSticker1, currentSticker2, currentSticker3].filter(Boolean).length;
  const isRowComplete = currentStickerCount === 3;

  // Generate ZPL for the preferred 3-across 30 × 15 mm sticker roll.
  const generateZplForRow = (row: (LabelQueueItem | null)[]) => {
    // 98mm total roll width = 784 dots (203 DPI = 8 dots/mm)
    // Left margin: 2.00mm = 16 dots
    // Sticker width: 30.00mm = 240 dots
    // Horizontal gap: 2.00mm = 16 dots
    // Slot 1: Left = 16 dots (Center = 136 dots)
    // Slot 2: Left = 272 dots (Center = 392 dots)
    // Slot 3: Left = 528 dots (Center = 648 dots)
    const slotLefts = [16, 272, 528];

    let zpl = `^XA\n`;
    zpl += `^PW784\n`;
    zpl += `^LL120\n`;
    zpl += `^LH0,0\n`;
    zpl += `^PR${printSpeed},${printSpeed}\n`;
    zpl += `~SD${printDarkness}\n`;
    zpl += `^BY1,3,42\n`; // Taller barcode fills the sticker without crowding the title

    row.forEach((item, slotIdx) => {
      if (!item) return; // Leave empty slot unprinted

      const slotLeftX = slotLefts[slotIdx];
      const cleanField = (value: string) => value.replace(/[\^~\x00-\x1F]/g, ' ').trim();
      const cleanBarcode = cleanField(item.barcode);
      const fullBookTitle = cleanField(item.title);
      const numericCode = /^\d{4,}$/.test(cleanBarcode);
      const estimatedModules = numericCode
        ? 35 + Math.ceil(cleanBarcode.length / 2) * 11
        : 35 + cleanBarcode.length * 11;
      const availableDots = 208; // 30 mm slot minus 2 mm quiet margins on both sides
      const moduleWidth = Math.max(1, Math.min(3, Math.floor(availableDots / (estimatedModules + 20))));
      const barcodeWidth = estimatedModules * moduleWidth;
      const barcodeX = slotLeftX + Math.max(16, Math.round((240 - barcodeWidth) / 2));

      // The barcode uses the available sticker width and a taller print height;
      // shelf location is intentionally not printed on catalog labels.
      zpl += `^FO${slotLeftX},2^FB240,1,0,C^A0N,11,10^FDRAHULA COLLEGE^FS\n`;
      zpl += `^BY${moduleWidth},3,52\n`;
      zpl += `^FO${barcodeX},17^BCN,52,N,N,N,A^FD${cleanBarcode}^FS\n`;
      zpl += `^FO${slotLeftX},71^FB240,1,0,C^A0N,10,9^FD${cleanBarcode}^FS\n`;
      zpl += `^FO${slotLeftX},84^FB240,2,0,C^A0N,11,10^FD${fullBookTitle}^FS\n`;
    });

    zpl += `^XZ\n`;
    return zpl;
  };

  // Printing always uses the validated queue, never a generated preview barcode.
  const fullZplCode = useMemo(() => {
    if (labelQueue.length === 0) return '^XA\n^PW784\n^LL120\n; No registered physical copies are queued\n^XZ';
    return queueRows.map((row) => generateZplForRow(row)).join('\n');
  }, [labelQueue, queueRows, printDarkness, printSpeed]);

  // Copy instructions to Clipboard
  const handleCopyPrinterFile = () => {
    navigator.clipboard.writeText(fullZplCode);
    setCopiedZpl(true);
    addToast({
      type: 'success',
      title: 'Printer file copied',
      message: 'The label instructions were copied.',
    });
    setTimeout(() => setCopiedZpl(false), 2500);
  };

  // Download instructions File
  const handleDownloadPrinterFile = () => {
    const blob = new Blob([fullZplCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rahula_library_labels_${Date.now()}.zpl`;
    a.click();
    addToast({
      type: 'info',
      title: 'Printer file downloaded',
      message: 'Ready to send to the connected label printer.',
    });
  };

  const downloadZplFile = (code: string, suffix = 'labels') => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rahula-library-${suffix}-${Date.now()}.zpl`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'ZPL file downloaded', message: 'Send this file to the label printer when you are ready.' });
  };

  const printZplWithBrowser = async (code: string) => {
    setIsPrinting(true);
    const result = await sendZplToZebraBrowserPrint(code, zebraDevice, activeHost);
    setIsPrinting(false);
    if (result.success) {
      addToast({ type: 'success', title: 'Labels sent to printer', message: 'The Zebra printer received the label file.' });
      return true;
    }
    addToast({ type: 'warning', title: 'Printer not ready', message: result.message || 'Open Zebra Browser Print and try again.' });
    return false;
  };

  // Print Full 3-Sticker Row (Consumes 3 items from queue)
  const handlePrintFullRow = async () => {
    if (labelQueue.length < 3) {
      addToast({
        type: 'warning',
        title: 'Row Incomplete',
        message: `${labelQueue.length} of 3 stickers ready. Add more books or use 'Force Print 1 Sticker'.`,
      });
      return;
    }

    const row = labelQueue.slice(0, 3);
    const zpl = generateZplForRow(row);
    if (await printZplWithBrowser(zpl)) flushNextLabelRow();
  };

  // Force Print 1 Sticker Now (Consumes only 1 item from queue)
  const handleForcePrintOne = async () => {
    if (labelQueue.length === 0) {
      addToast({
        type: 'error',
        title: 'Queue is Empty',
        message: 'Add at least one book to print.',
      });
      return;
    }

    const item = labelQueue[0];
    const zpl = generateZplForRow([item, null, null]);
    if (await printZplWithBrowser(zpl)) removeFromLabelQueue(item.id);
  };

  // Scan/enter a barcode and resolve it to an existing physical catalogue copy.
  const handleAddQuickBook = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = quickBarcode.trim().toLowerCase();
    const matchedBook = books.find((book) => !book.isArchived && book.copies.some((copy) => copy.barcode.toLowerCase() === barcode));
    const matchedCopy = matchedBook?.copies.find((copy) => copy.barcode.toLowerCase() === barcode);
    if (!matchedBook || !matchedCopy) {
      addToast({ type: 'error', title: 'Copy not found', message: 'Only barcodes already registered to a physical catalogue copy can be printed.' });
      return;
    }
    addToLabelQueue({
      bookId: matchedBook.id,
      copyId: matchedCopy.copyId,
      title: matchedBook.title,
      barcode: matchedCopy.barcode,
      shelfLocation: matchedCopy.shelfLocation || matchedBook.shelfLocation || 'Shelf not assigned',
      category: matchedBook.category,
      copyNumber: matchedCopy.copyNumber,
    });
    setQuickBarcode('');
  };

  // Queue only existing copy records from the selected catalogue title.
  const handleAddCatalogBook = () => {
    if (!selectedBook) return;
    const copies = selectedBook.copies.slice(0, quickCopiesCount);
    if (copies.length === 0) {
      addToast({ type: 'warning', title: 'No registered copies', message: `“${selectedBook.title}” has no physical copy records to label.` });
      return;
    }
    if (copies.length < quickCopiesCount) {
      addToast({ type: 'info', title: 'Registered copies only', message: `Only ${copies.length} physical ${copies.length === 1 ? 'copy is' : 'copies are'} registered for “${selectedBook.title}”.` });
    }
    addManyToLabelQueue(copies.map((copy) => ({
      bookId: selectedBook.id,
      copyId: copy.copyId,
      title: selectedBook.title,
      barcode: copy.barcode,
      shelfLocation: copy.shelfLocation || selectedBook.shelfLocation || 'Shelf not assigned',
      category: selectedBook.category,
      copyNumber: copy.copyNumber,
    })));
  };

  // Save shelf changes to the real copy rows before queueing their labels.
  const handleAddBatchSeries = async () => {
    if (!selectedBook) return;
    const location = batchShelf.trim();
    if (!location) {
      addToast({ type: 'warning', title: 'Shelf location required', message: 'Enter the real destination shelf before assigning and printing copies.' });
      return;
    }
    const copies = selectedBook.copies.slice(0, Math.max(0, Math.floor(batchCount)));
    if (!copies.length || copies.length !== batchCount) {
      addToast({ type: 'warning', title: 'Registered copies only', message: `Choose a batch count between 1 and ${selectedBook.copies.length} registered physical copies.` });
      return;
    }
    const result = await assignShelfToCopies(copies.map((copy) => copy.copyId), location);
    if (!result.success) return;
    addManyToLabelQueue(copies.map((copy) => ({
      bookId: selectedBook.id,
      copyId: copy.copyId,
      title: selectedBook.title,
      barcode: copy.barcode,
      shelfLocation: location,
      category: selectedBook.category,
      copyNumber: copy.copyNumber,
    })));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Exact 98mm × 15mm Thermal Roll Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: 98mm 15mm;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          header, aside, nav, button, .no-print, .app-header {
            display: none !important;
          }
          .zebra-print-strip {
            display: flex !important;
            flex-direction: row !important;
            width: 98mm !important;
            height: 15mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            justify-content: space-between !important;
            page-break-after: always;
          }
          .zebra-single-sticker {
            width: 30mm !important;
            height: 15mm !important;
            box-sizing: border-box !important;
            padding: 1mm 1.5mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            font-family: monospace, sans-serif !important;
          }
        }
      `}</style>

      {/* Simple print header */}
      <div className="rounded-3xl bg-[#14171F] p-6 lg:p-8 text-white border border-neutral-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs font-semibold">
              <Printer className="w-3.5 h-3.5 text-neutral-300" />
              <span>Print labels</span>
            </span>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${isBrowserPrintActive ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-neutral-900 border-neutral-700 text-neutral-300'}`}>
              <span>{isBrowserPrintActive ? 'Printer ready' : 'Printer not detected'}</span>
            </span>
          </div>

          <h1 className="flex items-center gap-2 text-2xl lg:text-3xl font-extrabold tracking-tight">
            Print Book Labels
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-2xl">
            Add a book, review the preview, and print its library label.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => printZplWithBrowser(fullZplCode)}
            disabled={labelQueue.length === 0 || isPrinting}
            className="px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-950/40 transition"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>{isPrinting ? 'Sending to printer...' : 'Print labels'}</span>
          </button>
        </div>
      </div>

      {/* Visual 3-Sticker Strip Card */}
      <div className="bg-white dark:bg-[#14171F] rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Labels ready to print
              </h2>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                isRowComplete
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-500/30'
              }`}>
                {isRowComplete ? '3 of 3 labels ready' : `${currentStickerCount} of 3 labels ready`}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Add up to three books, then print them together.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrintFullRow}
              disabled={labelQueue.length < 3}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Print full row</span>
            </button>

            <button
              onClick={handleForcePrintOne}
              disabled={labelQueue.length === 0}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-md transition"
              title="Print queued sticker(s) in a partial row immediately"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Print these labels</span>
            </button>

            {labelQueue.length > 0 && (
              <button
                onClick={clearLabelQueue}
                className="p-2.5 rounded-xl text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                title="Clear queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Plain-language print note */}
        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-neutral-400" />
          <span>Labels are prepared for the library sticker roll. You can print a partial row when needed.</span>
        </div>

        {/* Visual 3 Stickers in One Line */}
        <div className="p-5 rounded-2xl bg-neutral-100 dark:bg-[#0B0D11] border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
            <span>Label preview</span>
            <button
              onClick={() => setPreviewZoom(!previewZoom)}
              className="text-amber-500 hover:underline flex items-center gap-1 font-semibold"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{previewZoom ? 'Smaller preview' : 'Larger preview'}</span>
            </button>
          </div>

          {/* The 3 Physical Sticker Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Sticker 1 (Left: 30mm x 15mm) */}
            <div className={`rounded-xl border p-3 flex flex-col justify-between transition ${
              currentSticker1
                ? 'bg-white dark:bg-[#181B22] border-amber-500/50 shadow-md'
                : 'border-2 border-dashed border-neutral-300 dark:border-neutral-800 text-neutral-400'
            } ${previewZoom ? 'min-h-[120px]' : 'min-h-[90px]'}`}>
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-neutral-100 dark:border-neutral-800 pb-1 text-neutral-400">
                <span className="font-bold text-amber-500">Label 1</span>
                <span>Position 1</span>
              </div>

              {currentSticker1 ? (
                <div className="space-y-1.5 my-1">
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-red-700 dark:text-red-400 font-mono">RAHULA COLLEGE LIBRARY</span>
                  </div>
                  <div className="w-full py-0.5">
                    <Barcode value={currentSticker1.barcode} width={220} height={38} showText={false} />
                  </div>
                  <div className="flex flex-col items-center text-center text-[9px] font-mono text-neutral-900 dark:text-neutral-200">
                    <span className="font-bold">{currentSticker1.barcode}</span>
                    <span className="max-w-full truncate text-[8px] text-neutral-500">{currentSticker1.title}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-neutral-400 text-xs">
                  <span>Waiting for a book</span>
                </div>
              )}

              {currentSticker1 && (
                <button
                  onClick={() => removeFromLabelQueue(currentSticker1.id)}
                  className="self-end text-[10px] text-neutral-400 hover:text-rose-500 transition"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Sticker 2 (Center: 30mm x 15mm) */}
            <div className={`rounded-xl border p-3 flex flex-col justify-between transition ${
              currentSticker2
                ? 'bg-white dark:bg-[#181B22] border-amber-500/50 shadow-md'
                : 'border-2 border-dashed border-neutral-300 dark:border-neutral-800 text-neutral-400'
            } ${previewZoom ? 'min-h-[120px]' : 'min-h-[90px]'}`}>
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-neutral-100 dark:border-neutral-800 pb-1 text-neutral-400">
                <span className="font-bold text-amber-500">Label 2</span>
                <span>Position 2</span>
              </div>

              {currentSticker2 ? (
                <div className="space-y-1.5 my-1">
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-red-700 dark:text-red-400 font-mono">RAHULA COLLEGE LIBRARY</span>
                  </div>
                  <div className="w-full py-0.5">
                    <Barcode value={currentSticker2.barcode} width={220} height={38} showText={false} />
                  </div>
                  <div className="flex flex-col items-center text-center text-[9px] font-mono text-neutral-900 dark:text-neutral-200">
                    <span className="font-bold">{currentSticker2.barcode}</span>
                    <span className="max-w-full truncate text-[8px] text-neutral-500">{currentSticker2.title}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-neutral-400 text-xs">
                  <span>Waiting for a book</span>
                </div>
              )}

              {currentSticker2 && (
                <button
                  onClick={() => removeFromLabelQueue(currentSticker2.id)}
                  className="self-end text-[10px] text-neutral-400 hover:text-rose-500 transition"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Sticker 3 (Right: 30mm x 15mm) */}
            <div className={`rounded-xl border p-3 flex flex-col justify-between transition ${
              currentSticker3
                ? 'bg-white dark:bg-[#181B22] border-emerald-500/60 shadow-md'
                : 'border-2 border-dashed border-neutral-300 dark:border-neutral-800 text-neutral-400'
            } ${previewZoom ? 'min-h-[120px]' : 'min-h-[90px]'}`}>
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-neutral-100 dark:border-neutral-800 pb-1 text-neutral-400">
                <span className="font-bold text-amber-500">Label 3</span>
                <span>Position 3</span>
              </div>

              {currentSticker3 ? (
                <div className="space-y-1.5 my-1">
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-red-700 dark:text-red-400 font-mono">RAHULA COLLEGE LIBRARY</span>
                  </div>
                  <div className="w-full py-0.5">
                    <Barcode value={currentSticker3.barcode} width={220} height={38} showText={false} />
                  </div>
                  <div className="flex flex-col items-center text-center text-[9px] font-mono text-neutral-900 dark:text-neutral-200">
                    <span className="font-bold">{currentSticker3.barcode}</span>
                    <span className="max-w-full truncate text-[8px] text-neutral-500">{currentSticker3.title}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-neutral-400 text-xs">
                  <span>+ Add another book to fill the row</span>
                </div>
              )}

              {currentSticker3 && (
                <button
                  onClick={() => removeFromLabelQueue(currentSticker3.id)}
                  className="self-end text-[10px] text-neutral-400 hover:text-rose-500 transition"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>


      </div>

      {/* Main Grid: Add Books Left + printer file Output Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Add Books to Queue */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#14171F] rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Choose books to label
              </h3>

              <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTabMode('queue_buffer')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTabMode === 'queue_buffer'
                      ? 'bg-white dark:bg-[#1E222D] text-amber-500 shadow-xs'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Scan a registered copy
                </button>
                <button
                  onClick={() => setActiveTabMode('quick_book')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTabMode === 'quick_book'
                      ? 'bg-white dark:bg-[#1E222D] text-amber-500 shadow-xs'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  From catalogue
                </button>
                <button
                  onClick={() => setActiveTabMode('batch_series')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTabMode === 'batch_series'
                      ? 'bg-white dark:bg-[#1E222D] text-amber-500 shadow-xs'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Batch + shelf assignment
                </button>
              </div>
            </div>

            {/* Scan a registered physical copy */}
            {activeTabMode === 'queue_buffer' && (
              <form onSubmit={handleAddQuickBook} className="space-y-4">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Scan or enter a registered physical-copy barcode
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Scan an existing copy barcode"
                    value={quickBarcode}
                    onChange={(e) => setQuickBarcode(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-mono text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-neutral-500">The title, barcode, and assigned shelf are loaded from the catalogue copy record.</p>
                  <button type="submit" className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition">
                    <Plus className="w-4 h-4" />
                    <span>Add registered copy</span>
                  </button>
                </div>
              </form>
            )}

            {/* From catalogue Mode */}
            {activeTabMode === 'quick_book' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Choose a book from the catalogue
                  </label>
                  <select
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {books.filter((book) => !book.isArchived).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} — {b.author} ({b.copies.length} physical copies)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBook?.copies.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">This title has no registered physical copies. Add its copy records in the catalogue before printing labels.</p>}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                    <span>Registered copies to queue:</span>
                    {[1, 2, 3, 6].filter((n) => n <= (selectedBook?.copies.length || 0)).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQuickCopiesCount(n)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          quickCopiesCount === n
                            ? 'bg-amber-500 text-neutral-950'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCatalogBook}
                    disabled={!selectedBook || selectedBook.copies.length === 0 || quickCopiesCount > selectedBook.copies.length}
                    className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add {quickCopiesCount} registered label{quickCopiesCount > 1 ? 's' : ''}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Persist a shelf assignment and queue labels for actual catalogue copies */}
            {activeTabMode === 'batch_series' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Catalogue title</label>
                  <select
                    value={selectedBookId}
                    onChange={(e) => {
                      const nextBook = books.find((book) => book.id === e.target.value);
                      setSelectedBookId(e.target.value);
                      setBatchCount(Math.min(batchCount, nextBook?.copies.length || 0));
                      setBatchShelf(nextBook?.shelfLocation || '');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {books.filter((book) => !book.isArchived).map((book) => <option key={book.id} value={book.id}>{book.title} ({book.copies.length} copies)</option>)}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Number of registered copies
                    <input type="number" min={1} max={selectedBook?.copies.length || 1} value={batchCount} onChange={(e) => setBatchCount(parseInt(e.target.value, 10) || 0)} className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-mono" />
                    <span className="mt-1 block text-[10px] font-normal text-neutral-500">{selectedBook?.copies.length || 0} registered physical copies available.</span>
                  </label>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Assign to shelf
                    <input type="text" maxLength={120} value={batchShelf} onChange={(e) => setBatchShelf(e.target.value)} placeholder="e.g. SRI-FIC-01" className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs" />
                    <span className="mt-1 block text-[10px] font-normal text-neutral-500">Saved to each selected physical-copy record before labels are queued.</span>
                  </label>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-neutral-500">Uses the first {batchCount} registered copies only; no new barcodes are generated.</span>
                  <button
                    type="button"
                    onClick={handleAddBatchSeries}
                    disabled={!selectedBook || selectedBook.copies.length === 0 || batchCount < 1 || batchCount > selectedBook.copies.length || !batchShelf.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save shelf &amp; queue labels</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Queued Items List */}
          <div className="bg-white dark:bg-[#14171F] rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Labels waiting ({labelQueue.length} stickers)
              </h3>
              <span className="text-xs font-mono text-neutral-500">
                {Math.ceil(labelQueue.length / 3)} complete rows
              </span>
            </div>

            {labelQueue.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center">
                No labels are waiting. Add books above to prepare labels.
              </p>
            ) : (
              <div className="space-y-2">
                {queueRows.map((row, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-3 rounded-xl bg-neutral-50 dark:bg-[#0B0D11] border border-neutral-200 dark:border-neutral-800 text-xs flex items-center justify-between"
                  >
                    <span className="font-mono font-bold text-amber-500">Row #{rIdx + 1}</span>
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                      {row.map((item, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            item
                              ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                              : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400'
                          }`}
                        >
                          {item ? item.barcode : 'Empty'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: printer file-II Code & Direct Print */}
      <div className="hidden lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#14171F] rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Printer instructions
                </h3>
              </div>
              <button
                onClick={handleCopyPrinterFile}
                className="text-xs text-amber-500 hover:underline font-semibold flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedZpl ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-neutral-950 text-amber-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 select-all border border-neutral-800">
              {fullZplCode}
            </pre>

            <div className="text-[11px] text-neutral-400 space-y-1">
              <p>• <strong>^PW784</strong>: 98mm Print Width (203 DPI = 8 dots/mm)</p>
              <p>• <strong>^LL120</strong>: 15mm Label Height</p>
              <p>• <strong>Slots</strong>: Slot 1 (X=16), Slot 2 (X=272), Slot 3 (X=528)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

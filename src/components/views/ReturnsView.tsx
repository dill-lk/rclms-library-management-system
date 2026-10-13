import React, { useEffect, useMemo, useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Search, BookOpen, UserRound, Check, AlertTriangle, CalendarDays, Receipt, X } from 'lucide-react';

export const ReturnsView: React.FC = () => {
  const { circulation, returnBook, settings, setPrintData, addToast } = useLibrary();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [condition, setCondition] = useState<'good' | 'fair' | 'damaged'>('good');
  const [collectFineNow, setCollectFineNow] = useState(true);
  const [returnNotes, setReturnNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const activeLoans = circulation.filter((loan) => ['active', 'overdue', 'renewed'].includes(loan.status));
  const selectedRecord = activeLoans.find((loan) => loan.id === selectedRecordId || loan.transactionId === selectedRecordId) || null;
  const filteredLoans = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return activeLoans.filter((loan) => !q || loan.bookTitle.toLowerCase().includes(q) || loan.memberName.toLowerCase().includes(q) || loan.copyBarcode.toLowerCase().includes(q) || loan.transactionId.toLowerCase().includes(q));
  }, [activeLoans, searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const exact = activeLoans.find((loan) => loan.copyBarcode.toLowerCase() === q || loan.transactionId.toLowerCase() === q);
    if (exact) setSelectedRecordId(exact.id);
  }, [searchQuery, circulation]);

  const daysLate = selectedRecord ? Math.max(0, Math.ceil((new Date().getTime() - new Date(selectedRecord.dueDate).getTime()) / 86400000)) : 0;
  const fine = daysLate * (settings.dailyOverdueFine || settings.finePerDayLkr || 5);

  const handleReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRecord || saving) return;
    setSaving(true);
    const result = await returnBook(selectedRecord.transactionId, condition, returnNotes.trim() || undefined, collectFineNow);
    setSaving(false);
    if (!result.success) {
      addToast({ type: 'error', title: 'Could not complete return', message: result.message });
      return;
    }
    setPrintData({ type: 'receipt', title: 'Official Return & Clearance Slip', payload: { ...selectedRecord, returnDate: new Date().toISOString().split('T')[0], fineAmount: result.fine || 0, receivedBy: 'Library desk' } });
    setSelectedRecordId(null); setSearchQuery(''); setReturnNotes('');
  };

  return (
    <form onSubmit={handleReturn} className="min-h-full space-y-5 text-neutral-100">
      <header className="rounded-2xl border border-neutral-800 bg-[#111113] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">Circulation / Check-in</p><h1 className="text-2xl font-semibold tracking-tight text-white">Return a book</h1><p className="mt-1 text-sm text-neutral-400">Scan the copy, check its condition, and close the loan.</p></div><div className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400">{activeLoans.length} open {activeLoans.length === 1 ? 'loan' : 'loans'}</div></div>
        <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] font-semibold"><div className="border-t border-white pt-3 text-white">01 · Find loan</div><div className={`border-t pt-3 ${selectedRecord ? 'border-white text-white' : 'border-neutral-700 text-neutral-500'}`}>02 · Check copy</div><div className={`border-t pt-3 ${selectedRecord ? 'border-white text-white' : 'border-neutral-700 text-neutral-500'}`}>03 · Complete</div></div>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_390px]">
        <section className="rounded-2xl border border-neutral-800 bg-[#111113] p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-white">Find an open loan</h2><p className="mt-1 text-xs text-neutral-500">Exact barcode typing selects the loan automatically.</p></div><Search className="h-5 w-5 text-neutral-600" /></div>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-neutral-600" /><input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Scan or type copy barcode..." className="w-full rounded-xl border border-neutral-700 bg-[#0b0b0c] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-white" /></div>
          <div className="mt-4 space-y-2">{activeLoans.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center"><BookOpen className="mx-auto h-8 w-8 text-neutral-700" /><p className="mt-3 text-sm font-semibold text-neutral-400">No open loans</p><p className="mt-1 text-xs text-neutral-600">Every recorded copy is currently on the shelf.</p></div> : filteredLoans.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">No loan matches that search.</div> : filteredLoans.map((loan) => { const selected = selectedRecord?.id === loan.id; const overdue = new Date(loan.dueDate) < new Date(); return <button type="button" key={loan.id} onClick={() => setSelectedRecordId(loan.id)} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${selected ? 'border-white bg-white text-black' : 'border-neutral-800 bg-[#171719] text-white hover:border-neutral-600'}`}><span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{loan.bookTitle}</span>{overdue && <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${selected ? 'bg-black text-white' : 'border border-neutral-700 text-neutral-400'}`}>Overdue</span>}</span><span className={`mt-1 flex items-center gap-2 text-xs ${selected ? 'text-neutral-700' : 'text-neutral-500'}`}><UserRound className="h-3.5 w-3.5" />{loan.memberName} · <span className="font-mono">{loan.copyBarcode}</span></span></span><span className={`font-mono text-xs ${selected ? 'text-neutral-700' : 'text-neutral-500'}`}>Due {loan.dueDate}</span></button>; })}</div>
        </section>

        <aside className="h-fit rounded-2xl border border-neutral-800 bg-[#111113] p-5 xl:sticky xl:top-5">
          {!selectedRecord ? <div className="flex min-h-[380px] flex-col items-center justify-center text-center"><Receipt className="h-10 w-10 text-neutral-700" /><h2 className="mt-4 font-semibold text-neutral-300">Select a loan</h2><p className="mt-2 max-w-xs text-xs leading-relaxed text-neutral-600">Choose a loan on the left or scan a copy barcode to start the return.</p></div> : <>
            <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Return details</p><h2 className="mt-2 text-lg font-semibold text-white">{selectedRecord.bookTitle}</h2><p className="mt-1 text-xs text-neutral-500">{selectedRecord.memberName} · copy {selectedRecord.copyBarcode}</p></div><button type="button" onClick={() => setSelectedRecordId(null)} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-white"><X className="h-4 w-4" /></button></div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-neutral-800 bg-[#171719] p-3"><span className="block text-neutral-600">Issued</span><span className="mt-1 block font-mono text-neutral-300">{selectedRecord.borrowDate}</span></div><div className="rounded-xl border border-neutral-800 bg-[#171719] p-3"><span className="block text-neutral-600">Due</span><span className="mt-1 block font-mono text-neutral-300">{selectedRecord.dueDate}</span></div></div>
            {daysLate > 0 && <div className="mt-4 flex gap-3 rounded-xl border border-neutral-700 bg-[#1b1b1d] p-4"><AlertTriangle className="h-5 w-5 shrink-0 text-neutral-300" /><div><p className="text-sm font-semibold text-white">{daysLate} {daysLate === 1 ? 'day' : 'days'} overdue</p><p className="mt-1 text-xs text-neutral-500">Estimated fine: LKR {fine.toFixed(2)}</p></div></div>}
            <div className="mt-5"><p className="mb-2 text-xs font-semibold text-neutral-400">How is the copy?</p><div className="grid grid-cols-3 gap-2">{(['good', 'fair', 'damaged'] as const).map((value) => <button type="button" key={value} onClick={() => setCondition(value)} className={`rounded-xl border px-2 py-3 text-xs font-semibold capitalize ${condition === value ? 'border-white bg-white text-black' : 'border-neutral-700 bg-[#171719] text-neutral-400 hover:border-neutral-500'}`}>{value}</button>)}</div></div>
            {fine > 0 && <label className="mt-4 flex items-start gap-3 rounded-xl border border-neutral-800 bg-[#171719] p-3 text-xs text-neutral-400"><input type="checkbox" checked={collectFineNow} onChange={(e) => setCollectFineNow(e.target.checked)} className="mt-0.5 accent-white" /><span>Collect LKR {fine.toFixed(2)} now</span></label>}
            <label className="mt-4 block"><span className="mb-2 block text-xs text-neutral-500">Note for staff (optional)</span><input value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Pages, cover, or other note..." className="w-full rounded-xl border border-neutral-700 bg-[#0b0b0c] px-3 py-2.5 text-sm text-white outline-none focus:border-white" /></label>
            <button disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black hover:bg-neutral-200 disabled:opacity-30"><Check className="h-4 w-4" />{saving ? 'Saving return...' : 'Complete return'}</button>
            <p className="mt-3 flex items-center gap-2 text-[11px] text-neutral-600"><CalendarDays className="h-3.5 w-3.5" />The copy will be available again after confirmation.</p>
          </>}
        </aside>
      </div>
    </form>
  );
};

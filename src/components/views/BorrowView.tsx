import React, { useMemo, useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Search, UserRound, BookOpen, CalendarDays, Check, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';

export const BorrowView: React.FC = () => {
  const { members, books, issueBook, settings, setPrintData, addToast } = useLibrary();
  const [memberSearch, setMemberSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedCopyBarcode, setSelectedCopyBarcode] = useState('');
  const [customDays, setCustomDays] = useState(settings.defaultStudentLoanDays || 14);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const memberResults = useMemo(() => members.filter((m) => {
    const q = memberSearch.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.memberId.toLowerCase().includes(q) || (m.admissionNo || '').toLowerCase().includes(q);
  }).slice(0, 8), [members, memberSearch]);

  const bookResults = useMemo(() => books.filter((b) => {
    if (b.isArchived) return false;
    const q = bookSearch.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q) || b.copies.some((c: any) => c.barcode.toLowerCase().includes(q));
  }).slice(0, 8), [books, bookSearch]);

  const availableCopies = selectedBook?.copies?.filter((c: any) => c.status === 'available') || [];
  const eligible = Boolean(selectedMember && selectedMember.status === 'active' && selectedMember.currentlyBorrowedCount < selectedMember.maxBorrowLimit && selectedMember.unpaidFines <= 100);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + Math.max(1, Math.min(60, Number(customDays) || 1)));
  const dueDateText = dueDate.toISOString().split('T')[0];

  const chooseMember = (member: any) => {
    setSelectedMember(member); setMemberSearch('');
    setCustomDays(member.type === 'teacher' ? settings.defaultTeacherLoanDays : settings.defaultStudentLoanDays);
  };
  const chooseBook = (book: any) => {
    setSelectedBook(book); setBookSearch('');
    setSelectedCopyBarcode(book.copies.find((c: any) => c.status === 'available')?.barcode || '');
  };
  const handleBookSearch = (value: string) => {
    setBookSearch(value);
    const q = value.trim().toLowerCase();
    if (!q) return;
    const exact = books.find((b) => !b.isArchived && (b.isbn.toLowerCase() === q || b.copies.some((c: any) => c.barcode.toLowerCase() === q)));
    if (exact) chooseBook(exact);
  };

  const handleIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMember || !selectedBook || !selectedCopyBarcode || !eligible || saving) return;
    setSaving(true);
    const result = await issueBook(selectedMember.id, selectedBook.id, selectedCopyBarcode, Number(customDays), notes.trim() || undefined);
    setSaving(false);
    if (result.success && result.record) {
      setPrintData({ type: 'receipt', title: 'Circulation Borrow Slip', payload: result.record });
      setNotes('');
    } else if (!result.success) {
      addToast({ type: 'error', title: 'Could not issue book', message: result.message });
    }
  };

  return (
    <form onSubmit={handleIssue} className="min-h-full space-y-5 text-neutral-100">
      <header className="rounded-2xl border border-neutral-800 bg-[#111113] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">Library desk / New loan</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Issue a book</h1>
            <p className="mt-1 text-sm text-neutral-400">Select a reader, scan one physical copy, then confirm the return date.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-400"><span className="h-2 w-2 rounded-full bg-white" /> Ready for checkout</div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] font-semibold">
          {[['01', 'Reader', Boolean(selectedMember)], ['02', 'Copy', Boolean(selectedBook && selectedCopyBarcode)], ['03', 'Confirm', eligible && Boolean(selectedBook && selectedCopyBarcode)]].map(([number, label, done]) => (
            <div key={String(number)} className={`flex items-center gap-2 border-t pt-3 ${done ? 'border-white text-white' : 'border-neutral-700 text-neutral-500'}`}><span>{number}</span><span>{label}</span></div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-neutral-800 bg-[#111113] p-5">
            <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-white p-2 text-black"><UserRound className="h-4 w-4" /></div><div><h2 className="font-semibold text-white">Reader</h2><p className="text-xs text-neutral-500">Search by name, member ID, or admission number.</p></div></div>
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-neutral-600" /><input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search reader..." className="w-full rounded-xl border border-neutral-700 bg-[#0b0b0c] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-white" />{memberSearch && <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-neutral-700 bg-[#171719] shadow-2xl">{memberResults.map((m) => <button type="button" key={m.id} onClick={() => chooseMember(m)} className="flex w-full items-center justify-between border-b border-neutral-800 px-4 py-3 text-left hover:bg-neutral-800"><span><span className="block text-sm font-semibold text-white">{m.name}</span><span className="text-xs text-neutral-500">{m.memberId} · {m.type}</span></span><ArrowRight className="h-4 w-4 text-neutral-500" /></button>)}</div>}</div>
            {selectedMember && <div className={`mt-4 flex items-center justify-between rounded-xl border p-4 ${eligible ? 'border-neutral-700 bg-[#18181b]' : 'border-neutral-600 bg-[#1b1b1d]'}`}><div><p className="font-semibold text-white">{selectedMember.name}</p><p className="mt-1 text-xs text-neutral-500">{selectedMember.memberId} · {selectedMember.currentlyBorrowedCount}/{selectedMember.maxBorrowLimit} books out · LKR {selectedMember.unpaidFines.toFixed(2)} unpaid</p></div>{eligible ? <span className="rounded-full border border-neutral-600 px-2.5 py-1 text-[10px] font-bold uppercase text-neutral-300">Eligible</span> : <span className="flex items-center gap-1 text-xs text-neutral-300"><AlertCircle className="h-4 w-4" /> Not eligible</span>}</div>}
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-[#111113] p-5">
            <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-white p-2 text-black"><BookOpen className="h-4 w-4" /></div><div><h2 className="font-semibold text-white">Book copy</h2><p className="text-xs text-neutral-500">Type an exact barcode to select it instantly.</p></div></div>
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-neutral-600" /><input value={bookSearch} onChange={(e) => handleBookSearch(e.target.value)} placeholder="Scan or type copy barcode..." className="w-full rounded-xl border border-neutral-700 bg-[#0b0b0c] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-white" />{bookSearch && <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-neutral-700 bg-[#171719] shadow-2xl">{bookResults.map((b) => <button type="button" key={b.id} onClick={() => chooseBook(b)} className="flex w-full items-center justify-between border-b border-neutral-800 px-4 py-3 text-left hover:bg-neutral-800"><span><span className="block text-sm font-semibold text-white">{b.title}</span><span className="text-xs text-neutral-500">{b.author} · {b.isbn}</span></span><span className="text-xs text-neutral-400">{b.availableCopies} available</span></button>)}</div>}</div>
            {selectedBook && <div className="mt-4 rounded-xl border border-neutral-700 bg-[#18181b] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{selectedBook.title}</p><p className="mt-1 text-xs text-neutral-500">{selectedBook.author} · {selectedBook.isbn}</p></div><span className="rounded-full border border-neutral-600 px-2.5 py-1 text-[10px] font-bold uppercase text-neutral-400">{availableCopies.length} available</span></div><select value={selectedCopyBarcode} onChange={(e) => setSelectedCopyBarcode(e.target.value)} className="mt-4 w-full rounded-xl border border-neutral-700 bg-[#0b0b0c] px-3 py-2.5 text-sm text-white outline-none focus:border-white"><option value="">Choose a physical copy</option>{availableCopies.map((copy: any) => <option key={copy.copyId} value={copy.barcode}>{copy.barcode} · {copy.condition}</option>)}</select></div>}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-neutral-800 bg-[#111113] p-5 xl:sticky xl:top-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Loan details</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Return date</h2>
          <div className="mt-5 space-y-4 text-sm"><div className="flex items-center justify-between border-b border-neutral-800 pb-3"><span className="text-neutral-500">Today</span><span className="font-mono text-white">{new Date().toISOString().split('T')[0]}</span></div><label className="block"><span className="mb-2 block text-neutral-500">Loan length</span><div className="flex items-center gap-2"><input type="number" min="1" max="60" value={customDays} onChange={(e) => setCustomDays(Number(e.target.value))} className="w-24 rounded-xl border border-neutral-700 bg-[#0b0b0c] px-3 py-2 text-white outline-none focus:border-white" /><span className="text-neutral-500">days</span></div></label><div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-black"><span className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4" /> Return by</span><span className="font-mono font-bold">{dueDateText}</span></div><label className="block"><span className="mb-2 block text-neutral-500">Note for staff (optional)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Condition, request, or reminder..." className="w-full resize-none rounded-xl border border-neutral-700 bg-[#0b0b0c] px-3 py-2 text-sm text-white outline-none focus:border-white" /></label></div>
          <button disabled={!selectedMember || !selectedBook || !selectedCopyBarcode || !eligible || saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"><Check className="h-4 w-4" />{saving ? 'Saving loan...' : 'Confirm issue'}</button>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-neutral-600"><RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" />The copy becomes unavailable only after Supabase confirms the loan.</p>
        </aside>
      </div>
    </form>
  );
};

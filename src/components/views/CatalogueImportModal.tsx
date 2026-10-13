import React, { useState, useRef } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { getSupabase } from '../../utils/supabaseClient';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Download,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react';

interface CatalogueImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedBookRow {
  book_accession_number: string;
  book_title: string;
  subtitle?: string;
  author_name: string;
  language_medium: string;
  ddc_code: string;
  category_name: string;
  publisher?: string;
  publication_year?: number;
  edition?: string;
  shelf_identifier?: string;
  synopsis_academic_notes?: string;
  keywords?: string[];
  number_of_physical_copies_to_add: number;
  isValid: boolean;
  validationError?: string;
}

export const CatalogueImportModal: React.FC<CatalogueImportModalProps> = ({ isOpen, onClose }) => {
  const { addBook, addToast, refreshAllData } = useLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedBookRow[]>([]);
  const [isDryRunValid, setIsDryRunValid] = useState<boolean | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [importReport, setImportReport] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const parseCsvText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      addToast({
        type: 'error',
        title: 'Empty File',
        message: 'The selected CSV file does not contain header or data rows.',
      });
      return;
    }

    // Parse CSV line taking quotes into account
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let insideQuote = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          result.push(cur.trim().replace(/^["']|["']$/g, ''));
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
    const accessionIdx = headers.findIndex((h) => h.includes('accession') || h.includes('isbn') || h.includes('barcode') || h.includes('parigahana'));
    const titleIdx = headers.findIndex((h) => h.includes('title') && !h.includes('sub'));
    const subtitleIdx = headers.findIndex((h) => h.includes('sub'));
    const authorIdx = headers.findIndex((h) => h.includes('author'));
    const langIdx = headers.findIndex((h) => h.includes('lang'));
    const ddcIdx = headers.findIndex((h) => h.includes('ddc') || h.includes('code'));
    const catIdx = headers.findIndex((h) => h.includes('cat'));
    const pubIdx = headers.findIndex((h) => h.includes('pub') && !h.includes('year'));
    const yearIdx = headers.findIndex((h) => h.includes('year'));
    const editionIdx = headers.findIndex((h) => h.includes('edition'));
    const shelfIdx = headers.findIndex((h) => h.includes('shelf') || h.includes('location'));
    const notesIdx = headers.findIndex((h) => h.includes('synopsis') || h.includes('note') || h.includes('desc'));
    const keywordsIdx = headers.findIndex((h) => h.includes('keyword') || h.includes('tag'));
    const copiesIdx = headers.findIndex((h) => h.includes('cop') || h.includes('stock') || h.includes('qty'));

    const seenAccessions = new Set<string>();
    const rows: ParsedBookRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length < 2) continue;

      const accession = (accessionIdx >= 0 ? cols[accessionIdx] : cols[0]) || '';
      const title = (titleIdx >= 0 ? cols[titleIdx] : cols[1]) || '';
      const author = (authorIdx >= 0 ? cols[authorIdx] : cols[2]) || '';
      const ddc = (ddcIdx >= 0 ? cols[ddcIdx] : '891.48') || 'General';
      const category = (catIdx >= 0 ? cols[catIdx] : 'General') || 'General';
      const lang = (langIdx >= 0 ? cols[langIdx] : 'Sinhala (සිංහල)') || 'Sinhala (සිංහල)';
      const publisher = pubIdx >= 0 ? cols[pubIdx] : '';
      const year = yearIdx >= 0 && !isNaN(Number(cols[yearIdx])) ? Number(cols[yearIdx]) : new Date().getFullYear();
      const copies = copiesIdx >= 0 && !isNaN(Number(cols[copiesIdx])) ? Math.max(1, Number(cols[copiesIdx])) : 1;

      let error = '';
      if (!accession) error = 'Missing accession number.';
      else if (!title) error = 'Missing book title.';
      else if (!author) error = 'Missing author name.';
      else if (seenAccessions.has(accession)) error = `Duplicate accession number in file: ${accession}`;

      seenAccessions.add(accession);

      rows.push({
        book_accession_number: accession,
        book_title: title,
        subtitle: subtitleIdx >= 0 ? cols[subtitleIdx] : undefined,
        author_name: author,
        language_medium: lang,
        ddc_code: ddc,
        category_name: category,
        publisher,
        publication_year: year,
        edition: editionIdx >= 0 ? cols[editionIdx] : '1st Edition',
        shelf_identifier: shelfIdx >= 0 ? cols[shelfIdx] : 'Shelf A-01',
        synopsis_academic_notes: notesIdx >= 0 ? cols[notesIdx] : '',
        keywords: keywordsIdx >= 0 && cols[keywordsIdx] ? cols[keywordsIdx].split(',').map((k) => k.trim()) : [],
        number_of_physical_copies_to_add: copies,
        isValid: !error,
        validationError: error || undefined,
      });
    }

    setParsedRows(rows);
    setIsDryRunValid(rows.every((r) => r.isValid));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportReport(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  // Perform Batch Import into Supabase or Local Context
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      addToast({
        type: 'error',
        title: 'No Valid Records',
        message: 'No valid title records to import.',
      });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validRows.length });

    const supabase = getSupabase();
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportProgress({ current: i + 1, total: validRows.length });

      try {
        if (supabase) {
          // 1. Insert Book in Supabase
          const { data: insertedBook, error: bkErr } = await supabase
            .from('books')
            .upsert(
              {
                book_accession_number: row.book_accession_number,
                book_title: row.book_title,
                subtitle: row.subtitle,
                author_name: row.author_name,
                language_medium: row.language_medium,
                ddc_code: row.ddc_code,
                category_name: row.category_name,
                publisher: row.publisher,
                publication_year: row.publication_year,
                edition: row.edition,
                shelf_identifier: row.shelf_identifier,
                synopsis_academic_notes: row.synopsis_academic_notes,
                keywords: row.keywords,
                total_physical_copies: row.number_of_physical_copies_to_add,
                available_physical_copies: row.number_of_physical_copies_to_add,
              },
              { onConflict: 'book_accession_number' }
            )
            .select()
            .single();

          if (bkErr) {
            failCount++;
            errors.push(`${row.book_accession_number}: ${bkErr.message}`);
            continue;
          }

          // 2. Insert Physical Copies
          if (insertedBook && row.number_of_physical_copies_to_add > 0) {
            const copiesToInsert = Array.from({ length: row.number_of_physical_copies_to_add }).map((_, idx) => ({
              book_id: insertedBook.id,
              book_accession_number: row.book_accession_number,
              copy_number: idx + 1,
              copy_barcode: idx === 0 ? row.book_accession_number : `${row.book_accession_number}-${idx + 1}`,
              shelf_identifier: row.shelf_identifier || 'Shelf A-01',
              condition: 'new',
              status: 'available',
            }));

            await supabase.from('physical_copies').upsert(copiesToInsert, { onConflict: 'copy_barcode' });
          }
        }

        // Also add to local in-memory store
        addBook({
          title: row.book_title,
          subtitle: row.subtitle,
          author: row.author_name,
          isbn: row.book_accession_number,
          category: row.category_name,
          publisher: row.publisher || '',
          publicationYear: row.publication_year || 2024,
          edition: row.edition || '1st Edition',
          language: row.language_medium.includes('English') ? 'English' : 'Sinhala',
          totalCopies: row.number_of_physical_copies_to_add,
          shelfLocation: row.shelf_identifier || 'Shelf A-01',
          section: '',
          description: row.synopsis_academic_notes || '',
          rating: 4.8,
          tags: row.keywords || [],
          copies: [],
        });

        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push(`${row.book_accession_number}: ${err.message || 'Unknown error'}`);
      }
    }

    setIsImporting(false);
    setImportReport({ imported: successCount, failed: failCount, errors });
    await refreshAllData();

    addToast({
      type: successCount > 0 ? 'success' : 'error',
      title: 'Import Completed',
      message: `Successfully cataloged ${successCount} titles (${failCount} failed).`,
    });
  };

  const handleDownloadTemplate = () => {
    const csvContent = `book_accession_number,book_title,subtitle,author_name,language_medium,ddc_code,category_name,publisher,publication_year,edition,shelf_identifier,synopsis_academic_notes,keywords,number_of_physical_copies_to_add\nRC-BK-7784,Madol Doova (මඩොල් දූව),The Classic Tale of Upali and Jinna,Martin Wickramasinghe,Sinhala (සිංහල),891.483,Sinhala Literature,Sarasavi Publishers,2026,1st Edition,Shelf A-01,Brief overview of the book topics or syllabus relevance.,"Sinhala literature, Sri Lankan fiction, school reading",1\n`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rclms_books_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white dark:bg-[#14171F] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Catalogue Bulk Import (CSV / Excel)
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Batch import titles and automatically register physical copies in Supabase Postgres.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* File Upload Drop Zone */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-neutral-900 dark:text-white">
                  {csvFile ? csvFile.name : 'Select or drop your books_import.csv file'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB • ${parsedRows.length} rows loaded` : 'Supports standard UTF-8 CSV with header matching RCLMS guidelines.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Template</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold transition flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Browse File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Dry Run / Validation Status Summary */}
          {parsedRows.length > 0 && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                isDryRunValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              {isDryRunValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-bold">
                  {isDryRunValid
                    ? `Validation passed for all ${parsedRows.length} title records.`
                    : `${parsedRows.filter((r) => !r.isValid).length} of ${parsedRows.length} rows have validation issues.`}
                </p>
                <p className="text-[11px] opacity-90">
                  Ready to insert into Supabase `public.books` and generate corresponding `public.physical_copies`.
                </p>
              </div>
            </div>
          )}

          {/* Preview Table (First 20 rows) */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-neutral-900 dark:text-white">
                  Preview ({Math.min(20, parsedRows.length)} of {parsedRows.length} titles)
                </h3>
                <span className="text-[11px] font-mono text-neutral-500">
                  {parsedRows.reduce((acc, r) => acc + (r.number_of_physical_copies_to_add || 1), 0)} Total Copies to Add
                </span>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Accession number</th>
                      <th className="py-2.5 px-3">Title & Author</th>
                      <th className="py-2.5 px-3">DDC & Category</th>
                      <th className="py-2.5 px-3">Copies</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {parsedRows.slice(0, 20).map((r, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                        <td className="py-2 px-3 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                          {r.book_accession_number}
                        </td>
                        <td className="py-2 px-3">
                          <p className="font-bold text-neutral-900 dark:text-white">{r.book_title}</p>
                          <p className="text-[10px] text-neutral-500">{r.author_name}</p>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-[10px] text-neutral-400">[{r.ddc_code}]</span> {r.category_name}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-neutral-700 dark:text-neutral-300">
                          {r.number_of_physical_copies_to_add}
                        </td>
                        <td className="py-2 px-3">
                          {r.isValid ? (
                            <span className="text-[10px] font-bold text-emerald-600">Valid</span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600" title={r.validationError}>
                              {r.validationError}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Final Report */}
          {importReport && (
            <div className="p-4 rounded-2xl bg-neutral-900 text-white space-y-2 border border-neutral-800">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Import Finished: {importReport.imported} Titles Cataloged</span>
              </h4>
              {importReport.failed > 0 && (
                <div className="text-[11px] text-rose-400 space-y-1">
                  <p>{importReport.failed} rows failed to insert:</p>
                  <ul className="list-disc list-inside">
                    {importReport.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-800"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || isImporting}
            className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-40"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importing ({importProgress.current}/{importProgress.total})...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Commit & Import {parsedRows.filter((r) => r.isValid).length} Books</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

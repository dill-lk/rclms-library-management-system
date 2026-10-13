import React, { useState, useEffect, useRef } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Modal } from '../common/Modal';
import { Book } from '../../types';
import { Check, AlertCircle, Plus, BookOpen, Layers } from 'lucide-react';

interface AddEditBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  editBookData?: Book | null;
}

export const AddEditBookModal: React.FC<AddEditBookModalProps> = ({
  isOpen,
  onClose,
  editBookData,
}) => {
  const { addBook, updateBook, categories, authors, publishers, setActiveTab } = useLibrary();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [accessionNumber, setAccessionNumber] = useState('');
  const [category, setCategory] = useState('');
  const [ddcCode, setDdcCode] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publicationYear, setPublicationYear] = useState<number>(2026);
  const [edition, setEdition] = useState('1st Edition');
  const [language, setLanguage] = useState<'Sinhala' | 'English' | 'Tamil' | 'Pali'>('Sinhala');
  const [totalCopies, setTotalCopies] = useState<number>(1);
  const [shelfIdentifier, setShelfIdentifier] = useState('Shelf A-01');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const saveLockRef = useRef(false);

  useEffect(() => {
    if (editBookData) {
      setTitle(editBookData.title);
      setAuthor(editBookData.author);
      setAccessionNumber(editBookData.isbn);
      setCategory(editBookData.category);
      setDdcCode(categories.find((c) => c.name === editBookData.category)?.ddcCode || '');
      setPublisher(editBookData.publisher);
      setPublicationYear(editBookData.publicationYear);
      setEdition(editBookData.edition);
      setLanguage(editBookData.language);
      setTotalCopies(editBookData.totalCopies);
      setShelfIdentifier(editBookData.shelfLocation);
    } else {
      setTitle('');
      setAuthor('');
      setAccessionNumber('');
      setCategory(categories[0]?.name || '');
      setDdcCode(categories[0]?.ddcCode || categories[0]?.code || '');
      setPublisher('');
      setPublicationYear(new Date().getFullYear());
      setEdition('1st Edition');
      setLanguage('Sinhala');
      setTotalCopies(1);
      setShelfIdentifier('');
    }
    setErrors({});
  }, [editBookData, isOpen, categories, authors, publishers]);

  // Sync DDC code when category changes
  const handleCategoryChange = (catName: string) => {
    setCategory(catName);
    const matched = categories.find((c) => c.name === catName);
    if (matched) {
      setDdcCode(matched.ddcCode || matched.code || '');
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Book title is required.';
    if (!accessionNumber.trim()) errs.accession = 'Book accession number is required.';
    if (!author.trim()) errs.author = 'Author name is required.';
    if (!category.trim()) errs.category = 'A valid category must be selected.';
    if (!ddcCode.trim() || !/^\d{3}(\.\d+)?$/.test(ddcCode.trim())) errs.ddcCode = 'Select a category with a valid DDC code.';
    if (!editBookData && totalCopies < 1) errs.totalCopies = 'Number of physical copies must be at least 1.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (addAnother = false) => {
    if (saveLockRef.current) return;
    if (!validate()) return;

    saveLockRef.current = true;
    setIsSaving(true);
    try {
      if (editBookData) {
        const updated: Book = {
          ...editBookData,
          title: title.trim(),
          author: author.trim(),
          isbn: accessionNumber.trim(),
          category,
          publisher: publisher.trim(),
          publicationYear: Number(publicationYear),
          edition: edition.trim(),
          language,
          shelfLocation: shelfIdentifier.trim(),
          section: '',
        };
        const saved = await updateBook(updated);
        if (saved !== false) onClose();
      } else {
        const saved = await addBook({
          title: title.trim(),
          author: author.trim(),
          isbn: accessionNumber.trim(),
          category,
          publisher: publisher.trim(),
          publicationYear: Number(publicationYear),
          edition: edition.trim(),
          language,
          totalCopies: Number(totalCopies),
          shelfLocation: shelfIdentifier.trim(),
          section: '',
          description: '',
          rating: 4.8,
          tags: [],
          copies: [],
        });

        if (saved === false) return;
        if (addAnother) {
          setTitle('');
          setAccessionNumber('');
        } else {
          onClose();
        }
      }
    } catch (error) {
      setErrors((current) => ({
        ...current,
        form: error instanceof Error ? error.message : 'The book could not be saved. Please try again.',
      }));
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => undefined : onClose}
      title={editBookData ? 'Edit Book Record' : 'Catalog new book to library'}
      size="xl"
      showCloseButton={!isSaving}
    >
      <div className="space-y-5 text-xs text-neutral-800 font-sans">
        {categories.length === 0 && (
          <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-neutral-600" />
              <span>No categories created yet. Create a Dewey Decimal category first before cataloging titles.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveTab('categories');
              }}
              className="px-3 py-1.5 rounded-lg bg-black text-white font-bold text-xs hover:bg-neutral-100"
            >
              + Create Category
            </button>
          </div>
        )}

        {/* Section 1: Title Metadata */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block font-bold text-neutral-900 mb-1">
                Book Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Madol Doova (මඩොල් දූව)"
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />
              {errors.title && <p className="text-neutral-900 font-bold text-[11px] mt-1">⚠️ {errors.title}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-neutral-900 mb-1">
                Author Name *
              </label>
              <input
                type="text"
                required
                list="modal-authors-list"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Martin Wickramasinghe"
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900"
              />
              <datalist id="modal-authors-list">
                {authors.map((a) => (
                  <option key={a.id} value={a.name} />
                ))}
              </datalist>
              {errors.author && <p className="text-neutral-900 font-bold text-[11px] mt-1">⚠️ {errors.author}</p>}
            </div>

            <div>
              <label className="block font-bold text-neutral-900 mb-1">
                Book Accession Number (Accession number) *
              </label>
              <input
                type="text"
                required
                value={accessionNumber}
                onChange={(e) => setAccessionNumber(e.target.value)}
                placeholder="e.g. RC-BK-7784"
                className="w-full px-3 py-2 font-mono bg-white border border-neutral-300 rounded-lg text-neutral-900"
              />
              <p className="text-[10px] text-neutral-500 mt-0.5">The unique library record identifier. This is not the ISBN.</p>
              {errors.accession && <p className="text-neutral-900 font-bold text-[11px] mt-1">⚠️ {errors.accession}</p>}
            </div>

            <div>
              <label className="block font-bold text-neutral-900 mb-1">
                Language Medium *
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900"
              >
                <option value="Sinhala">Sinhala (සිංහල)</option>
                <option value="English">English</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Pali">Pali (පාලි)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-neutral-900 mb-1">
                Category (DDC) *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.ddcCode || c.code ? `[${c.ddcCode || c.code}] ` : ''}{c.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-neutral-900 font-bold text-[11px] mt-1">{errors.category}</p>}
              <p className="text-[10px] text-neutral-500 mt-1">DDC code: {ddcCode || 'Not assigned'}</p>
              {errors.ddcCode && <p className="text-neutral-900 font-bold text-[11px] mt-1">{errors.ddcCode}</p>}
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Publisher
              </label>
              <input
                type="text"
                list="modal-publishers-list"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="e.g. Sarasavi Publishers"
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900"
              />
              <datalist id="modal-publishers-list">
                {publishers.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={publicationYear}
                  onChange={(e) => setPublicationYear(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono bg-white border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  Edition
                </label>
                <input
                  type="text"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  placeholder="1st Edition"
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Physical Copies & Shelf Placement */}
        <div className="pt-3 border-t border-neutral-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editBookData && (
              <div>
                <label className="block font-bold text-neutral-900 mb-1">
                  Number of physical copies to add
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={totalCopies}
                  onChange={(e) => setTotalCopies(Number(e.target.value))}
                  className="w-full px-3 py-2 font-mono font-bold bg-white border border-neutral-300 rounded-lg text-neutral-900"
                />
                <p className="text-[10px] text-neutral-500 mt-0.5">Creates inventory records. It does not print labels.</p>
                {errors.totalCopies && <p className="text-neutral-900 font-bold text-[11px] mt-1">⚠️ {errors.totalCopies}</p>}
              </div>
            )}

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Shelf Identifier
              </label>
              <input
                type="text"
                value={shelfIdentifier}
                onChange={(e) => setShelfIdentifier(e.target.value)}
                placeholder="e.g. Shelf A-01 (optional)"
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900"
              />
            </div>
          </div>

        </div>

        {/* Section 3: Review Before Saving Box */}
        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600">
          <p className="font-bold text-neutral-900 mb-0.5">Review before saving</p>
          <p>
            You are about to {editBookData ? 'update 1 title record' : `create 1 title and ${totalCopies} physical ${totalCopies === 1 ? 'copy' : 'copies'}`}.
            Confirm the details before committing to Supabase PostgreSQL.
          </p>
        </div>

        {errors.form && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {errors.form}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold text-neutral-800 hover:bg-neutral-100"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!editBookData && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="px-4 py-2 bg-neutral-100 text-neutral-900 rounded-lg font-bold hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Add Another
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              aria-busy={isSaving}
              className="px-6 py-2 bg-black hover:bg-neutral-100 text-white rounded-lg font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving…' : editBookData ? 'Save Changes' : 'Save Book and Copies'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

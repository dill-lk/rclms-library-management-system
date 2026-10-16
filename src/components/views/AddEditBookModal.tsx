import React, { useState, useEffect, useRef } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Modal } from '../common/Modal';
import { Book } from '../../types';
import { isValidDdcCode } from '../../utils/ddcCode';
import { BOOK_COVER_BUCKET, createBookCoverStoragePath, discardUnattachedBookCover, prepareBookCoverUpload, validateBookCoverFile } from '../../utils/bookCovers';
import { getSupabase } from '../../utils/supabaseClient';
import { Check, AlertCircle, ImagePlus, Upload, X } from 'lucide-react';

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
  const { addBook, updateBook, categories, authors, publishers, setActiveTab, isSupabaseConfigured } = useLibrary();

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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');

  useEffect(() => () => {
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

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
      setCoverFile(null);
      setCoverPreview('');
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
      setCoverFile(null);
      setCoverPreview('');
    }
    if (coverInputRef.current) coverInputRef.current.value = '';
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
    if (!isValidDdcCode(ddcCode)) errs.ddcCode = 'Select a category with a valid DDC or institutional code.';
    if (!editBookData && totalCopies < 1) errs.totalCopies = 'Number of physical copies must be at least 1.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCoverSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const message = validateBookCoverFile(file);
    if (message) {
      setCoverFile(null);
      setCoverPreview('');
      setErrors((current) => ({ ...current, coverImage: message }));
      event.target.value = '';
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setErrors((current) => {
      const next = { ...current };
      delete next.coverImage;
      return next;
    });
  };

  const clearSelectedCover = () => {
    setCoverFile(null);
    setCoverPreview('');
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleSave = async (addAnother = false) => {
    if (saveLockRef.current) return;
    if (!validate()) return;

    saveLockRef.current = true;
    setIsSaving(true);
    let uploadedCoverPath: string | undefined;
    try {
      let uploadedCoverUrl: string | undefined;
      if (coverFile) {
        if (!isSupabaseConfigured) throw new Error('Book cover uploads need the connected library storage service.');
        const supabase = getSupabase();
        if (!supabase) throw new Error('The connected library storage service could not be initialized.');

        const optimizedCover = await prepareBookCoverUpload(coverFile);
        uploadedCoverPath = createBookCoverStoragePath();
        const { error: uploadError } = await supabase.storage.from(BOOK_COVER_BUCKET).upload(uploadedCoverPath, optimizedCover, {
          upsert: false,
          contentType: 'image/webp',
          cacheControl: '31536000',
        });
        if (uploadError) throw new Error(uploadError.message || 'The cover image could not be uploaded.');
        uploadedCoverUrl = supabase.storage.from(BOOK_COVER_BUCKET).getPublicUrl(uploadedCoverPath).data.publicUrl;
      }

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
          ...(uploadedCoverUrl ? { coverImage: uploadedCoverUrl } : {}),
        };
        const saved = await updateBook(updated);
        if (saved !== false) {
          uploadedCoverPath = undefined;
          onClose();
        } else {
          await discardUnattachedBookCover(uploadedCoverPath);
          uploadedCoverPath = undefined;
        }
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
          ...(uploadedCoverUrl ? { coverImage: uploadedCoverUrl } : {}),
        }, uploadedCoverPath);

        if (saved === false) {
          uploadedCoverPath = undefined;
          return;
        }
        uploadedCoverPath = undefined;
        if (addAnother) {
          setTitle('');
          setAccessionNumber('');
          clearSelectedCover();
        } else {
          onClose();
        }
      }
    } catch (error) {
      await discardUnattachedBookCover(uploadedCoverPath);
      setErrors((current) => ({
        ...current,
        form: error instanceof Error ? error.message : 'The book could not be saved. Please try again.',
      }));
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const coverDisplayUrl = coverPreview || editBookData?.coverImage || '';

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>
        </div>

        {/* Optional Section: Cover Image */}
        <section className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-bold text-neutral-900">
                <ImagePlus className="h-4 w-4" /> Book cover image <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Optional</span>
              </h3>
              <p className="mt-1 max-w-xl text-[10px] leading-4 text-neutral-600">
                JPEG, PNG, or WebP up to 12 MB and 4096 × 4096 pixels. Covers are resized and compressed to WebP (maximum 120 KiB) before being stored outside the database.
              </p>
            </div>
            <label className={`inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[11px] font-bold text-neutral-800 hover:bg-neutral-100 ${isSaving || !isSupabaseConfigured ? 'cursor-not-allowed opacity-50' : ''}`}>
              <Upload className="h-3.5 w-3.5" /> {coverFile ? 'Choose another image' : 'Choose image'}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverSelection}
                disabled={isSaving || !isSupabaseConfigured}
                className="sr-only"
              />
            </label>
          </div>
          {coverDisplayUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2.5">
              <img src={coverDisplayUrl} alt={`Cover preview for ${title || editBookData?.title || 'book'}`} className="h-24 w-16 rounded border border-neutral-200 bg-neutral-100 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-neutral-800">{coverFile ? 'New cover selected' : 'Current cover'}</p>
                <p className="mt-0.5 truncate text-[10px] text-neutral-500">{coverFile ? coverFile.name : 'This cover stays unchanged unless you choose a replacement.'}</p>
              </div>
              {coverFile && (
                <button type="button" onClick={clearSelectedCover} disabled={isSaving} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2 text-[10px] text-neutral-500">No cover selected. You can save the book without an image.</p>
          )}
          {!isSupabaseConfigured && <p className="text-[10px] text-neutral-500">Connect the library storage service to upload a cover image.</p>}
          {errors.coverImage && <p className="text-[10px] font-semibold text-red-700">{errors.coverImage}</p>}
        </section>

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

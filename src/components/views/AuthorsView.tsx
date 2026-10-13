import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Modal } from '../common/Modal';
import { Author } from '../../types';
import {
  Users,
  Search,
  Plus,
  BookOpen,
  ChevronRight,
  Edit,
  Trash2,
  X,
  UserX,
} from 'lucide-react';

export const AuthorsView: React.FC = () => {
  const {
    authors,
    addAuthor,
    updateAuthor,
    deleteAuthor,
    books,
    setActiveTab,
    setCatalogFilter,
    currentUser,
  } = useLibrary();

  const isStaff = currentUser.role === 'super_admin' || currentUser.role === 'librarian' || currentUser.role === 'assistant_librarian';

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);

  const [name, setName] = useState('');
  const [sinhalaName, setSinhalaName] = useState('');
  const [nationality, setNationality] = useState('Sri Lankan');
  const [bornYear, setBornYear] = useState<number>(1950);
  const [biography, setBiography] = useState('');

  const openCreateModal = () => {
    setEditingAuthor(null);
    setName('');
    setSinhalaName('');
    setNationality('Sri Lankan');
    setBornYear(1950);
    setBiography('');
    setIsModalOpen(true);
  };

  const openEditModal = (aut: Author) => {
    setEditingAuthor(aut);
    setName(aut.name);
    setSinhalaName(aut.sinhalaName || '');
    setNationality(aut.nationality || 'Sri Lankan');
    setBornYear(aut.bornYear || 1950);
    setBiography(aut.biography || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingAuthor) {
      updateAuthor({
        ...editingAuthor,
        name: name.trim(),
        sinhalaName: sinhalaName.trim(),
        nationality: nationality.trim(),
        bornYear: Number(bornYear),
        biography: biography.trim(),
      });
    } else {
      addAuthor({
        name: name.trim(),
        sinhalaName: sinhalaName.trim(),
        nationality: nationality.trim(),
        bornYear: Number(bornYear),
        biography: biography.trim() || 'Author in Rahula College library collection.',
      });
    }

    setIsModalOpen(false);
  };

  const handleBrowseAuthor = (authorName: string) => {
    setCatalogFilter({ author: authorName });
    setActiveTab('books');
  };

  const filteredAuthors = authors.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.sinhalaName && a.sinhalaName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.nationality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-red-800 dark:text-amber-400" />
              <span>Authors Directory</span>
            </h2>
            <span className="text-xs bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
              {authors.length} Authors
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Directory of writers, scholars, and academic figures whose works are preserved in the library.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-red-800 hover:bg-red-700 rounded-xl shadow-card transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Author</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search authors (Martin Wickramasinghe, Clarke, Munidasa)..."
            className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Authors Cards */}
      {filteredAuthors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-12 text-center text-neutral-400 space-y-3">
          <UserX className="w-10 h-10 mx-auto opacity-30 text-amber-500" />
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {authors.length === 0 ? 'No authors registered yet.' : 'No matching authors found.'}
          </p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {authors.length === 0
              ? 'Catalog authors to organize books by creators and biographical context.'
              : `No author records match "${searchQuery}".`}
          </p>
          {authors.length === 0 && isStaff && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Register First Author</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAuthors.map((author) => {
            const actualCount = books.filter(
              (b) => b.author.toLowerCase().trim() === author.name.toLowerCase().trim()
            ).length;

            return (
              <div
                key={author.id}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-red-300 dark:hover:border-red-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/40 text-amber-300 flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                          {author.name}
                        </h3>
                        {author.sinhalaName && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {author.sinhalaName}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                      {author.nationality}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
                    {author.biography || 'Author in Rahula College library collection.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Linked Collection:</span>
                    </div>

                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {actualCount} {actualCount === 1 ? 'Title' : 'Titles'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleBrowseAuthor(author.name)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1 transition"
                  >
                    <span>View Titles</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {isStaff && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(author)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                        title="Edit Author"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove author "${author.name}"?`)) {
                            deleteAuthor(author.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                        title="Delete Author"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Author Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAuthor ? 'Edit Author Details' : 'Register New Author'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Author Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Martin Wickramasinghe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Sinhala / Native Name
              </label>
              <input
                type="text"
                placeholder="e.g. මාටින් වික්‍රමසිංහ"
                value={sinhalaName}
                onChange={(e) => setSinhalaName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Nationality
              </label>
              <input
                type="text"
                placeholder="Sri Lankan"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Biographical Details
            </label>
            <textarea
              rows={3}
              placeholder="Brief biography, literary background, or academic achievements..."
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl shadow-md"
            >
              {editingAuthor ? 'Save Changes' : 'Register Author'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

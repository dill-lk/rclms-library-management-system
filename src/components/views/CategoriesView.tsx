import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Modal } from '../common/Modal';
import { Category } from '../../types';
import {
  Layers,
  Plus,
  Search,
  BookOpen,
  MapPin,
  ChevronRight,
  FolderOpen,
  Edit,
  Trash2,
  X,
} from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    books,
    setActiveTab,
    setCatalogFilter,
    currentUser,
  } = useLibrary();

  const isStaff = currentUser.role === 'super_admin' || currentUser.role === 'librarian' || currentUser.role === 'assistant_librarian';

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [sinhalaName, setSinhalaName] = useState('');
  const [ddcCode, setDdcCode] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');
  const [description, setDescription] = useState('');

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSinhalaName('');
    setDdcCode('');
    setShelfLocation('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSinhalaName(cat.sinhalaName || '');
    setDdcCode(cat.ddcCode || '');
    setShelfLocation(cat.shelfLocation || '');
    setDescription(cat.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^\d{3}(\.\d+)?$/.test(ddcCode.trim())) return;

    let saved = false;
    if (editingCategory) {
      saved = await updateCategory({
        ...editingCategory,
        name: name.trim(),
        sinhalaName: sinhalaName.trim(),
        ddcCode: ddcCode.trim(),
        shelfLocation: shelfLocation.trim(),
        description: description.trim(),
      });
    } else {
      saved = await addCategory({
        name: name.trim(),
        sinhalaName: sinhalaName.trim(),
        ddcCode: ddcCode.trim(),
        shelfLocation: shelfLocation.trim(),
        description: description.trim() || 'Library classification division.',
        icon: 'BookOpen',
      });
    }

    if (saved !== false) setIsModalOpen(false);
  };

  const handleBrowseCategory = (catName: string) => {
    setCatalogFilter({ category: catName });
    setActiveTab('books');
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ddcCode && c.ddcCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.sinhalaName && c.sinhalaName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-heading text-neutral-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-neutral-950" />
              <span>Dewey Decimal & Subject Categories</span>
            </h2>
            <span className="text-xs bg-neutral-100 text-neutral-950 font-bold px-2 py-0.5 rounded-full">
              {categories.length} Subject Divisions
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Organize the college collection according to Dewey Decimal Classification (DDC) and institutional sections.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-neutral-950 hover:bg-neutral-100 rounded-xl shadow-card transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject Category</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -tranneutral-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search category name, Sinhala title, or DDC code..."
            className="w-full pl-9 pr-8 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-neutral-950"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -tranneutral-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Grid */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-400 space-y-3">
          <FolderOpen className="w-10 h-10 mx-auto opacity-30 text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-700">
            {categories.length === 0 ? 'No categories created yet.' : 'No matching categories found.'}
          </p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {categories.length === 0
              ? "Add your library's custom subject categories or Dewey Decimal sections."
              : `No divisions match "${searchQuery}".`}
          </p>
          {categories.length === 0 && isStaff && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-neutral-950 hover:bg-neutral-100 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create First Category</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const actualCount = books.filter((b) => b.category === cat.name).length;
            return (
              <div
                key={cat.id}
                className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs hover:border-neutral-300 transition duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-700 flex items-center justify-center font-bold">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-neutral-900 line-clamp-1">
                          {cat.name}
                        </h3>
                        {cat.sinhalaName && (
                          <p className="text-xs text-neutral-500">
                            {cat.sinhalaName}
                          </p>
                        )}
                      </div>
                    </div>

                    {cat.ddcCode && (
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {cat.ddcCode}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-600 mt-3 line-clamp-2">
                    {cat.description || 'College library classification division.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{cat.shelfLocation || 'Shelf not assigned'}</span>
                    </div>

                    <span className="font-bold text-neutral-800">
                      {actualCount} {actualCount === 1 ? 'Title' : 'Titles'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleBrowseCategory(cat.name)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1 transition"
                  >
                    <span>Browse Books</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {isStaff && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
                        title="Edit Category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete category "${cat.name}"?`)) {
                            deleteCategory(cat.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
                        title="Delete Category"
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

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Subject Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Physics & Mechanics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Sinhala Name
              </label>
              <input
                type="text"
                placeholder="e.g. භෞතික විද්‍යාව"
                value={sinhalaName}
                onChange={(e) => setSinhalaName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                DDC Code *
              </label>
              <input
                type="text"
                required
              placeholder="e.g. 530"
                value={ddcCode}
                onChange={(e) => setDdcCode(e.target.value)}
                className="w-full px-3 py-2 font-mono bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Shelf Location
            </label>
            <input
              type="text"
              placeholder="e.g. Science Section, Shelf A-01"
              value={shelfLocation}
              onChange={(e) => setShelfLocation(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Scope, subject areas, or special collection notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-neutral-300 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-neutral-950 hover:bg-neutral-100 text-white font-bold rounded-xl shadow-md"
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

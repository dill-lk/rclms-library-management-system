import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { Modal } from '../common/Modal';
import { Publisher } from '../../types';
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Edit,
  Trash2,
  X,
  CheckCircle,
} from 'lucide-react';

export const PublishersView: React.FC = () => {
  const {
    publishers,
    addPublisher,
    updatePublisher,
    deletePublisher,
    books,
    setActiveTab,
    setCatalogFilter,
    currentUser,
  } = useLibrary();

  const isStaff = currentUser.role === 'super_admin' || currentUser.role === 'librarian' || currentUser.role === 'assistant_librarian';

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const openCreateModal = () => {
    setEditingPublisher(null);
    setName('');
    setAddress('');
    setCity('');
    setPhone('');
    setEmail('');
    setIsVerified(false);
    setIsModalOpen(true);
  };

  const openEditModal = (pub: Publisher) => {
    setEditingPublisher(pub);
    setName(pub.name);
    setAddress(pub.address || '');
    setCity(pub.city || '');
    setPhone(pub.phone || (pub as any).contactNumber || '');
    setEmail(pub.email || '');
    setIsVerified(pub.isVerified ?? false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingPublisher) {
      updatePublisher({
        ...editingPublisher,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        email: email.trim(),
        isVerified,
      });
    } else {
      addPublisher({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        email: email.trim(),
        isVerified,
      });
    }

    setIsModalOpen(false);
  };

  const handleBrowsePublisher = (pubName: string) => {
    setCatalogFilter({ publisher: pubName });
    setActiveTab('books');
  };

  const filteredPublishers = publishers.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-800 dark:text-amber-400" />
              <span>Publishers & Suppliers</span>
            </h2>
            <span className="text-xs bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
              {publishers.length} Publishers
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Procurement contacts, university presses, and educational book distributors.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-red-800 hover:bg-red-700 rounded-xl shadow-card transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Publisher</span>
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
            placeholder="Search publishers (e.g. Sarasavi, Godage, Oxford, Lake House)..."
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

      {/* Publishers Grid */}
      {filteredPublishers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-12 text-center text-neutral-400 space-y-3">
          <Building2 className="w-10 h-10 mx-auto opacity-30 text-amber-500" />
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {publishers.length === 0 ? 'No publishers registered yet.' : 'No matching publishers found.'}
          </p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {publishers.length === 0
              ? 'Catalog publisher and supplier details for textbook orders and acquisitions.'
              : `No publisher records match "${searchQuery}".`}
          </p>
          {publishers.length === 0 && isStaff && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Register First Publisher</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPublishers.map((pub) => {
            const actualCount = books.filter(
              (b) => b.publisher.toLowerCase().trim() === pub.name.toLowerCase().trim()
            ).length;

            return (
              <div
                key={pub.id}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-red-300 dark:hover:border-red-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/40 text-amber-300 flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                          {pub.name}
                        </h3>
                        {pub.city && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {pub.city}
                          </p>
                        )}
                      </div>
                    </div>

                    {pub.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-neutral-300 text-neutral-700">
                        <CheckCircle className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-neutral-300 text-neutral-600">
                        Unverified
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                    {pub.address && (
                      <div className="flex items-center gap-2 text-neutral-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{pub.address}</span>
                      </div>
                    )}
                    {pub.phone && (
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-mono">{pub.phone}</span>
                      </div>
                    )}
                    {pub.email && (
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{pub.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
                    <span>Catalog Holdings:</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {actualCount} {actualCount === 1 ? 'Title' : 'Titles'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleBrowsePublisher(pub.name)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1 transition"
                  >
                    <span>Browse Catalog</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {isStaff && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(pub)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                        title="Edit Publisher"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove publisher "${pub.name}"?`)) {
                            deletePublisher(pub.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                        title="Delete Publisher"
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

      {/* Add / Edit Publisher Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPublisher ? 'Edit Publisher Details' : 'Register New Publisher'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Publisher Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sarasavi Publishers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                City / Region
              </label>
              <input
                type="text"
                placeholder="e.g. Matara or Colombo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. +94 41 222 1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Office Address
            </label>
            <input
              type="text"
              placeholder="e.g. No. 45, Anagarika Dharmapala Mawatha"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. info@publisher.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="pub-verified"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="rounded-sm border-neutral-300 text-red-800 focus:ring-red-800"
            />
            <label htmlFor="pub-verified" className="text-neutral-700 dark:text-neutral-300 font-semibold cursor-pointer">
              Mark as Verified Official Supplier
            </label>
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
              {editingPublisher ? 'Save Changes' : 'Register Publisher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import { Member, MemberType } from '../../types';
import { Modal } from '../common/Modal';
import {
  Search,
  Filter,
  Plus,
  Download,
  UserCheck,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  GraduationCap,
  Briefcase,
  Users,
  Printer,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

export const MembersView: React.FC = () => {
  const {
    members,
    addMember,
    updateMember,
    deleteMember,
    setSelectedMemberId,
    setActiveTab,
    setPrintData,
    addToast,
  } = useLibrary();

  const [activeTabType, setActiveTabType] = useState<MemberType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberType, setNewMemberType] = useState<MemberType>('student');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [newAdmissionNo, setNewAdmissionNo] = useState('');

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesType = activeTabType === 'all' || m.type === activeTabType;
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.admissionNo && m.admissionNo.includes(searchQuery)) ||
        (m.grade && m.grade.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;

      return matchesType && matchesSearch && matchesStatus;
    });
  }, [members, activeTabType, searchQuery, selectedStatus]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = () => {
    const headers = 'Member ID,Admission No,Name,Type,Email,Phone,Current Loans,Fines,Status\n';
    const rows = filteredMembers
      .map(
        (m) =>
          `"${m.memberId}","${m.admissionNo || ''}","${m.name}","${m.type}","${m.email}","${m.phone}",${m.currentlyBorrowedCount},${m.unpaidFines},"${m.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rahula_College_Library_Members_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    addToast({
      type: 'success',
      title: 'Members Exported',
      message: `Exported ${filteredMembers.length} member profiles to CSV.`,
    });
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setActiveTab('member_profile');
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const generatedMemberId = `RC-${newMemberType === 'student' ? 'STU' : newMemberType === 'teacher' ? 'TCH' : 'STF'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    addMember({
      memberId: generatedMemberId,
      admissionNo: newAdmissionNo || `${Math.floor(20000 + Math.random() * 9000)}`,
      name: newMemberName,
      type: newMemberType,
      grade: undefined,
      department: undefined,
      house: undefined,
      email: newMemberEmail || `${newMemberName.toLowerCase().replace(/\s+/g, '.')}@rahulacollege.lk`,
      phone: newMemberPhone,
      address: newMemberAddress,
      joinedDate: new Date().toISOString().split('T')[0],
      expiryDate: `${new Date().getFullYear() + 3}-12-31`,
      status: 'active',
      maxBorrowLimit: newMemberType === 'teacher' ? 7 : newMemberType === 'staff' ? 5 : 3,
    });

    setIsAddModalOpen(false);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white">
              Library Membership Directory
            </h2>
            <span className="text-xs bg-maroon-100 text-maroon-900 dark:bg-maroon-900/60 dark:text-gold-300 font-bold px-2 py-0.5 rounded-full">
              {members.length} Registered
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage students, academic faculty, and administrative staff library privileges and accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 border border-gray-200 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll New Member</span>
          </button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Type Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => {
              setActiveTabType('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTabType === 'all'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Members ({members.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTabType('student');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTabType === 'student'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Students ({members.filter((m) => m.type === 'student').length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTabType('teacher');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTabType === 'teacher'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Teachers ({members.filter((m) => m.type === 'teacher').length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTabType('staff');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTabType === 'staff'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Staff ({members.filter((m) => m.type === 'staff').length})</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search member name, ID, admission no..."
              className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-maroon-800"
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

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-gray-200"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Members</option>
              <option value="suspended">Suspended</option>
              <option value="graduated">Graduated / Alumni</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[23%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[21%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-3">Member ID</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3 text-center">Active Loans</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
              {paginatedMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition group"
                >
                  {/* Photo & Name */}
                  <td className="align-top py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-maroon-900 to-maroon-700 text-gold-300 font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                        {member.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <div
                          onClick={() => handleSelectMember(member.id)}
                          className="font-bold text-gray-900 dark:text-white cursor-pointer hover:text-maroon-800 dark:hover:text-gold-400 truncate"
                        >
                          {member.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ID */}
                  <td className="align-top break-words py-3 px-3 font-mono text-[11px] text-gray-600 dark:text-gray-400">
                    {member.memberId}
                  </td>

                  {/* Type */}
                  <td className="align-top py-3 px-3">
                    <StatusBadge status={member.type} size="sm" />
                  </td>

                  {/* Contact */}
                  <td className="align-top py-3 px-3 text-gray-500 dark:text-gray-400">
                    <div className="max-w-[220px] break-words leading-4">{member.email || '—'}</div>
                    <div className="mt-1 break-words text-[10px] font-mono leading-4">{member.phone || '—'}</div>
                  </td>

                  {/* Borrowed Count */}
                  <td className="align-top py-3 px-3 text-center">
                    <span
                      className={`font-mono font-bold ${
                        member.currentlyBorrowedCount >= member.maxBorrowLimit
                          ? 'text-red-600'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {member.currentlyBorrowedCount}
                    </span>
                    <span className="text-gray-400 font-mono"> / {member.maxBorrowLimit}</span>
                    {member.overdueCount > 0 && (
                      <span className="block text-[10px] text-red-600 font-bold">
                        ({member.overdueCount} Overdue)
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="align-top py-3 px-3">
                    <StatusBadge status={member.status} size="sm" />
                  </td>

                  {/* Actions */}
                  <td className="align-top whitespace-nowrap py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          setPrintData({
                            type: 'card',
                            title: `Library ID Card - ${member.name}`,
                            payload: member,
                          })
                        }
                        className="p-1.5 rounded-lg text-gray-400 hover:text-maroon-800 dark:hover:text-gold-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                        title="Print Library Pass"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSelectMember(member.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-maroon-800 dark:hover:text-gold-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.name} from library registration?`)) {
                            deleteMember(member.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                        title="Deregister Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-slate-800 text-xs text-gray-500 dark:text-gray-400 shadow-xs">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length} members
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-gray-800 dark:text-gray-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Enroll New Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enroll New Library Member"
        subtitle="Register student, teacher, or administrative staff account"
        size="lg"
      >
        <form onSubmit={handleCreateMember} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="e.g. Kavindu Perera"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Admission / Staff No
              </label>
              <input
                type="text"
                value={newAdmissionNo}
                onChange={(e) => setNewAdmissionNo(e.target.value)}
                placeholder="e.g. 24890"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Member Classification
              </label>
              <select
                value={newMemberType}
                onChange={(e) => setNewMemberType(e.target.value as MemberType)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
              </select>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Institutional Email
              </label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="kavindu.p24@rahulacollege.lk"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                placeholder="+94 71 234 5678"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Residential Address (Matara & Surrounding)
            </label>
            <input
              type="text"
              value={newMemberAddress}
              onChange={(e) => setNewMemberAddress(e.target.value)}
              placeholder="No. 42, Beach Road, Matara"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition"
            >
              Confirm Registration
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

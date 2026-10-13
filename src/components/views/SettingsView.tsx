import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import {
  Settings as SettingsIcon,
  Save,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
  } = useLibrary();

  const [libraryName, setLibraryName] = useState(settings.libraryName);
  const [institutionName, setInstitutionName] = useState(settings.institutionName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);

  const [openingWeekdays, setOpeningWeekdays] = useState(settings.openingHoursWeekdays);
  const [openingSaturday, setOpeningSaturday] = useState(settings.openingHoursSaturday);

  const [studentDays, setStudentDays] = useState(settings.defaultStudentLoanDays);
  const [teacherDays, setTeacherDays] = useState(settings.defaultTeacherLoanDays);
  const [staffDays, setStaffDays] = useState(settings.defaultStaffLoanDays);

  const [maxStudentBooks, setMaxStudentBooks] = useState(settings.maxStudentBooks);
  const [maxTeacherBooks, setMaxTeacherBooks] = useState(settings.maxTeacherBooks);

  const [finePerDay, setFinePerDay] = useState(settings.finePerDayLkr);
  const [gracePeriod, setGracePeriod] = useState(settings.gracePeriodDays);
  const [renewalLimit, setRenewalLimit] = useState(settings.maxRenewalCount);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      libraryName,
      institutionName,
      address,
      phone,
      email,
      openingHoursWeekdays: openingWeekdays,
      openingHoursSaturday: openingSaturday,
      defaultStudentLoanDays: Number(studentDays),
      defaultTeacherLoanDays: Number(teacherDays),
      defaultStaffLoanDays: Number(staffDays),
      maxStudentBooks: Number(maxStudentBooks),
      maxTeacherBooks: Number(maxTeacherBooks),
      finePerDayLkr: Number(finePerDay),
      gracePeriodDays: Number(gracePeriod),
      maxRenewalCount: Number(renewalLimit),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-red-700 dark:text-amber-400" />
            <span>Library Parameters & System Settings</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Configure borrowing rules, opening hours, and the library information shown to staff.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="px-5 py-2.5 text-xs font-bold text-white bg-red-800 hover:bg-red-700 rounded-xl shadow-md transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveAll} className="space-y-6 text-xs">
        {/* Section 1: Institutional Details */}
        <div className="bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold font-heading text-neutral-900 dark:text-white">
              Institutional Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Library Name
              </label>
              <input
                type="text"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                College / Institution Name
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Campus Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Official Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Circulation Rules & Fines */}
        <div className="bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold font-heading text-neutral-900 dark:text-white">
              Circulation Durations & Overdue Rates
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Student Loan Period (Days)
              </label>
              <input
                type="number"
                value={studentDays}
                onChange={(e) => setStudentDays(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono font-bold bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Teacher Loan Period (Days)
              </label>
              <input
                type="number"
                value={teacherDays}
                onChange={(e) => setTeacherDays(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono font-bold bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Max Student Quota (Books)
              </label>
              <input
                type="number"
                value={maxStudentBooks}
                onChange={(e) => setMaxStudentBooks(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono font-bold bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Overdue Rate (LKR / Day)
              </label>
              <input
                type="number"
                step="0.5"
                value={finePerDay}
                onChange={(e) => setFinePerDay(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono font-bold text-red-700 dark:text-amber-400 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Grace Period (Days)
              </label>
              <input
                type="number"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Max Renewals Allowed
              </label>
              <input
                type="number"
                value={renewalLimit}
                onChange={(e) => setRenewalLimit(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Operating Hours */}
        <div className="bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <Clock className="w-4 h-4 text-red-700 dark:text-amber-400" />
            <h3 className="text-sm font-bold font-heading text-neutral-900 dark:text-white">
              Campus Operating Hours
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Weekdays (Monday – Friday)
              </label>
              <input
                type="text"
                value={openingWeekdays}
                onChange={(e) => setOpeningWeekdays(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Saturday Reference Session
              </label>
              <input
                type="text"
                value={openingSaturday}
                onChange={(e) => setOpeningSaturday(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 font-bold text-white bg-red-800 hover:bg-red-700 rounded-xl shadow-md transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

    </div>
  );
};

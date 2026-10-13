import {
  Book,
  Member,
  CirculationRecord,
  Reservation,
  FineRecord,
  Category,
  Author,
  Publisher,
  InventoryItem,
  NotificationItem,
  UserAccount,
  SystemSettings,
} from '../types';

export const initialSettings: SystemSettings = {
  libraryName: 'Rahula College Library & Resource Centre',
  institutionName: 'Rahula College, Matara',
  mottoSinhala: '',
  mottoEnglish: '',
  foundedYear: 1923,
  address: 'Rahula College, Matara, Southern Province, Sri Lanka',
  phone: '+94 41 222 2398',
  email: 'library@rahulacollege.lk',
  website: 'https://rahulacollege.lk',
  openingHoursWeekdays: '07:30 AM – 04:30 PM (Mon – Fri)',
  openingHoursSaturday: '08:00 AM – 01:00 PM (Saturday)',
  defaultStudentLoanDays: 14,
  defaultTeacherLoanDays: 30,
  defaultStaffLoanDays: 21,
  maxStudentBooks: 3,
  maxTeacherBooks: 7,
  maxStaffBooks: 5,
  finePerDayLkr: 10.0,
  gracePeriodDays: 2,
  maxRenewalCount: 2,
  dueReminderDaysBefore: 2,
  autoSendOverdueEmail: true,
  theme: 'light',
};

// Clean zero categories (user sets up their own)
export const initialCategories: Category[] = [];

export const initialAuthors: Author[] = [];

export const initialPublishers: Publisher[] = [];

// Clean zero mock data
export const initialBooks: Book[] = [];

export const initialMembers: Member[] = [];

export const initialCirculation: CirculationRecord[] = [];

export const initialReservations: Reservation[] = [];

export const initialFines: FineRecord[] = [];

export const initialInventory: InventoryItem[] = [];

export const initialNotifications: NotificationItem[] = [];

// No seeded administrator is shipped in the client. Configure Supabase Auth
// and create the first administrator through a protected server-side process.
export const initialUsers: UserAccount[] = [];

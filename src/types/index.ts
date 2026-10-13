export type UserRole = 'super_admin' | 'librarian' | 'assistant_librarian' | 'teacher' | 'student' | 'staff';

export type BookStatus = 'available' | 'borrowed' | 'reserved' | 'lost' | 'damaged' | 'in_repair';

export type CirculationStatus = 'active' | 'returned' | 'overdue' | 'renewed' | 'cancelled';

export type ReservationStatus = 'pending' | 'ready' | 'completed' | 'cancelled';

export type FineStatus = 'unpaid' | 'paid' | 'waived' | 'none';

export type MemberType = 'student' | 'teacher' | 'staff';

export type MemberStatus = 'active' | 'suspended' | 'expired' | 'graduated';

export interface BookCopy {
  copyId: string;
  copyNumber: number;
  barcode: string;
  status: BookStatus;
  shelfLocation: string;
  condition: 'new' | 'good' | 'fair' | 'damaged';
  borrowerId?: string;
  dueDate?: string;
}

export interface Book {
  id: string;
  isArchived?: boolean;
  title: string;
  subtitle?: string;
  author: string;
  authorId?: string;
  isbn: string;
  category: string;
  categoryId?: string;
  publisher: string;
  publisherId?: string;
  publicationYear: number;
  edition: string;
  language: 'Sinhala' | 'English' | 'Tamil' | 'Pali';
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string;
  section: string; // e.g. "Main Reference Hall", "A/L Science Section", "Sri Lankan Heritage", "Fiction & Novels"
  description: string;
  coverImage?: string;
  rating: number;
  totalBorrows: number;
  addedDate: string;
  copies: BookCopy[];
  tags: string[];
}

export interface Member {
  id: string;
  memberId: string; // e.g. "RC-STU-2024-0412"
  admissionNo?: string; // e.g. "23456"
  name: string;
  type: MemberType;
  grade?: string; // e.g. "Grade 12-Maths-A", "Grade 10-B"
  house?: 'Sariputta' | 'Moggallana' | 'Ananda' | 'Rahula';
  department?: string; // For teachers, e.g. "Department of Physical Sciences"
  email: string;
  phone: string;
  address: string;
  photoUrl?: string;
  joinedDate: string;
  expiryDate: string;
  status: MemberStatus;
  maxBorrowLimit: number;
  currentlyBorrowedCount: number;
  totalBorrowedCount: number;
  overdueCount: number;
  unpaidFines: number;
}

export interface CirculationRecord {
  id: string;
  transactionId: string;
  bookId: string;
  bookTitle: string;
  bookIsbn: string;
  copyBarcode: string;
  memberId: string;
  memberName: string;
  memberType: MemberType;
  memberGrade?: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: CirculationStatus;
  fineAmount: number;
  fineStatus?: FineStatus;
  issuedBy: string;
  receivedBy?: string;
  notes?: string;
}

export interface Reservation {
  id: string;
  reservationId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookIsbn: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  requestDate: string;
  expiryDate: string;
  queuePosition: number;
  status: ReservationStatus;
  notes?: string;
}

export interface FineRecord {
  id: string;
  fineId: string;
  memberId: string;
  memberName: string;
  memberType?: MemberType;
  bookId?: string;
  bookTitle: string;
  transactionId?: string;
  dueDate?: string;
  daysLate?: number;
  amount: number; // in LKR
  status: FineStatus;
  issuedDate?: string;
  paidDate?: string;
  waivedDate?: string;
  waivedReason?: string;
  collectedBy?: string;
  receiptNumber?: string;
  reason?: string;
  notes?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  code?: string;
  ddcCode?: string;
  sinhalaName?: string;
  description?: string;
  shelfArea?: string;
  shelfLocation?: string;
  bookCount: number;
  color?: string;
  icon?: string;
}

export interface Author {
  id: string;
  name: string;
  nativeName?: string;
  sinhalaName?: string;
  nationality: string;
  biography: string;
  bookCount: number;
  birthYear?: number;
  bornYear?: number;
  deathYear?: number;
}

export interface Publisher {
  id: string;
  name: string;
  address: string;
  city: string;
  contactNumber?: string;
  phone?: string;
  email: string;
  bookCount: number;
  isVerified?: boolean;
}

export interface InventoryItem {
  id: string;
  bookId?: string;
  bookTitle: string;
  isbn?: string;
  barcode: string;
  shelf: string;
  shelfLocation?: string;
  expectedLocation?: string;
  section?: string;
  expectedCopies: number;
  actualCopies: number;
  difference: number;
  status: 'Audited - Match' | 'Missing Copy' | 'Damaged Found' | 'Pending Review' | 'Verified' | 'present' | 'missing' | 'damaged' | 'misplaced';
  lastAuditDate: string;
  auditedBy: string;
  condition?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'overdue' | 'reservation' | 'system' | 'return' | 'due_soon';
  date: string;
  read: boolean;
  link?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  designation: string;
  admissionNo?: string;
  grade?: string;
  phone?: string;
  lastLogin: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  permissions: string[];
}

export interface SystemSettings {
  libraryName: string;
  institutionName: string;
  mottoSinhala: string;
  mottoEnglish: string;
  foundedYear: number;
  address: string;
  phone: string;
  email: string;
  website: string;
  openingHoursWeekdays: string;
  openingHoursSaturday: string;
  defaultStudentLoanDays: number;
  defaultTeacherLoanDays: number;
  defaultStaffLoanDays: number;
  defaultLoanDaysStudent?: number;
  defaultLoanDaysTeacher?: number;
  maxStudentBooks: number;
  maxTeacherBooks: number;
  maxStaffBooks: number;
  finePerDayLkr: number;
  dailyOverdueFine?: number;
  gracePeriodDays: number;
  maxRenewalCount: number;
  dueReminderDaysBefore: number;
  autoSendOverdueEmail: boolean;
  theme: 'light' | 'dark' | 'maroon';
}

export interface LabelQueueItem {
  id: string;
  bookId: string;
  copyId: string;
  title: string;
  barcode: string;
  shelfLocation: string;
  category?: string;
  copyNumber?: number;
  addedAt: string;
}

export type ActiveNavTab =
  | 'dashboard'
  | 'books'
  | 'book_details'
  | 'members'
  | 'member_details'
  | 'member_profile'
  | 'profile'
  | 'borrow'
  | 'returns'
  | 'reservations'
  | 'fines'
  | 'categories'
  | 'authors'
  | 'publishers'
  | 'inventory'
  | 'reminders'
  | 'data_safety'
  | 'reports'
  | 'recommendations'
  | 'notifications'
  | 'users'
  | 'settings'
  | 'zebra_printer';

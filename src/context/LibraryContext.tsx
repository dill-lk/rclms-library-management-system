import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  Book,
  BookStatus,
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
  UserRole,
  SystemSettings,
  ActiveNavTab,
  LabelQueueItem,
} from '../types';
import { getEffectiveBorrowLimit } from '../utils/loanLimits';
import {
  initialBooks,
  initialMembers,
  initialCirculation,
  initialReservations,
  initialFines,
  initialCategories,
  initialAuthors,
  initialPublishers,
  initialInventory,
  initialNotifications,
  initialUsers,
  initialSettings,
} from '../data/mockData';
import {
  getSupabase,
  getStoredSupabaseConfig,
} from '../utils/supabaseClient';
import { registerCurrentDeviceSession } from '../utils/deviceSessions';
import { defaultDesignations, permissionsForRole } from '../utils/roles';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface CatalogFilter {
  category?: string;
  author?: string;
  publisher?: string;
}

interface StockAuditScan {
  copyId: string;
  barcode: string;
  scannedAt: string;
}

interface CirculationUndoAction {
  type: 'issue' | 'return';
  record: CirculationRecord;
  createdAt: number;
  previousCopyCondition?: 'new' | 'good' | 'fair' | 'damaged';
  returnCondition?: 'good' | 'fair' | 'damaged';
  fineId?: string;
}

interface LibraryContextType {
  // Navigation & View
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  selectedBookId: string | null;
  setSelectedBookId: (id: string | null) => void;
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
  catalogFilter: CatalogFilter | null;
  setCatalogFilter: (filter: CatalogFilter | null) => void;

  // Supabase Backend Status & Sync
  isSupabaseConfigured: boolean;
  refreshAllData: () => Promise<void>;

  // Auth & Roles
  currentUser: UserAccount;
  setCurrentUser: (user: UserAccount) => void;
  users: UserAccount[];
  addUser: (user: Omit<UserAccount, 'id'>) => void;
  updateUserRole: (userId: string, role: UserAccount['role']) => Promise<{ success: boolean; message: string }>;
  updateOwnProfile: (profileData: { name: string; phone?: string }) => Promise<{ success: boolean; message: string; user?: UserAccount }>;
  isLoggedIn: boolean;
  login: (user: UserAccount) => void;
  loginWithCredentials: (email: string, password: string, audience?: 'borrower' | 'staff') => Promise<{ success: boolean; message: string; user?: UserAccount }>;
  requestStaffAccess: (userData: { name: string; email: string; password: string; designation?: string }) => Promise<{ success: boolean; message: string }>;
  registerUser: (userData: { name: string; email: string; password: string; role: UserRole; designation?: string; admissionNo?: string; grade?: string; phone?: string }) => Promise<{ success: boolean; message: string; user?: UserAccount }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  completeSetupWizard: (setupData: { adminName: string; adminEmail: string; adminPass: string; libraryName: string; campusAddress: string; phone: string; seedCatalog: boolean }) => void;
  logout: () => void;

  // Data Collections
  books: Book[];
  members: Member[];
  circulation: CirculationRecord[];
  reservations: Reservation[];
  fines: FineRecord[];
  categories: Category[];
  authors: Author[];
  publishers: Publisher[];
  inventory: InventoryItem[];
  notifications: NotificationItem[];
  settings: SystemSettings;

  // Actions - Books
  addBook: (book: Omit<Book, 'id' | 'totalBorrows' | 'addedDate' | 'availableCopies'>) => Promise<boolean>;
  updateBook: (book: Book) => Promise<boolean>;
  deleteBook: (bookId: string) => void;
  restoreBook: (bookId: string) => Promise<void>;
  permanentlyDeleteArchivedBook: (bookId: string) => Promise<boolean>;
  addBookCopy: (bookId: string, copyData?: { parigahanaAnkaya?: string; shelfLocation?: string; condition?: 'new' | 'good' | 'fair' | 'damaged' }) => void;
  assignShelfToCopies: (copyIds: string[], shelfLocation: string) => Promise<{ success: boolean; message: string }>;

  // Actions - Members
  addMember: (member: Omit<Member, 'id' | 'currentlyBorrowedCount' | 'totalBorrowedCount' | 'overdueCount' | 'unpaidFines'>) => Promise<void>;
  updateMember: (member: Member) => Promise<{ success: boolean; message: string }>;
  deleteMember: (memberId: string) => void;

  // Actions - Circulation
  issueBook: (memberId: string, bookId: string, copyBarcode?: string, customDueDays?: number, notes?: string) => Promise<{ success: boolean; message: string; record?: CirculationRecord }>;
  returnBook: (transactionIdOrBarcode: string, condition?: 'good' | 'fair' | 'damaged', notes?: string, collectFine?: boolean) => Promise<{ success: boolean; message: string; fine?: number }>;
  lastCirculationAction: CirculationUndoAction | null;
  undoLastCirculationAction: () => Promise<{ success: boolean; message: string }>;
  renewBook: (transactionId: string) => { success: boolean; message: string };

  // Actions - Reservations
  createReservation: (memberId: string, bookId: string, notes?: string) => { success: boolean; message: string };
  updateReservationStatus: (reservationId: string, status: Reservation['status']) => void;
  cancelReservation: (reservationId: string) => void;

  // Actions - Fines
  collectFine: (fineId: string, paymentMethod?: string) => void;
  waiveFine: (fineId: string, reason: string) => void;

  // Actions - Categories, Authors, Publishers
  addCategory: (category: Omit<Category, 'id' | 'bookCount'>) => Promise<boolean>;
  updateCategory: (category: Category) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  addAuthor: (author: Omit<Author, 'id' | 'bookCount'>) => void;
  updateAuthor: (author: Author) => void;
  deleteAuthor: (authorId: string) => void;
  addPublisher: (publisher: Omit<Publisher, 'id' | 'bookCount'>) => void;
  updatePublisher: (publisher: Publisher) => void;
  deletePublisher: (publisherId: string) => void;

  // Actions - Inventory & Audit
  verifyInventoryBarcode: (barcode: string) => { success: boolean; message: string; item?: InventoryItem };
  loadInventoryAuditScans: (sessionId: string) => Promise<{ success: boolean; message: string; scans: StockAuditScan[] }>;
  recordInventoryBarcode: (sessionId: string, barcode: string) => Promise<{ success: boolean; message: string; item?: InventoryItem; scan?: StockAuditScan }>;
  updateInventoryStatus: (itemId: string, status: InventoryItem['status']) => void;

  // Actions - Notifications
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'read' | 'date'>) => void;

  // Actions - Settings & System
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  exportDatabaseJson: () => Promise<{ success: boolean; message: string }>;
  importDatabaseJson: (jsonString: string) => { success: boolean; message: string };
  clearAllData: () => void;

  // Zebra ZD230 Label Buffer Queue (3-across)
  labelQueue: LabelQueueItem[];
  addToLabelQueue: (item: Omit<LabelQueueItem, 'id' | 'addedAt'>) => void;
  addManyToLabelQueue: (items: Omit<LabelQueueItem, 'id' | 'addedAt'>[]) => void;
  removeFromLabelQueue: (id: string) => void;
  clearLabelQueue: () => void;
  flushNextLabelRow: () => LabelQueueItem[];

  // Toast System
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Print Modals
  printData: {
    type: 'receipt' | 'card' | 'barcode' | 'report' | null;
    title: string;
    payload: any;
  } | null;
  setPrintData: (data: LibraryContextType['printData']) => void;

  // Global Command Palette
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter | null>(null);

  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(() => {
    return getStoredSupabaseConfig().isConfigured;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('rahula_lms_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialUsers;
      }
    }
    return initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    const savedUser = getStoredSupabaseConfig().isConfigured ? null : localStorage.getItem('rahula_lms_current_user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch (e) { /* use guest */ }
    }
    return initialUsers[0] || {
      id: '', name: 'Library user', email: '', role: 'student', designation: '',
      lastLogin: '', status: 'inactive', permissions: [],
    };
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !getStoredSupabaseConfig().isConfigured && localStorage.getItem('rahula_lms_logged_in') === 'true';
  });

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('rahula_lms_books');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialBooks;
  });

  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('rahula_lms_members');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialMembers;
  });

  const [circulation, setCirculation] = useState<CirculationRecord[]>(() => {
    const saved = localStorage.getItem('rahula_lms_circulation');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialCirculation;
  });
  const [lastCirculationAction, setLastCirculationAction] = useState<CirculationUndoAction | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem('rahula_lms_reservations');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialReservations;
  });

  const [fines, setFines] = useState<FineRecord[]>(() => {
    const saved = localStorage.getItem('rahula_lms_fines');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialFines;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('rahula_lms_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const isLegacy = parsed.some(c =>
            c.id?.startsWith('cat-') ||
            c.name?.includes('Sinhala Lit') ||
            c.name?.includes('Physics') ||
            c.name?.includes('Computer Science')
          );
          if (isLegacy) {
            localStorage.setItem('rahula_lms_categories', JSON.stringify([]));
            return [];
          }
          return parsed;
        }
      } catch (e) {}
    }
    return initialCategories;
  });

  const [authors, setAuthors] = useState<Author[]>(() => {
    const saved = localStorage.getItem('rahula_lms_authors');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialAuthors;
  });

  const [publishers, setPublishers] = useState<Publisher[]>(() => {
    const saved = localStorage.getItem('rahula_lms_publishers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialPublishers;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('rahula_lms_inventory');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialInventory;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('rahula_lms_notifications');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialNotifications;
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('rahula_lms_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialSettings;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('rahula_lms_dark') === 'true');

  // Label Queue for Zebra ZD230 3-Across Printing
  const [labelQueue, setLabelQueue] = useState<LabelQueueItem[]>(() => {
    const saved = localStorage.getItem('rahula_lms_label_queue');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((item: any) => item?.bookId && item?.copyId && item?.barcode) : [];
      } catch (e) {}
    }
    return [];
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [printData, setPrintData] = useState<LibraryContextType['printData']>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_books', JSON.stringify(books));
  }, [books, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_members', JSON.stringify(members));
  }, [members, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_circulation', JSON.stringify(circulation));
  }, [circulation, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_reservations', JSON.stringify(reservations));
  }, [reservations, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_fines', JSON.stringify(fines));
  }, [fines, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_categories', JSON.stringify(categories));
  }, [categories, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_authors', JSON.stringify(authors));
  }, [authors, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_publishers', JSON.stringify(publishers));
  }, [publishers, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_inventory', JSON.stringify(inventory));
  }, [inventory, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_notifications', JSON.stringify(notifications));
  }, [notifications, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_settings', JSON.stringify(settings));
  }, [settings, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_label_queue', JSON.stringify(labelQueue));
  }, [labelQueue, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    const safeUser = { ...currentUser };
    delete safeUser.password;
    localStorage.setItem('rahula_lms_current_user', JSON.stringify(safeUser));
  }, [currentUser, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    const safeUsers = users.map(u => {
      const copy = { ...u };
      delete copy.password;
      return copy;
    });
    localStorage.setItem('rahula_lms_users', JSON.stringify(safeUsers));
  }, [users, isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    localStorage.setItem('rahula_lms_logged_in', String(isLoggedIn));
  }, [isLoggedIn, isSupabaseConfigured]);

  // Dark Mode Toggle
  const toggleDarkMode = () => {
    setDarkMode((previous) => {
      const next = !previous;
      localStorage.setItem('rahula_lms_dark', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Toast System
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration || 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const writeAuditEvent = async (action: string, entity: string, entityId: string | undefined, details: Record<string, unknown>) => {
    const supabase = getSupabase();
    if (!supabase || !currentUser.id || currentUser.id.startsWith('usr-')) return false;
    if (!['super_admin', 'librarian', 'assistant_librarian'].includes(currentUser.role)) return false;
    try {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        action,
        entity,
        entity_id: entityId || null,
        details,
      });
      if (error) {
        console.warn('Could not write library audit event:', error.message);
        return false;
      }
      return true;
    } catch (error: any) {
      console.warn('Could not write library audit event:', error?.message || error);
      return false;
    }
  };

  // Fetch the authoritative database in pages; browser storage is never the source of truth.
  const refreshAllData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const fetchAll = async (table: string, select = '*', order = 'created_at') => {
      const rows: any[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from(table as any)
          .select(select)
          .order(order, { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
      return rows;
    };

    try {
      const [catData, autData, pubData, bkData, memData, circData, fineData, resData, settingsData, profileData] = await Promise.all([
        fetchAll('categories', '*', 'name'),
        fetchAll('authors', '*', 'name'),
        fetchAll('publishers', '*', 'name'),
        fetchAll('books', '*, book_copies(*)'),
        fetchAll('members'),
        fetchAll('circulation'),
        fetchAll('fines'),
        fetchAll('reservations'),
        supabase.from('system_settings').select('*').eq('id', 'primary_settings').maybeSingle().then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
        fetchAll('profiles', '*', 'created_at').catch(() => []),
      ]);

      const activeLoans = circData.filter((c: any) => ['active', 'overdue'].includes(c.status));
      const memberStats = new Map<string, { current: number; total: number; overdue: number }>();
      circData.forEach((c: any) => {
        const stat = memberStats.get(c.member_id) || { current: 0, total: 0, overdue: 0 };
        stat.total += 1;
        if (['active', 'overdue'].includes(c.status)) stat.current += 1;
        if (c.status === 'overdue') stat.overdue += 1;
        memberStats.set(c.member_id, stat);
      });
      const memberFines = new Map<string, number>();
      fineData.forEach((f: any) => {
        if (['unpaid', 'partially_paid'].includes(f.status)) memberFines.set(f.member_id, (memberFines.get(f.member_id) || 0) + Number(f.amount || 0) - Number(f.paid_amount || 0));
      });
      const categoryCounts = new Map<string, number>();
      const authorCounts = new Map<string, number>();
      const publisherCounts = new Map<string, number>();
      bkData.forEach((b: any) => {
        if (b.category_id) categoryCounts.set(b.category_id, (categoryCounts.get(b.category_id) || 0) + 1);
        if (b.author_id) authorCounts.set(b.author_id, (authorCounts.get(b.author_id) || 0) + 1);
        if (b.publisher_id) publisherCounts.set(b.publisher_id, (publisherCounts.get(b.publisher_id) || 0) + 1);
      });

      setCategories(catData.map((c: any) => ({ id: c.id, name: c.name, sinhalaName: c.sinhala_name || '', ddcCode: c.code || '', code: c.code || '', description: c.description || '', bookCount: categoryCounts.get(c.id) || 0, shelfLocation: c.shelf_location || '', shelfArea: c.shelf_location || '', color: '#111111', icon: 'BookOpen' })));
      setAuthors(autData.map((a: any) => ({ id: a.id, name: a.name, sinhalaName: a.sinhala_name || '', biography: a.bio || '', nationality: a.nationality || 'Sri Lankan', bookCount: authorCounts.get(a.id) || 0, bornYear: a.birth_year || undefined, birthYear: a.birth_year || undefined, deathYear: a.death_year || undefined })));
      setPublishers(pubData.map((p: any) => ({ id: p.id, name: p.name, address: p.address || '', city: p.city || '', phone: p.phone || '', contactNumber: p.phone || '', email: p.email || '', isVerified: p.is_verified ?? false, bookCount: publisherCounts.get(p.id) || 0 })));
      if (Array.isArray(profileData) && profileData.length > 0) setUsers(profileData.map((p: any) => {
        const role = (p.role || 'student') as UserRole;
        return {
          id: p.id,
          name: p.full_name || p.email?.split('@')[0] || 'Library user',
          email: p.email || '',
          role,
          designation: p.department || defaultDesignations[role],
          lastLogin: p.last_login_at ? new Date(p.last_login_at).toLocaleString() : 'Never',
          status: (p.status || 'active') as UserAccount['status'],
          permissions: permissionsForRole(role),
        };
      }));
      setBooks(bkData.map((b: any) => ({
        id: b.id, isArchived: Boolean(b.is_archived), title: b.title, subtitle: b.subtitle || '', author: b.author || '', authorId: b.author_id || undefined,
        category: b.category_name || '', categoryId: b.category_id || undefined, publisher: b.publisher || '', publisherId: b.publisher_id || undefined,
        isbn: b.isbn || '', ddcCode: b.ddc_code || '', publicationYear: b.publication_year || new Date().getFullYear(), edition: b.edition || '1st Edition',
        language: b.language || 'Sinhala', totalCopies: Number(b.total_copies || 0), availableCopies: Number(b.available_copies || 0), shelfLocation: b.shelf_location || '',
        section: b.section || '', description: b.description || '', rating: 0, totalBorrows: Number(b.total_borrows || 0), addedDate: b.created_at?.split('T')[0] || '', tags: b.tags || [],
        copies: (b.book_copies || []).map((c: any) => ({ copyId: c.id, copyNumber: c.copy_number, barcode: c.barcode || c.parigahana_ankaya, status: c.status || 'available', shelfLocation: c.shelf_location || b.shelf_location || '', condition: c.condition || 'new' })),
      })));
      setMembers(memData.map((m: any) => { const stat = memberStats.get(m.id) || { current: 0, total: 0, overdue: 0 }; return { id: m.id, memberId: m.member_id, admissionNo: m.admission_no, name: m.name, type: m.type, grade: m.grade, department: m.department, house: m.house, email: m.email || '', phone: m.phone || '', address: m.address || '', joinedDate: m.joined_date || m.created_at?.split('T')[0] || '', expiryDate: m.expiry_date || '', status: m.status || 'active', maxBorrowLimit: m.max_borrow_limit || 3, currentlyBorrowedCount: stat.current, totalBorrowedCount: stat.total, overdueCount: stat.overdue, unpaidFines: memberFines.get(m.id) || 0 }; }));
      setCirculation(circData.map((c: any) => ({ id: c.id, transactionId: `TX-${c.id.slice(0, 8)}`, bookId: c.book_id, bookTitle: c.book_title, bookIsbn: c.parigahana_ankaya, copyBarcode: c.parigahana_ankaya, memberId: c.member_id, memberName: c.member_name, memberType: 'student', borrowDate: c.issue_date, dueDate: c.due_date, returnDate: c.return_date, status: c.status === 'renewed' ? 'active' : c.status, fineAmount: Number(c.fine_amount || 0), fineStatus: c.fine_status || 'none', issuedBy: c.issued_by || '', notes: c.notes || '' })));
      setFines(fineData.map((f: any) => ({ id: f.id, fineId: f.receipt_no || `FN-${f.id.slice(0, 8)}`, memberId: f.member_id, memberName: memData.find((m: any) => m.id === f.member_id)?.name || '', bookTitle: bkData.find((b: any) => b.id === circData.find((c: any) => c.id === f.loan_id)?.book_id)?.title || '', amount: Number(f.amount || 0), status: f.status === 'partially_paid' ? 'unpaid' : f.status, issuedDate: f.date_issued, paidDate: f.date_paid, reason: f.reason, collectedBy: f.collected_by || undefined, transactionId: f.loan_id || undefined, createdAt: f.created_at })));
      setReservations(resData.map((r: any, i: number) => ({ id: r.id, reservationId: `RS-${r.id.slice(0, 8)}`, bookId: r.book_id, bookTitle: bkData.find((b: any) => b.id === r.book_id)?.title || '', bookAuthor: bkData.find((b: any) => b.id === r.book_id)?.author || '', bookIsbn: bkData.find((b: any) => b.id === r.book_id)?.isbn || '', memberId: r.member_id, memberName: memData.find((m: any) => m.id === r.member_id)?.name || '', memberEmail: memData.find((m: any) => m.id === r.member_id)?.email || '', memberPhone: memData.find((m: any) => m.id === r.member_id)?.phone || '', requestDate: r.request_date?.split('T')[0] || '', expiryDate: r.expiry_date?.split('T')[0] || '', queuePosition: i + 1, status: r.status === 'available' ? 'ready' : r.status, notes: r.notes || '' })));
      if (settingsData) setSettings((prev) => ({ ...prev, libraryName: settingsData.library_name || prev.libraryName, institutionName: settingsData.college_name || prev.institutionName, address: settingsData.address || prev.address, phone: settingsData.phone || prev.phone, email: settingsData.email || prev.email, defaultStudentLoanDays: settingsData.default_loan_days_student || prev.defaultStudentLoanDays, defaultTeacherLoanDays: settingsData.default_loan_days_teacher || prev.defaultTeacherLoanDays, finePerDayLkr: Number(settingsData.daily_overdue_fine ?? prev.finePerDayLkr), maxStudentBooks: settingsData.max_books_student || prev.maxStudentBooks, maxTeacherBooks: settingsData.max_books_teacher || prev.maxTeacherBooks }));
    } catch (err) {
      console.error('Failed to sync from Supabase:', err);
      addToast({ type: 'error', title: 'Could not refresh library data', message: 'The last screen state was kept. Check the connection and try again.' });
    }
  }, [addToast]);

  // Check Supabase on mount
  useEffect(() => {
    const config = getStoredSupabaseConfig();
    setIsSupabaseConfigured(config.isConfigured);
    if (config.isConfigured) {
      refreshAllData();
    }
  }, [refreshAllData]);

  // Auth Operations
  const login = (user: UserAccount) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    addToast({
      type: 'success',
      title: 'Welcome back',
      message: `Signed in as ${user.name} (${user.role}).`,
    });
  };

  const updateOwnProfile = async (profileData: { name: string; phone?: string }): Promise<{ success: boolean; message: string; user?: UserAccount }> => {
    const name = profileData.name.trim();
    const phone = profileData.phone?.trim() || '';
    if (!name || name.length > 120 || phone.length > 40) {
      const message = 'Enter a name (up to 120 characters) and a phone number (up to 40 characters).';
      addToast({ type: 'error', title: 'Profile was not updated', message });
      return { success: false, message };
    }

    const supabase = getSupabase();
    if (supabase) {
      if (!currentUser.id || currentUser.id.startsWith('usr-')) {
        const message = 'This account is not linked to a sign-in profile.';
        addToast({ type: 'error', title: 'Profile was not updated', message });
        return { success: false, message };
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ full_name: name, phone: phone || null })
          .eq('id', currentUser.id)
          .select('id, full_name, email, phone')
          .maybeSingle();
        if (error || !data) {
          const message = error?.message || 'Your own profile could not be updated.';
          addToast({ type: 'error', title: 'Profile was not updated', message });
          return { success: false, message };
        }

        const updatedUser: UserAccount = {
          ...currentUser,
          name: data.full_name,
          email: data.email || currentUser.email,
          phone: data.phone || undefined,
        };
        setCurrentUser(updatedUser);
        setUsers((previous) => previous.map((user) => user.id === updatedUser.id ? { ...user, name: updatedUser.name, phone: updatedUser.phone } : user));
        await writeAuditEvent('own_profile_updated', 'profiles', currentUser.id, { changedFields: ['full_name', 'phone'] });
        addToast({ type: 'success', title: 'Profile updated', message: 'Your name and contact number were saved.' });
        return { success: true, message: 'Profile updated.', user: updatedUser };
      } catch (err: any) {
        const message = err?.message || 'Your profile could not be updated. Try again.';
        addToast({ type: 'error', title: 'Profile was not updated', message });
        return { success: false, message };
      }
    }

    if (isSupabaseConfigured) {
      const message = 'The profile service is unavailable. Try again when the connection is restored.';
      addToast({ type: 'error', title: 'Profile was not updated', message });
      return { success: false, message };
    }

    const updatedUser: UserAccount = { ...currentUser, name, phone: phone || undefined };
    setCurrentUser(updatedUser);
    setUsers((previous) => previous.map((user) => user.id === updatedUser.id ? { ...user, name: updatedUser.name, phone: updatedUser.phone } : user));
    addToast({ type: 'success', title: 'Profile updated', message: 'Your name and contact number were saved.' });
    return { success: true, message: 'Profile updated.', user: updatedUser };
  };

  const loginWithCredentials = async (email: string, pass: string, audience?: 'borrower' | 'staff'): Promise<{ success: boolean; message: string; user?: UserAccount }> => {
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabase();

    // 1. Try Supabase Auth first if configured
    if (supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (authError) {
          return { success: false, message: authError.message || 'Sign-in failed. Check the email and password.' };
        }
        if (authData.user) {
          // Fetch profile
          const { data: foundProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();
          if (profileError) return { success: false, message: `Could not verify your library profile: ${profileError.message}` };

          const metadataRole = authData.user.user_metadata?.role;
          let profile = foundProfile;
          if (!profile && (metadataRole === 'student' || metadataRole === 'teacher')) {
            const { data: createdProfile, error: createProfileError } = await supabase
              .from('profiles')
              .upsert({
                id: authData.user.id,
                email: cleanEmail,
                full_name: authData.user.user_metadata?.full_name || cleanEmail.split('@')[0],
                role: metadataRole,
                admission_no: authData.user.user_metadata?.admission_no || null,
                grade: authData.user.user_metadata?.grade || null,
                phone: authData.user.user_metadata?.phone || null,
                department: authData.user.user_metadata?.department || null,
                status: 'active',
              })
              .select('*')
              .single();
            if (createProfileError) return { success: false, message: `Your account is signed in, but its basic library profile could not be created: ${createProfileError.message}` };
            profile = createdProfile;
          }
          if (!profile) {
            return { success: false, message: 'No library profile is linked to this account. Ask an authorized librarian to review the account before signing in.' };
          }
          if (profile && profile.status !== 'active') {
            await supabase.auth.signOut({ scope: 'local' });
            return {
              success: false,
              message: profile.status === 'pending'
                ? 'Your staff access request is pending review by the main administrator. You will not have library-management access until an allowed staff role is approved.'
                : 'This library account is inactive. Contact an authorized librarian for help.',
            };
          }

          const allowedRoles: UserRole[] = ['super_admin', 'librarian', 'assistant_librarian', 'teacher', 'student', 'staff'];
          const fallbackRole: UserRole = metadataRole === 'teacher' ? 'teacher' : 'student';
          const role = allowedRoles.includes(profile?.role as UserRole) ? profile!.role as UserRole : fallbackRole;
          if (audience === 'borrower' && role !== 'student' && role !== 'teacher') {
            await supabase.auth.signOut({ scope: 'local' });
            return { success: false, message: 'This is the student and teacher portal. Use Staff & Admin access for this account.' };
          }
          if (audience === 'staff' && (role === 'student' || role === 'teacher')) {
            await supabase.auth.signOut({ scope: 'local' });
            return { success: false, message: 'This is the Staff & Admin portal. Use Student & Teacher access for this account.' };
          }
          const authedUser: UserAccount = {
            id: authData.user.id,
            name: profile?.full_name || authData.user.user_metadata?.full_name || cleanEmail.split('@')[0],
            email: cleanEmail,
            role,
            designation: profile?.department || defaultDesignations[role],
            admissionNo: profile?.admission_no,
            grade: profile?.grade,
            phone: profile?.phone,
            lastLogin: 'Just now',
            status: 'active',
            permissions: permissionsForRole(role),
          };

          // Reader sign-in is profile-based. Official Members rows are created only by staff;
          // an authenticated reader can sign in even when no membership record exists.
          const deviceSession = await registerCurrentDeviceSession();
          if (deviceSession.error || deviceSession.status !== 'active') {
            await supabase.auth.signOut({ scope: 'local' });
            return {
              success: false,
              message: deviceSession.error || `This sign-in session is ${deviceSession.status}. Contact an administrator if access should be restored.`,
            };
          }

          setCurrentUser(authedUser);
          setIsLoggedIn(true);
          await refreshAllData();
          return { success: true, message: 'Supabase authentication successful.', user: authedUser };
        }
      } catch (err: any) {
        console.warn('Supabase auth failed:', err);
        return { success: false, message: err?.message || 'Supabase sign-in failed. Check the database connection.' };
      }
    }

    return { success: false, message: 'Supabase is not available in this deployment. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild the app.' };
  };

  const requestStaffAccess = async (userData: {
    name: string;
    email: string;
    password: string;
    designation?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const name = userData.name.trim();
    const email = userData.email.trim().toLowerCase();
    const supabase = getSupabase();
    if (!supabase) return { success: false, message: 'Staff access requests are unavailable until the secure library service is configured.' };

    try {
      const { data, error } = await supabase.functions.invoke('request-staff-access', {
        body: {
          name,
          email,
          password: userData.password,
          designation: userData.designation?.trim() || undefined,
        },
      });
      if (error) return { success: false, message: error.message || 'The staff access request could not be sent. Try again later.' };
      if (data?.success !== true) return { success: false, message: data?.message || 'The staff access request could not be completed.' };
      return { success: true, message: data.message || 'Your request is pending review by the main administrator.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'The staff access request could not be sent. Try again later.' };
    }
  };

  const registerUser = async (userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    designation?: string;
    admissionNo?: string;
    grade?: string;
    phone?: string;
  }): Promise<{ success: boolean; message: string; user?: UserAccount }> => {
    const cleanEmail = userData.email.trim().toLowerCase();
    if (userData.role !== 'student' && userData.role !== 'teacher') {
      return { success: false, message: 'Staff and administrator accounts must be created by an authorized administrator.' };
    }
    const supabase = getSupabase();
    if (!supabase) return { success: false, message: 'Registration is unavailable until Supabase is configured.' };

    try {
      const { data, error } = await supabase.functions.invoke('register-borrower', {
        body: {
          name: userData.name.trim(),
          email: cleanEmail,
          password: userData.password,
          role: userData.role,
          designation: userData.designation,
          admissionNo: userData.admissionNo,
          grade: userData.grade,
          phone: userData.phone,
        },
      });

      if (error) return { success: false, message: error.message || 'Reader registration is unavailable. Try again later.' };
      if (data?.success !== true) return { success: false, message: data?.message || 'Reader registration could not be completed.' };

      const signInResult = await loginWithCredentials(cleanEmail, userData.password, 'borrower');
      if (!signInResult.success) {
        return { success: false, message: `Your reader account was created, but sign-in could not be completed: ${signInResult.message}` };
      }
      return { success: true, message: 'Reader account created and signed in.', user: signInResult.user };
    } catch (err: any) {
      console.warn('Borrower registration failed:', err);
      return { success: false, message: err?.message || 'Reader registration is unavailable. Try again later.' };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
        // Always use the same response to avoid account enumeration.
        return {
          success: true,
          message: 'If an account exists for that address, recovery instructions will be sent. Check your inbox and spam folder.',
        };
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to dispatch reset email.' };
      }
    }

    return {
      success: true,
      message: 'If an account exists for that address, recovery instructions will be sent. Check your inbox and spam folder.',
    };
  };

  const completeSetupWizard = (_setupData: {
    adminName: string;
    adminEmail: string;
    adminPass: string;
    libraryName: string;
    campusAddress: string;
    phone: string;
    seedCatalog: boolean;
  }) => {
    addToast({
      type: 'error',
      title: 'Setup unavailable in public client',
      message: 'Create the first administrator through a protected Supabase server-side setup process.',
    });
  };

  const logout = useCallback(() => {
    const supabase = getSupabase();
    if (supabase) {
      void (async () => {
        try {
          await supabase.rpc('end_library_device_session');
        } catch {
          // Local Auth sign-out must still complete when the session RPC is offline.
        }
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      })();
    }
    setIsLoggedIn(false);
    localStorage.removeItem('rahula_lms_logged_in');
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been safely signed out.',
    });
  }, [addToast]);

  const addUser = (newUser: Omit<UserAccount, 'id'>) => {
    const user: UserAccount = {
      ...newUser,
      id: `usr-${Date.now()}`,
    };
    setUsers((prev) => [...prev, user]);
    addToast({
      type: 'success',
      title: 'User Registered',
      message: `${user.name} has been added as ${user.role}.`,
    });
  };

  const updateUserRole = async (userId: string, role: UserAccount['role']) => {
    const assignableRoles: UserRole[] = ['librarian', 'assistant_librarian', 'teacher', 'student', 'staff'];
    if (!assignableRoles.includes(role)) {
      const message = 'Super administrator access cannot be created or assigned from account management.';
      addToast({ type: 'error', title: 'Role was not changed', message });
      return { success: false, message };
    }

    const target = users.find((user) => user.id === userId);
    const supabase = getSupabase();
    if (target?.status === 'pending') {
      if (currentUser.role !== 'super_admin' || userId === currentUser.id) {
        const message = 'Only the main super administrator may approve another user’s pending staff request.';
        addToast({ type: 'error', title: 'Staff request was not approved', message });
        return { success: false, message };
      }
      if (role !== 'librarian' && role !== 'assistant_librarian') {
        const message = 'Pending requests can only be approved as Librarian or Assistant Librarian.';
        addToast({ type: 'error', title: 'Staff request was not approved', message });
        return { success: false, message };
      }
      if (!supabase) {
        const message = 'The library database is unavailable; this request was not approved.';
        addToast({ type: 'error', title: 'Staff request was not approved', message });
        return { success: false, message };
      }
      const { error } = await supabase.rpc('approve_pending_staff_signup', {
        p_profile_id: userId,
        p_assigned_role: role,
      });
      if (error) {
        addToast({ type: 'error', title: 'Staff request was not approved', message: error.message });
        return { success: false, message: error.message };
      }
      setUsers((prev) => prev.map((user) => user.id === userId
        ? { ...user, role, status: 'active', permissions: permissionsForRole(role) }
        : user));
      await writeAuditEvent('staff_signup_approved', 'profiles', userId, { role });
      addToast({ type: 'success', title: 'Staff access approved', message: `${target.name} was approved as ${role === 'librarian' ? 'Librarian' : 'Assistant Librarian'}.` });
      return { success: true, message: 'Staff access approved.' };
    }

    if (supabase && userId && !userId.startsWith('usr-')) {
      const { data, error } = await supabase.from('profiles').update({ role }).eq('id', userId).select('id').maybeSingle();
      if (error || !data) {
        const message = error?.message || 'The staff profile was not found or could not be updated.';
        addToast({ type: 'error', title: 'Role was not changed', message });
        return { success: false, message };
      }
    } else if (isSupabaseConfigured) {
      const message = 'This staff record is not linked to a Supabase Auth account.';
      addToast({ type: 'error', title: 'Role was not changed', message });
      return { success: false, message };
    }

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role, permissions: permissionsForRole(role) } : u)));
    addToast({ type: 'success', title: 'Role updated', message: 'The staff member’s access has been updated.' });
    return { success: true, message: 'Role updated.' };
  };

  // Books Actions
  const addBook = async (bookData: Omit<Book, 'id' | 'totalBorrows' | 'addedDate' | 'availableCopies'>) => {
    const supabase = getSupabase();
    const normalizedAccession = bookData.isbn.trim().toUpperCase();
    const category = categories.find((c) => c.name === bookData.category);
    const author = authors.find((a) => a.name.trim().toLowerCase() === bookData.author.trim().toLowerCase());
    const publisher = publishers.find((p) => p.name.trim().toLowerCase() === bookData.publisher.trim().toLowerCase());
    const copies = Array.from({ length: bookData.totalCopies }).map((_, idx) => ({
      copy_number: idx + 1,
      parigahana_ankaya: idx === 0 ? bookData.isbn.trim() : `${bookData.isbn.trim()}-${idx + 1}`,
      barcode: idx === 0 ? bookData.isbn.trim() : `${bookData.isbn.trim()}-${idx + 1}`,
      shelf_location: bookData.shelfLocation || null,
      condition: 'new',
      status: 'available',
    }));

    if (!supabase) {
      const existingBook = books.find((savedBook) => savedBook.isbn.trim().toUpperCase() === normalizedAccession);
      if (existingBook) {
        addToast({ type: 'info', title: 'Book already in catalogue', message: `Accession number ${bookData.isbn.trim()} is already used by “${existingBook.title}”. No duplicate was added.` });
        return true;
      }
      if (!author && bookData.author.trim()) {
        setAuthors((prev) => [...prev, { id: `aut-${Date.now()}`, name: bookData.author.trim(), bookCount: 0 } as Author]);
      }
      if (!publisher && bookData.publisher.trim()) {
        setPublishers((prev) => [...prev, { id: `pub-${Date.now() + 1}`, name: bookData.publisher.trim(), bookCount: 0 } as Publisher]);
      }
      const id = `bk-${Date.now()}`;
      const localBook: Book = { ...bookData, id, totalBorrows: 0, availableCopies: bookData.totalCopies, addedDate: new Date().toISOString().split('T')[0], copies: copies.map((copy: any) => ({ copyId: `CP-${id}-${copy.copy_number}`, copyNumber: copy.copy_number, barcode: copy.barcode, status: 'available', shelfLocation: copy.shelf_location || '', condition: 'new' })) };
      setBooks((prev) => [localBook, ...prev]);
      addToast({ type: 'success', title: 'Book added', message: `${localBook.title} is ready in the catalogue.` });
      addNotification({ type: 'system', title: 'Book added to catalogue', message: `${localBook.title} (${localBook.isbn}) and ${copies.length} ${copies.length === 1 ? 'copy were' : 'copies were'} saved.`, link: 'books' });
      return true;
    }

    try {
      let authorId = author?.id || null;
      if (!authorId && bookData.author.trim()) {
        const { data: existingAuthor, error: authorLookupError } = await supabase
          .from('authors').select('id').ilike('name', bookData.author.trim()).maybeSingle();
        if (authorLookupError) throw authorLookupError;
        if (existingAuthor) authorId = existingAuthor.id;
        else {
          const { data: createdAuthor, error: authorInsertError } = await supabase
            .from('authors').insert({ name: bookData.author.trim() }).select('id').single();
          if (authorInsertError || !createdAuthor) throw authorInsertError || new Error('Author could not be created.');
          authorId = createdAuthor.id;
        }
      }

      let publisherId = publisher?.id || null;
      if (!publisherId && bookData.publisher.trim()) {
        const { data: existingPublisher, error: publisherLookupError } = await supabase
          .from('publishers').select('id').ilike('name', bookData.publisher.trim()).maybeSingle();
        if (publisherLookupError) throw publisherLookupError;
        if (existingPublisher) publisherId = existingPublisher.id;
        else {
          const { data: createdPublisher, error: publisherInsertError } = await supabase
            .from('publishers').insert({ name: bookData.publisher.trim() }).select('id').single();
          if (publisherInsertError || !createdPublisher) throw publisherInsertError || new Error('Publisher could not be created.');
          publisherId = createdPublisher.id;
        }
      }

      const bookRecord = {
        title: bookData.title, subtitle: bookData.subtitle || null, author: bookData.author, author_id: authorId,
        category_name: bookData.category, category_id: category?.id || null, ddc_code: category?.ddcCode || null,
        publisher: bookData.publisher || null, publisher_id: publisherId, isbn: bookData.isbn.trim(),
        publication_year: bookData.publicationYear, edition: bookData.edition, language: bookData.language,
        description: bookData.description || null, shelf_location: bookData.shelfLocation || null, section: bookData.section || null,
        tags: bookData.tags || [], total_copies: 0, available_copies: 0,
      };
      const { data, error } = await supabase.rpc('save_catalogue_book_with_copies', {
        p_book: bookRecord,
        p_copies: copies,
      });
      if (error) {
        if (error.code === 'PGRST202' || error.message?.includes('save_catalogue_book_with_copies')) {
          throw new Error('The catalogue database update is not installed yet. Apply supabase/migrations/20261013_idempotent_catalogue_and_access.sql, then try again.');
        }
        throw error;
      }
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.book_id) throw new Error('The database did not confirm the catalogue save. Check the accession number and try again.');

      await refreshAllData();
      if (result.created) {
        addToast({ type: 'success', title: 'Book added', message: `${bookData.title} and ${copies.length} ${copies.length === 1 ? 'copy are' : 'copies are'} now in the catalogue.` });
        addNotification({ type: 'system', title: 'Book added to catalogue', message: `${bookData.title} (${bookData.isbn.trim()}) and ${copies.length} ${copies.length === 1 ? 'copy were' : 'copies were'} saved.`, link: 'books' });
      } else {
        addToast({ type: 'info', title: 'Book already in catalogue', message: `Accession number ${bookData.isbn.trim()} already belongs to “${bookData.title}”. No duplicate title was added; ${Number(result.copy_count || 0)} physical copies are recorded.` });
      }
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Book was not added', message: err?.message || 'Check the category, accession number, and permissions.' });
      return false;
    }
  };

  const updateBook = async (updatedBook: Book) => {
    const supabase = getSupabase();
    if (!supabase || updatedBook.id.startsWith('bk-')) {
      setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
      addToast({ type: 'success', title: 'Book updated', message: `${updatedBook.title} details were saved.` });
      return true;
    }
    const category = categories.find((c) => c.name === updatedBook.category);
    const author = authors.find((a) => a.name === updatedBook.author);
    const publisher = publishers.find((p) => p.name === updatedBook.publisher);
    const { error } = await supabase.from('books').update({
      title: updatedBook.title, subtitle: updatedBook.subtitle || null, author: updatedBook.author, author_id: author?.id || null,
      category_name: updatedBook.category, category_id: category?.id || null, ddc_code: category?.ddcCode || null,
      publisher: updatedBook.publisher || null, publisher_id: publisher?.id || null, isbn: updatedBook.isbn,
      publication_year: updatedBook.publicationYear, edition: updatedBook.edition, language: updatedBook.language,
      description: updatedBook.description || null, shelf_location: updatedBook.shelfLocation || null, section: updatedBook.section || null, tags: updatedBook.tags || [],
    }).eq('id', updatedBook.id);
    if (error) { addToast({ type: 'error', title: 'Book was not updated', message: error.message }); return false; }
    await refreshAllData();
    addToast({ type: 'success', title: 'Book updated', message: `${updatedBook.title} details were saved.` });
    return true;
  };

  const deleteBook = async (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    if (!currentUser.permissions.includes('delete_books')) {
      addToast({ type: 'error', title: 'Permission denied', message: 'Only authorized library administrators can archive catalogue records.' });
      return;
    }
    const supabase = getSupabase();
    if (supabase && !bookId.startsWith('bk-')) {
      const { error } = await supabase.from('books').update({ is_archived: true }).eq('id', bookId);
      if (error) { addToast({ type: 'error', title: 'Book was not archived', message: error.message.includes('is_archived') ? 'Apply the catalogue archival migration in supabase/migrations before archiving books.' : error.message }); return; }
      await refreshAllData();
    } else {
      setBooks((prev) => prev.map((b) => b.id === bookId ? { ...b, isArchived: true } : b));
    }
    addToast({ type: 'info', title: 'Book archived', message: `${book.title} was hidden from the active catalogue. Copies and circulation history were preserved; it can be restored.` });
  };

  const restoreBook = async (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    if (!currentUser.permissions.includes('delete_books')) {
      addToast({ type: 'error', title: 'Permission denied', message: 'Only authorized library administrators can restore catalogue records.' });
      return;
    }
    const supabase = getSupabase();
    if (supabase && !bookId.startsWith('bk-')) {
      const { error } = await supabase.from('books').update({ is_archived: false }).eq('id', bookId);
      if (error) { addToast({ type: 'error', title: 'Book was not restored', message: error.message }); return; }
      await refreshAllData();
    } else {
      setBooks((prev) => prev.map((item) => item.id === bookId ? { ...item, isArchived: false } : item));
    }
    addToast({ type: 'success', title: 'Book restored', message: `${book.title} is back in the active catalogue.` });
  };

  const permanentlyDeleteArchivedBook = async (bookId: string): Promise<boolean> => {
    const book = books.find((item) => item.id === bookId);
    if (!book) return false;
    if (!currentUser.permissions.includes('delete_books')) {
      addToast({ type: 'error', title: 'Permission denied', message: 'Only authorized library administrators can permanently delete catalogue records.' });
      return false;
    }
    if (!book.isArchived) {
      addToast({ type: 'error', title: 'Archive the record first', message: 'Permanent deletion is only available for records already in Archived records.' });
      return false;
    }

    const circulationCount = circulation.filter((record) => record.bookId === bookId).length;
    const reservationCount = reservations.filter((record) => record.bookId === bookId).length;
    if (circulationCount || reservationCount) {
      addToast({
        type: 'error',
        title: 'Record protected',
        message: `Deletion is blocked to preserve linked history (${circulationCount} circulation record${circulationCount === 1 ? '' : 's'}, ${reservationCount} reservation${reservationCount === 1 ? '' : 's'}).`,
      });
      return false;
    }

    const supabase = getSupabase();
    if (supabase && !bookId.startsWith('bk-')) {
      const { data, error } = await supabase.from('books').delete().eq('id', bookId).eq('is_archived', true).select('id');
      if (error) {
        addToast({
          type: 'error',
          title: 'Record was not deleted',
          message: error.code === '23503' ? 'A linked circulation or inventory record still protects this title.' : error.message,
        });
        return false;
      }
      if (!data?.length) {
        addToast({ type: 'error', title: 'Record was not deleted', message: 'It may no longer be archived, or your access may have changed. Refresh the catalogue and try again.' });
        return false;
      }
      await refreshAllData();
    } else {
      setBooks((previous) => previous.filter((item) => item.id !== bookId));
    }

    addToast({
      type: 'success',
      title: 'Archived record permanently deleted',
      message: `${book.title} and ${book.totalCopies} linked physical-copy record${book.totalCopies === 1 ? '' : 's'} were removed.`,
    });
    return true;
  };

  const addBookCopy = async (bookId: string, copyData?: { parigahanaAnkaya?: string; shelfLocation?: string; condition?: 'new' | 'good' | 'fair' | 'damaged' }) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    const nextCopyNumber = book.copies.length + 1;
    const barcode = copyData?.parigahanaAnkaya?.trim() || `${book.isbn.trim()}-${nextCopyNumber}`;
    const supabase = getSupabase();
    if (supabase && !bookId.startsWith('bk-')) {
      const { error } = await supabase.from('book_copies').insert({ book_id: bookId, copy_number: nextCopyNumber, parigahana_ankaya: barcode, barcode, shelf_location: copyData?.shelfLocation || null, condition: copyData?.condition || 'new', status: 'available' });
      if (error) { addToast({ type: 'error', title: 'Copy was not added', message: error.message }); return; }
      await refreshAllData();
    } else {
      setBooks((prev) => prev.map((b) => b.id === bookId ? { ...b, totalCopies: b.totalCopies + 1, availableCopies: b.availableCopies + 1, copies: [...b.copies, { copyId: `CP-${b.id}-${nextCopyNumber}`, copyNumber: nextCopyNumber, barcode, status: 'available', shelfLocation: copyData?.shelfLocation || b.shelfLocation, condition: copyData?.condition || 'new' }] } : b));
    }
    addToast({ type: 'success', title: 'Copy added', message: `Copy ${barcode} is ready for circulation.` });
  };

  const assignShelfToCopies = async (copyIds: string[], shelfLocation: string): Promise<{ success: boolean; message: string }> => {
    const ids = [...new Set(copyIds.filter(Boolean))];
    const location = shelfLocation.trim();
    if (!ids.length || !location) return { success: false, message: 'Select registered copies and enter a shelf location.' };
    if (location.length > 120) return { success: false, message: 'Shelf locations must be 120 characters or fewer.' };

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('book_copies').update({ shelf_location: location }).in('id', ids).select('id');
      if (error) {
        addToast({ type: 'error', title: 'Shelf assignment was not saved', message: error.message });
        return { success: false, message: error.message };
      }
      if ((data || []).length !== ids.length) {
        await refreshAllData();
        const message = 'The database did not confirm every shelf assignment. Refresh the catalogue before printing.';
        addToast({ type: 'error', title: 'Shelf assignment incomplete', message });
        return { success: false, message };
      }
      await refreshAllData();
    } else if (isSupabaseConfigured) {
      const message = 'The library database is unavailable; shelf assignments were not saved.';
      addToast({ type: 'error', title: 'Shelf assignment was not saved', message });
      return { success: false, message };
    } else {
      const selectedIds = new Set(ids);
      setBooks((previous) => previous.map((book) => ({
        ...book,
        copies: book.copies.map((copy) => selectedIds.has(copy.copyId) ? { ...copy, shelfLocation: location } : copy),
      })));
    }

    await writeAuditEvent('copy_shelf_assigned', 'book_copies', ids.length === 1 ? ids[0] : undefined, { copyCount: ids.length, copyIds: ids, shelfLocation: location });
    addToast({ type: 'success', title: 'Shelf assignment saved', message: `${ids.length} registered ${ids.length === 1 ? 'copy was' : 'copies were'} assigned to ${location}.` });
    return { success: true, message: 'Shelf assignment saved.' };
  };

  // Members Actions
  const addMember = async (memberData: Omit<Member, 'id' | 'currentlyBorrowedCount' | 'totalBorrowedCount' | 'overdueCount' | 'unpaidFines'>) => {
    const supabase = getSupabase();
    let id = `mem-${Date.now()}`;

    if (supabase) {
      const { data, error } = await supabase.from('members').insert({
        member_id: memberData.memberId,
        admission_no: memberData.admissionNo || memberData.memberId,
        name: memberData.name,
        type: memberData.type,
        grade: memberData.grade,
        department: memberData.department,
        email: memberData.email,
        phone: memberData.phone,
        address: memberData.address,
        status: memberData.status,
        max_borrow_limit: memberData.maxBorrowLimit,
      }).select('id').single();

      if (error || !data) {
        addToast({ type: 'error', title: 'Member was not saved', message: error?.message || 'The member could not be created.' });
        return;
      }
      id = data.id;
    }

    const newMember: Member = { ...memberData, id, currentlyBorrowedCount: 0, totalBorrowedCount: 0, overdueCount: 0, unpaidFines: 0 };
    setMembers((prev) => [newMember, ...prev]);
    addToast({ type: 'success', title: 'Member registered', message: `${newMember.name} (${newMember.memberId}) is ready to borrow books.` });
  };

  const updateMember = async (updatedMember: Member): Promise<{ success: boolean; message: string }> => {
    const name = updatedMember.name.trim();
    const memberId = updatedMember.memberId.trim();
    const admissionNo = updatedMember.admissionNo?.trim() || memberId;
    if (!name || !memberId || !admissionNo) {
      const message = 'Member name, member ID, and admission/staff number are required.';
      addToast({ type: 'error', title: 'Member was not updated', message });
      return { success: false, message };
    }

    let savedMember: Member = { ...updatedMember, name, memberId, admissionNo };
    const supabase = getSupabase();
    if (isSupabaseConfigured && (!supabase || updatedMember.id.startsWith('mem-'))) {
      const message = 'The member is not linked to the library database; no changes were saved.';
      addToast({ type: 'error', title: 'Member was not updated', message });
      return { success: false, message };
    }

    if (supabase && !updatedMember.id.startsWith('mem-')) {
      try {
        const { data, error } = await supabase
          .from('members')
          .update({
            member_id: memberId,
            admission_no: admissionNo,
            name,
            type: updatedMember.type,
            grade: updatedMember.grade,
            department: updatedMember.department,
            email: updatedMember.email,
            phone: updatedMember.phone,
            address: updatedMember.address,
            joined_date: updatedMember.joinedDate || null,
            expiry_date: updatedMember.expiryDate || null,
            status: updatedMember.status,
            max_borrow_limit: updatedMember.maxBorrowLimit,
          })
          .eq('id', updatedMember.id)
          .select('*')
          .maybeSingle();
        if (error || !data) {
          const message = error?.message || 'The member was not found or your staff role cannot edit this record.';
          addToast({ type: 'error', title: 'Member was not updated', message });
          return { success: false, message };
        }
        savedMember = {
          ...updatedMember,
          id: data.id,
          memberId: data.member_id,
          admissionNo: data.admission_no,
          name: data.name,
          type: data.type,
          grade: data.grade || undefined,
          department: data.department || undefined,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          joinedDate: data.joined_date || '',
          expiryDate: data.expiry_date || '',
          status: data.status,
          maxBorrowLimit: Number(data.max_borrow_limit || updatedMember.maxBorrowLimit),
        };
      } catch (err: any) {
        const message = err?.message || 'The member could not be updated. Try again.';
        addToast({ type: 'error', title: 'Member was not updated', message });
        return { success: false, message };
      }
    }

    setMembers((prev) => prev.map((member) => (member.id === savedMember.id ? savedMember : member)));
    await writeAuditEvent('member_profile_updated', 'members', savedMember.id, {
      changedFields: ['member_id', 'admission_no', 'name', 'type', 'grade', 'department', 'email', 'phone', 'address', 'joined_date', 'expiry_date', 'status', 'max_borrow_limit'],
    });
    addToast({
      type: 'success',
      title: 'Member Profile Updated',
      message: `${savedMember.name} details saved.`,
    });
    return { success: true, message: 'Member details saved.' };
  };

  const deleteMember = async (memberId: string) => {
    const mem = members.find((m) => m.id === memberId);
    if (!mem) return;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));

    const supabase = getSupabase();
    if (supabase && !memberId.startsWith('mem-')) {
      try {
        await supabase.from('members').delete().eq('id', memberId);
      } catch (err) {
        console.warn('Supabase member delete error:', err);
      }
    }

    addToast({
      type: 'warning',
      title: 'Member Removed',
      message: `${mem.name} was removed from the member directory.`,
    });
  };

  // Circulation Actions
  const issueBook = async (
    memberId: string,
    bookId: string,
    copyBarcode?: string,
    customDueDays?: number,
    notes?: string
  ): Promise<{ success: boolean; message: string; record?: CirculationRecord }> => {
    const member = members.find((m) => m.id === memberId || m.admissionNo === memberId || m.memberId === memberId);
    if (!member) return { success: false, message: 'Member not found.' };
    if (member.status !== 'active') return { success: false, message: `Member account is ${member.status}. Cannot issue books.` };
    const maxBorrowLimit = getEffectiveBorrowLimit(member, settings.maxStudentBooks);
    if (member.currentlyBorrowedCount >= maxBorrowLimit) {
      return { success: false, message: `Member has reached maximum borrowing limit (${maxBorrowLimit} books).` };
    }
    if (member.unpaidFines > 100) {
      return { success: false, message: 'Outstanding fines must be cleared before another book can be issued.' };
    }

    const book = books.find((b) => b.id === bookId || b.isbn === bookId || b.copies?.some((c) => c.barcode === bookId));
    if (!book) return { success: false, message: 'Book not found.' };
    if (book.availableCopies <= 0) return { success: false, message: 'No available copies left in stock for this title.' };

    const targetCopy = book.copies.find((c) => copyBarcode ? c.barcode === copyBarcode : c.status === 'available');
    if (!targetCopy || targetCopy.status !== 'available') {
      return { success: false, message: 'Selected book copy is currently not available.' };
    }

    const loanDays = customDueDays || (member.type === 'teacher' ? (settings.defaultTeacherLoanDays || 30) : (settings.defaultStudentLoanDays || 14));
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.max(1, Math.min(60, loanDays)));
    const supabase = getSupabase();
    let databaseLoanId = `circ-${Date.now()}`;

    if (supabase && !book.id.startsWith('bk-')) {
      const { data: loan, error: loanError } = await supabase.from('circulation').insert({
        book_id: book.id,
        copy_id: targetCopy.copyId,
        member_id: member.id,
        parigahana_ankaya: targetCopy.barcode,
        book_title: book.title,
        member_name: member.name,
        member_admission_no: member.admissionNo || '',
        issue_date: borrowDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'active',
        issued_by: currentUser.id || null,
        notes: notes || null,
      }).select('id').single();

      if (loanError || !loan) {
        const message = loanError?.message || 'The loan could not be saved.';
        addToast({ type: 'error', title: 'Issue was not saved', message });
        return { success: false, message };
      }
      databaseLoanId = loan.id;

      const [copyResult, bookResult] = await Promise.all([
        supabase.from('book_copies').update({ status: 'borrowed' }).eq('id', targetCopy.copyId),
        supabase.from('books').update({ available_copies: Math.max(0, book.availableCopies - 1), total_borrows: book.totalBorrows + 1 }).eq('id', book.id),
      ]);
      const updateError = copyResult.error || bookResult.error;
      if (updateError) {
        await supabase.from('circulation').delete().eq('id', databaseLoanId);
        addToast({ type: 'error', title: 'Issue was not saved', message: updateError.message });
        return { success: false, message: updateError.message };
      }
    }

    const newCirculationRecord: CirculationRecord = {
      id: databaseLoanId,
      transactionId: `TX-${databaseLoanId.slice(0, 8).toUpperCase()}`,
      bookId: book.id,
      bookTitle: book.title,
      bookIsbn: targetCopy.barcode,
      copyBarcode: targetCopy.barcode,
      memberId: member.id,
      memberName: member.name,
      memberType: member.type,
      memberGrade: member.grade,
      borrowDate: borrowDate.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'active',
      fineAmount: 0,
      fineStatus: 'none',
      issuedBy: currentUser.name,
      notes,
    };

    setBooks((prev) => prev.map((b) => b.id === book.id ? {
      ...b,
      availableCopies: Math.max(0, b.availableCopies - 1),
      totalBorrows: b.totalBorrows + 1,
      copies: b.copies.map((c) => c.copyId === targetCopy.copyId ? { ...c, status: 'borrowed' as BookStatus, borrowerId: member.id, dueDate: newCirculationRecord.dueDate } : c),
    } : b));
    setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, currentlyBorrowedCount: m.currentlyBorrowedCount + 1, totalBorrowedCount: m.totalBorrowedCount + 1 } : m));
    setCirculation((prev) => [newCirculationRecord, ...prev]);
    setLastCirculationAction({ type: 'issue', record: newCirculationRecord, createdAt: Date.now(), previousCopyCondition: targetCopy.condition });
    await writeAuditEvent('book_issued', 'circulation', databaseLoanId, { memberName: member.name, title: book.title, barcode: targetCopy.barcode, dueDate: newCirculationRecord.dueDate });

    addToast({ type: 'success', title: 'Book issued', message: `"${book.title}" is now borrowed by ${member.name}.` });
    return { success: true, message: `Book issued successfully. Due date: ${newCirculationRecord.dueDate}`, record: newCirculationRecord };
  };

  const returnBook = async (
    transactionIdOrBarcode: string,
    condition: 'good' | 'fair' | 'damaged' = 'good',
    notes?: string,
    collectFineNow: boolean = false
  ): Promise<{ success: boolean; message: string; fine?: number }> => {
    const record = circulation.find(
      (c) =>
        (c.transactionId === transactionIdOrBarcode ||
          c.copyBarcode === transactionIdOrBarcode ||
          c.bookIsbn === transactionIdOrBarcode ||
          c.id === transactionIdOrBarcode) &&
        (c.status === 'active' || c.status === 'overdue' || c.status === 'renewed')
    );

    if (!record) {
      return { success: false, message: 'No active loan found for this book copy or transaction ID.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    const dueDate = new Date(record.dueDate);
    const storedBook = books.find((b) => b.id === record.bookId);
    const storedCopy = storedBook?.copies.find((copy) => copy.barcode === record.copyBarcode);
    const previousCopyCondition = storedCopy?.condition || 'good';

    let fine = 0;
    if (today > dueDate) {
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fine = diffDays * (settings.finePerDayLkr || 5.0);
    }

    // Update circulation record
    setCirculation((prev) =>
      prev.map((c) =>
        c.id === record.id
          ? {
              ...c,
              status: 'returned',
              returnDate: todayStr,
              receivedBy: currentUser.name,
              fineAmount: fine,
              fineStatus: (fine > 0 ? (collectFineNow ? 'paid' : 'unpaid') : 'none') as any,
              notes: notes ? (c.notes ? `${c.notes} | ${notes}` : notes) : c.notes,
            }
          : c
      )
    );

    // Update book copy status
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === record.bookId) {
          const updatedCopies = b.copies.map((c) =>
            c.barcode === record.copyBarcode
              ? {
                  ...c,
                  status: (condition === 'damaged' ? 'damaged' : 'available') as BookStatus,
                  condition: condition,
                  borrowerId: undefined,
                  dueDate: undefined,
                }
              : c
          );
          return {
            ...b,
            availableCopies: condition === 'damaged' ? b.availableCopies : b.availableCopies + 1,
            copies: updatedCopies,
          };
        }
        return b;
      })
    );

    // Update member borrow count
    setMembers((prev) =>
      prev.map((m) =>
        m.id === record.memberId
          ? {
              ...m,
              currentlyBorrowedCount: Math.max(0, m.currentlyBorrowedCount - 1),
              unpaidFines: fine > 0 && !collectFineNow ? m.unpaidFines + fine : m.unpaidFines,
            }
          : m
      )
    );

    // If fine occurred, create fine record
    let createdFineId: string | undefined;
    if (fine > 0) {
      const newFine: FineRecord = {
        id: `fine-${Date.now()}`,
        fineId: `FN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        memberId: record.memberId,
        memberName: record.memberName,
        bookTitle: record.bookTitle,
        amount: fine,
        status: collectFineNow ? 'paid' : 'unpaid',
        issuedDate: todayStr,
        createdAt: todayStr,
        paidDate: collectFineNow ? todayStr : undefined,
        reason: 'Overdue Book Return',
        collectedBy: collectFineNow ? currentUser.name : undefined,
      };
      createdFineId = newFine.id;
      setFines((prev) => [newFine, ...prev]);
    }

    const supabase = getSupabase();
    if (supabase && !record.id.startsWith('circ-')) {
      const updates: Promise<any>[] = [
        Promise.resolve(supabase.from('circulation').update({ status: 'returned', return_date: todayStr, fine_amount: fine, fine_status: fine > 0 ? (collectFineNow ? 'paid' : 'unpaid') : 'none', received_by: currentUser.id || null, pre_return_condition: previousCopyCondition, notes: notes || record.notes || null }).eq('id', record.id)),
      ];
      if (storedCopy) updates.push(Promise.resolve(supabase.from('book_copies').update({ status: condition === 'damaged' ? 'damaged' : 'available', condition }).eq('id', storedCopy.copyId)));
      if (fine > 0) updates.push(Promise.resolve(supabase.from('fines').insert({ loan_id: record.id, member_id: record.memberId, amount: fine, paid_amount: collectFineNow ? fine : 0, status: collectFineNow ? 'paid' : 'unpaid', reason: 'Overdue book return', date_issued: todayStr, date_paid: collectFineNow ? todayStr : null, collected_by: collectFineNow ? currentUser.id || null : null })));
      const results = await Promise.all(updates);
      const error = results.find((result) => result.error)?.error;
      if (error) {
        addToast({ type: 'error', title: 'Return was not fully saved', message: error.message });
        return { success: false, message: error.message, fine };
      }
      // Re-read member loan counts and book availability after the authoritative
      // database writes. This is important for damaged returns: the copy stays
      // unavailable, but the reader's active-loan slot must be released.
      await refreshAllData();
    }

    setLastCirculationAction({ type: 'return', record, createdAt: Date.now(), previousCopyCondition, returnCondition: condition, fineId: createdFineId });
    await writeAuditEvent('book_returned', 'circulation', record.id, { memberName: record.memberName, title: record.bookTitle, barcode: record.copyBarcode, condition, fineAmount: fine });

    addToast({
      type: 'success',
      title: 'Book Returned',
      message: `"${record.bookTitle}" checked in successfully.${fine > 0 ? ` (Overdue Fine: Rs. ${fine}.00)` : ''}`,
    });

    return {
      success: true,
      message: 'Book returned successfully.',
      fine,
    };
  };

  const undoLastCirculationAction = async (): Promise<{ success: boolean; message: string }> => {
    const action = lastCirculationAction;
    if (!action) return { success: false, message: 'There is no recent circulation action to undo.' };
    if (Date.now() - action.createdAt > 5 * 60 * 1000) {
      setLastCirculationAction(null);
      return { success: false, message: 'The five-minute undo window has expired.' };
    }
    const paidFine = action.fineId ? fines.find((fine) => fine.id === action.fineId && fine.status === 'paid') : undefined;
    if (paidFine) return { success: false, message: 'A return with a collected fine cannot be undone.' };

    const supabase = getSupabase();
    if (supabase && !action.record.id.startsWith('circ-')) {
      const { error } = await supabase.rpc('undo_recent_circulation_action', {
        p_loan_id: action.record.id,
        p_action: action.type,
      });
      if (error) {
        addToast({ type: 'error', title: 'Undo was not completed', message: error.message });
        return { success: false, message: error.message };
      }
      await refreshAllData();
    } else if (isSupabaseConfigured) {
      const message = 'The library database is unavailable. Try again when the connection is restored.';
      addToast({ type: 'error', title: 'Undo was not completed', message });
      return { success: false, message };
    } else if (action.type === 'issue') {
      setCirculation((previous) => previous.map((loan) => loan.id === action.record.id ? { ...loan, status: 'cancelled' } : loan));
      setBooks((previous) => previous.map((book) => book.id === action.record.bookId ? {
        ...book,
        availableCopies: Math.min(book.totalCopies, book.availableCopies + 1),
        totalBorrows: Math.max(0, book.totalBorrows - 1),
        copies: book.copies.map((copy) => copy.barcode === action.record.copyBarcode ? { ...copy, status: 'available', borrowerId: undefined, dueDate: undefined } : copy),
      } : book));
      setMembers((previous) => previous.map((member) => member.id === action.record.memberId ? {
        ...member,
        currentlyBorrowedCount: Math.max(0, member.currentlyBorrowedCount - 1),
        totalBorrowedCount: Math.max(0, member.totalBorrowedCount - 1),
      } : member));
    } else {
      const fine = action.fineId ? fines.find((item) => item.id === action.fineId) : undefined;
      setCirculation((previous) => previous.map((loan) => loan.id === action.record.id ? { ...loan, status: 'active', returnDate: undefined, fineAmount: 0, fineStatus: 'none' } : loan));
      setBooks((previous) => previous.map((book) => book.id === action.record.bookId ? {
        ...book,
        availableCopies: action.returnCondition === 'damaged' ? book.availableCopies : Math.max(0, book.availableCopies - 1),
        copies: book.copies.map((copy) => copy.barcode === action.record.copyBarcode ? { ...copy, status: 'borrowed', condition: action.previousCopyCondition || 'good', borrowerId: action.record.memberId, dueDate: action.record.dueDate } : copy),
      } : book));
      setMembers((previous) => previous.map((member) => member.id === action.record.memberId ? {
        ...member,
        currentlyBorrowedCount: member.currentlyBorrowedCount + 1,
        unpaidFines: Math.max(0, member.unpaidFines - (fine?.status === 'unpaid' ? fine.amount : 0)),
      } : member));
      if (action.fineId) setFines((previous) => previous.filter((item) => item.id !== action.fineId));
    }

    setLastCirculationAction(null);
    if (!supabase) await writeAuditEvent('circulation_action_undone', 'circulation', action.record.id, { action: action.type, barcode: action.record.copyBarcode });
    addToast({ type: 'success', title: 'Last action undone', message: action.type === 'issue' ? 'The issue was cancelled and the copy restored.' : 'The return was reopened and the copy restored to on-loan status.' });
    return { success: true, message: 'The recent circulation action was undone.' };
  };

  const renewBook = (transactionId: string): { success: boolean; message: string } => {
    const record = circulation.find((c) => c.transactionId === transactionId || c.id === transactionId);
    if (!record || record.status !== 'active') {
      return { success: false, message: 'Active loan record not found.' };
    }

    const currentDue = new Date(record.dueDate);
    const newDue = new Date(currentDue);
    newDue.setDate(newDue.getDate() + 14);
    const newDueStr = newDue.toISOString().split('T')[0];

    setCirculation((prev) =>
      prev.map((c) => (c.id === record.id ? { ...c, dueDate: newDueStr, status: 'renewed' } : c))
    );

    addToast({
      type: 'info',
      title: 'Loan Extended',
      message: `Due date for "${record.bookTitle}" extended to ${newDueStr}.`,
    });

    return { success: true, message: `Loan renewed until ${newDueStr}.` };
  };

  // Reservations
  const createReservation = (memberId: string, bookId: string, notes?: string): { success: boolean; message: string } => {
    const member = members.find((m) => m.id === memberId);
    const book = books.find((b) => b.id === bookId);
    if (!member || !book) {
      return { success: false, message: 'Member or book record not found.' };
    }

    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      reservationId: `RS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookIsbn: book.isbn,
      memberId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      memberPhone: member.phone,
      requestDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      queuePosition: reservations.filter((r) => r.bookId === book.id && r.status === 'pending').length + 1,
      status: 'pending',
      notes,
    };

    setReservations((prev) => [newRes, ...prev]);

    addToast({
      type: 'success',
      title: 'Reservation Placed',
      message: `Book reserved for ${member.name}.`,
    });

    return { success: true, message: 'Reservation created successfully.' };
  };

  const updateReservationStatus = (reservationId: string, status: Reservation['status']) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === reservationId ? { ...r, status } : r))
    );
  };

  const cancelReservation = (reservationId: string) => {
    setReservations((prev) => prev.filter((r) => r.id !== reservationId));
    addToast({
      type: 'info',
      title: 'Reservation Cancelled',
      message: 'Reservation has been cancelled.',
    });
  };

  // Fines Actions
  const collectFine = (fineId: string, paymentMethod: string = 'Cash Desk') => {
    const fine = fines.find((f) => f.id === fineId);
    if (!fine) return;

    setFines((prev) =>
      prev.map((f) =>
        f.id === fineId
          ? {
              ...f,
              status: 'paid',
              paidDate: new Date().toISOString().split('T')[0],
              collectedBy: currentUser.name,
            }
          : f
      )
    );

    // Deduct member unpaid fines
    setMembers((prev) =>
      prev.map((m) =>
        m.id === fine.memberId
          ? { ...m, unpaidFines: Math.max(0, m.unpaidFines - fine.amount) }
          : m
      )
    );

    addToast({
      type: 'success',
      title: 'Fine Collected',
      message: `Rs. ${fine.amount}.00 received via ${paymentMethod}.`,
    });
  };

  const waiveFine = (fineId: string, reason: string) => {
    const fine = fines.find((f) => f.id === fineId);
    if (!fine) return;

    setFines((prev) =>
      prev.map((f) =>
        f.id === fineId
          ? {
              ...f,
              status: 'waived',
              notes: reason,
              collectedBy: currentUser.name,
            }
          : f
      )
    );

    setMembers((prev) =>
      prev.map((m) =>
        m.id === fine.memberId
          ? { ...m, unpaidFines: Math.max(0, m.unpaidFines - fine.amount) }
          : m
      )
    );

    addToast({
      type: 'info',
      title: 'Fine Waived',
      message: `Fine of Rs. ${fine.amount}.00 waived (${reason}).`,
    });
  };

  // Categories, Authors, Publishers Actions
  const addCategory = async (category: Omit<Category, 'id' | 'bookCount'>) => {
    const newCat: Category = { ...category, id: `cat-${Date.now()}`, bookCount: 0 };
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('categories').insert({
        name: newCat.name,
        code: newCat.ddcCode,
        sinhala_name: newCat.sinhalaName || null,
        description: newCat.description || null,
        shelf_location: newCat.shelfLocation || null,
      });
      if (error) {
        addToast({ type: 'error', title: 'Category was not added', message: error.message });
        return false;
      }
      await refreshAllData();
    } else {
      setCategories((prev) => [...prev, newCat]);
    }
    addToast({ type: 'success', title: 'Category Added', message: `Category "${newCat.name}" registered.` });
    return true;
  };

  const updateCategory = async (updatedCat: Category) => {
    const supabase = getSupabase();
    if (supabase && !updatedCat.id.startsWith('cat-')) {
      const { error } = await supabase.from('categories').update({
        name: updatedCat.name,
        code: updatedCat.ddcCode,
        sinhala_name: updatedCat.sinhalaName || null,
        description: updatedCat.description || null,
        shelf_location: updatedCat.shelfLocation || null,
      }).eq('id', updatedCat.id);
      if (error) {
        addToast({ type: 'error', title: 'Category was not updated', message: error.message });
        return false;
      }
      await refreshAllData();
    } else {
      setCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
    }
    addToast({ type: 'success', title: 'Category Updated', message: `"${updatedCat.name}" updated.` });
    return true;
  };

  const deleteCategory = async (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return false;
    const supabase = getSupabase();
    if (supabase && !categoryId.startsWith('cat-')) {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) {
        addToast({ type: 'error', title: 'Category was not removed', message: error.message });
        return false;
      }
      await refreshAllData();
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    }
    addToast({ type: 'warning', title: 'Category Removed', message: `"${cat.name}" removed.` });
    return true;
  };

  const addAuthor = async (author: Omit<Author, 'id' | 'bookCount'>) => {
    const newAuthor: Author = {
      ...author,
      id: `aut-${Date.now()}`,
      bookCount: 0,
    };
    setAuthors((prev) => [...prev, newAuthor]);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('authors').insert({
          name: newAuthor.name,
          sinhala_name: newAuthor.sinhalaName,
          bio: newAuthor.biography,
          birth_year: newAuthor.bornYear,
          nationality: newAuthor.nationality,
        });
      } catch (err) {
        console.warn('Supabase author insert error:', err);
      }
    }

    addToast({
      type: 'success',
      title: 'Author Registered',
      message: `"${newAuthor.name}" added to author directory.`,
    });
  };

  const updateAuthor = async (updatedAuthor: Author) => {
    setAuthors((prev) => prev.map((a) => (a.id === updatedAuthor.id ? updatedAuthor : a)));

    const supabase = getSupabase();
    if (supabase && !updatedAuthor.id.startsWith('aut-')) {
      try {
        await supabase
          .from('authors')
          .update({
            name: updatedAuthor.name,
            sinhala_name: updatedAuthor.sinhalaName,
            bio: updatedAuthor.biography,
            birth_year: updatedAuthor.bornYear,
            nationality: updatedAuthor.nationality,
          })
          .eq('id', updatedAuthor.id);
      } catch (err) {
        console.warn('Supabase author update error:', err);
      }
    }

    addToast({
      type: 'success',
      title: 'Author Updated',
      message: `"${updatedAuthor.name}" details saved.`,
    });
  };

  const deleteAuthor = async (authorId: string) => {
    const aut = authors.find((a) => a.id === authorId);
    if (!aut) return;
    setAuthors((prev) => prev.filter((a) => a.id !== authorId));

    const supabase = getSupabase();
    if (supabase && !authorId.startsWith('aut-')) {
      try {
        await supabase.from('authors').delete().eq('id', authorId);
      } catch (err) {
        console.warn('Supabase author delete error:', err);
      }
    }

    addToast({
      type: 'warning',
      title: 'Author Removed',
      message: `"${aut.name}" removed from directory.`,
    });
  };

  const addPublisher = async (publisher: Omit<Publisher, 'id' | 'bookCount'>) => {
    const newPub: Publisher = {
      ...publisher,
      id: `pub-${Date.now()}`,
      bookCount: 0,
    };
    setPublishers((prev) => [...prev, newPub]);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('publishers').insert({
          name: newPub.name,
          address: newPub.address,
          city: newPub.city,
          phone: newPub.phone,
          email: newPub.email,
          is_verified: newPub.isVerified,
        });
      } catch (err) {
        console.warn('Supabase publisher insert error:', err);
      }
    }

    addToast({
      type: 'success',
      title: 'Publisher Added',
      message: `"${newPub.name}" registered.`,
    });
  };

  const updatePublisher = async (updatedPub: Publisher) => {
    setPublishers((prev) => prev.map((p) => (p.id === updatedPub.id ? updatedPub : p)));

    const supabase = getSupabase();
    if (supabase && !updatedPub.id.startsWith('pub-')) {
      try {
        await supabase
          .from('publishers')
          .update({
            name: updatedPub.name,
            address: updatedPub.address,
            city: updatedPub.city,
            phone: updatedPub.phone,
            email: updatedPub.email,
            is_verified: updatedPub.isVerified,
          })
          .eq('id', updatedPub.id);
      } catch (err) {
        console.warn('Supabase publisher update error:', err);
      }
    }

    addToast({
      type: 'success',
      title: 'Publisher Updated',
      message: `"${updatedPub.name}" saved.`,
    });
  };

  const deletePublisher = async (publisherId: string) => {
    const pub = publishers.find((p) => p.id === publisherId);
    if (!pub) return;
    setPublishers((prev) => prev.filter((p) => p.id !== publisherId));

    const supabase = getSupabase();
    if (supabase && !publisherId.startsWith('pub-')) {
      try {
        await supabase.from('publishers').delete().eq('id', publisherId);
      } catch (err) {
        console.warn('Supabase publisher delete error:', err);
      }
    }

    addToast({
      type: 'warning',
      title: 'Publisher Removed',
      message: `"${pub.name}" removed from directory.`,
    });
  };

  // Inventory Verification
  const verifyInventoryBarcode = (barcode: string): { success: boolean; message: string; item?: InventoryItem } => {
    const trimmed = barcode.trim();
    let foundBook: Book | undefined;
    let foundCopy: any | undefined;

    for (const b of books) {
      const copy = b.copies?.find((c) => c.barcode === trimmed);
      if (copy) {
        foundBook = b;
        foundCopy = copy;
        break;
      }
    }

    if (!foundBook || !foundCopy) {
      return { success: false, message: `Accession / Barcode "${trimmed}" not found in library catalogue.` };
    }

    return {
      success: true,
      message: `Verified: "${foundBook.title}" (Copy #${foundCopy.copyNumber}, Status: ${foundCopy.status})`,
      item: {
        id: `inv-${Date.now()}`,
        barcode: foundCopy.barcode,
        bookTitle: foundBook.title,
        shelfLocation: foundCopy.shelfLocation || foundBook.shelfLocation,
        shelf: foundCopy.shelfLocation || foundBook.shelfLocation,
        expectedLocation: foundBook.shelfLocation,
        status: 'Audited - Match',
        lastAuditDate: new Date().toISOString().split('T')[0],
        auditedBy: currentUser.name,
        condition: foundCopy.condition,
        expectedCopies: foundBook.totalCopies,
        actualCopies: foundBook.availableCopies,
        difference: 0,
      },
    };
  };

  const loadInventoryAuditScans = async (sessionId: string): Promise<{ success: boolean; message: string; scans: StockAuditScan[] }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: 'A connected library database is required to load persisted stock audit scans.', scans: [] };
    }
    const scans: StockAuditScan[] = [];
    const pageSize = 1000;
    try {
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('stock_audit_scans')
          .select('copy_id,barcode,scanned_at')
          .eq('audit_session_id', sessionId)
          .order('scanned_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) return { success: false, message: error.message, scans: [] };
        scans.push(...(data || []).map((row: any) => ({ copyId: row.copy_id, barcode: row.barcode, scannedAt: row.scanned_at })));
        if (!data || data.length < pageSize) break;
      }
    } catch (error: any) {
      return { success: false, message: error?.message || 'Stock audit scans could not be loaded.', scans: [] };
    }
    return { success: true, message: 'Audit scans loaded.', scans };
  };

  const recordInventoryBarcode = async (sessionId: string, barcode: string): Promise<{ success: boolean; message: string; item?: InventoryItem; scan?: StockAuditScan }> => {
    const verification = verifyInventoryBarcode(barcode);
    if (!verification.success || !verification.item) return verification;
    const normalizedBarcode = barcode.trim().toLowerCase();
    const book = books.find((entry) => entry.copies?.some((copy) => copy.barcode.toLowerCase() === normalizedBarcode));
    const copy = book?.copies.find((entry) => entry.barcode.toLowerCase() === normalizedBarcode);
    if (!book || !copy) return { success: false, message: 'The barcode is not linked to a physical copy in the catalogue.' };
    const supabase = getSupabase();
    if (!supabase) return { success: false, message: 'A connected library database is required to persist stock audit scans.' };
    try {
      const { data, error } = await supabase.rpc('record_stock_audit_scan', {
        p_audit_session_id: sessionId,
        p_barcode: copy.barcode,
      });
      if (error) return { success: false, message: error.message };
      const saved = Array.isArray(data) ? data[0] : data;
      if (!saved?.copy_id || !saved?.scanned_at) return { success: false, message: 'The database did not confirm this barcode scan.' };
      await writeAuditEvent('stock_copy_scanned', 'stock_audit_scans', saved.copy_id, { barcode: saved.barcode, title: book.title, auditSessionId: sessionId });
      return {
        success: true,
        message: `Verified ${book.title} · copy ${copy.copyNumber} (${saved.barcode}).`,
        item: verification.item,
        scan: { copyId: saved.copy_id, barcode: saved.barcode, scannedAt: saved.scanned_at },
      };
    } catch (error: any) {
      return { success: false, message: error?.message || 'The barcode scan could not be saved.' };
    }
  };

  const updateInventoryStatus = (itemId: string, status: InventoryItem['status']) => {
    setInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, status } : i)));
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const addNotification = (item: Omit<NotificationItem, 'id' | 'read' | 'date'>) => {
    const newItem: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}`,
      read: false,
      date: 'Just now',
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  // Settings & System
  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Library configuration updated.',
    });
  };

  const exportDatabaseJson = async (): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'super_admin') {
      const message = 'Only the super administrator can export a full library backup.';
      addToast({ type: 'error', title: 'Backup not created', message });
      return { success: false, message };
    }
    const supabase = getSupabase();
    if (!supabase) {
      const message = 'The connected database is unavailable; no partial or browser-cache backup was created.';
      addToast({ type: 'error', title: 'Backup not created', message });
      return { success: false, message };
    }

    const tableNames = [
      'profiles', 'categories', 'authors', 'publishers', 'books', 'book_copies',
      'members', 'circulation', 'fines', 'reservations', 'audit_logs',
      'stock_audit_scans', 'system_settings',
    ];
    const tables: Record<string, unknown[]> = {};
    try {
      for (const table of tableNames) {
        const rows: unknown[] = [];
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await supabase
            .from(table as any)
            .select('*')
            .order('id', { ascending: true })
            .range(from, from + pageSize - 1);
          if (error) throw new Error(`${table}: ${error.message}`);
          rows.push(...(data || []));
          if (!data || data.length < pageSize) break;
        }
        tables[table] = rows;
      }

      const exportedAt = new Date().toISOString();
      const counts = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]));
      const payload = {
        format: 'rclms-database-backup',
        version: 1,
        system: 'Rahula College Library Management System',
        exportedAt,
        tables,
        manifest: { tables: counts, totalRows: Object.values(counts).reduce((total, count) => total + Number(count), 0) },
      };
      if (!globalThis.crypto?.subtle) throw new Error('Secure SHA-256 checksum support is unavailable in this browser.');
      const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
      const checksum = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
      const backupData = { ...payload, integrity: { algorithm: 'SHA-256', checksum } };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rclms-backup-${exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      const auditSaved = await writeAuditEvent('database_backup_exported', 'backup', exportedAt, { counts, checksum });
      const message = auditSaved
        ? `Verified backup downloaded (${payload.manifest.totalRows} records across ${tableNames.length} tables).`
        : 'Backup downloaded, but its audit event could not be saved; refresh the audit log and check database connectivity.';
      addToast({ type: auditSaved ? 'success' : 'warning', title: auditSaved ? 'Backup Exported' : 'Backup Exported · Audit Warning', message });
      return { success: true, message };
    } catch (error: any) {
      const message = error?.message || 'A complete database backup could not be created.';
      addToast({ type: 'error', title: 'Backup not created', message });
      return { success: false, message };
    }
  };

  const importDatabaseJson = (jsonString: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonString);
      if (data.books && Array.isArray(data.books)) setBooks(data.books);
      if (data.members && Array.isArray(data.members)) setMembers(data.members);
      if (data.circulation && Array.isArray(data.circulation)) setCirculation(data.circulation);
      if (data.reservations && Array.isArray(data.reservations)) setReservations(data.reservations);
      if (data.fines && Array.isArray(data.fines)) setFines(data.fines);
      if (data.categories && Array.isArray(data.categories)) setCategories(data.categories);
      if (data.authors && Array.isArray(data.authors)) setAuthors(data.authors);
      if (data.publishers && Array.isArray(data.publishers)) setPublishers(data.publishers);
      if (data.settings) setSettings(data.settings);

      addToast({
        type: 'success',
        title: 'Restore Complete',
        message: 'Database restored from JSON backup.',
      });

      return { success: true, message: 'Database imported successfully.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Invalid backup JSON file structure.' };
    }
  };

  const clearAllData = () => {
    setBooks([]);
    setMembers([]);
    setCirculation([]);
    setReservations([]);
    setFines([]);
    setCategories([]);
    setAuthors([]);
    setPublishers([]);
    setInventory([]);
    setLabelQueue([]);
    localStorage.clear();

    addToast({
      type: 'warning',
      title: 'Database Reset',
      message: 'All library collections have been reset to empty state.',
    });
  };

  // Zebra Label Queue Operations
  const addToLabelQueue = (item: Omit<LabelQueueItem, 'id' | 'addedAt'>) => {
    if (!item.bookId || !item.copyId || !item.barcode.trim()) {
      addToast({ type: 'error', title: 'Registered copy required', message: 'Only physical copies in the library catalogue can be queued for printing.' });
      return;
    }
    if (labelQueue.some((queued) => queued.copyId === item.copyId)) {
      addToast({ type: 'info', title: 'Copy already queued', message: `Copy ${item.barcode} is already waiting for printing.` });
      return;
    }
    const newItem: LabelQueueItem = {
      ...item,
      id: `lbl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      addedAt: new Date().toISOString(),
    };
    setLabelQueue((prev) => [...prev, newItem]);
    addToast({
      type: 'info',
      title: 'Added to Print Queue',
      message: `"${item.title}" (${item.barcode}) queued for sticker printing.`,
    });
  };

  const addManyToLabelQueue = (items: Omit<LabelQueueItem, 'id' | 'addedAt'>[]) => {
    if (items.length === 0) return;
    const seen = new Set(labelQueue.map((item) => item.copyId));
    const uniqueItems = items.filter((item) => {
      if (!item.bookId || !item.copyId || !item.barcode.trim() || seen.has(item.copyId)) return false;
      seen.add(item.copyId);
      return true;
    });
    if (uniqueItems.length === 0) {
      addToast({ type: 'info', title: 'Copies already queued', message: 'No new registered copy labels were added.' });
      return;
    }
    const addedAt = new Date().toISOString();
    const newItems: LabelQueueItem[] = uniqueItems.map((item, index) => ({
      ...item,
      id: `lbl-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      addedAt,
    }));
    setLabelQueue((prev) => [...prev, ...newItems]);
    addToast({
      type: 'success',
      title: 'Barcode labels ready',
      message: `${newItems.length} ${newItems.length === 1 ? 'label is' : 'labels are'} queued for printing.`,
    });
  };

  const removeFromLabelQueue = (id: string) => {
    setLabelQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearLabelQueue = () => {
    setLabelQueue([]);
    addToast({
      type: 'info',
      title: 'Queue Cleared',
      message: 'Print queue has been emptied.',
    });
  };

  const flushNextLabelRow = (): LabelQueueItem[] => {
    const row = labelQueue.slice(0, 3);
    setLabelQueue((prev) => prev.slice(3));
    return row;
  };

  return (
    <LibraryContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedBookId,
        setSelectedBookId,
        selectedMemberId,
        setSelectedMemberId,
        catalogFilter,
        setCatalogFilter,
        isSupabaseConfigured,
        refreshAllData,
        currentUser,
        setCurrentUser,
        users,
        addUser,
        updateUserRole,
        updateOwnProfile,
        isLoggedIn,
        login,
        loginWithCredentials,
        requestStaffAccess,
        registerUser,
        resetPassword,
        completeSetupWizard,
        logout,
        books,
        members,
        circulation,
        reservations,
        fines,
        categories,
        authors,
        publishers,
        inventory,
        notifications,
        settings,
        addBook,
        updateBook,
        deleteBook,
        restoreBook,
        permanentlyDeleteArchivedBook,
        addBookCopy,
        assignShelfToCopies,
        addMember,
        updateMember,
        deleteMember,
        issueBook,
        returnBook,
        lastCirculationAction,
        undoLastCirculationAction,
        renewBook,
        createReservation,
        updateReservationStatus,
        cancelReservation,
        collectFine,
        waiveFine,
        addCategory,
        updateCategory,
        deleteCategory,
        addAuthor,
        updateAuthor,
        deleteAuthor,
        addPublisher,
        updatePublisher,
        deletePublisher,
        verifyInventoryBarcode,
        loadInventoryAuditScans,
        recordInventoryBarcode,
        updateInventoryStatus,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,
        updateSettings,
        darkMode,
        toggleDarkMode,
        exportDatabaseJson,
        importDatabaseJson,
        clearAllData,
        labelQueue,
        addToLabelQueue,
        addManyToLabelQueue,
        removeFromLabelQueue,
        clearLabelQueue,
        flushNextLabelRow,
        toasts,
        addToast,
        removeToast,
        printData,
        setPrintData,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

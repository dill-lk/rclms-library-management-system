import type { UserRole } from '../types';

export const libraryPermissions = [
  { id: 'view_books', label: 'View the catalogue' },
  { id: 'add_books', label: 'Add books' },
  { id: 'edit_books', label: 'Edit book details' },
  { id: 'delete_books', label: 'Remove books' },
  { id: 'issue_loans', label: 'Issue books' },
  { id: 'process_returns', label: 'Record returns' },
  { id: 'manage_members', label: 'Manage members' },
  { id: 'collect_fines', label: 'Collect fines' },
  { id: 'waive_fines', label: 'Waive fines' },
  { id: 'view_reports', label: 'View reports' },
  { id: 'inventory_audit', label: 'Check inventory' },
  { id: 'manage_users', label: 'Manage staff' },
] as const;

export const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  librarian: 'Chief Librarian',
  assistant_librarian: 'Assistant Librarian',
  teacher: 'Teacher',
  student: 'Student',
  staff: 'Staff',
};

export const defaultDesignations: Record<UserRole, string> = {
  super_admin: 'System Administrator',
  librarian: 'Chief Librarian',
  assistant_librarian: 'Assistant Librarian',
  teacher: 'Teacher',
  student: 'Student',
  staff: 'Staff Member',
};

const allPermissionIds = libraryPermissions.map(({ id }) => id);

export const rolePermissions: Record<UserRole, readonly string[]> = {
  super_admin: allPermissionIds,
  librarian: allPermissionIds,
  assistant_librarian: [
    'view_books',
    'add_books',
    'edit_books',
    'issue_loans',
    'process_returns',
    'manage_members',
    'collect_fines',
    'view_reports',
    'inventory_audit',
  ],
  teacher: ['view_books'],
  student: ['view_books'],
  staff: ['view_books'],
};

export const permissionsForRole = (role: UserRole): string[] => [...rolePermissions[role]];

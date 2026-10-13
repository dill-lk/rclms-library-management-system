import type { Book } from '../types';

export interface CatalogueMetrics {
  activeBooks: Book[];
  archivedBooks: Book[];
  activeTitles: number;
  archivedTitles: number;
  activePhysicalCopies: number;
  archivedPhysicalCopies: number;
  totalPhysicalCopies: number;
}

const copyCount = (book: Book) => Math.max(0, Number(book.totalCopies) || 0);

/** Keeps title counts separate from physical-copy counts and never lets archived titles inflate active totals. */
export function getCatalogueMetrics(books: Book[]): CatalogueMetrics {
  const activeBooks = books.filter((book) => !book.isArchived);
  const archivedBooks = books.filter((book) => Boolean(book.isArchived));
  const activePhysicalCopies = activeBooks.reduce((sum, book) => sum + copyCount(book), 0);
  const archivedPhysicalCopies = archivedBooks.reduce((sum, book) => sum + copyCount(book), 0);

  return {
    activeBooks,
    archivedBooks,
    activeTitles: activeBooks.length,
    archivedTitles: archivedBooks.length,
    activePhysicalCopies,
    archivedPhysicalCopies,
    totalPhysicalCopies: activePhysicalCopies + archivedPhysicalCopies,
  };
}

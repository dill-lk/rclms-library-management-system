# Rahula College Library Management System (LMS)
**Rahula College, Matara, Sri Lanka**  
*Systems by Ink.q*

A modern, responsive Library Management System built for Rahula College with a calm indigo/cyan visual system, clear catalogue and circulation analytics, and a specialized **Zebra ZD230 thermal printer 3-across (30mm × 15mm) continuous barcode label studio**.

---

## 🖨️ Zebra ZD230 3-Across Thermal Roll Studio (30mm × 15mm)

### 1. Physical Roll Calibration
- **Stickers per row**: 3 stickers aligned in one line across the continuous thermal roll.
- **Individual sticker dimensions**: **30mm width × 15mm height**.
- **Total line width across roll**: **96mm** (30mm + 3mm gap + 30mm + 3mm gap + 30mm = 96mm).
- **Zebra ZD230 Resolution**: 203 DPI (8 dots/mm)
  - `^PW768` (96mm * 8 = 768 dots print width)
  - `^LL120` (15mm * 8 = 120 dots label length)
  - Slot 1 (Left): X = 12 dots (~1.5mm)
  - Slot 2 (Center): X = 276 dots (~34.5mm)
  - Slot 3 (Right): X = 540 dots (~67.5mm)

### 2. 3-Book Queue & Buffer Automation
- **Automatic 3-Across Waiting Logic**: The system stages incoming books in a real-time buffer (`Slot 1`, `Slot 2`, `Slot 3`).
- **Auto-Ready / Print Alert**: Once 3 books are queued (or multiples of 3), the 3-sticker line lights up as **"3/3 Full Row Ready"** with 1-click print or automatic web dispatch.
- **⚡ Force Print Partial Row**: If only 1 or 2 books are entered and you want to print immediately without waiting for 3, click **"⚡ Force Print One/Partial"** — the ZPL prints the exact active slots without paper wastage or margin drift.

### 3. Direct Web ZPL Commands
- **Direct Web Dispatch**: Transmits raw ZPL-II directly to the Zebra ZD230 via local Zebra Browser Print service (`http://127.0.0.1:9100/write` or `https://localhost:9101/write`).
- **Network Raw IP Socket (Port 9100)**: Direct connection configuration for network-attached Zebra printers (e.g. `192.168.1.100:9100`).
- **Web Thermal Driver Print**: Pixel-perfect `@media print` CSS calibrated with `@page { size: 96mm 15mm; margin: 0; }`.
- **Copy & Download**: 1-click copy ZPL code or download `.zpl` script for Zebra Setup Utilities, CUPS, or terminal piping (`nc 192.168.1.100 9100 < label.zpl`).

---

## 🏛️ System Modules Overview

1. **🔐 Multi-Role Authentication & Onboarding**:
   - Genuine Sign In with persistent localStorage accounts.
   - Student & Teacher Registration (auto-enrolls borrower profiles).
   - Institutional Setup Wizard for new library branches.
2. **📊 Executive Dashboard**: Live KPIs, Recharts 7-day circulation trends, Dewey Decimal distribution, and grade-wise borrowing metrics.
3. **📚 Catalog & Book Management**: Dual Card Grid and Data Table views with 1-click "Add to 3-Across Queue", multi-copy barcode tracking, and DDC categorization.
4. **🔄 Circulation Desk (Issue & Return)**: Fast issue with due date calculation, returns with automatic overdue fine calculator (LKR 10.00/day default), and renewal management.
5. **👥 Members Directory & Smart ID Cards**: Student and teacher directory with printable borrower ID cards with barcodes.
6. **💰 Overdue Fines Ledger**: Cash collection, fine waiver logs, and printable receipts in Sri Lankan Rupees (LKR).
7. **🔍 Rapid Stock Audit & Inventory**: Barcode scanner audit with mismatch detection.
8. **📈 Reports & Data Export**: Monthly circulation summaries with CSV, Excel, and PDF print exports.
9. **⚡ Global Command Palette (`⌘K` / `Ctrl+K`)**: Rapid keyboard search across all books and modules.

---

## Database setup and safety

- For a new Supabase project, run `supabase/schema.sql`, then run `supabase/migrations/20261013_idempotent_catalogue_and_access.sql`.
- `supabase/rclms_supabase_catalogue_schema.sql` is a secured legacy alternative for databases using `physical_copies`; the current app uses `book_copies` and `schema.sql`.
- For an existing project, apply the migration after reviewing its read-only duplicate-accession report. It does not delete or merge existing records.
- The migration adds `books.is_archived`; catalogue removal and duplicate cleanup archive records instead of deleting them. Authorized administrators can restore archived titles from the catalogue.
- Duplicate review groups only exact normalized accession-number matches. It requires an explicit keeper choice, preserves history/copies, and blocks archiving a candidate while it has open loans or active reservations.
- Permanent deletion is a separate administrator-only action available only for already-archived titles. The confirmation names the linked physical-copy count, requires typing the exact title, and blocks deletion when circulation or reservation history is linked; the database delete also filters on `is_archived = true`.
- The migration adds atomic, retry-safe catalogue saving and restricts database writes to authorized library staff. Public signup remains limited to student and teacher profiles.
- Do not use or publish default passwords. Create accounts through Supabase Auth and rotate any temporary credentials previously shared in documentation.

---

*Systems by Ink.q • Engineered for Rahula College, Matara*

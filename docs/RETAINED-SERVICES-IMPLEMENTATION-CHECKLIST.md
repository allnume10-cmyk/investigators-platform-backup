# Retained Services – Implementation Checklist

Use this checklist when implementing the **Retained Services** feature. Same workflow as normal cases; difference is tracking and display. Amount paid is set when the case is marked Paid (can change with work).

---

## 1. Database

- [ ] **SQL migration**  
  Add to `cases` table:
  - `is_retained_services` (boolean, default `false`).
  - Example: `ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS is_retained_services boolean NOT NULL DEFAULT false;`
- [ ] Run the migration in Supabase SQL Editor (dev, then prod).

---

## 2. Types & data mapping

- [ ] **`types.ts`**  
  On the `Case` interface, add:  
  `isRetainedServices?: boolean;`
- [ ] **`app.tsx` – `mapDbToCase`**  
  Map DB → app:
  - Read `is_retained_services` from DB row.
  - Set `isRetainedServices: c.is_retained_services ?? false` on the case object.
- [ ] **`app.tsx` – case → DB (upsert/save)**  
  When saving a case, include `is_retained_services: localCase.isRetainedServices ?? false` in the payload (and ensure the `cases` table select in fetch includes `is_retained_services`).

---

## 3. Case detail (Case Jacket)

- [ ] **Retained Services indicator**  
  On the case detail page (Case Jacket header or details section):
  - If `localCase.isRetainedServices` is true, show a clear badge/label: **“Retained Services”** (e.g. next to status or voucher badge).
- [ ] **Toggle for admin (and/or investigator)**  
  In the same area (e.g. Details or Voucher section), add a control to set the case as Retained Services:
  - Checkbox or toggle: “Retained Services” bound to `isRetainedServices`; on change call `updateCase('isRetainedServices', value)`.
  - Ensure the updated case is persisted (already handled if save includes `is_retained_services`).

---

## 4. Mission Control – Revenue Secured + Retained Services line

- [ ] **Dashboard analytics**  
  In the `dashboardAnalytics` useMemo (or equivalent):
  - Keep **total settlement** as today: sum of `amountPaid` for all cases where `voucherStatus === VoucherStatus.PAID` (no change to total; it already includes every paid case).
  - Add **retained services revenue**:  
    `retainedServicesRevenue = validCases.filter(c => c.voucherStatus === VoucherStatus.PAID && c.isRetainedServices).reduce((s, c) => s + (c.amountPaid || 0), 0)`.
  - Expose both in the returned analytics object (e.g. `totalSettlement`, `retainedServicesRevenue`).
- [ ] **Revenue Secured card**  
  On Mission Control, on the **Revenue Secured** card (the one that shows `totalSettlement`):
  - Keep the main line: **“Revenue Secured”** and **“$X”** (total of all paid cases).
  - Add a **small line or secondary text** directly under it:  
    **“of which Retained Services: $Y”** using `dashboardAnalytics.retainedServicesRevenue` (format with same locale/decimals as main total).  
  - If `retainedServicesRevenue === 0`, you can show “of which Retained Services: $0” or hide the line; product preference.

---

## 5. New case / Intake / Communication Hub

- [ ] **Default value**  
  When creating a new case (Case Files “New Case”, Intake, or Communication Hub):
  - Set `isRetainedServices: false` (or omit; DB default is false).
- [ ] **Payload to DB**  
  Ensure create-case payloads include `is_retained_services: false` (or the chosen default) so the column is always set.

---

## 6. Voucher Hub – “Paid Retained Services” filter

- [ ] **Filter option**  
  Add a way to show only **Paid Retained Services** cases:
  - **Option A:** Add a new segment/button **“Paid Retained Services”** next to Missing, Pre-Audit, Submitted, Settled (Paid), Intend Not to Bill. When selected, `filteredVoucherCases` includes only cases where `voucherStatus === VoucherStatus.PAID` **and** `isRetainedServices === true`.
  - **Option B:** When **Paid** is selected, add a sub-filter/toggle “Retained Services only”; when on, further filter the Paid list to `isRetainedServices === true`.
- [ ] **VoucherSegment type**  
  If using Option A, extend the segment type (e.g. add `'Paid Retained Services'`) and in `filteredVoucherCases` add a branch for it:  
  `if (voucherView === 'Paid Retained Services') return c.voucherStatus === VoucherStatus.PAID && c.isRetainedServices;`
- [ ] **Revenue in Voucher Hub**  
  If the Voucher Hub shows a “Revenue Secured” total for the current view, when “Paid Retained Services” is selected that total should equal the sum of `amountPaid` for the filtered list (i.e. retained services paid total).

---

## 7. Report Hub (optional)

- [ ] If any Report Hub export or summary uses “Revenue Secured” or paid totals, ensure it uses the same definition: all paid cases (total) and, if you add a breakdown, “of which Retained Services: $X” from the same `retainedServicesRevenue` logic.

---

## 8. Testing

- [ ] Create or mark a case as Retained Services; mark it Paid with an amount; confirm Mission Control “Revenue Secured” includes that amount and “of which Retained Services” shows it.
- [ ] With no retained-services cases paid, “of which Retained Services” shows $0 (or is hidden, per your choice).
- [ ] Voucher Hub: “Paid Retained Services” (or the sub-filter) shows only paid + retained services cases; total matches.
- [ ] Case Jacket: badge and toggle persist after save and reload.

---

## File reference (current codebase)

| Area | File / location |
|------|-----------------|
| Case type | `types.ts` – `Case` |
| DB → Case mapping | `app.tsx` – `mapDbToCase` |
| Case save / fetch | `app.tsx` – case upsert, fetch `cases` select |
| Dashboard analytics | `app.tsx` – `dashboardAnalytics` useMemo (~line 814) |
| Revenue Secured card | `app.tsx` – Mission Control card using `totalSettlement` (~1475) |
| Voucher filter | `app.tsx` – `filteredVoucherCases`, `voucherView`, `VoucherSegment` (~1308, 48) |
| Case Jacket | `app.tsx` – `CaseJacket` component (header/details, voucher section) |

---

## Summary

1. **DB:** `cases.is_retained_services` (boolean, default false).  
2. **Types + mapping:** Add to `Case`, map in/out in `mapDbToCase` and save.  
3. **Case Jacket:** Badge “Retained Services” + toggle to set it.  
4. **Mission Control:** Total = all paid; add line “of which Retained Services: $X”.  
5. **Voucher Hub:** Filter “Paid Retained Services” (or sub-filter under Paid).  
6. **New cases:** Default `is_retained_services` to false.

No separate “amount at assignment” field; amount paid is the existing paid amount, set when the case is marked Paid.

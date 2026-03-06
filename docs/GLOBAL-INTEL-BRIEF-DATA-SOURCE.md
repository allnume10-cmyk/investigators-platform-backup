# Global Intel Brief – Data-Driven Design

The Global Intel Brief is **fully data-driven**. The app computes all metrics and lists from live data; the AI only narrates them and suggests priority actions. No numbers or case names are invented.

---

## 1. Snapshot

| Field | Source |
|-------|--------|
| **activeMattersCount** | Count of cases where status = Open (filtered by selected attorney if one is chosen). |
| **totalPaidRevenue** | Sum of `amountPaid` on cases with voucher status = Paid. |
| **paidThisMonth** | Sum of `amountPaid` on cases where voucher = Paid and `datePaid` is in the current calendar month. |
| **retainedServicesRevenue** | Sum of `amountPaid` on cases where voucher = Paid and `isRetainedServices` is true. |
| **attorneyFilter** | "All attorneys" or the selected attorney name (scope of the brief). |

---

## 2. Outstanding tasks

All task counts and lists use **global tasks** whose `caseId` is in the filtered case set.

| Field | Source |
|-------|--------|
| **activeTaskCount** | Count of tasks with `completed = false`. |
| **overdueCount** | Tasks not completed and `dueDate < today`. |
| **dueThisWeekCount** | Tasks not completed and due date between today and 7 days from now. |
| **casesWithMostOpenTasks** | Up to 10 cases (defendant name, case number, open task count) sorted by open task count descending. Surfaces where the investigator is spread thin. |

---

## 3. Stagnant cases

Open cases with **no activity in 45+ days** (last activity = most recent case log date, or `dateOpened` if no logs).

| Field | Source |
|-------|--------|
| **count** | Number of open cases with last activity ≥ 45 days ago. |
| **cases** | Up to 15: defendant name, case number, last activity date (mm/dd/yyyy), days since last activity. |

Purpose: focus attention on re-engaging these matters to capture billable work and avoid lost revenue.

---

## 4. Voucher pipeline / missing billables

All counts and lists use **open** cases only (except missing on closed).

| Field | Source |
|-------|--------|
| **missing90Plus** | Open cases, voucher = Missing, days since `dateOpened` ≥ 90. List: name, case number, daysAssigned. |
| **missing60to89** | Open cases, voucher = Missing, days assigned 60–89. |
| **missing30to59** | Open cases, voucher = Missing, days assigned 30–59. |
| **missingOnClosedCount** | Count of closed cases with voucher = Missing (never submitted). |
| **submittedNotPaidCount** | Count of cases (any status) with voucher = Submitted. |

Purpose: show where follow-up on vouchers can drive revenue.

---

## 5. New cases

| Field | Source |
|-------|--------|
| **openedLast14DaysCount** | Open cases with `dateOpened` in the last 14 days. |
| **notTouchedCount** | Of those, cases with 0 or 1 activity log (barely touched). |
| **notTouched** | Up to 10: defendant name, case number, date opened (mm/dd/yyyy). |

Purpose: highlight new matters that need quick intake and first log to lock in billable time.

---

## 6. Court / trial readiness

| Field | Source |
|-------|--------|
| **upcomingNext7DaysCount** | Open cases with `nextCourtDate` between today and 7 days from now. |
| **trialReadinessCount** | Open cases where `nextEventDescription` contains "TRIAL" or "READINESS" (case-insensitive). |
| **trialWithNoRecentActivityCount** | Of those, cases with no activity in the last 7 days. |
| **trialWithNoRecentActivity** | Up to 10: name, case number, event, court date, count of open tasks. |

Purpose: suggest pre-trial review and case log before court to capture billable time and readiness.

---

## 7. How the AI uses this

The prompt:

- Sends the full JSON payload above.
- Tells the model to use **only** this data (no invented numbers, amounts, or case names).
- Asks for sections: Snapshot, Outstanding tasks, Stagnant cases, Voucher pipeline, New cases, Court/trial readiness, then **2–4 priority actions** derived from the data (e.g. focus on stagnant cases, submit aged missing vouchers, touch new cases not yet worked, review trial cases with no recent activity).
- Asks for clear headings and horizontal rules for readability.

So the brief gives management a clear picture of what’s going on and what to focus on for steady revenue, with suggestions that are grounded in the same data the app tracks.

export enum CaseStatus {
  OPEN = 'Open',
  CLOSED = 'Closed',
  PENDING = 'Pending'
}

export enum VoucherStatus {
  MISSING = 'Missing',
  OPEN = 'Open',
  SUBMITTED = 'Submitted',
  PENDING = 'Pending',
  PAID = 'Paid',
  INTEND_NOT_TO_BILL = 'Intend Not to Bill'
}

export type CaseTab = 'details' | 'logs' | 'communication' | 'evidence';

export interface ActivityCode {
  id: string;
  code: string;
  label: string;
  description?: string;
  defaultNarrative?: string;
  defaultHours?: number;
}

export interface Activity {
  id: string;
  caseId: string;
  date: string;
  code: string;
  description: string;
  hours: number;
}

export interface Task {
  id: string;
  text: string;
  priority: TaskPriority;
  dueDate: string;
  completed: boolean;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface GlobalTask {
  id: string;
  taskDate: string;
  defendantName: string;
  caseNumber: string;
  taskDescription: string;
  dueDate: string;
  priority: TaskPriority;
  completed: boolean;
  attorneyName: string;
  caseId: string;
}

export interface EvidenceItem {
  id: string;
  description: string;
  dateRequested: string;
  requestedFrom?: string;
  dateReceived?: string;
  notes?: string;
}

export interface Communication {
  id: string;
  date: string;
  type: string;
  content: string;
  recipient: string;
}

export interface PendingCommunication {
  id: string;
  date: string;
  sender: string;
  subject: string;
  body: string;
  type: 'Email' | 'Text' | 'Call';
  suggestedCaseId?: string;
  suggestionReasoning?: string;
  confidence?: number;
}

export interface Case {
  /** UUID of the assigned investigator */
  assigned_to?: string | null;

  id: string;
  caseNumber: string;
  judgeName: string;
  voucherStatus: VoucherStatus;
  status: CaseStatus;
  dateOpened: string;
  dateClosed?: string;
  attorneyName: string;
  defendantFirstName: string;
  defendantLastName: string;
  nextCourtDate: string;
  nextEventDescription: string;
  evidenceItems: EvidenceItem[];
  communications?: Communication[];
  tasks?: Task[];
  dispositionNotes: string;
  activities: Activity[];
  datePaid?: string;
  amountPaid?: number;
}

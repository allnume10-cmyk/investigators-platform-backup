import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, Search, CheckCircle, Clock, X, LayoutDashboard, Inbox, Banknote, 
  RefreshCw, Briefcase, Loader2, FolderOpen, Trash2, GitCommit, 
  User, ArrowRight, DollarSign, ListTodo, Sparkles, Gavel, MessageSquare,
  Check, Pencil, ChevronRight, ArrowUpDown, Calendar, FileX, AlertCircle,
  Activity as ActivityIcon, ShieldAlert, TrendingUp, SortAsc, Send, Mail, Phone,
  FileSearch, Archive, Mic, Square, Volume2, Filter, ReceiptText, ExternalLink,
  Flame, History, ShieldCheck, Zap, AlertTriangle, Maximize2, Share2, Globe, Shrink,
  Settings, Save, Key, Database, CalendarDays, ChevronLeft, Wallet, Hourglass,
  Circle, Snowflake, FileText, ClipboardList, Target, Shield, LayoutList,
  MessageSquareDiff, BrainCircuit, CheckSquare, ListFilter, Trash2 as TrashIcon,
  Link2, MailCheck, Lock, Unlock, MailSearch as MailSearchIcon, Info, Copy,
  AlertOctagon, HelpCircle, ArrowRightCircle, ExternalLink as ExternalLinkIcon,
  Fingerprint, ShieldAlert as ShieldAlertIcon, UserPlus, MonitorSmartphone,
  ShieldQuestion, ShieldX, Ban, UserCheck, ShieldEllipsis, ListTree,
  DatabaseBackup, Layers, Activity, CalendarArrowDown, Landmark, RotateCcw,
  CheckCircle2, FileUp, DatabaseZap, Cpu, OctagonAlert, Download, FileType,
  MailOpen, CalendarRange, ArrowUpRight, Gauge, Timer, FilterX, SortDesc,
  ChevronDown, FileWarning, ClipboardCheck, SendHorizontal, BadgeCheck,
  Building2, HardDrive, ShieldCheck as ShieldCheckIcon, SaveAll, Cloud,
  TimerReset, BarChart4
} from 'lucide-react';
import { 
  Case, CaseStatus, VoucherStatus, Activity as CaseActivity, ActivityCode,
  GlobalTask, CaseTab, TaskPriority, Communication, EvidenceItem,
  PendingCommunication, Jurisdiction
} from './types';
import { 
  parseBulkSpreadsheet, parseEmailToCase, draftInvestigativeEmail, processAudioToActivity,
  generateAttorneyReport, generateGlobalIntelligenceBrief, matchCommunicationToCase,
  summarizeCommForLog
} from './geminiService';
import { supabase } from './supabase';
import { Auth } from './Auth';
type InvestigatorProfile = {
  user_id: string;
  full_name: string | null;
};

const investigatorLabel = (p: InvestigatorProfile) =>
  (p.full_name && p.full_name.trim().length > 0)
    ? p.full_name
    : p.user_id;

type LifecycleFilter = 'Active' | 'Unscheduled' | 'Archive';
type CaseSort = 'Defendant' | 'Court Date' | 'Attorney' | 'Date Opened';
type VoucherSegment = 'Missing' | 'Pre-Audit' | 'Submitted' | 'Paid' | 'Paid Retained Services' | 'Intend Not to Bill';
type TimeframeOption = 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'All';

const INITIAL_ACTIVITY_CODES: ActivityCode[] = [
  { id: 'in', code: 'IN', label: 'Case Intake', defaultNarrative: 'Reviewed attorney assignment email outlining initial investigative directives and opened case file.', defaultHours: 0.2 },
  { id: 'ae', code: 'AE', label: 'Attorney Email', defaultNarrative: 'Reviewed attorney email; task added to list.', defaultHours: 0.2 },
  { id: 'new', code: 'NEW', label: 'New Case', defaultNarrative: 'Opened case, reviewed discovery, consulted atty', defaultHours: 0.8 },
  { id: 'su', code: 'SU', label: 'Status Update', defaultNarrative: "researched CourtView, updated case status for attorney's weekly status report.", defaultHours: 0.2 },
  { id: 'cc', code: 'CC', label: 'Closed Case', defaultNarrative: 'Case resolved; finalized all reports and archived investigative file.', defaultHours: 0.2 },
  { id: 'pc', code: 'PC', label: 'Phone Call', defaultNarrative: 'Investigative phone call conducted.', defaultHours: 0.0 },
  { id: 'jv', code: 'JV', label: 'Jail Visit', defaultNarrative: 'Conducted jail visit at facility.', defaultHours: 0.0 },
  { id: 'di', code: 'DI', label: 'Defendant Interview', defaultNarrative: 'Conducted formal interview with defendant.', defaultHours: 0.0 },
  { id: 'wi', code: 'WI', label: 'Witness Interview', defaultNarrative: 'Interviewed potential witness.', defaultHours: 0.0 },
  { id: 'ac', code: 'AC', label: 'Attorney Conference', defaultNarrative: 'Conference with lead counsel regarding case strategy.', defaultHours: 0.0 },
  { id: 'ci', code: 'CI', label: 'Complainant Interview', defaultNarrative: 'Conducted interview with complainant.', defaultHours: 0.0 },
  { id: 'bwo', code: 'BWO', label: 'Body-Worn Camera Review', defaultNarrative: 'Reviewed body-worn camera footage.', defaultHours: 0.0 },
  { id: 'med', code: 'MED', label: 'Medical Records Review', defaultNarrative: 'Analyzed medical documentation.', defaultHours: 0.0 },
  { id: 'rp', code: 'RP', label: 'Review Plea', defaultNarrative: 'Reviewed proposed plea agreement.', defaultHours: 0.0 },
  { id: 'rd', code: 'RD', label: 'Review Discovery', defaultNarrative: 'Examined discovery materials provided by the prosecution.', defaultHours: 0.0 },
  { id: 'dv', code: 'DV', label: 'Document Review', defaultNarrative: 'Reviewed case-related documents.', defaultHours: 0.0 },
  { id: 'rt', code: 'RT', label: 'Records/Transcript Request', defaultNarrative: 'Prepared and submitted request for official records/transcripts.', defaultHours: 0.0 },
  { id: 'cs', code: 'CS', label: 'Canvass Crime Scene', defaultNarrative: 'Conducted canvass and scene examination.', defaultHours: 0.0 },
  { id: 'bh', code: 'BH', label: 'Attend Bond Hearing', defaultNarrative: 'Attended bond hearing proceedings.', defaultHours: 0.0 },
  { id: 'sup', code: 'SUP', label: 'Prepare/Serve Subpoena', defaultNarrative: 'Prepared and/or served legal subpoena.', defaultHours: 0.0 },
  { id: 'cr', code: 'CR', label: 'Court Review/Court Appearance', defaultNarrative: 'Attended court proceedings.', defaultHours: 0.0 },
  { id: 'tr', code: 'TR', label: 'Travel', defaultNarrative: 'Travel time for investigative purposes.', defaultHours: 0.0 },
  { id: 'em', code: 'EM', label: 'Email', defaultNarrative: 'Investigative email correspondence.', defaultHours: 0.0 },
  { id: 'ot', code: 'OT', label: 'Other', defaultNarrative: 'Other investigative task performed.', defaultHours: 0.0 },
];

const displayDate = (iso: string | undefined) => {
  if (!iso || iso === '' || iso === 'null') return 'N/A';
  if (iso.includes('/')) return iso;
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${m}/${d}/${y}` : iso;
};

const calculateDaysDiff = (dateStr: string) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 3600 * 24));
};

const normalizeStatus = (val: string): any => {
  if (!val) return CaseStatus.OPEN;
  const lower = val.toLowerCase();
  if (lower === 'closed') return CaseStatus.CLOSED;
  if (lower === 'pending') return CaseStatus.PENDING;
  return CaseStatus.OPEN;
};

const todayStr = new Date().toLocaleDateString('en-CA');

const mapDbToCase = (c: any, todayStr: string): Case => ({
  id: c.id,
  caseNumber: c.caseNumber ?? '',
  judgeName: c.judgeName ?? '',
  voucherStatus: (c.voucherStatus ?? VoucherStatus.MISSING) as VoucherStatus,
  status: normalizeStatus(c.status),
  dateOpened: c.dateOpened ?? todayStr,
  dateClosed: c.dateClosed ?? '',
  defendantFirstName: c.defendantFirstName ?? '',
  defendantLastName: c.defendantLastName ?? '',
  nextCourtDate: c.nextCourtDate ?? '',
  nextEventDescription: c.nextEventDescription ?? '',
  attorneyName: c.attorneyName ?? '',
  assigned_to: c.assigned_to ?? null,
  jurisdiction_id: c.jurisdiction_id ?? null,
  activities: c.activities ?? [],
  evidenceItems: c.evidenceItems ?? [],
  communications: c.communications ?? [],
  dispositionNotes: c.dispositionNotes ?? '',
  datePaid: c.datePaid ?? '',
  amountPaid: Number(c.amountPaid ?? 0),
  needsIntake: !!c.needs_intake,
  isRetainedServices: !!c.is_retained_services
});

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = { 
    [CaseStatus.OPEN]: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
    [CaseStatus.CLOSED]: 'bg-slate-100 text-slate-500 border-slate-200', 
    [CaseStatus.PENDING]: 'bg-amber-50 text-amber-600 border-amber-100' 
  };
  return <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${colors[status as CaseStatus] || 'bg-slate-50 border-slate-200'}`}>{status}</span>;
};

const VoucherBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = { 
    [ VoucherStatus.MISSING]: 'bg-rose-50 text-rose-600 border-rose-200', 
    [VoucherStatus.PAID]: 'bg-indigo-50 text-indigo-600 border-indigo-200', 
    [VoucherStatus.SUBMITTED]: 'bg-blue-50 text-blue-600 border-blue-200', 
    [VoucherStatus.PENDING]: 'bg-amber-50 text-amber-600 border-amber-200', 
    [VoucherStatus.OPEN]: 'bg-emerald-50 text-emerald-600 border-emerald-200', 
    [VoucherStatus.INTEND_NOT_TO_BILL]: 'bg-slate-200 text-slate-600 border-slate-300' 
  };
  return <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${colors[status as VoucherStatus] || 'bg-slate-50 border-slate-200'}`}>{status}</span>;
};

const StatCard: React.FC<{ 
  label: string; 
  value: string | number; 
  icon: any; 
  color: 'rose' | 'orange' | 'indigo' | 'amber' | 'emerald' | 'slate'; 
  subValue?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg'
}> = ({ label, value, icon: Icon, color, subValue, onClick, size = 'md' }) => {
  const textColors = { rose: 'text-rose-600', orange: 'text-orange-600', indigo: 'text-indigo-600', amber: 'text-amber-600', emerald: 'text-emerald-600', slate: 'text-slate-600' };
  const bgColors = { rose: 'bg-rose-600', orange: 'bg-orange-600', indigo: 'bg-indigo-600', amber: 'bg-amber-600', emerald: 'bg-emerald-600', slate: 'bg-slate-600' };
  const borderColors = { rose: 'hover:border-rose-400', orange: 'hover:border-orange-400', indigo: 'hover:border-indigo-400', amber: 'hover:border-amber-400', emerald: 'hover:border-emerald-400', slate: 'hover:border-slate-400' };

  const containerPadding = size === 'sm' ? 'p-4' : 'p-6';
  const iconSize = size === 'sm' ? 18 : 24;
  const labelSize = size === 'sm' ? 'text-[8px]' : 'text-[10px]';
  const valueSize = size === 'sm' ? 'text-lg' : 'text-2xl';

  return (
    <div 
      onClick={onClick}
      className={`bg-white border p-6 rounded-[32px] shadow-sm flex items-center gap-6 group transition-all duration-300 ${onClick ? `cursor-pointer hover:shadow-md active:scale-95 ${borderColors[color]}` : ''} ${containerPadding}`}
    >
      <div className={`p-4 rounded-2xl ${bgColors[color]} bg-opacity-10 ${textColors[color]} transition-transform group-hover:scale-110`}>
        <Icon size={iconSize} />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className={`${labelSize} font-black uppercase text-slate-400 tracking-widest`}>{label}</p>
        <div className="flex items-baseline gap-2">
          <p className={`${valueSize} font-black text-slate-900 leading-tight`}>{value}</p>
          {subValue && <span className="text-[10px] font-bold text-slate-400">{subValue}</span>}
        </div>
      </div>
    </div>
  );
};

const CaseJacket: React.FC<{ 
  caseData: Case; 
  onClose: () => void; 
  onUpdate: (updated: Case) => Promise<void>; 
  activityCodes: ActivityCode[];
  tasks: GlobalTask[];
  investigators: InvestigatorProfile[];
  jurisdictions: Jurisdiction[];
  isAdmin: boolean;
  onUpdateTask?: (task: GlobalTask) => Promise<void>;
}> = ({ caseData, onClose, onUpdate, activityCodes, tasks, investigators, jurisdictions, isAdmin, onUpdateTask }) => {
  const [activeTab, setActiveTab] = useState<CaseTab>('details');
  const [localCase, setLocalCase] = useState<Case>(caseData);
  
  const initialCodeMeta = activityCodes.find(c => c.code === 'NEW') || activityCodes[0] || { code: 'NEW', defaultNarrative: '', defaultHours: 0.1 };
  const [newLog, setNewLog] = useState({ 
    code: initialCodeMeta.code, 
    description: initialCodeMeta.defaultNarrative || '', 
    hours: (initialCodeMeta.defaultHours || 0.0).toString(), 
    date: new Date().toLocaleDateString('en-CA'),
  });
  
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => { setLocalCase(caseData); }, [caseData]);

  const totalHours = useMemo(() => (localCase.activities || []).reduce((s, a) => s + (Number(a.hours) || 0), 0), [localCase.activities]);
  
  const sortedActivities = useMemo(() => {
    return [...(localCase.activities || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [localCase.activities]);

  const associatedTasks = useMemo(() => {
    return tasks.filter(t => t.caseId === localCase.id).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, localCase.id]);

  const updateCase = (f: keyof Case, v: any) => setLocalCase(p => ({ ...p, [f]: v }));

  const handleCommit = async () => {
    if (!localCase.defendantLastName?.trim() || localCase.defendantLastName === 'NEW CASE') {
      alert("Please enter a valid Defendant Last Name.");
      return;
    }
    setIsCommitting(true);
    try {
      await onUpdate(localCase);
      onClose(); 
    } catch (err) {
      console.error("Save failure in Jacket:", err);
    } finally {
      setIsCommitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessingVoice(true);
          try {
            const aiExtracted = await processAudioToActivity(base64Audio, 'audio/webm', activityCodes);
            if (aiExtracted) {
              setNewLog(p => ({ ...p, code: aiExtracted.code || 'NEW', description: aiExtracted.description || '', hours: (aiExtracted.hours || 0.0).toString() }));
            }
          } catch (err) { alert("Voice extraction failed."); } finally { setIsProcessingVoice(false); }
        };
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleLogActivity = () => {
    if (!newLog.description) return;
    const acts = localCase.activities || [];
    updateCase('activities', [{ 
      id: Math.random().toString(36).substr(2,9), 
      caseId: localCase.id, 
      code: newLog.code, 
      description: newLog.description, 
      hours: parseFloat(newLog.hours) || 0.0, 
      date: newLog.date 
    }, ...acts]);
    
    const meta = activityCodes.find(ac => ac.code === newLog.code);
    setNewLog(prev => ({...prev, description: meta?.defaultNarrative || '', hours: (meta?.defaultHours || 0.0).toString()}));
  };

  const updateActivity = (id: string, updates: Partial<CaseActivity>) => {
    setLocalCase(prev => ({
      ...prev,
      activities: (prev.activities || []).map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  };

  const copyEmailDraftToClipboard = async () => {
    const lines: string[] = [
      `Subject: Case update – ${localCase.defendantLastName}, ${localCase.defendantFirstName} – Ref: ${localCase.caseNumber}`,
      '',
      `Dear ${localCase.attorneyName || 'Attorney'},`,
      '',
      'Summary of investigative actions for the above matter:',
      '',
    ];
    (localCase.activities || [])
      .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
      .forEach(a => {
        lines.push(`• ${displayDate(a.date)} – ${a.code}: ${a.description || '(no narrative)'} (${Number(a.hours || 0).toFixed(1)} hrs)`);
      });
    lines.push('');
    lines.push(`Total billable hours: ${totalHours.toFixed(1)}`);
    if (localCase.nextCourtDate) lines.push(`Next court date: ${displayDate(localCase.nextCourtDate)}`);
    const draft = lines.join('\n');
    try {
      await navigator.clipboard.writeText(draft);
      alert('Draft copied to clipboard. Paste into your email to send to the attorney.');
    } catch {
      alert('Could not copy to clipboard. Please copy the draft manually.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[40px] shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden border border-slate-300 animate-in zoom-in-95">
        <header className="px-10 py-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black uppercase shadow-inner border border-indigo-400">{localCase.defendantLastName?.[0] || '?'}</div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{localCase.defendantLastName}, {localCase.defendantFirstName}</h2>
              <div className="flex items-center gap-5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-700 pr-5">REF: {localCase.caseNumber}</span>
                <StatusBadge status={localCase.status}/>
                <VoucherBadge status={localCase.voucherStatus}/>
                {localCase.isRetainedServices && (
                  <span className="px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest bg-violet-500/20 text-violet-200 border-violet-400/50">Retained Services</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-95"><X size={28}/></button>
        </header>

        {(localCase as any).needsIntake && (
          <div className="px-10 py-3 bg-amber-100 border-b border-amber-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-black uppercase tracking-wide text-amber-900">Complete intake information for this case</span>
            <button onClick={() => { updateCase('needsIntake', false); onUpdate({ ...localCase, needsIntake: false }); }} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all">
              Mark intake complete
            </button>
          </div>
        )}

        <div className="flex bg-slate-50 border-b shrink-0 px-10">
          {['details', 'logs', 'communication', 'evidence'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as CaseTab)} className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{tab}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-white">
          {activeTab === 'details' && (
            <div className="animate-in fade-in space-y-12 h-full">
              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-6 space-y-10 border-r pr-10">
                  <section className="space-y-6">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-100 pb-3 flex items-center gap-3"><User size={16} className="text-indigo-600"/> Identity Registry</h3>
                    <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-50">
                      <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Opened</p><input type="date" value={localCase.dateOpened} onChange={e => updateCase('dateOpened', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none"/></div>
                      <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Case Number</p><input value={localCase.caseNumber} onChange={e => updateCase('caseNumber', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none"/></div>
                      <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">First Name</p><input value={localCase.defendantFirstName} onChange={e => updateCase('defendantFirstName', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none"/></div>
                      <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Name</p><input value={localCase.defendantLastName} onChange={e => updateCase('defendantLastName', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-black uppercase outline-none"/></div>
                      <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Attorney</p><input value={localCase.attorneyName} onChange={e => updateCase('attorneyName', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-black uppercase outline-none"/></div>
                      <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Presiding Judge</p><input value={localCase.judgeName} onChange={e => updateCase('judgeName', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none"/></div>
                      <div className="col-span-2 space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jurisdiction</p><select value={localCase.jurisdiction_id ?? ''} onChange={e => updateCase('jurisdiction_id', e.target.value || null)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none"><option value="">Select area...</option>{jurisdictions.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
                    </div>
                    {isAdmin && (
                      <div className="mt-3">
                        <label className="text-xs font-semibold text-slate-600">Assigned Investigator</label>
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={localCase.assigned_to ?? ''}
                          onChange={(e) => updateCase('assigned_to', e.target.value || null)}
                        >
                          <option value="">Unassigned</option>
                          {investigators.map((inv) => (
                            <option key={inv.user_id} value={inv.user_id}>
                              {investigatorLabel(inv)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </section>

                  {/* Task Integration Box */}
                  <section className="space-y-6">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-100 pb-3 flex items-center gap-3"><ListTodo size={16} className="text-indigo-600"/> Investigative Directives</h3>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {associatedTasks.length === 0 ? (
                        <div className="py-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                          <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No active directives found</p>
                        </div>
                      ) : associatedTasks.map(t => (
                        <div key={t.id} className={`p-5 rounded-3xl border flex items-center justify-between gap-4 transition-all ${t.completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-200'}`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-bold leading-tight ${t.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{t.taskDescription}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className={`text-[8px] font-black uppercase tracking-widest ${!t.completed && t.dueDate < todayStr ? 'text-blue-950' : 'text-slate-400'}`}>
                                Due: {displayDate(t.dueDate)} {!t.completed && t.dueDate < todayStr && '(OVERDUE)'}
                              </span>
                              <span className="text-[8px] font-black uppercase text-indigo-400">{t.priority}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => onUpdateTask?.({...t, completed: !t.completed})}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${t.completed ? 'bg-emerald-500 border-emerald-500 text-white shadow-inner' : 'border-slate-100 hover:border-indigo-600 text-transparent'}`}
                          >
                            <Check size={20}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                
                <div className="col-span-6 space-y-10">
                  <section className="space-y-6">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-100 pb-3 flex items-center gap-3"><Gavel size={16} className="text-indigo-600"/> Court & Lifecycle</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Court Date</p><input type="date" value={localCase.nextCourtDate} onChange={e => updateCase('nextCourtDate', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold"/></div>
                        <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Event Description</p><input value={localCase.nextEventDescription} onChange={e => updateCase('nextEventDescription', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" placeholder="e.g. Trial Readiness"/></div>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-[1fr_1fr] gap-6 items-start">
                          <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Case Status</p><select value={localCase.status} onChange={e => updateCase('status', e.target.value as CaseStatus)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-black uppercase outline-none">{Object.values(CaseStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                          {(localCase.status === CaseStatus.CLOSED || String(localCase.status || '').toLowerCase() === 'closed') ? (
                            <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Closed</p><input type="date" value={localCase.dateClosed ?? ''} onChange={e => updateCase('dateClosed', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none"/></div>
                          ) : <div />}
                        </div>
                        <div className="grid grid-cols-[1fr_1fr] gap-6 items-start">
                          <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Voucher Status</p><select value={localCase.voucherStatus} onChange={e => updateCase('voucherStatus', e.target.value as VoucherStatus)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-black uppercase outline-none">{Object.values(VoucherStatus).map(vs => <option key={vs} value={vs}>{vs}</option>)}</select></div>
                          {(localCase.voucherStatus === VoucherStatus.PAID || String(localCase.voucherStatus || '').toLowerCase() === 'paid') ? (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date Paid</p><input type="date" value={localCase.datePaid ?? ''} onChange={e => updateCase('datePaid', e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-xs font-bold outline-none"/></div>
                              <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Amount Paid</p><input type="number" step="0.01" min="0" value={localCase.amountPaid ?? ''} onChange={e => updateCase('amountPaid', e.target.value ? Number(e.target.value) : 0)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-xs font-bold outline-none" placeholder="0.00"/></div>
                            </div>
                          ) : <div />}
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="retained-services" checked={!!localCase.isRetainedServices} onChange={e => updateCase('isRetainedServices', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"/>
                          <label htmlFor="retained-services" className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Retained Services</label>
                        </div>
                      </div>
                      <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Strategic Notes</p><textarea value={localCase.dispositionNotes} onChange={e => updateCase('dispositionNotes', e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl text-xs font-medium h-48 outline-none resize-none focus:border-indigo-600 transition-all" placeholder="Enter notes..."/></div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-8 animate-in fade-in h-full">
              <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden shrink-0">
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">Post Investigative Log {isProcessingVoice && <span className="flex items-center gap-2 text-indigo-300 animate-pulse"><Loader2 size={12} className="animate-spin"/> AI Processing...</span>}</h4>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={copyEmailDraftToClipboard} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest transition-all" title="Copy email draft to clipboard (paste into email to send to attorney)">
                      <Mail size={18}/>
                      Draft email
                    </button>
                    <p className="text-3xl font-black text-white">{totalHours.toFixed(1)} <span className="text-[10px] text-slate-500 uppercase">Total Billable Hrs</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4 items-end relative z-10">
                  <div className="col-span-2 space-y-1"><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Date</p><input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="w-full p-3 bg-white rounded-xl text-[11px] font-bold outline-none"/></div>
                  <div className="col-span-2 space-y-1"><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Type</p><select value={newLog.code} onChange={e => {
                    const code = e.target.value;
                    const meta = activityCodes.find(ac => ac.code === code);
                    setNewLog({...newLog, code, description: meta?.defaultNarrative || '', hours: (meta?.defaultHours || 0.0).toString()});
                  }} className="w-full p-3 bg-white rounded-xl text-[11px] font-black uppercase">{activityCodes.map(ac => <option key={ac.id} value={ac.code}>{ac.code}</option>)}</select></div>
                  <div className="col-span-4 space-y-1"><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Narrative</p><input value={newLog.description} onChange={e => setNewLog({...newLog, description: e.target.value})} className="w-full p-3 bg-white rounded-xl text-[11px] font-bold outline-none" placeholder="Enter narrative..."/></div>
                  <div className="col-span-1 space-y-1"><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Hrs</p><input type="number" step="0.1" value={newLog.hours} onChange={e => setNewLog({...newLog, hours: e.target.value})} className="w-full p-3 bg-white rounded-xl text-[11px] font-black outline-none" placeholder="0.1"/></div>
                  <div className="col-span-3 flex gap-2"><button onClick={isRecording ? stopRecording : startRecording} className={`flex-1 py-3.5 rounded-xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{isRecording ? <Square size={14}/> : <Mic size={14}/>} {isRecording ? 'Stop' : 'Voice'}</button><button onClick={handleLogActivity} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-white hover:text-indigo-600 transition-all shadow-lg active:scale-95">Sync</button></div>
                </div>
              </div>
              <div className="space-y-4 pb-10">
                {sortedActivities.map(a => (
                  <div key={a.id} className="p-5 bg-white border rounded-[24px] flex items-start justify-between gap-4 hover:border-indigo-200 transition-all shadow-sm">
                    <div className="flex gap-4 items-start flex-1 min-w-0">
                      <div className="flex flex-col gap-2 shrink-0">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                        <input type="date" value={a.date || ''} onChange={e => updateActivity(a.id, { date: e.target.value })} className="w-32 p-2 bg-slate-50 border rounded-lg text-[11px] font-bold outline-none focus:border-indigo-500"/>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 w-24">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                        <select value={a.code} onChange={e => updateActivity(a.id, { code: e.target.value })} className="w-full p-2 bg-slate-50 border rounded-lg text-[11px] font-black uppercase outline-none focus:border-indigo-500">{activityCodes.map(ac => <option key={ac.id} value={ac.code}>{ac.code}</option>)}</select>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Narrative</label>
                        <input value={a.description || ''} onChange={e => updateActivity(a.id, { description: e.target.value })} className="w-full p-2 bg-slate-50 border rounded-lg text-[11px] font-bold outline-none focus:border-indigo-500" placeholder="Enter narrative..."/>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 w-16">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hrs</label>
                        <input type="number" step="0.1" min="0" value={a.hours ?? ''} onChange={e => updateActivity(a.id, { hours: parseFloat(e.target.value) || 0 })} className="w-full p-2 bg-slate-50 border rounded-lg text-[11px] font-black outline-none focus:border-indigo-500"/>
                      </div>
                    </div>
                    <button onClick={() => updateCase('activities', (localCase.activities || []).filter(x => x.id !== a.id))} className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all shrink-0" title="Remove entry"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="animate-in fade-in space-y-8 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-100 pb-3 flex items-center gap-3"><MessageSquare size={16} className="text-indigo-600"/> Communications</h3>
                <button type="button" onClick={() => updateCase('communications', [...(localCase.communications || []), { id: Math.random().toString(36).slice(2), date: todayStr, type: 'Email', content: '', recipient: localCase.attorneyName || '' }])} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700">Add entry</button>
              </div>
              <div className="space-y-4">
                {(localCase.communications || []).length === 0 ? (
                  <p className="text-slate-400 text-sm py-8 text-center">No communications logged. Add an entry to track emails, calls, or correspondence.</p>
                ) : (localCase.communications || []).map(comm => (
                  <div key={comm.id} className="p-5 bg-slate-50 border rounded-2xl flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Date</p><input type="date" value={comm.date || ''} onChange={e => updateCase('communications', (localCase.communications || []).map(x => x.id === comm.id ? { ...x, date: e.target.value } : x))} className="w-full p-2 border rounded-lg text-xs"/></div>
                      <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Type</p><select value={comm.type || 'Email'} onChange={e => updateCase('communications', (localCase.communications || []).map(x => x.id === comm.id ? { ...x, type: e.target.value } : x))} className="w-full p-2 border rounded-lg text-xs">{['Email', 'Call', 'Text', 'Letter', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                      <div className="col-span-2 space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Recipient</p><input value={comm.recipient || ''} onChange={e => updateCase('communications', (localCase.communications || []).map(x => x.id === comm.id ? { ...x, recipient: e.target.value } : x))} className="w-full p-2 border rounded-lg text-xs" placeholder="Name or email"/></div>
                      <div className="col-span-2 space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Content / Summary</p><textarea value={comm.content || ''} onChange={e => updateCase('communications', (localCase.communications || []).map(x => x.id === comm.id ? { ...x, content: e.target.value } : x))} className="w-full p-2 border rounded-lg text-xs min-h-[80px]" placeholder="Summary or notes"/></div>
                    </div>
                    <button type="button" onClick={() => updateCase('communications', (localCase.communications || []).filter(x => x.id !== comm.id))} className="self-end p-2 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-bold">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="animate-in fade-in space-y-8 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-100 pb-3 flex items-center gap-3"><FileSearch size={16} className="text-indigo-600"/> Evidence</h3>
                <button type="button" onClick={() => updateCase('evidenceItems', [...(localCase.evidenceItems || []), { id: Math.random().toString(36).slice(2), description: '', dateRequested: todayStr, requestedFrom: '', dateReceived: '', notes: '' }])} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700">Add item</button>
              </div>
              <div className="space-y-4">
                {(localCase.evidenceItems || []).length === 0 ? (
                  <p className="text-slate-400 text-sm py-8 text-center">No evidence items. Add requests and track receipt.</p>
                ) : (localCase.evidenceItems || []).map(ev => (
                  <div key={ev.id} className="p-5 bg-slate-50 border rounded-2xl flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Description</p><input value={ev.description || ''} onChange={e => updateCase('evidenceItems', (localCase.evidenceItems || []).map(x => x.id === ev.id ? { ...x, description: e.target.value } : x))} className="w-full p-2 border rounded-lg text-xs" placeholder="What was requested"/></div>
                      <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Date requested</p><input type="date" value={ev.dateRequested || ''} onChange={e => updateCase('evidenceItems', (localCase.evidenceItems || []).map(x => x.id === ev.id ? { ...x, dateRequested: e.target.value } : x))} className="w-full p-2 border rounded-lg text-xs"/></div>
                      <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Requested from</p><input value={ev.requestedFrom || ''} onChange={e => updateCase('evidenceItems', (localCase.evidenceItems || []).map(x => x.id === ev.id ? { ...x, requestedFrom: e.target.value } : x))} className="w-full p-2 border rounded-lg text-xs" placeholder="Agency or party"/></div>
                      <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Date received</p><input type="date" value={ev.dateReceived || ''} onChange={e => updateCase('evidenceItems', (localCase.evidenceItems || []).map(x => x.id === ev.id ? { ...x, dateReceived: e.target.value } : x))} className="w-full p-2 border rounded-lg text-xs"/></div>
                      <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Notes</p><input value={ev.notes || ''} onChange={e => updateCase('evidenceItems', (localCase.evidenceItems || []).map(x => x.id === ev.id ? { ...x, notes: e.target.value } : x))} className="w-full p-2 border rounded-lg text-xs" placeholder="Optional"/></div>
                    </div>
                    <button type="button" onClick={() => updateCase('evidenceItems', (localCase.evidenceItems || []).filter(x => x.id !== ev.id))} className="self-end p-2 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-bold">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <footer className="p-8 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
          <button onClick={handleCommit} disabled={isCommitting} className="px-12 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-50">
            {isCommitting ? <Loader2 size={18} className="animate-spin"/> : <GitCommit size={18}/>} Commit Changes
          </button>
        </footer>
      </div>
    </div>
  );
};

const AppShell: React.FC = () => {

  

  const [dbCases, setDbCases] = useState<Case[]>([]);
  const [investigators, setInvestigators] = useState<InvestigatorProfile[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [myJurisdictionId, setMyJurisdictionId] = useState<string | null>(null);
  const [myJurisdictionIds, setMyJurisdictionIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isAdmin = myRole === 'global_admin' || myRole === 'admin' || myRole === 'ADMIN';

  const [showProfile, setShowProfile] = useState(false);
const [profileName, setProfileName] = useState('');
const [savingProfile, setSavingProfile] = useState(false);


  const [globalTasks, setGlobalTasks] = useState<GlobalTask[]>([]);
  const [activityCodes, setActivityCodes] = useState<ActivityCode[]>(INITIAL_ACTIVITY_CODES);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [registrySearch, setRegistrySearch] = useState('');
  const [voucherView, setVoucherView] = useState<VoucherSegment>('Missing');
  const [voucherTimeframe, setVoucherTimeframe] = useState<TimeframeOption>('All');
  const [voucherAttorneyFilter, setVoucherAttorneyFilter] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Dashboard Collapsible State - Set all to true (collapsed) by default
  const [collapsedAlerts, setCollapsedAlerts] = useState<Record<string, boolean>>({
    evidence: true,
    overdue: true,
    urgent: true,
    cold: true,
    stagnant: true
  });

  const toggleAlert = (key: string) => setCollapsedAlerts(prev => ({ ...prev, [key]: !prev[key] }));

  // Case File Registry Filters & Sorting
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('Active');
  const [caseSort, setCaseSort] = useState<CaseSort>('Defendant');

  // Intake State
  const [intakeText, setIntakeText] = useState('');
  const [isIntaking, setIsIntaking] = useState(false);

  // Communication Hub State
  const [commHubSubject, setCommHubSubject] = useState('');
  const [commHubBody, setCommHubBody] = useState('');
  const [commHubSender, setCommHubSender] = useState('');
  const [commHubDate, setCommHubDate] = useState(todayStr);
  const [commHubSuggestion, setCommHubSuggestion] = useState<{ suggestedCaseId: string | null; reasoning: string; confidence: number } | null>(null);
  const [commHubSelectedCaseId, setCommHubSelectedCaseId] = useState<string | null>(null);
  const [commHubLoading, setCommHubLoading] = useState(false);
  const [commHubAccepting, setCommHubAccepting] = useState(false);

  // Report Hub State
  const [selectedAttorneyFilter, setSelectedAttorneyFilter] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>('weekly');
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Global Tasks state
  const [taskFilter, setTaskFilter] = useState<'Active' | 'Completed'>('Active');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<{
    defendantName: string; attorneyName: string; taskDescription: string; dueDate: string; priority: TaskPriority; caseId: string; caseNumber: string; needsIntake?: boolean;
  }>({
    defendantName: '',
    attorneyName: '',
    taskDescription: '',
    dueDate: todayStr,
    priority: 'Medium',
    caseId: '',
    caseNumber: ''
  });
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const caseSearchMatches = useMemo(() => {
    const q = caseSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return dbCases.filter(c => (c.defendantLastName || '').toLowerCase().includes(q));
  }, [dbCases, caseSearchQuery]);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string | null>(new Date().toLocaleDateString('en-CA'));

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const days = [];
    const date = new Date(firstDay);
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  const fetchAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data: cData, error: cError } = await supabase.from('cases').select('*');
      if (cError) throw cError;
      if (cData) setDbCases(cData.map(c => mapDbToCase(c, todayStr)));
      
      const { data: tData, error: tError } = await supabase.from('global_tasks').select('*');
      if (tError) throw tError;
      if (tData) setGlobalTasks(tData.map(t => ({
        id: t.id,
        taskDate: t.taskDate || '',
        defendantName: t.defendantName || '',
        attorneyName: t.attorneyName || '',
        caseNumber: t.caseNumber || '',
        taskDescription: t.taskDescription || '',
        dueDate: t.dueDate || '',
        priority: (t.priority || 'Medium') as TaskPriority,
        completed: !!t.completed,
        caseId: t.caseId,
        needsIntake: !!t.needs_intake
      })));
      const { data: jData } = await supabase.from('jurisdictions').select('id, name').order('name');
      if (jData?.length) setJurisdictions(jData as Jurisdiction[]);
      setLastSync(new Date());
    } catch (err: any) { 
      console.error("Cloud Fetch Error:", err);
    } finally { setIsProcessing(false); }
  }, []);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('full_name, role, jurisdiction_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Profile load failed:', error);
        return;
      }

      setProfileName(prof?.full_name || '');
      setMyRole(prof?.role ?? null);
      setMyJurisdictionId(prof?.jurisdiction_id ?? null);

      // Load investigator's assigned jurisdictions (many-to-many). Admins skip this.
      const role = (prof?.role && String(prof.role).toLowerCase()) || '';
      if (role === 'global_admin' || role === 'admin') {
        setMyJurisdictionIds([]);
        return;
      }
      const { data: pjRows } = await supabase
        .from('profile_jurisdictions')
        .select('jurisdiction_id')
        .eq('user_id', user.id);
      const ids = (pjRows || []).map((r: { jurisdiction_id: string }) => r.jurisdiction_id);
      if (ids.length) {
        setMyJurisdictionIds(ids);
        setMyJurisdictionId(ids[0]);
      } else if (prof?.jurisdiction_id) {
        setMyJurisdictionIds([prof.jurisdiction_id]);
        setMyJurisdictionId(prof.jurisdiction_id);
      } else {
        setMyJurisdictionIds([]);
        setMyJurisdictionId(null);
      }
    })();
  }, []);

  // Load investigators: non-admins see only themselves; global_admin sees all investigators (all jurisdictions).
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      if (!isAdmin) {
        const { data: me } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('user_id', user.id)
          .single();
        setInvestigators(me ? [me as InvestigatorProfile] : []);
        return;
      }

      // Load all profiles then filter by role (case-insensitive) so DB enum casing (e.g. Investigator) doesn't matter
      const { data: list, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Failed to load investigators:', error);
        setInvestigators([]);
        return;
      }

      const invList = (list || [])
        .filter((p: { role?: string }) => p.role && String(p.role).toLowerCase() === 'investigator')
        .map((p: { user_id: string; full_name: string | null }) => ({ user_id: p.user_id, full_name: p.full_name }));
      setInvestigators(invList);
    })();
  }, [isAdmin, myRole]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Investigators only see jurisdictions they are assigned to (profile_jurisdictions); admins see all.
  const displayJurisdictions = useMemo(() => {
    if (isAdmin) return jurisdictions;
    if (myJurisdictionIds.length) return jurisdictions.filter(j => myJurisdictionIds.includes(j.id));
    return [];
  }, [jurisdictions, isAdmin, myJurisdictionIds]);

  // Investigators only see cases assigned to them; admins see all.
  const casesForCurrentUser = useMemo(() => {
    if (isAdmin || !currentUserId) return dbCases;
    return dbCases.filter(c => c.assigned_to === currentUserId);
  }, [dbCases, isAdmin, currentUserId]);

  const workloadByDate = useMemo(() => {
    const map: Record<string, { total: number, activities: (CaseActivity & { defendantName: string, caseId: string })[] }> = {};
    casesForCurrentUser.forEach(c => {
      (c.activities || []).forEach(a => {
        if (!map[a.date]) map[a.date] = { total: 0, activities: [] };
        map[a.date].total += (a.hours || 0);
        map[a.date].activities.push({ ...a, defendantName: `${c.defendantLastName || 'NEW'}, ${c.defendantFirstName || 'CASE'}`, caseId: c.id });
      });
    });
    return map;
  }, [casesForCurrentUser]);

  const dashboardAnalytics = useMemo(() => {
    const isValidCase = (c: Case) => {
      const f = c.defendantFirstName?.trim() || '';
      const l = c.defendantLastName?.trim() || '';
      const isPlaceholder = ['NEW CASE', 'NEW INTAKE', 'NEW', 'INTAKE', ''].includes(l.toUpperCase());
      return f.length > 0 && l.length > 0 && !isPlaceholder;
    };

    const validCases = casesForCurrentUser.filter(isValidCase);
    const activeMatters = validCases.filter(c => c.status === CaseStatus.OPEN);
    
    const highDutyDays = Object.entries(workloadByDate)
      .filter(([date, data]) => data.total > 12)
      .map(([date, data]) => ({ date, total: data.total }))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const evidenceAlerts = validCases.flatMap(c => 
      (c.evidenceItems || [])
        .filter(e => !e.dateReceived && e.dateRequested < todayStr)
        .map(e => ({ 
          ...e, 
          caseId: c.id, 
          defendantName: `${c.defendantLastName}, ${c.defendantFirstName}`, 
          attorneyName: c.attorneyName 
        }))
    ).sort((a,b) => new Date(a.dateRequested).getTime() - new Date(b.dateRequested).getTime());

    const overdueCourts = activeMatters.filter(c => c.nextCourtDate && c.nextCourtDate < todayStr)
      .sort((a,b) => new Date(a.nextCourtDate).getTime() - new Date(b.nextCourtDate).getTime());

    const urgentTrials = activeMatters.filter(c => {
      if (!c.nextCourtDate) return false;
      const courtDate = new Date(c.nextCourtDate);
      const diffDays = (courtDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      const isCritical = ["trial readiness", "jury trial", "non-jury trial", "motion hearing", "sentencing"].some(term => (c.nextEventDescription || '').toLowerCase().includes(term));
      return diffDays >= 0 && diffDays <= 30 && isCritical;
    }).sort((a,b) => new Date(a.nextCourtDate).getTime() - new Date(b.nextCourtDate).getTime());

    const coldStarts = activeMatters.filter(c => {
      const acts = c.activities || [];
      if (acts.length === 0) return false;
      const onlyNewAndSu = acts.every(a => a.code === 'NEW' || a.code === 'SU');
      const hasNew = acts.some(a => a.code === 'NEW');
      if (!onlyNewAndSu || !hasNew) return false;
      const newActs = acts.filter(a => a.code === 'NEW');
      const earliestNewDate = newActs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date;
      return calculateDaysDiff(earliestNewDate) >= 14;
    }).map(c => {
      const acts = c.activities || [];
      const newActs = acts.filter(a => a.code === 'NEW');
      const earliestNewDate = newActs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date;
      return { ...c, daysSinceNew: calculateDaysDiff(earliestNewDate) };
    }).sort((a,b) => b.daysSinceNew - a.daysSinceNew);

    const stagnantRisk = activeMatters.filter(c => {
      const logs = c.activities || [];
      const refTimeStr = logs.length > 0 ? logs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : c.dateOpened;
      return calculateDaysDiff(refTimeStr) > 45;
    }).map(c => {
      const logs = c.activities || [];
      const refTimeStr = logs.length > 0 ? logs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : c.dateOpened;
      return { ...c, stagnantDays: calculateDaysDiff(refTimeStr) };
    }).sort((a,b) => b.stagnantDays - a.stagnantDays);

    const totalSettlement = validCases.filter(c => c.voucherStatus === VoucherStatus.PAID).reduce((s, c) => s + (c.amountPaid || 0), 0);
    const retainedServicesRevenue = validCases.filter(c => c.voucherStatus === VoucherStatus.PAID && c.isRetainedServices).reduce((s, c) => s + (c.amountPaid || 0), 0);
    const pendingRevenue = validCases
      .filter(c => c.voucherStatus === VoucherStatus.SUBMITTED)
      .reduce((total, c) => {
        const caseHrs = (c.activities || []).reduce((s, a) => s + (a.hours || 0), 0);
        return total + (caseHrs * 45); 
      }, 0);

    const counts = {
      Missing: validCases.filter(c => c.voucherStatus === VoucherStatus.MISSING && c.status === CaseStatus.OPEN).length,
      'Pre-Audit': validCases.filter(c => c.status === CaseStatus.CLOSED && [VoucherStatus.MISSING, VoucherStatus.OPEN].includes(c.voucherStatus)).length,
      Submitted: validCases.filter(c => c.voucherStatus === VoucherStatus.SUBMITTED).length,
      Paid: validCases.filter(c => c.voucherStatus === VoucherStatus.PAID).length,
      'Paid Retained Services': validCases.filter(c => c.voucherStatus === VoucherStatus.PAID && c.isRetainedServices).length,
      IntendNotToBill: validCases.filter(c => c.voucherStatus === VoucherStatus.INTEND_NOT_TO_BILL).length,
    };

    return { 
      activeCount: activeMatters.length,
      urgentTrials,
      coldStarts,
      stagnantRisk,
      overdueCourts,
      evidenceAlerts,
      highDutyDays,
      counts,
      totalSettlement,
      retainedServicesRevenue,
      pendingRevenue,
      sortedActivities: validCases.flatMap(c => (c.activities || []).map(a => ({ ...a, defendantName: `${c.defendantLastName}, ${c.defendantFirstName}`, caseId: c.id }))).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 25)
    };
  }, [casesForCurrentUser, workloadByDate]);

  const uniqueAttorneys = useMemo(() => {
    const attys = new Set<string>();
    casesForCurrentUser.forEach(c => { if(c.attorneyName) attys.add(c.attorneyName); });
    return Array.from(attys).sort();
  }, [casesForCurrentUser]);

  const sortedGlobalTasks = useMemo(() => {
    return [...globalTasks].sort((a, b) => {
      const aNeed = (a as any).needsIntake ? 1 : 0;
      const bNeed = (b as any).needsIntake ? 1 : 0;
      if (bNeed !== aNeed) return bNeed - aNeed;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [globalTasks]);

  const persistCase = async (c: Case) => {
    setIsProcessing(true);
    try {
      const {
        id, caseNumber, judgeName, voucherStatus, status,
        dateOpened, dateClosed, attorneyName, defendantFirstName,
        defendantLastName, nextCourtDate, nextEventDescription,
        evidenceItems, dispositionNotes, activities, datePaid, amountPaid,
        assigned_to, jurisdiction_id, communications, needsIntake,
        isRetainedServices
      } = c;

      const payload = {
        id, caseNumber, judgeName, voucherStatus, status,
        dateOpened, dateClosed, attorneyName, defendantFirstName,
        defendantLastName, nextCourtDate, nextEventDescription,
        evidenceItems: evidenceItems || [],
        communications: communications || [],
        dispositionNotes: dispositionNotes || '',
        activities: activities || [],
        datePaid: datePaid || '',
        amountPaid: Number(amountPaid || 0),
        assigned_to: c.assigned_to ?? null,
        jurisdiction_id: jurisdiction_id ?? null,
        needs_intake: !!needsIntake,
        is_retained_services: !!isRetainedServices
      };

      const { error } = await supabase.from('cases').upsert(payload);
      if (error) throw error;
      await fetchAll();
    } catch (err: any) {
      console.error("Schema Sync Failure:", err);
      alert(`Schema Sync Failure: ${err.message}`);
      throw err; 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const persistTask = async (t: any) => {
    setIsProcessing(true);
    try {
      const { id, taskDate, defendantName, attorneyName, caseNumber, taskDescription, dueDate, priority, completed, caseId, needsIntake } = t;
      const payload = { id, taskDate, defendantName, attorneyName: attorneyName || '', caseNumber, taskDescription, dueDate, priority, completed, caseId, needs_intake: !!needsIntake };

      const { error } = await supabase.from('global_tasks').upsert(payload);
      if (error) throw error;
      await fetchAll();
    } catch (err: any) {
      console.error("Directive Failure:", err);
      alert(`Directive Failure: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewCase = async () => {
    const newId = crypto.randomUUID();
    const jurisdictionId = (myJurisdictionIds[0] ?? myJurisdictionId) ?? displayJurisdictions[0]?.id ?? null;
    const assignedTo = !isAdmin && currentUserId ? currentUserId : null;
    const newCase: Case = { 
      id: newId, caseNumber: '', judgeName: '', voucherStatus: VoucherStatus.MISSING, status: CaseStatus.OPEN, 
      dateOpened: todayStr, attorneyName: '', defendantFirstName: '', defendantLastName: 'NEW CASE', 
      nextCourtDate: '', nextEventDescription: '', evidenceItems: [], activities: [], communications: [], 
      dispositionNotes: '', amountPaid: 0, datePaid: '', jurisdiction_id: jurisdictionId, assigned_to: assignedTo,
      isRetainedServices: false
    };
    setSelectedCaseId(newId);
    setDbCases(prev => [newCase, ...prev]);
  };

  const seedSampleCases = async () => {
    const d = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const samples: Case[] = [
      { id: crypto.randomUUID(), caseNumber: 'REF-2024-001', judgeName: 'Hon. Smith', voucherStatus: VoucherStatus.MISSING, status: CaseStatus.OPEN, dateOpened: d(-30), dateClosed: '', attorneyName: 'Jane Doe, Esq.', defendantFirstName: 'Maria', defendantLastName: 'Garcia', nextCourtDate: d(14), nextEventDescription: 'Trial Readiness', evidenceItems: [], activities: [], communications: [], dispositionNotes: '', datePaid: '', amountPaid: 0, assigned_to: null },
      { id: crypto.randomUUID(), caseNumber: 'REF-2024-002', judgeName: 'Hon. Jones', voucherStatus: VoucherStatus.SUBMITTED, status: CaseStatus.OPEN, dateOpened: d(-60), dateClosed: '', attorneyName: 'John Smith, Esq.', defendantFirstName: 'James', defendantLastName: 'Wilson', nextCourtDate: d(7), nextEventDescription: 'Status Conference', evidenceItems: [], activities: [], communications: [], dispositionNotes: '', datePaid: '', amountPaid: 0, assigned_to: null },
      { id: crypto.randomUUID(), caseNumber: 'REF-2024-003', judgeName: 'Hon. Lee', voucherStatus: VoucherStatus.PAID, status: CaseStatus.CLOSED, dateOpened: d(-90), dateClosed: d(-5), attorneyName: 'Anne Brown, Esq.', defendantFirstName: 'Robert', defendantLastName: 'Martinez', nextCourtDate: '', nextEventDescription: '', evidenceItems: [], activities: [], communications: [], dispositionNotes: 'Case settled.', datePaid: d(-5), amountPaid: 1250, assigned_to: null },
      { id: crypto.randomUUID(), caseNumber: 'REF-2024-004', judgeName: 'Hon. Davis', voucherStatus: VoucherStatus.MISSING, status: CaseStatus.OPEN, dateOpened: d(-10), dateClosed: '', attorneyName: 'Paul Green, Esq.', defendantFirstName: 'Linda', defendantLastName: 'Garcia', nextCourtDate: d(21), nextEventDescription: 'Preliminary Hearing', evidenceItems: [], activities: [], communications: [], dispositionNotes: '', datePaid: '', amountPaid: 0, assigned_to: null },
    ];
    setIsProcessing(true);
    try {
      for (const c of samples) await persistCase(c);
      await fetchAll();
      alert('Added 4 sample cases (Garcia, Wilson, Martinez, Garcia). Try the task intake last-name search.');
    } catch (err: any) {
      alert(`Seed failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveMyProfile = async () => {
    setSavingProfile(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
  
      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, full_name: profileName });
  
      if (error) throw error;
  
      setShowProfile(false);
    } catch (e: any) {
      alert(`Could not save profile: ${e.message || e}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleIntake = async () => {
    if (!intakeText.trim()) return;
    setIsIntaking(true);
    try {
      const parsed = await parseEmailToCase(intakeText, "manual-intake@system");
      if (parsed) {
        const newId = crypto.randomUUID();
        const intakeCase: Case = {
          id: newId,
          caseNumber: parsed.case_number || '',
          judgeName: parsed.judge || '',
          voucherStatus: VoucherStatus.MISSING,
          status: CaseStatus.OPEN,
          dateOpened: todayStr,
          attorneyName: parsed.lead_counsel || '',
          defendantFirstName: parsed.defendant_first || '',
          defendantLastName: parsed.defendant_last || 'NEW INTAKE',
          nextCourtDate: parsed.next_court_date || '',
          nextEventDescription: parsed.hearing_type || '',
          evidenceItems: [],
          activities: [{ id: 'init', caseId: newId, code: 'IN', description: 'Initial AI Intake processing complete.', hours: 0.2, date: todayStr }],
          communications: [],
          dispositionNotes: '',
          amountPaid: 0,
          jurisdiction_id: (myJurisdictionIds[0] ?? myJurisdictionId) ?? displayJurisdictions[0]?.id ?? null,
          assigned_to: !isAdmin && currentUserId ? currentUserId : null,
          isRetainedServices: false
        };
        await persistCase(intakeCase);
        setIntakeText('');
        setActiveTab('cases');
        setSelectedCaseId(newId);
      }
    } catch (e) {
      alert("Intake analysis failed.");
    } finally {
      setIsIntaking(false);
    }
  };

  const handleCommHubAnalyze = async () => {
    if (!commHubBody.trim()) return;
    setCommHubLoading(true);
    setCommHubSuggestion(null);
    try {
      const result = await matchCommunicationToCase(
        { subject: commHubSubject, body: commHubBody },
        dbCases
      );
      if (result && typeof result === 'object') {
        const suggestedId = (result as any).suggestedCaseId ?? null;
        setCommHubSuggestion({
          suggestedCaseId: suggestedId || null,
          reasoning: (result as any).reasoning || 'No reasoning provided.',
          confidence: typeof (result as any).confidence === 'number' ? (result as any).confidence : 0,
        });
        setCommHubSelectedCaseId(suggestedId || null);
      } else {
        setCommHubSuggestion({ suggestedCaseId: null, reasoning: 'AI suggested new case.', confidence: 0 });
        setCommHubSelectedCaseId(null);
      }
    } catch (e: any) {
      console.error('Comm Hub analyze error:', e);
      const msg = e?.message || String(e);
      alert(msg ? `Analysis failed: ${msg}` : 'Analysis failed. Please try again.');
    } finally {
      setCommHubLoading(false);
    }
  };

  const handleCommHubAccept = async () => {
    if (!commHubBody.trim()) return;
    setCommHubAccepting(true);
    try {
      const summary = await summarizeCommForLog({ body: commHubBody, subject: commHubSubject });
      const narrative = (summary as any)?.narrative || commHubSubject || 'Email correspondence reviewed.';
      const hours = typeof (summary as any)?.hours === 'number' ? (summary as any).hours : 0.2;
      const code = (summary as any)?.code || 'SU';

      const isNewCase = !commHubSelectedCaseId;
      if (isNewCase) {
        const parsed = await parseEmailToCase(commHubBody, commHubSender || 'unknown');
        let defendantFirst = (parsed as any)?.defendant_first ?? '';
        let defendantLast = (parsed as any)?.defendant_last ?? '';
        let attorneyName = (parsed as any)?.lead_counsel ?? '';
        if ((!defendantFirst && !defendantLast) && attorneyName && !attorneyName.includes('@') && attorneyName.trim().split(/\s+/).length >= 2) {
          const parts = attorneyName.trim().split(/\s+/);
          defendantLast = parts[parts.length - 1] || '';
          defendantFirst = parts.slice(0, -1).join(' ') || '';
          attorneyName = '';
        }
        const newId = crypto.randomUUID();
        const newCase: Case = {
          id: newId,
          caseNumber: (parsed as any)?.case_number || '',
          judgeName: (parsed as any)?.judge || '',
          voucherStatus: VoucherStatus.MISSING,
          status: CaseStatus.OPEN,
          dateOpened: todayStr,
          dateClosed: '',
          attorneyName,
          defendantFirstName: defendantFirst,
          defendantLastName: defendantLast || 'NEW CASE',
          nextCourtDate: (parsed as any)?.next_court_date || '',
          nextEventDescription: (parsed as any)?.hearing_type || '',
          evidenceItems: [],
          activities: [{ id: 'init', caseId: newId, code: 'IN', description: narrative, hours: 0.2, date: todayStr }],
          communications: [{ id: crypto.randomUUID().slice(0, 9), date: commHubDate, type: 'Email', content: commHubBody.slice(0, 500), recipient: commHubSender }],
          dispositionNotes: '',
          amountPaid: 0,
          datePaid: '',
          jurisdiction_id: (myJurisdictionIds[0] ?? myJurisdictionId) ?? displayJurisdictions[0]?.id ?? null,
          assigned_to: !isAdmin && currentUserId ? currentUserId : null,
          isRetainedServices: false,
          needsIntake: true,
        };
        await persistCase(newCase);
        await fetchAll();
        setActiveTab('cases');
        setSelectedCaseId(newId);
        setCommHubSubject(''); setCommHubBody(''); setCommHubSender(''); setCommHubSuggestion(null); setCommHubSelectedCaseId(null);
        alert('New case created with IN activity. Case opened.');
      } else {
        const c = dbCases.find(x => x.id === commHubSelectedCaseId);
        if (!c) { alert('Case not found.'); return; }
        const newActivity = { id: Math.random().toString(36).slice(2), caseId: c.id, code: 'AE', description: narrative, hours: 0.2, date: todayStr };
        const updatedCase: Case = {
          ...c,
          activities: [...(c.activities || []), newActivity],
          communications: [...(c.communications || []), { id: crypto.randomUUID().slice(0, 9), date: commHubDate, type: 'Email', content: commHubBody.slice(0, 500), recipient: commHubSender }],
        };
        await persistCase(updatedCase);
        const taskSummary = narrative.slice(0, 200) || commHubSubject || 'Task from attorney email';
        const task = {
          id: crypto.randomUUID(),
          taskDate: todayStr,
          defendantName: `${c.defendantLastName}, ${c.defendantFirstName}`,
          attorneyName: c.attorneyName || '',
          caseNumber: c.caseNumber || '',
          taskDescription: taskSummary,
          dueDate: todayStr,
          priority: 'Medium' as TaskPriority,
          completed: false,
          caseId: c.id,
          needsIntake: true,
        };
        await persistTask(task);
        await fetchAll();
        setActiveTab('cases');
        setSelectedCaseId(c.id);
        setCommHubSubject(''); setCommHubBody(''); setCommHubSender(''); setCommHubSuggestion(null); setCommHubSelectedCaseId(null);
        alert('Activity and task added to case. Communication logged.');
      }
    } catch (e) {
      alert('Accept failed. ' + (e as Error).message);
    } finally {
      setCommHubAccepting(false);
    }
  };

  const handleExecuteReport = async (reportId: string) => {
    setIsGeneratingReport(true);
    setGeneratedReport(null);
    try {
      let filtered = dbCases;
      if (selectedAttorneyFilter) filtered = dbCases.filter(c => c.attorneyName === selectedAttorneyFilter);

      let reportData: any = {};
      if (reportId === 'weekly') {
        const next7 = new Date(); next7.setDate(next7.getDate() + 7);
        const next7Str = next7.toLocaleDateString('en-CA');
        reportData = {
          upcomingCourt: filtered.filter(c => c.nextCourtDate && c.nextCourtDate >= todayStr && c.nextCourtDate <= next7Str).map(c => ({ name: `${c.defendantLastName}, ${c.defendantFirstName}`, caseNumber: c.caseNumber, event: c.nextEventDescription, date: c.nextCourtDate })),
          missingVoucher10Days: filtered.filter(c => c.voucherStatus === VoucherStatus.MISSING && calculateDaysDiff(c.dateOpened) >= 10).map(c => ({ name: `${c.defendantLastName}, ${c.defendantFirstName}`, caseNumber: c.caseNumber, assignedDate: c.dateOpened })),
          missingVoucherClosed: filtered.filter(c => c.status === CaseStatus.CLOSED && c.voucherStatus === VoucherStatus.MISSING).map(c => ({ name: `${c.defendantLastName}, ${c.defendantFirstName}`, caseNumber: c.caseNumber })),
          remainingCases: filtered.filter(c => c.status === CaseStatus.OPEN && !(c.nextCourtDate && c.nextCourtDate <= next7Str)).map(c => ({ name: `${c.defendantLastName}, ${c.defendantFirstName}`, caseNumber: c.caseNumber, activities: c.activities }))
        };
      } else if (reportId === 'aged') {
        reportData = {
          unbilled90: filtered.filter(c => c.voucherStatus === VoucherStatus.MISSING && calculateDaysDiff(c.dateOpened) >= 90).map(c => ({ name: `${c.defendantLastName}, ${c.defendantFirstName}`, ref: c.caseNumber, assigned: c.dateOpened })),
          unbilled60: filtered.filter(c => c.voucherStatus === VoucherStatus.MISSING && calculateDaysDiff(c.dateOpened) >= 60 && calculateDaysDiff(c.dateOpened) < 90).map(c => ({ name: `${c.defendantLastName}, ${c.defendantFirstName}`, ref: c.caseNumber, assigned: c.dateOpened })),
          unbilled30: filtered.filter(c => c.voucherStatus === VoucherStatus.MISSING && calculateDaysDiff(c.dateOpened) >= 30 && calculateDaysDiff(c.dateOpened) < 60).map(c => ({ name: `${c.defendantLastName}, ${c.defendantFirstName}`, ref: c.caseNumber, assigned: c.dateOpened }))
        };
      } else if (reportId === 'aging') {
        reportData = {
          legacyMatters: filtered.filter(c => calculateDaysDiff(c.dateOpened) >= 91).map(c => ({ name: `${c.defendantLastName}`, opened: c.dateOpened, age: calculateDaysDiff(c.dateOpened) })),
          seasonedMatters: filtered.filter(c => calculateDaysDiff(c.dateOpened) >= 31 && calculateDaysDiff(c.dateOpened) <= 90).map(c => ({ name: `${c.defendantLastName}`, opened: c.dateOpened, age: calculateDaysDiff(c.dateOpened) })),
          newMatters: filtered.filter(c => calculateDaysDiff(c.dateOpened) <= 30).map(c => ({ name: `${c.defendantLastName}`, opened: c.dateOpened, age: calculateDaysDiff(c.dateOpened) }))
        };
      } else if (reportId === 'stagnant') {
        reportData = {
          stagnantMatters: filtered.filter(c => {
            const logs = c.activities || [];
            const lastLog = logs.length > 0 ? [...logs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : c.dateOpened;
            return calculateDaysDiff(lastLog) >= 45 && c.status !== CaseStatus.CLOSED;
          }).map(c => ({ name: `${c.defendantLastName}`, lastActivity: (c.activities || []).length > 0 ? [...c.activities].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : 'None' }))
        };
      } else if (reportId === 'pretrial') {
        reportData = {
          upcomingTrials: filtered.filter(c => (c.nextEventDescription || '').toUpperCase().includes('TRIAL') || (c.nextEventDescription || '').toUpperCase().includes('READINESS')).map(c => ({ name: `${c.defendantLastName}`, event: c.nextEventDescription, date: c.nextCourtDate, taskCount: (globalTasks.filter(t => t.caseId === c.id).length) }))
        };
      } else if (reportId === 'intel') {
        reportData = { activeMattersCount: filtered.filter(c => c.status === CaseStatus.OPEN).length, urgentActionCount: filtered.filter(c => c.nextCourtDate && calculateDaysDiff(c.nextCourtDate) >= -7).length, totalSettlement: filtered.filter(c => c.voucherStatus === VoucherStatus.PAID).reduce((s, c) => s + (c.amountPaid || 0), 0) };
      }

      let result = (reportId === 'intel' && !selectedAttorneyFilter) ? await generateGlobalIntelligenceBrief(reportData) : await generateAttorneyReport(reportId, selectedAttorneyFilter, reportData);
      setGeneratedReport(result);
    } catch (e) { alert("Report synthesis failed."); } finally { setIsGeneratingReport(false); }
  };

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + offset);
    setCurrentMonth(next);
  };

  const currentCase = useMemo(() => selectedCaseId ? dbCases.find(c => c.id === selectedCaseId) : null, [selectedCaseId, dbCases]);

  const masterRegistryCases = useMemo(() => {
    let filtered = casesForCurrentUser.filter(c => {
      const search = registrySearch.toLowerCase();
      const nameMatch = `${c.defendantFirstName || ''} ${c.defendantLastName || ''}`.toLowerCase().includes(search);
      if (!nameMatch) return false;
      if (lifecycleFilter === 'Active') return c.status !== CaseStatus.CLOSED;
      if (lifecycleFilter === 'Unscheduled') return c.status !== CaseStatus.CLOSED && !c.nextCourtDate;
      if (lifecycleFilter === 'Archive') return c.status === CaseStatus.CLOSED;
      return true;
    });

    return filtered.sort((a, b) => {
      const needA = !!(a as any).needsIntake;
      const needB = !!(b as any).needsIntake;
      if (needA && !needB) return -1;
      if (!needA && needB) return 1;

      const isPlaceholder = (c: Case) => {
        const l = (c.defendantLastName || '').toUpperCase();
        const f = (c.defendantFirstName || '').trim();
        return l === 'NEW CASE' || (l === '' && f === '');
      };
      const pA = isPlaceholder(a);
      const pB = isPlaceholder(b);
      if (pA && !pB) return 1;
      if (!pA && pB) return -1;
      if (pA && pB) return 0;

      if (caseSort === 'Defendant') {
        const nameA = `${a.defendantLastName || ''} ${a.defendantFirstName || ''}`.toUpperCase();
        const nameB = `${b.defendantLastName || ''} ${b.defendantFirstName || ''}`.toUpperCase();
        return nameA.localeCompare(nameB);
      }
      if (caseSort === 'Court Date') {
        if (!a.nextCourtDate) return 1;
        if (!b.nextCourtDate) return -1;
        return new Date(a.nextCourtDate).getTime() - new Date(b.nextCourtDate).getTime();
      }
      if (caseSort === 'Attorney') return (a.attorneyName || '').localeCompare(b.attorneyName || '');
      if (caseSort === 'Date Opened') return new Date(a.dateOpened || 0).getTime() - new Date(b.dateOpened || 0).getTime();
      return 0;
    });
  }, [casesForCurrentUser, registrySearch, lifecycleFilter, caseSort]);

  const registryCounts = useMemo(() => ({
    Active: casesForCurrentUser.filter(c => c.status !== CaseStatus.CLOSED).length,
    Unscheduled: casesForCurrentUser.filter(c => c.status !== CaseStatus.CLOSED && !c.nextCourtDate).length,
    Archive: casesForCurrentUser.filter(c => c.status === CaseStatus.CLOSED).length,
  }), [casesForCurrentUser]);

  const taskFilterCounts = useMemo(() => ({
    Active: globalTasks.filter(t => !t.completed).length,
    Completed: globalTasks.filter(t => t.completed).length
  }), [globalTasks]);

  // VOUCHER HUB SPECIFIC LOGIC (investigator sees only their cases here too)
  const filteredVoucherCases = useMemo(() => {
    let list = casesForCurrentUser.filter(c => {
      if (voucherView === 'Missing') return c.status === CaseStatus.OPEN && c.voucherStatus === VoucherStatus.MISSING;
      if (voucherView === 'Pre-Audit') return c.status === CaseStatus.CLOSED && [VoucherStatus.MISSING, VoucherStatus.OPEN].includes(c.voucherStatus);
      if (voucherView === 'Submitted') return c.voucherStatus === VoucherStatus.SUBMITTED;
      if (voucherView === 'Paid') return c.voucherStatus === VoucherStatus.PAID;
      if (voucherView === 'Paid Retained Services') return c.voucherStatus === VoucherStatus.PAID && c.isRetainedServices;
      if (voucherView === 'Intend Not to Bill') return c.voucherStatus === VoucherStatus.INTEND_NOT_TO_BILL;
      return true;
    });

    if (voucherView === 'Paid' || voucherView === 'Paid Retained Services') {
      if (voucherAttorneyFilter) list = list.filter(c => c.attorneyName === voucherAttorneyFilter);
      if (voucherTimeframe !== 'All') {
        const now = new Date();
        list = list.filter(c => {
          if (!c.datePaid) return false;
          const paidDate = new Date(c.datePaid);
          const diffDays = (now.getTime() - paidDate.getTime()) / (1000 * 3600 * 24);
          if (voucherTimeframe === 'Weekly') return diffDays <= 7;
          if (voucherTimeframe === 'Monthly') return diffDays <= 30;
          if (voucherTimeframe === 'Quarterly') return diffDays <= 90;
          if (voucherTimeframe === 'Yearly') return diffDays <= 365;
          return true;
        });
      }
    }

    return list.sort((a,b) => (a.defendantLastName || '').localeCompare(b.defendantLastName || ''));
  }, [casesForCurrentUser, voucherView, voucherAttorneyFilter, voucherTimeframe]);

  const voucherRevenueSecured = useMemo(() => {
    return filteredVoucherCases.reduce((s, c) => s + (c.amountPaid || 0), 0);
  }, [filteredVoucherCases]);

  const voucherPipelinePending = useMemo(() => {
    return dbCases
      .filter(c => c.voucherStatus === VoucherStatus.SUBMITTED)
      .reduce((total, c) => {
        const hrs = (c.activities || []).reduce((s, a) => s + (a.hours || 0), 0);
        return total + (hrs * 45);
      }, 0);
  }, [dbCases]);

  // SYSTEM SETTINGS STATE
  const [agencyMeta, setAgencyMeta] = useState({ agency: "BRENT'S INVESTIGATIVE SERVICES", investigator: "Brent", hourlyRate: 45.00 });
  const [isAddingCode, setIsAddingCode] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', label: '', defaultHours: 0.0, defaultNarrative: '' });

  const exportRegistryCSV = () => {
    const headers = ["Defendant", "Case Number", "Attorney", "Opened", "Status", "Total Hours"];
    const rows = masterRegistryCases.map(c => [
      `${c.defendantLastName}, ${c.defendantFirstName}`,
      c.caseNumber,
      c.attorneyName,
      c.dateOpened,
      c.status,
      (c.activities || []).reduce((s,a) => s + a.hours, 0).toFixed(1)
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\\n" + rows.map(r => r.join(",")).join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Registry_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const exportTasksCSV = () => {
    const headers = ["Defendant", "Directive", "Due Date", "Priority", "Completed"];
    const rows = globalTasks.map(t => [
      t.defendantName,
      t.taskDescription,
      t.dueDate,
      t.priority,
      t.completed ? "Yes" : "No"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\\n" + rows.map(r => r.join(",")).join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Task_Feed_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans relative">
      <aside className="w-64 bg-slate-900 text-white flex flex-col h-full fixed top-0 left-0 z-[100] shadow-2xl">
        <div className="p-8 border-b border-slate-800 flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl border border-indigo-400">PRO</div>
          <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-100">Mission Intelligence</h2>
        </div>
        <nav className="flex-1 p-5 space-y-1.5 mt-4">
          {[ 
            { id: 'dashboard', icon: LayoutDashboard, label: 'Mission Control' }, 
            { id: 'intake', icon: Inbox, label: 'Intake Folder' },
            { id: 'commhub', icon: MessageSquare, label: 'Communication Hub' },
            { id: 'cases', icon: FolderOpen, label: 'Case Files' }, 
            { id: 'global_tasks', icon: ListTodo, label: 'Investigative Tasks' },
            { id: 'daily_logs', icon: CalendarRange, label: 'Workload Log' },
            { id: 'reports', icon: FileType, label: 'Report Hub' },
            { id: 'vouchers', icon: Banknote, label: 'Voucher Hub' },
            { id: 'core', icon: Settings, label: 'System Settings' } 
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><t.icon size={16}/> {t.label}</button>
          ))}
        </nav>
        <div className="p-5 border-t border-slate-800 space-y-1.5">
          <button
            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            onClick={() => setShowProfile(true)}
          >
            My Profile
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Lock size={16} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-y-auto bg-slate-50/50 min-h-screen flex flex-col">
        <div className="sticky top-0 z-[50] bg-[#F8FAFC]/95 backdrop-blur-xl border-b p-8 pb-8 shadow-sm">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 leading-none">Intelligence Command</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic flex items-center gap-3">
                Golden State Protocol: Active
                {lastSync && (
                  <span className="flex items-center gap-2 text-indigo-400 normal-case not-italic ml-4 border-l border-slate-200 pl-4">
                    <ShieldCheck size={14} className="animate-pulse"/>
                    LAST SIGNAL SYNC: {lastSync.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchAll} className="flex items-center gap-2 px-6 py-3 bg-white border text-slate-900 rounded-xl font-black text-[10px] uppercase hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''}/> Sync Cloud
              </button>
            </div>
          </header>
          
          <div className="grid grid-cols-4 gap-6">
            <StatCard label="Active Matters" value={dashboardAnalytics.activeCount} icon={Briefcase} color="indigo" subValue="Open Cases" onClick={() => { setActiveTab('cases'); setRegistrySearch(''); setLifecycleFilter('Active'); }} />
            <StatCard label="Critical Phase" value={dashboardAnalytics.urgentTrials.length} icon={Flame} color="orange" subValue="Next 30 Days" onClick={() => { setActiveTab('cases'); setRegistrySearch(''); setLifecycleFilter('Active'); }} />
            <StatCard label="Cold Starts" value={dashboardAnalytics.coldStarts.length} icon={ShieldAlert} color="rose" subValue="14+ Days NEW" onClick={() => { setActiveTab('cases'); setRegistrySearch(''); setLifecycleFilter('Active'); }} />
            <StatCard label="Stagnant Risk" value={dashboardAnalytics.stagnantRisk.length} icon={AlertTriangle} color="amber" subValue="45+ Day Idle" onClick={() => { setActiveTab('cases'); setRegistrySearch(''); setLifecycleFilter('Active'); }} />
          </div>
        </div>

        <div className="p-10 flex-1 pt-6">
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in space-y-10 max-w-[1700px] mx-auto pb-20">
              
              <div className="space-y-6">
                {/* Financial Summary - Thinner Boxes */}
                <div className="grid grid-cols-2 gap-8">
                  <div 
                    onClick={() => { setActiveTab('vouchers'); setVoucherView('Paid'); }}
                    className="p-4 px-6 rounded-[28px] border border-emerald-200 bg-white flex items-center gap-6 shadow-sm cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all active:scale-95 group"
                  >
                    <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg group-hover:scale-105 transition-transform"><Wallet size={20}/></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Revenue Secured</p>
                      <p className="text-2xl font-black text-slate-900 mt-0.5">${dashboardAnalytics.totalSettlement.toLocaleString()}</p>
                      {dashboardAnalytics.retainedServicesRevenue > 0 && (
                        <p className="text-[9px] font-bold text-slate-500 mt-1">of which Retained Services: ${dashboardAnalytics.retainedServicesRevenue.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div 
                    onClick={() => { setActiveTab('vouchers'); setVoucherView('Submitted'); }}
                    className="p-4 px-6 rounded-[28px] border border-indigo-100 bg-white flex items-center gap-6 shadow-sm cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all active:scale-95 group"
                  >
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg group-hover:scale-105 transition-transform"><Hourglass size={20}/></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Pipeline (Pending)</p>
                      <p className="text-2xl font-black text-slate-900 mt-0.5">${dashboardAnalytics.pendingRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Voucher Lifecycle Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                  {[
                    { label: 'Missing', count: dashboardAnalytics.counts.Missing, color: 'rose', icon: FileWarning, view: 'Missing' as VoucherSegment },
                    { label: 'Pre-Audit', count: dashboardAnalytics.counts['Pre-Audit'], color: 'amber', icon: ClipboardCheck, view: 'Pre-Audit' as VoucherSegment },
                    { label: 'Submitted', count: dashboardAnalytics.counts.Submitted, color: 'blue', icon: SendHorizontal, view: 'Submitted' as VoucherSegment },
                    { label: 'Settled', count: dashboardAnalytics.counts.Paid, color: 'emerald', icon: BadgeCheck, view: 'Paid' as VoucherSegment },
                    { label: 'Paid Retained', count: dashboardAnalytics.counts['Paid Retained Services'], color: 'violet', icon: BadgeCheck, view: 'Paid Retained Services' as VoucherSegment }
                  ].map((v) => {
                    const colorMap = {
                      rose: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', hover: 'hover:border-rose-400' },
                      amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', hover: 'hover:border-amber-400' },
                      blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', hover: 'hover:border-blue-400' },
                      emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', hover: 'hover:border-emerald-400' },
                      violet: { text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', hover: 'hover:border-violet-400' }
                    };
                    const c = colorMap[v.color as keyof typeof colorMap];
                    return (
                      <button 
                        key={v.label}
                        onClick={() => { setActiveTab('vouchers'); setVoucherView(v.view); }}
                        className={`p-5 bg-white border ${c.border} ${c.hover} rounded-[28px] shadow-sm transition-all group flex items-center justify-between active:scale-95`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 ${c.bg} ${c.text} rounded-xl group-hover:scale-110 transition-transform`}><v.icon size={18}/></div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-slate-900 transition-colors">{v.label}</span>
                        </div>
                        <span className={`text-xl font-black ${c.text}`}>{v.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 h-[calc(100vh-520px)]">
                
                {/* COLUMN 1: RISK INDICATORS */}
                <div className="space-y-6 flex flex-col min-h-0">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] px-2 flex items-center gap-3 shrink-0"><ShieldAlert size={16} className="text-rose-600"/> Risk Indicators</h3>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-10">
                    
                    {/* 1. Capacity Warning (compact) — display only; link to Workload Log date was unreliable in this scroll area */}
                    {dashboardAnalytics.highDutyDays.length > 0 && dashboardAnalytics.highDutyDays.map(d => (
                      <div
                        key={d.date}
                        className="p-3 bg-rose-600 text-white rounded-xl flex items-center justify-between shadow-md border border-white/20 animate-pulse shrink-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest leading-none">Capacity Warning</span>
                          <span className="text-[6px] font-bold text-white/70 uppercase mt-0.5">Global Duty Exceeds 12h Protocol</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-base font-black leading-none">{d.total.toFixed(1)} <span className="text-[7px]">H</span></span>
                          <span className="text-[7px] font-bold uppercase mt-0.5">{displayDate(d.date)}</span>
                        </div>
                      </div>
                    ))}

                    {/* 2. Evidence Alert (COLLAPSIBLE) */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => toggleAlert('evidence')}
                        className="w-full flex items-center justify-between group px-2 py-1 border-b border-orange-100 hover:bg-orange-50 transition-all"
                      >
                        <p className="text-[12px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                          Evidence Alert <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-[14px] font-black">[{dashboardAnalytics.evidenceAlerts.length}]</span>
                        </p>
                        <ChevronDown size={14} className={`text-orange-400 transition-transform duration-300 ${collapsedAlerts.evidence ? '-rotate-90' : ''}`} />
                      </button>
                      {!collapsedAlerts.evidence && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                          {dashboardAnalytics.evidenceAlerts.length === 0 ? (
                            <p className="text-[8px] italic text-slate-400 px-4">No active evidence alerts.</p>
                          ) : dashboardAnalytics.evidenceAlerts.map(e => (
                            <div key={e.id} onClick={() => setSelectedCaseId(e.caseId)} className="p-5 bg-white border border-orange-100 rounded-[32px] flex items-center justify-between group cursor-pointer hover:border-orange-400 transition-all shadow-sm shrink-0">
                              <div className="flex flex-col min-w-0 pr-4">
                                <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-none mb-1">{e.defendantName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Atty: {e.attorneyName || 'N/A'}</p>
                              </div>
                              <div className="flex flex-col items-end shrink-0 text-right text-orange-600">
                                <span className="text-[11px] font-black leading-none">{displayDate(e.dateRequested)}</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400 mt-1 leading-none">Requested</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Overdue Court Days (COLLAPSIBLE) */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => toggleAlert('overdue')}
                        className="w-full flex items-center justify-between group px-2 py-1 border-b border-blue-100 hover:bg-blue-50 transition-all"
                      >
                        <p className="text-[9px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                          Overdue Court Days <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[7px]">[{dashboardAnalytics.overdueCourts.length}]</span>
                        </p>
                        <ChevronDown size={14} className={`text-blue-400 transition-transform duration-300 ${collapsedAlerts.overdue ? '-rotate-90' : ''}`} />
                      </button>
                      {!collapsedAlerts.overdue && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                          {dashboardAnalytics.overdueCourts.length === 0 ? (
                            <p className="text-[8px] italic text-slate-400 px-4">No overdue court dates.</p>
                          ) : dashboardAnalytics.overdueCourts.map(c => (
                            <div key={c.id} onClick={() => setSelectedCaseId(c.id)} className="p-5 bg-blue-50/50 border border-blue-100 rounded-[32px] flex items-center justify-between group cursor-pointer hover:border-blue-900 transition-all shadow-sm shrink-0">
                              <div className="flex flex-col min-w-0 pr-4">
                                <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-none mb-1">{c.defendantLastName}, {c.defendantFirstName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Atty: {c.attorneyName}</p>
                              </div>
                              <div className="flex flex-col items-end shrink-0 text-right text-blue-900">
                                <span className="text-[11px] font-black leading-none">{displayDate(c.nextCourtDate)}</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400 mt-1 leading-none">Was Due</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4. Urgent Pre-Trial Alerts (COLLAPSIBLE) */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => toggleAlert('urgent')}
                        className="w-full flex items-center justify-between group px-2 py-1 border-b border-indigo-100 hover:bg-indigo-50 transition-all"
                      >
                        <p className="text-[12px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                          Urgent Pre-Trial <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-[14px] font-black">[{dashboardAnalytics.urgentTrials.length}]</span>
                        </p>
                        <ChevronDown size={14} className={`text-indigo-400 transition-transform duration-300 ${collapsedAlerts.urgent ? '-rotate-90' : ''}`} />
                      </button>
                      {!collapsedAlerts.urgent && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                          {dashboardAnalytics.urgentTrials.length === 0 ? (
                            <p className="text-[8px] italic text-slate-400 px-4">No urgent pre-trial alerts.</p>
                          ) : dashboardAnalytics.urgentTrials.map(c => (
                            <div key={c.id} onClick={() => setSelectedCaseId(c.id)} className="p-5 bg-white border border-slate-100 rounded-[32px] flex items-center justify-between group cursor-pointer hover:border-indigo-600 transition-all shadow-sm shrink-0">
                              <div className="flex flex-col min-w-0 pr-4">
                                <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-none mb-1">{c.defendantLastName}, {c.defendantFirstName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Atty: {c.attorneyName}</p>
                              </div>
                              <div className="flex flex-col items-end shrink-0 text-right text-indigo-600">
                                <span className="text-[11px] font-black leading-none">{displayDate(c.nextCourtDate)}</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400 mt-1 leading-none">{c.nextEventDescription || 'Phase TBD'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 5. Cold Start Registry (ABOVE STAGNANT, COLLAPSIBLE) */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => toggleAlert('cold')}
                        className="w-full flex items-center justify-between group px-2 py-1 border-b border-indigo-50 hover:bg-indigo-50/50 transition-all"
                      >
                        <p className="text-[12px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                          Cold Start Registry <span className="bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full text-[14px] font-black">[{dashboardAnalytics.coldStarts.length}]</span>
                        </p>
                        <ChevronDown size={14} className={`text-indigo-400 transition-transform duration-300 ${collapsedAlerts.cold ? '-rotate-90' : ''}`} />
                      </button>
                      {!collapsedAlerts.cold && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                          {dashboardAnalytics.coldStarts.length === 0 ? (
                            <p className="text-[8px] italic text-slate-400 px-4">No cold starts detected.</p>
                          ) : dashboardAnalytics.coldStarts.map(c => (
                            <div key={c.id} onClick={() => setSelectedCaseId(c.id)} className="p-5 bg-indigo-50/30 border border-indigo-100 rounded-[32px] flex items-center justify-between group cursor-pointer hover:border-indigo-400 transition-all shadow-sm shrink-0">
                              <div className="flex flex-col min-w-0 pr-4">
                                <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-none mb-1">{c.defendantLastName}, {c.defendantFirstName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Atty: {c.attorneyName}</p>
                              </div>
                              <div className="flex flex-col items-end shrink-0 text-right text-indigo-400">
                                <span className="text-[11px] font-black leading-none">{c.daysSinceNew} Days</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400 mt-1 leading-none">since NEW</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 6. Stagnant Cases (COLLAPSIBLE) */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => toggleAlert('stagnant')}
                        className="w-full flex items-center justify-between group px-2 py-1 border-b border-amber-100 hover:bg-amber-50 transition-all"
                      >
                        <p className="text-[12px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                          Stagnant Cases <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[14px] font-black">[{dashboardAnalytics.stagnantRisk.length}]</span>
                        </p>
                        <ChevronDown size={14} className={`text-amber-400 transition-transform duration-300 ${collapsedAlerts.stagnant ? '-rotate-90' : ''}`} />
                      </button>
                      {!collapsedAlerts.stagnant && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                          {dashboardAnalytics.stagnantRisk.length === 0 ? (
                            <p className="text-[8px] italic text-slate-400 px-4">No stagnant cases.</p>
                          ) : dashboardAnalytics.stagnantRisk.map(c => (
                            <div key={c.id} onClick={() => setSelectedCaseId(c.id)} className="p-5 bg-white border border-slate-100 rounded-[32px] flex items-center justify-between group cursor-pointer hover:border-amber-500 transition-all shadow-sm shrink-0">
                              <div className="flex flex-col min-w-0 pr-4">
                                <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-none mb-1">{c.defendantLastName}, {c.defendantFirstName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Atty: {c.attorneyName}</p>
                              </div>
                              <div className="flex flex-col items-end shrink-0 text-right text-amber-600">
                                <span className="text-[11px] font-black leading-none">{c.stagnantDays} Days</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400 mt-1 leading-none">Idle Time</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: TACTICAL FEED */}
                <div className="space-y-6 flex flex-col min-h-0">
                   <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] px-2 flex items-center gap-3 shrink-0"><ListTodo size={16} className="text-indigo-600"/> Tactical Feed</h3>
                   <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-10">
                     {sortedGlobalTasks.filter(t => !t.completed).map(t => (
                       <div key={t.id} className={`p-6 bg-white border rounded-[32px] shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer group ${(t as any).needsIntake ? 'border-l-4 border-l-amber-400 border border-slate-100' : 'border border-slate-100'}`} onClick={() => setSelectedCaseId(t.caseId)}>
                         <div className="flex-1 min-w-0 pr-4">
                           <div className="flex items-center gap-2 flex-wrap mb-1">
                             <p className="text-[11px] font-black text-slate-900 uppercase leading-tight truncate">{t.defendantName}</p>
                             {(t as any).needsIntake && (
                               <>
                                 <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[7px] font-black uppercase shrink-0">Complete intake</span>
                                 <button onClick={(e) => { e.stopPropagation(); persistTask({ ...t, needsIntake: false }); }} className="px-1.5 py-0.5 bg-amber-600 text-white rounded text-[6px] font-black uppercase hover:bg-amber-700 transition-all shrink-0">Done</button>
                               </>
                             )}
                           </div>
                           <p className="text-[10px] font-bold text-slate-500 leading-snug break-words line-clamp-2">
                             {t.taskDescription}
                           </p>
                         </div>
                         <div className="flex flex-col items-end shrink-0 text-right gap-1">
                           <span className={`text-[9px] font-black uppercase tracking-widest ${t.dueDate < todayStr ? 'text-blue-950' : 'text-indigo-600'}`}>{displayDate(t.dueDate)}</span>
                           <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border ${t.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                             {t.priority}
                           </span>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                {/* COLUMN 3: ACTIVITY FEED */}
                <div className="space-y-6 flex flex-col min-h-0">
                   <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] px-2 flex items-center gap-3 shrink-0"><ActivityIcon size={16} className="text-emerald-600"/> Activity Feed</h3>
                   <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-10">
                     {dashboardAnalytics.sortedActivities.map(a => (
                       <div key={a.id} className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm flex items-center justify-between hover:border-emerald-200 transition-all cursor-pointer group" onClick={() => setSelectedCaseId(a.caseId)}>
                         <div className="flex items-center gap-4 min-w-0">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[7px] font-black uppercase tracking-widest shrink-0">{a.code}</span>
                            <div className="border-l-2 border-slate-50 pl-4 min-w-0 flex flex-col">
                               <p className="text-[10px] font-black text-slate-900 uppercase leading-none mb-1.5 truncate">{a.defendantName}</p>
                               <p className="text-[7px] font-bold text-slate-400 italic leading-snug truncate">"{a.description}"</p>
                            </div>
                         </div>
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-full group-hover:bg-emerald-50 transition-all shrink-0">{displayDate(a.date)}</span>
                       </div>
                     ))}
                   </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'global_tasks' && (
            <div className="animate-in fade-in max-w-[1200px] mx-auto space-y-8 pb-20">
              <header className="flex justify-between items-center bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-4">
                    <ListTodo size={32} className="text-indigo-600"/> Investigative Tasks
                  </h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest italic">Mission Critical Directives</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                      {['Active', 'Completed'].map(f => (
                        <button key={f} onClick={() => setTaskFilter(f as any)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${taskFilter === f ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
                          {f} <span className={`px-2 py-0.5 rounded-md text-[8px] ${taskFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{taskFilterCounts[f as keyof typeof taskFilterCounts]}</span>
                        </button>
                      ))}
                   </div>
                   <button onClick={() => { setIsAddingTask(true); setEditingTaskId(null); setCaseSearchQuery(''); setNewTask({ defendantName: '', attorneyName: '', taskDescription: '', dueDate: todayStr, priority: 'Medium', caseId: '', caseNumber: '' }); }} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95 flex items-center gap-3">
                     <Plus size={20}/> New Task
                   </button>
                </div>
              </header>

              {(isAddingTask || editingTaskId) && (
                <div className="bg-white border-4 border-indigo-600/20 rounded-[48px] p-12 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                      {editingTaskId ? 'Revise Task' : 'New Strategic Task'}
                    </h2>
                    <button onClick={() => { setIsAddingTask(false); setEditingTaskId(null); setCaseSearchQuery(''); }} className="p-3 hover:bg-slate-100 rounded-xl transition-all"><X size={24}/></button>
                  </div>
                  <div className="grid grid-cols-12 gap-8 items-end">
                    <div className="col-span-4 space-y-2 relative">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last name (search)</p>
                      <input value={caseSearchQuery} onChange={e => setCaseSearchQuery(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Type last name to find case..."/>
                      {caseSearchMatches.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto">
                          {caseSearchMatches.map(c => (
                            <button key={c.id} type="button" onClick={() => {
                              setNewTask(prev => ({ ...prev, defendantName: `${c.defendantLastName || ''}, ${c.defendantFirstName || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || c.defendantLastName || 'Unknown', attorneyName: c.attorneyName || '', caseNumber: c.caseNumber || '', caseId: c.id }));
                              setCaseSearchQuery('');
                            }} className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-xl text-[11px] font-bold border-b border-slate-50 last:border-0">
                              {c.defendantLastName}, {c.defendantFirstName} — REF: {c.caseNumber}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-4 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Defendant</p>
                      <input value={newTask.defendantName} onChange={e => setNewTask({...newTask, defendantName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Auto-filled or enter name..."/>
                    </div>
                    <div className="col-span-4 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case number</p>
                      <input value={newTask.caseNumber} onChange={e => setNewTask({...newTask, caseNumber: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Auto-filled or enter..."/>
                    </div>
                    <div className="col-span-12 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attorney</p>
                      <input value={newTask.attorneyName} onChange={e => setNewTask({...newTask, attorneyName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Auto-filled or enter attorney name..."/>
                    </div>
                    <div className="col-span-12 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Directive</p>
                      <input value={newTask.taskDescription} onChange={e => setNewTask({...newTask, taskDescription: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Describe directive..."/>
                    </div>
                    <div className="col-span-3 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadline</p>
                      <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-600 transition-all"/>
                    </div>
                    <div className="col-span-3 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</p>
                      <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-indigo-600 transition-all">
                        {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="col-span-6 flex gap-3">
                       <button onClick={async () => {
                         if (!newTask.defendantName || !newTask.taskDescription) return;
                         const existing = editingTaskId ? globalTasks.find(x => x.id === editingTaskId) : null;
                         const task = {
                           id: editingTaskId || crypto.randomUUID(),
                           taskDate: existing?.taskDate || todayStr,
                           defendantName: newTask.defendantName,
                           attorneyName: newTask.attorneyName || '',
                           caseNumber: newTask.caseNumber || '',
                           taskDescription: newTask.taskDescription,
                           dueDate: newTask.dueDate,
                           priority: newTask.priority,
                           completed: existing?.completed ?? false,
                           caseId: newTask.caseId,
                           needsIntake: newTask.needsIntake ?? (existing as any)?.needsIntake
                         };
                         await persistTask(task);
                         setIsAddingTask(false);
                         setEditingTaskId(null);
                         setCaseSearchQuery('');
                         setNewTask({ defendantName: '', attorneyName: '', taskDescription: '', dueDate: todayStr, priority: 'Medium', caseId: '', caseNumber: '' });
                       }} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3">
                         {editingTaskId ? 'Commit' : 'Initialize'}
                       </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {sortedGlobalTasks
                  .filter(t => taskFilter === 'Active' ? !t.completed : t.completed)
                  .map(t => (
                  <div key={t.id} className={`p-8 bg-white border rounded-[48px] shadow-sm flex items-center justify-between group transition-all cursor-pointer hover:border-indigo-200 ${(t as any).needsIntake ? 'border-l-4 border-l-amber-400 border border-slate-100' : 'border border-slate-100'}`} onClick={() => t.caseId && setSelectedCaseId(t.caseId)}>
                    <div className="flex items-center gap-10 flex-1">
                      <button onClick={(e) => { e.stopPropagation(); persistTask({...t, completed: !t.completed}); }} className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-all border-4 ${t.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-100 hover:border-indigo-600 text-transparent'}`}>
                        <Check size={24}/>
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-[15px] font-black uppercase tracking-tight ${t.completed ? 'text-slate-300' : 'text-slate-900'}`}>{t.defendantName}</p>
                          {(t as any).needsIntake && !t.completed && (
                            <>
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9px] font-black uppercase tracking-widest shrink-0">Complete intake</span>
                              <button onClick={(e) => { e.stopPropagation(); persistTask({ ...t, needsIntake: false }); }} className="px-2 py-1 bg-amber-600 text-white rounded text-[8px] font-black uppercase tracking-wider hover:bg-amber-700 transition-all shrink-0">Mark intake done</button>
                            </>
                          )}
                        </div>
                        {t.attorneyName ? <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${t.completed ? 'text-slate-300' : 'text-slate-400'}`}>Atty: {t.attorneyName}</p> : null}
                        <p className={`text-[12px] font-medium leading-relaxed mt-1 ${t.completed ? 'text-slate-200' : 'text-slate-500'}`}>{t.taskDescription}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-10">
                       <div className="text-right flex flex-col items-end">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                         <div className="flex flex-col items-end">
                           <p className={`text-[12px] font-bold ${!t.completed && t.dueDate < todayStr ? 'text-rose-500' : 'text-slate-700'}`}>{displayDate(t.dueDate)}</p>
                           {!t.completed && t.dueDate < todayStr && (
                             <span className="text-[9px] font-black text-blue-950 uppercase tracking-tight mt-0.5">OVERDUE</span>
                           )}
                         </div>
                       </div>
                       <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${t.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500'}`}>{t.priority}</span>
                       <button onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.id); setCaseSearchQuery(''); setNewTask({ defendantName: t.defendantName, attorneyName: t.attorneyName || '', taskDescription: t.taskDescription, dueDate: t.dueDate, priority: t.priority, caseId: t.caseId, caseNumber: t.caseNumber || '', needsIntake: (t as any).needsIntake }); }} className="p-3 text-slate-300 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"><Pencil size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'intake' && (
            <div className="animate-in fade-in max-w-5xl mx-auto space-y-10 pb-20">
              <header className="flex justify-between items-center"><h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-4"><Inbox size={32} className="text-indigo-600"/> Intake Folder</h1></header>
              <div className="bg-white rounded-[48px] border-4 border-dashed border-slate-100 shadow-2xl p-16 space-y-10 text-center">
                <div className="flex flex-col items-center gap-6"><div className="w-24 h-24 bg-indigo-600 rounded-[32px] flex items-center justify-center text-white shadow-xl animate-pulse"><Sparkles size={40}/></div><div><h2 className="text-2xl font-black uppercase tracking-tight">AI Intake Dropzone</h2><p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Paste assignment email or raw case text</p></div></div>
                <textarea value={intakeText} onChange={(e) => setIntakeText(e.target.value)} className="w-full h-96 p-10 bg-slate-50 border border-slate-200 rounded-[40px] outline-none focus:border-indigo-600 focus:bg-white transition-all font-medium text-sm leading-relaxed shadow-inner" placeholder="Drop investigation request text here..."/>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">No cases yet? <button type="button" onClick={seedSampleCases} disabled={isProcessing} className="text-indigo-600 font-black hover:underline disabled:opacity-50">Add 4 sample cases for testing</button></p>
                <button onClick={handleIntake} disabled={isIntaking || !intakeText} className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-50">
                  {isIntaking ? <Loader2 size={24} className="animate-spin"/> : <Cpu size={24}/>} Initialize Intel Logic
                </button>
              </div>
            </div>
          )}

          {activeTab === 'commhub' && (
            <div className="animate-in fade-in max-w-5xl mx-auto space-y-10 pb-20">
              <header className="flex justify-between items-center">
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-4">
                  <MailCheck size={32} className="text-indigo-600"/> Communication Hub
                </h1>
              </header>
              <div className="bg-white rounded-[48px] border-4 border-dashed border-slate-100 shadow-2xl p-16 space-y-8">
                <p className="text-sm font-medium text-slate-500">Paste email content below. AI will suggest an existing case or new case, then you can accept to create a case + IN activity or add activity + task to an existing case.</p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Subject</label>
                    <input value={commHubSubject} onChange={(e) => setCommHubSubject(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-medium text-sm" placeholder="Email subject"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Sender (name or email)</label>
                    <input value={commHubSender} onChange={(e) => setCommHubSender(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-medium text-sm" placeholder="e.g. Paul Green or paul.green@email.com"/>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Date</label>
                  <input type="date" value={commHubDate} onChange={(e) => setCommHubDate(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-medium text-sm"/>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Body (required)</label>
                  <textarea value={commHubBody} onChange={(e) => setCommHubBody(e.target.value)} rows={10} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-medium text-sm leading-relaxed" placeholder="Paste email body..."/>
                </div>
                <div className="flex flex-wrap gap-4">
                  <button onClick={handleCommHubAnalyze} disabled={commHubLoading || !commHubBody.trim()} className="py-4 px-8 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all disabled:opacity-50">
                    {commHubLoading ? <Loader2 size={20} className="animate-spin"/> : <MailSearchIcon size={20}/>} Analyze & suggest
                  </button>
                  <button onClick={handleCommHubAccept} disabled={commHubAccepting || !commHubBody.trim()} className="py-4 px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50">
                    {commHubAccepting ? <Loader2 size={20} className="animate-spin"/> : <Check size={20}/>} Accept & apply
                  </button>
                </div>
                {commHubSuggestion && (
                  <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[32px] space-y-4">
                    <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">Suggestion</h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Apply to:</label>
                      <select value={commHubSelectedCaseId ?? '__new__'} onChange={(e) => setCommHubSelectedCaseId(e.target.value === '__new__' ? null : e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl font-medium text-sm min-w-[220px]">
                        <option value="__new__">New case</option>
                        {dbCases.map(c => (
                          <option key={c.id} value={c.id}>{c.defendantLastName}, {c.defendantFirstName} — {c.caseNumber || 'No REF'}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs font-medium text-slate-600"><span className="font-black text-slate-800">Reasoning:</span> {dbCases.reduce((text, c) => text.split(c.id).join(`${c.defendantLastName}, ${c.defendantFirstName} — ${c.caseNumber || 'No REF'}`), commHubSuggestion.reasoning)}</p>
                    <p className="text-[10px] font-black uppercase text-slate-500">Confidence: {Math.round(commHubSuggestion.confidence * 100)}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'daily_logs' && (
            <div className="animate-in fade-in max-w-[1600px] mx-auto space-y-8 pb-20 flex gap-10 h-[calc(100vh-250px)]">
               <div className="flex-1 bg-white border rounded-[48px] shadow-sm p-10 flex flex-col min-w-0">
                  <header className="flex justify-between items-center mb-10 shrink-0">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4"><Gauge size={32} className="text-indigo-600"/> Neural Heatmap</h3>
                    <div className="flex items-center gap-6 bg-slate-100 p-2 rounded-2xl">
                      <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronLeft size={20}/></button>
                      <span className="text-[11px] font-black uppercase px-6 min-w-[160px] text-center tracking-widest">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => changeMonth(1)} className="p-3 hover:bg-white rounded-xl transition-all shadow-sm"><ChevronRight size={20}/></button>
                    </div>
                  </header>
                  <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[32px] overflow-y-auto custom-scrollbar flex-1 shadow-inner">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="bg-slate-50 p-6 text-center text-[10px] font-black text-slate-400 uppercase border-b sticky top-0 z-20">{d}</div>)}
                    {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => <div key={`empty-${i}`} className="bg-white/30 min-h-[160px]"/>)}
                    {daysInMonth.map((dateObj) => {
                      const dStr = dateObj.toLocaleDateString('en-CA');
                      const load = workloadByDate[dStr]?.total || 0;
                      const isToday = dStr === todayStr;
                      const isOverCapacity = load > 12;

                      return (
                        <div key={dStr} onClick={() => setSelectedHeatmapDate(dStr)} className={`bg-white min-h-[160px] p-4 border border-slate-50 transition-all cursor-pointer relative group ${selectedHeatmapDate === dStr ? 'ring-4 ring-indigo-600 ring-inset z-10' : 'hover:bg-slate-50'}`}>
                           <span className={`text-sm font-black ${isToday ? 'text-indigo-600 underline decoration-2' : 'text-slate-400'}`}>{dateObj.getDate()}</span>
                           {load > 0 && (
                             <div className={`mt-2 p-2 rounded-xl text-center shadow-sm ${isOverCapacity ? 'bg-rose-600 text-white' : load > 6 ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                               <p className="text-[9px] font-black tracking-widest whitespace-nowrap">{load.toFixed(1)} HRS</p>
                             </div>
                           )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Heatmap Legend */}
                  <div className="mt-8 flex items-center justify-center gap-10 shrink-0 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-indigo-50 border border-indigo-200 rounded-md shadow-sm"/><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Normal Range</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-indigo-600 rounded-md shadow-sm"/><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">High Duty (6h+)</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-rose-600 rounded-md shadow-sm"/><span className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Over Capacity (12h+)</span></div>
                  </div>
               </div>
               <div className="w-[380px] bg-white/40 backdrop-blur-md rounded-[48px] border border-slate-100 flex flex-col shrink-0 overflow-hidden">
                  <header className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
                    <div className="min-w-0">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest truncate">Breakdown</h3>
                    </div>
                    <div className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm shrink-0">
                      {(workloadByDate[selectedHeatmapDate || '']?.total || 0).toFixed(1)} <span className="text-[8px] uppercase">H</span>
                    </div>
                  </header>
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
                    {(workloadByDate[selectedHeatmapDate || '']?.activities || []).map(a => (
                      <div key={a.id} onClick={() => setSelectedCaseId(a.caseId)} className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group cursor-pointer">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">{a.defendantName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[7px] font-black uppercase tracking-widest shrink-0">{a.code}</span>
                              <span className="text-[10px] font-black text-slate-400 tracking-tighter">[{a.hours.toFixed(1)}H]</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic line-clamp-4">"{a.description}"</p>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'vouchers' && (
            <div className="animate-in fade-in max-w-[1600px] mx-auto space-y-10 pb-20">
              <header className="flex flex-col gap-8 bg-white border rounded-[48px] p-12 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-emerald-600 text-white rounded-3xl shadow-xl">
                      <Banknote size={32}/>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tight">Voucher Hub</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-1">Financial Operations Control</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[32px] flex items-center gap-6 shadow-sm">
                      <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg"><Wallet size={20}/></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Revenue Secured</p>
                        <p className="text-2xl font-black text-slate-900">${voucherRevenueSecured.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[32px] flex items-center gap-6 shadow-sm">
                      <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Hourglass size={20}/></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Pipeline (Pending)</p>
                        <p className="text-2xl font-black text-slate-900">${voucherPipelinePending.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-[28px] shadow-inner overflow-x-auto no-scrollbar">
                  {[
                    { id: 'Missing', label: 'Missing', count: dashboardAnalytics.counts.Missing },
                    { id: 'Pre-Audit', label: 'Pre-Audit', count: dashboardAnalytics.counts['Pre-Audit'] },
                    { id: 'Submitted', label: 'Submitted', count: dashboardAnalytics.counts.Submitted },
                    { id: 'Paid', label: 'Paid', count: dashboardAnalytics.counts.Paid },
                    { id: 'Paid Retained Services', label: 'Paid Retained', count: dashboardAnalytics.counts['Paid Retained Services'] },
                    { id: 'Intend Not to Bill', label: 'Non-Billable', count: dashboardAnalytics.counts.IntendNotToBill }
                  ].map(v => (
                    <button 
                      key={v.id} 
                      onClick={() => setVoucherView(v.id as VoucherSegment)} 
                      className={`px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-3 ${voucherView === v.id ? 'bg-white text-indigo-600 shadow-md ring-1 ring-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {v.label}
                      <span className={`px-2 py-0.5 rounded-full text-[8px] ${voucherView === v.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {v.count}
                      </span>
                    </button>
                  ))}
                </div>

                {(voucherView === 'Paid' || voucherView === 'Paid Retained Services') && (
                  <div className="flex items-center justify-between px-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2 group hover:border-indigo-600 transition-all">
                        <User size={16} className="text-slate-400 group-hover:text-indigo-600"/>
                        <select 
                          value={voucherAttorneyFilter || ''} 
                          onChange={(e) => setVoucherAttorneyFilter(e.target.value || null)}
                          className="bg-transparent border-none text-[9px] font-black uppercase text-slate-600 outline-none pr-4 cursor-pointer"
                        >
                          <option value="">All Counsel</option>
                          {uniqueAttorneys.map(atty => <option key={atty} value={atty}>{atty}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2 group hover:border-indigo-600 transition-all">
                        <CalendarDays size={16} className="text-slate-400 group-hover:text-indigo-600"/>
                        <select 
                          value={voucherTimeframe} 
                          onChange={(e) => setVoucherTimeframe(e.target.value as TimeframeOption)}
                          className="bg-transparent border-none text-[9px] font-black uppercase text-slate-600 outline-none pr-4 cursor-pointer"
                        >
                          {['Weekly', 'Monthly', 'Quarterly', 'Yearly', 'All'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      {filteredVoucherCases.length} Matched Archives
                    </p>
                  </div>
                )}
              </header>

              <div className="bg-white border rounded-[64px] overflow-hidden shadow-2xl transition-all">
                <table className="w-full text-left table-fixed border-separate border-spacing-0">
                  <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-12 py-8 w-2/5 border-r border-white/5">Defendant / Case Number</th>
                      <th className="px-12 py-8 w-1/4 border-r border-white/5">Lead Attorney</th>
                      <th className="px-12 py-8 w-1/5 border-r border-white/5 text-center">
                        {(voucherView === 'Paid' || voucherView === 'Paid Retained Services') ? 'Amount Paid' : 'Voucher Status'}
                      </th>
                      <th className="px-12 py-8 w-1/6 text-center">Audit Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[12px] text-slate-700">
                    {filteredVoucherCases.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-12 py-24 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30">
                            <FileX size={64} strokeWidth={1}/>
                            <p className="text-lg font-black uppercase tracking-[0.2em] text-slate-400">Zero Entries Found</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredVoucherCases.map(c => {
                      const caseHrs = (c.activities || []).reduce((s, a) => s + (a.hours || 0), 0);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-all cursor-pointer group" onClick={() => setSelectedCaseId(c.id)}>
                          <td className="px-12 py-8">
                            <div className="flex flex-col">
                              <span className="font-black uppercase text-slate-900 text-sm tracking-tight">{c.defendantLastName}, {c.defendantFirstName}</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {c.caseNumber || 'REF-TBD'}
                              </span>
                            </div>
                          </td>
                          <td className="px-12 py-8">
                            <span className="px-4 py-1.5 bg-slate-100 rounded-xl text-[9px] font-black uppercase text-slate-500 group-hover:bg-white inline-block">
                              {c.attorneyName || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-12 py-8 text-center">
                            {(voucherView === 'Paid' || voucherView === 'Paid Retained Services') ? (
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-black text-emerald-600">${(c.amountPaid || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">Settled: {displayDate(c.datePaid)}</span>
                              </div>
                            ) : (
                              <VoucherBadge status={c.voucherStatus}/>
                            )}
                          </td>
                          <td className="px-12 py-8 text-center">
                            <div className="inline-flex items-center gap-3">
                              <span className="text-xs font-black text-slate-900">{caseHrs.toFixed(1)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">H</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="animate-in fade-in max-w-[1600px] mx-auto space-y-12 pb-20">
              <header className="flex justify-between items-center bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm">
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-5">
                    <FileType size={40} className="text-indigo-600"/> Report Hub
                  </h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-1">Operational Intelligence Protocols</p>
                </div>
              </header>

              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-4 space-y-8">
                  <div className="bg-white border rounded-[32px] p-8 shadow-sm space-y-6">
                    <p className="text-[11px] font-black uppercase text-indigo-600 tracking-widest">Step 1: Select Intelligence Context</p>
                    <select 
                      value={selectedAttorneyFilter || ''} 
                      onChange={(e) => setSelectedAttorneyFilter(e.target.value || null)}
                      className="w-full p-4 bg-slate-50 border rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                    >
                      <option value="">GLOBAL (ALL ATTORNEYS)</option>
                      {uniqueAttorneys.map(atty => (
                        <option key={atty} value={atty}>{atty.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[11px] font-black uppercase text-indigo-600 tracking-widest px-4">Step 2: Choose Strategy Protocol</p>
                    <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {[
                        { id: 'weekly', label: 'Weekly Status Report', icon: CalendarDays, color: 'indigo', desc: 'Court dates, billing audit, and activity summary.' },
                        { id: 'aged', label: 'Aged Voucher Audit', icon: TimerReset, color: 'rose', desc: 'Aging report for dossiers in "Missing" billing status (Focus 90+ days).' },
                        { id: 'aging', label: 'Case Aging & Velocity', icon: History, color: 'blue', desc: 'Analysis of dossier processing speed from intake to resolution.' },
                        { id: 'stagnant', label: 'Stagnant Advisory', icon: Snowflake, color: 'amber', desc: 'Critical warning for dossiers with zero activity in 45+ days.' },
                        { id: 'pretrial', label: 'Pre-Trial Readiness', icon: Target, color: 'emerald', desc: 'Strategic preparation status for upcoming trial dates.' },
                        { id: 'intel', label: 'Global Intel Brief', icon: Sparkles, color: 'indigo', desc: 'AI-generated operational synthesis for management.' }
                      ].map(r => (
                        <div 
                          key={r.id} 
                          onClick={() => setSelectedReportId(r.id)}
                          className={`p-6 bg-white border-2 rounded-[32px] shadow-sm hover:border-indigo-600 transition-all cursor-pointer group flex items-center gap-6 ${selectedReportId === r.id ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100'}`}
                        >
                          <div className={`p-4 rounded-2xl bg-slate-50 text-slate-400 group-hover:text-indigo-600 transition-all shrink-0`}><r.icon size={20}/></div>
                          <div>
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{r.label}</h4>
                            <p className="text-[9px] font-medium text-slate-400 mt-1">{r.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => handleExecuteReport(selectedReportId)}
                      disabled={isGeneratingReport}
                      className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
                    >
                      {isGeneratingReport ? <Loader2 size={20} className="animate-spin"/> : <Cpu size={20}/>} Step 3: Initialize Synthesis
                    </button>
                  </div>
                </div>

                <div className="col-span-8">
                   <div className="bg-white border rounded-[64px] shadow-2xl p-16 h-full min-h-[850px] flex flex-col relative overflow-hidden">
                      {isGeneratingReport && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-12">
                          <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl animate-bounce mb-8">
                            <Sparkles size={48}/>
                          </div>
                          <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900">Synthesizing Intelligence</h3>
                          <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-[0.4em] animate-pulse">Consulting Secure Dossiers & Strategic Logic...</p>
                        </div>
                      )}

                      {generatedReport ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col h-full">
                          <div className="flex-1 overflow-y-auto custom-scrollbar prose prose-slate max-w-none">
                            <div className="whitespace-pre-wrap font-medium text-slate-600 leading-relaxed text-sm">
                              {generatedReport}
                            </div>
                          </div>
                          <footer className="mt-10 pt-8 border-t border-slate-50 flex justify-between items-center shrink-0 bg-white">
                            <button onClick={() => setGeneratedReport(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-all">Discard Draft</button>
                            <button onClick={() => window.print()} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-3">
                              <Download size={16}/> Export PDF
                            </button>
                          </footer>
                        </div>
                      ) : !isGeneratingReport && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 animate-in fade-in">
                          <div className="p-10 bg-slate-50 rounded-full mb-8 text-slate-200">
                            <BrainCircuit size={100} strokeWidth={1}/>
                          </div>
                          <h2 className="text-2xl font-black uppercase tracking-[0.4em] text-slate-400">Analysis Engine Idle</h2>
                          <p className="text-[10px] font-bold mt-4 uppercase tracking-widest text-slate-300 max-w-sm">Define context and choose a protocol to begin operational synthesis.</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="animate-in fade-in max-w-[1600px] mx-auto flex flex-col h-[calc(100vh-220px)] min-h-0 pb-6">
               <div className="shrink-0 bg-white p-6 rounded-[40px] border border-slate-100 shadow-xl flex flex-col gap-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                        <FolderOpen size={20}/>
                      </div>
                      <div className="hidden sm:block">
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">Master Registry</h1>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Strategic Index</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex bg-slate-100 p-1 rounded-[16px] gap-0.5 shadow-inner">
                        {[
                          { id: 'Active', icon: Zap },
                          { id: 'Unscheduled', icon: Timer },
                          { id: 'Archive', icon: Archive }
                        ].map(f => (
                          <button 
                            key={f.id} 
                            onClick={() => setLifecycleFilter(f.id as any)}
                            className={`px-4 py-1.5 rounded-[12px] text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${lifecycleFilter === f.id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <f.icon size={10}/>
                            {f.id}
                            <span className={`px-1.5 py-0.5 rounded-md text-[7px] ${lifecycleFilter === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                              {registryCounts[f.id as keyof typeof registryCounts]}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
                        <SortAsc size={12} className="text-slate-400"/>
                        <select 
                          value={caseSort} 
                          onChange={(e) => setCaseSort(e.target.value as CaseSort)}
                          className="bg-transparent border-none text-[8px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer pr-3"
                        >
                          <option value="Defendant">By Defendant</option>
                          <option value="Court Date">By Court Date</option>
                          <option value="Attorney">By Attorney</option>
                          <option value="Date Opened">By Date Opened (Oldest)</option>
                        </select>
                      </div>

                      <button onClick={handleNewCase} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg active:scale-95 whitespace-nowrap">
                        <Plus size={14}/> New Matter
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                    <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"/>
                    <input 
                      value={registrySearch} 
                      onChange={(e) => setRegistrySearch(e.target.value)} 
                      placeholder="Search Defendant Name (First or Last)..." 
                      className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-600 focus:bg-white shadow-inner transition-all placeholder:text-slate-300"
                    />
                  </div>
               </div>

               <div className="flex-1 min-h-0 bg-white rounded-[64px] border shadow-2xl overflow-hidden flex flex-col transition-all">
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left table-fixed border-separate border-spacing-0">
                    <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest sticky top-0 z-20 shadow-xl">
                      <tr>
                        <th className="px-12 py-10 w-1/3 border-r border-white/5">Defendant / Case #</th>
                        <th className="px-12 py-10 w-1/4 border-r border-white/5">Lead Attorney</th>
                        <th className="px-12 py-10 w-1/4 border-r border-white/5">Court Date / Event</th>
                        <th className="px-12 py-10 w-1/5 text-center">Effort / Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[12px] text-slate-700">
                      {masterRegistryCases.map(c => {
                        const isCriticalEvent = ["trial readiness", "jury trial", "non-jury trial", "motion hearing"].some(term => (c.nextEventDescription || '').toLowerCase().includes(term));
                        const isUrgent = c.nextCourtDate && isCriticalEvent && calculateDaysDiff(c.nextCourtDate) >= -30 && calculateDaysDiff(c.nextCourtDate) <= 0;
                        const lastActivityDate = (c.activities || []).length > 0 ? [...c.activities].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : c.dateOpened;
                        const isStagnant = calculateDaysDiff(lastActivityDate) >= 45 && c.status !== CaseStatus.CLOSED;

                        return (
                          <tr key={c.id} className={`hover:bg-indigo-50/40 transition-all cursor-pointer group ${(c as any).needsIntake ? 'bg-amber-50/50 border-l-4 border-l-amber-400' : ''}`} onClick={() => setSelectedCaseId(c.id)}>
                            <td className="px-12 py-10">
                              <div className="flex items-center gap-5">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-black uppercase text-slate-900 text-sm tracking-tight">{c.defendantLastName}, {c.defendantFirstName}</span>
                                    {(c as any).needsIntake && (
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[8px] font-black uppercase tracking-widest shrink-0">Complete intake</span>
                                    )}
                                    {isUrgent && (
                                      <span className="flex items-center gap-2 px-3 py-1 bg-rose-600 text-white text-[8px] font-black uppercase rounded-full animate-pulse shadow-lg ring-4 ring-rose-50 border border-white/20">
                                        <Flame size={10}/> Urgent
                                      </span>
                                    )}
                                    {isStagnant && !isUrgent && (
                                      <span className="px-3 py-1 bg-indigo-950 text-white text-[8px] font-black uppercase rounded-full shadow-md border border-indigo-400">
                                        Stagnant
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col mt-1.5 gap-0.5">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                      {c.caseNumber || 'TBD-REF-00'}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                                      Opened: {displayDate(c.dateOpened)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-12 py-10">
                              <div className="flex flex-col gap-1">
                                <span className="px-4 py-1.5 bg-slate-100 rounded-xl text-[9px] font-black uppercase text-slate-500 group-hover:bg-white inline-block w-fit">
                                  {c.attorneyName || 'UNASSIGNED COMMAND'}
                                </span>
                                {c.judgeName && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter italic">Hon. {c.judgeName}</span>}
                              </div>
                            </td>
                            <td className="px-12 py-10">
                              <div className="flex flex-col">
                                <span className={`font-black uppercase text-[9px] ${isUrgent ? 'text-rose-600' : 'text-indigo-600'}`}>
                                  {c.nextEventDescription || 'Phase Unscheduled'}
                                </span>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{displayDate(c.nextCourtDate)}</span>
                                  {c.nextCourtDate && c.nextCourtDate < todayStr && c.status !== CaseStatus.CLOSED && (
                                    <span className="text-[8px] font-black text-blue-950 uppercase">(Overdue)</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-12 py-10 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <VoucherBadge status={c.voucherStatus}/>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                  {(c.activities || []).reduce((s, a) => s + (a.hours || 0), 0).toFixed(1)} Billable Hrs
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'core' && (
            <div className="animate-in fade-in max-w-[1600px] mx-auto space-y-12 pb-20">
              <header className="bg-white border rounded-[48px] p-12 shadow-sm flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-5">
                    <Settings className="text-slate-400" size={32}/> System Settings
                  </h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Global Configuration Center</p>
                </div>
              </header>

              <div className="grid grid-cols-12 gap-10">
                {/* Command Identity Section */}
                <div className="col-span-4 space-y-8">
                  <section className="bg-white border rounded-[48px] p-10 shadow-sm space-y-8">
                    <h3 className="text-[11px] font-black uppercase text-indigo-600 tracking-[0.2em] flex items-center gap-3 border-b border-slate-50 pb-4">
                      <Building2 size={16}/> Command Identity
                    </h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Agency Name</label>
                        <input value={agencyMeta.agency} onChange={e => setAgencyMeta({...agencyMeta, agency: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Lead Investigator</label>
                        <input value={agencyMeta.investigator} onChange={e => setAgencyMeta({...agencyMeta, investigator: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Default Billing Rate ($)</label>
                        <input type="number" step="0.1" value={agencyMeta.hourlyRate} onChange={e => setAgencyMeta({...agencyMeta, hourlyRate: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border rounded-2xl text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-600 transition-all"/>
                      </div>
                      <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                        <Save size={16}/> Persist Global Defaults
                      </button>
                    </div>
                  </section>

                  {/* System Utilities Section */}
                  <section className="bg-slate-900 text-white border rounded-[48px] p-10 shadow-2xl space-y-8">
                    <h3 className="text-[11px] font-black uppercase text-indigo-400 tracking-[0.2em] flex items-center gap-3 border-b border-white/5 pb-4">
                      <HardDrive size={16}/> Intelligence Backups
                    </h3>
                    <div className="space-y-4">
                      <button onClick={exportRegistryCSV} className="w-full p-6 bg-white/5 border border-white/10 rounded-[32px] hover:bg-white/10 transition-all text-left group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 rounded-2xl"><FileType size={20}/></div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-widest">Export Master Registry</p>
                              <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Full case record dataset (.csv)</p>
                            </div>
                          </div>
                          <Download size={18} className="text-slate-500 group-hover:text-white transition-all"/>
                        </div>
                      </button>
                      <button onClick={exportTasksCSV} className="w-full p-6 bg-white/5 border border-white/10 rounded-[32px] hover:bg-white/10 transition-all text-left group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 rounded-2xl"><ListTodo size={20}/></div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-widest">Export Tactical Feed</p>
                              <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Active directives dataset (.csv)</p>
                            </div>
                          </div>
                          <Download size={18} className="text-slate-500 group-hover:text-white transition-all"/>
                        </div>
                      </button>
                    </div>
                    <div className="pt-6 border-t border-white/5 flex items-center gap-4 px-2">
                       <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse"/>
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Supabase Cloud Sync: Secured</p>
                    </div>
                  </section>
                </div>

                {/* Activity Code Registry Section */}
                <div className="col-span-8">
                  <section className="bg-white border rounded-[48px] shadow-sm flex flex-col h-full min-h-[700px] overflow-hidden">
                    <header className="p-12 border-b border-slate-50 flex items-center justify-between shrink-0">
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-4">
                           Activity Codes <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{activityCodes.length} CODES</span>
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage Log Increment Types</p>
                      </div>
                      <button onClick={() => setIsAddingCode(true)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-xl">
                        <Plus size={16}/> Add New Codes
                      </button>
                    </header>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
                      {isAddingCode && (
                        <div className="mb-10 p-10 bg-slate-50 border-2 border-indigo-600/20 rounded-[40px] animate-in slide-in-from-top-4">
                           <div className="flex justify-between items-center mb-8">
                             <h4 className="text-[11px] font-black uppercase text-indigo-600 tracking-widest">New Operation Increment</h4>
                             <button onClick={() => setIsAddingCode(false)}><X size={20}/></button>
                           </div>
                           <div className="grid grid-cols-12 gap-8 items-end">
                             <div className="col-span-3 space-y-2">
                               <label className="text-[8px] font-black uppercase text-slate-400">Short Code (e.g. "JV")</label>
                               <input value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value.toUpperCase()})} className="w-full p-4 bg-white border rounded-2xl text-[11px] font-black outline-none" placeholder="CODE"/>
                             </div>
                             <div className="col-span-6 space-y-2">
                               <label className="text-[8px] font-black uppercase text-slate-400">Public Label</label>
                               <input value={newCode.label} onChange={e => setNewCode({...newCode, label: e.target.value})} className="w-full p-4 bg-white border rounded-2xl text-[11px] font-bold outline-none" placeholder="Increment Label..."/>
                             </div>
                             <div className="col-span-3 space-y-2">
                               <label className="text-[8px] font-black uppercase text-slate-400">Standard Hrs</label>
                               <input type="number" step="0.1" value={newCode.defaultHours} onChange={e => setNewCode({...newCode, defaultHours: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-white border rounded-2xl text-[11px] font-black outline-none"/>
                             </div>
                             <div className="col-span-12 space-y-2">
                               <label className="text-[8px] font-black uppercase text-slate-400">Default Narrative (Quick Log Template)</label>
                               <textarea value={newCode.defaultNarrative} onChange={e => setNewCode({...newCode, defaultNarrative: e.target.value})} className="w-full p-4 bg-white border rounded-2xl text-[11px] font-medium outline-none h-24 resize-none" placeholder="Enter standard narrative..."/>
                             </div>
                             <div className="col-span-12 flex justify-end gap-3">
                                <button onClick={() => setIsAddingCode(false)} className="px-6 py-3 text-[9px] font-black uppercase text-slate-400">Cancel</button>
                                <button 
                                  onClick={() => {
                                    if(!newCode.code || !newCode.label) return;
                                    setActivityCodes([...activityCodes, { ...newCode, id: Math.random().toString(36).substr(2,9) }]);
                                    setIsAddingCode(false);
                                    setNewCode({ code: '', label: '', defaultHours: 0.0, defaultNarrative: '' });
                                  }}
                                  className="px-10 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg"
                                >
                                  Initialize Code
                                </button>
                             </div>
                           </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-6">
                        {activityCodes.map(ac => (
                          <div key={ac.id} className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:border-indigo-100 transition-all group relative">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xs">{ac.code}</div>
                                <div>
                                  <h5 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">{ac.label}</h5>
                                  <p className="text-[10px] font-black text-indigo-600 mt-0.5">{ac.defaultHours.toFixed(1)}H STANDARD</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic line-clamp-3">"{ac.defaultNarrative}"</p>
                            <button 
                              onClick={() => setActivityCodes(activityCodes.filter(x => x.id !== ac.id))}
                              className="absolute top-6 right-6 p-2 text-rose-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={16}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {currentCase && (
        <CaseJacket 
          caseData={currentCase}
          onClose={() => setSelectedCaseId(null)} 
          onUpdate={persistCase} 
          activityCodes={activityCodes} 
          tasks={globalTasks}
          investigators={investigators}
          jurisdictions={displayJurisdictions}
          isAdmin={isAdmin}
          onUpdateTask={persistTask}
        />
      )}
      {isProcessing && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[2000] flex items-center justify-center flex-col gap-6 text-white animate-in fade-in"><Loader2 className="animate-spin text-indigo-400" size={80}/><p className="font-black uppercase tracking-widest text-[10px] animate-pulse">Synchronizing Cloud Command...</p></div>}
      {showProfile && (
        <div className="fixed inset-0 z-[3000] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="text-lg font-bold">My Profile</div>
            <div className="text-xs text-slate-500 mt-1">
              This name is what admins see in assignment dropdowns.
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-600">Full name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g., Gregory Brent"
              />
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                className="rounded-lg px-4 py-2 text-sm border"
                onClick={() => setShowProfile(false)}
                disabled={savingProfile}
              >
                Cancel
              </button>
              <button
                className="rounded-lg px-4 py-2 text-sm bg-slate-900 text-white"
                onClick={saveMyProfile}
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export const App: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div style={{ padding: 20 }}>Loading…</div>;
  if (!session?.user) return <Auth onAuthed={() => {}} />;

  return <AppShell />;
};

import React, { useState, useRef, useEffect } from 'react';
import { User, ProductTicket, SubTask, Attachment, HistoryLog, TicketStatus, AttachmentType, TicketStatus as TStatus } from '../../_types/types';
import { Icons } from '../Icons';
import { Button } from '@/components/ui/button';
import { saveTicket, getTicketById, uploadFile, getCurrentUser } from '../../_services/storageService';
import { generateSubtasks, enhanceDescription } from '../../_services/geminiService';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// --- SUB-COMPONENTS (Defined outside to prevent re-render focus loss) ---

interface TasksListProps {
  tasks: SubTask[];
  status: TicketStatus;
  isSaving: boolean;
  newSubtask: string;
  setNewSubtask: (val: string) => void;
  subtaskResponsible: string;
  setSubtaskResponsible: (val: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onFinish: (id: string) => void;
  className?: string;
}

const TasksList: React.FC<TasksListProps> = ({
  tasks, status, isSaving, newSubtask, setNewSubtask, subtaskResponsible, setSubtaskResponsible, onAdd, onDelete, onFinish, className
}) => {
  return (
    <div className={`bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col ${className || ''}`}>
      <div className="flex justify-between items-center mb-5 shrink-0">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Icons.Settings size={16} />
          Tarefas
        </h3>
        <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-xs font-bold">
          {tasks.filter(t => t.completed).length}/{tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar min-h-[200px] lg:min-h-0">
        {status === TicketStatus.EVALUATION ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Icons.Clock className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-gray-500 text-sm font-medium">Aguardando início.</p>
          </div>
        ) : (
          <>
            {/* Subtask Input - ALWAYS VISIBLE IF IN_CHANGE */}
            {status === TicketStatus.IN_CHANGE && (
              <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-col gap-3 mb-3">
                  <input
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                    placeholder="Nova tarefa..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onAdd()}
                  />
                  <input
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                    placeholder="Responsável / Terceiro"
                    value={subtaskResponsible}
                    onChange={(e) => setSubtaskResponsible(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onAdd()}
                  />
                </div>
                <button
                  onClick={onAdd}
                  disabled={!newSubtask.trim() || isSaving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  Adicionar Tarefa
                </button>
              </div>
            )}

            {/* Tasks List */}
            <div className="space-y-2">
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <div key={task.id} className={`group flex items-start gap-3 p-3 rounded-lg border transition-all active:scale-[0.99] ${task.completed ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:border-emerald-300 shadow-sm'}`}>
                    <button
                      onClick={() => status === TicketStatus.IN_CHANGE && onFinish(task.id)}
                      className={`mt-0.5 w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0 ${task.completed ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 hover:border-emerald-500'} ${status !== TicketStatus.IN_CHANGE ? 'cursor-default' : ''}`}
                    >
                      {task.completed && <Icons.Check size={14} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium break-words ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {task.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {task.assignedTo && (
                          <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {task.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                    {status === TicketStatus.IN_CHANGE && (
                      <button onClick={() => onDelete(task.id)} className="text-gray-300 hover:text-red-500 p-2">
                        <Icons.Delete size={18} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center text-sm py-4">Nenhuma tarefa registrada.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const AttachmentsList: React.FC<{ attachments: Attachment[], className?: string }> = ({ attachments, className }) => (
  <div className={`bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col ${className || ''}`}>
    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
      <Icons.File size={16} />
      Arquivos e Anexos
    </h3>
    <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar min-h-[150px] lg:min-h-0">
      {attachments.length > 0 ? (
        attachments.map(att => (
          <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors group">
            <div className="flex items-center gap-3 overflow-hidden">
              {att.type === AttachmentType.IMAGE ? (
                <img src={att.url} alt="Att" className="w-10 h-10 rounded object-cover border border-gray-200 bg-white" />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                  <Icons.File size={20} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{att.name}</p>
                <p className="text-xs text-gray-500">{new Date(att.uploadedAt).toLocaleDateString()} • {att.stage}</p>
              </div>
            </div>
            <a href={att.url} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-emerald-600">
              <Icons.Upload size={18} className="rotate-90" />
            </a>
          </div>
        ))
      ) : (
        <p className="text-gray-400 text-center text-sm py-4">Nenhum anexo.</p>
      )}
    </div>
  </div>
);

const HistoryList: React.FC<{ history: HistoryLog[], className?: string }> = ({ history, className }) => (
  <div className={`bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col ${className || ''}`}>
    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
      <Icons.Clock size={16} />
      Histórico
    </h3>
    <div className="relative pl-4 border-l border-gray-200 space-y-6 flex-1 overflow-y-auto no-scrollbar">
      {history.map((log, idx) => (
        <div key={idx} className="relative">
          <div className="absolute -left-[21px] top-0 w-3 h-3 bg-gray-200 rounded-full border-2 border-white"></div>
          <div>
            <p className="text-sm font-bold text-gray-900">{log.action}</p>
            <div className="flex items-center gap-2 mt-0.5 mb-1">
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{log.user}</span>
              <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
            </div>
            {log.details && (
              <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 mt-1 whitespace-pre-wrap">
                {log.details}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- MAIN COMPONENT ---

interface TicketDetailProps {
  ticket: ProductTicket;
  onBack: () => void;
  onUpdate: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticket, onBack, onUpdate }) => {
  const [currentTicket, setCurrentTicket] = useState<ProductTicket>(ticket);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const u = await getCurrentUser();
      setCurrentUser(u);
    };
    fetchUser();
  }, []);

  // Scroll Ref for Stepper
  const stepperRef = useRef<HTMLDivElement>(null);

  // --- STATE: Subtasks ---
  const [newSubtask, setNewSubtask] = useState('');
  const [subtaskResponsible, setSubtaskResponsible] = useState('');

  // --- STATE: Start Development Modal ---
  const [showStartDevModal, setShowStartDevModal] = useState(false);
  const [devDescription, setDevDescription] = useState('');
  const [devResponsible, setDevResponsible] = useState('');
  const [devFiles, setDevFiles] = useState<File[]>([]);

  // --- STATE: Finish Task Modal ---
  const [showFinishTaskModal, setShowFinishTaskModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFinishNotes, setTaskFinishNotes] = useState('');
  const [taskFinishFiles, setTaskFinishFiles] = useState<File[]>([]);

  // --- STATE: Send for Validation Modal (Envio para Liberação) ---
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [valResponsible, setValResponsible] = useState(''); // Quem envia/acompanha
  const [valDescription, setValDescription] = useState('');
  const [valFiles, setValFiles] = useState<File[]>([]);

  // --- STATE: Final Approval Modal ---
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalEvaluators, setApprovalEvaluators] = useState<string[]>([]); // Lista de avaliadores
  const [superiorApprover, setSuperiorApprover] = useState(''); // Gerente/Diretor
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalFiles, setApprovalFiles] = useState<File[]>([]);
  const [approvalDecision, setApprovalDecision] = useState<'APPROVED' | 'REJECTED' | null>(null); // Novo estado para decisão

  // --- STATE: Add Evaluator Modal (Nested) ---
  const [showEvaluatorModal, setShowEvaluatorModal] = useState(false);
  const [evalName, setEvalName] = useState('');
  const [evalRole, setEvalRole] = useState('');

  // --- STATE: Mobile Views ---
  const [activeTab, setActiveTab] = useState<'details' | 'tasks' | 'files' | 'history'>('details');

  useEffect(() => {
    setCurrentTicket(ticket);
  }, [ticket]);

  const stages = [
    TicketStatus.EVALUATION,
    TicketStatus.IN_CHANGE,
    TicketStatus.PENDING_APPROVAL,
    TicketStatus.APPROVED
  ];

  const currentStageIndex = currentTicket.status === TicketStatus.REJECTED
    ? stages.length
    : stages.indexOf(currentTicket.status);

  // --- Helpers ---

  const scrollStepper = (direction: 'left' | 'right') => {
    if (stepperRef.current) {
      const scrollAmount = 200;
      stepperRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const addHistory = (action: string, details?: string, ticketToUpdate = currentTicket) => {
    const log: HistoryLog = {
      id: Date.now().toString(),
      action,
      user: currentUser?.name || 'Sistema',
      timestamp: new Date().toISOString(),
      details
    };
    return { ...ticketToUpdate, history: [log, ...ticketToUpdate.history], updatedAt: new Date().toISOString() };
  };

  const processAttachments = async (files: File[], stage: TicketStatus): Promise<Attachment[]> => {
    const attachments: Attachment[] = [];
    for (const file of files) {
      const url = await uploadFile(file);
      attachments.push({
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: file.type.includes('image') ? AttachmentType.IMAGE : AttachmentType.DOCUMENT,
        url: url,
        uploadedAt: new Date().toISOString(),
        stage: stage
      });
    }
    return attachments;
  };

  // --- MODAL HANDLERS: GENERIC ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  // --- 1. START DEVELOPMENT ---

  const confirmStartDevelopment = async () => {
    if (!devDescription.trim() || !devResponsible.trim()) {
      toast.error("Por favor, preencha a descrição e o responsável.");
      return;
    }
    setIsSaving(true);
    try {
      const newAttachments = await processAttachments(devFiles, TicketStatus.IN_CHANGE);

      // Explicitly type to prevent TS inference errors with optional fields
      let updatedTicket: ProductTicket = {
        ...currentTicket,
        status: TicketStatus.IN_CHANGE,
        changerName: devResponsible,
        attachments: [...currentTicket.attachments, ...newAttachments],
        developmentStartedAt: new Date().toISOString() // DATE TRACKING
      };

      updatedTicket = addHistory(
        `Início do Desenvolvimento (Resp: ${devResponsible})`,
        `Nota de Início: ${devDescription}`,
        updatedTicket
      );

      await saveTicket(updatedTicket);
      setCurrentTicket(updatedTicket);
      onUpdate();
      toast.success("Desenvolvimento iniciado!");
      setShowStartDevModal(false);
      setDevDescription('');
      setDevResponsible('');
      setDevFiles([]);
    } catch (e) {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- 2. FINISH SUBTASK ---

  const initiateFinishTask = (taskId: string) => {
    const task = currentTicket.subTasks.find(t => t.id === taskId);
    if (task?.completed) {
      if (confirm("Deseja reabrir esta tarefa?")) {
        handleReopenTask(taskId, task.description);
      }
    } else {
      // Finish task
      setSelectedTaskId(taskId);
      setTaskFinishNotes('');
      setTaskFinishFiles([]);
      setShowFinishTaskModal(true);
    }
  };

  const handleReopenTask = async (taskId: string, description: string) => {
    setIsSaving(true);
    const updatedTasks = currentTicket.subTasks.map(t =>
      t.id === taskId ? { ...t, completed: false, completionNotes: undefined } : t
    );
    let updated: ProductTicket = { ...currentTicket, subTasks: updatedTasks };
    updated = addHistory('Tarefa Reaberta', `Tarefa: ${description}`, updated);
    await saveTicket(updated);
    setCurrentTicket(updated);
    onUpdate();
    setIsSaving(false);
  };

  const confirmFinishTask = async () => {
    if (!selectedTaskId) return;
    if (!taskFinishNotes.trim()) {
      toast.error("Por favor, descreva o que foi feito para concluir a tarefa.");
      return;
    }
    setIsSaving(true);
    try {
      const newAttachments = await processAttachments(taskFinishFiles, TicketStatus.IN_CHANGE);

      const updatedTasks = currentTicket.subTasks.map(t =>
        t.id === selectedTaskId ? { ...t, completed: true, completionNotes: taskFinishNotes } : t
      );

      let updated: ProductTicket = {
        ...currentTicket,
        subTasks: updatedTasks,
        attachments: [...currentTicket.attachments, ...newAttachments]
      };

      const taskDesc = currentTicket.subTasks.find(t => t.id === selectedTaskId)?.description;
      updated = addHistory('Tarefa Concluída', `Tarefa: ${taskDesc}\nObs: ${taskFinishNotes}`, updated);

      await saveTicket(updated);
      setCurrentTicket(updated);
      onUpdate();
      toast.success("Tarefa concluída!");
      setShowFinishTaskModal(false);
    } catch (e) {
      toast.error("Erro ao salvar tarefa.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- 3. SEND FOR VALIDATION (LIBERAÇÃO) ---

  const confirmSendValidation = async () => {
    if (!valResponsible.trim()) {
      toast.error("Informe quem será o responsável pelo envio/acompanhamento.");
      return;
    }
    setIsSaving(true);
    try {
      const newAttachments = await processAttachments(valFiles, TicketStatus.PENDING_APPROVAL);

      let updated: ProductTicket = {
        ...currentTicket,
        status: TicketStatus.PENDING_APPROVAL,
        validationResponsible: valResponsible,
        attachments: [...currentTicket.attachments, ...newAttachments],
        validationSentAt: new Date().toISOString() // DATE TRACKING
      };

      updated = addHistory(
        `Enviado para Validação`,
        `Responsável Envio: ${valResponsible}\nObs: ${valDescription}`,
        updated
      );

      await saveTicket(updated);
      setCurrentTicket(updated);
      onUpdate();
      setShowValidationModal(false);
      setValResponsible('');
      setValDescription('');
      setValFiles([]);
      toast.success("Enviado para validação!");
    } catch (e) {
      toast.error("Erro ao enviar para validação.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- 4. FINAL APPROVAL / REJECTION ---

  const openEvaluatorModal = () => {
    setEvalName('');
    setEvalRole('');
    setShowEvaluatorModal(true);
  };

  const handleAddEvaluator = () => {
    if (!evalName.trim() || !evalRole.trim()) {
      toast.error("Preencha Nome e Cargo.");
      return;
    }
    const formattedEntry = `${evalName.trim()} - ${evalRole.trim()}`;
    setApprovalEvaluators([...approvalEvaluators, formattedEntry]);
    setShowEvaluatorModal(false);
  };

  const removeEvaluator = (idx: number) => {
    setApprovalEvaluators(approvalEvaluators.filter((_, i) => i !== idx));
  };

  const handleConfirmClick = () => {
    if (!approvalDecision) {
      toast.error("Selecione Aprovado ou Reprovado.");
      return;
    }
    confirmApprovalDecision(approvalDecision === 'APPROVED');
  };

  const confirmApprovalDecision = async (isApproved: boolean) => {
    if (!superiorApprover.trim()) {
      toast.error("Por favor, informe o Superior Imediato (Gerente/Diretor) responsável pela liberação final.");
      return;
    }
    setIsSaving(true);
    try {
      const newAttachments = await processAttachments(approvalFiles, isApproved ? TicketStatus.APPROVED : TicketStatus.REJECTED);

      let updated: ProductTicket = {
        ...currentTicket,
        status: isApproved ? TicketStatus.APPROVED : TicketStatus.REJECTED,
        approvers: approvalEvaluators,
        superiorApprover: superiorApprover,
        approverName: currentUser?.name,
        attachments: [...currentTicket.attachments, ...newAttachments],
        finalizedAt: new Date().toISOString() // DATE TRACKING
      };

      const evaluatorsStr = approvalEvaluators.length ? approvalEvaluators.join(', ') : 'N/A';
      const details = `Superior Imediato: ${superiorApprover}\nAvaliadores: ${evaluatorsStr}\nObs: ${approvalNotes}`;

      updated = addHistory(
        isApproved ? 'Aprovado Final' : 'Reprovado',
        details,
        updated
      );

      await saveTicket(updated);
      setCurrentTicket(updated);
      onUpdate();
      setShowApprovalModal(false);
      setApprovalEvaluators([]);
      setSuperiorApprover('');
      setApprovalNotes('');
      setApprovalFiles([]);
      setApprovalDecision(null);
      toast.success(isApproved ? "Ticket Aprovado e Finalizado!" : "Ticket Reprovado!");
    } catch (e) {
      toast.error("Erro ao finalizar ticket.");
    } finally {
      setIsSaving(false);
    }
  };


  // --- MAIN STAGE CONTROLLER ---

  const handleStageAdvance = () => {
    // 1. Evaluation -> Development
    if (currentTicket.status === TicketStatus.EVALUATION) {
      setDevResponsible(''); // Was: user?.name || currentTicket.changerName || ''
      setShowStartDevModal(true);
      return;
    }

    // 2. Development -> Approval (Envio para Liberação)
    if (currentTicket.status === TicketStatus.IN_CHANGE) {
      const pendingTasks = currentTicket.subTasks.filter(t => !t.completed);

      if (pendingTasks.length > 0) {
        toast.warning(`Existem ${pendingTasks.length} tarefas pendentes. Conclua todas antes.`);
        return;
      }

      setValResponsible(''); // Was: currentTicket.changerName || user?.name || ''
      setShowValidationModal(true);
      return;
    }

    // 3. Approval -> Final Decision (Aprovar/Reprovar)
    if (currentTicket.status === TicketStatus.PENDING_APPROVAL) {
      setSuperiorApprover('');
      setApprovalEvaluators([]);
      setApprovalDecision(null); // Reset decision
      setShowApprovalModal(true);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setIsSaving(true);
    const task: SubTask = {
      id: Date.now().toString(),
      description: newSubtask,
      assignedTo: subtaskResponsible.trim() || 'Equipe Interna',
      completed: false,
      createdAt: new Date().toISOString()
    };
    let updated: ProductTicket = { ...currentTicket, subTasks: [...currentTicket.subTasks, task] };
    updated = addHistory('Nova Tarefa', `${task.description} (${task.assignedTo})`, updated);

    await saveTicket(updated);
    setCurrentTicket(updated);
    setNewSubtask('');
    setSubtaskResponsible('');
    setIsSaving(false);
  };

  const handleDeleteSubtask = async (id: string) => {
    if (!confirm("Remover esta tarefa?")) return;
    setIsSaving(true);
    const updated = { ...currentTicket, subTasks: currentTicket.subTasks.filter(t => t.id !== id) };
    await saveTicket(updated);
    setCurrentTicket(updated);
    setIsSaving(false);
  };

  // --- LAYOUT RENDER ---
  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <Icons.ChevronLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              {currentTicket.productCode?.toUpperCase()}
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{currentTicket.productName?.toUpperCase()}</span>
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              ID: {currentTicket.id}
            </p>
          </div>
        </div>

      </div>

      {/* SCROLLABLE STEPPER */}
      <div className="relative mb-6 group shrink-0">
        <button onClick={() => scrollStepper('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 p-1 rounded-full shadow-md md:hidden border border-border"><Icons.ChevronLeft size={20} /></button>
        <div ref={stepperRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth">
          {stages.map((stage, index) => {
            const isActive = stage === currentTicket.status;
            const isPast = index < currentStageIndex;
            const isRejected = currentTicket.status === TicketStatus.REJECTED && index === stages.length - 1;

            return (
              <div key={stage} className="flex items-center min-w-max">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : isPast
                    ? 'bg-muted text-primary border-primary/30'
                    : isRejected
                      ? 'bg-destructive text-destructive-foreground border-destructive'
                      : 'bg-card text-muted-foreground border-border'
                  }`}>
                  {isPast || isActive ? <Icons.Check size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                  <span className="text-sm font-bold whitespace-nowrap">{stage}</span>
                </div>
                {index < stages.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${isPast ? 'bg-primary/50' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
        <button onClick={() => scrollStepper('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 p-1 rounded-full shadow-md md:hidden border border-border"><Icons.ChevronRight size={20} /></button>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-hidden">
        {/* LEFT COLUMN: DETAILS + STATUS + HISTORY (Desktop) */}
        <div className="lg:col-span-3 flex flex-col overflow-y-auto no-scrollbar gap-6 pb-6">
          {/* DETAILS CARD */}
          <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-200 shrink-0 ${activeTab !== 'details' ? 'hidden md:block' : 'block'}`}>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-48 shrink-0">
                {currentTicket.productImage ? (
                  <img src={currentTicket.productImage} alt="Product" className="w-full h-48 md:h-48 object-cover rounded-xl border border-gray-100 shadow-sm" />
                ) : (
                  <div className="w-full h-48 md:h-48 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-gray-300">
                    <Icons.Camera size={48} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição da Solicitação</h3>
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{currentTicket.description}</p>

                <div className="mt-6 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Solicitante</p>
                    <p className="text-sm font-medium text-gray-900">{currentTicket.requesterName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Resp. Acompanhamento</p>
                    <p className="text-sm font-medium text-gray-900">{currentTicket.trackingResponsible || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Resp. Desenvolvimento</p>
                    <p className="text-sm font-medium text-gray-900">{currentTicket.changerName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Data Criação</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(currentTicket.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BAR */}
          <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 ${activeTab !== 'details' ? 'hidden md:flex' : 'flex'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${currentTicket.status === TicketStatus.APPROVED ? 'bg-emerald-100 text-emerald-600' :
                currentTicket.status === TicketStatus.REJECTED ? 'bg-red-100 text-red-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                {currentTicket.status === TicketStatus.APPROVED ? <Icons.Check size={24} /> :
                  currentTicket.status === TicketStatus.REJECTED ? <Icons.Reject size={24} /> :
                    <Icons.Clock size={24} />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Status Atual: {currentTicket.status}</p>
                <p className="text-xs text-gray-500">Avançar para a próxima etapa conforme o fluxo.</p>
              </div>
            </div>

            {currentTicket.status !== TicketStatus.APPROVED && currentTicket.status !== TicketStatus.REJECTED && (
              <button
                onClick={handleStageAdvance}
                className="w-full md:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Próxima Etapa</span>
                <Icons.ChevronRight size={20} />
              </button>
            )}
          </div>

          {/* HISTORY (Desktop/Tablet View: MOVED BELOW STATUS) */}
          <div className="hidden md:block">
            <HistoryList history={currentTicket.history} className="h-auto" />
          </div>
        </div>

        {/* RIGHT COLUMN: TASKS + FILES */}
        <div className="lg:col-span-2 flex flex-col overflow-hidden h-full lg:h-auto">
          {/* Mobile Tabs Header (Visible only on small screens) */}
          <div className="flex md:hidden bg-white border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar shrink-0">
            <button onClick={() => setActiveTab('details')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'details' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>Detalhes</button>
            <button onClick={() => setActiveTab('tasks')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'tasks' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>Tarefas</button>
            <button onClick={() => setActiveTab('files')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'files' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>Arquivos</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'history' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>Histórico</button>
          </div>

          {/* Content Panels */}
          {/* Layout Logic: 
                 - Mobile (< md): Only show active tab.
                 - Tablet (md): Grid 2 cols side-by-side (Tasks Left, Files Right). History is in Left Col.
                 - Desktop (lg): Flex Col (Tasks Top, Files Bottom). History is in Left Col.
             */}
          <div className="flex-1 flex flex-col md:grid md:grid-cols-2 md:gap-4 lg:flex lg:flex-col lg:gap-4 overflow-y-auto lg:overflow-hidden pb-safe">
            <div className={`${activeTab === 'tasks' ? 'block h-full' : 'hidden md:block lg:block lg:flex-1'} min-h-0`}>
              <TasksList
                tasks={currentTicket.subTasks}
                status={currentTicket.status}
                isSaving={isSaving}
                newSubtask={newSubtask}
                setNewSubtask={setNewSubtask}
                subtaskResponsible={subtaskResponsible}
                setSubtaskResponsible={setSubtaskResponsible}
                onAdd={handleAddSubtask}
                onDelete={handleDeleteSubtask}
                onFinish={initiateFinishTask}
                className="h-full w-full"
              />
            </div>
            <div className={`${activeTab === 'files' ? 'block h-full' : 'hidden md:block lg:block lg:flex-1'} min-h-0`}>
              <AttachmentsList attachments={currentTicket.attachments} className="h-full w-full" />
            </div>

            {/* History shown here ONLY on mobile tab (< md) */}
            <div className={`${activeTab === 'history' ? 'block h-full' : 'hidden'} min-h-0`}>
              <HistoryList history={currentTicket.history} className="h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. START DEVELOPMENT MODAL */}
      {showStartDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Iniciar Desenvolvimento</h3>
              <p className="text-sm text-gray-500">Defina o responsável técnico e notas iniciais.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsável Técnico</label>
                <input className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-emerald-500"
                  value={devResponsible} onChange={e => setDevResponsible(e.target.value)} placeholder="Nome" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nota de Início / Planejamento</label>
                <textarea className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 h-24"
                  value={devDescription} onChange={e => setDevDescription(e.target.value)} placeholder="Resumo do que será feito..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anexos Iniciais (Opcional)</label>
                <input type="file" multiple className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  onChange={(e) => handleFileSelect(e, setDevFiles)} />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setShowStartDevModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmStartDevelopment} disabled={isSaving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2">
                {isSaving && <Icons.Clock className="animate-spin" size={16} />} Iniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FINISH TASK MODAL */}
      {showFinishTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Concluir Tarefa</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="w-full p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-emerald-800 italic text-sm">
                  "{currentTicket.subTasks.find(t => t.id === selectedTaskId)?.description}"
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">O que foi feito?</label>
                <textarea className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 h-24"
                  value={taskFinishNotes} onChange={e => setTaskFinishNotes(e.target.value)} placeholder="Descreva a solução..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Evidências / Arquivos (Opcional)</label>
                <input type="file" multiple className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  onChange={(e) => handleFileSelect(e, setTaskFinishFiles)} />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setShowFinishTaskModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmFinishTask} disabled={isSaving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2">
                {isSaving && <Icons.Clock className="animate-spin" size={16} />} Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. VALIDATION MODAL */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Enviar para Validação</h3>
              <p className="text-sm text-gray-500">Encaminhar para controle de qualidade e aprovação final.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quem enviou / Responsável Validação</label>
                <input className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-emerald-500"
                  value={valResponsible} onChange={e => setValResponsible(e.target.value)} placeholder="Nome" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações de Envio</label>
                <textarea className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 h-24"
                  value={valDescription} onChange={e => setValDescription(e.target.value)} placeholder="Testes realizados, pontos de atenção..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Relatórios de Teste (Opcional)</label>
                <input type="file" multiple className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  onChange={(e) => handleFileSelect(e, setValFiles)} />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setShowValidationModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmSendValidation} disabled={isSaving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2">
                {isSaving && <Icons.Clock className="animate-spin" size={16} />} Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FINAL APPROVAL MODAL */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Aprovação Final</h3>
                <p className="text-sm text-gray-500">Registro da decisão final da diretoria/gerência.</p>
              </div>
              <button onClick={() => setShowApprovalModal(false)} className="text-gray-400 hover:text-gray-600"><Icons.Close size={24} /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
              {/* Evaluators List */}
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-emerald-800 uppercase">Equipe de Avaliação</h4>
                  <button onClick={openEvaluatorModal} className="text-xs bg-white border border-emerald-200 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-50 font-medium flex items-center gap-1">
                    <Icons.Plus size={14} /> Adicionar
                  </button>
                </div>
                {approvalEvaluators.length > 0 ? (
                  <ul className="space-y-2">
                    {approvalEvaluators.map((ev, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-emerald-100 shadow-sm">
                        <span className="text-sm text-gray-700 font-medium flex items-center gap-2"><Icons.Users size={14} className="text-gray-400" /> {ev}</span>
                        <button onClick={() => removeEvaluator(idx)} className="text-red-400 hover:text-red-600"><Icons.Close size={16} /></button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-emerald-400 italic">Nenhum avaliador adicionado.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gerente / Diretor (Aprovador)</label>
                  <input className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-emerald-500"
                    value={superiorApprover} onChange={e => setSuperiorApprover(e.target.value)} placeholder="Nome do responsável final" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Decisão</label>
                  <div className="flex gap-2">
                    <button onClick={() => setApprovalDecision('APPROVED')}
                      className={`flex-1 py-3 rounded-lg border font-bold text-sm flex items-center justify-center gap-2 transition-all ${approvalDecision === 'APPROVED' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                      <Icons.Check size={16} /> APROVAR
                    </button>
                    <button onClick={() => setApprovalDecision('REJECTED')}
                      className={`flex-1 py-3 rounded-lg border font-bold text-sm flex items-center justify-center gap-2 transition-all ${approvalDecision === 'REJECTED' ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                      <Icons.Close size={16} /> REPROVAR
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Parecer Final</label>
                <textarea className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-emerald-500 h-24"
                  value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} placeholder="Justificativa da decisão..." />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Documento Assinado (Opcional)</label>
                <input type="file" multiple className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  onChange={(e) => handleFileSelect(e, setApprovalFiles)} />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={handleConfirmClick} disabled={isSaving || !approvalDecision}
                className={`px-6 py-3 rounded-lg text-white font-bold shadow-lg flex items-center gap-2 transition-all ${approvalDecision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' :
                  approvalDecision === 'REJECTED' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' :
                    'bg-gray-300 cursor-not-allowed'
                  }`}>
                {isSaving && <Icons.Clock className="animate-spin" size={18} />}
                {approvalDecision === 'APPROVED' ? 'Confirmar Aprovação' : approvalDecision === 'REJECTED' ? 'Confirmar Reprovação' : 'Selecione uma Decisão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NESTED: ADD EVALUATOR MODAL */}
      {showEvaluatorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl border border-gray-200 p-6 animate-slide-up">
            <h4 className="font-bold text-gray-900 mb-4">Adicionar Avaliador</h4>
            <div className="space-y-3 mb-4">
              <input
                className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-emerald-500"
                placeholder="Nome"
                value={evalName}
                onChange={e => setEvalName(e.target.value)}
              />
              <input
                className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-emerald-500"
                placeholder="Cargo / Área"
                value={evalRole}
                onChange={e => setEvalRole(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEvaluatorModal(false)} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
              <button onClick={handleAddEvaluator} className="px-3 py-1.5 bg-emerald-600 text-white rounded font-medium">Adicionar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/**
 * useSupportLogsController.ts
 *
 * State management for the admin Support & Logs panel.
 * Handles: support tickets (CRUD, filtering), system/activity logs (unified view).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAuth } from 'firebase/auth';
import type {
  SupportTicket,
  SupportTicketFormData,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  SupportStats,
  SupportTab,
  TicketFilterTab,
  SystemLogLevel,
  SystemLogSource,
} from '../models';
import { DEFAULT_TICKET_FORM } from '../models';
import {
  fetchSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  respondToTicket,
  deleteTicket,
  computeSupportStats,
  fetchUnifiedLogs,
  createSystemLog,
  type UnifiedLogEntry,
} from '../services/supportService';

export function useSupportLogsController() {
  const auth = getAuth();
  const adminUid = auth.currentUser?.uid ?? '';
  const adminName = auth.currentUser?.displayName ?? 'Admin';
  const adminEmail = auth.currentUser?.email ?? '';

  // ─── Top-level tab ───
  const [mainTab, setMainTab] = useState<SupportTab>('tickets');

  // ─── Tickets state ───
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ticket filters
  const [ticketTab, setTicketTab] = useState<TicketFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SupportTicketCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<SupportTicketPriority | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'updated'>('newest');

  // Ticket form modal
  const [formVisible, setFormVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [formData, setFormData] = useState<SupportTicketFormData>(DEFAULT_TICKET_FORM);
  const [tagInput, setTagInput] = useState('');

  // Ticket detail modal
  const [detailTicket, setDetailTicket] = useState<SupportTicket | null>(null);
  const [responseInput, setResponseInput] = useState('');

  // ─── Logs state ───
  const [logs, setLogs] = useState<UnifiedLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logLevelFilter, setLogLevelFilter] = useState<SystemLogLevel | 'all'>('all');
  const [logSourceFilter, setLogSourceFilter] = useState<SystemLogSource | 'all'>('all');
  const [logSearch, setLogSearch] = useState('');

  // ─── Fetch tickets ───
  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const data = await fetchSupportTickets();
      setTickets(data);
    } catch (e: any) {
      setTicketsError(e.message ?? 'Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  // ─── Fetch logs ───
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const data = await fetchUnifiedLogs(200);
      setLogs(data);
    } catch (e: any) {
      setLogsError(e.message ?? 'Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (mainTab === 'logs' && logs.length === 0 && !logsLoading) {
      fetchLogs();
    }
  }, [mainTab, logs.length, logsLoading, fetchLogs]);

  // ─── Computed stats ───
  const stats: SupportStats = useMemo(() => computeSupportStats(tickets), [tickets]);

  // ─── Filtered tickets ───
  const filteredTickets: SupportTicket[] = useMemo(() => {
    let result = [...tickets];

    // Tab filter
    if (ticketTab !== 'all') {
      result = result.filter((t) => t.status === ticketTab);
    }
    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }
    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.userEmail.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    // Sort
    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'priority': {
        const pr: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        result.sort((a, b) => (pr[a.priority] ?? 2) - (pr[b.priority] ?? 2));
        break;
      }
      case 'updated':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [tickets, ticketTab, categoryFilter, priorityFilter, searchQuery, sortBy]);

  // ─── Filtered logs ───
  const filteredLogs: UnifiedLogEntry[] = useMemo(() => {
    let result = [...logs];
    if (logLevelFilter !== 'all') {
      result = result.filter((l) => l.level === logLevelFilter);
    }
    if (logSourceFilter !== 'all') {
      result = result.filter((l) => l.source === logSourceFilter);
    }
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.actor.toLowerCase().includes(q),
      );
    }
    return result;
  }, [logs, logLevelFilter, logSourceFilter, logSearch]);

  // ─── Ticket form actions ───
  const openCreateForm = useCallback(() => {
    setEditingTicket(null);
    setFormData(DEFAULT_TICKET_FORM);
    setTagInput('');
    setFormVisible(true);
  }, []);

  const openEditForm = useCallback((ticket: SupportTicket) => {
    setEditingTicket(ticket);
    setFormData({
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      adminNotes: ticket.adminNotes,
      response: ticket.response,
      tags: [...ticket.tags],
    });
    setTagInput('');
    setFormVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setEditingTicket(null);
    setFormData(DEFAULT_TICKET_FORM);
    setTagInput('');
  }, []);

  const updateFormField = useCallback(
    <K extends keyof SupportTicketFormData>(key: K, value: SupportTicketFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (!tag) return;
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag],
    }));
    setTagInput('');
  }, [tagInput]);

  const removeTag = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  }, []);

  // ─── Save ticket ───
  const handleSave = useCallback(async () => {
    if (!formData.subject.trim()) return;
    setSubmitting(true);
    try {
      if (editingTicket) {
        await updateSupportTicket(editingTicket.id, formData);
        setTickets((prev) =>
          prev.map((t) =>
            t.id === editingTicket.id
              ? { ...t, ...formData, updatedAt: new Date().toISOString() }
              : t,
          ),
        );
      } else {
        const newId = await createSupportTicket(
          formData,
          adminUid,
          adminEmail,
          adminName,
        );
        const now = new Date().toISOString();
        setTickets((prev) => [
          {
            id: newId,
            ...formData,
            userId: adminUid,
            userEmail: adminEmail,
            userName: adminName,
            assignedTo: '',
            assignedToName: '',
            createdAt: now,
            updatedAt: now,
            resolvedAt: '',
          },
          ...prev,
        ]);
      }
      closeForm();
    } catch (e: any) {
      setTicketsError(e.message ?? 'Failed to save ticket');
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingTicket, adminUid, adminEmail, adminName, closeForm]);

  // ─── Quick status change ───
  const handleStatusChange = useCallback(
    async (ticketId: string, newStatus: SupportTicketStatus) => {
      setSubmitting(true);
      try {
        await updateTicketStatus(ticketId, newStatus);
        const now = new Date().toISOString();
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: newStatus,
                  updatedAt: now,
                  resolvedAt: newStatus === 'resolved' || newStatus === 'closed' ? now : t.resolvedAt,
                }
              : t,
          ),
        );
        if (detailTicket?.id === ticketId) {
          setDetailTicket((prev) =>
            prev
              ? {
                  ...prev,
                  status: newStatus,
                  updatedAt: now,
                  resolvedAt: newStatus === 'resolved' || newStatus === 'closed' ? now : prev.resolvedAt,
                }
              : null,
          );
        }
      } catch (e: any) {
        setTicketsError(e.message ?? 'Failed to update status');
      } finally {
        setSubmitting(false);
      }
    },
    [detailTicket],
  );

  // ─── Quick priority change ───
  const handlePriorityChange = useCallback(
    async (ticketId: string, newPriority: SupportTicketPriority) => {
      setSubmitting(true);
      try {
        await updateTicketPriority(ticketId, newPriority);
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, priority: newPriority, updatedAt: new Date().toISOString() } : t,
          ),
        );
      } catch (e: any) {
        setTicketsError(e.message ?? 'Failed to update priority');
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  // ─── Assign to self ───
  const handleAssignToMe = useCallback(
    async (ticketId: string) => {
      setSubmitting(true);
      try {
        await assignTicket(ticketId, adminUid, adminName);
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, assignedTo: adminUid, assignedToName: adminName, status: 'in_progress' as SupportTicketStatus, updatedAt: new Date().toISOString() }
              : t,
          ),
        );
      } catch (e: any) {
        setTicketsError(e.message ?? 'Failed to assign ticket');
      } finally {
        setSubmitting(false);
      }
    },
    [adminUid, adminName],
  );

  // ─── Send response ───
  const handleSendResponse = useCallback(
    async (ticketId: string) => {
      if (!responseInput.trim()) return;
      setSubmitting(true);
      try {
        await respondToTicket(ticketId, responseInput.trim());
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, response: responseInput.trim(), updatedAt: new Date().toISOString() } : t,
          ),
        );
        if (detailTicket?.id === ticketId) {
          setDetailTicket((prev) =>
            prev ? { ...prev, response: responseInput.trim(), updatedAt: new Date().toISOString() } : null,
          );
        }
        setResponseInput('');
      } catch (e: any) {
        setTicketsError(e.message ?? 'Failed to send response');
      } finally {
        setSubmitting(false);
      }
    },
    [responseInput, detailTicket],
  );

  // ─── Delete ticket ───
  const handleDelete = useCallback(async (ticketId: string) => {
    setSubmitting(true);
    try {
      await deleteTicket(ticketId);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (detailTicket?.id === ticketId) setDetailTicket(null);
    } catch (e: any) {
      setTicketsError(e.message ?? 'Failed to delete ticket');
    } finally {
      setSubmitting(false);
    }
  }, [detailTicket]);

  // ─── View ticket detail ───
  const openDetail = useCallback((ticket: SupportTicket) => {
    setDetailTicket(ticket);
    setResponseInput(ticket.response || '');
  }, []);

  const closeDetail = useCallback(() => {
    setDetailTicket(null);
    setResponseInput('');
  }, []);

  // ─── Log a system event ───
  const logSystemEvent = useCallback(
    async (level: SystemLogLevel, source: SystemLogSource, message: string, details: string = '') => {
      try {
        await createSystemLog(level, source, message, details, adminUid, adminName);
        // Refresh if on logs tab
        if (mainTab === 'logs') fetchLogs();
      } catch (e) {
        console.warn('[SupportLogs] Failed to write log:', e);
      }
    },
    [adminUid, adminName, mainTab, fetchLogs],
  );

  return {
    // Main tab
    mainTab,
    setMainTab,

    // Tickets
    tickets: filteredTickets,
    allTickets: tickets,
    stats,
    ticketsLoading,
    ticketsError,
    submitting,

    // Ticket filters
    ticketTab,
    setTicketTab,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sortBy,
    setSortBy,

    // Ticket form / modal
    formVisible,
    editingTicket,
    formData,
    tagInput,
    setTagInput,
    openCreateForm,
    openEditForm,
    closeForm,
    updateFormField,
    addTag,
    removeTag,
    handleSave,

    // Ticket detail
    detailTicket,
    responseInput,
    setResponseInput,
    openDetail,
    closeDetail,

    // Ticket actions
    handleStatusChange,
    handlePriorityChange,
    handleAssignToMe,
    handleSendResponse,
    handleDelete,

    // Logs
    logs: filteredLogs,
    allLogs: logs,
    logsLoading,
    logsError,
    logLevelFilter,
    setLogLevelFilter,
    logSourceFilter,
    setLogSourceFilter,
    logSearch,
    setLogSearch,
    logSystemEvent,

    // Refresh
    refreshTickets: fetchTickets,
    refreshLogs: fetchLogs,
  };
}

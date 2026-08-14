"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Copy, CheckCircle, Clock, AlertTriangle, UserCheck, Trophy, Users, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { format, differenceInCalendarDays } from "date-fns";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import Loading from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const parsedPage = parseInt(searchParams.get("page") || "1", 10);
  const initialPage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [queuePage, setQueuePage] = useState(initialPage);
  const initialLimit = parseInt(searchParams.get("limit") || "10", 10);
  const [queueItemsPerPage, setQueueItemsPerPage] = useState(isNaN(initialLimit) || initialLimit < 1 ? 10 : initialLimit);

  const fetchDashboard = () => {
    setLoading(true);
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(res => {
        if (res.success) setData(res.data);
      })
      .finally(() => {
        setLoading(false);
        setSelectedQueueIds([]); // Clear selection on reload
      });
  };

  const updateQueueUrl = (newPage: number, newLimit: number) => {
    const params = new URLSearchParams();
    if (newPage > 1) params.set("page", newPage.toString());
    if (newLimit !== 10) params.set("limit", newLimit.toString());
    const query = params.toString();
    router.replace(`/${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleQueuePageChange = (newPage: number) => {
    setQueuePage(newPage);
    setSelectedQueueIds([]);
    updateQueueUrl(newPage, queueItemsPerPage);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const p = parseInt(params.get("page") || "1", 10);
      const l = parseInt(params.get("limit") || "10", 10);
      setQueuePage(isNaN(p) || p < 1 ? 1 : p);
      setQueueItemsPerPage(isNaN(l) || l < 1 ? 10 : l);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleMarkSent = async (contact: any) => {
    let bodyPayload: any = {};
    let nextMessage = "";
    
    const steps = data.settings?.followUpSteps || [
      { id: "1", label: "First Follow-Up", interval: 5 },
      { id: "2", label: "Second Follow-Up", interval: 7 }
    ];

    if (contact.status === "Approached") {
      const firstStep = steps[0];
      bodyPayload = { status: firstStep ? firstStep.label : "First Follow-Up" };
      nextMessage = `Moved Queue to ${bodyPayload.status}`;
    } else {
      const currentIndex = steps.findIndex((s: any) => s.label === contact.status);
      if (currentIndex !== -1 && currentIndex < steps.length - 1) {
        const nextStep = steps[currentIndex + 1];
        bodyPayload = { status: nextStep.label };
        nextMessage = `Moved Queue to ${nextStep.label}`;
      } else {
        // Last step or unknown step - sequence complete!
        const lastStep = steps[steps.length - 1];
        bodyPayload = { status: lastStep ? lastStep.label : "Second Follow-Up" };
        nextMessage = "Sequence complete!";
      }
    }

    const loader = toast.loading(`Updating queue...`);
    try {
      const res = await fetch(`/api/contacts/${contact._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      if (res.ok) {
        toast.success(nextMessage, { id: loader });
        fetchDashboard(); // Refresh queue
      }
    } catch {
      toast.error("Failed to update status", { id: loader });
    }
  };

  const handleBulkMarkSent = async () => {
    if (selectedQueueIds.length === 0) return;
    const loader = toast.loading(`Updating ${selectedQueueIds.length} follow-ups...`);
    try {
      const res = await fetch(`/api/contacts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedQueueIds,
          action: "mark_sent"
        })
      });
      const json = await res.ok ? await res.json() : null;
      if (json && json.success) {
        toast.success(`Successfully updated ${selectedQueueIds.length} follow-ups!`, { id: loader });
        fetchDashboard();
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Failed to update status in bulk", { id: loader });
    }
  };

  const copyEmail = (contact: any) => {
    let textToCopy = "";
    let emailName = "";
    
    const steps = data.settings?.followUpSteps || [
      { id: "1", label: "First Follow-Up", interval: 5 },
      { id: "2", label: "Second Follow-Up", interval: 7 }
    ];

    if (contact.emailSequence && contact.emailSequence.length > 0) {
      let draftIndex = 1; // default to first follow-up (index 1) for 'Approached'
      if (contact.status !== "Approached") {
        const currentIndex = steps.findIndex((s: any) => s.label === contact.status);
        if (currentIndex !== -1) {
          draftIndex = currentIndex + 2;
        }
      }
      const draft = contact.emailSequence[draftIndex];
      if (draft) {
        textToCopy = draft.content;
        emailName = draft.label;
      }
    }

    // Fallback if sequence doesn't have the draft populated
    if (!textToCopy) {
      if (contact.status === "Approached") {
        textToCopy = contact.emails?.followUp1;
        emailName = "First Follow-Up";
      } else {
        const currentIndex = steps.findIndex((s: any) => s.label === contact.status);
        if (currentIndex !== -1) {
          const fieldMap: { [key: number]: string } = {
            0: "followUp2",
            1: "followUp3",
            2: "followUp4"
          };
          const fieldName = fieldMap[currentIndex] || `followUp${currentIndex + 2}`;
          textToCopy = contact.emails?.[fieldName];
          emailName = steps[currentIndex + 1]?.label || `Follow-Up ${currentIndex + 2}`;
        }
      }
    }

    if (!textToCopy) {
      toast.error(`No email drafted for ${emailName}`);
      return;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success("Draft copied to clipboard!");
    });
  };

  if (loading || !data) return (
    <div className="w-full space-y-8">
      <div className="text-center space-y-2">
        <Skeleton className="h-9 w-64 mx-auto" />
        <Skeleton className="h-4 w-80 mx-auto" />
      </div>
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-12" />
            </div>
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        ))}
      </div>
      {/* Queue skeleton */}
      <div>
        <Skeleton className="h-7 w-48 mb-4" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-5 h-5 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const { stats, queue } = data;
  const today = new Date();

  const totalQueuePages = Math.max(1, Math.ceil(queue.length / queueItemsPerPage));
  const safeQueuePage = Math.min(queuePage, totalQueuePages);
  const queueStartIndex = (safeQueuePage - 1) * queueItemsPerPage;
  const paginatedQueue = queue.slice(queueStartIndex, queueStartIndex + queueItemsPerPage);
  
  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 18) return "Good Afternoon!";
    return "Good Evening!";
  };

  return (
    <div className="w-full space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">{getGreeting()}</h1>
        <p className="text-gray-500 mt-1">Here's your sales outreach overview for today.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-gray-500">Total Contacts</p>
             <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalContacts}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
             <Users className="w-5 h-5 text-blue-600" />
           </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-orange-200 shadow-sm flex items-center justify-between ring-1 ring-orange-200">
           <div>
             <p className="text-sm font-medium text-orange-600">Due Today/Overdue</p>
             <p className="text-2xl font-bold text-orange-700 mt-1">{stats.dueTodayCount}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
             <Clock className="w-5 h-5 text-orange-600" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-emerald-600">Connected</p>
             <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.connectedCount}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
             <UserCheck className="w-5 h-5 text-emerald-600" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-purple-600">Closed Won</p>
             <p className="text-2xl font-bold text-purple-700 mt-1">{stats.closedWonCount}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
             <Trophy className="w-5 h-5 text-purple-600" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-sm font-medium text-red-600">Closed Lost</p>
             <p className="text-2xl font-bold text-red-700 mt-1">{stats.closedLostCount}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
             <XCircle className="w-5 h-5 text-red-600" />
           </div>
        </div>
      </div>

      {/* Action Queue */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Today's Action Queue</h2>
            {queue.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {queue.length} {queue.length === 1 ? 'contact' : 'contacts'} requiring follow-up
              </p>
            )}
          </div>
          {queue.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg shadow-sm">
                <span className="text-xs text-gray-400 font-medium select-none">Show</span>
                <select
                  value={queueItemsPerPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQueueItemsPerPage(val);
                    setQueuePage(1);
                    setSelectedQueueIds([]);
                    updateQueueUrl(1, val);
                  }}
                  className="border-none bg-transparent outline-none pr-1 font-semibold text-xs text-gray-700 cursor-pointer focus:ring-0 focus:border-none focus:outline-none"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={paginatedQueue.length > 0 && paginatedQueue.every((c: any) => selectedQueueIds.includes(c._id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const pageIds = paginatedQueue.map((c: any) => c._id);
                      setSelectedQueueIds(Array.from(new Set([...selectedQueueIds, ...pageIds])));
                    } else {
                      const pageIds = paginatedQueue.map((c: any) => c._id);
                      setSelectedQueueIds(selectedQueueIds.filter(id => !pageIds.includes(id)));
                    }
                  }}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                Select Page ({paginatedQueue.length})
              </label>
              {selectedQueueIds.length > 0 && (
                <button
                  onClick={handleBulkMarkSent}
                  className="bg-primary hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Selected Sent ({selectedQueueIds.length})
                </button>
              )}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {queue.length === 0 ? (
            <div className="p-12 pl-12 text-center flex flex-col items-center justify-center">
               <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                 <CheckCircle className="w-8 h-8 text-green-500" />
               </div>
               <h3 className="text-lg font-medium text-gray-900">Inbox Zero!</h3>
               <p className="text-gray-500 max-w-sm mt-1">No follow-ups due today. Check back tomorrow or add some new prospects.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {paginatedQueue.map((contact: any) => {
                const dueDate = new Date(contact.nextFollowUpDate);
                const daysOverdue = differenceInCalendarDays(today, dueDate);
                const isOverdue = daysOverdue > 0;

                return (
                  <li key={contact._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4 mt-0.5">
                      <div className="flex items-center h-5 mt-1">
                        <input
                          type="checkbox"
                          checked={selectedQueueIds.includes(contact._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQueueIds([...selectedQueueIds, contact._id]);
                            } else {
                              setSelectedQueueIds(selectedQueueIds.filter(id => id !== contact._id));
                            }
                          }}
                          className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                      </div>
                      <div className="mt-0.5 ml-1">
                        {isOverdue ? (
                           <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                        ) : (
                           <Clock className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                      <div>
                        <Link href={`/contacts/${contact._id}`} className="font-semibold text-gray-900 text-lg hover:text-primary transition-colors flex items-center gap-2 hover:underline">
                          {contact.firstName} {contact.lastName}
                        </Link>
                        <p className="text-sm text-gray-500">{contact.jobTitle} • {contact.niche}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {(() => {
                            const steps = data.settings?.followUpSteps || [
                              { label: "First Follow-Up" },
                              { label: "Second Follow-Up" }
                            ];
                            let dueLabel = "Follow-Up #1";
                            let colorClass = "bg-blue-50 text-blue-700";

                            if (contact.status === "Approached") {
                              dueLabel = "Follow-Up #1";
                              colorClass = "bg-blue-50 text-blue-700";
                            } else {
                              const idx = steps.findIndex((s: any) => s.label === contact.status);
                              if (idx !== -1) {
                                dueLabel = `Follow-Up #${idx + 2}`;
                                const colors = [
                                  "bg-yellow-50 text-yellow-700", // Follow-up 2
                                  "bg-orange-50 text-orange-700", // Follow-up 3
                                  "bg-red-50 text-red-700",       // Follow-up 4
                                  "bg-purple-50 text-purple-700"  // Follow-up 5
                                ];
                                colorClass = colors[idx] || "bg-yellow-50 text-yellow-700";
                              }
                            }

                            return (
                              <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", colorClass)}>
                                Due: {dueLabel}
                              </span>
                            );
                          })()}
                          {isOverdue && (
                             <span className="text-xs text-red-600 font-medium">
                               {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                             </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex sm:flex-col md:flex-row items-center gap-3 ml-9 md:ml-0">
                      <button 
                        onClick={() => copyEmail(contact)}
                        className="w-full justify-center md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <Copy className="w-4 h-4" /> Copy Email
                      </button>
                      <button 
                        onClick={() => handleMarkSent(contact)}
                        className="w-full justify-center md:w-auto px-4 py-2 border border-transparent bg-primary text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Mark Sent
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination Controls */}
          {queue.length > queueItemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 bg-gray-50">
              <div>
                Showing <span className="font-medium">{queueStartIndex + 1}</span> to <span className="font-medium">{Math.min(queueStartIndex + queueItemsPerPage, queue.length)}</span> of <span className="font-medium">{queue.length}</span> follow-ups due
                {selectedQueueIds.length > 0 && (
                  <span className="ml-3 text-primary font-medium">({selectedQueueIds.length} selected)</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button 
                  onClick={() => {
                    if (safeQueuePage > 1) {
                      handleQueuePageChange(safeQueuePage - 1);
                    }
                  }} 
                  disabled={safeQueuePage <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white font-medium text-xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                {Array.from({ length: totalQueuePages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalQueuePages || Math.abs(p - safeQueuePage) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-gray-400 select-none">...</span>
                      )}
                      <button
                        onClick={() => handleQueuePageChange(p)}
                        className={clsx(
                          "w-8 h-8 flex items-center justify-center rounded text-xs font-semibold transition-colors border",
                          safeQueuePage === p
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                        )}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button 
                  onClick={() => {
                    if (safeQueuePage < totalQueuePages) {
                      handleQueuePageChange(safeQueuePage + 1);
                    }
                  }} 
                  disabled={safeQueuePage >= totalQueuePages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white font-medium text-xs"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

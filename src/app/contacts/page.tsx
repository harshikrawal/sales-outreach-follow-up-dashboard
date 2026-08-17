"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Search, Users as UsersIcon, ChevronLeft, ChevronRight, Download, Upload, Check, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import toast from "react-hot-toast";
import Papa from "papaparse";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Loading from "@/components/ui/loading";

function ContactsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial values from search params
  const parsedPage = parseInt(searchParams.get("page") || "1", 10);
  const initialPage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const initialFilter = searchParams.get("status") || "All Contacts";
  const initialSearch = searchParams.get("search") || "";

  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState(initialFilter);
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const initialLimit = parseInt(searchParams.get("limit") || "10", 10);
  const [itemsPerPage, setItemsPerPage] = useState(isNaN(initialLimit) || initialLimit < 1 ? 10 : initialLimit);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [statuses, setStatuses] = useState<string[]>([
    "All Contacts",
    "Approached",
    "First Follow-Up",
    "Second Follow-Up",
    "Connected",
    "Lost",
    "Closed Won"
  ]);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          const steps = res.data.followUpSteps || [];
          const dynamicStatuses = [
            "All Contacts",
            "Approached",
            ...steps.map((s: any) => s.label),
            "Connected",
            "Lost",
            "Closed Won"
          ];
          setStatuses(Array.from(new Set(dynamicStatuses)));
        }
      })
      .catch(() => {});
  }, []);

  const fetchContacts = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (search) query.append("search", search);
    if (filter !== "All Contacts") query.append("status", filter);
    if (startDate) query.append("startDate", startDate.toISOString());
    if (endDate) query.append("endDate", endDate.toISOString());

    fetch(`/api/contacts?${query.toString()}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) setContacts(res.data);
      })
      .finally(() => setLoading(false));
  };

  const updateUrl = (newFilter: string, newPage: number, newSearch: string, newLimit: number) => {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newFilter && newFilter !== "All Contacts") params.set("status", newFilter);
    if (newPage > 1) params.set("page", newPage.toString());
    if (newLimit !== 10) params.set("limit", newLimit.toString());
    
    const query = params.toString();
    router.replace(`/contacts${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleFilterChange = (newStatus: string) => {
    setFilter(newStatus);
    setCurrentPage(1);
    setSelectedIds([]);
    updateUrl(newStatus, 1, search, itemsPerPage);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setCurrentPage(1);
    updateUrl(filter, 1, newSearch, itemsPerPage);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedIds([]);
    updateUrl(filter, newPage, search, itemsPerPage);
  };

  // Fetch contacts whenever search, filter, or dates change
  useEffect(() => {
    fetchContacts();
  }, [search, filter, startDate, endDate]);

  // Listen to browser Back/Forward navigation to restore page & filter
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const p = parseInt(params.get("page") || "1", 10);
      const s = params.get("status") || "All Contacts";
      const q = params.get("search") || "";
      const l = parseInt(params.get("limit") || "10", 10);
      setCurrentPage(isNaN(p) || p < 1 ? 1 : p);
      setFilter(s);
      setSearch(q);
      setItemsPerPage(isNaN(l) || l < 1 ? 10 : l);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const totalPages = Math.max(1, Math.ceil(contacts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const currentContacts = contacts.slice(startIndex, startIndex + itemsPerPage);

  const handlePrev = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // --- IMPORT / EXPORT LOGIC ---
  const downloadCSV = (dataToExport: any[], filename: string) => {
    const csvData = dataToExport.map(c => ({
      "First Name": c.firstName,
      "Last Name": c.lastName,
      "Email": c.email,
      "Job Title": c.jobTitle || "",
      "Contact Owner": c.contactOwner || "",
      "Contact Source": c.contactSource || "",
      "Niche": c.niche || "",
      "LinkedIn URL": c.linkedinUrl || "",
      "Email Sequence": [
        c.emails?.outreach ? `Email 1 — Approach\n${c.emails.outreach}` : "",
        c.emails?.followUp1 ? `Email 2 — FU1\n${c.emails.followUp1}` : "",
        c.emails?.followUp2 ? `Email 3 — FU2\n${c.emails.followUp2}` : "",
      ].filter(Boolean).join("\n\n") || "",
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    let dataToExport = contacts;
    if (selectedIds.length > 0) {
      dataToExport = contacts.filter(c => selectedIds.includes(c._id));
    }
    toast.success(selectedIds.length > 0 ? 'Exporting selected...' : 'Exporting entries...');
    downloadCSV(dataToExport, selectedIds.length > 0 ? 'selected_contacts.csv' : 'contacts.csv');
  };

  const handleBulkDelete = async () => {
    setShowDeleteModal(false);
    const loader = toast.loading("Deleting contacts...");
    try {
      const res = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        toast.success("Contacts deleted successfully", { id: loader });
        setSelectedIds([]);
        fetchContacts();
      } else {
        toast.error("Failed to delete contacts", { id: loader });
      }
    } catch {
      toast.error("Error connecting to server", { id: loader });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsed = results.data;
        const formatted = parsed.map((row: any) => {
          // Parse the Email Sequence column using same logic as Add Contact
          let emails: { outreach?: string; followUp1?: string; followUp2?: string } = {};
          const raw: string = row["Email Sequence"] || "";
          if (raw.trim()) {
            const split2 = raw.match(/Email\s*2/i);
            const split3 = raw.match(/Email\s*3/i);
            if (split2 && split3) {
              emails.outreach   = raw.substring(0, split2.index!).trim();
              emails.followUp1  = raw.substring(split2.index!, split3.index!).trim();
              emails.followUp2  = raw.substring(split3.index!).trim();
            } else if (split2) {
              emails.outreach  = raw.substring(0, split2.index!).trim();
              emails.followUp1 = raw.substring(split2.index!).trim();
            } else {
              emails.outreach = raw.trim();
            }
          }

          return {
            firstName:     row["First Name"],
            lastName:      row["Last Name"],
            email:         row["Email"],
            jobTitle:      row["Job Title"],
            contactOwner:  row["Contact Owner"],
            contactSource: row["Contact Source"],
            niche:         row["Niche"],
            linkedinUrl:   row["LinkedIn URL"],
            ...(Object.keys(emails).length > 0 ? { emails } : {}),
          };
        });

        const loader = toast.loading("Importing contacts...");
        try {
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formatted)
          });
          if (res.ok) {
            toast.success("Contacts imported successfully", { id: loader });
            fetchContacts();
          } else {
            const err = await res.json();
            toast.error(err.error || "Failed to import", { id: loader });
          }
        } catch {
          toast.error("Error connecting to server", { id: loader });
        }
        
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  return (
    <div className="px-2">
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-primary" />
            Contacts
          </h1>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Manage your network and review follow-up plans.
          </p>
          <div className="w-full max-w-sm">
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update: any) => {
                setDateRange(update);
              }}
              isClearable={true}
              placeholderText="Select date range..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 focus:ring-primary focus:border-primary shadow-sm outline-none bg-white cursor-pointer"
            />
          </div>
        </div>
        
        <div className="flex flex-col md:items-end gap-3 flex-shrink-0 w-full md:w-auto">
          <div className="flex flex-wrap gap-2 justify-start md:justify-end">
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
            />
            <button
              onClick={handleExport}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <Upload className="w-4 h-4" /> Export
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" /> Import CSV
            </button>

            <Link
              href="/contacts/new"
              className="bg-primary hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ml-2 md:ml-0"
            >
              + Add Contact
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col xl:flex-row gap-4 justify-between items-center bg-gray-50">
          <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 hide-scrollbar shrink-0">
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                  filter === status
                    ? "bg-primary text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 w-full xl:w-auto flex-shrink-0">
            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" /> Bulk Delete ({selectedIds.length})
              </button>
            )}
            
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg shadow-sm">
              <span className="text-xs text-gray-400 font-medium select-none">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setItemsPerPage(val);
                  setCurrentPage(1);
                  updateUrl(filter, 1, search, val);
                }}
                className="border-none bg-transparent outline-none pr-1 font-semibold text-xs text-gray-700 cursor-pointer focus:ring-0 focus:border-none focus:outline-none"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase w-12 border-r border-gray-100 text-center">#</th>
                <th className="px-4 py-3 w-12 text-center border-r border-gray-100">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer appearance-none w-4 h-4 border border-gray-300 rounded bg-white checked:bg-primary checked:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer shadow-inner"
                      checked={contacts.length > 0 && selectedIds.length === contacts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(contacts.map(c => c._id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                    <Check className="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                  </div>
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Title / Niche</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Added</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Next Follow-Up</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 border-r border-gray-50 text-center">
                      <Skeleton className="h-4 w-6 mx-auto" />
                    </td>
                    <td className="px-4 py-4 border-r border-gray-50">
                      <Skeleton className="h-4 w-4 mx-auto rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-36 mb-1" />
                      <Skeleton className="h-3 w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No contacts found matching your criteria.
                  </td>
                </tr>
              ) : (
                currentContacts.map((contact, index) => (
                  <tr key={contact._id} className={clsx("transition-colors cursor-pointer group", selectedIds.includes(contact._id) ? "bg-orange-50/50" : "hover:bg-gray-50")} onClick={() => router.push(`/contacts/${contact._id}`)}>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium border-r border-gray-50 text-center">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-4 py-4 text-center border-r border-gray-50" onClick={(e) => e.stopPropagation()}>
                       <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="peer appearance-none w-4 h-4 border border-gray-300 rounded bg-white checked:bg-primary checked:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-inner"
                          checked={selectedIds.includes(contact._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, contact._id]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== contact._id));
                            }
                          }}
                        />
                        <Check className="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</div>
                      <div className="text-gray-500 text-xs">{contact.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{contact.jobTitle || 'No Title'}</div>
                      <div className="text-gray-500 text-xs">{contact.niche}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2.5 py-1 text-xs font-medium rounded-full",
                        contact.status === 'Approached' && "bg-blue-50 text-blue-700",
                        contact.status === 'First Follow-Up' && "bg-yellow-50 text-yellow-700",
                        contact.status === 'Second Follow-Up' && "bg-orange-50 text-orange-700",
                        contact.status === 'Connected' && "bg-green-50 text-green-700",
                        contact.status === 'Closed Won' && "bg-emerald-100 text-emerald-800",
                        contact.status === 'Lost' && "bg-gray-100 text-gray-700"
                      )}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(contact.dateAdded), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {contact.nextFollowUpDate ? format(new Date(contact.nextFollowUpDate), 'MMM d, yyyy') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && contacts.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 bg-gray-50">
            <div>
              Showing <span className="font-medium">{contacts.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, contacts.length)}</span> of <span className="font-medium">{contacts.length}</span> entries
              {selectedIds.length > 0 && (
                <span className="ml-3 text-primary font-medium">({selectedIds.length} rows selected)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button 
                onClick={handlePrev} 
                disabled={safeCurrentPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white font-medium text-xs"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-gray-400 select-none">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(p)}
                      className={clsx(
                        "w-8 h-8 flex items-center justify-center rounded text-xs font-semibold transition-colors border",
                        safeCurrentPage === p
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      )}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button 
                onClick={handleNext} 
                disabled={safeCurrentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white font-medium text-xs"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Bulk Delete"
        footer={
          <>
            <Button
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-none border-solid"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={handleBulkDelete}
            >
              Delete {selectedIds.length} Contacts
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 text-red-600 mb-2">
          <Trash2 className="w-5 h-5" />
          <span className="font-semibold">Are you absolutely sure?</span>
        </div>
        <p className="text-sm text-gray-500">
          This action will permanently delete <span className="font-bold text-gray-900">{selectedIds.length}</span> selected contacts.
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ContactsPageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import Loading from "@/components/ui/loading";
import { Search, Users as UsersIcon, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Contacts");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const Statuses = [
    "All Contacts",
    "Approached",
    "First Follow-Up",
    "Second Follow-Up",
    "Connected",
    "Lost",
    "Closed Won"
  ];

  const fetchContacts = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (search) query.append("search", search);
    if (filter !== "All Contacts") query.append("status", filter);

    fetch(`/api/contacts?${query.toString()}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) setContacts(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContacts();
    setCurrentPage(1); // Reset page when search or filter changes
  }, [search, filter]);

  const totalPages = Math.ceil(contacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentContacts = contacts.slice(startIndex, startIndex + itemsPerPage);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="px-2">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-primary" />
            Contacts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your network and review follow-up plans.
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="bg-primary hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Contact
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {Statuses.map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
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

          <div className="relative w-full sm:w-72 flex-shrink-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary shadow-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase w-12">#</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Title / Niche</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Added</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Next Follow-Up</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <Loading />
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No contacts found matching your criteria.
                  </td>
                </tr>
              ) : (
                currentContacts.map((contact, index) => (
                  <tr key={contact._id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => window.location.href=`/contacts/${contact._id}`}>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {startIndex + index + 1}
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
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600 bg-gray-50">
            <div>
              Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, contacts.length)}</span> of <span className="font-medium">{contacts.length}</span> entries
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handlePrev} 
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white font-medium"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button 
                onClick={handleNext} 
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white font-medium"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

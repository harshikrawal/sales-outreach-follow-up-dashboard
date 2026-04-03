"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Copy, CheckCircle, Clock, AlertTriangle, UserCheck, Trophy, Users, XCircle } from "lucide-react";
import clsx from "clsx";
import { format, differenceInCalendarDays } from "date-fns";
import Link from "next/link";

import Loading from "@/components/ui/loading";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = () => {
    setLoading(true);
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(res => {
        if (res.success) setData(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleMarkSent = async (contact: any) => {
    let bodyPayload: any = {};
    let nextMessage = "";
    
    if (contact.status === "Approached") {
      bodyPayload = { status: "First Follow-Up" };
      nextMessage = "Moved Queue to First Follow-Up";
    } else if (contact.status === "First Follow-Up") {
      bodyPayload = { status: "Second Follow-Up" };
      nextMessage = "Sequence complete!";
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

  const copyEmail = (contact: any) => {
    let textToCopy = "";
    let emailName = "";
    
    if (contact.status === "Approached") {
      textToCopy = contact.emails?.followUp1;
      emailName = "Follow-Up 1";
    } else if (contact.status === "First Follow-Up") {
      textToCopy = contact.emails?.followUp2;
      emailName = "Follow-Up 2";
    }

    if (!textToCopy) {
      toast.error(`No email drafted for ${emailName}`);
      return;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success("Draft copied to clipboard!");
    });
  };

  if (loading || !data) return <Loading />;

  const { stats, queue } = data;
  const today = new Date();
  
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
        <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Action Queue</h2>
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
              {queue.map((contact: any) => {
                const dueDate = new Date(contact.nextFollowUpDate);
                const daysOverdue = differenceInCalendarDays(today, dueDate);
                const isOverdue = daysOverdue > 0;

                return (
                  <li key={contact._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4 mt-0.5">
                      <div className="mt-0.5">
                        {isOverdue ? (
                           <AlertTriangle className="w-5 h-5 text-red-500" />
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
                          <span className={clsx(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            contact.status === "Approached" ? "bg-blue-50 text-blue-700" : "bg-yellow-50 text-yellow-700"
                          )}>
                            Due: {contact.status === "Approached" ? "Follow-Up #1" : "Follow-Up #2"}
                          </span>
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
        </div>
      </div>
    </div>
  );
}

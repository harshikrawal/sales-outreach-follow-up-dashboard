"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { ArrowLeft, User, Copy, CheckCircle2, ChevronDown, Trash2, Pencil, X, Plus } from "lucide-react";

import Loading from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [contact, setContact] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Email sequence state
  const [emailSequence, setEmailSequence] = useState<any[]>([]);

  const steps = settings?.followUpSteps || [
    { label: "First Follow-Up" },
    { label: "Second Follow-Up" }
  ];

  const statusOptions = Array.from(new Set([
    "Approached",
    ...steps.map((s: any) => s.label),
    "Connected",
    "Lost",
    "Closed Won"
  ]));

  // Edit details state
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    contactOwner: "",
    contactSource: "",
    niche: "",
    linkedinUrl: ""
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/contacts/${unwrappedParams.id}`).then(res => res.json()),
      fetch("/api/settings").then(res => res.json())
    ]).then(([contactRes, settingsRes]) => {
      if (settingsRes.success) setSettings(settingsRes.data);
      
      if (contactRes.success) {
        setContact(contactRes.data);
        let seq = contactRes.data.emailSequence;
        if (!seq || seq.length === 0) {
          seq = [
            { id: "1", label: "Initial Outreach", content: contactRes.data.emails?.outreach || "" },
            { id: "2", label: "First Follow-Up", content: contactRes.data.emails?.followUp1 || "" },
            { id: "3", label: "Second Follow-Up (Break-up)", content: contactRes.data.emails?.followUp2 || "" },
            { id: "4", label: "Third Follow-Up", content: contactRes.data.emails?.followUp3 || "" },
            { id: "5", label: "Fourth Follow-Up", content: contactRes.data.emails?.followUp4 || "" },
          ].filter((item: any, idx: number) => idx < 3 || item.content !== "");
        }
        setEmailSequence(seq);
        
        setEditForm({
          firstName: contactRes.data.firstName || "",
          lastName: contactRes.data.lastName || "",
          email: contactRes.data.email || "",
          jobTitle: contactRes.data.jobTitle || "",
          contactOwner: contactRes.data.contactOwner || "",
          contactSource: contactRes.data.contactSource || "",
          niche: contactRes.data.niche || "",
          linkedinUrl: contactRes.data.linkedinUrl || "",
        });
      } else {
        toast.error("Contact not found");
        router.push("/contacts");
      }
    })
    .finally(() => setLoading(false));
  }, [unwrappedParams.id, router]);

  const updateContact = async (updates: any, silent = false) => {
    const loader = silent ? undefined : toast.loading("Updating...");
    try {
      const res = await fetch(`/api/contacts/${unwrappedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) {
        setContact(json.data);
        if (!silent) toast.success("Updated successfully!", { id: loader });
      } else {
        throw new Error(json.error);
      }
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Update failed", { id: loader });
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateContact({ status: e.target.value });
  };

  const handleSaveEmails = () => {
    updateContact({ 
      emailSequence
    });
  };

  const handleSaveDetails = () => {
    updateContact(editForm);
    setEditMode(false);
  };

  const copyToClipboard = (text: string) => {
    if (!text) {
      toast.error("Nothing to copy!");
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy");
    });
  };

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    toast.loading("Deleting...", { id: "del" });
    try {
      const res = await fetch(`/api/contacts/${unwrappedParams.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Deleted", { id: "del" });
        router.push("/contacts");
      }
    } catch (e) {
      toast.error("Delete failed", { id: "del" });
    }
  }

  if (loading || !contact) return <Loading />;

  const contactSources = settings?.contactSources?.filter((s: any) => s.active) || [];
  const niches = settings?.niches?.filter((n: any) => n.active) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-4 border-none bg-transparent outline-none cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 line-clamp-1">{contact.firstName} {contact.lastName}</h1>
              <p className="text-sm text-gray-500 line-clamp-1">{contact.jobTitle} • {contact.niche}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
             <div className="relative">
              <select 
                value={contact.status} 
                onChange={handleStatusChange}
                className="appearance-none pl-4 pr-10 py-2 border border-orange-200 bg-orange-50 text-orange-800 font-semibold rounded-lg text-sm focus:ring-primary focus:border-primary shadow-sm outline-none cursor-pointer"
              >
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-orange-800 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button onClick={() => setDeleteDialogOpen(true)} title="Delete Contact" className="p-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Details & Timeline */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4 relative">
            <h2 className="font-semibold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-2">
              <span>Contact Details</span>
              <button 
                onClick={() => setEditMode(!editMode)} 
                className="text-xs flex items-center gap-1 text-primary hover:text-orange-700 font-medium bg-orange-50 px-2 py-1 rounded"
              >
                {editMode ? <><X className="w-3 h-3"/> Cancel</> : <><Pencil className="w-3 h-3"/> Edit</>}
              </button>
            </h2>

            {editMode ? (
              <div className="space-y-3 text-sm animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-gray-500 text-xs block mb-1">First Name *</label>
                  <input value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1">Last Name</label>
                  <input value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1">Email *</label>
                  <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1">Job Title</label>
                  <input value={editForm.jobTitle} onChange={e => setEditForm({...editForm, jobTitle: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1">Niche</label>
                  <select value={editForm.niche} onChange={e => setEditForm({...editForm, niche: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                     <option value="">Select...</option>
                     {niches.map((n: any) => <option key={n.id} value={n.label}>{n.label}</option>)}
                     {/* Preserve existing even if disabled */}
                     {editForm.niche && !niches.find((n:any)=>n.label === editForm.niche) && <option value={editForm.niche}>{editForm.niche}</option>}
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1">Source</label>
                  <select value={editForm.contactSource} onChange={e => setEditForm({...editForm, contactSource: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                     <option value="">Select...</option>
                     {contactSources.map((s: any) => <option key={s.id} value={s.label}>{s.label}</option>)}
                     {editForm.contactSource && !contactSources.find((s:any)=>s.label === editForm.contactSource) && <option value={editForm.contactSource}>{editForm.contactSource}</option>}
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1">Owner</label>
                  <input value={editForm.contactOwner} onChange={e => setEditForm({...editForm, contactOwner: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1">LinkedIn URL</label>
                  <input value={editForm.linkedinUrl} onChange={e => setEditForm({...editForm, linkedinUrl: e.target.value})} className="w-full border border-gray-200 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="pt-2">
                  <button onClick={handleSaveDetails} className="w-full bg-primary hover:bg-orange-700 text-white rounded py-2 text-sm font-medium transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm animate-in fade-in">
                <div>
                  <label className="text-gray-500 text-xs">Email</label>
                  <div className="font-medium text-gray-900 break-all">{contact.email}</div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">LinkedIn URL</label>
                  <div className="font-medium text-primary hover:underline break-all">
                    {contact.linkedinUrl ? <a href={contact.linkedinUrl} target="_blank" rel="noreferrer">{contact.linkedinUrl}</a> : '-'}
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Source</label>
                  <div className="font-medium text-gray-900">{contact.contactSource}</div>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Owner</label>
                  <div className="font-medium text-gray-900">{contact.contactOwner}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
             <h2 className="font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              Follow-up Timeline
            </h2>
             <div className="space-y-4 text-sm mt-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
               
               <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-gray-200 text-slate-500 font-bold shrink-0 z-10 mx-0 md:mx-auto">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded border border-gray-100 bg-gray-50 ml-3 md:ml-0 md:mr-3">
                     <div className="text-xs text-gray-500">Date Added</div>
                     <div className="font-medium text-gray-900">{format(new Date(contact.dateAdded), 'MMM d, yyyy')}</div>
                  </div>
               </div>

                <div className="relative flex items-center justify-between md:justify-normal md:even:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-gray-200 text-slate-500 font-bold shrink-0 z-10 mx-0 md:mx-auto">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                   <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded border border-gray-100 bg-gray-50 ml-3 md:ml-0 md:mr-3">
                     <div className="text-xs text-gray-500">Status Changed</div>
                     <div className="font-medium text-gray-900">{format(new Date(contact.statusChangedDate), 'MMM d, h:mm a')}</div>
                  </div>
               </div>

               {contact.nextFollowUpDate && (
                 <div className="relative flex items-center justify-between md:justify-normal md:even:flex-row-reverse group is-active mt-4">
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded border border-orange-200 bg-orange-50 ml-3 md:ml-0 md:mr-3">
                     <div className="text-xs text-orange-700 font-semibold">Next Follow-Up Due</div>
                     <div className="font-bold text-orange-900 text-base">{format(new Date(contact.nextFollowUpDate), 'MMM d, yyyy')}</div>
                  </div>
               </div>
               )}
            </div>
          </div>
        </div>

        {/* Right Column - Email Sequences */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Email Sequence Drafts</h2>
                <p className="text-sm text-gray-500">Draft, store, and copy your outreach messages.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const stepNames = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh"];
                    const nextIndex = emailSequence.length;
                    const name = nextIndex === 0 
                      ? "Initial Outreach" 
                      : `${stepNames[nextIndex - 1] || nextIndex} Follow-Up`;
                    setEmailSequence([
                      ...emailSequence,
                      {
                        id: Math.random().toString(36).substr(2, 9),
                        label: name,
                        content: ""
                      }
                    ]);
                  }}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Email
                </button>
                <button onClick={handleSaveEmails} className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Save Drafts
                </button>
              </div>
            </div>
            <div className="space-y-6">
               {emailSequence.map((step, index) => (
                 <div key={step.id || index} className="space-y-2 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                   <div className="flex justify-between items-center">
                     <div className="flex-1 mr-4">
                       <input 
                         type="text"
                         value={step.label}
                         onChange={e => {
                           const newSeq = [...emailSequence];
                           newSeq[index].label = e.target.value;
                           setEmailSequence(newSeq);
                         }}
                         className="font-semibold text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-primary px-1 py-0.5 outline-none bg-transparent w-full text-sm"
                       />
                     </div>
                     <div className="flex items-center gap-3">
                       <button onClick={() => copyToClipboard(step.content)} className="text-primary hover:text-orange-700 text-xs font-medium flex items-center gap-1">
                         <Copy className="w-3.5 h-3.5" /> Copy Text
                       </button>
                       {emailSequence.length > 1 && (
                         <button 
                           onClick={() => {
                             const newSeq = emailSequence.filter((_, i) => i !== index);
                             setEmailSequence(newSeq);
                           }} 
                           className="text-red-500 hover:text-red-700"
                           title="Delete Email Draft"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                     </div>
                   </div>
                   <textarea 
                     rows={index === 0 ? 5 : 4} 
                     value={step.content}
                     onChange={e => {
                       const newSeq = [...emailSequence];
                       newSeq[index].content = e.target.value;
                       setEmailSequence(newSeq);
                     }}
                     className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-primary focus:border-primary shadow-sm"
                     placeholder={index === 0 ? "Hi [Name], I noticed..." : "Just checking in..."}
                    />
                 </div>
               ))}
               {emailSequence.length === 0 && (
                 <p className="text-sm text-gray-500 italic text-center py-8">No email drafts configured.</p>
               )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Contact"
        footer={
          <>
            <Button
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-none border-solid"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={confirmDelete}
            >
              Yes, delete contact
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-500 leading-relaxed">
          This action cannot be undone. This will permanently delete 
          <span className="font-semibold text-gray-900"> {contact.firstName} {contact.lastName}</span> from our servers and remove all associated data.
        </p>
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Loading from "@/components/ui/loading";

type NewContactForm = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  contactOwner: string;
  contactSource: string;
  niche: string;
  linkedinUrl: string;
  rawEmailSequence?: string;
};

export default function AddContactPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm<NewContactForm>({
    defaultValues: {
      contactOwner: "Parth Kotadiya", // Pre-filled per requirements
    }
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data);
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (data: NewContactForm) => {
    const loadingToast = toast.loading("Adding contact...");
    try {
      const payload: any = { ...data };
      
      if (data.rawEmailSequence) {
        let outreach = "";
        let followUp1 = "";
        let followUp2 = "";
        const raw = data.rawEmailSequence;
        
        // Split by "Email 2" and "Email 3" markers case insensitive
        const split2Item = raw.match(/Email\s*2/i);
        const split3Item = raw.match(/Email\s*3/i);

        if (split2Item && split3Item) {
           const idx2 = split2Item.index!;
           const idx3 = split3Item.index!;
           
           outreach = raw.substring(0, idx2).trim();
           followUp1 = raw.substring(idx2, idx3).trim();
           followUp2 = raw.substring(idx3).trim();
        } else {
           outreach = raw.trim();
        }

        payload.emails = {
          outreach,
          followUp1,
          followUp2
        };
      }
      delete payload.rawEmailSequence;

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success("Contact added successfully", { id: loadingToast });
        router.push("/contacts");
      } else {
        throw new Error(json.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to add contact", { id: loadingToast });
    }
  };

  if (loading) return <Loading />;

  const contactSources = settings?.contactSources?.filter((s: any) => s.active) || [];
  const niches = settings?.niches?.filter((n: any) => n.active) || [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/contacts" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Contacts
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-primary" />
          Add New Contact
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a new prospect. Next follow-up dates are calculated automatically.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                {...register("firstName", { required: "First name is required" })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
            </div>
            
            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                {...register("lastName", { required: "Last name is required" })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                {...register("email", { required: "Email is required" })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                {...register("jobTitle")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Contact Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Source *</label>
              <select
                {...register("contactSource", { required: "Source is required" })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              >
                <option value="">Select a source...</option>
                {contactSources.map((source: any) => (
                  <option key={source.id} value={source.label}>{source.label}</option>
                ))}
              </select>
              {errors.contactSource && <p className="text-xs text-red-500 mt-1">{errors.contactSource.message}</p>}
            </div>

            {/* Niche */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niche *</label>
              <select
                {...register("niche", { required: "Niche is required" })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              >
                <option value="">Select a niche...</option>
                {niches.map((niche: any) => (
                  <option key={niche.id} value={niche.label}>{niche.label}</option>
                ))}
              </select>
              {errors.niche && <p className="text-xs text-red-500 mt-1">{errors.niche.message}</p>}
            </div>

            {/* LinkedIn URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                {...register("linkedinUrl")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
                placeholder="https://linkedin.com/in/..."
              />
            </div>

             {/* Contact Owner */}
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Owner *</label>
              <input
                {...register("contactOwner", { required: true })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary bg-gray-50"
              />
            </div>
            
            {/* Raw Email Sequence Paste */}
            <div className="col-span-2 mt-4 pt-6 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-900 mb-1">Generated Email Sequence</label>
              <p className="text-xs text-gray-500 mb-3">Paste the complete 3-part email sequence here. It will be automatically split into Approach, Follow-up 1, and Follow-up 2 segments based on "Email 2" and "Email 3" headers.</p>
              <textarea
                {...register("rawEmailSequence")}
                rows={12}
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:ring-primary focus:border-primary font-mono text-gray-700 shadow-sm leading-relaxed"
                placeholder="Email 1 — Approach Subject: 20 years of Exposyour...&#10;&#10;Hi [User],&#10;...&#10;&#10;Email 2 — FU1 (5 days later)...&#10;&#10;Email 3 — FU2..."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="bg-primary hover:bg-orange-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Save Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

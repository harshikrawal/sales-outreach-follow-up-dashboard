"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { Settings as SettingsIcon, Save, Plus, Trash2, GripVertical } from "lucide-react";
import Loading from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";

type DynamicOption = {
  id: string;
  label: string;
  active: boolean;
  order: number;
};

type FollowUpStep = {
  id: string;
  label: string;
  interval: number;
};

type SettingsData = {
  firstFollowUpInterval: number;
  secondFollowUpInterval: number;
  contactSources: DynamicOption[];
  niches: DynamicOption[];
  followUpSteps: FollowUpStep[];
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  const { register, control, handleSubmit, reset } = useForm<SettingsData>({
    defaultValues: {
      firstFollowUpInterval: 5,
      secondFollowUpInterval: 7,
      contactSources: [],
      niches: [],
      followUpSteps: [],
    },
  });

  const { fields: sourceFields, append: appendSource, remove: removeSource } = useFieldArray({
    control,
    name: "contactSources",
  });

  const { fields: nicheFields, append: appendNiche, remove: removeNiche } = useFieldArray({
    control,
    name: "niches",
  });

  const { fields: followUpFields, append: appendFollowUp, remove: removeFollowUp } = useFieldArray({
    control,
    name: "followUpSteps",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          const data = { ...res.data };
          if (!data.followUpSteps || data.followUpSteps.length === 0) {
            data.followUpSteps = [
              { id: '1', label: 'First Follow-Up', interval: data.firstFollowUpInterval || 5 },
              { id: '2', label: 'Second Follow-Up', interval: data.secondFollowUpInterval || 7 }
            ];
          }
          reset(data);
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: SettingsData) => {
    const payload = {
      ...data,
      firstFollowUpInterval: data.followUpSteps[0]?.interval ?? data.firstFollowUpInterval ?? 5,
      secondFollowUpInterval: data.followUpSteps[1]?.interval ?? data.secondFollowUpInterval ?? 7,
    };
    const loadingToast = toast.loading("Saving settings...");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success("Settings saved successfully", { id: loadingToast });
      } else {
        throw new Error();
      }
    } catch (e) {
      toast.error("Failed to save settings", { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="space-y-8">
          {/* Intervals */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="grid grid-cols-2 gap-6">
              <div><Skeleton className="h-3 w-32 mb-2" /><Skeleton className="h-9 w-full rounded-md" /></div>
              <div><Skeleton className="h-3 w-32 mb-2" /><Skeleton className="h-9 w-full rounded-md" /></div>
            </div>
          </div>
          {/* Sources & Niches */}
          <div className="grid md:grid-cols-2 gap-6">
            {[0, 1].map(i => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between mb-4">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="w-4 h-4" />
                      <Skeleton className="h-8 flex-1 rounded-md" />
                      <Skeleton className="w-10 h-4" />
                      <Skeleton className="w-4 h-4" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl max-h-min mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Global Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure system-wide follow-up intervals and dynamic dropdowns.
          </p>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          className="bg-primary hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="space-y-8">
        {/* Intervals Section */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Follow-Up Intervals</h2>
            <button
              onClick={() => {
                const stepNames = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
                const nextNum = followUpFields.length + 1;
                const prefix = stepNames[followUpFields.length] || `${nextNum}th`;
                appendFollowUp({
                  id: Math.random().toString(36).substr(2, 9),
                  label: `${prefix} Follow-Up`,
                  interval: 7
                });
              }}
              className="text-primary hover:text-orange-700 text-sm font-medium flex items-center gap-1"
              title="Add Follow-Up Step"
            >
              <Plus className="w-4 h-4" /> Add Step
            </button>
          </div>
          
          <div className="space-y-4">
            {followUpFields.map((field, index) => (
              <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <GripVertical className="w-4 h-4 text-gray-400 cursor-move hidden sm:block mt-2 sm:mt-0" />
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                      Step Name
                    </label>
                    <input
                      type="text"
                      {...register(`followUpSteps.${index}.label` as const)}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 text-sm focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                      Wait Days
                    </label>
                    <input
                      type="number"
                      {...register(`followUpSteps.${index}.interval` as const, { valueAsNumber: true })}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 text-sm focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeFollowUp(index)}
                  className="text-red-500 hover:text-red-700 mt-2 sm:mt-6"
                  title="Delete Step"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {followUpFields.length === 0 && (
              <p className="text-sm text-gray-500 italic">No follow-up steps defined.</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Sources */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Contact Sources</h2>
              <button
                onClick={() => appendSource({ id: Math.random().toString(36).substr(2, 9), label: "New Source", active: true, order: sourceFields.length })}
                className="text-primary hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                title="Add New Source"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {sourceFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                  <input
                    type="text"
                    {...register(`contactSources.${index}.label`)}
                    className="flex-1 border border-gray-300 rounded-md shadow-sm px-3 py-1.5 text-sm focus:ring-primary focus:border-primary"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input type="checkbox" {...register(`contactSources.${index}.active`)} className="rounded text-primary focus:ring-primary" />
                    Active
                  </label>
                  <button onClick={() => removeSource(index)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {sourceFields.length === 0 && <p className="text-sm text-gray-500 italic">No sources defined.</p>}
            </div>
          </div>

          {/* Niches */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Niches</h2>
              <button
                onClick={() => appendNiche({ id: Math.random().toString(36).substr(2, 9), label: "New Niche", active: true, order: nicheFields.length })}
                className="text-primary hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                title="Add New Niche"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {nicheFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                  <input
                    type="text"
                    {...register(`niches.${index}.label`)}
                    className="flex-1 border border-gray-300 rounded-md shadow-sm px-3 py-1.5 text-sm focus:ring-primary focus:border-primary"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input type="checkbox" {...register(`niches.${index}.active`)} className="rounded text-primary focus:ring-primary" />
                    Active
                  </label>
                  <button onClick={() => removeNiche(index)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {nicheFields.length === 0 && <p className="text-sm text-gray-500 italic">No niches defined.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

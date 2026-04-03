"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { Settings as SettingsIcon, Save, Plus, Trash2, GripVertical } from "lucide-react";
import Loading from "@/components/ui/loading";

type DynamicOption = {
  id: string;
  label: string;
  active: boolean;
  order: number;
};

type SettingsData = {
  firstFollowUpInterval: number;
  secondFollowUpInterval: number;
  contactSources: DynamicOption[];
  niches: DynamicOption[];
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  const { register, control, handleSubmit, reset } = useForm<SettingsData>({
    defaultValues: {
      firstFollowUpInterval: 5,
      secondFollowUpInterval: 7,
      contactSources: [],
      niches: [],
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

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          reset(res.data);
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: SettingsData) => {
    const loadingToast = toast.loading("Saving settings...");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
    return <Loading />;
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Follow-Up Intervals</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Follow-Up (Days)
              </label>
              <input
                type="number"
                {...register("firstFollowUpInterval", { valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">Days to wait after initial outreach.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Second Follow-Up (Days)
              </label>
              <input
                type="number"
                {...register("secondFollowUpInterval", { valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">Days to wait after first follow up.</p>
            </div>
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

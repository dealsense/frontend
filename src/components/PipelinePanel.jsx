"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

const STATUS_OPTIONS = [
  { value: "interested", label: "Interested", color: "#60a5fa", description: "Initial interest" },
  { value: "evaluating", label: "Evaluating", color: "#fbbf24", description: "Active review" },
  { value: "negotiating", label: "Negotiating", color: "#a78bfa", description: "Terms discussion" },
  { value: "closed", label: "Closed", color: "var(--green)", description: "Investment made" },
  { value: "rejected", label: "Rejected", color: "#f87171", description: "Passed on deal" },
];

export default function PipelinePanel({ companyId, initialData = null }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const data = initialData || {};

  const [formData, setFormData] = useState({
    status: data.status || "interested",
    notes: data.notes || "",
    tags: data.tags || [],
    deal_value: data.deal_value || "",
    owner_user_id: data.owner_user_id || "",
    next_action_date: data.next_action_date || "",
  });

  const [newTag, setNewTag] = useState("");

  const statusOption = STATUS_OPTIONS.find(s => s.value === formData.status);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert deal_value to number or null
      const dataToSend = {
        ...formData,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
      };
      console.log("Sending pipeline data:", dataToSend);
      await api.updatePipeline(companyId, dataToSend);
      showToast("Pipeline updated successfully", "success");
      setIsEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      showToast(err.message || "Failed to update pipeline", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  if (!isEditing) {
    return (
      <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6b7280" }}>
            Pipeline Status
          </h3>
          <button
            onClick={() => {
              console.log("Edit button clicked");
              setIsEditing(true);
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: "var(--green-dim)", color: "var(--green)" }}
          >
            Edit
          </button>
        </div>

        {!formData.status && !formData.deal_value && !formData.owner_user_id && !formData.tags.length && !formData.notes && (
          <div className="text-xs py-4" style={{ color: "#4b5563" }}>
            No pipeline details yet. Click "Edit" to add them.
          </div>
        )}

        {/* Status Badge */}
        <div className="mb-6">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: `${statusOption?.color}18`,
              border: `1px solid ${statusOption?.color}`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: statusOption?.color }}
            />
            <span className="font-semibold" style={{ color: statusOption?.color }}>
              {statusOption?.label}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
            {statusOption?.description}
          </p>
        </div>

        {/* Info Grid */}
        <div className="space-y-4">
          {formData.deal_value && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>Deal Value</p>
              <p className="text-lg font-bold text-white">${formData.deal_value}M</p>
            </div>
          )}

          {formData.owner_user_id && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>Owner</p>
              <p className="text-sm text-white">{formData.owner_user_id}</p>
            </div>
          )}

          {formData.next_action_date && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>Next Action</p>
              <p className="text-sm text-white">{new Date(formData.next_action_date).toLocaleDateString()}</p>
            </div>
          )}

          {formData.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "#9ca3af" }}>Tags</p>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: "rgba(61,220,132,0.1)", color: "var(--green)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {formData.notes && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>Notes</p>
              <p className="text-sm leading-relaxed" style={{ color: "#9ca3af", whiteSpace: "pre-wrap" }}>
                {formData.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "#6b7280" }}>
        Edit Pipeline
      </h3>

      <div className="space-y-6">
        {/* Status Selection */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: "#9ca3af" }}>
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFormData({ ...formData, status: opt.value })}
                className="p-3 rounded-lg text-xs font-semibold transition-all text-left"
                style={{
                  background: formData.status === opt.value ? `${opt.color}20` : "#1e1e1e",
                  border: `1px solid ${formData.status === opt.value ? opt.color : "var(--border)"}`,
                  color: formData.status === opt.value ? opt.color : "#9ca3af",
                }}
              >
                <div className="font-bold">{opt.label}</div>
                <div style={{ fontSize: "0.65rem", opacity: 0.7 }}>{opt.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Deal Value */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#9ca3af" }}>
            Deal Value (Millions)
          </label>
          <input
            type="number"
            placeholder="e.g., 5"
            value={formData.deal_value}
            onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-white text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Owner */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#9ca3af" }}>
            Deal Owner
          </label>
          <input
            type="text"
            placeholder="e.g., john@firm.com"
            value={formData.owner_user_id}
            onChange={(e) => setFormData({ ...formData, owner_user_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-white text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Next Action Date */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#9ca3af" }}>
            Next Action Date
          </label>
          <input
            type="date"
            value={formData.next_action_date}
            onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-white text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#9ca3af" }}>
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add a tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              className="flex-1 px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-white text-sm focus:border-green-500 focus:outline-none"
            />
            <button
              onClick={handleAddTag}
              className="px-3 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--green)", color: "#0f0f0f" }}
            >
              Add
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <div
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: "rgba(61,220,132,0.1)" }}
                >
                  <span style={{ color: "var(--green)" }}>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 hover:opacity-70"
                    style={{ color: "var(--green)", fontSize: "1rem", lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#9ca3af" }}>
            Notes
          </label>
          <textarea
            placeholder="Add internal notes about this deal..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-white text-sm focus:border-green-500 focus:outline-none resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "var(--green)", color: "#0f0f0f" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
            style={{ background: "#1e1e1e", color: "#9ca3af", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

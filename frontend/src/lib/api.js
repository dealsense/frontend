const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
  async getCompanies() {
    const res = await fetch(`${API_URL}/companies`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch companies");
    return res.json();
  },

  async getCompany(id) {
    const res = await fetch(`${API_URL}/companies/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch company ${id}`);
    return res.json();
  },

  async getDDChecklist(id) {
    const res = await fetch(`${API_URL}/companies/${id}/dd-checklist`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch DD checklist");
    return res.json();
  },

  async scoreCompany(id) {
    const res = await fetch(`${API_URL}/companies/${id}/score`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to compute score");
    return res.json();
  },

  getDDPdfUrl(id) {
    return `${API_URL}/companies/${id}/dd-pdf`;
  },

  async chat(message, companyId = null) {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, company_id: companyId }),
    });
    if (!res.ok) throw new Error("Chat request failed");
    return res.json();
  },

  async getCompanyNews(id) {
    const res = await fetch(`${API_URL}/companies/${id}/news`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch news");
    return res.json();
  },

  async uploadDocument(file, onSkipped) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/extract-and-seed`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    return data;
  },

  async updatePipeline(id, status, notes = "") {
    const res = await fetch(`${API_URL}/companies/${id}/pipeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error("Failed to update pipeline status");
    return res.json();
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "ds_access_token";
const USER_KEY = "ds_user";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  return data.detail || fallback;
}

export const api = {
  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await parseError(res, "Login failed"));
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    localStorage.setItem("ds_logged_in", "true");
    localStorage.setItem("ds_user_email", data.user?.email || email);
    return data;
  },

  async signup(orgName, email, password) {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_name: orgName, email, password }),
    });
    if (!res.ok) throw new Error(await parseError(res, "Signup failed"));
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    localStorage.setItem("ds_logged_in", "true");
    localStorage.setItem("ds_user_email", data.user?.email || email);
    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("ds_logged_in");
    localStorage.removeItem("ds_user_email");
  },

  getToken,

  getStoredUser() {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async me() {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await parseError(res, "Session expired"));
    return res.json();
  },

  async getCompanies() {
    const res = await fetch(`${API_URL}/companies`, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch companies");
    return res.json();
  },

  async getCompany(id) {
    const res = await fetch(`${API_URL}/companies/${id}`, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch company ${id}`);
    return res.json();
  },

  async getDDChecklist(id) {
    const res = await fetch(`${API_URL}/companies/${id}/dd-checklist`, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch DD checklist");
    return res.json();
  },

  // Slow (runs several live searches) and not needed on every page load — call only
  // when the user explicitly asks to compare deck data against the web.
  async getWebResearch(id) {
    const res = await fetch(`${API_URL}/companies/${id}/web-research`, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch web research");
    return res.json();
  },

  async updateDDChecklistItem(companyId, checklistId, { isChecked, notes } = {}) {
    const body = {};
    if (isChecked !== undefined) body.is_checked = isChecked;
    if (notes !== undefined) body.user_notes = notes;
    const res = await fetch(`${API_URL}/companies/${companyId}/dd-checklist/${checklistId}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to save checklist item");
    return res.json();
  },

  async scoreCompany(id) {
    const res = await fetch(`${API_URL}/companies/${id}/score`, { method: "POST", headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to compute score");
    return res.json();
  },

  // Mints a short-lived, single-use download link rather than embedding the full
  // session token in the URL (which would leak into server/proxy logs and Referer
  // headers) — call this right before opening/downloading, not once up front.
  async getDDPdfDownloadUrl(id) {
    const res = await fetch(`${API_URL}/companies/${id}/dd-pdf/download-token`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to get download link");
    const { url } = await res.json();
    return `${API_URL}${url}`;
  },

  async chat(message, companyId = null, history = []) {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message, company_id: companyId, history }),
    });
    if (!res.ok) throw new Error("Chat request failed");
    return res.json();
  },

  async getExtractionStatus(jobId) {
    const res = await fetch(`${API_URL}/extraction-status/${jobId}`, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch extraction status");
    return res.json();
  },

  async getCompanyNews(id) {
    const res = await fetch(`${API_URL}/companies/${id}/news`, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch news");
    return res.json();
  },

  async uploadDocument(file, onSkipped) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/extract-and-seed`, { method: "POST", headers: authHeaders(), body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    return data;
  },

  async uploadDocumentsMulti(files, driveLinks) {
    const fd = new FormData();
    for (const file of files || []) fd.append("files", file);
    if (driveLinks && driveLinks.length) fd.append("drive_links", driveLinks.join("\n"));
    const res = await fetch(`${API_URL}/extract-and-seed-multi`, { method: "POST", headers: authHeaders(), body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    return data;
  },

  async updatePipeline(id, updates) {
    // updates: { status, notes, owner_user_id, tags, deal_value, next_action_date }
    const res = await fetch(`${API_URL}/companies/${id}/pipeline`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMsg = errorData.detail || `Pipeline update failed (${res.status})`;
      throw new Error(errorMsg);
    }
    return res.json();
  },
};

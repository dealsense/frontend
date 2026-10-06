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

  async scoreCompany(id) {
    const res = await fetch(`${API_URL}/companies/${id}/score`, { method: "POST", headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to compute score");
    return res.json();
  },

  getDDPdfUrl(id) {
    const token = getToken();
    const suffix = token ? `?access_token=${encodeURIComponent(token)}` : "";
    return `${API_URL}/companies/${id}/dd-pdf${suffix}`;
  },

  async chat(message, companyId = null) {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message, company_id: companyId }),
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Types - must be defined first
export type UserRole = "holder" | "issuer" | "verifier" | "admin";
export type TrustLevel = "unverified" | "verified" | "accredited";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  did?: string;
  organizationName?: string;
  trustLevel?: TrustLevel;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

// Set auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem("authToken", token);
};

// Clear auth token
export const clearAuthToken = (): void => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
};

// Get stored user
export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

// Store user
export const setStoredUser = (user: User): void => {
  localStorage.setItem("user", JSON.stringify(user));
};

// API helper with auth
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
};

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `Request failed: ${res.status}` }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `Request failed: ${res.status}` }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Auth API calls
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiPost<AuthResponse>("/auth/login", { email, password });
    setAuthToken(response.token);
    setStoredUser(response.user);
    return response;
  },

  register: async (
    email: string, 
    password: string, 
    role: UserRole = "holder",
    organizationName?: string
  ): Promise<AuthResponse> => {
    const response = await apiPost<AuthResponse>("/auth/register", { 
      email, 
      password, 
      role,
      organizationName 
    });
    setAuthToken(response.token);
    setStoredUser(response.user);
    return response;
  },

  logout: (): void => {
    clearAuthToken();
  },

  getProfile: async (): Promise<User> => {
    return apiGet<User>("/auth/profile");
  },
};

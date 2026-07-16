import axios, { AxiosInstance } from "axios";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

if (!rawApiUrl) {
  console.warn("NEXT_PUBLIC_API_URL environment variable not set. Using default.");
}

let API_BASE_URL = "";
try {
  const parsedUrl = new URL(rawApiUrl);
  if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
    API_BASE_URL = rawApiUrl;
  } else {
    console.warn("Invalid protocol for API URL, using empty string");
  }
} catch {
  console.warn("Invalid API URL format, using empty string");
}

let cachedCsrfToken: string | null = null;

export async function refreshCsrfToken(): Promise<string> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/csrf-token`, {
      withCredentials: true,
    });
    cachedCsrfToken = response.data?.csrf_token || null;
} catch {
    console.warn("Could not fetch CSRF token:");
    cachedCsrfToken = null;
  }
  return cachedCsrfToken ?? "";
}

export function getCsrfToken(): string | null {
  return cachedCsrfToken;
}

export function setCsrfToken(token: string): void {
  cachedCsrfToken = token;
}

const apiClient: AxiosInstance = axios.create();

apiClient.interceptors.request.use((config) => {
  config.withCredentials = true;

  if (config.method && config.method.toUpperCase() !== 'GET' && cachedCsrfToken) {
    config.headers = config.headers || {};
    config.headers['X-CSRF-Token'] = cachedCsrfToken;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403 && error.response?.data?.error === "CSRF token missing or invalid") {
      await refreshCsrfToken();
      if (cachedCsrfToken && error.config) {
        error.config.headers['X-CSRF-Token'] = cachedCsrfToken;
        return apiClient.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);

export { API_BASE_URL };
export default apiClient;

import axios from "axios";
import API_BASE_URL from "@/lib/api";

export type ParsedArticle = {
  url: string;
  title: string;
  author: string;
  date: string;
  source: string;
  content_text: string;
  content_html: string;
  content_status: "full" | "summary_only" | "failed";
  error?: string;
  metadata?: {
    download_diagnostics?: {
      direct_attempted?: boolean;
      direct_status?: number | null;
      direct_error?: string | null;
      crawlee_attempted?: boolean;
      crawlee_status?: number | null;
      crawlee_error?: string | null;
    };
  };
};

export async function fetchParsedArticle(url: string): Promise<ParsedArticle> {
  const response = await axios.post(
    `${API_BASE_URL}/api/articles/parse`,
    { url },
    { withCredentials: true, validateStatus: () => true }
  );
  if (response.status >= 400) {
    return {
      url,
      title: "",
      author: "",
      date: "",
      source: "",
      content_text: "",
      content_html: "",
      content_status: "failed",
      error: response.data?.error || `HTTP ${response.status}`,
      metadata: response.data?.metadata,
    };
  }
  return response.data as ParsedArticle;
}

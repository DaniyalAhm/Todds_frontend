"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import apiClient, { API_BASE_URL, refreshCsrfToken } from "@/lib/api";
import { fetchParsedArticle, ParsedArticle } from "@/services/articleParser";
import SettingsModal from "@/components/SettingsModal";
import ThemeToggle from "@/components/ThemeToggle";

type IngestJobStatus = "idle" | "running" | "completed" | "failed";

type IngestJobState = {
  status: IngestJobStatus;
  started_at?: string | null;
  finished_at?: string | null;
  message?: string;
  error?: string | null;
  result?: {
    message?: string;
    saved_count?: number;
    feeds_checked?: number;
    entries_found?: number;
    parse_failed_count?: number;
    enriched_count?: number;
    enrich_failed_count?: number;
  } | null;
};

type RssFeed = {
  id: string;
  title: string;
  url: string;
  type?: string;
  source_kind?: "direct" | "rsshub";
  route?: string;
};

type Category = {
  id: string;
  name: string;
  feeds: RssFeed[];
};

type CurrentUser = {
  id: number;
  public_id: string;
  name?: string;
  privilege?: number;
  categories: Category[];
};

type Article = {
  id?: string;
  title: string;
  url?: string;
  source?: string;
  feed?: RssFeed;
  feed_url?: string;
  feed_title?: string;
  author?: string;
  date?: number;
  thumbnail?: string;
  photos?: string[];
  summary?: string;
  content?: string[];
  content_status?: string;
  content_html?: string;
  metadata?: {
    source_format?: string;
    content_html?: string;
    scrape_error?: string;
    scrape_status_code?: number;
  };
};

export default function Home() {
  const [data, setData] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedArticle, setSelectedArticle]= useState<Article | null>(null);
  const [parsedContent, setParsedContent] = useState<ParsedArticle | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [message, setMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const loadIngestStatus = async (userCategories: Category[] = categories, categoryId: string = selectedCategoryId) => {
    const response = await apiClient.get<IngestJobState>(`${API_BASE_URL}/api/ingest/status`);
    const status = response.data;

    if (status.status === "running") {
      setRefreshing(true);
      setMessage(status.message || "Article refresh started. This can take a while.");
      return status;
    }

    setRefreshing(false);

    if (status.status === "completed") {
      setMessage(status.message || "Articles refreshed");
      setError("");
      await loadArticles(categoryId, userCategories);
      return status;
    }

    if (status.status === "failed") {
      setError(status.error || status.message || "Failed to refresh articles");
      return status;
    }

    return status;
  };

  const toArticleWithFeed = (article: Article, userCategories: Category[] = []): Article => {
    if (article.feed?.title) {
      return article;
    }

    const matchedFeed = userCategories
      .flatMap((category) => category.feeds || [])
      .find((feed) => {
        if (article.feed_url && feed.url === article.feed_url) return true;
        if (article.feed_title && feed.title === article.feed_title) return true;
        return false;
      });

    if (matchedFeed) {
      return {
        ...article,
        feed: matchedFeed,
      };
    }

    if (article.feed_title || article.feed_url) {
      return {
        ...article,
        feed: {
          id: article.feed_url || article.feed_title || article.id || article.title,
          title: article.feed_title || article.source || "Feed",
          url: article.feed_url || article.url || "",
          type: "rss",
        },
      };
    }

    return article;
  };

  const loadArticles = async (categoryId?: string, userCategories: Category[] = categories) => {
    try {
      setLoading(true);
      const params = categoryId && categoryId !== "all" ? { category_id: categoryId } : {};
      const response = await apiClient.get(`${API_BASE_URL}/api/fetch/`, { params });
      const articles = Array.isArray(response.data) ? response.data : [];
      setData(articles.map((article) => toArticleWithFeed(article, userCategories)));
    } catch (err) {
      setError("Failed to fetch data. Check the endpoint or API status.");
      console.error("GET Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        setLoading(true);

        await refreshCsrfToken();

        const userResponse = await apiClient.get(`${API_BASE_URL}/api/get_user/`);
        if (cancelled) return;

        const user: CurrentUser | null = userResponse.data?.data || null;
        const cats: Category[] = user?.categories || [];
        setCurrentUser(user);
        setCategories(cats);

        const articleResponse = await apiClient.get(`${API_BASE_URL}/api/fetch/`, { params: {} });
        if (cancelled) return;

        const articles = Array.isArray(articleResponse.data) ? articleResponse.data : [];
        setData(articles.map((article) => toArticleWithFeed(article, cats)));
        try {
          const statusResponse = await apiClient.get<IngestJobState>(`${API_BASE_URL}/api/ingest/status`);
          if (!cancelled && statusResponse.data.status === "running") {
            setRefreshing(true);
            setMessage(statusResponse.data.message || "Article refresh started. This can take a while.");
          }
        } catch (statusErr) {
          console.error("Ingest status error:", statusErr);
        }
      } catch (err) {
        if (!cancelled) {
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            window.location.href = "/auth";
            return;
          }
          setError("Failed to fetch data. Check the endpoint or API status.");
          console.error("GET Error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!refreshing) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadIngestStatus(categories, selectedCategoryId);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshing, categories, selectedCategoryId]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    void loadArticles(categoryId, categories);
  };

const handleRefresh = async () => {
  setMessage("");
  setError("");

  try {
    const response = await apiClient.post<IngestJobState>(`${API_BASE_URL}/api/ingest/`, {});
    setRefreshing(response.data.status === "running");
    setMessage(response.data.message || "Article refresh started. This can take a while.");
    if (response.data.status === "completed") {
      await loadArticles(selectedCategoryId, categories);
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      const status = err.response.data as IngestJobState;
      setRefreshing(status.status === "running");
      setMessage(status.message || "Article refresh started. This can take a while.");
      setError("");
      return;
    }
    setRefreshing(false);
    const errMsg = axios.isAxiosError(err) ? err.response?.data?.error || err.response?.data?.message || "Failed to refresh articles" : "Failed to refresh articles";
    setError(errMsg);
    console.error("Refresh Error:", err);
  }
};

const openArticle = async (article: Article) => {
  console.log("Selected article:", JSON.stringify(article, null, 2));
  setSelectedArticle(article);
  setParsedContent(null);
  setParseError("");
  setParsing(false);

  const scrapeError = article.metadata?.scrape_error;
  if (scrapeError) {
    const status = article.metadata?.scrape_status_code;
    setParseError(status ? `Article unavailable (HTTP ${status})` : `Article unavailable (${scrapeError})`);
    return;
  }

  const needsParse =
    article.content_status === "summary_only" ||
    article.content_status === "failed" ||
    !article.content ||
    article.content.length === 0;

  if (!needsParse) {
    return;
  }

  if (!article.url) {
    return;
  }

  setParsing(true);
  try {
    const result = await fetchParsedArticle(article.url);
    if (result.content_status === "full") {
      setParsedContent(result);
    } else {
      const diagnostics = result.metadata?.download_diagnostics;
      if (diagnostics) {
        const parts = [];
        if (diagnostics.direct_attempted) {
          parts.push(
            diagnostics.direct_status
              ? `direct HTTP ${diagnostics.direct_status}`
              : diagnostics.direct_error || "direct HTTP failed"
          );
        }
        if (diagnostics.crawlee_attempted) {
          parts.push(
            diagnostics.crawlee_status
              ? `Crawlee ${diagnostics.crawlee_status}`
              : diagnostics.crawlee_error || "Crawlee failed"
          );
        }
        setParseError(parts.join(" | ") || result.error || "Could not load this article.");
      } else {
        setParseError(result.error || "Could not load this article.");
      }
    }
  } catch {
    setParseError("Could not load this article.");
  } finally {
    setParsing(false);
  }
};

  return (
<main className="home-page">

      <section className="home-content">
        <header className="home-header">
          <div className="home-header-top">
            <h1 className="home-title">Todd&apos;s Times</h1>

            <h2 className="home-content font-cursive">Democracy dies in Dark place .. or sum dumbshit like that</h2>
            <div className="home-header-actions">
              <ThemeToggle />
              <button onClick={() => setShowSettings(true)} className="btn btn-ghost">
                Settings
              </button>
              {(currentUser?.privilege || 0) >= 1 && (
                <Link href="/admin" className="btn btn-ghost">
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button className="btn btn-primary" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Reload Articles"}
            </button>
          </div>
        </header>

        {categories.length > 0 && (
          <div className="category-tabs">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`category-tab ${selectedCategoryId === "all" ? "active" : ""}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`category-tab ${selectedCategoryId === cat.id ? "active" : ""}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {loading && <p className="home-message">Loading...</p>}
        {message && <p className="home-message" style={{ color: '#15803d' }}>{message}</p>}
        {error && <p className="home-error">{error}</p>}

        {!loading && data.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#525252' }}>
            <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No articles yet</p>
            <p style={{ marginBottom: '0.25rem' }}>
              Add RSS feeds in{" "}
              <button onClick={() => setShowSettings(true)} style={{ textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                Settings
              </button>
              , then click <strong>Reload Articles</strong> to fetch them.
            </p>
          </div>
        )}

        <div className="article-grid">
          {data.map((element, index) => {
            const isWide = index % 3 === 0;

            return (
            <article
              key={element.id || index}
              onClick={() => openArticle(element)}
              className={`article-card${isWide ? " article-card--wide" : ""}`}
            >
                {(() => {
                  const cardImages = [
                    ...(Array.isArray(element.photos) ? element.photos : []),
                    ...(element.thumbnail && !element.photos?.includes(element.thumbnail) ? [element.thumbnail] : []),
                  ];
                  if (cardImages.length === 0) return null;
                  const best = cardImages.sort((a, b) => {
                    const wa = parseInt(a.match(/[?&]width=(\d+)/)?.[1] || "0", 10);
                    const wb = parseInt(b.match(/[?&]width=(\d+)/)?.[1] || "0", 10);
                    return wb - wa;
                  })[0];
                  return (
                    <img
                      className="article-image"
                      src={best}
                      alt={element.title}
                    />
                  );
                })()}

                <div className="article-body">
                  <div className="article-meta-row">
                  </div>
                
                  <p className="article-summary">{element.feed_title}</p>
                  <h2 className={'article-title'}>
                    {element.title}
                  </h2>

                  <p className="article-summary">{element.summary}</p>

                </div>
              </article>
            );
          })}
        </div>
      </section>
{selectedArticle && (
<div
  id="default-modal"
  tabIndex={-1}

  onClick={() => { setSelectedArticle(null); setParsedContent(null); setParseError(""); }}
  aria-hidden="false"
  className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overflow-x-hidden bg-black/70 p-2 backdrop-blur-md sm:items-center sm:p-4"
>
  <div className="relative my-2 w-full max-w-7xl sm:my-6">
    <button
      type="button"
      onClick={() => { setSelectedArticle(null); setParsedContent(null); setParseError(""); }}
      className="btn btn-ghost-light absolute right-0 top-0 z-10 h-9 w-9 -translate-y-1/2 p-0 sm:right-4 sm:top-4 sm:h-10 sm:w-10 sm:translate-y-0"
    >
      <svg
        className="h-4 w-4 sm:h-5 sm:w-5"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6 18 17.94 6M18 18 6.06 6"
        />
      </svg>

      <span className="sr-only">Close modal</span>
    </button>
    <div className="modal-panel relative max-h-[calc(100vh-1rem)] overflow-hidden rounded-3xl border px-3 py-3 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-5 md:p-7">
      <div className="border-b border-current/15 pb-3 sm:pb-4 md:pb-5">
        <h3 className="min-w-0 pr-8 text-base font-semibold leading-6 tracking-tight sm:pr-12 sm:text-xl sm:leading-7">
          {selectedArticle.title}
        </h3>
      </div>

      <div className="max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto py-4 pr-1 sm:max-h-[calc(100vh-11rem)] sm:space-y-5 sm:py-5 md:max-h-[calc(100vh-14rem)] md:space-y-6 md:py-6">
        {(() => {
          const allImages = [
            ...(Array.isArray(selectedArticle.photos) ? selectedArticle.photos : []),
            ...(selectedArticle.thumbnail && !selectedArticle.photos?.includes(selectedArticle.thumbnail) ? [selectedArticle.thumbnail] : []),
          ];
          if (allImages.length === 0) return null;
          const best = allImages.sort((a, b) => {
            const wa = parseInt(a.match(/[?&]width=(\d+)/)?.[1] || "0", 10);
            const wb = parseInt(b.match(/[?&]width=(\d+)/)?.[1] || "0", 10);
            return wb - wa;
          })[0];
          return (
            <img
              src={best}
              alt={selectedArticle.title}
              className="max-h-96 w-full rounded-2xl border border-current/15 object-contain"
            />
          );
        })()}

        <p className="text-sm font-medium uppercase tracking-wide text-current/70">
          {selectedArticle.source}
        </p>
                {(selectedArticle.author || selectedArticle.feed?.title || selectedArticle.feed_title) && (
              <div className="flex flex-wrap gap-2 text-xs text-current/70">
                {selectedArticle.author && (
              <span className="rounded-full border border-current/15 px-3 py-1">
                {selectedArticle.author}
              </span>
            )}

                {selectedArticle.date && (
              <span className="rounded-full border border-current/15 px-3 py-1">
            {selectedArticle.date ? new Date(selectedArticle.date * 1000).toLocaleDateString() : ""}
              </span>
            )}
            {(selectedArticle.feed?.title || selectedArticle.feed_title) && (
              <span className="rounded-full border border-current/15 px-3 py-1">
                {selectedArticle.feed?.title || selectedArticle.feed_title}
              </span>
            )}
          </div>
        )}

      {parsing && (
        <p className="text-center text-current/70">Parsing article...</p>
      )}

      {parseError && (
        <p className="text-center text-red-400">{parseError}</p>
      )}

      {parsedContent?.content_html ? (
        <div
          className="prose max-w-none leading-8"
          dangerouslySetInnerHTML={{ __html: parsedContent.content_html }}
        />
      ) : (
        !parsing && !parseError && (
          (Array.isArray(selectedArticle.content) ? selectedArticle.content : []).map(
            (paragraph: string, idx: number) => (
              <p className="leading-8" key={idx}>{paragraph}</p>
            )
          )
        )
      )}
      </div>

      <div className="flex flex-col gap-3 border-t border-current/15 pt-4 sm:flex-row sm:items-center sm:gap-4 md:pt-5">
        {selectedArticle.url && (
          <button
            type="button"
            onClick={() => window.open(selectedArticle.url, "_blank")}
            className="btn btn-solid-light w-full sm:w-auto"
          >
            Open Original
          </button>
        )}

          <button
          type="button"
          onClick={() => { setSelectedArticle(null); setParsedContent(null); setParseError(""); }}
          className="btn btn-ghost-light w-full sm:w-auto"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</div>
)}

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </main>
  );
}

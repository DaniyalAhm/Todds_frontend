"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import API_BASE_URL from "@/lib/api";
import { fetchParsedArticle, ParsedArticle } from "@/services/articleParser";
import SettingsModal from "@/components/SettingsModal";
import ThemeToggle from "@/components/ThemeToggle";

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
      const response = await axios.get(`${API_BASE_URL}/api/fetch/`, {
        params,
        withCredentials: true,
      });
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

        const userResponse = await axios.get(`${API_BASE_URL}/api/get_user/`, {
          withCredentials: true,
        });
        if (cancelled) return;

        const user: CurrentUser | null = userResponse.data?.data || null;
        const cats: Category[] = user?.categories || [];
        setCurrentUser(user);
        setCategories(cats);

        const articleResponse = await axios.get(`${API_BASE_URL}/api/fetch/`, {
          params: {},
          withCredentials: true,
        });
        if (cancelled) return;

        const articles = Array.isArray(articleResponse.data) ? articleResponse.data : [];
        setData(articles.map((article) => toArticleWithFeed(article, cats)));
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

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    void loadArticles(categoryId, categories);
  };

const handleRefresh = async () => {
  setRefreshing(true);
  setMessage("");
  setError("");

  try {
    const response = await axios.post(`${API_BASE_URL}/api/ingest/`, {}, { withCredentials: true });
    setMessage(response.data?.message || "Articles refreshed");
    window.location.reload();
  } catch (err: unknown) {
    const errMsg = axios.isAxiosError(err) ? err.response?.data?.error || err.response?.data?.message || "Failed to refresh articles" : "Failed to refresh articles";
    setError(errMsg);
    console.error("Refresh Error:", err);
  } finally {
    setRefreshing(false);
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

            return (
            <article
              key={element.id || index}
              onClick={() => openArticle(element)}
              className={`article-card`}
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
  className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/70 p-4 backdrop-blur-md"
>
  <div className="relative w-full max-w-7xl max-h-full">
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-neutral-950/95 p-5 text-white shadow-2xl md:p-7">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4 md:pb-5">
        <h3 className="pr-2 text-lg font-semibold tracking-tight text-white sm:pr-8 sm:text-xl">
          {selectedArticle.title}
        </h3>

        <button
          type="button"
          onClick={() => { setSelectedArticle(null); setParsedContent(null); setParseError(""); }}
          className="btn btn-ghost-light h-10 w-10 shrink-0 p-0"
        >
          <svg
            className="h-5 w-5"
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
      </div>

      <div className="space-y-5 py-5 md:space-y-6 md:py-6">
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
              className="max-h-96 w-full rounded-2xl border border-white/10 object-contain"
            />
          );
        })()}

        <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
          {selectedArticle.source}
        </p>
                {(selectedArticle.author || selectedArticle.feed?.title || selectedArticle.feed_title) && (
              <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                {selectedArticle.author && (
              <span className="rounded-full border border-white/10 px-3 py-1">
                {selectedArticle.author}
              </span>
            )}
            {(selectedArticle.feed?.title || selectedArticle.feed_title) && (
              <span className="rounded-full border border-white/10 px-3 py-1">
                {selectedArticle.feed?.title || selectedArticle.feed_title}
              </span>
            )}
          </div>
        )}

      {parsing && (
        <p className="text-center text-gray-400">Parsing article...</p>
      )}

      {parseError && (
        <p className="text-center text-red-400">{parseError}</p>
      )}

      {parsedContent?.content_html ? (
        <div
          className="prose prose-invert max-w-none leading-8 text-gray-200"
          dangerouslySetInnerHTML={{ __html: parsedContent.content_html }}
        />
      ) : (
        !parsing && !parseError && (
          (Array.isArray(selectedArticle.content) ? selectedArticle.content : []).map(
            (paragraph: string, idx: number) => (
              <p className="leading-8 text-gray-200" key={idx}>{paragraph}</p>
            )
          )
        )
      )}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:gap-4 md:pt-5">
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

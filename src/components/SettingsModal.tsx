"use client";

import { useCallback, useEffect, useState } from "react";
import axios from 'axios'
import apiClient, { API_BASE_URL } from "@/lib/api";
type FeedType = "rss";

type RssFeed = {
  id: string;
  title: string;
  url: string;
  type?: FeedType;
  source_kind?: "direct" | "rsshub";
  route?: string;
};

type Category = {
  id: string;
  name: string;
  feeds: RssFeed[];
};

type UserPayload = {
  data: {
    id: number;
    public_id: string;
    name?: string;
    privilege?: number;
    categories: Category[];
  };
};

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [data, setData] = useState<UserPayload | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newFeedTitle, setNewFeedTitle] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [showRsshub, setShowRsshub] = useState(false);
  const [rsshubRoute, setRsshubRoute] = useState("");
  const [rsshubName, setRsshubName] = useState("");
  const [rsshubResolving, setRsshubResolving] = useState(false);
  const [rsshubResult, setRsshubResult] = useState<{status?: string; message?: string; url?: string; title?: string; route?: string; source_kind?: "rsshub"} | null>(null);
  const [rsshubHealth, setRsshubHealth] = useState<string | null>(null);

  const fetchApi = useCallback(async () => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/api/get_user/`);
      const freshCategories: Category[] = response.data.data.categories;
      setData(response.data);
      setCategories(freshCategories);
      if (selectedCategoryId) {
        const updated = freshCategories.find((c: Category) => c.id === selectedCategoryId);
        if (updated) setSelectedCategory(updated);
      }
    } catch {
      setError("Failed to fetch data.");
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => {
        void fetchApi();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [open, fetchApi]);

  const checkRsshubHealth = async () => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/api/rsshub/health`);
      setRsshubHealth(response.data.status === "ok" ? "Online" : "Error");
    } catch {
      setRsshubHealth("Unreachable");
    }
  };

  useEffect(() => {
    if (showRsshub && !rsshubHealth) {
      const timer = window.setTimeout(() => {
        void checkRsshubHealth();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [showRsshub, rsshubHealth]);

  const makeId = (value: string) => {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  const addCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setMessage("");
    setError("");
    const alreadyExists = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) { setError("Category already exists"); return; }
    if (!data?.data?.id) return;
    const id = `${data.data.id}-${trimmed}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      await apiClient.post(`${API_BASE_URL}/api/add_categories`, { category: { id, name: trimmed, feeds: [] } });
      setMessage("Category added");
      setNewCategory("");
    } catch (error: unknown) {
      setError(axios.isAxiosError(error) ? error.response?.data?.error || "Failed" : "Failed");
    }
    fetchApi();
  };

  const deleteCategory = async (categoryId: string) => {
    setMessage("");
    setError("");
    try {
      await apiClient.post(`${API_BASE_URL}/api/remove_category`, { category_id: categoryId });
      setMessage("Category removed");
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null);
        setSelectedCategory(null);
      }
      void fetchApi();
    } catch (error: unknown) {
      setError(axios.isAxiosError(error) ? error.response?.data?.error || "Failed" : "Failed");
    }
  };

  const addFeedToCategory = async () => {
    if (!selectedCategoryId) return;
    const title = newFeedTitle.trim();
    const url = newFeedUrl.trim();
    if (!title || !url) return;
    setMessage("");
    setError("");
    const feed: RssFeed = { id: makeId(`${title}-${Date.now()}`), title, url, type: "rss", source_kind: "direct" };
    try {
      await apiClient.post(`${API_BASE_URL}/api/add_feed`, { category_id: selectedCategoryId, feed });
      setMessage("Feed added");
      setNewFeedTitle("");
      setNewFeedUrl("");
      fetchApi();
    } catch (error: unknown) {
      setError(axios.isAxiosError(error) ? error.response?.data?.error || "Failed" : "Failed");
    }
  };

  const removeFeedFromCategory = async (categoryId: string, feed: RssFeed) => {
    setMessage("");
    setError("");
    try {
      await apiClient.post(`${API_BASE_URL}/api/remove_feed`, { category_id: categoryId, feed });
      setMessage("Feed removed");
    } catch (error: unknown) {
      setError(axios.isAxiosError(error) ? error.response?.data?.error || "Failed" : "Failed");
    }
    fetchApi();
  };

  const resolveRsshubRoute = async () => {
    const route = rsshubRoute.trim();
    if (!route) return;
    setRsshubResolving(true);
    setRsshubResult(null);
    try {
      const response = await apiClient.post(`${API_BASE_URL}/api/rsshub/resolve`, { route, name: rsshubName.trim() });
      setRsshubResult(response.data);
    } catch {
      setRsshubResult({ status: "error", message: "Could not reach RSSHUB" });
    } finally {
      setRsshubResolving(false);
    }
  };

  const addRsshubRouteAsFeed = async () => {
    if (!selectedCategoryId || !rsshubResult || rsshubResult.status !== "ok" || !rsshubResult.url) return;
    const title = rsshubName.trim() || rsshubResult.title || rsshubRoute.replace(/^\/+/, "").replace(/[-/]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const feed: RssFeed = { id: makeId(`${title}-${Date.now()}`), title, url: rsshubResult.url, type: "rss", source_kind: "rsshub", route: rsshubResult.route || rsshubRoute.trim().replace(/^\/+/, "") };
    try {
      await apiClient.post(`${API_BASE_URL}/api/add_feed`, { category_id: selectedCategoryId, feed });
      setMessage("Feed added");
      setRsshubName("");
      setRsshubRoute("");
      setRsshubResult(null);
      fetchApi();
    } catch (error: unknown) {
      setError(axios.isAxiosError(error) ? error.response?.data?.error || "Failed" : "Failed");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-2 backdrop-blur-md sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative my-2 w-full max-w-6xl sm:my-8">
        <div className="modal-panel relative max-h-[calc(100vh-1rem)] overflow-hidden rounded-3xl border p-3 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-5 md:p-7">
          <div className="flex items-center justify-between border-b border-current/15 pb-4 md:pb-5">
            <h2 className="text-2xl font-bold">Settings</h2>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost-light h-10 w-10 shrink-0 p-0"
            >
              <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 17.94 6M18 18 6.06 6" />
              </svg>
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-3 text-sm text-green-300">{message}</div>
          )}
          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">{error}</div>
          )}

          <div className="modal-scroll mt-6 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1 sm:max-h-[calc(100vh-10rem)]">
            <div className="grid gap-4 lg:grid-cols-[360px_1fr] lg:gap-8">
            <section className="modal-section rounded-3xl border p-4 shadow-2xl sm:p-6">
              <div className="modal-subsection mb-6 rounded-2xl border p-4">
                <p className="modal-faint text-xs font-semibold uppercase tracking-wide">Account</p>
                <p className="mt-2 text-lg font-semibold">{data?.data?.name || "User"}</p>
                <p className="modal-faint mt-1 break-all text-xs">/{data?.data?.public_id}</p>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold">Categories</h2>
                <p className="modal-muted mt-1 text-sm">Each category belongs to this user.</p>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
                  placeholder="Example: Tech"
                  className="modal-subsection modal-input rounded-2xl px-4 py-3"
                />
                <button onClick={addCategory} className="btn btn-solid-light w-full">
                  Add Category
                </button>
              </div>

              <div className="mt-8 space-y-3">
                {categories.length === 0 && (
                  <div className="modal-subsection modal-muted rounded-2xl border border-dashed p-6 text-sm">No categories yet.</div>
                )}
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => { setSelectedCategoryId(category.id); setSelectedCategory(category); }}
                    className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                      selectedCategoryId === category.id
                        ? "border-pink-500 bg-pink-200 text-black"
                        : "modal-subsection text-inherit hover:bg-white/10 dark:hover:bg-black/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{category.name}</p>
                        <p className={`text-xs ${selectedCategoryId === category.id ? "text-black/60" : "modal-faint"}`}>
                          {category.feeds?.length} feed{category.feeds?.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="modal-section rounded-3xl border p-4 shadow-2xl sm:p-6">
              {!selectedCategory && (
                <div className="modal-subsection flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed p-8 text-center">
                  <div>
                    <h2 className="text-2xl font-bold">Select a category</h2>
                    <p className="modal-muted mt-2 text-sm">Choose a category on the left to manage its RSS feeds.</p>
                  </div>
                </div>
              )}

              {selectedCategory && (
                <>
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedCategory.name}</h2>
                      <p className="modal-muted mt-1 text-sm">Manage RSS feeds for this category.</p>
                    </div>
                    <button onClick={() => void deleteCategory(selectedCategory.id)} className="btn btn-danger-ghost">
                      Delete Category
                    </button>
                  </div>

                  <div className="modal-subsection rounded-2xl border p-5">
                    <h3 className="mb-4 text-lg font-semibold">Add Feed Source</h3>
                    <div className="grid gap-3">
                      <input value={newFeedTitle} onChange={(e) => setNewFeedTitle(e.target.value)}
                        placeholder="Feed title, example: NYT Technology"
                        className="modal-subsection modal-input rounded-2xl px-4 py-3" />
                      <input value={newFeedUrl} onChange={(e) => setNewFeedUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addFeedToCategory(); }}
                        placeholder="RSS URL, example: https://example.com/feed.xml"
                        className="modal-subsection modal-input rounded-2xl px-4 py-3" />
                      <button onClick={addFeedToCategory} className="btn btn-solid-light">
                        Add RSS to {selectedCategory.name}
                      </button>
                    </div>
                  </div>

                  <div className="modal-subsection mt-6 rounded-2xl border p-5">
                    <button onClick={() => setShowRsshub(!showRsshub)} className="flex w-full items-center justify-between">
                      <h3 className="text-lg font-semibold">RSSHUB Feeds</h3>
                      <span className="modal-muted">{showRsshub ? "▲" : "▼"}{rsshubHealth && ` (${rsshubHealth})`}</span>
                    </button>
                    {showRsshub && (
                      <div className="mt-4">
                        <p className="modal-muted mb-3 text-sm">
                          RSSHUB generates RSS feeds from websites that don&apos;t have native RSS. Enter a route path to add it.
                        </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input value={rsshubName} onChange={(e) => setRsshubName(e.target.value)}
                          placeholder="Feed name, example: NYT World via RSSHub"
                          className="modal-subsection modal-input flex-1 rounded-2xl px-4 py-3"
                        />
                      </div>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input value={rsshubRoute} onChange={(e) => setRsshubRoute(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") resolveRsshubRoute(); }}
                            placeholder="/nytimes, /bbc, /hackernews"
                            className="modal-subsection modal-input flex-1 rounded-2xl px-4 py-3" />
                          <button onClick={resolveRsshubRoute} disabled={rsshubResolving} className="btn btn-solid-light w-full sm:w-auto">
                            {rsshubResolving ? "..." : "Resolve"}
                          </button>
                        </div>
                        {rsshubResult && (
                          <div className={`mt-3 rounded-xl border p-4 ${rsshubResult.status === "ok" ? "border-green-500/20 bg-green-500/10" : "border-red-500/20 bg-red-500/10"}`}>
                            {rsshubResult.status === "ok" ? (
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-medium text-green-300">{rsshubResult.title}</p>
                                  {rsshubResult.route && <p className="text-xs text-green-300/60">Route: /{rsshubResult.route}</p>}
                                  <p className="text-xs text-green-300/60">{rsshubResult.url}</p>
                                </div>
                                <button onClick={addRsshubRouteAsFeed} className="btn btn-solid-light w-full px-4 py-1.5 text-xs sm:w-auto">
                                  Add Feed
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-red-300">{rsshubResult.message || "Route not found"}</p>
                            )}
                          </div>
                        )}
                        <p className="modal-faint mt-4 text-xs">
                          Discover routes at{" "}
                          <a href="https://docs.rsshub.app" target="_blank" rel="noopener noreferrer" className="modal-link">docs.rsshub.app</a>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-8">
                    <h3 className="mb-4 text-lg font-semibold">Feed Sources</h3>
                    {selectedCategory.feeds.length === 0 && (
                      <div className="modal-subsection modal-muted rounded-2xl border border-dashed p-6 text-sm">No feed sources yet.</div>
                    )}
                    <div className="space-y-3">
                      {selectedCategory.feeds.map((feed) => (
                        <div key={feed.id} className="modal-subsection flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold">{feed.title}</p>
                            <p className="modal-faint mt-1 text-[0.7rem] font-bold uppercase tracking-wide">
                              {feed.source_kind === "rsshub" ? "RSSHUB" : "RSS"}
                            </p>
                            {feed.route && <p className="modal-faint truncate text-xs">/{feed.route}</p>}
                            <p className="modal-muted truncate text-xs">{feed.url}</p>
                          </div>
                          <button onClick={() => removeFeedFromCategory(selectedCategory.id, feed)} className="btn btn-danger-ghost">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

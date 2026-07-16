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
    name?: string;
    categories: Category[];
  };
};

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [data, setData]= useState<UserPayload | null>(null)
  const [error, setError] = useState("");
  const [message, setMessage] = useState("")
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
        console.log("GET Success:", response.data);

        const freshCategories: Category[] = response.data.data.categories;
        setData(response.data);
        setCategories(freshCategories);
        if (selectedCategoryId) {
          const updated = freshCategories.find((c: Category) => c.id === selectedCategoryId);
          if (updated) setSelectedCategory(updated);
        }
      } catch (err) {
        setError("Failed to fetch data. Check the endpoint or API status.");
        console.error("GET Error:", err);
      }
    }, [selectedCategoryId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchApi();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchApi]);

  const makeId = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };



  const addCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    setMessage("");
    setError("");

    const alreadyExists = categories.some(
      (category) => category.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      setError("A category with this name already exists");
      return;
    }

    if (!data?.data?.id) return;

    const id = `${data.data.id}-${trimmed}-${Date.now()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const category: Category = {
      id,
      name: trimmed,
      feeds: [],
    };

    try {
      const response = await apiClient.post(`${API_BASE_URL}/api/add_categories`,   { category: category });
    setMessage(response.data.message || "Category added successfully");
    setNewCategory("");
    }
     catch (error: unknown) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error || "Failed to add category" : "Failed to add category";
      setError(errMsg);
      console.error(error)
    }
    fetchApi()
  }



  const deleteCategory = async (categoryId: string) => {
    setMessage("");
    setError("");
    try {
      await apiClient.post(`${API_BASE_URL}/api/remove_category`, { category_id: categoryId });
      setMessage("Category removed successfully");
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null);
        setSelectedCategory(null);
      }
      fetchApi();
    } catch (error: unknown) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error || "Failed to remove category" : "Failed to remove category";
      setError(errMsg);
    }
  };

  const addFeedToCategory = async () => {
    if (!selectedCategoryId) return;

    const title = newFeedTitle.trim();
    const url = newFeedUrl.trim();

    if (!title || !url) return;

    setMessage("");
    setError("");

    const feed: RssFeed = {
      id: makeId(`${title}-${Date.now()}`),
      title,
      url,
      type: "rss",
      source_kind: "direct",
    };

    try {
      const response = await apiClient.post(`${API_BASE_URL}/api/add_feed`,   { category_id: selectedCategoryId, feed:feed });
    setMessage(response.data.message || "Feed added successfully");
    setNewFeedTitle("");
    setNewFeedUrl("");
    fetchApi();
    }
     catch (error: unknown) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error || "Failed to add feed" : "Failed to add feed";
      setError(errMsg);
      console.error(error)
    }

  };

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
    const feed: RssFeed = {
      id: makeId(`${title}-${Date.now()}`),
      title,
      url: rsshubResult.url,
      type: "rss",
      source_kind: "rsshub",
      route: rsshubResult.route || rsshubRoute.trim().replace(/^\/+/, ""),
    };

    try {
      await apiClient.post(`${API_BASE_URL}/api/add_feed`, { category_id: selectedCategoryId, feed });
      setMessage("Feed added successfully");
      setRsshubName("");
      setRsshubRoute("");
      setRsshubResult(null);
      fetchApi();
    } catch (error: unknown) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error || "Failed to add feed" : "Failed to add feed";
      setError(errMsg);
    }
  };

  const removeFeedFromCategory  = async (categoryId: string, feed: RssFeed) => {
    setMessage("");
    setError("");

    try {
      const response = await apiClient.post(`${API_BASE_URL}/api/remove_feed`,   { category_id: categoryId, feed:feed });
    setMessage(response.data.message || "Feed removed successfully");
    }
     catch (error: unknown) {
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.error || "Failed to remove feed" : "Failed to remove feed";
      setError(errMsg);
      console.error(error)
    }
    fetchApi();
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

<h1 className="text-6xl font-black tracking-tight mb-6">
  Hello, {data?.data?.name?.replaceAll('"', "")},
</h1>
        <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Settings</h1>
            <p className="mt-2 text-white/60">
              Create your own categories and control which feeds belong to
              them.
            </p>
          </div>

        </header>

        {message && (
          <div className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-3 text-sm text-green-300">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Categories</h2>
              <p className="mt-1 text-sm text-white/50">
                Each category belongs to this user.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCategory();
                }}
                placeholder="Example: Tech"
                className="rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/60"
              />

              <button onClick={addCategory} className="btn btn-solid-light">
                Add Category
              </button>
            </div>

            <div className="mt-8 space-y-3">
              {categories.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-6 text-sm text-white/50">
                  No categories yet for this user.
                </div>
              )}

              {categories?.map((category) => (
                <button
                  key={category.id}
                  onClick={() =>{
                    setSelectedCategoryId(category.id)

                    setSelectedCategory(category)}}
                  className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                    selectedCategoryId === category.id
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-black/40 text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{category.name}</p>
                      <p
                        className={`text-xs ${
                          selectedCategoryId === category.id
                            ? "text-black/60"
                            : "text-white/40"
                        }`}
                      >
                        {category.feeds?.length} feed
                        {category.feeds?.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
            {!selectedCategory && (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 p-8 text-center">
                <div>
                  <h2 className="text-2xl font-bold">Select a category</h2>
                  <p className="mt-2 text-white/50">
                    Choose a category on the left to manage its RSS feeds.
                  </p>
                </div>
              </div>
            )}

            {selectedCategory && (
              <>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedCategory.name}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">
                      Manage RSS feeds for this category.
                    </p>
                  </div>

                  <button onClick={() => void deleteCategory(selectedCategory.id)} className="btn btn-danger-ghost">
                    Delete Category
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <h3 className="mb-4 text-lg font-semibold">Add Feed Source</h3>

                  <div className="grid gap-3">
                      <input
                      value={newFeedTitle}
                      onChange={(e) => setNewFeedTitle(e.target.value)}
                      placeholder="Feed title, example: NYT Technology"
                      className="rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/60"
                    />

                    <input
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addFeedToCategory();
                      }}
                      placeholder="RSS URL, example: https://example.com/feed.xml"
                      className="rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/60"
                    />

                    <button onClick={addFeedToCategory} className="btn btn-solid-light">
                      Add RSS to {selectedCategory.name}
                    </button>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                  <button
                    onClick={() => setShowRsshub(!showRsshub)}
                    className="flex w-full items-center justify-between"
                  >
                    <h3 className="text-lg font-semibold">RSSHUB Feeds</h3>
                    <span className="text-white/50">
                      {showRsshub ? "▲" : "▼"}
                      {rsshubHealth && ` (${rsshubHealth})`}
                    </span>
                  </button>

                  {showRsshub && (
                    <div className="mt-4">
                      <p className="mb-3 text-sm text-white/50">
                        RSSHUB generates RSS feeds from websites that don&apos;t have native RSS.
                        Enter a route path below to resolve and add it as a feed.
                      </p>

                      <div className="flex gap-2">
                        <input
                          value={rsshubName}
                          onChange={(e) => setRsshubName(e.target.value)}
                          placeholder="Feed name, example: NYT World via RSSHub"
                          className="flex-1 rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/60"
                        />
                      </div>

                      <div className="mt-2 flex gap-2">
                        <input
                          value={rsshubRoute}
                          onChange={(e) => setRsshubRoute(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") resolveRsshubRoute(); }}
                          placeholder="/nytimes, /bbc, /hackernews"
                          className="flex-1 rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/60"
                        />
                          <button onClick={resolveRsshubRoute} disabled={rsshubResolving} className="btn btn-solid-light">
                            {rsshubResolving ? "..." : "Resolve"}
                          </button>
                      </div>

                      {rsshubResult && (
                        <div className={`mt-3 rounded-xl border p-4 ${
                          rsshubResult.status === "ok"
                            ? "border-green-500/20 bg-green-500/10"
                            : "border-red-500/20 bg-red-500/10"
                        }`}>
                          {rsshubResult.status === "ok" ? (
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-green-300">{rsshubResult.title}</p>
                                {rsshubResult.route && (
                                  <p className="text-xs text-green-300/60">Route: /{rsshubResult.route}</p>
                                )}
                                <p className="text-xs text-green-300/60">{rsshubResult.url}</p>
                              </div>
                              <button onClick={addRsshubRouteAsFeed} className="btn btn-solid-light text-xs px-4 py-1.5">
                                Add Feed
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-red-300">
                              {rsshubResult.message || "Route not found"}
                            </p>
                          )}
                        </div>
                      )}

                      <p className="mt-4 text-xs text-white/30">
                        Discover all available routes at{" "}
                        <a href="https://docs.rsshub.app" target="_blank" rel="noopener noreferrer" className="text-white/50 underline">
                          docs.rsshub.app
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <h3 className="mb-4 text-lg font-semibold">Feed Sources</h3>

                  {selectedCategory.feeds.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-6 text-sm text-white/50">
                      This category has no feed sources yet.
                    </div>
                  )}

                  <div className="space-y-3">
                    {selectedCategory.feeds.map((feed) => (
                      <div
                        key={feed.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold">{feed.title}</p>
                          <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-wide text-white/35">
                              {feed.source_kind === "rsshub" ? "RSSHUB" : "RSS"}
                          </p>
                          {feed.route && <p className="truncate text-xs text-white/30">/{feed.route}</p>}
                          <p className="truncate text-xs text-white/40">
                            {feed.url}
                          </p>
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
    </main>
  );
}

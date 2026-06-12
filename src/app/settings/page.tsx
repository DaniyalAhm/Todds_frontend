"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axios from 'axios'
type RssFeed = {
  id: string;
  title: string;
  url: string;
};

type Category = {
  id: string;
  name: string;
  feeds: RssFeed[];
};

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] =useState(null)
  const [data, setData]= useState(null)
  const [error, setError] = useState("");
  const [message, setMessage] = useState("")
  const [newCategory, setNewCategory] = useState("");
  const [newFeedTitle, setNewFeedTitle] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchApi = async () => {
      try {
        setLoading(true);

        const response = await axios.get("http://localhost:5000/api/get_user/"
          ,{

        withCredentials: true,

          });
        console.log("GET Success:", response.data);

        setData(response.data);
        setCategories(response.data.data.categories)
      } catch (err) {
        setError("Failed to fetch data. Check the endpoint or API status.");
        console.error("GET Error:", err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {

    fetchApi();
  }, []);

  const makeId = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };



  const addCategory = async () => {
    const trimmed = newCategory.trim();

    const id = `${data.data.id}-${trimmed}-${Date.now()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const category: Category = {
      id,
      name: trimmed,
      feeds: [],
    };
    const alreadyExists = categories.items?.some(
      (category) => category.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (!trimmed || alreadyExists) return;

    try {
      const response = await axios.post("http://localhost:5000/api/add_categories",   { category: category },
  { withCredentials: true });
    console.log(response.data)
    }
     catch (error: any) {
      console.error(error)

    }
    fetchApi()
  }



  const deleteCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.filter((category) => category.id !== categoryId)
    );

    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
    }
  };

  const addFeedToCategory = async () => {
    if (!selectedCategoryId) return;

    const title = newFeedTitle.trim();
    const url = newFeedUrl.trim();

    if (!title || !url) return;

    const feed: RssFeed = {
      id: makeId(`${title}-${Date.now()}`),
      title,
      url,
    };

    try {
      const response = await axios.post("http://localhost:5000/api/add_feed",   { category_id: selectedCategoryId, feed:feed },
  { withCredentials: true });
    console.log(response.data)

selectedCategory.feeds = [feed, ...selectedCategory.feeds];
    }
     catch (error: any) {
      console.error(error)

    }

  };

  const removeFeedFromCategory  = async (categoryId: string, feed: RssFeed) => {

    try {
      const response = await axios.post("http://localhost:5000/api/remove_feed",   { category_id: categoryId, feed:feed },
  { withCredentials: true });
    console.log(response.data)

    selectedCategory.feeds = list.filter(item => item !== feed);
    }
     catch (error: any) {
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
              Create your own categories and control which RSS feeds belong to
              them.
            </p>
          </div>

        </header>


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

              <button
                onClick={addCategory}
                className="rounded-2xl bg-white px-6 py-3 font-bold text-black hover:bg-white/80"
              >
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
                        {category.feeds?.length} RSS feed
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

                  <button
                    onClick={() => deleteCategory(selectedCategory.id)}
                    className="w-fit rounded-full border border-red-300/20 px-4 py-2 text-sm text-red-300 hover:bg-red-300 hover:text-black"
                  >
                    Delete Category
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <h3 className="mb-4 text-lg font-semibold">Add RSS Feed</h3>

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

                    <button
                      onClick={addFeedToCategory}
                      className="rounded-2xl bg-white px-6 py-3 font-bold text-black hover:bg-white/80"
                    >
                      Add Feed to {selectedCategory.name}
                    </button>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="mb-4 text-lg font-semibold">RSS Feeds</h3>

                  {selectedCategory.feeds.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-6 text-sm text-white/50">
                      This category has no RSS feeds yet.
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
                          <p className="truncate text-xs text-white/40">
                            {feed.url}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            removeFeedFromCategory(
                              selectedCategory.id,
                              feed
                            )
                          }
                          className="w-fit rounded-full border border-red-300/20 px-4 py-2 text-sm text-red-300 hover:bg-red-300 hover:text-black"
                        >
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

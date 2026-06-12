
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
type Article = {
  title: string;
  summary: string;
  source: string;
  thumbnail?: string;
};

export default function Home() {
  const [data, setData] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedArticle, setSelectedArticle]= useState(null);
  const router = useRouter();
  useEffect(() => {
    const fetchApi = async () => {
      try {
        setLoading(true);

        const response = await axios.get("http://localhost:5000/api/fetch");
        console.log("GET Success:", response.data);

        setData(response.data);
      } catch (err) {
        setError("Failed to fetch data. Check the endpoint or API status.");
        console.error("GET Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApi();
  }, []);

const handleRefresh = async () => {
         
        const response = await axios.post("http://localhost:5000/api/ingest");
        console.log(response.data)
        window.location.reload();
        return; 

    }
const openArticle = (article: any, index: number) => {
  if (article.content_status === 'summary_only' || article.content_status ==='failed'){
window.open(article.url, "_blank");
      return ;
  }

  sessionStorage.setItem("selectedArticle", JSON.stringify(article));

  setSelectedArticle(article);
};
  return (
<main className="home-page">

      <section className="home-content">
        <header className="home-header">
          <h1 className="home-title">Todd&apos;s Times</h1>

<button className="refresh-button" onClick={handleRefresh}>
 Reload Articles 
</button>

<Link
  href="/settings"
  className="fixed right-5 top-5 z-50 rounded-full border border-white/20 bg-black/70 px-5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-white hover:text-black"
>
  Settings
</Link>
          <p className="home-message"> To be honest, I have no idea what I am doing :D </p>
        </header>
        {loading && <p className="home-message">Loading...</p>}
        {error && <p className="home-error">{error}</p>}

        <div className="article-grid">
          {data.map((element, index) => {

            return (
            <article
              key={index}
              onClick={() => openArticle(element, index)}
              className={`article-card`}
            >
                {element.thumbnail && (
                  <img
                    className={`article-image`}
                    src={element.thumbnail}
                    alt={element.title}
                  />
                )}

                <div className="article-body">
                  <div className="article-meta-row">
                    <p className="article-source">{element.source}</p>
                    <p className="article-number">{index + 1}</p>
                  </div>

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

  onClick={() => setSelectedArticle(null)}
  aria-hidden="false"
  className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/70 p-4 backdrop-blur-md"
>
  <div className="relative w-full max-w-6xl max-h-full">
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-neutral-950/95 p-5 text-white shadow-2xl md:p-7">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 md:pb-5">
        <h3 className="pr-8 text-xl font-semibold tracking-tight text-white">
          {selectedArticle.title}
        </h3>

        <button
          type="button"
          onClick={() => setSelectedArticle(null)}
          className="ms-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white hover:text-black"
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
        {selectedArticle.thumbnail && (
          <img
            src={selectedArticle.thumbnail}
            alt={selectedArticle.title}
            className="max-h-80 w-full rounded-2xl border border-white/10 object-cover"
          />
        )}

        <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
          {selectedArticle.source}
        </p>

      {(selectedArticle.content ).map(
        (paragraph, index) => (
<p className="leading-8 text-gray-200"key={index}>{paragraph}</p>

        )
      )}
      </div>

      <div className="flex items-center gap-4 border-t border-white/10 pt-4 md:pt-5">
        {selectedArticle.url && (
          <button
            type="button"
            onClick={() => window.open(selectedArticle.url, "_blank")}
            className="rounded-full border border-white bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
          >
            Open Original
          </button>
        )}

        <button
          type="button"
          onClick={() => setSelectedArticle(null)}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</div>
)}



    </main>
  );
}

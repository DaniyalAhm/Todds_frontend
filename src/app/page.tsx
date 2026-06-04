"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

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

  useEffect(() => {
    const fetchApi = async () => {
      try {
        setLoading(true);

        const response = await axios.get("http://localhost:5000/api_fetch");
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

  return (
    <main className="home-page">
      <div className="default-bg" />
      <div className="default-overlay" />

      <section className="home-content">
        <header className="home-header">
          <h1 className="home-title">Todd&apos;s Times</h1>
        </header>

        {loading && <p className="home-message">Loading...</p>}
        {error && <p className="home-error">{error}</p>}

        <div className="article-grid">
          {data.map((element, index) => {
            const featured = index === 0;
            const wide = index === 1 || index === 5;
            const tall = index === 3;

            const cardSize = featured
              ? "md:col-span-2 md:row-span-2"
              : wide
              ? "md:col-span-2"
              : tall
              ? "md:row-span-2"
              : "";

            const imageSize = featured ? "h-72" : tall ? "h-56" : "h-32";
            const titleSize = featured ? "text-3xl" : "text-lg";

            return (
              <article key={index} className={`${cardSize} article-card`}>
                {element.thumbnail && (
                  <img
                    className={`article-image ${imageSize}`}
                    src={element.thumbnail}
                    alt={element.title}
                  />
                )}

                <div className="article-body">
                  <div className="article-meta-row">
                    <p className="article-source">{element.source}</p>
                    <p className="article-number">{index + 1}</p>
                  </div>

                  <h2 className={`article-title ${titleSize}`}>
                    {element.title}
                  </h2>

                  <p className="article-summary">{element.summary}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

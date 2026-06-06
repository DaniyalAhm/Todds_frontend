"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

const handleRefresh = async () => {
         
        const response = await axios.post("http://localhost:5000/api/ingest");
        console.log(response.data)
        window.location.reload();
        return; 

    }
const openArticle = (article: any, index: number) => {
  if (article.content_status === 'summary_only' || article.content_status ==='failed'){
    router.push(article.url)
      return ;
  }

  sessionStorage.setItem("selectedArticle", JSON.stringify(article));
  router.push(`/articles/${index}`);
};
  return (
<main className="home-page">

      <section className="home-content">
        <header className="home-header">
          <h1 className="home-title">Todd&apos;s Times</h1>

<button className="refresh-button" onClick={handleRefresh}>
 Reload Articles 
</button>
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
    </main>
  );
}

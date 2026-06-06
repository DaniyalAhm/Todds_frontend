"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";

type Article = {
  title: string;
  summary: string;
  source: string;
  thumbnail?: string;
  link?: string;
};

export default function ArticlePage() {
  const params = useParams();
  const id = Number(params.id);

  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api_fetch");

        const selectedArticle = response.data[id];

        if (!selectedArticle) {
          setError("Article not found");
          return;
        }

        setArticle(selectedArticle);
      } catch (error) {
        setError("Failed to load article");
        console.error(error);
      }
    };

    fetchArticle();
  }, [id]);

  if (error) {
    return (
      <main className="home-page">


          <button href="/" className="refresh-button">
            ← Back home
          </button>
        <div className="default-bg" />
        <div className="default-overlay" />

      </main>
    );
  }

  if (!article) {
    return (
      <main className="home-page">
        <div className="default-bg" />
        <div className="default-overlay" />

        <section className="home-content">
          <p className="home-message">Loading article...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="home-page">
      <div className="default-bg" />
      <div className="default-overlay" />

      <section className="article-page-content">
        <Link href="/" className="article-source">
          ← Back home
        </Link>

        <p className="article-source">{article.source}</p>

        <h1 className="article-page-title">{article.title}</h1>

        {article.thumbnail && (
          <img
            className="article-page-image"
            src={article.thumbnail}
            alt={article.title}
          />
        )}

    <div className="article-page-body">
      {(article.content ).map(
        (paragraph, index) => (
<p className="article-page-paragraph" key={index}>{paragraph}</p>

        )
      )}
    </div>

        {article.link && (
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="article-page-link"
          >
            Read original article
          </a>
        )}
      </section>
    </main>
  );
}

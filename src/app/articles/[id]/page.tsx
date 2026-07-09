"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import API_BASE_URL from "@/lib/api";

type Article = {
  title: string;
  summary: string;
  source: string;
  content?: string[];
  thumbnail?: string;
  url?: string;
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
        const response = await axios.get(`${API_BASE_URL}/api_fetch`);

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
        <div className="home-content" style={{ padding: '2rem 1rem' }}>
          <Link href="/" className="refresh-button">
            ← Back home
          </Link>
        </div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="home-page">
        <section className="home-content">
          <p className="home-message" style={{ marginTop: '2rem' }}>Loading article...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="home-page">


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
          {(Array.isArray(article.content) ? article.content : []).map(
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

'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

useEffect(() => {
  const fetchApi = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5000/api_fetch");
      console.log("✅ GET Success:", response.data);
      setData(response.data);
    } catch (err) {
      setError("Failed to fetch data. Check the endpoint or API status.");
      console.error("❌ GET Error:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchApi();
}, []);

return (
  <main className="relative min-h-screen overflow-hidden bg-black text-white">
    {/* Background stock image */}
    <div
      className="fixed inset-0 bg-cover bg-center scale-110 blur-sm opacity-200"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1776334745897-02b3d577bac8?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
      }}
    />

    {/* Dark overlay */}
    <div className="fixed inset-0 bg-black/30" />

    {/* Main content */}
<section className="relative z-10 pt-24 pb-12">
  <header className=" min-h-[260px] flex  justify-center">
    <h1 className="text-6xl md:text-8xl font-black tracking-tight">
      Todd's Times
    </h1>
  </header>
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 auto-rows-[230px] gap-6 ">
        {data?.map((element, index) => {
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

          return (
            <article
              key={index}
              className={`${cardSize} group cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl hover:bg-white/15 transition flex flex-col`}
            >
              {element.thumbnail && (
                <img
                  className={`w-full object-cover ${
                    featured ? "h-72" : tall ? "h-56" : "h-32"
                  }`}
                  src={element.thumbnail}
                  alt={element.title}
                />
              )}

              <div className="flex flex-1 flex-col p-1">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                    {element.source}
                  </p>

                  <p className="text-[10px] uppercase text-white/30">
                    {index + 1}
                  </p>
                </div>

                <h2
                  className={`font-bold leading-tight mb-3 group-hover:underline ${
                    featured ? "text-3xl" : "text-lg"
                  }`}
                >
                  {element.title}
                </h2>

                <p className="text-sm leading-snug text-white/60 line-clamp-4">
                  {element.summary}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  </main>
);}

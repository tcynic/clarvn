"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { ContentCard } from "./ContentCard";

export function ContentSection() {
  const articles = useQuery(api.contentArticles.listArticles, { limit: 4 });

  if (!articles || articles.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-[var(--ink)] mb-3">
        Get smart about food labels
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {articles.map((article: Doc<"content_articles">) => (
          <ContentCard
            key={article._id}
            title={article.title}
            category={article.category}
            emoji={article.emoji}
            slug={article.slug}
          />
        ))}
      </div>
    </section>
  );
}

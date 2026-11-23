import db from "@/services/database";
import { create } from "zustand";

// Shape of a single history entry. We keep just enough to render a
// card in the Library tab and to re-open the article.
export type HistoryArticle = {
    title: string;
    thumbnail?: string;
    readAt: number;
};

export interface ArticleHistoryState {
    articles: HistoryArticle[];
    addToHistory: (article: HistoryArticle) => void;
    removeFromHistory: (title: string) => void;
    clearHistory: () => void;
}

const loadInitialHistory = (): HistoryArticle[] => {
    try {
        return db.getAllSync<HistoryArticle>(
            "SELECT title, thumbnail, read_at as readAt FROM article_history ORDER BY read_at DESC",
        );
    } catch (error) {
        console.warn("Failed to load article history from database:", error);
        return [];
    }
};

export const useArticleHistoryStore = create<ArticleHistoryState>((set) => ({
    articles: loadInitialHistory(),

    /**
     * Add or update a history entry. If the article already exists in
     * history, it is moved to the top with an updated readAt timestamp.
     * Otherwise it is prepended.
     */
    addToHistory: (article: HistoryArticle) => {
        try {
            db.runSync(
                "INSERT OR REPLACE INTO article_history (title, thumbnail, read_at) VALUES (?, ?, ?)",
                [article.title, article.thumbnail ?? null, article.readAt],
            );
        } catch (error) {
            console.warn("Failed to add article to history in database:", error);
        }

        set((state) => ({
            articles: [
                article,
                ...state.articles.filter((a) => a.title !== article.title),
            ],
        }));
    },

    removeFromHistory: (title: string) => {
        try {
            db.runSync("DELETE FROM article_history WHERE title = ?", [title]);
        } catch (error) {
            console.warn("Failed to remove article from history in database:", error);
        }

        set((state) => ({
            articles: state.articles.filter(
                (article) => article.title !== title,
            ),
        }));
    },

    clearHistory: () => {
        try {
            db.runSync("DELETE FROM article_history");
        } catch (error) {
            console.warn("Failed to clear article history in database:", error);
        }

        set({ articles: [] });
    },
}));

// Returns the full history list and re-renders on change.
export const useHistory = () =>
    useArticleHistoryStore((state) => state.articles);

// Standalone actions and helper functions
export const addToHistory = (article: HistoryArticle) =>
    useArticleHistoryStore.getState().addToHistory(article);

export const removeFromHistory = (title: string) =>
    useArticleHistoryStore.getState().removeFromHistory(title);

export const clearHistory = () =>
    useArticleHistoryStore.getState().clearHistory();

export const getHistory = () =>
    useArticleHistoryStore.getState().articles;

/**
 * Format a timestamp into a human-friendly relative time string.
 *
 * - Less than 1 minute  → "Just now"
 * - Less than 1 hour    → "X min ago"
 * - Less than 1 day     → "X hours ago"
 * - Less than 7 days    → "X days ago"
 * - Older than 7 days   → Short date like "Jul 28"
 */
export const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;

    // Older than a week → show short date
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

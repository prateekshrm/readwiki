import db from "@/services/database";
import { toast } from "@/stores/toast.store";
import { create } from "zustand";

// Shape of a single saved article. We store only title + thumbnail
// (no description) to keep the data lean.
export type SavedArticle = {
    title: string;
    thumbnail?: string;
    savedAt: number;
};

export interface SavedArticlesState {
    articles: SavedArticle[];
    isArticleSaved: (title: string) => boolean;
    saveArticle: (article: SavedArticle) => void;
    removeArticle: (title: string) => void;
    toggleSavedArticle: (article: SavedArticle) => void;
    clearSavedArticles: () => void;
}

const loadInitialSavedArticles = (): SavedArticle[] => {
    try {
        return db.getAllSync<SavedArticle>(
            "SELECT title, thumbnail, saved_at as savedAt FROM saved_articles ORDER BY saved_at DESC",
        );
    } catch (error) {
        console.warn("Failed to load saved articles from database:", error);
        return [];
    }
};

export const useSavedArticlesStore = create<SavedArticlesState>((set, get) => ({
    articles: loadInitialSavedArticles(),

    isArticleSaved: (title: string) => {
        return get().articles.some((article) => article.title === title);
    },

    saveArticle: (article: SavedArticle) => {
        if (get().isArticleSaved(article.title)) {
            return;
        }

        try {
            db.runSync(
                "INSERT OR REPLACE INTO saved_articles (title, thumbnail, saved_at) VALUES (?, ?, ?)",
                [article.title, article.thumbnail ?? null, article.savedAt],
            );
        } catch (error) {
            console.warn("Failed to save article to database:", error);
        }

        // Newest saved articles go to the top of the list.
        set((state) => ({
            articles: [article, ...state.articles],
        }));
    },

    removeArticle: (title: string) => {
        try {
            db.runSync("DELETE FROM saved_articles WHERE title = ?", [title]);
        } catch (error) {
            console.warn("Failed to remove article from database:", error);
        }

        set((state) => ({
            articles: state.articles.filter(
                (article) => article.title !== title,
            ),
        }));
    },

    toggleSavedArticle: (article: SavedArticle) => {
        if (get().isArticleSaved(article.title)) {
            get().removeArticle(article.title);
            toast.show("Removed from Saved", article.title, "bookmark-line");
        } else {
            get().saveArticle(article);
            toast.show("Article Saved", article.title, "bookmark-fill");
        }
    },

    clearSavedArticles: () => {
        try {
            db.runSync("DELETE FROM saved_articles");
        } catch (error) {
            console.warn("Failed to clear saved articles in database:", error);
        }

        set({ articles: [] });
        toast.show("Saved Articles Cleared", undefined, "bookmark-2-line");
    },
}));

// Returns the full saved list and re-renders on change.
export const useSavedArticles = () =>
    useSavedArticlesStore((state) => state.articles);

// Returns whether a single article is saved and re-renders on change.
export const useIsSaved = (title: string) =>
    useSavedArticlesStore((state) =>
        state.articles.some((article) => article.title === title),
    );

// Standalone actions and helper functions
export const isArticleSaved = (title: string) =>
    useSavedArticlesStore.getState().isArticleSaved(title);

export const saveArticle = (article: SavedArticle) =>
    useSavedArticlesStore.getState().saveArticle(article);

export const removeArticle = (title: string) =>
    useSavedArticlesStore.getState().removeArticle(title);

export const toggleSavedArticle = (article: SavedArticle) =>
    useSavedArticlesStore.getState().toggleSavedArticle(article);

export const clearSavedArticles = () =>
    useSavedArticlesStore.getState().clearSavedArticles();

export const getSavedArticles = () => useSavedArticlesStore.getState().articles;

import { create } from "zustand";

export type ArticleData = {
    html: string;
    title: string;
    description?: string;
    heroImage?: string;
    heroWidth?: number;
    heroHeight?: number;
    thumbnail?: string;
};

const MAX_ARTICLES = 5;

const normalizeKey = (title: string): string => {
    try {
        return decodeURIComponent(title).trim().replace(/_/g, " ").toLowerCase();
    } catch {
        return title.trim().replace(/_/g, " ").toLowerCase();
    }
};

interface ArticleCacheState {
    featuredData: any | null;
    cachedArticles: Record<string, ArticleData>;
    recentArticleKeys: string[];

    // Featured data actions
    setFeaturedData: (data: any) => void;
    clearFeaturedData: () => void;

    // Article cache actions
    getCachedArticle: (title: string) => ArticleData | null;
    setCachedArticle: (title: string, data: ArticleData) => void;
    clearCachedArticle: (title?: string) => void;

    // Invalidate everything
    clearAllCache: () => void;
}

export const useArticleCacheStore = create<ArticleCacheState>((set, get) => ({
    featuredData: null,
    cachedArticles: {},
    recentArticleKeys: [],

    setFeaturedData: (data: any) => set({ featuredData: data }),

    clearFeaturedData: () => set({ featuredData: null }),

    getCachedArticle: (title: string) => {
        const key = normalizeKey(title);
        const article = get().cachedArticles[key];
        if (!article) return null;

        // Move key to the most recent position
        set((state) => ({
            recentArticleKeys: [
                key,
                ...state.recentArticleKeys.filter((k) => k !== key),
            ],
        }));

        return article;
    },

    setCachedArticle: (title: string, data: ArticleData) => {
        const key = normalizeKey(title);

        set((state) => {
            const nextKeys = [
                key,
                ...state.recentArticleKeys.filter((k) => k !== key),
            ];
            const keptKeys = nextKeys.slice(0, MAX_ARTICLES);
            const evictedKeys = nextKeys.slice(MAX_ARTICLES);

            const nextArticles = { ...state.cachedArticles };
            for (const evicted of evictedKeys) {
                delete nextArticles[evicted];
            }
            nextArticles[key] = data;

            return {
                cachedArticles: nextArticles,
                recentArticleKeys: keptKeys,
            };
        });
    },

    clearCachedArticle: (title?: string) => {
        if (!title) {
            set({ cachedArticles: {}, recentArticleKeys: [] });
            return;
        }

        const key = normalizeKey(title);
        set((state) => {
            const nextArticles = { ...state.cachedArticles };
            delete nextArticles[key];
            return {
                cachedArticles: nextArticles,
                recentArticleKeys: state.recentArticleKeys.filter(
                    (k) => k !== key,
                ),
            };
        });
    },

    clearAllCache: () =>
        set({
            featuredData: null,
            cachedArticles: {},
            recentArticleKeys: [],
        }),
}));

export const clearAllCache = () =>
    useArticleCacheStore.getState().clearAllCache();

import { ArticleData, useArticleCacheStore } from "@/stores/articleCache.store";
import { fetch } from "react-native-nitro-fetch";

export type { ArticleData };

const BASE_URL = "https://api.wikimedia.org";

export const getFeaturedData = async () => {
    try {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        const url = `${BASE_URL}/feed/v1/wikipedia/en/featured/${year}/${month}/${day}`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "ReadWiki/2.0.0",
                "Api-User-Agent": "ReadWiki/2.0.0",
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch featured content");
        }

        const data = await response.json();

        useArticleCacheStore.getState().setFeaturedData(data);

        return data;
    } catch (error) {
        console.log(error);
        return null;
    }
};

export const getTomorrowFeaturedArticleTitle = async () => {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const day = String(tomorrow.getDate()).padStart(2, "0");

        const url = `${BASE_URL}/feed/v1/wikipedia/en/featured/${year}/${month}/${day}`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "ReadWiki/2.0.0",
                "Api-User-Agent": "ReadWiki/2.0.0",
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch tomorrow's featured article");
        }

        const data = await response.json();

        return data.tfa.titles.normalized;
    } catch (error) {
        console.log(error);
        return null;
    }
};

// Converts thumbnail URLs to higher resolutions for high-DPI displays.
const toHighRes = (url?: string) =>
    url ? url.replace(/\/(\d+)px-/, "/1280px-") : undefined;

const toThumbnail = (url?: string) =>
    url ? url.replace(/\/(\d+)px-/, "/250px-") : undefined;

// Fetches the clean article HTML and metadata from the MediaWiki "parse" endpoint.
// Returns the full HTML along with title, short description, and lead hero image,
// eliminating the need for an extra summary API request.
export const getFullArticle = async (
    title: string,
    forceRefresh = false,
): Promise<ArticleData | null> => {
    try {
        if (!forceRefresh) {
            const cachedData = useArticleCacheStore
                .getState()
                .getCachedArticle(title);

            if (cachedData) {
                return cachedData;
            }
        }

        const encodedTitle = encodeURIComponent(title);

        const response = await fetch(
            `https://en.wikipedia.org/w/api.php?action=parse&format=json&redirects=1&prop=text|tocdata|revid|displaytitle|images|properties&page=${encodedTitle}`,
            {
                headers: {
                    "User-Agent": "ReadWiki/2.0.0",
                    "Api-User-Agent": "ReadWiki/2.0.0",
                },
            },
        );

        if (!response.ok) {
            throw new Error("Failed to fetch article");
        }

        const data = await response.json();
        const html = (
            typeof data?.parse?.text === "string"
                ? data.parse.text
                : data?.parse?.text?.["*"]
        ) as string | undefined;

        if (!html) {
            return null;
        }

        const parsedTitle = data.parse?.title || title;
        const properties = data.parse?.properties || [];

        // Short description from properties or HTML
        let description: string | undefined = properties.find(
            (p: any) => p.name === "wikibase-shortdesc",
        )?.["*"];

        if (!description) {
            const shortDescMatch = html.match(
                /class="[^"]*shortdescription[^"]*"[^>]*>([^<]+)<\/div>/i,
            );
            if (shortDescMatch) {
                description = shortDescMatch[1].trim();
            }
        }

        // Hero image strictly from MediaWiki's page_image_free / page_image properties
        // (avoids promoting unrelated navbox logos, maintenance icons, etc.)
        const pageImageName: string | undefined =
            properties.find((p: any) => p.name === "page_image_free")?.["*"] ??
            properties.find((p: any) => p.name === "page_image")?.["*"];

        let heroImage: string | undefined;
        let heroWidth: number | undefined;
        let heroHeight: number | undefined;

        if (pageImageName) {
            const rawName = pageImageName.replace(/ /g, "_");
            const cleanName = encodeURIComponent(rawName);
            const imgRegex = /<img\b([^>]+)>/gi;
            let match;

            while ((match = imgRegex.exec(html)) !== null) {
                const attrs = match[1];
                const srcMatch = attrs.match(/src="([^">]+)"/i);
                if (!srcMatch) continue;

                let src = srcMatch[1].replace(/&amp;/g, "&");
                if (src.startsWith("//")) src = "https:" + src;

                let decodedSrc = src;
                try {
                    decodedSrc = decodeURIComponent(src);
                } catch {
                    // Keep original src if malformed percent-encoding
                }

                if (
                    !src.includes(cleanName) &&
                    !src.includes(rawName) &&
                    !decodedSrc.includes(rawName)
                ) {
                    continue;
                }

                const widthMatch = attrs.match(/width="(\d+)"/i);
                const heightMatch = attrs.match(/height="(\d+)"/i);
                const classMatch = attrs.match(/class="([^">]+)"/i);

                const w = widthMatch ? parseInt(widthMatch[1], 10) : undefined;
                const h = heightMatch
                    ? parseInt(heightMatch[1], 10)
                    : undefined;
                const cls = classMatch ? classMatch[1] : "";

                if (cls.includes("mwe-math") || cls.includes("mw-file-icon")) {
                    continue;
                }
                if ((w && w < 50) || (h && h < 50)) continue;

                heroImage = src;
                heroWidth = w;
                heroHeight = h;
                break;
            }
        }

        const articleData: ArticleData = {
            html,
            title: parsedTitle,
            description,
            heroImage: toHighRes(heroImage),
            heroWidth,
            heroHeight,
            thumbnail: toThumbnail(heroImage),
        };

        useArticleCacheStore.getState().setCachedArticle(title, articleData);

        return articleData;
    } catch (error) {
        console.log(error);
        if (forceRefresh) {
            const cached = useArticleCacheStore
                .getState()
                .getCachedArticle(title);
            if (cached) {
                return cached;
            }
        }
        return null;
    }
};

// Short summary of an article: title, one-line description, extract and
// lead image. Used for previewing articles without caching.
export const getArticleSummary = async (
    title: string,
    forceRefresh = false,
) => {
    try {
        const encodedTitle = encodeURIComponent(title);

        const response = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
            {
                headers: {
                    "User-Agent": "ReadWiki/2.0.0",
                    "Api-User-Agent": "ReadWiki/2.0.0",
                },
            },
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        return data;
    } catch (error) {
        console.log(error);
        return null;
    }
};

export const getArticlePreviewSummary = getArticleSummary;

export const searchArticles = async (query: string) => {
    try {
        if (!query.trim()) {
            return [];
        }

        const encodedQuery = encodeURIComponent(query);

        const response = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&generator=prefixsearch&description&prop=pageprops%7Cpageimages%7Cdescription&piprop=thumbnail&pithumbsize=128&format=json&formatversion=2&maxage=900&smaxage=900&gpssearch=${encodedQuery}`,
            {
                headers: {
                    "User-Agent": "ReadWiki/2.0.0",
                    "Api-User-Agent": "ReadWiki/2.0.0",
                },
            },
        );

        const data = await response.json();

        return data.query?.pages ?? [];
    } catch (error) {
        console.log(error);
        return [];
    }
};

export const getRandomArticle = async () => {
    try {
        const response = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/random/summary`,
            {
                headers: {
                    "User-Agent": "ReadWiki/2.0.0",
                    "Api-User-Agent": "ReadWiki/2.0.0",
                },
            },
        );

        if (!response.ok) {
            throw new Error("Failed to fetch random article");
        }

        const article = await response.json();

        return article.title;
    } catch (error) {
        console.log(error);
        return [];
    }
};

export async function getRandomArticles(limit = 50) {
    const response = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=random&grnnamespace=0&prop=extracts|info|pageimages&inprop=url|varianttitles&grnlimit=${limit}&exintro=1&exlimit=max&exsentences=5&explaintext=1&piprop=thumbnail&pilimit=max&pithumbsize=800&origin=*`,
        {
            headers: {
                "User-Agent": "ReadWiki/2.0.0",
                "Api-User-Agent": "ReadWiki/2.0.0",
            },
        },
    );

    if (!response.ok) {
        throw new Error("Failed to fetch random articles");
    }

    const data = await response.json();

    return Object.values(data.query?.pages ?? {});
}

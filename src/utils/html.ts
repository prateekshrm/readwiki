import { Span } from "@/services/articleParser";
import { parseDocument } from "htmlparser2";

// Turns a Wikipedia href or full URL into an article title we can open in the app,
// or null when the link is not an internal article.
export const articleFromHref = (href?: string): string | null => {
    if (!href) return null;

    // Matches /wiki/Title or https://en.wikipedia.org/wiki/Title
    const match = href.match(/(?:\/wiki\/|^wiki\/)([^#?]+)/);
    const raw = match
        ? match[1]
        : href.startsWith("/wiki/")
          ? href.slice("/wiki/".length).split("#")[0]
          : null;
    if (!raw) return null;

    let title: string;
    try {
        title = decodeURIComponent(raw);
    } catch {
        title = raw;
    }

    // Skip non-article namespaces (File:, Category:, Help:, …).
    if (
        /^(File|Image|Media|Special|Help|Category|Template|Wikipedia|Portal|Talk|Draft|Module):/i.test(
            title,
        )
    ) {
        return null;
    }

    return title.replace(/_/g, " ");
};

// Parses an HTML snippet (such as Wikipedia DYK entries) into rich text Spans
// with link, bold, and italic attributes.
export const parseHtmlToSpans = (html: string): Span[] => {
    if (!html) return [];

    const doc = parseDocument(html);
    const rawSpans: Span[] = [];

    const walk = (n: any, ctx: Omit<Span, "text">) => {
        if (!n) return;

        if (n.type === "text") {
            const text = (n.data ?? "").replace(/\s+/g, " ");
            if (text) rawSpans.push({ text, ...ctx });
            return;
        }

        if (n.type !== "tag") return;

        // Skip comments, style, script
        if (n.name === "style" || n.name === "script") return;

        if (n.name === "br") {
            rawSpans.push({ text: "\n" });
            return;
        }

        const next = { ...ctx };
        if (n.name === "b" || n.name === "strong") next.bold = true;
        if (n.name === "i" || n.name === "em") next.italic = true;
        if (n.name === "a") {
            const href = n.attribs?.href;
            if (href) {
                const wikiTitle = articleFromHref(href);
                if (wikiTitle) {
                    next.link = wikiTitle;
                } else {
                    next.link = href;
                }
            }
        }

        (n.children ?? []).forEach((child: any) => walk(child, next));
    };

    (doc.children ?? []).forEach((c: any) => walk(c, {}));

    // Merge adjacent spans with identical formatting
    const merged: Span[] = [];
    for (const span of rawSpans) {
        if (!span.text) continue;
        const prev = merged[merged.length - 1];
        if (
            prev &&
            prev.bold === span.bold &&
            prev.italic === span.italic &&
            prev.link === span.link
        ) {
            prev.text += span.text;
        } else {
            merged.push({ ...span });
        }
    }

    // Clean up unwanted space before punctuation marks (like "inside it ?" -> "inside it?")
    for (let i = 1; i < merged.length; i++) {
        if (
            /^[?!.,;:]/.test(merged[i].text.trim()) &&
            merged[i - 1].text.endsWith(" ")
        ) {
            merged[i - 1].text = merged[i - 1].text.replace(/\s+$/, "");
        }
    }

    return merged;
};

// The Wikipedia "In the news" stories arrive as HTML fragments (wiki links,
// bold/italic tags and an HTML comment date marker). This strips them down to
// plain text for display in cards.
export const stripHtml = (html: string): string => {
    if (!html) {
        return "";
    }

    return html
        .replace(/<!--.*?-->/g, "") // leading date comment, e.g. <!--Jul 03-->
        .replace(/<[^>]+>/g, "") // any remaining tags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
};

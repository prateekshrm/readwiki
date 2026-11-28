import { parseDocument } from "htmlparser2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// An inline run of text inside a paragraph, list item, or fact value.
// `link` holds the Wikipedia article title to open when tappable.
export type Span = {
    text: string;
    bold?: boolean;
    italic?: boolean;
    link?: string;
    refId?: string;
};

export type TableCellImage = {
    src: string;
    width?: number;
    height?: number;
    alt?: string;
    link?: string;
};

export type TableCell = {
    spans: Span[];
    images?: TableCellImage[];
    imagePosition?: "before" | "after";
    isHeader: boolean;
    rowspan: number;
    colspan: number;
    align?: "left" | "center" | "right";
};

export type LogicalRowSubCell = {
    cell: TableCell;
    subRowSpan: number;
};

export type LogicalRowColumn = {
    subCells: LogicalRowSubCell[];
    colspan: number;
};

export type LogicalRowBlock = {
    numSubRows: number;
    columns: LogicalRowColumn[];
};

export type TableBlock = {
    type: "table";
    caption?: string;
    numCols: number;
    numRows: number;
    blocks: LogicalRowBlock[];
};

export type InfoboxComparativeColumn = {
    spans: Span[];
    images?: TableCellImage[];
    align?: "left" | "center" | "right";
};

export type InfoboxImage = {
    src: string;
    caption?: string;
    width?: number;
    height?: number;
    alt?: string;
};

export type InfoboxItem =
    | {
          type: "header";
          title: string;
      }
    | {
          type: "subheader";
          values: Span[];
      }
    | {
          type: "row";
          label: string;
          values: Span[];
          images?: TableCellImage[];
      }
    | {
          type: "images";
          images: InfoboxImage[];
          grid?: InfoboxImage[][];
          caption?: string;
      }
    | {
          type: "comparison";
          label?: string;
          isScore?: boolean;
          columns: InfoboxComparativeColumn[];
      };

export type InfoboxBlock = {
    type: "infobox";
    title?: string;
    image?: InfoboxImage;
    images?: InfoboxImage[];
    grid?: InfoboxImage[][];
    caption?: string;
    items: InfoboxItem[];
};

export type QuoteBlock = {
    type: "quote";
    spans: Span[];
    citation?: string;
};

export type CodeBlock = {
    type: "code";
    code: string;
    language?: string;
};

export type ImageBlock = {
    type: "image";
    src: string;
    caption?: string;
    width?: number;
    height?: number;
};

export type GalleryItem = {
    src: string;
    caption?: string;
    width?: number;
    height?: number;
};

export type GalleryBlock = {
    type: "gallery";
    images: GalleryItem[];
    caption?: string;
};

export type HeadingBlock = {
    type: "heading";
    level: number;
    text: string;
};

export type ParagraphBlock = {
    type: "paragraph";
    spans: Span[];
};

export type ListBlock = {
    type: "list";
    ordered: boolean;
    items: Span[][];
};

// The building blocks the article screen knows how to render.
export type Block =
    | HeadingBlock
    | ParagraphBlock
    | ListBlock
    | ImageBlock
    | GalleryBlock
    | TableBlock
    | InfoboxBlock
    | QuoteBlock
    | CodeBlock;

// ---------------------------------------------------------------------------
// What to ignore (noise reduction)
// ---------------------------------------------------------------------------

const SKIP_TAGS = new Set(["style", "script", "noscript", "template"]);

const SKIP_CLASSES = new Set([
    "navbox",
    "vertical-navbox",
    "navbox-styles",
    "hatnote",
    "shortdescription",
    "metadata",
    "mw-empty-elt",
    "sistersitebox",
    "portal",
    "mw-editsection",
    "mw-editsection-bracket",
    "noprint",
    "toc",
    "toctitle",
    "catlinks",
    "printfooter",
    "thumbinner-hidden",
    "ambox",
    "mbox-small",
    "tmbox",
    "cmbox",
    "ombox",
    "mw-authority-control",
    "mw-cite-backlink",
    "mw-ext-cite-error",
    "mw-jump-link",
    "mw-hidden-catlinks",
    "mw-collapsible-toggle",
    "collapseButton",
    "sidebar",
    "side-box",
    "chessboard",
    "chess-pieces",
    "chess-board",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getClasses = (node: any): string[] => {
    const className = node?.attribs?.class;
    return className ? className.split(/\s+/) : [];
};

const shouldSkip = (node: any): boolean => {
    if (!node) return false;

    if (
        node.type === "style" ||
        node.type === "script" ||
        node.type === "comment"
    ) {
        return true;
    }

    if (node.name === "style" || node.name === "script") return true;

    if (SKIP_TAGS.has(node.name) || SKIP_TAGS.has(node.type)) return true;

    if (node.type !== "tag") return false;

    const role = node.attribs?.role;
    if (role === "navigation" || role === "note") return true;

    if (node.attribs?.style?.includes("display:none")) return true;

    const classes = getClasses(node);
    return classes.some((cls) => SKIP_CLASSES.has(cls));
};

// Turns a Wikipedia href into an article title we can open in the app,
// or null when the link is not an internal article.
const articleFromHref = (href?: string): string | null => {
    if (!href || !href.startsWith("/wiki/")) return null;

    const raw = href.slice("/wiki/".length).split("#")[0];
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

// Plain text of a node and all its children (used for headings/captions).
const getText = (node: any): string => {
    if (!node || shouldSkip(node)) return "";
    if (node.type === "text") return node.data ?? "";
    if (!Array.isArray(node.children)) return "";
    return node.children
        .map((child: any) => {
            let text = getText(child);
            if (
                child.type === "tag" &&
                (child.name === "li" ||
                    child.name === "br" ||
                    child.name === "dd")
            ) {
                text = " " + text;
            }
            return text;
        })
        .join("")
        .replace(/\.mw-parser-output[^{]+\{[^}]+\}/g, "");
};

// Collapses adjacent runs that share the same formatting and drops empty runs.
const mergeSpans = (spans: Span[]): Span[] => {
    const merged: Span[] = [];

    for (const span of spans) {
        if (!span.text) continue;

        const last = merged[merged.length - 1];

        if (
            last &&
            !!last.bold === !!span.bold &&
            !!last.italic === !!span.italic &&
            last.link === span.link &&
            last.refId === span.refId
        ) {
            last.text += span.text;
        } else {
            merged.push({ ...span });
        }
    }

    // Trim the start and end of the entire run.
    if (merged.length) {
        merged[0].text = merged[0].text.replace(/^\s+/, "");
        merged[merged.length - 1].text = merged[merged.length - 1].text.replace(
            /\s+$/,
            "",
        );
    }

    return merged.filter((span) => span.text.length > 0);
};

// Collects inline spans inside a block element, carrying bold / italic / link /
// reference formatting down through nested tags, handling MathML and code.
export const getSpans = (node: any): Span[] => {
    const spans: Span[] = [];

    type WalkContext = Omit<Span, "text"> & { inReference?: boolean };

    const walkInline = (n: any, ctx: WalkContext) => {
        if (!n) return;

        if (n.type === "text") {
            const text = (n.data ?? "").replace(/\s+/g, " ");
            if (text) {
                const span: Span = { text };
                if (ctx.bold) span.bold = true;
                if (ctx.italic) span.italic = true;
                if (ctx.link) span.link = ctx.link;
                if (ctx.refId) span.refId = ctx.refId;
                spans.push(span);
            }
            return;
        }

        if (n.type !== "tag" || shouldSkip(n) || SKIP_TAGS.has(n.name)) return;

        if (n.name === "br") {
            spans.push({ text: "\n" });
            return;
        }

        if (n.name === "li") {
            if (
                spans.length > 0 &&
                !spans[spans.length - 1].text.endsWith("\n")
            ) {
                spans.push({ text: "\n" });
            }
        }

        const next: WalkContext = { ...ctx };

        if (n.name === "b" || n.name === "strong") next.bold = true;
        if (n.name === "i" || n.name === "em") next.italic = true;
        if (n.name === "sup" && getClasses(n).includes("reference")) {
            next.inReference = true;
        }
        if (n.name === "a") {
            const href = n.attribs?.href;
            if (href) {
                if (
                    href.startsWith("#cite_note-") ||
                    (ctx.inReference && href.startsWith("#"))
                ) {
                    next.refId = href.slice(1);
                } else if (
                    href.startsWith("http://") ||
                    href.startsWith("https://")
                ) {
                    next.link = href;
                } else if (href.startsWith("//")) {
                    next.link = `https:${href}`;
                } else {
                    const link = articleFromHref(href);
                    if (link) next.link = link;
                }
            }
        }

        (n.children ?? []).forEach((child: any) => walkInline(child, next));
    };

    (node.children ?? []).forEach((child: any) => walkInline(child, {}));

    return mergeSpans(spans);
};

// ---------------------------------------------------------------------------
// Block Parsers
// ---------------------------------------------------------------------------

// Checks if an image source or element represents a dynamic/static map restricted to Wikipedia origins.
export const isRestrictedMapImage = (src?: string, node?: any): boolean => {
    if (src) {
        if (src.includes("maps.wikimedia.org")) return true;
        if (/osm-intl|mapframe|kartographer/i.test(src)) return true;
    }
    if (node && node.type === "tag") {
        const cls = `${node.attribs?.class || ""} ${node.parent?.attribs?.class || ""}`;
        if (/kartographer|locmap/i.test(cls)) return true;
    }
    return false;
};

// Pulls an image block out of a <figure> or <div class="thumb"> element.
const parseFigure = (node: any): ImageBlock | null => {
    let img: any = null;

    const findImg = (n: any) => {
        if (img || !n) return;
        if (n.type === "tag" && n.name === "img") {
            img = n;
            return;
        }
        (n.children ?? []).forEach(findImg);
    };
    findImg(node);

    if (!img) return null;

    let src: string | undefined = img.attribs?.src;
    if (!src) return null;

    if (src.startsWith("//")) src = `https:${src}`;

    if (
        isRestrictedMapImage(src, img) ||
        isRestrictedMapImage(src, node) ||
        node?.attribs?.class?.includes("chessboard") ||
        src.includes("Chessboard480") ||
        src.includes("Chess_")
    ) {
        return null;
    }

    const width = Number(img.attribs?.width) || undefined;
    const height = Number(img.attribs?.height) || undefined;

    let caption = "";
    const findCaption = (n: any) => {
        if (caption || !n) return;
        if (
            n.type === "tag" &&
            (n.name === "figcaption" ||
                n.attribs?.class?.includes("thumbcaption") ||
                n.attribs?.class?.includes("gallerytext"))
        ) {
            caption = getText(n)
                .replace(/\.mw-parser-output[^{]+\{[^}]+\}/g, "")
                .replace(/\s+/g, " ")
                .trim();
            return;
        }
        (n.children ?? []).forEach(findCaption);
    };
    findCaption(node);

    return {
        type: "image",
        src,
        caption: caption || undefined,
        width,
        height,
    };
};

// Pulls image blocks out of a multi-image container (<div class="thumb tmulti">).
// If multiple images are present, returns a GalleryBlock for horizontal scrolling.
const parseMultiThumb = (node: any): GalleryBlock | ImageBlock | null => {
    let sharedCaption = "";
    const findSharedCaption = (n: any) => {
        if (sharedCaption || !n) return;
        if (
            n.type === "tag" &&
            (n.name === "figcaption" ||
                n.attribs?.class?.includes("thumbcaption") ||
                n.attribs?.class?.includes("gallerytext"))
        ) {
            sharedCaption = getText(n)
                .replace(/\.mw-parser-output[^{]+\{[^}]+\}/g, "")
                .replace(/\s+/g, " ")
                .trim();
            return;
        }
        (n.children ?? []).forEach(findSharedCaption);
    };
    findSharedCaption(node);

    const images: GalleryItem[] = [];
    const walkTsingle = (n: any) => {
        if (!n || n.type !== "tag") return;
        const cls = n.attribs?.class || "";
        if (cls.includes("tsingle")) {
            let img: any = null;
            const findImg = (curr: any) => {
                if (img || !curr) return;
                if (curr.type === "tag" && curr.name === "img") {
                    img = curr;
                    return;
                }
                (curr.children ?? []).forEach(findImg);
            };
            findImg(n);

            if (img) {
                let src: string | undefined = img.attribs?.src;
                if (src) {
                    if (src.startsWith("//")) src = `https:${src}`;

                    const width = Number(img.attribs?.width) || undefined;
                    const height = Number(img.attribs?.height) || undefined;

                    let subCaption = "";
                    const findSub = (curr: any) => {
                        if (subCaption || !curr) return;
                        if (
                            curr.type === "tag" &&
                            curr.attribs?.class?.includes("thumbcaption")
                        ) {
                            subCaption = getText(curr)
                                .replace(
                                    /\.mw-parser-output[^{]+\{[^}]+\}/g,
                                    "",
                                )
                                .replace(/\s+/g, " ")
                                .trim();
                            return;
                        }
                        (curr.children ?? []).forEach(findSub);
                    };
                    findSub(n);

                    images.push({
                        src,
                        caption: subCaption || undefined,
                        width,
                        height,
                    });
                }
            }
            return;
        }
        (n.children ?? []).forEach(walkTsingle);
    };

    walkTsingle(node);

    if (images.length === 0) return null;
    if (images.length === 1) {
        return {
            type: "image",
            ...images[0],
            caption: images[0].caption || sharedCaption || undefined,
        };
    }

    return {
        type: "gallery",
        images,
        caption: sharedCaption || undefined,
    };
};

// Pulls gallery blocks out of gallery containers.
const parseGallery = (node: any): GalleryBlock | ImageBlock | null => {
    let galleryCaption = "";
    const findGalCap = (n: any) => {
        if (galleryCaption || !n) return;
        if (
            n.type === "tag" &&
            (n.name === "caption" ||
                n.attribs?.class?.includes("gallerycaption"))
        ) {
            galleryCaption = getText(n)
                .replace(/\.mw-parser-output[^{]+\{[^}]+\}/g, "")
                .replace(/\s+/g, " ")
                .trim();
            return;
        }
        (n.children ?? []).forEach(findGalCap);
    };
    findGalCap(node);

    const images: GalleryItem[] = [];
    const walkGallery = (n: any) => {
        if (!n || n.type !== "tag") return;
        const cls = n.attribs?.class || "";
        if (cls.includes("gallerybox") || cls.includes("mod-gallery-image")) {
            const imgBlock = parseFigure(n);
            if (imgBlock) {
                images.push({
                    src: imgBlock.src,
                    caption: imgBlock.caption,
                    width: imgBlock.width,
                    height: imgBlock.height,
                });
            }
            return;
        }
        (n.children ?? []).forEach(walkGallery);
    };

    walkGallery(node);

    if (images.length === 0) return null;
    if (images.length === 1) {
        return {
            type: "image",
            ...images[0],
            caption: images[0].caption || galleryCaption || undefined,
        };
    }

    return {
        type: "gallery",
        images,
        caption: galleryCaption || undefined,
    };
};

// Pulls a quote block out of <blockquote>, <q>, or .quotebox.
const parseQuote = (node: any): QuoteBlock | null => {
    let citation = "";

    const findCite = (n: any) => {
        if (!n || citation) return;
        if (
            n.type === "tag" &&
            (n.name === "cite" ||
                n.attribs?.class?.includes("attribution") ||
                n.attribs?.class?.includes("author") ||
                n.attribs?.class?.includes("quotebox-cite"))
        ) {
            citation = getText(n).replace(/\s+/g, " ").trim();
            return;
        }
        (n.children ?? []).forEach(findCite);
    };
    findCite(node);

    const spans = getSpans(node);
    if (!spans.length) return null;

    return {
        type: "quote",
        spans,
        citation: citation || undefined,
    };
};

// Pulls a code block out of <pre> or .mw-code.
const parseCode = (node: any): CodeBlock | null => {
    const raw = getText(node);
    if (!raw.trim()) return null;

    let language: string | undefined;
    const cls = node.attribs?.class || "";
    const langMatch =
        cls.match(/lang(?:uage)?-(\w+)/i) ||
        cls.match(/mw-highlight-lang-(\w+)/i);
    if (langMatch) language = langMatch[1];

    return {
        type: "code",
        code: raw,
        language,
    };
};

// Checks if a node is an infobox table or container.
const isInfoboxNode = (node: any): boolean => {
    if (!node || node.type !== "tag") return false;
    const cls = node.attribs?.class || "";
    return /\binfobox\b/i.test(cls) || /\bib-[a-z]+\b/i.test(cls);
};

// Helper to extract large/medium illustration images and maps from an infobox row
const parseInfoboxRowImages = (
    tdNode: any,
): { images: InfoboxImage[]; grid?: InfoboxImage[][]; caption?: string } => {
    const results: InfoboxImage[] = [];

    // 1. Multi-image inner or gallery in infobox (e.g. London / WWII montage)
    let multi: any = null;
    const findMulti = (n: any) => {
        if (multi || !n) return;
        if (
            n.type === "tag" &&
            (n.attribs?.class?.includes("multiimageinner") ||
                (n.attribs?.class?.includes("thumb") &&
                    n.attribs?.class?.includes("tmulti")))
        ) {
            multi = n;
            return;
        }
        (n.children || []).forEach(findMulti);
    };
    findMulti(tdNode);

    if (multi) {
        // Collect caption from below multiimageinner if any
        let sharedCaption = "";
        const findSharedCaption = (n: any) => {
            if (sharedCaption || !n) return;
            if (
                n.type === "tag" &&
                (n.attribs?.class?.includes("infobox-caption") ||
                    n.attribs?.class?.includes("thumbcaption") ||
                    n.name === "figcaption")
            ) {
                sharedCaption = getText(n).trim();
                return;
            }
            (n.children || []).forEach(findSharedCaption);
        };
        findSharedCaption(tdNode);

        // Also check if there is an outer caption or description list (like in WWII)
        if (!sharedCaption) {
            const captionParts: string[] = [];
            for (const c of tdNode.children || []) {
                if (
                    c === multi ||
                    c.attribs?.class?.includes("thumb") ||
                    c.name === "style" ||
                    c.name === "link"
                ) {
                    continue;
                }
                const t = getText(c).trim();
                if (t) captionParts.push(t);
            }
            if (captionParts.length > 0) {
                sharedCaption = captionParts
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
            }
        }

        // Check if structured by trow (table rows)
        const trows: any[] = [];
        const findTrows = (n: any) => {
            if (!n) return;
            if (n.type === "tag" && n.attribs?.class?.includes("trow")) {
                trows.push(n);
                return;
            }
            (n.children || []).forEach(findTrows);
        };
        findTrows(multi);

        if (trows.length > 0) {
            const grid: InfoboxImage[][] = [];
            for (const trow of trows) {
                const rowImgs: InfoboxImage[] = [];
                const findRowImgs = (n: any) => {
                    if (!n) return;
                    if (n.name === "img") {
                        let src = n.attribs?.src;
                        if (src && src.startsWith("//")) src = `https:${src}`;
                        if (isRestrictedMapImage(src, n)) return;

                        const rawW = parseInt(n.attribs?.width, 10);
                        const rawH = parseInt(n.attribs?.height, 10);
                        const cls = n.attribs?.class || "";
                        if (
                            !cls.includes("mwe-math") &&
                            (isNaN(rawW) || rawW > 30) &&
                            (isNaN(rawH) || rawH > 30)
                        ) {
                            rowImgs.push({
                                src,
                                width: isNaN(rawW) ? undefined : rawW,
                                height: isNaN(rawH) ? undefined : rawH,
                                alt: n.attribs?.alt || undefined,
                            });
                        }
                        return;
                    }
                    (n.children || []).forEach(findRowImgs);
                };
                findRowImgs(trow);
                if (rowImgs.length > 0) {
                    grid.push(rowImgs);
                    results.push(...rowImgs);
                }
            }
            if (results.length > 0) {
                return {
                    images: results,
                    grid: grid.length > 0 ? grid : undefined,
                    caption: sharedCaption || undefined,
                };
            }
        } else {
            const findImgs = (n: any) => {
                if (!n) return;
                if (n.name === "img") {
                    let src = n.attribs?.src;
                    if (src && src.startsWith("//")) src = `https:${src}`;
                    if (isRestrictedMapImage(src, n)) return;

                    const rawW = parseInt(n.attribs?.width, 10);
                    const rawH = parseInt(n.attribs?.height, 10);
                    const cls = n.attribs?.class || "";
                    if (
                        !cls.includes("mwe-math") &&
                        (isNaN(rawW) || rawW > 30) &&
                        (isNaN(rawH) || rawH > 30)
                    ) {
                        results.push({
                            src,
                            width: isNaN(rawW) ? undefined : rawW,
                            height: isNaN(rawH) ? undefined : rawH,
                            alt: n.attribs?.alt || undefined,
                        });
                    }
                    return;
                }
                (n.children || []).forEach(findImgs);
            };
            findImgs(multi);
            if (results.length > 0) {
                return {
                    images: results,
                    caption: sharedCaption || undefined,
                };
            }
        }
    }

    // 2. Switcher container (e.g. Obverse / Reverse seals, or alternative maps)
    let switcher: any = null;
    const findSwitcher = (n: any) => {
        if (switcher || !n) return;
        if (
            n.type === "tag" &&
            n.attribs?.class?.includes("switcher-container")
        ) {
            switcher = n;
            return;
        }
        (n.children || []).forEach(findSwitcher);
    };
    findSwitcher(tdNode);

    if (switcher) {
        for (const child of switcher.children || []) {
            if (child.type !== "tag") continue;
            let img: any = null;
            let label = "";
            const scan = (n: any) => {
                if (n.name === "img" && !img) {
                    let src = n.attribs?.src;
                    if (src && src.startsWith("//")) src = `https:${src}`;
                    if (isRestrictedMapImage(src, n)) return;

                    const rawW = parseInt(n.attribs?.width, 10);
                    const rawH = parseInt(n.attribs?.height, 10);
                    const cls = n.attribs?.class || "";
                    if (
                        !cls.includes("mwe-math") &&
                        (isNaN(rawW) || rawW > 30) &&
                        (isNaN(rawH) || rawH > 30)
                    ) {
                        img = {
                            src,
                            width: isNaN(rawW) ? undefined : rawW,
                            height: isNaN(rawH) ? undefined : rawH,
                            alt: n.attribs?.alt || undefined,
                        };
                    }
                }
                if (n.attribs?.class?.includes("switcher-label")) {
                    label = getText(n).trim();
                }
                (n.children || []).forEach(scan);
            };
            scan(child);
            if (img) {
                results.push({ ...img, caption: label || undefined });
            }
        }
        if (results.length > 0) return { images: results };
    }

    // 3. No-resize container (e.g. Flag & Coat of arms side-by-side)
    let noresize: any = null;
    const findNoresize = (n: any) => {
        if (noresize || !n) return;
        if (n.type === "tag" && n.attribs?.class?.includes("noresize")) {
            noresize = n;
            return;
        }
        (n.children || []).forEach(findNoresize);
    };
    findNoresize(tdNode);

    if (noresize) {
        for (const div of noresize.children || []) {
            if (div.type !== "tag") continue;
            let img: any = null;
            let label = "";
            const scan = (n: any) => {
                if (n.name === "img" && !img) {
                    let src = n.attribs?.src;
                    if (src && src.startsWith("//")) src = `https:${src}`;
                    if (isRestrictedMapImage(src, n)) return;

                    const rawW = parseInt(n.attribs?.width, 10);
                    const rawH = parseInt(n.attribs?.height, 10);
                    const cls = n.attribs?.class || "";
                    if (
                        !cls.includes("mwe-math") &&
                        (isNaN(rawW) || rawW > 30) &&
                        (isNaN(rawH) || rawH > 30)
                    ) {
                        img = {
                            src,
                            width: isNaN(rawW) ? undefined : rawW,
                            height: isNaN(rawH) ? undefined : rawH,
                            alt: n.attribs?.alt || undefined,
                        };
                    }
                }
                if (
                    n.name === "a" &&
                    !n.attribs?.class?.includes("mw-file-description")
                ) {
                    label = getText(n).trim();
                }
                (n.children || []).forEach(scan);
            };
            scan(div);
            if (img) {
                results.push({ ...img, caption: label || undefined });
            }
        }
        if (results.length > 0) return { images: results };
    }

    // 4. Sequential or single image with caption (e.g. Apollo 11 insignia & crew)
    let currentImg: InfoboxImage | null = null;
    let captionParts: string[] = [];

    const flush = () => {
        if (currentImg) {
            results.push({
                ...currentImg,
                caption:
                    captionParts.join(" ").replace(/\s+/g, " ").trim() ||
                    undefined,
            });
            currentImg = null;
            captionParts = [];
        }
    };

    const findImgInNode = (n: any): any => {
        if (!n) return null;
        if (n.type === "tag" && n.name === "img") return n;
        for (const c of n.children || []) {
            const found = findImgInNode(c);
            if (found) return found;
        }
        return null;
    };

    for (const child of tdNode.children || []) {
        if (
            child.type === "tag" &&
            (child.attribs?.class?.includes("noprint") ||
                child.attribs?.class?.includes("navbox") ||
                child.name === "style")
        ) {
            continue;
        }

        const img = findImgInNode(child);
        if (img) {
            flush();
            let src = img.attribs?.src;
            if (src && src.startsWith("//")) src = `https:${src}`;
            if (isRestrictedMapImage(src, img)) continue;

            const rawW = parseInt(img.attribs?.width, 10);
            const rawH = parseInt(img.attribs?.height, 10);
            const cls = img.attribs?.class || "";
            if (
                !cls.includes("mwe-math") &&
                (isNaN(rawW) || rawW > 30) &&
                (isNaN(rawH) || rawH > 20)
            ) {
                currentImg = {
                    src,
                    width: isNaN(rawW) ? undefined : rawW,
                    height: isNaN(rawH) ? undefined : rawH,
                    alt: img.attribs?.alt || undefined,
                };
            }
        } else if (currentImg) {
            const t = getText(child).trim();
            if (t) captionParts.push(t);
        }
    }
    flush();

    // If sequential loop didn't catch anything, try a recursive image search
    if (results.length === 0) {
        let singleCaption = "";
        const findSingleCaption = (n: any) => {
            if (singleCaption || !n) return;
            if (
                n.type === "tag" &&
                (n.attribs?.class?.includes("infobox-caption") ||
                    n.attribs?.class?.includes("thumbcaption") ||
                    n.name === "figcaption")
            ) {
                singleCaption = getText(n).trim();
                return;
            }
            (n.children || []).forEach(findSingleCaption);
        };
        findSingleCaption(tdNode);

        const fallbackImgs: InfoboxImage[] = [];
        const walkImgs = (n: any) => {
            if (!n) return;
            if (n.type === "tag") {
                if (n.attribs?.class?.includes("noprint")) return;
                if (n.name === "img") {
                    let src = n.attribs?.src;
                    if (src && src.startsWith("//")) src = `https:${src}`;
                    if (isRestrictedMapImage(src, n)) return;

                    const rawW = parseInt(n.attribs?.width, 10);
                    const rawH = parseInt(n.attribs?.height, 10);
                    const cls = n.attribs?.class || "";
                    if (
                        !cls.includes("mwe-math") &&
                        (isNaN(rawW) || rawW > 30) &&
                        (isNaN(rawH) || rawH > 20)
                    ) {
                        fallbackImgs.push({
                            src,
                            width: isNaN(rawW) ? undefined : rawW,
                            height: isNaN(rawH) ? undefined : rawH,
                            alt: n.attribs?.alt || undefined,
                        });
                    }
                    return;
                }
                (n.children || []).forEach(walkImgs);
            }
        };
        walkImgs(tdNode);

        if (fallbackImgs.length === 1 && singleCaption) {
            fallbackImgs[0].caption = singleCaption;
        }
        return {
            images: fallbackImgs,
            caption: singleCaption || undefined,
        };
    }

    return { images: results };
};

// Pulls an infobox block with structured facts out of an infobox table.
const parseInfobox = (node: any): InfoboxBlock | null => {
    const items: InfoboxItem[] = [];
    let title = "";
    const topImages: InfoboxImage[] = [];
    let topGrid: InfoboxImage[][] | undefined;
    let topCaption: string | undefined;

    // Check <caption> first
    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            if (
                child.type === "tag" &&
                child.name === "caption" &&
                !shouldSkip(child)
            ) {
                const captionSpans = getSpans(child);
                title = captionSpans
                    .map((s) => s.text)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
                break;
            }
        }
    }

    const trs: any[] = [];
    const findTrs = (container: any) => {
        if (!container || !Array.isArray(container.children)) return;
        for (const child of container.children) {
            if (child.type !== "tag" || shouldSkip(child)) continue;
            if (child.name === "tr") {
                trs.push(child);
            } else if (["thead", "tbody", "tfoot"].includes(child.name)) {
                findTrs(child);
            }
        }
    };
    findTrs(node);

    for (const tr of trs) {
        const ths = (tr.children || []).filter(
            (c: any) => c.name === "th" && !shouldSkip(c),
        );
        const tds = (tr.children || []).filter(
            (c: any) => c.name === "td" && !shouldSkip(c),
        );

        const isAbove =
            tr.attribs?.class?.includes("infobox-above") ||
            tr.attribs?.class?.includes("summary") ||
            ths.some(
                (th: any) =>
                    th.attribs?.class?.includes("infobox-above") ||
                    th.attribs?.class?.includes("summary"),
            ) ||
            tds.some(
                (td: any) =>
                    td.attribs?.class?.includes("infobox-above") ||
                    td.attribs?.class?.includes("summary"),
            );
        const isHeader =
            tr.attribs?.class?.includes("infobox-header") ||
            ths.some((th: any) =>
                th.attribs?.class?.includes("infobox-header"),
            );

        // Header / Title row (th only)
        if (ths.length > 0 && tds.length === 0) {
            const headerSpans = getSpans(ths[0]);
            const headerText = headerSpans
                .map((s) => s.text)
                .join("")
                .trim();

            if (headerText) {
                if (isAbove && !title) {
                    title = headerText;
                } else {
                    items.push({ type: "header", title: headerText });
                }
            }
            continue;
        }

        // Subheader row (e.g. venue, dates in sports/events)
        if (
            tds.length === 1 &&
            ths.length === 0 &&
            tds[0].attribs?.class?.includes("infobox-subheader")
        ) {
            const spans = getSpans(tds[0]);
            if (spans.length) {
                items.push({ type: "subheader", values: spans });
            }
            continue;
        }

        // Below / footer navigation row (e.g. ← 2012 | 2014 →)
        if (
            tds.length === 1 &&
            ths.length === 0 &&
            tds[0].attribs?.class?.includes("infobox-below")
        ) {
            const td = tds[0];
            const parsedBelow = parseInfoboxRowImages(td);
            if (parsedBelow.images.length > 0) {
                items.push({
                    type: "images",
                    images: parsedBelow.images,
                    grid: parsedBelow.grid,
                    caption: parsedBelow.caption,
                });
                continue;
            }

            let leftSpans: Span[] = [];
            let rightSpans: Span[] = [];

            const findFloatSpans = (n: any) => {
                if (!n || n.type !== "tag") return;
                const style = n.attribs?.style || "";
                if (/float:\s*left/i.test(style)) {
                    leftSpans = getSpans(n);
                } else if (/float:\s*right/i.test(style)) {
                    rightSpans = getSpans(n);
                } else {
                    (n.children || []).forEach(findFloatSpans);
                }
            };
            findFloatSpans(td);

            if (leftSpans.length || rightSpans.length) {
                items.push({
                    type: "comparison",
                    columns: [
                        { spans: leftSpans, align: "left" },
                        { spans: rightSpans, align: "right" },
                    ],
                });
            } else {
                const spans = getSpans(td);
                if (spans.length) {
                    items.push({
                        type: "header",
                        title: spans
                            .map((s) => s.text)
                            .join("")
                            .trim(),
                    });
                }
            }
            continue;
        }

        // Nested score table inside td (e.g. 3½ - Scores - 6½)
        if (tds.length === 1) {
            let nestedTable: any = null;
            const findNestedTable = (n: any) => {
                if (!n || nestedTable) return;
                if (n.type === "tag" && n.name === "table") {
                    nestedTable = n;
                    return;
                }
                (n.children || []).forEach(findNestedTable);
            };
            findNestedTable(tds[0]);

            if (nestedTable) {
                const cells: any[] = [];
                const findCells = (n: any) => {
                    if (!n) return;
                    if (
                        n.type === "tag" &&
                        (n.name === "th" || n.name === "td")
                    ) {
                        cells.push(n);
                        return;
                    }
                    (n.children || []).forEach(findCells);
                };
                findCells(nestedTable);

                if (cells.length === 3) {
                    const score1 = getSpans(cells[0]);
                    const scoreLabel = getText(cells[1]).trim();
                    const score2 = getSpans(cells[2]);
                    items.push({
                        type: "comparison",
                        isScore: true,
                        label: scoreLabel || "Scores",
                        columns: [
                            { spans: score1, align: "center" },
                            { spans: score2, align: "center" },
                        ],
                    });
                    continue;
                }
            }
        }

        // Multi-column comparative row (2 or more tds, e.g. contestant A vs B)
        if (tds.length >= 2) {
            let label = "";
            if (ths.length > 0) {
                const labelSpans = getSpans(ths[0]);
                label = labelSpans
                    .map((s) => s.text)
                    .join(" ")
                    .trim()
                    .replace(/^[•·\s]+/, "")
                    .replace(/:\s*$/, "")
                    .trim();
            }

            const columns: InfoboxComparativeColumn[] = tds.map((td: any) => {
                const spans = getSpans(td);
                const { images } = parseCellImages(td);

                const hasLargeImg = images.some(
                    (i) => (i.width ?? 0) > 40 || (i.height ?? 0) > 40,
                );
                let colSpans = spans;
                if (
                    hasLargeImg &&
                    spans.length === 1 &&
                    images.some(
                        (i) => i.alt && i.alt.trim() === spans[0].text.trim(),
                    )
                ) {
                    colSpans = [];
                }

                const alignAttr = td.attribs?.align;
                const styleAlign =
                    td.attribs?.style?.match(/text-align:\s*(\w+)/)?.[1];
                let align: "left" | "center" | "right" = "center";
                const rawAlign = (alignAttr || styleAlign || "").toLowerCase();
                if (
                    rawAlign === "left" ||
                    rawAlign === "center" ||
                    rawAlign === "right"
                ) {
                    align = rawAlign;
                }

                return {
                    spans: colSpans,
                    images: images.length > 0 ? images : undefined,
                    align,
                };
            });

            items.push({
                type: "comparison",
                label: label || undefined,
                columns,
            });
            continue;
        }

        // Single TD cell (images, lead photo, maps, or subheader)
        if (tds.length > 0 && ths.length === 0) {
            const parsedRow = parseInfoboxRowImages(tds[0]);
            if (parsedRow.images.length > 0) {
                if (items.length === 0 && topImages.length === 0) {
                    topImages.push(...parsedRow.images);
                    if (parsedRow.grid) topGrid = parsedRow.grid;
                    if (parsedRow.caption) topCaption = parsedRow.caption;
                } else {
                    items.push({
                        type: "images",
                        images: parsedRow.images,
                        grid: parsedRow.grid,
                        caption: parsedRow.caption,
                    });
                }
                continue;
            }

            const tdText = getText(tds[0]).trim();
            if (
                tdText &&
                (isAbove ||
                    isHeader ||
                    tds[0].attribs?.class?.includes("infobox-header") ||
                    tdText.length < 40)
            ) {
                if (isAbove && !title) {
                    title = tdText;
                } else {
                    items.push({ type: "header", title: tdText });
                }
            }
            continue;
        }

        // Standard Label & Value row
        if (ths.length > 0 && tds.length > 0) {
            const labelSpans = getSpans(ths[0]);
            let labelText = labelSpans
                .map((s) => s.text)
                .join(" ")
                .trim();
            labelText = labelText
                .replace(/^[•·\s]+/, "")
                .replace(/:\s*$/, "")
                .trim();

            const valueSpans: Span[] = [];
            for (let i = 0; i < tds.length; i++) {
                const s = getSpans(tds[i]);
                if (s.length > 0) {
                    if (valueSpans.length > 0) {
                        valueSpans.push({ text: " " });
                    }
                    valueSpans.push(...s);
                }
            }
            const valueText = valueSpans
                .map((s: Span) => s.text)
                .join("")
                .trim();

            const { images: rowCellImages } = parseCellImages(tds[0]);

            if (labelText && (valueText || rowCellImages.length > 0)) {
                items.push({
                    type: "row",
                    label: labelText,
                    values: valueSpans,
                    images:
                        rowCellImages.length > 0 ? rowCellImages : undefined,
                });
            } else if (!labelText && valueText && valueText.length < 50) {
                items.push({ type: "header", title: valueText });
            }
        }
    }

    if (items.length === 0 && topImages.length === 0) return null;

    return {
        type: "infobox",
        title: title || undefined,
        image: topImages.length > 0 ? topImages[0] : undefined,
        images: topImages.length > 0 ? topImages : undefined,
        grid: topGrid,
        caption: topCaption,
        items,
    };
};

// Pulls a list block out of a <ul>/<ol> element.
const parseList = (
    node: any,
    ordered: boolean,
    references?: Record<string, Span[]>,
): ListBlock | null => {
    const items: Span[][] = [];

    for (const child of node.children ?? []) {
        if (child.type === "tag" && child.name === "li" && !shouldSkip(child)) {
            const spans = getSpans(child);
            if (spans.length) {
                items.push(spans);
                const id = child.attribs?.id;
                if (id && references) {
                    references[id] = spans;
                }
            }
        }
    }

    if (!items.length) return null;

    return { type: "list", ordered, items };
};

// Extracts all images inside a table cell (flags, portraits, icons) along with links
const parseCellImages = (
    cellNode: any,
): { images: TableCellImage[]; imagePosition: "before" | "after" } => {
    const images: TableCellImage[] = [];
    let textSeenBeforeFirstImg = false;
    let firstImgFound = false;

    const walk = (n: any, currentLink?: string) => {
        if (!n || shouldSkip(n) || SKIP_TAGS.has(n.name)) return;

        if (n.type === "text") {
            if (!firstImgFound && n.data && n.data.trim().length > 0) {
                textSeenBeforeFirstImg = true;
            }
            return;
        }

        if (n.type === "tag") {
            let link = currentLink;
            if (n.name === "a") {
                const href = n.attribs?.href;
                if (href) {
                    if (
                        href.startsWith("http://") ||
                        href.startsWith("https://")
                    ) {
                        link = href;
                    } else if (href.startsWith("//")) {
                        link = `https:${href}`;
                    } else {
                        const art = articleFromHref(href);
                        if (art) link = art;
                    }
                }
            }

            if (n.name === "img") {
                let src: string | undefined = n.attribs?.src;
                if (src) {
                    if (src.startsWith("//")) src = `https:${src}`;

                    const rawWidth = parseInt(n.attribs?.width, 10);
                    const rawHeight = parseInt(n.attribs?.height, 10);
                    const width =
                        !isNaN(rawWidth) && rawWidth > 0 ? rawWidth : undefined;
                    const height =
                        !isNaN(rawHeight) && rawHeight > 0
                            ? rawHeight
                            : undefined;
                    const alt = n.attribs?.alt || undefined;
                    const cls = n.attribs?.class || "";

                    // Ignore math formula fallbacks, 1px spacers, and restricted maps
                    if (
                        !cls.includes("mwe-math") &&
                        !isRestrictedMapImage(src, n) &&
                        (width === undefined || width > 1) &&
                        (height === undefined || height > 1)
                    ) {
                        firstImgFound = true;
                        images.push({
                            src,
                            width,
                            height,
                            alt,
                            link,
                        });
                    }
                }
                return;
            }

            (n.children ?? []).forEach((c: any) => walk(c, link));
        }
    };

    walk(cellNode, undefined);

    return {
        images,
        imagePosition: textSeenBeforeFirstImg ? "after" : "before",
    };
};

// Pulls a table block out of a standard <table> element.
type GridCellEntry = {
    cell: TableCell;
    originRow: number;
    originCol: number;
};

const parseTable = (node: any): TableBlock | null => {
    let caption = "";
    const findCaption = (container: any) => {
        if (caption || !container || !Array.isArray(container.children)) return;
        for (const child of container.children) {
            if (
                child.type === "tag" &&
                child.name === "caption" &&
                !shouldSkip(child)
            ) {
                caption = getText(child).replace(/\s+/g, " ").trim();
                return;
            }
        }
    };
    findCaption(node);

    const trs: any[] = [];
    const findTRs = (container: any) => {
        if (!container || !Array.isArray(container.children)) return;
        for (const child of container.children) {
            if (child.type !== "tag" || shouldSkip(child)) continue;
            if (child.name === "tr") {
                trs.push(child);
            } else if (["thead", "tbody", "tfoot"].includes(child.name)) {
                findTRs(child);
            }
        }
    };
    findTRs(node);

    if (!trs.length) return null;

    const grid: (GridCellEntry | null)[][] = [];
    let numCols = 0;
    let rIndex = 0;

    for (const tr of trs) {
        if (!grid[rIndex]) grid[rIndex] = [];
        let cIndex = 0;

        for (const child of tr.children ?? []) {
            if (child.type !== "tag" || shouldSkip(child)) continue;
            if (child.name !== "th" && child.name !== "td") continue;

            while (grid[rIndex][cIndex]) {
                cIndex++;
            }

            const isHeader = child.name === "th";
            const rawRowspan = parseInt(child.attribs?.rowspan, 10);
            const rowspan =
                !isNaN(rawRowspan) && rawRowspan > 0 ? rawRowspan : 1;
            const rawColspan = parseInt(child.attribs?.colspan, 10);
            const colspan =
                !isNaN(rawColspan) && rawColspan > 0 ? rawColspan : 1;

            const alignAttr = child.attribs?.align;
            const styleAlign =
                child.attribs?.style?.match(/text-align:\s*(\w+)/)?.[1];
            let align: "left" | "center" | "right" | undefined;
            const rawAlign = (alignAttr || styleAlign || "").toLowerCase();
            if (
                rawAlign === "left" ||
                rawAlign === "center" ||
                rawAlign === "right"
            ) {
                align = rawAlign;
            }

            const spans = getSpans(child);
            const { images, imagePosition } = parseCellImages(child);

            const tableCell: TableCell = {
                spans,
                images: images.length > 0 ? images : undefined,
                imagePosition: images.length > 0 ? imagePosition : undefined,
                isHeader,
                rowspan,
                colspan,
                align,
            };

            const entry: GridCellEntry = {
                cell: tableCell,
                originRow: rIndex,
                originCol: cIndex,
            };

            for (let dr = 0; dr < rowspan; dr++) {
                const targetR = rIndex + dr;
                if (!grid[targetR]) grid[targetR] = [];
                for (let dc = 0; dc < colspan; dc++) {
                    grid[targetR][cIndex + dc] = entry;
                }
            }

            cIndex += colspan;
            if (cIndex > numCols) numCols = cIndex;
        }

        rIndex++;
    }

    const numRows = grid.length;
    if (numRows === 0 || numCols === 0) return null;

    for (let r = 0; r < numRows; r++) {
        if (!grid[r]) grid[r] = [];
        for (let c = 0; c < numCols; c++) {
            if (!grid[r][c]) {
                grid[r][c] = {
                    cell: {
                        spans: [],
                        isHeader: false,
                        rowspan: 1,
                        colspan: 1,
                    },
                    originRow: r,
                    originCol: c,
                };
            }
        }
    }

    const blocks: LogicalRowBlock[] = [];
    let blockStart = 0;

    while (blockStart < numRows) {
        let blockEnd = blockStart;
        let r = blockStart;

        while (r <= blockEnd && r < numRows) {
            for (let c = 0; c < numCols; c++) {
                const entry = grid[r][c];
                if (entry) {
                    const maxR = entry.originRow + entry.cell.rowspan - 1;
                    if (maxR > blockEnd) {
                        blockEnd = maxR;
                    }
                }
            }
            r++;
        }

        if (blockEnd >= numRows) blockEnd = numRows - 1;
        const numSubRows = blockEnd - blockStart + 1;

        const columns: LogicalRowColumn[] = [];
        let c = 0;

        while (c < numCols) {
            const entry = grid[blockStart][c];
            if (!entry) {
                c++;
                continue;
            }

            if (entry.originCol < c) {
                c++;
                continue;
            }

            const colspan = entry.cell.colspan;
            const subCells: LogicalRowSubCell[] = [];
            let subR = blockStart;

            while (subR <= blockEnd) {
                const subEntry = grid[subR][c];
                if (subEntry && subEntry.originRow === subR) {
                    const subRowSpan = Math.min(
                        subEntry.cell.rowspan,
                        blockEnd - subR + 1,
                    );
                    subCells.push({
                        cell: subEntry.cell,
                        subRowSpan,
                    });
                    subR += subRowSpan;
                } else if (
                    subEntry &&
                    subEntry.originRow < blockStart &&
                    subR === blockStart
                ) {
                    const subRowSpan = Math.min(
                        subEntry.cell.rowspan -
                            (blockStart - subEntry.originRow),
                        numSubRows,
                    );
                    subCells.push({
                        cell: subEntry.cell,
                        subRowSpan,
                    });
                    subR += subRowSpan;
                } else {
                    let emptySpan = 0;
                    while (subR + emptySpan <= blockEnd) {
                        const checkEntry = grid[subR + emptySpan][c];
                        if (
                            checkEntry &&
                            (checkEntry.originRow === subR + emptySpan ||
                                (checkEntry.originRow < blockStart &&
                                    subR + emptySpan === blockStart))
                        ) {
                            break;
                        }
                        emptySpan++;
                    }

                    if (emptySpan > 0) {
                        subCells.push({
                            cell: {
                                spans: [],
                                isHeader: false,
                                rowspan: emptySpan,
                                colspan: 1,
                            },
                            subRowSpan: emptySpan,
                        });
                        subR += emptySpan;
                    } else {
                        subR++;
                    }
                }
            }

            columns.push({
                subCells,
                colspan,
            });

            c += colspan;
        }

        blocks.push({
            numSubRows,
            columns,
        });

        blockStart = blockEnd + 1;
    }

    return {
        type: "table",
        caption: caption || undefined,
        numCols,
        numRows,
        blocks,
    };
};

// Checks if a table is used strictly for presentation/layout (e.g. multi-column layout)
const isLayoutTable = (node: any): boolean => {
    if (!node || node.type !== "tag" || node.name !== "table") return false;
    const role = node.attribs?.role;
    if (role === "presentation") return true;
    const cls = node.attribs?.class || "";
    if (/\b(col-begin|multicol|columns-start)\b/i.test(cls)) return true;
    return false;
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export type ParsedArticle = {
    blocks: Block[];
    references: Record<string, Span[]>;
};

export const parseArticleContent = (
    html: string,
    options?: { hasHeroImage?: boolean },
): ParsedArticle => {
    const document = parseDocument(html);
    const blocks: Block[] = [];
    const references: Record<string, Span[]> = {};

    const walk = (node: any) => {
        if (!node || node.type !== "tag" || shouldSkip(node)) return;

        // Infobox check
        if (isInfoboxNode(node)) {
            const infobox = parseInfobox(node);
            if (infobox) blocks.push(infobox);
            return;
        }

        switch (node.name) {
            case "style":
            case "script":
            case "link":
            case "sup":
            case "img": // stray inline icons; real images come from figure/thumb/gallery
                return;

            case "table": {
                if (isLayoutTable(node)) {
                    (node.children ?? []).forEach(walk);
                    return;
                }
                const block = parseTable(node);
                if (block) blocks.push(block);
                return;
            }

            case "blockquote":
            case "q": {
                const quote = parseQuote(node);
                if (quote) blocks.push(quote);
                return;
            }

            case "pre": {
                const code = parseCode(node);
                if (code) blocks.push(code);
                return;
            }

            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6": {
                const text = getText(node).replace(/\s+/g, " ").trim();
                const level = Number(node.name.slice(1));

                if (text) {
                    blocks.push({ type: "heading", level, text });
                }
                return;
            }

            case "p": {
                const spans = getSpans(node);
                if (spans.length) blocks.push({ type: "paragraph", spans });
                return;
            }

            case "figure": {
                const block = parseFigure(node);
                if (block) blocks.push(block);
                return;
            }

            case "div": {
                const cls = node.attribs?.class || "";

                // Multi-thumb container (e.g. GTA 6 promotion section)
                if (/\btmulti\b/i.test(cls)) {
                    const block = parseMultiThumb(node);
                    if (block) {
                        blocks.push(block);
                        return;
                    }
                }

                // Thumb container
                if (/\bthumb\b/i.test(cls)) {
                    const block = parseFigure(node);
                    if (block) {
                        blocks.push(block);
                        return;
                    }
                }

                // Gallery container
                if (/\bgallery\b/i.test(cls)) {
                    const block = parseGallery(node);
                    if (block) {
                        blocks.push(block);
                        return;
                    }
                }

                // Quotebox container
                if (/\bquotebox\b/i.test(cls)) {
                    const quote = parseQuote(node);
                    if (quote) {
                        blocks.push(quote);
                        return;
                    }
                }

                // Mw-highlight code block
                if (/\bmw-highlight\b/i.test(cls)) {
                    const code = parseCode(node);
                    if (code) {
                        blocks.push(code);
                        return;
                    }
                }

                (node.children ?? []).forEach(walk);
                return;
            }

            case "ul":
            case "ol": {
                const cls = node.attribs?.class || "";
                if (/\bgallery\b/i.test(cls)) {
                    const block = parseGallery(node);
                    if (block) {
                        blocks.push(block);
                        return;
                    }
                }

                const block = parseList(node, node.name === "ol", references);
                if (block) blocks.push(block);
                return;
            }

            case "dl": {
                for (const child of node.children ?? []) {
                    if (
                        child.type === "tag" &&
                        (child.name === "dd" || child.name === "dt") &&
                        !shouldSkip(child)
                    ) {
                        const hasBlockChildren = (child.children ?? []).some(
                            (c: any) =>
                                c.type === "tag" &&
                                [
                                    "table",
                                    "ul",
                                    "ol",
                                    "dl",
                                    "blockquote",
                                    "pre",
                                    "figure",
                                    "div",
                                    "h1",
                                    "h2",
                                    "h3",
                                    "h4",
                                    "h5",
                                    "h6",
                                ].includes(c.name),
                        );

                        if (hasBlockChildren) {
                            let inlineGroup: any[] = [];
                            const flushInline = () => {
                                if (inlineGroup.length) {
                                    const spans = mergeSpans(
                                        inlineGroup.flatMap((n) => getSpans(n)),
                                    );
                                    if (spans.length) {
                                        blocks.push({
                                            type: "paragraph",
                                            spans,
                                        });
                                    }
                                    inlineGroup = [];
                                }
                            };

                            for (const grandChild of child.children ?? []) {
                                if (
                                    grandChild.type === "tag" &&
                                    [
                                        "table",
                                        "ul",
                                        "ol",
                                        "dl",
                                        "blockquote",
                                        "pre",
                                        "figure",
                                        "div",
                                        "h1",
                                        "h2",
                                        "h3",
                                        "h4",
                                        "h5",
                                        "h6",
                                    ].includes(grandChild.name)
                                ) {
                                    flushInline();
                                    walk(grandChild);
                                } else {
                                    inlineGroup.push(grandChild);
                                }
                            }
                            flushInline();
                        } else {
                            const spans = getSpans(child);
                            if (spans.length) {
                                blocks.push({ type: "paragraph", spans });
                            }
                        }
                    }
                }
                return;
            }

            default:
                // Containers (sections, spans, …) — walk into children.
                (node.children ?? []).forEach(walk);
        }
    };

    if (Array.isArray(document.children)) {
        document.children.forEach(walk);
    }

    if (options?.hasHeroImage) {
        // Drop leading standalone images duplicating the hero image
        while (blocks.length > 0 && blocks[0].type === "image") {
            blocks.shift();
        }
    }

    return { blocks, references };
};

export const parseArticle = (
    html: string,
    options?: { hasHeroImage?: boolean },
): Block[] => parseArticleContent(html, options).blocks;

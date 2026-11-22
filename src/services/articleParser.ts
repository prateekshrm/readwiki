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

export type InfoboxItem =
    | {
          type: "header";
          title: string;
      }
    | {
          type: "row";
          label: string;
          values: Span[];
      };

export type InfoboxBlock = {
    type: "infobox";
    title?: string;
    image?: {
        src: string;
        caption?: string;
    };
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
    "reference",
    "reflist",
    "mw-references-wrap",
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
]);

// Top-level h2 headings after which the rest of the page is references / links.
const STOP_HEADINGS = [
    "references",
    "notes",
    "citations",
    "footnotes",
    "sources",
    "bibliography",
    "further reading",
    "external links",
    "works cited",
    "explanatory notes",
    "notes and references",
];

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
                (child.name === "li" || child.name === "br" || child.name === "dd")
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
            last.link === span.link
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

// Collects inline spans inside a block element, carrying bold / italic / link
// formatting down through nested tags, handling MathML and code.
export const getSpans = (node: any): Span[] => {
    const spans: Span[] = [];

    const walkInline = (n: any, ctx: Omit<Span, "text">) => {
        if (!n) return;

        if (n.type === "text") {
            const text = (n.data ?? "").replace(/\s+/g, " ");
            if (text) spans.push({ text, ...ctx });
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

        const next = { ...ctx };

        if (n.name === "b" || n.name === "strong") next.bold = true;
        if (n.name === "i" || n.name === "em") next.italic = true;
        if (n.name === "a") {
            const href = n.attribs?.href;
            if (href) {
                if (href.startsWith("http://") || href.startsWith("https://")) {
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

// Pulls an infobox block with structured facts out of an infobox table.
const parseInfobox = (node: any): InfoboxBlock | null => {
    const items: InfoboxItem[] = [];
    let title = "";
    let image: { src: string; caption?: string } | undefined;

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

        let rowHasImg = false;
        const findImg = (n: any) => {
            if (!n || image) return;
            if (n.type === "tag" && n.name === "img") {
                rowHasImg = true;
                let src = n.attribs?.src;
                if (src) {
                    if (src.startsWith("//")) src = `https:${src}`;
                    image = { src };
                }
                return;
            }
            (n.children || []).forEach(findImg);
        };

        const isAbove =
            tr.attribs?.class?.includes("infobox-above") ||
            ths.some((th: any) => th.attribs?.class?.includes("infobox-above"));
        const isHeader =
            tr.attribs?.class?.includes("infobox-header") ||
            ths.some((th: any) => th.attribs?.class?.includes("infobox-header"));

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
            if (!image) findImg(ths[0]);
            continue;
        }

        // Single TD cell (image or subheader)
        if (tds.length > 0 && ths.length === 0) {
            if (!image) findImg(tds[0]);
            if (rowHasImg) continue;

            const tdText = getText(tds[0]).trim();
            if (
                tdText &&
                (isHeader ||
                    tds[0].attribs?.class?.includes("infobox-header") ||
                    tdText.length < 40)
            ) {
                items.push({ type: "header", title: tdText });
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

            if (labelText && valueText) {
                items.push({
                    type: "row",
                    label: labelText,
                    values: valueSpans,
                });
            } else if (!labelText && valueText && valueText.length < 50) {
                items.push({ type: "header", title: valueText });
            }
        }
    }

    if (items.length === 0) return null;

    return {
        type: "infobox",
        title: title || undefined,
        image,
        items,
    };
};

// Pulls a list block out of a <ul>/<ol> element.
const parseList = (node: any, ordered: boolean): ListBlock | null => {
    const items: Span[][] = [];

    for (const child of node.children ?? []) {
        if (child.type === "tag" && child.name === "li" && !shouldSkip(child)) {
            const spans = getSpans(child);
            if (spans.length) items.push(spans);
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

                    // Ignore math formula fallbacks and 1px spacers
                    if (
                        !cls.includes("mwe-math") &&
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
            const styleAlign = child.attribs?.style?.match(
                /text-align:\s*(\w+)/,
            )?.[1];
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

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export const parseArticle = (
    html: string,
    options?: { hasHeroImage?: boolean },
): Block[] => {
    const document = parseDocument(html);
    const blocks: Block[] = [];

    let stopped = false;

    const walk = (node: any) => {
        if (stopped || !node || node.type !== "tag" || shouldSkip(node)) return;

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

                // Only stop on level 2 reference headings at the end
                if (
                    level === 2 &&
                    STOP_HEADINGS.includes(text.toLowerCase())
                ) {
                    stopped = true;
                    return;
                }

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

                const block = parseList(node, node.name === "ol");
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
                        const spans = getSpans(child);
                        if (spans.length) {
                            blocks.push({ type: "paragraph", spans });
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

    return blocks;
};

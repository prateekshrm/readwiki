import RichText from "@/components/RichText";
import { ThemeColors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import type {
    TableBlock,
    TableCell,
    TableCellImage,
} from "@/services/articleParser";
import { usePreferencesStore } from "@/stores/preferences.store";
import { Image } from "expo-image";
import { memo, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import RemixIcon from "react-native-remix-icon";

type TableViewProps = {
    block: TableBlock;
    onLinkPress?: (title: string) => void;
    onRefPress?: (refId: string, label: string) => void;
    onImagePress?: (src: string) => void;
};

const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 280;
const INITIAL_ROW_LIMIT = 10;

// Computes initial column widths based on maximum text length and image sizes in cells,
// capping horizontal width at MAX_COL_WIDTH (280px) to prevent excessive width.
const computeInitialWidths = (
    rows: TableBlock["blocks"],
    fontScale: number,
): number[] => {
    const widths: number[] = [];

    for (const logicalRow of rows) {
        let colIdx = 0;
        for (const col of logicalRow.columns) {
            while (widths[colIdx] === undefined) {
                widths.push(MIN_COL_WIDTH);
            }
            if (col.colspan === 1) {
                for (const subCell of col.subCells) {
                    let charCount = 0;
                    for (const s of subCell.cell.spans) {
                        if (s.text) charCount += s.text.length;
                    }

                    let imageWidth = 0;
                    let hasLargeImage = false;

                    if (subCell.cell.images && subCell.cell.images.length > 0) {
                        for (const img of subCell.cell.images) {
                            const w = img.width ?? 24;
                            if (w > 40) {
                                hasLargeImage = true;
                                imageWidth = Math.max(
                                    imageWidth,
                                    Math.min(w, MAX_COL_WIDTH - 24),
                                );
                            } else {
                                imageWidth += w + 6;
                            }
                        }
                    }

                    let cellRequiredWidth = MIN_COL_WIDTH;
                    if (hasLargeImage) {
                        const textW =
                            charCount > 0
                                ? Math.ceil(charCount * 8 * fontScale + 24)
                                : 0;
                        cellRequiredWidth = Math.max(imageWidth + 24, textW);
                    } else {
                        const textW = Math.ceil(charCount * 8 * fontScale + 24);
                        cellRequiredWidth = textW + imageWidth;
                    }

                    const estimatedWidth = Math.max(
                        MIN_COL_WIDTH,
                        Math.min(MAX_COL_WIDTH, cellRequiredWidth),
                    );
                    if (estimatedWidth > widths[colIdx]) {
                        widths[colIdx] = estimatedWidth;
                    }
                }
            }
            colIdx += col.colspan;
        }
    }

    return widths;
};

type TableCellImageItemProps = {
    image: TableCellImage;
    fontScale: number;
    colWidth: number;
    isLast: boolean;
    onLinkPress?: (title: string) => void;
    onImagePress?: (src: string) => void;
    colors: ThemeColors;
};

const TableCellImageItem = memo(
    ({
        image,
        fontScale,
        colWidth,
        isLast,
        onLinkPress,
        onImagePress,
        colors,
    }: TableCellImageItemProps) => {
        const isSmallIcon =
            (image.width ?? 0) <= 40 && (image.height ?? 0) <= 40;

        const handlePress = useCallback(() => {
            if (image.link) {
                onLinkPress?.(image.link);
            } else if (onImagePress) {
                onImagePress(image.src);
            }
        }, [image.link, image.src, onLinkPress, onImagePress]);

        if (isSmallIcon) {
            const rawW = image.width || 22;
            const rawH = image.height || 15;
            const scale = Math.min(fontScale, 1.25);
            const w = Math.round(rawW * scale);
            const h = Math.round(rawH * scale);

            const imgElement = (
                <Image
                    source={image.src}
                    style={{
                        width: w,
                        height: h,
                        marginRight: isLast ? 0 : 6,
                    }}
                    contentFit="contain"
                    transition={0}
                    cachePolicy="memory-disk"
                    recyclingKey={image.src}
                />
            );

            if (image.link || onImagePress) {
                return (
                    <Pressable
                        onPress={handlePress}
                        hitSlop={4}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={image.alt || "Table icon"}
                    >
                        {imgElement}
                    </Pressable>
                );
            }

            return imgElement;
        }

        // Larger image (e.g. portrait, diagram, logo)
        const rawW = image.width || 120;
        const rawH = image.height || 160;
        const aspect = rawW / Math.max(1, rawH);
        const maxW = Math.max(48, Math.min(rawW, colWidth - 20, 160));
        const displayW = Math.round(maxW);
        const displayH = Math.round(maxW / aspect);

        const imgElement = (
            <Image
                source={image.src}
                style={{
                    width: displayW,
                    height: displayH,
                    borderRadius: 4,
                    backgroundColor: colors.surfaceMuted,
                    marginVertical: 4,
                }}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
                recyclingKey={image.src}
            />
        );

        if (onImagePress || image.link) {
            return (
                <Pressable
                    onPress={handlePress}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={image.alt || "Table image"}
                >
                    {imgElement}
                </Pressable>
            );
        }

        return imgElement;
    },
);

TableCellImageItem.displayName = "TableCellImageItem";

type TableCellContentProps = {
    cell: TableCell;
    colWidth: number;
    fontScale: number;
    onLinkPress?: (title: string) => void;
    onRefPress?: (refId: string, label: string) => void;
    onImagePress?: (src: string) => void;
    colors: ThemeColors;
    styles: ReturnType<typeof createStyles>;
};

const TableCellContent = memo(
    ({
        cell,
        colWidth,
        fontScale,
        onLinkPress,
        onRefPress,
        onImagePress,
        colors,
        styles,
    }: TableCellContentProps) => {
        const hasImages = !!(cell.images && cell.images.length > 0);
        const hasSpans = cell.spans.length > 0;
        const hasLargeImage = useMemo(
            () =>
                hasImages &&
                cell.images!.some(
                    (img) => (img.width ?? 0) > 40 || (img.height ?? 0) > 40,
                ),
            [hasImages, cell.images],
        );

        const textAlign = cell.align ?? (cell.isHeader ? "center" : "left");

        const textStyle = useMemo(
            () => [
                styles.cellText,
                cell.isHeader ? styles.headerText : styles.dataText,
                {
                    fontSize: 14 * fontScale,
                    textAlign,
                },
            ],
            [styles, cell.isHeader, fontScale, textAlign],
        );

        // Case 1: Text only
        if (!hasImages) {
            return (
                <RichText
                    spans={cell.spans}
                    onLinkPress={onLinkPress}
                    onRefPress={onRefPress}
                    style={textStyle}
                    linkColor={colors.link}
                />
            );
        }

        const images = cell.images!;

        // Case 2: Images only (no text)
        if (!hasSpans) {
            return (
                <View
                    style={[
                        styles.imageOnlyContainer,
                        textAlign === "center" && styles.alignCenter,
                        textAlign === "right" && styles.alignRight,
                    ]}
                >
                    {images.map((img, idx) => (
                        <TableCellImageItem
                            key={idx}
                            image={img}
                            fontScale={fontScale}
                            colWidth={colWidth}
                            isLast={idx === images.length - 1}
                            onLinkPress={onLinkPress}
                            onImagePress={onImagePress}
                            colors={colors}
                        />
                    ))}
                </View>
            );
        }

        // Case 3: Large image + text (stacked vertically)
        if (hasLargeImage) {
            return (
                <View
                    style={[
                        styles.columnLayout,
                        textAlign === "center" && styles.alignCenter,
                        textAlign === "right" && styles.alignRight,
                    ]}
                >
                    {images.map((img, idx) => (
                        <TableCellImageItem
                            key={idx}
                            image={img}
                            fontScale={fontScale}
                            colWidth={colWidth}
                            isLast={idx === images.length - 1}
                            onLinkPress={onLinkPress}
                            onImagePress={onImagePress}
                            colors={colors}
                        />
                    ))}
                    <RichText
                        spans={cell.spans}
                        onLinkPress={onLinkPress}
                        onRefPress={onRefPress}
                        style={textStyle}
                        linkColor={colors.link}
                    />
                </View>
            );
        }

        // Case 4: Small icons + text (horizontal row)
        const renderedImages = images.map((img, idx) => (
            <TableCellImageItem
                key={idx}
                image={img}
                fontScale={fontScale}
                colWidth={colWidth}
                isLast={idx === images.length - 1}
                onLinkPress={onLinkPress}
                onImagePress={onImagePress}
                colors={colors}
            />
        ));

        const renderedText = (
            <RichText
                spans={cell.spans}
                onLinkPress={onLinkPress}
                onRefPress={onRefPress}
                style={textStyle}
                linkColor={colors.link}
            />
        );

        return (
            <View
                style={[
                    styles.rowLayout,
                    textAlign === "center" && styles.alignCenter,
                    textAlign === "right" && styles.alignRight,
                ]}
            >
                {cell.imagePosition === "after" ? (
                    <>
                        {renderedText}
                        {renderedImages}
                    </>
                ) : (
                    <>
                        {renderedImages}
                        {renderedText}
                    </>
                )}
            </View>
        );
    },
);

TableCellContent.displayName = "TableCellContent";

type TableCellViewProps = {
    cell: TableCell;
    colWidth: number;
    fontScale: number;
    isLastColumn: boolean;
    subRowSpan?: number;
    subIndex?: number;
    onLinkPress?: (title: string) => void;
    onRefPress?: (refId: string, label: string) => void;
    onImagePress?: (src: string) => void;
    colors: ThemeColors;
    styles: ReturnType<typeof createStyles>;
};

const TableCellView = memo(
    ({
        cell,
        colWidth,
        fontScale,
        isLastColumn,
        subRowSpan,
        subIndex,
        onLinkPress,
        onRefPress,
        onImagePress,
        colors,
        styles,
    }: TableCellViewProps) => {
        const cellContainerStyle = useMemo(
            () => [
                styles.cell,
                subRowSpan !== undefined
                    ? { flex: subRowSpan }
                    : { width: colWidth, maxWidth: colWidth },
                cell.isHeader ? styles.headerCell : styles.dataCell,
                !isLastColumn && styles.columnDivider,
                subIndex !== undefined && subIndex > 0 && styles.subRowDivider,
            ],
            [
                styles,
                subRowSpan,
                colWidth,
                cell.isHeader,
                isLastColumn,
                subIndex,
            ],
        );

        return (
            <View style={cellContainerStyle}>
                <TableCellContent
                    cell={cell}
                    colWidth={colWidth}
                    fontScale={fontScale}
                    onLinkPress={onLinkPress}
                    onRefPress={onRefPress}
                    onImagePress={onImagePress}
                    colors={colors}
                    styles={styles}
                />
            </View>
        );
    },
);

TableCellView.displayName = "TableCellView";

type TableRowViewProps = {
    logicalRow: TableBlock["blocks"][number];
    blockIndex: number;
    columnWidths: number[];
    numCols: number;
    fontScale: number;
    onLinkPress?: (title: string) => void;
    onRefPress?: (refId: string, label: string) => void;
    onImagePress?: (src: string) => void;
    colors: ThemeColors;
    styles: ReturnType<typeof createStyles>;
};

const TableRowView = memo(
    ({
        logicalRow,
        blockIndex,
        columnWidths,
        numCols,
        fontScale,
        onLinkPress,
        onRefPress,
        onImagePress,
        colors,
        styles,
    }: TableRowViewProps) => {
        const rowCols = useMemo(() => {
            const cols: {
                col: (typeof logicalRow.columns)[number];
                colWidth: number;
                isLastColumn: boolean;
            }[] = [];
            let currentColIdx = 0;

            for (let i = 0; i < logicalRow.columns.length; i++) {
                const col = logicalRow.columns[i];
                const startCol = currentColIdx;
                currentColIdx += col.colspan;

                let colWidth = 0;
                for (let k = 0; k < col.colspan; k++) {
                    colWidth += columnWidths[startCol + k] || MIN_COL_WIDTH;
                }

                const isLastColumn = currentColIdx >= numCols;
                cols.push({
                    col,
                    colWidth,
                    isLastColumn,
                });
            }

            return cols;
        }, [logicalRow, columnWidths, numCols]);

        return (
            <View
                style={[styles.logicalRow, blockIndex > 0 && styles.rowDivider]}
            >
                {rowCols.map(({ col, colWidth, isLastColumn }, colIndex) => {
                    // Single cell spanning full logical row height
                    if (
                        col.subCells.length === 1 &&
                        col.subCells[0].subRowSpan === logicalRow.numSubRows
                    ) {
                        return (
                            <TableCellView
                                key={colIndex}
                                cell={col.subCells[0].cell}
                                colWidth={colWidth}
                                fontScale={fontScale}
                                isLastColumn={isLastColumn}
                                onLinkPress={onLinkPress}
                                onRefPress={onRefPress}
                                onImagePress={onImagePress}
                                colors={colors}
                                styles={styles}
                            />
                        );
                    }

                    // Multiple sub-rows in this column
                    return (
                        <View
                            key={colIndex}
                            style={[
                                styles.columnStack,
                                {
                                    width: colWidth,
                                    maxWidth: colWidth,
                                },
                                !isLastColumn && styles.columnDivider,
                            ]}
                        >
                            {col.subCells.map((subCell, subIndex) => (
                                <TableCellView
                                    key={subIndex}
                                    cell={subCell.cell}
                                    colWidth={colWidth}
                                    fontScale={fontScale}
                                    isLastColumn={false}
                                    subRowSpan={subCell.subRowSpan}
                                    subIndex={subIndex}
                                    onLinkPress={onLinkPress}
                                    onRefPress={onRefPress}
                                    onImagePress={onImagePress}
                                    colors={colors}
                                    styles={styles}
                                />
                            ))}
                        </View>
                    );
                })}
            </View>
        );
    },
);

TableRowView.displayName = "TableRowView";

const TableView = ({
    block,
    onLinkPress,
    onRefPress,
    onImagePress,
}: TableViewProps) => {
    const { colors } = useTheme();
    const fontScale = usePreferencesStore((state) => state.fontScale);
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [expandedBlock, setExpandedBlock] = useState<TableBlock | null>(null);
    const expanded = expandedBlock === block;
    const hasMoreRows = block.blocks.length > INITIAL_ROW_LIMIT;

    const visibleBlocks = useMemo(() => {
        if (expanded || !hasMoreRows) return block.blocks;
        return block.blocks.slice(0, INITIAL_ROW_LIMIT);
    }, [block.blocks, expanded, hasMoreRows]);

    const columnWidths = useMemo(
        () => computeInitialWidths(visibleBlocks, fontScale),
        [visibleBlocks, fontScale],
    );

    const handleToggleExpand = useCallback(() => {
        setExpandedBlock((prev) => (prev === block ? null : block));
    }, [block]);

    return (
        <View style={styles.outerContainer}>
            {!!block.caption && (
                <Text style={styles.caption}>{block.caption}</Text>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.scrollContent}
                nestedScrollEnabled={true}
                directionalLockEnabled={true}
                scrollEventThrottle={16}
            >
                <View style={styles.table}>
                    {visibleBlocks.map((logicalRow, blockIndex) => (
                        <TableRowView
                            key={blockIndex}
                            logicalRow={logicalRow}
                            blockIndex={blockIndex}
                            columnWidths={columnWidths}
                            numCols={block.numCols}
                            fontScale={fontScale}
                            onLinkPress={onLinkPress}
                            onRefPress={onRefPress}
                            onImagePress={onImagePress}
                            colors={colors}
                            styles={styles}
                        />
                    ))}
                </View>
            </ScrollView>

            {hasMoreRows && (
                <Pressable
                    style={({ pressed }) => [
                        styles.expandButton,
                        pressed && styles.expandButtonPressed,
                    ]}
                    onPress={handleToggleExpand}
                    accessibilityRole="button"
                    accessibilityLabel={
                        expanded
                            ? "Show fewer rows"
                            : `Show all ${block.blocks.length} rows`
                    }
                >
                    <Text style={styles.expandButtonText}>
                        {expanded
                            ? "Show fewer rows"
                            : `Show all ${block.blocks.length} rows (${
                                  block.blocks.length - INITIAL_ROW_LIMIT
                              } more)`}
                    </Text>
                    <RemixIcon
                        name={
                            expanded ? "arrow-up-s-line" : "arrow-down-s-line"
                        }
                        size={18}
                        color={colors.accent}
                    />
                </Pressable>
            )}
        </View>
    );
};

export default memo(TableView);

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        outerContainer: {
            marginVertical: 12,
            paddingHorizontal: 16,
        },
        caption: {
            fontFamily: "DMSans-Medium",
            fontSize: 13,
            color: colors.textMuted,
            marginBottom: 6,
        },
        scrollContent: {},
        table: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: colors.surface,
        },
        logicalRow: {
            flexDirection: "row",
            alignItems: "stretch",
        },
        columnStack: {
            flexDirection: "column",
            alignItems: "stretch",
        },
        cell: {
            paddingHorizontal: 10,
            paddingVertical: 8,
            justifyContent: "center",
        },
        rowLayout: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 4,
        },
        columnLayout: {
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
        },
        imageOnlyContainer: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 4,
        },
        alignCenter: {
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
        },
        alignRight: {
            alignItems: "flex-end",
            justifyContent: "flex-end",
            alignSelf: "flex-end",
        },
        headerCell: {
            backgroundColor: colors.surfaceMuted,
        },
        dataCell: {
            backgroundColor: colors.surface,
        },
        cellText: {
            lineHeight: 20,
        },
        headerText: {
            fontFamily: "DMSans-Bold",
            color: colors.text,
        },
        dataText: {
            fontFamily: "DMSans-Regular",
            color: colors.text,
        },
        rowDivider: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        columnDivider: {
            borderRightWidth: 1,
            borderRightColor: colors.border,
        },
        subRowDivider: {
            borderTopWidth: 1,
            borderTopColor: colors.divider,
        },
        expandButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 10,
            paddingHorizontal: 16,
            marginTop: 8,
            backgroundColor: colors.surface,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 6,
        },
        expandButtonPressed: {
            backgroundColor: colors.surfaceMuted,
        },
        expandButtonText: {
            fontFamily: "DMSans-Medium",
            fontSize: 13,
            color: colors.accent,
        },
    });

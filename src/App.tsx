import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode, UIEvent } from "react";
import { summarizeDiffNodes, diffValue } from "./diff";
import { localeOptions, t } from "./i18n";
import { defaultSettings, loadSettings, saveSettings } from "./storage";
import type { AppSettings, DiffNode, JsonErrorState, Locale } from "./types";

interface JsonLine {
  marker: string;
  status: DiffNode["status"];
  content: ReactNode;
}

interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

interface HighlightState {
  left: number | null;
  right: number | null;
  token: number;
}

const minPanelHeight = 420;
const maxPanelHeight = 1100;
const panelHeightStep = 120;

function safeParseJson(input: string) {
  if (!input.trim()) {
    return {};
  }

  return JSON.parse(input) as unknown;
}

function formatJsonInput(input: string) {
  const parsed = safeParseJson(input);
  return JSON.stringify(parsed, null, 2);
}

function clampPanelHeight(height: number) {
  return Math.min(maxPanelHeight, Math.max(minPanelHeight, height));
}

function sampleSettings(current: AppSettings): AppSettings {
  return {
    ...current,
    ...defaultSettings,
    locale: current.locale,
    caseInsensitiveKeys: current.caseInsensitiveKeys,
    diffBadgeStyle: current.diffBadgeStyle,
    showOnlyDifferences: current.showOnlyDifferences,
    searchQuery: current.searchQuery,
    panelHeight: current.panelHeight,
  };
}

function statusClassName(status: DiffNode["status"]) {
  return `status-${status}`;
}

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatInlineValue(value: unknown) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return String(value);
  }

  return JSON.stringify(value);
}

function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase();
}

function nodeMatchesSearch(node: DiffNode, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  const searchText = [
    node.path,
    node.leftKey,
    node.rightKey,
    node.leftDisplay,
    node.rightDisplay,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchText.includes(normalizedQuery);
}

function renderHighlightedText(text: string, className: string, normalizedQuery: string) {
  if (!normalizedQuery) {
    return <span className={className}>{text}</span>;
  }

  const normalizedText = text.toLowerCase();

  if (!normalizedText.includes(normalizedQuery)) {
    return <span className={className}>{text}</span>;
  }

  const segments: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      segments.push(text.slice(cursor, matchIndex));
    }

    const nextCursor = matchIndex + normalizedQuery.length;
    segments.push(
      <mark
        key={`${className}-${matchIndex}-${nextCursor}`}
        className="search-highlight"
      >
        {text.slice(matchIndex, nextCursor)}
      </mark>,
    );
    cursor = nextCursor;
    matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
  }

  if (cursor < text.length) {
    segments.push(text.slice(cursor));
  }

  return <span className={className}>{segments}</span>;
}

function getMarker(status: DiffNode["status"]) {
  if (status === "added") {
    return "+";
  }

  if (status === "removed") {
    return "-";
  }

  if (status === "changed" || status === "type-changed") {
    return "~";
  }

  return "";
}

function renderKeyPrefix(
  key: string | undefined,
  isArrayItem: boolean,
  keyChanged: boolean,
  normalizedQuery: string,
) {
  if (!key || isArrayItem) {
    return null;
  }

  return renderHighlightedText(
    `${JSON.stringify(key)}: `,
    keyChanged ? "json-key key-emphasis" : "json-key",
    normalizedQuery,
  );
}

function CollapseToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className="collapse-toggle"
      onClick={onToggle}
      aria-label={collapsed ? "Expand" : "Collapse"}
    >
      {collapsed ? "▸" : "▾"}
    </button>
  );
}

function shouldIncludeNode(
  node: DiffNode,
  showOnlyDifferences: boolean,
  normalizedQuery: string,
): boolean {
  const childMatch =
    node.children?.some((child) =>
      shouldIncludeNode(child, showOnlyDifferences, normalizedQuery),
    ) ?? false;

  const passesDiffFilter = !showOnlyDifferences || node.keyChanged || node.valueChanged;
  const matchesSearch = nodeMatchesSearch(node, normalizedQuery);

  return (passesDiffFilter && matchesSearch) || childMatch;
}

function buildJsonLines(
  node: DiffNode,
  side: "left" | "right",
  depth: number,
  isLast: boolean,
  collapsedPaths: Set<string>,
  onToggleCollapse: (path: string) => void,
  showOnlyDifferences: boolean,
  normalizedQuery: string,
  isRoot = false,
): JsonLine[] {
  const value = side === "left" ? node.leftValue : node.rightValue;
  const key =
    side === "left"
      ? (node.leftKey ?? node.rightKey)
      : (node.rightKey ?? node.leftKey);
  const isArrayItem = key?.startsWith("[") ?? false;
  const suffix = isRoot || isLast ? "" : ",";
  const keyPrefix = renderKeyPrefix(
    key,
    isArrayItem,
    node.keyChanged,
    normalizedQuery,
  );
  const visibleChildren = node.children?.filter((child) =>
    shouldIncludeNode(child, showOnlyDifferences, normalizedQuery),
  );

  if (value === undefined) {
    return [];
  }

  if (!shouldIncludeNode(node, showOnlyDifferences, normalizedQuery)) {
    return [];
  }

  if (Array.isArray(value) && visibleChildren?.length) {
    const containerStatus =
      node.status === "added" || node.status === "removed" || node.keyChanged
        ? node.status
        : "equal";
    const isCollapsed = collapsedPaths.has(node.path);
    const openLine: JsonLine = {
      marker: getMarker(containerStatus),
      status: containerStatus,
      content: (
        <>
          <span className="json-indent" style={{ width: `${depth * 20}px` }} />
          <CollapseToggle
            collapsed={isCollapsed}
            onToggle={() => onToggleCollapse(node.path)}
          />
          {keyPrefix}
          <span className="json-punct">
            {isCollapsed ? `[${showOnlyDifferences ? visibleChildren.length : value.length}]${suffix}` : "["}
          </span>
        </>
      ),
    };

    if (isCollapsed) {
      return [openLine];
    }

    const childLines = visibleChildren.flatMap((child, index) =>
      buildJsonLines(
        child,
        side,
        depth + 1,
        index === visibleChildren.length - 1,
        collapsedPaths,
        onToggleCollapse,
        showOnlyDifferences,
        normalizedQuery,
      ),
    );

    const closeLine: JsonLine = {
      marker: getMarker(containerStatus),
      status: containerStatus,
      content: (
        <>
          <span className="json-indent" style={{ width: `${depth * 20}px` }} />
          <span className="collapse-spacer" />
          <span className="json-punct">]{suffix}</span>
        </>
      ),
    };

    return [openLine, ...childLines, closeLine];
  }

  if (isObjectValue(value) && visibleChildren?.length) {
    const containerStatus =
      node.status === "added" || node.status === "removed" || node.keyChanged
        ? node.status
        : "equal";
    const isCollapsed = collapsedPaths.has(node.path);
    const propertyCount = Object.keys(value).length;
    const openLine: JsonLine = {
      marker: getMarker(containerStatus),
      status: containerStatus,
      content: (
        <>
          <span className="json-indent" style={{ width: `${depth * 20}px` }} />
          <CollapseToggle
            collapsed={isCollapsed}
            onToggle={() => onToggleCollapse(node.path)}
          />
          {keyPrefix}
          <span className="json-punct">
            {isCollapsed ? `{${showOnlyDifferences ? visibleChildren.length : propertyCount}}${suffix}` : "{"}
          </span>
        </>
      ),
    };

    if (isCollapsed) {
      return [openLine];
    }

    const childLines = visibleChildren.flatMap((child, index) =>
      buildJsonLines(
        child,
        side,
        depth + 1,
        index === visibleChildren.length - 1,
        collapsedPaths,
        onToggleCollapse,
        showOnlyDifferences,
        normalizedQuery,
      ),
    );

    const closeLine: JsonLine = {
      marker: getMarker(containerStatus),
      status: containerStatus,
      content: (
        <>
          <span className="json-indent" style={{ width: `${depth * 20}px` }} />
          <span className="collapse-spacer" />
          <span className="json-punct">{`}${suffix}`}</span>
        </>
      ),
    };

    return [openLine, ...childLines, closeLine];
  }

  return [
    {
      marker: getMarker(node.status === "equal" ? "equal" : node.status),
      status: node.status === "equal" ? "equal" : node.status,
      content: (
        <>
          <span className="json-indent" style={{ width: `${depth * 20}px` }} />
          <span className="collapse-spacer" />
          {keyPrefix}
          {renderHighlightedText(
            `${formatInlineValue(value)}${suffix}`,
            node.valueChanged ? "json-value value-emphasis" : "json-value",
            normalizedQuery,
          )}
        </>
      ),
    },
  ];
}

function getInitialScrollMetrics(): ScrollMetrics {
  return {
    scrollTop: 0,
    scrollHeight: 1,
    clientHeight: 1,
  };
}

function CodePanel({
  id,
  title,
  lines,
  sharedRatio,
  highlightedLine,
  highlightToken,
  onRatioChange,
  onLineActivate,
  emptyMessage,
}: {
  id: "left" | "right";
  title: string;
  lines: JsonLine[];
  sharedRatio: number;
  highlightedLine: number | null;
  highlightToken: number;
  onRatioChange: (id: "left" | "right", ratio: number) => void;
  onLineActivate: (
    id: "left" | "right",
    lineIndex: number,
    ratio: number,
  ) => void;
  emptyMessage: string;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>(
    getInitialScrollMetrics,
  );
  const [minimapHeight, setMinimapHeight] = useState(1);
  const [flashLine, setFlashLine] = useState<number | null>(null);
  const isApplyingExternalScroll = useRef(false);
  const dragStateRef = useRef<{
    startY: number;
    startScrollTop: number;
  } | null>(null);

  useEffect(() => {
    const element = bodyRef.current;
    const minimapElement = minimapRef.current;

    if (!element || !minimapElement) {
      return;
    }

    const updateMetrics = () => {
      setMetrics({
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      });
      setMinimapHeight(Math.max(minimapElement.clientHeight, 1));
    };

    updateMetrics();
    element.addEventListener("scroll", updateMetrics);

    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(element);
    resizeObserver.observe(minimapElement);

    return () => {
      element.removeEventListener("scroll", updateMetrics);
      resizeObserver.disconnect();
    };
  }, [lines.length]);

  useEffect(() => {
    const element = bodyRef.current;

    if (!element) {
      return;
    }

    const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
    const nextScrollTop = sharedRatio * maxScroll;

    if (Math.abs(element.scrollTop - nextScrollTop) < 2) {
      return;
    }

    isApplyingExternalScroll.current = true;
    element.scrollTop = nextScrollTop;
    window.requestAnimationFrame(() => {
      isApplyingExternalScroll.current = false;
    });
  }, [sharedRatio, lines.length]);

  useEffect(() => {
    if (highlightedLine === null) {
      return;
    }

    setFlashLine(highlightedLine);
    const timeoutId = window.setTimeout(() => setFlashLine(null), 900);

    return () => window.clearTimeout(timeoutId);
  }, [highlightToken, highlightedLine]);

  const maxScroll = Math.max(metrics.scrollHeight - metrics.clientHeight, 0);
  const currentRatio = maxScroll === 0 ? 0 : metrics.scrollTop / maxScroll;
  const viewportHeight =
    maxScroll === 0
      ? minimapHeight
      : Math.max(
          40,
          (metrics.clientHeight / metrics.scrollHeight) * minimapHeight,
        );
  const viewportTravel = Math.max(minimapHeight - viewportHeight, 0);
  const viewportTop = viewportTravel === 0 ? 0 : currentRatio * viewportTravel;

  function scrollToRatio(ratio: number) {
    const element = bodyRef.current;

    if (!element) {
      return;
    }

    const clampedRatio = Math.min(1, Math.max(0, ratio));
    element.scrollTo({
      top:
        clampedRatio * Math.max(element.scrollHeight - element.clientHeight, 0),
      behavior: "auto",
    });
    onRatioChange(id, clampedRatio);
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    if (isApplyingExternalScroll.current) {
      return;
    }

    const element = event.currentTarget;
    const nextMaxScroll = Math.max(
      element.scrollHeight - element.clientHeight,
      0,
    );
    const ratio = nextMaxScroll === 0 ? 0 : element.scrollTop / nextMaxScroll;
    onRatioChange(id, ratio);
  }

  function handleMinimapClick(event: MouseEvent<HTMLDivElement>) {
    if (dragStateRef.current) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - bounds.top) / bounds.height;
    scrollToRatio(ratio);
  }

  function handleViewportMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    dragStateRef.current = {
      startY: event.clientY,
      startScrollTop: metrics.scrollTop,
    };

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const element = bodyRef.current;
      const dragState = dragStateRef.current;

      if (!element || !dragState) {
        return;
      }

      const deltaY = moveEvent.clientY - dragState.startY;
      const travel = Math.max(minimapHeight - viewportHeight, 1);
      const scrollDelta =
        (deltaY / travel) *
        Math.max(element.scrollHeight - element.clientHeight, 0);
      const nextScrollTop = dragState.startScrollTop + scrollDelta;
      const nextRatio =
        Math.max(element.scrollHeight - element.clientHeight, 0) === 0
          ? 0
          : nextScrollTop /
            Math.max(element.scrollHeight - element.clientHeight, 1);

      scrollToRatio(nextRatio);
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <section className="code-panel">
      <div className="code-panel-header">{title}</div>
      <div className="code-panel-main">
        <div ref={bodyRef} className="code-panel-body" onScroll={handleScroll}>
          {lines.length === 0 ? (
            <div className="code-panel-empty">{emptyMessage}</div>
          ) : null}
          {lines.map((line, index) => {
            const isFlashing = flashLine === index;
            return (
              <div
                key={`${title}-${index + 1}`}
                className={`code-line ${statusClassName(line.status)} ${isFlashing ? "flash-active" : ""}`}
              >
                <span className="code-line-number">{index + 1}</span>
                <span className={`code-line-marker marker-${line.status}`}>
                  {line.marker}
                </span>
                <code
                  className={`code-line-content ${statusClassName(line.status)} ${isFlashing ? "flash-active" : ""}`}
                >
                  {line.content}
                </code>
              </div>
            );
          })}
        </div>
        <div className="minimap-panel">
          <div
            ref={minimapRef}
            className="minimap-track"
            onClick={handleMinimapClick}
          >
            {lines.map((line, index) => {
              const top =
                lines.length <= 1 ? 0 : (index / (lines.length - 1)) * 100;
              return (
                <button
                  key={`${title}-mini-${index + 1}`}
                  type="button"
                  className={`minimap-line status-${line.status}`}
                  style={{ top: `${top}%` }}
                  onClick={(event) => {
                    event.stopPropagation();
                    const ratio =
                      lines.length <= 1 ? 0 : index / (lines.length - 1);
                    scrollToRatio(ratio);
                    onLineActivate(id, index, ratio);
                  }}
                  aria-label={`Jump to line ${index + 1}`}
                />
              );
            })}
            <button
              type="button"
              className="minimap-viewport"
              style={{ height: `${viewportHeight}px`, top: `${viewportTop}px` }}
              onMouseDown={handleViewportMouseDown}
              aria-label="Drag minimap viewport"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function buildDiffRatios(lines: JsonLine[]) {
  return lines.reduce<number[]>((ratios, line, index) => {
    if (line.status === "equal") {
      return ratios;
    }

    const ratio = lines.length <= 1 ? 0 : index / (lines.length - 1);
    ratios.push(ratio);
    return ratios;
  }, []);
}

function findNearestDiffIndex(lines: JsonLine[], ratio: number) {
  const diffIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.status !== "equal")
    .map(({ index }) => index);

  if (diffIndexes.length === 0) {
    return null;
  }

  return diffIndexes.reduce((closest, current) => {
    const currentDistance = Math.abs(
      (lines.length <= 1 ? 0 : current / (lines.length - 1)) - ratio,
    );
    const closestDistance = Math.abs(
      (lines.length <= 1 ? 0 : closest / (lines.length - 1)) - ratio,
    );
    return currentDistance < closestDistance ? current : closest;
  }, diffIndexes[0]);
}

function JsonComparePanel({
  node,
  collapsedPaths,
  onToggleCollapse,
  navigationRequest,
  onNavigationStateChange,
  showOnlyDifferences,
  searchQuery,
  emptyMessage,
}: {
  node: DiffNode;
  collapsedPaths: Set<string>;
  onToggleCollapse: (path: string) => void;
  navigationRequest: { seq: number; direction: "prev" | "next" | null };
  onNavigationStateChange: (hasDiffs: boolean) => void;
  showOnlyDifferences: boolean;
  searchQuery: string;
  emptyMessage: string;
}) {
  const normalizedQuery = useMemo(() => normalizeSearchQuery(searchQuery), [searchQuery]);
  const leftLines = useMemo(
    () =>
      buildJsonLines(
        node,
        "left",
        0,
        true,
        collapsedPaths,
        onToggleCollapse,
        showOnlyDifferences,
        normalizedQuery,
        true,
      ),
    [collapsedPaths, node, onToggleCollapse, showOnlyDifferences, normalizedQuery],
  );
  const rightLines = useMemo(
    () =>
      buildJsonLines(
        node,
        "right",
        0,
        true,
        collapsedPaths,
        onToggleCollapse,
        showOnlyDifferences,
        normalizedQuery,
        true,
      ),
    [collapsedPaths, node, onToggleCollapse, showOnlyDifferences, normalizedQuery],
  );
  const [sharedRatio, setSharedRatio] = useState(0);
  const [highlightState, setHighlightState] = useState<HighlightState>({
    left: null,
    right: null,
    token: 0,
  });
  const handledNavigationSeq = useRef(0);

  const diffRatios = useMemo(() => {
    return Array.from(
      new Set([...buildDiffRatios(leftLines), ...buildDiffRatios(rightLines)]),
    ).sort((a, b) => a - b);
  }, [leftLines, rightLines]);

  useEffect(() => {
    setSharedRatio(0);
    setHighlightState({ left: null, right: null, token: 0 });
    handledNavigationSeq.current = 0;
  }, [leftLines.length, rightLines.length]);

  useEffect(() => {
    onNavigationStateChange(diffRatios.length > 0);
  }, [diffRatios.length, onNavigationStateChange]);

  useEffect(() => {
    if (!navigationRequest.direction || diffRatios.length === 0) {
      return;
    }

    if (navigationRequest.seq === handledNavigationSeq.current) {
      return;
    }

    handledNavigationSeq.current = navigationRequest.seq;

    const nextCandidates = diffRatios.filter(
      (ratio) => ratio > sharedRatio + 0.0001,
    );
    const prevCandidates = diffRatios.filter(
      (ratio) => ratio < sharedRatio - 0.0001,
    );

    const targetRatio =
      navigationRequest.direction === "next"
        ? (nextCandidates[0] ?? diffRatios[0])
        : (prevCandidates[prevCandidates.length - 1] ??
          diffRatios[diffRatios.length - 1]);

    const leftIndex = findNearestDiffIndex(leftLines, targetRatio);
    const rightIndex = findNearestDiffIndex(rightLines, targetRatio);

    setSharedRatio(targetRatio);
    setHighlightState((current) => ({
      left: leftIndex,
      right: rightIndex,
      token: current.token + 1,
    }));
  }, [
    diffRatios,
    leftLines,
    navigationRequest.direction,
    navigationRequest.seq,
    rightLines,
    sharedRatio,
  ]);

  function handleRatioChange(_id: "left" | "right", ratio: number) {
    setSharedRatio(ratio);
  }

  function handleLineActivate(
    id: "left" | "right",
    lineIndex: number,
    ratio: number,
  ) {
    setSharedRatio(ratio);
    setHighlightState((current) => ({
      left: id === "left" ? lineIndex : findNearestDiffIndex(leftLines, ratio),
      right:
        id === "right" ? lineIndex : findNearestDiffIndex(rightLines, ratio),
      token: current.token + 1,
    }));
  }

  return (
    <div className="json-compare-grid">
      <CodePanel
        id="left"
        title="JSON 1"
        lines={leftLines}
        emptyMessage={emptyMessage}
        sharedRatio={sharedRatio}
        highlightedLine={highlightState.left}
        highlightToken={highlightState.token}
        onRatioChange={handleRatioChange}
        onLineActivate={handleLineActivate}
      />
      <CodePanel
        id="right"
        title="JSON 2"
        lines={rightLines}
        emptyMessage={emptyMessage}
        sharedRatio={sharedRatio}
        highlightedLine={highlightState.right}
        highlightToken={highlightState.token}
        onRatioChange={handleRatioChange}
        onLineActivate={handleLineActivate}
      />
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(
    () => new Set(),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const [navigationRequest, setNavigationRequest] = useState<{
    seq: number;
    direction: "prev" | "next" | null;
  }>({ seq: 0, direction: null });
  const [hasDiffTargets, setHasDiffTargets] = useState(false);
  const locale = settings.locale;
  const currentLocaleOption =
    localeOptions.find((option) => option.value === settings.locale) ??
    localeOptions[0];
  const localeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    document.body.style.overflow =
      isFullscreen || isSettingsOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen, isSettingsOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
        setIsLocaleMenuOpen(false);
      }
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (!localeMenuRef.current?.contains(event.target as Node)) {
        setIsLocaleMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const comparisonState = useMemo(() => {
    try {
      const leftValue = safeParseJson(settings.leftInput);
      const rightValue = safeParseJson(settings.rightInput);

      return {
        errors: {} as JsonErrorState,
        parsedResult: diffValue(leftValue, rightValue, "root", {
          caseInsensitiveKeys: settings.caseInsensitiveKeys,
          missingLabel: t(locale, "missing"),
        }),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t(locale, "invalidJson");
      const nextErrors: JsonErrorState = {};

      try {
        safeParseJson(settings.leftInput);
      } catch (leftError) {
        nextErrors.left =
          leftError instanceof Error ? leftError.message : message;
      }

      try {
        safeParseJson(settings.rightInput);
      } catch (rightError) {
        nextErrors.right =
          rightError instanceof Error ? rightError.message : message;
      }

      return {
        errors: nextErrors,
        parsedResult: null,
      };
    }
  }, [
    locale,
    settings.caseInsensitiveKeys,
    settings.leftInput,
    settings.rightInput,
  ]);

  const { errors, parsedResult } = comparisonState;
  const diffSummary = parsedResult ? summarizeDiffNodes(parsedResult) : null;
  const diffCount = diffSummary?.total ?? 0;
  const changedCount = (diffSummary?.changed ?? 0) + (diffSummary?.typeChanged ?? 0);

  useEffect(() => {
    setCollapsedPaths(new Set());
    setNavigationRequest({ seq: 0, direction: null });
  }, [
    settings.leftInput,
    settings.rightInput,
    settings.caseInsensitiveKeys,
    settings.showOnlyDifferences,
    settings.searchQuery,
  ]);

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleFormat(target: "leftInput" | "rightInput") {
    try {
      updateSettings({
        [target]: formatJsonInput(settings[target]),
      } as Pick<AppSettings, typeof target>);
    } catch (error) {
      console.error(error);
    }
  }

  function handleToggleCollapse(path: string) {
    setCollapsedPaths((current) => {
      const next = new Set(current);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }

  function adjustPanelHeight(delta: number) {
    updateSettings({
      panelHeight: clampPanelHeight(settings.panelHeight + delta),
    });
  }

  function resetPanelHeight() {
    updateSettings({ panelHeight: defaultSettings.panelHeight });
  }

  function requestNavigation(direction: "prev" | "next") {
    setNavigationRequest((current) => ({
      seq: current.seq + 1,
      direction,
    }));
  }

  return (
    <div
      className={`app-shell diff-style-${settings.diffBadgeStyle}`}
      style={{ ["--panel-height" as string]: `${settings.panelHeight}px` }}
    >
      <header className="hero">
        <div className="hero-bar">
          <div className="hero-intro">
            <h1>{t(locale, "title")}</h1>
            <p className="hero-copy">{t(locale, "subtitle")}</p>
          </div>
          <div className="hero-actions" aria-label="Quick actions">
            <a
              href="https://github.com/Nil0516/json-diff-studio"
              target="_blank"
              rel="noreferrer"
              className="hero-action-link github-link github-link-header"
              aria-label="GitHub repository"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="github-icon"
              >
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.58 2 12.22c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.09 0-1.13.39-2.05 1.03-2.77-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.06A9.31 9.31 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.06 2.75-1.06.55 1.42.2 2.47.1 2.73.64.72 1.03 1.64 1.03 2.77 0 3.96-2.34 4.82-4.57 5.08.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .27.18.59.69.49A10.27 10.27 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z"
                />
              </svg>
              <span>GitHub</span>
            </a>
            <div className="locale-switcher" ref={localeMenuRef}>
              <button
                type="button"
                className={
                  isLocaleMenuOpen
                    ? "hero-action-button locale-trigger active"
                    : "hero-action-button locale-trigger"
                }
                onClick={() => setIsLocaleMenuOpen((current) => !current)}
                aria-haspopup="menu"
                aria-expanded={isLocaleMenuOpen}
                aria-label={t(locale, "language")}
              >
                <span className="locale-trigger-icon">
                  {currentLocaleOption.icon}
                </span>
                <span>{currentLocaleOption.shortLabel}</span>
              </button>
              {isLocaleMenuOpen ? (
                <div
                  className="locale-menu"
                  role="menu"
                  aria-label={t(locale, "language")}
                >
                  {localeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        option.value === settings.locale
                          ? "locale-option active"
                          : "locale-option"
                      }
                      onClick={() => {
                        updateSettings({ locale: option.value as Locale });
                        setIsLocaleMenuOpen(false);
                      }}
                    >
                      <span className="locale-option-icon">{option.icon}</span>
                      <span className="locale-option-label">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="hero-action-button settings-trigger"
              onClick={() => setIsSettingsOpen(true)}
            >
              {t(locale, "openSettings")}
            </button>
          </div>
        </div>
      </header>

      <main className="workspace">
        <section className="editor-grid">
          <article className="editor-card">
            <div className="editor-header">
              <h2>{t(locale, "leftTitle")}</h2>
              <button
                type="button"
                className="ghost editor-action-btn"
                onClick={() => handleFormat("leftInput")}
              >
                {t(locale, "formatJson")}
              </button>
            </div>
            <textarea
              value={settings.leftInput}
              onChange={(event) =>
                updateSettings({ leftInput: event.target.value })
              }
              placeholder={t(locale, "placeholderLeft")}
              spellCheck={false}
            />
            {errors.left ? (
              <p className="error-text">
                {t(locale, "parseError")}: {errors.left}
              </p>
            ) : null}
          </article>

          <article className="editor-card">
            <div className="editor-header">
              <h2>{t(locale, "rightTitle")}</h2>
              <button
                type="button"
                className="ghost editor-action-btn"
                onClick={() => handleFormat("rightInput")}
              >
                {t(locale, "formatJson")}
              </button>
            </div>
            <textarea
              value={settings.rightInput}
              onChange={(event) =>
                updateSettings({ rightInput: event.target.value })
              }
              placeholder={t(locale, "placeholderRight")}
              spellCheck={false}
            />
            {errors.right ? (
              <p className="error-text">
                {t(locale, "parseError")}: {errors.right}
              </p>
            ) : null}
          </article>
        </section>

        <section
          className={isFullscreen ? "result-card fullscreen" : "result-card"}
        >
          <div className="result-header">
            <div>
              <h2>{t(locale, "diffResult")}</h2>
              <p className="summary-line">
                {parsedResult
                  ? diffCount === 0
                    ? t(locale, "summaryNone")
                    : t(locale, "summaryValue", { count: diffCount })
                  : t(locale, "invalidJson")}
              </p>
            </div>
            <div className="result-actions">
              <span className="height-readout">
                {t(locale, "panelHeight")}: {settings.panelHeight}px
              </span>
              <button
                type="button"
                className="ghost action-btn"
                onClick={() => requestNavigation("prev")}
                disabled={!hasDiffTargets}
              >
                {t(locale, "prevDiff")}
              </button>
              <button
                type="button"
                className="ghost action-btn"
                onClick={() => requestNavigation("next")}
                disabled={!hasDiffTargets}
              >
                {t(locale, "nextDiff")}
              </button>
              <button
                type="button"
                className="ghost action-btn"
                onClick={() => adjustPanelHeight(-panelHeightStep)}
              >
                {t(locale, "smaller")}
              </button>
              <button
                type="button"
                className="ghost action-btn"
                onClick={() => adjustPanelHeight(panelHeightStep)}
              >
                {t(locale, "larger")}
              </button>
              <button
                type="button"
                className="ghost action-btn"
                onClick={resetPanelHeight}
              >
                {t(locale, "resetHeight")}
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => setIsFullscreen((current) => !current)}
              >
                {isFullscreen
                  ? t(locale, "exitFullscreen")
                  : t(locale, "fullscreen")}
              </button>
            </div>
          </div>

          <div className="result-toolbar">
            <div className="result-toolbar-controls">
              <div className="result-search">
                <input
                  type="search"
                  value={settings.searchQuery}
                  onChange={(event) =>
                    updateSettings({ searchQuery: event.target.value })
                  }
                  placeholder={t(locale, "searchPlaceholder")}
                  aria-label={t(locale, "searchPlaceholder")}
                />
                {settings.searchQuery.trim() ? (
                  <button
                    type="button"
                    className="ghost result-search-clear"
                    onClick={() => updateSettings({ searchQuery: "" })}
                  >
                    {t(locale, "clearSearch")}
                  </button>
                ) : null}
              </div>

              <label className="toolbar-toggle result-filter-toggle">
              <input
                type="checkbox"
                checked={settings.showOnlyDifferences}
                onChange={(event) =>
                  updateSettings({ showOnlyDifferences: event.target.checked })
                }
              />
                <span>{t(locale, "showOnlyDifferences")}</span>
              </label>
            </div>

            <div className="legend">
            <span className="legend-item legend-equal">
              <span>{t(locale, "legendEqual")}</span>
            </span>
            <span className="legend-item legend-changed">
              <span>{t(locale, "legendChanged")}</span>
              <strong>{changedCount}</strong>
            </span>

            <span className="legend-item legend-added">
              <span>{t(locale, "legendAdded")}</span>
              <strong>{diffSummary?.added ?? 0}</strong>
            </span>
            <span className="legend-item legend-removed">
              <span>{t(locale, "legendRemoved")}</span>
              <strong>{diffSummary?.removed ?? 0}</strong>
            </span>
            </div>
          </div>

          {parsedResult ? (
            <div className="tree-panel">
              <JsonComparePanel
                node={parsedResult}
                collapsedPaths={collapsedPaths}
                onToggleCollapse={handleToggleCollapse}
                navigationRequest={navigationRequest}
                onNavigationStateChange={setHasDiffTargets}
                showOnlyDifferences={settings.showOnlyDifferences}
                searchQuery={settings.searchQuery}
                emptyMessage={settings.searchQuery.trim() ? t(locale, "noSearchResults") : t(locale, "summaryNone")}
              />
            </div>
          ) : (
            <div className="empty-state">{t(locale, "invalidJson")}</div>
          )}
        </section>
      </main>

      {isSettingsOpen ? (
        <div
          className="settings-modal-backdrop"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="settings-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
          >
            <div className="settings-modal-header">
              <div>
                <p className="eyebrow modal-eyebrow">
                  {t(locale, "settingsTitle")}
                </p>
                <h2 id="settings-modal-title">{t(locale, "compareOptions")}</h2>
              </div>
              <button
                type="button"
                className="ghost settings-close"
                onClick={() => setIsSettingsOpen(false)}
              >
                {t(locale, "close")}
              </button>
            </div>
            <div className="settings-modal-grid">
              <section className="settings-section">
                <h3>{t(locale, "settingsTitle")}</h3>
                <label className="toolbar-toggle">
                  <input
                    type="checkbox"
                    checked={settings.caseInsensitiveKeys}
                    onChange={(event) =>
                      updateSettings({
                        caseInsensitiveKeys: event.target.checked,
                      })
                    }
                  />
                  <span>{t(locale, "caseInsensitive")}</span>
                </label>
              </section>
              <section className="settings-section">
                <h3>{t(locale, "appearanceTitle")}</h3>
                <label className="toolbar-field">
                  <span>{t(locale, "badgeStyle")}</span>
                  <div className="segmented-control compact">
                    <button
                      type="button"
                      className={
                        settings.diffBadgeStyle === "soft"
                          ? "segment active"
                          : "segment"
                      }
                      onClick={() => updateSettings({ diffBadgeStyle: "soft" })}
                    >
                      {t(locale, "badgeSoft")}
                    </button>
                    <button
                      type="button"
                      className={
                        settings.diffBadgeStyle === "solid"
                          ? "segment active"
                          : "segment"
                      }
                      onClick={() =>
                        updateSettings({ diffBadgeStyle: "solid" })
                      }
                    >
                      {t(locale, "badgeSolid")}
                    </button>
                  </div>
                </label>
                <div className="button-row toolbar-actions">
                  <button
                    type="button"
                    onClick={() => setSettings(sampleSettings(settings))}
                  >
                    {t(locale, "loadSample")}
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        leftInput: "{}",
                        rightInput: "{}",
                      }))
                    }
                  >
                    {t(locale, "clear")}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="app-footer">
        <section className="footer-card">
          <h3>{t(locale, "footerNoticeTitle")}</h3>
          <p>{t(locale, "privacyNotice")}</p>
          <p>{t(locale, "disclaimer")}</p>
        </section>
        <section className="footer-card">
          <h3>{t(locale, "footerLicenseTitle")}</h3>
          <p>{t(locale, "mitLicense")}</p>
          <div className="footer-links">
            <a
              href="https://opensource.org/license/mit/"
              target="_blank"
              rel="noreferrer"
            >
              MIT License
            </a>
          </div>
        </section>
        <section className="footer-card">
          <h3>{t(locale, "footerTechTitle")}</h3>
          <p>{t(locale, "builtWith")}</p>
          <div className="footer-links footer-links-stack">
            <a href="https://react.dev/" target="_blank" rel="noreferrer">
              React
            </a>
            <a href="https://openai.com/" target="_blank" rel="noreferrer">
              GPT-5.4
            </a>
          </div>
        </section>
      </footer>
    </div>
  );
}




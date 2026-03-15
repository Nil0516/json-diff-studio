import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, ReactNode, UIEvent } from 'react';
import { countDiffNodes, diffValue } from './diff';
import { localeOptions, t } from './i18n';
import { defaultSettings, loadSettings, saveSettings } from './storage';
import type { AppSettings, DiffNode, JsonErrorState, Locale } from './types';

interface JsonLine {
  marker: string;
  status: DiffNode['status'];
  content: ReactNode;
}

interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
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
    panelHeight: current.panelHeight,
  };
}

function statusClassName(status: DiffNode['status']) {
  return `status-${status}`;
}

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatInlineValue(value: unknown) {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }

  return JSON.stringify(value);
}

function getMarker(status: DiffNode['status']) {
  if (status === 'added') {
    return '+';
  }

  if (status === 'removed') {
    return '-';
  }

  if (status === 'changed' || status === 'type-changed') {
    return '~';
  }

  return '';
}

function renderKeyPrefix(key: string | undefined, isArrayItem: boolean, keyChanged: boolean) {
  if (!key || isArrayItem) {
    return null;
  }

  return <span className={keyChanged ? 'json-key key-emphasis' : 'json-key'}>{`${JSON.stringify(key)}: `}</span>;
}

function CollapseToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button type="button" className="collapse-toggle" onClick={onToggle} aria-label={collapsed ? 'Expand' : 'Collapse'}>
      {collapsed ? '▸' : '▾'}
    </button>
  );
}

function buildJsonLines(
  node: DiffNode,
  side: 'left' | 'right',
  depth: number,
  isLast: boolean,
  collapsedPaths: Set<string>,
  onToggleCollapse: (path: string) => void,
  isRoot = false,
): JsonLine[] {
  const value = side === 'left' ? node.leftValue : node.rightValue;
  const key = side === 'left' ? (node.leftKey ?? node.rightKey) : (node.rightKey ?? node.leftKey);
  const isArrayItem = key?.startsWith('[') ?? false;
  const suffix = isRoot || isLast ? '' : ',';
  const keyPrefix = renderKeyPrefix(key, isArrayItem, node.keyChanged);

  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value) && node.children?.length) {
    const containerStatus = node.status === 'added' || node.status === 'removed' || node.keyChanged ? node.status : 'equal';
    const isCollapsed = collapsedPaths.has(node.path);
    const openLine: JsonLine = {
      marker: getMarker(containerStatus),
      status: containerStatus,
      content: (
        <>
          <span className="json-indent" style={{ width: `${depth * 20}px` }} />
          <CollapseToggle collapsed={isCollapsed} onToggle={() => onToggleCollapse(node.path)} />
          {keyPrefix}
          <span className="json-punct">{isCollapsed ? `[${value.length}]${suffix}` : '['}</span>
        </>
      ),
    };

    if (isCollapsed) {
      return [openLine];
    }

    const childLines = node.children.flatMap((child, index) =>
      buildJsonLines(
        child,
        side,
        depth + 1,
        index === node.children!.length - 1,
        collapsedPaths,
        onToggleCollapse,
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

  if (isObjectValue(value) && node.children?.length) {
    const containerStatus = node.status === 'added' || node.status === 'removed' || node.keyChanged ? node.status : 'equal';
    const isCollapsed = collapsedPaths.has(node.path);
    const propertyCount = Object.keys(value).length;
    const openLine: JsonLine = {
      marker: getMarker(containerStatus),
      status: containerStatus,
      content: (
        <>
          <span className="json-indent" style={{ width: `${depth * 20}px` }} />
          <CollapseToggle collapsed={isCollapsed} onToggle={() => onToggleCollapse(node.path)} />
          {keyPrefix}
          <span className="json-punct">{isCollapsed ? `{${propertyCount}}${suffix}` : '{'}</span>
        </>
      ),
    };

    if (isCollapsed) {
      return [openLine];
    }

    const childLines = node.children.flatMap((child, index) =>
      buildJsonLines(
        child,
        side,
        depth + 1,
        index === node.children!.length - 1,
        collapsedPaths,
        onToggleCollapse,
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
      marker: getMarker(node.status === 'equal' ? 'equal' : node.status),
      status: node.status === 'equal' ? 'equal' : node.status,
      content: (
        <>
          <span className="json-indent" style={{ width: `${depth * 20}px` }} />
          <span className="collapse-spacer" />
          {keyPrefix}
          <span className={node.valueChanged ? 'json-value value-emphasis' : 'json-value'}>
            {`${formatInlineValue(value)}${suffix}`}
          </span>
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
  onRatioChange,
}: {
  id: 'left' | 'right';
  title: string;
  lines: JsonLine[];
  sharedRatio: number;
  onRatioChange: (id: 'left' | 'right', ratio: number) => void;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>(getInitialScrollMetrics);
  const [minimapHeight, setMinimapHeight] = useState(1);
  const isApplyingExternalScroll = useRef(false);
  const dragStateRef = useRef<{ startY: number; startScrollTop: number } | null>(null);

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
    element.addEventListener('scroll', updateMetrics);

    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(element);
    resizeObserver.observe(minimapElement);

    return () => {
      element.removeEventListener('scroll', updateMetrics);
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

  const maxScroll = Math.max(metrics.scrollHeight - metrics.clientHeight, 0);
  const currentRatio = maxScroll === 0 ? 0 : metrics.scrollTop / maxScroll;
  const viewportHeight = maxScroll === 0 ? minimapHeight : Math.max(40, (metrics.clientHeight / metrics.scrollHeight) * minimapHeight);
  const viewportTravel = Math.max(minimapHeight - viewportHeight, 0);
  const viewportTop = viewportTravel === 0 ? 0 : currentRatio * viewportTravel;

  function scrollToRatio(ratio: number) {
    const element = bodyRef.current;

    if (!element) {
      return;
    }

    const clampedRatio = Math.min(1, Math.max(0, ratio));
    element.scrollTo({ top: clampedRatio * Math.max(element.scrollHeight - element.clientHeight, 0), behavior: 'auto' });
    onRatioChange(id, clampedRatio);
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    if (isApplyingExternalScroll.current) {
      return;
    }

    const element = event.currentTarget;
    const nextMaxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
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
      const scrollDelta = (deltaY / travel) * Math.max(element.scrollHeight - element.clientHeight, 0);
      const nextScrollTop = dragState.startScrollTop + scrollDelta;
      const nextRatio = Math.max(element.scrollHeight - element.clientHeight, 0) === 0
        ? 0
        : nextScrollTop / Math.max(element.scrollHeight - element.clientHeight, 1);

      scrollToRatio(nextRatio);
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  return (
    <section className="code-panel">
      <div className="code-panel-header">{title}</div>
      <div className="code-panel-main">
        <div ref={bodyRef} className="code-panel-body" onScroll={handleScroll}>
          {lines.map((line, index) => (
            <div key={`${title}-${index + 1}`} className={`code-line ${statusClassName(line.status)}`}>
              <span className="code-line-number">{index + 1}</span>
              <span className={`code-line-marker marker-${line.status}`}>{line.marker}</span>
              <code className={`code-line-content ${statusClassName(line.status)}`}>{line.content}</code>
            </div>
          ))}
        </div>
        <div className="minimap-panel">
          <div ref={minimapRef} className="minimap-track" onClick={handleMinimapClick}>
            {lines.map((line, index) => {
              const top = lines.length <= 1 ? 0 : (index / (lines.length - 1)) * 100;
              return (
                <button
                  key={`${title}-mini-${index + 1}`}
                  type="button"
                  className={`minimap-line status-${line.status}`}
                  style={{ top: `${top}%` }}
                  onClick={(event) => {
                    event.stopPropagation();
                    scrollToRatio(lines.length <= 1 ? 0 : index / (lines.length - 1));
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

function JsonComparePanel({
  node,
  collapsedPaths,
  onToggleCollapse,
}: {
  node: DiffNode;
  collapsedPaths: Set<string>;
  onToggleCollapse: (path: string) => void;
}) {
  const leftLines = buildJsonLines(node, 'left', 0, true, collapsedPaths, onToggleCollapse, true);
  const rightLines = buildJsonLines(node, 'right', 0, true, collapsedPaths, onToggleCollapse, true);
  const [sharedRatio, setSharedRatio] = useState(0);

  useEffect(() => {
    setSharedRatio(0);
  }, [leftLines.length, rightLines.length]);

  return (
    <div className="json-compare-grid">
      <CodePanel id="left" title="JSON 1" lines={leftLines} sharedRatio={sharedRatio} onRatioChange={(_, ratio) => setSharedRatio(ratio)} />
      <CodePanel id="right" title="JSON 2" lines={rightLines} sharedRatio={sharedRatio} onRatioChange={(_, ratio) => setSharedRatio(ratio)} />
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const locale = settings.locale;

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const comparisonState = useMemo(() => {
    try {
      const leftValue = safeParseJson(settings.leftInput);
      const rightValue = safeParseJson(settings.rightInput);

      return {
        errors: {} as JsonErrorState,
        parsedResult: diffValue(leftValue, rightValue, 'root', {
          caseInsensitiveKeys: settings.caseInsensitiveKeys,
          missingLabel: t(locale, 'missing'),
        }),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : t(locale, 'invalidJson');
      const nextErrors: JsonErrorState = {};

      try {
        safeParseJson(settings.leftInput);
      } catch (leftError) {
        nextErrors.left = leftError instanceof Error ? leftError.message : message;
      }

      try {
        safeParseJson(settings.rightInput);
      } catch (rightError) {
        nextErrors.right = rightError instanceof Error ? rightError.message : message;
      }

      return {
        errors: nextErrors,
        parsedResult: null,
      };
    }
  }, [locale, settings.caseInsensitiveKeys, settings.leftInput, settings.rightInput]);

  const { errors, parsedResult } = comparisonState;
  const diffCount = parsedResult ? countDiffNodes(parsedResult) : 0;

  useEffect(() => {
    setCollapsedPaths(new Set());
  }, [settings.leftInput, settings.rightInput, settings.caseInsensitiveKeys]);

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleFormat(target: 'leftInput' | 'rightInput') {
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

  return (
    <div className={`app-shell diff-style-${settings.diffBadgeStyle}`} style={{ ['--panel-height' as string]: `${settings.panelHeight}px` }}>
      <header className="hero">
        <div>
          <p className="eyebrow">React + TypeScript + GitHub Pages</p>
          <h1>{t(locale, 'title')}</h1>
          <p className="hero-copy">{t(locale, 'subtitle')}</p>
        </div>
        <div className="config-card">
          <h2>{t(locale, 'compareOptions')}</h2>
          <label className="field">
            <span>{t(locale, 'language')}</span>
            <select
              value={settings.locale}
              onChange={(event) => updateSettings({ locale: event.target.value as Locale })}
            >
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t(locale, 'badgeStyle')}</span>
            <div className="segmented-control">
              <button
                type="button"
                className={settings.diffBadgeStyle === 'soft' ? 'segment active' : 'segment'}
                onClick={() => updateSettings({ diffBadgeStyle: 'soft' })}
              >
                {t(locale, 'badgeSoft')}
              </button>
              <button
                type="button"
                className={settings.diffBadgeStyle === 'solid' ? 'segment active' : 'segment'}
                onClick={() => updateSettings({ diffBadgeStyle: 'solid' })}
              >
                {t(locale, 'badgeSolid')}
              </button>
            </div>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.caseInsensitiveKeys}
              onChange={(event) => updateSettings({ caseInsensitiveKeys: event.target.checked })}
            />
            <span>{t(locale, 'caseInsensitive')}</span>
          </label>
          <div className="button-row">
            <button type="button" onClick={() => setSettings(sampleSettings(settings))}>
              {t(locale, 'loadSample')}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  leftInput: '{}',
                  rightInput: '{}',
                }))
              }
            >
              {t(locale, 'clear')}
            </button>
          </div>
        </div>
      </header>

      <main className="workspace">
        <section className="editor-grid">
          <article className="editor-card">
            <div className="editor-header">
              <h2>{t(locale, 'leftTitle')}</h2>
              <button type="button" onClick={() => handleFormat('leftInput')}>
                {t(locale, 'formatJson')}
              </button>
            </div>
            <textarea
              value={settings.leftInput}
              onChange={(event) => updateSettings({ leftInput: event.target.value })}
              placeholder={t(locale, 'placeholderLeft')}
              spellCheck={false}
            />
            {errors.left ? (
              <p className="error-text">
                {t(locale, 'parseError')}: {errors.left}
              </p>
            ) : null}
          </article>

          <article className="editor-card">
            <div className="editor-header">
              <h2>{t(locale, 'rightTitle')}</h2>
              <button type="button" onClick={() => handleFormat('rightInput')}>
                {t(locale, 'formatJson')}
              </button>
            </div>
            <textarea
              value={settings.rightInput}
              onChange={(event) => updateSettings({ rightInput: event.target.value })}
              placeholder={t(locale, 'placeholderRight')}
              spellCheck={false}
            />
            {errors.right ? (
              <p className="error-text">
                {t(locale, 'parseError')}: {errors.right}
              </p>
            ) : null}
          </article>
        </section>

        <section className={isFullscreen ? 'result-card fullscreen' : 'result-card'}>
          <div className="result-header">
            <div>
              <h2>{t(locale, 'diffResult')}</h2>
              <p className="summary-line">
                {parsedResult
                  ? diffCount === 0
                    ? t(locale, 'summaryNone')
                    : t(locale, 'summaryValue', { count: diffCount })
                  : t(locale, 'invalidJson')}
              </p>
            </div>
            <div className="result-actions">
              <span className="height-readout">{t(locale, 'panelHeight')}: {settings.panelHeight}px</span>
              <button type="button" className="ghost action-btn" onClick={() => adjustPanelHeight(-panelHeightStep)}>
                {t(locale, 'smaller')}
              </button>
              <button type="button" className="ghost action-btn" onClick={() => adjustPanelHeight(panelHeightStep)}>
                {t(locale, 'larger')}
              </button>
              <button type="button" className="ghost action-btn" onClick={resetPanelHeight}>
                {t(locale, 'resetHeight')}
              </button>
              <button type="button" className="action-btn" onClick={() => setIsFullscreen((current) => !current)}>
                {isFullscreen ? t(locale, 'exitFullscreen') : t(locale, 'fullscreen')}
              </button>
            </div>
          </div>

          <div className="legend">
            <span className="legend-item legend-equal">{t(locale, 'legendEqual')}</span>
            <span className="legend-item legend-changed">{t(locale, 'legendChanged')}</span>
            <span className="legend-item legend-added">{t(locale, 'legendAdded')}</span>
            <span className="legend-item legend-removed">{t(locale, 'legendRemoved')}</span>
          </div>

          {parsedResult ? (
            <div className="tree-panel">
              <JsonComparePanel
                node={parsedResult}
                collapsedPaths={collapsedPaths}
                onToggleCollapse={handleToggleCollapse}
              />
            </div>
          ) : (
            <div className="empty-state">{t(locale, 'invalidJson')}</div>
          )}
        </section>
      </main>
    </div>
  );
}

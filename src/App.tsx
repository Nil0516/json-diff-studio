import { useEffect, useMemo, useState } from 'react';
import { countDiffNodes, diffValue } from './diff';
import { localeOptions, t } from './i18n';
import { defaultSettings, loadSettings, saveSettings } from './storage';
import type { AppSettings, DiffNode, JsonErrorState, Locale } from './types';

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

function sampleSettings(current: AppSettings): AppSettings {
  return {
    ...current,
    ...defaultSettings,
    locale: current.locale,
    caseInsensitiveKeys: current.caseInsensitiveKeys,
  };
}

function statusClassName(status: DiffNode['status']) {
  return `status-${status}`;
}

function TreeNode({
  node,
  depth,
  locale,
}: {
  node: DiffNode;
  depth: number;
  locale: Locale;
}) {
  const keyLabel = node.rightKey ?? node.leftKey ?? node.path;
  const hasChildren = Boolean(node.children?.length);

  return (
    <div className={`tree-node ${statusClassName(node.status)}`}>
      <div className="tree-row" style={{ paddingLeft: `${depth * 16}px` }}>
        <div className="tree-path">
          <span className="tree-key">{keyLabel}</span>
          <span className="tree-status">
            {t(locale, 'status')}: {node.status === 'equal' ? t(locale, 'same') : t(locale, 'different')}
          </span>
        </div>
        <div className="tree-values">
          <code>{node.leftDisplay}</code>
          <code>{node.rightDisplay}</code>
        </div>
      </div>
      {hasChildren ? (
        <div className="tree-children">
          {node.children!.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} locale={locale} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const locale = settings.locale;

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

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

  return (
    <div className="app-shell">
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

        <section className="result-card">
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
            <div className="legend">
              <span className="legend-item legend-equal">{t(locale, 'legendEqual')}</span>
              <span className="legend-item legend-changed">{t(locale, 'legendChanged')}</span>
              <span className="legend-item legend-added">{t(locale, 'legendAdded')}</span>
              <span className="legend-item legend-removed">{t(locale, 'legendRemoved')}</span>
            </div>
          </div>

          {parsedResult ? (
            <div className="tree-panel">
              <div className="tree-header">
                <span>{t(locale, 'leftTitle')}</span>
                <span>{t(locale, 'rightTitle')}</span>
              </div>
              <TreeNode node={parsedResult} depth={0} locale={locale} />
            </div>
          ) : (
            <div className="empty-state">{t(locale, 'invalidJson')}</div>
          )}
        </section>
      </main>
    </div>
  );
}

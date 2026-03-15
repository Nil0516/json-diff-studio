import type { Locale } from './types';

type MessageKey =
  | 'title'
  | 'subtitle'
  | 'leftTitle'
  | 'rightTitle'
  | 'compareOptions'
  | 'caseInsensitive'
  | 'language'
  | 'formatJson'
  | 'loadSample'
  | 'clear'
  | 'parseError'
  | 'invalidJson'
  | 'diffResult'
  | 'legendEqual'
  | 'legendChanged'
  | 'legendAdded'
  | 'legendRemoved'
  | 'summary'
  | 'summaryValue'
  | 'summaryNone'
  | 'placeholderLeft'
  | 'placeholderRight'
  | 'missing'
  | 'same'
  | 'different'
  | 'status';

type Messages = Record<MessageKey, string>;

export const localeOptions: { value: Locale; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
];

export const messages: Record<Locale, Messages> = {
  'zh-TW': {
    title: 'JSON Diff Studio',
    subtitle: '貼上兩份 JSON，立即用高亮方式看出欄位、值與結構差異。',
    leftTitle: 'JSON 1',
    rightTitle: 'JSON 2',
    compareOptions: '比對設定',
    caseInsensitive: 'Key 大小寫不敏感',
    language: '語言',
    formatJson: '格式化 JSON',
    loadSample: '載入範例',
    clear: '清空',
    parseError: 'JSON 解析錯誤',
    invalidJson: '請先修正 JSON 格式後再比對。',
    diffResult: 'Diff 結果',
    legendEqual: '相同',
    legendChanged: '已變更',
    legendAdded: '新增',
    legendRemoved: '刪除',
    summary: '差異摘要',
    summaryValue: '共 {count} 個差異節點',
    summaryNone: '目前沒有差異。',
    placeholderLeft: '{\n  "name": "Alice"\n}',
    placeholderRight: '{\n  "name": "Bob"\n}',
    missing: '不存在',
    same: '相同',
    different: '不同',
    status: '狀態',
  },
  'zh-CN': {
    title: 'JSON Diff Studio',
    subtitle: '粘贴两份 JSON，立即通过高亮查看字段、值与结构差异。',
    leftTitle: 'JSON 1',
    rightTitle: 'JSON 2',
    compareOptions: '比较设置',
    caseInsensitive: 'Key 大小写不敏感',
    language: '语言',
    formatJson: '格式化 JSON',
    loadSample: '载入示例',
    clear: '清空',
    parseError: 'JSON 解析错误',
    invalidJson: '请先修正 JSON 格式后再比较。',
    diffResult: 'Diff 结果',
    legendEqual: '相同',
    legendChanged: '已变更',
    legendAdded: '新增',
    legendRemoved: '删除',
    summary: '差异摘要',
    summaryValue: '共 {count} 个差异节点',
    summaryNone: '当前没有差异。',
    placeholderLeft: '{\n  "name": "Alice"\n}',
    placeholderRight: '{\n  "name": "Bob"\n}',
    missing: '不存在',
    same: '相同',
    different: '不同',
    status: '状态',
  },
  en: {
    title: 'JSON Diff Studio',
    subtitle: 'Paste two JSON payloads and spot field, value, and structure changes with highlights.',
    leftTitle: 'JSON 1',
    rightTitle: 'JSON 2',
    compareOptions: 'Compare Options',
    caseInsensitive: 'Case-insensitive keys',
    language: 'Language',
    formatJson: 'Format JSON',
    loadSample: 'Load sample',
    clear: 'Clear',
    parseError: 'JSON parse error',
    invalidJson: 'Fix invalid JSON before comparing.',
    diffResult: 'Diff Result',
    legendEqual: 'Equal',
    legendChanged: 'Changed',
    legendAdded: 'Added',
    legendRemoved: 'Removed',
    summary: 'Summary',
    summaryValue: '{count} diff nodes found',
    summaryNone: 'No differences right now.',
    placeholderLeft: '{\n  "name": "Alice"\n}',
    placeholderRight: '{\n  "name": "Bob"\n}',
    missing: 'Missing',
    same: 'Same',
    different: 'Different',
    status: 'Status',
  },
  ja: {
    title: 'JSON Diff Studio',
    subtitle: '2つの JSON を貼り付けて、項目・値・構造の差分をハイライトで確認できます。',
    leftTitle: 'JSON 1',
    rightTitle: 'JSON 2',
    compareOptions: '比較設定',
    caseInsensitive: 'キーの大文字小文字を無視',
    language: '言語',
    formatJson: 'JSON を整形',
    loadSample: 'サンプル読込',
    clear: 'クリア',
    parseError: 'JSON 解析エラー',
    invalidJson: '比較する前に JSON を修正してください。',
    diffResult: 'Diff 結果',
    legendEqual: '同一',
    legendChanged: '変更あり',
    legendAdded: '追加',
    legendRemoved: '削除',
    summary: '差分サマリー',
    summaryValue: '差分ノード数: {count}',
    summaryNone: '差分はありません。',
    placeholderLeft: '{\n  "name": "Alice"\n}',
    placeholderRight: '{\n  "name": "Bob"\n}',
    missing: 'なし',
    same: '同じ',
    different: '異なる',
    status: '状態',
  },
  ko: {
    title: 'JSON Diff Studio',
    subtitle: '두 개의 JSON을 붙여 넣고 필드, 값, 구조 차이를 하이라이트로 빠르게 확인하세요.',
    leftTitle: 'JSON 1',
    rightTitle: 'JSON 2',
    compareOptions: '비교 설정',
    caseInsensitive: '키 대소문자 무시',
    language: '언어',
    formatJson: 'JSON 정리',
    loadSample: '샘플 불러오기',
    clear: '지우기',
    parseError: 'JSON 파싱 오류',
    invalidJson: '비교하기 전에 JSON 형식을 수정하세요.',
    diffResult: 'Diff 결과',
    legendEqual: '동일',
    legendChanged: '변경',
    legendAdded: '추가',
    legendRemoved: '삭제',
    summary: '요약',
    summaryValue: '차이 노드 {count}개',
    summaryNone: '현재 차이가 없습니다.',
    placeholderLeft: '{\n  "name": "Alice"\n}',
    placeholderRight: '{\n  "name": "Bob"\n}',
    missing: '없음',
    same: '같음',
    different: '다름',
    status: '상태',
  },
};

export function t(locale: Locale, key: MessageKey, params?: Record<string, string | number>) {
  const template = messages[locale][key];

  if (!params) {
    return template;
  }

  return Object.entries(params).reduce((result, [paramKey, value]) => {
    return result.replace(`{${paramKey}}`, String(value));
  }, template);
}

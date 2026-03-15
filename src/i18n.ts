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
  | 'status'
  | 'badgeStyle'
  | 'badgeSoft'
  | 'badgeSolid'
  | 'panelHeight'
  | 'smaller'
  | 'larger'
  | 'resetHeight'
  | 'fullscreen'
  | 'exitFullscreen'
  | 'prevDiff'
  | 'nextDiff'
  | 'settingsTitle'
  | 'appearanceTitle'
  | 'privacyNotice'
  | 'mitLicense'
  | 'builtWith'
  | 'disclaimer'
  | 'openSettings'
  | 'close'
  | 'footerNoticeTitle'
  | 'footerLicenseTitle'
  | 'footerTechTitle';

type Messages = Record<MessageKey, string>;

export const localeOptions: { value: Locale; label: string; shortLabel: string; icon: string }[] = [
  { value: 'zh-TW', label: '\u7e41\u9ad4\u4e2d\u6587', shortLabel: '\u7e41\u4e2d', icon: '\uD83C\uDDF9\uD83C\uDDFC' },
  { value: 'zh-CN', label: '\u7b80\u4f53\u4e2d\u6587', shortLabel: '\u7b80\u4e2d', icon: '\uD83C\uDDE8\uD83C\uDDF3' },
  { value: 'en', label: 'English', shortLabel: 'EN', icon: '\uD83C\uDDFA\uD83C\uDDF8' },
  { value: 'ja', label: '\u65e5\u672c\u8a9e', shortLabel: '\u65e5\u672c\u8a9e', icon: '\uD83C\uDDEF\uD83C\uDDF5' },
  { value: 'ko', label: '\uD55C\uAD6D\uC5B4', shortLabel: '\uD55C\uAD6D\uC5B4', icon: '\uD83C\uDDF0\uD83C\uDDF7' },
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
    diffResult: 'JSON 對照',
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
    badgeStyle: '高亮強度',
    badgeSoft: '柔和',
    badgeSolid: '強烈',
    panelHeight: '對照高度',
    smaller: '縮小',
    larger: '放大',
    resetHeight: '重設',
    fullscreen: '全螢幕',
    exitFullscreen: '離開全螢幕',
    prevDiff: '上一個差異',
    nextDiff: '下一個差異',
    settingsTitle: '比對設定',
    appearanceTitle: '顯示',
    privacyNotice: '本工具僅在用戶端執行，JSON 內容不會上傳到後端服務。',
    mitLicense: '本專案以 MIT License 釋出。',
    builtWith: '使用 React、TypeScript 與 GPT-5.4 輔助開發。',
    disclaimer: '請在分享或複製結果前，自行確認敏感資料與比對結果。',
    openSettings: '開啟設定',
    close: '關閉',
    footerNoticeTitle: '使用提醒',
    footerLicenseTitle: '授權',
    footerTechTitle: '技術',
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
    diffResult: 'JSON 对照',
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
    badgeStyle: '高亮强度',
    badgeSoft: '柔和',
    badgeSolid: '强烈',
    panelHeight: '对照高度',
    smaller: '缩小',
    larger: '放大',
    resetHeight: '重设',
    fullscreen: '全屏',
    exitFullscreen: '退出全屏',
    prevDiff: '上一个差异',
    nextDiff: '下一个差异',
    settingsTitle: '比较设置',
    appearanceTitle: '显示',
    privacyNotice: '该工具仅在客户端运行，JSON 内容不会上传到后端服务。',
    mitLicense: '本项目使用 MIT License 发布。',
    builtWith: '使用 React、TypeScript 与 GPT-5.4 辅助开发。',
    disclaimer: '在分享或复制结果之前，请先自行确认敏感数据与比较结果。',
    openSettings: '打开设置',
    close: '关闭',
    footerNoticeTitle: '使用提醒',
    footerLicenseTitle: '授权',
    footerTechTitle: '技术',
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
    diffResult: 'JSON Compare',
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
    badgeStyle: 'Highlight Strength',
    badgeSoft: 'Soft',
    badgeSolid: 'Solid',
    panelHeight: 'Compare Height',
    smaller: 'Smaller',
    larger: 'Larger',
    resetHeight: 'Reset',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    prevDiff: 'Previous Diff',
    nextDiff: 'Next Diff',
    settingsTitle: 'Compare Settings',
    appearanceTitle: 'Display',
    privacyNotice: 'This tool runs entirely in the browser. Your JSON payloads are not sent to a backend service.',
    mitLicense: 'This project is released under the MIT License.',
    builtWith: 'Built with React, TypeScript, and GPT-5.4-assisted development.',
    disclaimer: 'Please verify sensitive data and comparison results before sharing or exporting them.',
    openSettings: 'Open Settings',
    close: 'Close',
    footerNoticeTitle: 'Notices',
    footerLicenseTitle: 'License',
    footerTechTitle: 'Technology',
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
    diffResult: 'JSON 比較',
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
    badgeStyle: 'ハイライト強度',
    badgeSoft: 'ソフト',
    badgeSolid: '強調',
    panelHeight: '比較高さ',
    smaller: '低く',
    larger: '高く',
    resetHeight: 'リセット',
    fullscreen: '全画面',
    exitFullscreen: '全画面終了',
    prevDiff: '前の差分',
    nextDiff: '次の差分',
    settingsTitle: '比較設定',
    appearanceTitle: '表示',
    privacyNotice: 'このツールはブラウザ内でのみ動作し、JSON はバックエンドに送信されません。',
    mitLicense: 'このプロジェクトは MIT License で公開されています。',
    builtWith: 'React、TypeScript、そして GPT-5.4 の支援で開発しています。',
    disclaimer: '共有や出力の前に、機密情報と比較結果をご自身で確認してください。',
    openSettings: '設定を開く',
    close: '閉じる',
    footerNoticeTitle: 'お知らせ',
    footerLicenseTitle: 'ライセンス',
    footerTechTitle: '技術',
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
    diffResult: 'JSON 비교',
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
    badgeStyle: '하이라이트 강도',
    badgeSoft: '부드럽게',
    badgeSolid: '강하게',
    panelHeight: '비교 높이',
    smaller: '줄이기',
    larger: '늘리기',
    resetHeight: '재설정',
    fullscreen: '전체 화면',
    exitFullscreen: '전체 화면 종료',
    prevDiff: '이전 차이',
    nextDiff: '다음 차이',
    settingsTitle: '비교 설정',
    appearanceTitle: '표시',
    privacyNotice: '이 도구는 브라우저 안에서만 실행되며, JSON 내용은 백엔드 서비스로 전송되지 않습니다.',
    mitLicense: '이 프로젝트는 MIT License로 배포됩니다.',
    builtWith: 'React, TypeScript, GPT-5.4 지원을 바탕으로 개발되었습니다.',
    disclaimer: '공유하거나 결과를 활용하기 전에 민감 항목과 비교 결과를 직접 확인해 주세요.',
    openSettings: '설정 열기',
    close: '닫기',
    footerNoticeTitle: '안내',
    footerLicenseTitle: '라이선스',
    footerTechTitle: '기술',
  },
};

export function t(locale: Locale, key: MessageKey, params?: Record<string, string | number>) {
  const template = messages[locale][key];

  if (!params) {
    return template;
  }

  return Object.entries(params).reduce((result, [paramKey, value]) => {
    return result.replace('{' + paramKey + '}', String(value));
  }, template);
}

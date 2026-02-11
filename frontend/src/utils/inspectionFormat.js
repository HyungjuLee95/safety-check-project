// src/utils/inspectionFormat.js

/**
 * 서버/레거시 값(YES/NO 등)을 UI 표기(양호/보통/점검필요)로 정규화
 */
export function normalizeToUiValue(value) {
  if (value === null || value === undefined) return value;
  const v = String(value).trim();

  if (v.toUpperCase() === 'YES') return '양호';
  if (v.toUpperCase() === 'NO') return '점검필요';

  // 이미 양호/보통/점검필요라면 그대로
  return v;
}

/**
 * 상태 라벨
 * - 기존: SUBMITTED / CANCELLED
 * - 확장 대비: PENDING / REJECTED / APPROVED
 */
export function statusLabel(status) {
  const s = String(status || '').toUpperCase();

  if (s === 'CANCELLED') return '취소됨';
  if (s === 'PENDING') return '승인대기';
  if (s === 'REJECTED') return '반려';
  if (s === 'APPROVED') return '승인완료';
  if (s === 'SUBMITTED' || s === '') return '제출완료';

  return status; // 모르는 값은 원문 표시
}

/**
 * 점검 결과 뱃지 클래스(양호/보통/점검필요)
 */
export function badgeClassForValue(value) {
  const v = normalizeToUiValue(value);
  if (v === '양호') return 'bg-green-500 text-white';
  if (v === '점검필요') return 'bg-red-500 text-white';
  return 'bg-slate-400 text-white'; // 보통/기타
}

/**
 * 점검 결과 값을 enum으로 정규화(필요 시)
 */
export function normalizedResult(value) {
  const v = normalizeToUiValue(value);
  if (v === '양호') return 'OK';
  if (v === '점검필요') return 'IMPROVE';
  return 'NORMAL';
}

/**
 * Signature base64 -> <img src>로 쓸 수 있는 URL로 정규화
 * - data:image/... 로 이미 들어오면 그대로
 * - "base64,XXXX" 형태면 data:image/png;base64,XXXX 로 정규화
 * - 순수 base64면 data:image/png;base64, prefix를 붙임
 */
export function signatureSrc(signatureBase64) {
  if (!signatureBase64) return null;

  const raw = String(signatureBase64).trim();
  if (!raw) return null;

  // 이미 data URL이면 그대로
  if (raw.startsWith('data:image/')) return raw;

  // "base64,AAAA..." 형태 방어
  if (raw.startsWith('base64,')) {
    const only = raw.slice('base64,'.length);
    return `data:image/png;base64,${only}`;
  }

  // 혹시 실수로 dataURL prefix가 일부만 들어온 경우도 방어
  const cleaned = raw.replace(/^data:image\/\w+;base64,/, '');

  // 순수 base64
  return `data:image/png;base64,${cleaned}`;
}

/**
 * 날짜 정렬용: 내림차순(최신 먼저)
 * dateStr: YYYY-MM-DD
 */
export function sortByDateDesc(a, b) {
  const ad = (a?.date || '').replaceAll('-', '');
  const bd = (b?.date || '').replaceAll('-', '');
  return bd.localeCompare(ad);
}

import { linkify, stripHtml } from './richText.js';

const workSectionLabels = {
  poetry: 'Поэзия',
  prose: 'Проза',
  project: 'Творческий проект',
};

const contestStatusLabels = {
  draft: 'Черновик',
  accepting_entries: 'Приём работ',
  voting: 'Идёт голосование',
  finished: 'Завершён',
  cancelled: 'Отменён',
};

const contestScopeLabels = {
  site: 'Конкурс сайта',
  author: 'Авторский конкурс',
  forum: 'Форумный конкурс',
};

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDuration(value) {
  if (value == null || value === '') return '—';
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const tailSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(tailSeconds).padStart(2, '0')}`;
}

export function formatWorkSection(code) {
  return workSectionLabels[code] ?? code ?? '—';
}

export function formatContestStatus(status) {
  return contestStatusLabels[status] ?? status ?? '—';
}

export function formatContestScope(scope) {
  return contestScopeLabels[scope] ?? scope ?? '—';
}

export function excerptText(value, maxLength = 180) {
  const normalized = stripHtml(value);
  if (!normalized) return 'Текст пока не добавлен.';
  const linked = linkify(normalized);
  if (linked.length <= maxLength) return linked;
  return `${linked.slice(0, maxLength).trimEnd()}…`;
}

export function formatBirthday(value) {
  if (!value) return '—';
  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}.${match[2]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function ratingLabel(value, count) {
  const normalizedValue = Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '0.0';
  const normalizedCount = Number.isFinite(Number(count)) ? Number(count) : 0;
  return `${normalizedValue} / 5 · ${normalizedCount} оценок`;
}

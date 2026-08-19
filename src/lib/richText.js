export const RICH_TEXT_TOOLBAR_GROUPS = [
  { id: 'code', commands: ['code'] },
  { id: 'marks', commands: ['bold', 'italic', 'underline', 'strike'] },
  { id: 'lists', commands: ['bulletList', 'orderedList'] },
  { id: 'insert', commands: ['image', 'link'] },
  { id: 'align', commands: ['alignLeft'] },
  { id: 'rule', commands: ['horizontalRule'] },
  { id: 'typography', commands: ['textColor', 'highlight', 'fontFamily', 'fontSize'] },
];

export function normalizeRichTextHtml(value) {
  const html = String(value ?? '').trim();
  return /^(<p>(<br\s*\/?>)?<\/p>|<p>\s*<\/p>)$/i.test(html) ? '' : html;
}

export function normalizeHtmlSource(value) {
  return String(value ?? '').trim() || '<p></p>';
}

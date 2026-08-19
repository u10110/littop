import { mergeAttributes, Node, ResizableNodeView } from '@tiptap/core';
import { isAllowedVideoEmbedUrl } from './videoEmbeds.js';

const RESIZE_OPTIONS = {
  directions: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
  min: { width: 240, height: 135 },
  preserveAspectRatio: true,
};

export const VideoEmbed = Node.create({
  name: 'videoEmbed', group: 'block', atom: true, selectable: true, draggable: true,
  addAttributes() {
    return {
      src: { default: null, parseHTML: (element) => element.getAttribute('src') },
      title: { default: 'Видео' },
      width: { default: null, parseHTML: (element) => Number(element.getAttribute('width')) || null },
      height: { default: null, parseHTML: (element) => Number(element.getAttribute('height')) || null },
    };
  },
  parseHTML() { return [{ tag: 'iframe[src]', getAttrs: (element) => isAllowedVideoEmbedUrl(element.getAttribute('src')) ? null : false }]; },
  renderHTML({ HTMLAttributes }) {
    if (!isAllowedVideoEmbedUrl(HTMLAttributes.src)) return ['p', {}, 'Недопустимое видео'];
    return ['div', { class: 'video-embed' }, ['iframe', mergeAttributes({ src: HTMLAttributes.src, title: HTMLAttributes.title || 'Видео', loading: 'lazy', allowfullscreen: 'true', allow: 'autoplay; encrypted-media; picture-in-picture', referrerpolicy: 'strict-origin-when-cross-origin' }, HTMLAttributes.width ? { width: HTMLAttributes.width } : {}, HTMLAttributes.height ? { height: HTMLAttributes.height } : {})]];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const iframe = document.createElement('iframe');
      iframe.src = node.attrs.src; iframe.title = node.attrs.title || 'Видео'; iframe.loading = 'lazy'; iframe.allowFullscreen = true;
      iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
      const view = new ResizableNodeView({ element: iframe, editor, node, getPos,
        onResize: (width, height) => { iframe.style.width = `${width}px`; iframe.style.height = `${height}px`; },
        onCommit: (width, height) => { const pos = getPos(); if (pos !== undefined) editor.chain().setNodeSelection(pos).updateAttributes(this.name, { width, height }).run(); },
        options: RESIZE_OPTIONS,
      });
      return view;
    };
  },
  addCommands() { return { setVideoEmbed: (attributes) => ({ commands }) => isAllowedVideoEmbedUrl(attributes?.src) && commands.insertContent({ type: this.name, attrs: attributes }) }; },
});

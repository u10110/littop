import { mergeAttributes, Node } from '@tiptap/core';
import { isAllowedVideoEmbedUrl } from './videoEmbeds.js';

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
      },
      title: { default: 'Видео' },
    };
  },
  parseHTML() {
    return [{ tag: 'iframe[src]', getAttrs: (element) => isAllowedVideoEmbedUrl(element.getAttribute('src')) ? null : false }];
  },
  renderHTML({ HTMLAttributes }) {
    if (!isAllowedVideoEmbedUrl(HTMLAttributes.src)) return ['p', {}, 'Недопустимое видео'];
    return ['div', { class: 'video-embed' }, ['iframe', mergeAttributes({
      src: HTMLAttributes.src,
      title: HTMLAttributes.title || 'Видео',
      loading: 'lazy',
      allowfullscreen: 'true',
      allow: 'autoplay; encrypted-media; picture-in-picture',
      referrerpolicy: 'strict-origin-when-cross-origin',
    })]];
  },
  addCommands() {
    return {
      setVideoEmbed: (attributes) => ({ commands }) => {
        if (!isAllowedVideoEmbedUrl(attributes?.src)) return false;
        return commands.insertContent({ type: this.name, attrs: attributes });
      },
    };
  },
});

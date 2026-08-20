import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import { VideoEmbed } from './videoEmbedExtension.js';

const LinkedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      linkHref: {
        default: null,
        parseHTML: (element) => element.parentElement?.tagName === 'A' ? element.parentElement.getAttribute('href') : null,
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { linkHref, ...imageAttributes } = HTMLAttributes;
    const image = ['img', imageAttributes];
    return linkHref ? ['a', { href: linkHref, target: '_blank', rel: 'noopener noreferrer' }, image] : image;
  },
});

export const richTextExtensions = [
  StarterKit.configure({ heading: false, codeBlock: false, link: false, underline: false }),
  Underline,
  Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
  LinkedImage.configure({
    inline: false,
    allowBase64: false,
    resize: {
      enabled: true,
      directions: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
      minWidth: 48,
      minHeight: 48,
      alwaysPreserveAspectRatio: true,
    },
  }),
  TextAlign.configure({ types: ['paragraph'] }),
  TextStyle,
  FontSize.configure({ types: ['textStyle'] }),
  Color,
  Highlight.configure({ multicolor: true }),
  FontFamily.configure({ types: ['textStyle'] }),
  VideoEmbed,
];
export const RICH_TEXT_TOOLBAR_GROUPS = [
  { id: 'code', commands: ['code'] },
  { id: 'marks', commands: ['bold', 'italic', 'underline', 'strike'] },
  { id: 'lists', commands: ['bulletList', 'orderedList'] },
  { id: 'insert', commands: ['image', 'video', 'link'] },
  { id: 'align', commands: ['alignLeft'] },
  { id: 'rule', commands: ['horizontalRule'] },
  { id: 'typography', commands: ['textColor', 'highlight', 'fontFamily', 'fontSize'] },
];

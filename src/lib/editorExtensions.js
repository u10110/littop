import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';

export const richTextExtensions = [
  StarterKit.configure({ heading: false, codeBlock: false, link: false, underline: false }),
  Underline,
  Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
  Image.configure({
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
];

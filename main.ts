import { Plugin } from "obsidian";
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

// Shared tone map logic
const toneMap: Record<string, string> = {
  'ā': 'tone1', 'ē': 'tone1', 'ī': 'tone1', 'ō': 'tone1', 'ū': 'tone1', 'ǖ': 'tone1',
  'á': 'tone2', 'é': 'tone2', 'í': 'tone2', 'ó': 'tone2', 'ú': 'tone2', 'ǘ': 'tone2',
  'ǎ': 'tone3', 'ě': 'tone3', 'ǐ': 'tone3', 'ǒ': 'tone3', 'ǔ': 'tone3', 'ǚ': 'tone3',
  'à': 'tone4', 'è': 'tone4', 'ì': 'tone4', 'ò': 'tone4', 'ù': 'tone4', 'ǜ': 'tone4'
};

const toneChars = Object.keys(toneMap).join('');
const regex = new RegExp(`[\\w${toneChars}]*[\\w${toneChars}]+`, 'g');

function getToneClass(word: string): string | null {
  for (const c of word) {
    if (toneMap[c]) return toneMap[c];
  }
  return null;
}

export default class PinyinHighlighterPlugin extends Plugin {
  async onload() {
    // 🖊️ Live Preview (Editor Mode)
    const pinyinExtension = ViewPlugin.fromClass(class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        for (let { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to);
          let match: RegExpExecArray | null;
          while ((match = regex.exec(text)) !== null) {
            const [word] = match;
            const start = from + match.index;
            const end = start + word.length;
            const toneClass = getToneClass(word);
            if (toneClass) {
              builder.add(start, end, Decoration.mark({ class: `pinyin-editor-${toneClass}` }));
            }
          }
        }
        return builder.finish();
      }
    }, {
      decorations: v => v.decorations
    });

    this.registerEditorExtension(pinyinExtension);

    // 📖 Read Mode (Preview)
    this.registerMarkdownPostProcessor((el) => {
      function walk(node: Node) {
        if (node.nodeType === 3) {
          const text = node.nodeValue!;
          const replaced = text.replace(regex, (word) => {
            const toneClass = getToneClass(word);
            return toneClass
              ? `<span class="pinyin-preview-${toneClass}">${word}</span>`
              : word;
          });

          if (replaced !== text) {
            const span = document.createElement('span');
            span.innerHTML = replaced;
            if (node.parentNode) {
                node.parentNode.replaceChild(span, node);
            }
          }
        } else if (node.nodeType === 1 && !(node instanceof HTMLScriptElement || node instanceof HTMLStyleElement)) {
          Array.from(node.childNodes).forEach(walk);
        }
      }

      walk(el);
    });
  }
}

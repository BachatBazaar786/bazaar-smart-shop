import { useEffect, useState } from "react";
import Editor, {
  BtnBold, BtnItalic, BtnUnderline, BtnStrikeThrough,
  BtnBulletList, BtnNumberedList, BtnLink, BtnClearFormatting,
  BtnUndo, BtnRedo, HtmlButton, Separator, Toolbar,
} from "react-simple-wysiwyg";

export function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => {
    setLocal((prev) => ((value ?? "") === prev ? prev : (value ?? "")));
  }, [value]);

  return (
    <div
      className="rte-wrap rounded-md border border-border bg-background overflow-hidden"
      style={{ ["--rte-min" as string]: `${minHeight}px` }}
    >
      <Editor
        value={local}
        onChange={(e) => { setLocal(e.target.value); onChange(e.target.value); }}
        placeholder={placeholder}
        containerProps={{ style: { border: "none", background: "transparent" } }}
      >
        <Toolbar>
          <BtnUndo /><BtnRedo />
          <Separator />
          <BtnBold /><BtnItalic /><BtnUnderline /><BtnStrikeThrough />
          <Separator />
          <BtnBulletList /><BtnNumberedList />
          <Separator />
          <BtnLink />
          <BtnClearFormatting />
          <HtmlButton />
        </Toolbar>
      </Editor>
      <style>{`
        .rte-wrap .rsw-editor { border: none !important; background: transparent !important; }
        .rte-wrap .rsw-ce { min-height: var(--rte-min); padding: 0.75rem; font-size: 0.875rem; outline: none; }
        .rte-wrap .rsw-ce p { margin: 0 0 0.5rem; }
        .rte-wrap .rsw-ce ul { list-style: disc; padding-left: 1.25rem; margin: 0 0 0.5rem; }
        .rte-wrap .rsw-ce ol { list-style: decimal; padding-left: 1.25rem; margin: 0 0 0.5rem; }
        .rte-wrap .rsw-toolbar { border-bottom: 1px solid var(--border); background: var(--muted); padding: 0.25rem; }
        .rte-wrap .rsw-btn { color: var(--foreground); background: transparent; border-radius: 0.25rem; }
        .rte-wrap .rsw-btn:hover { background: var(--accent); }
        .rte-wrap .rsw-btn[data-active="true"] { background: var(--accent); }
        .rte-wrap .rsw-separator { background: var(--border); }
      `}</style>
    </div>
  );
}

/** Extract benefit lines from rich HTML: prefer <li> items, else split paragraphs/<br>. */
export function htmlToBenefits(html: string): string[] {
  if (!html) return [];
  const tmp = typeof document !== "undefined" ? document.createElement("div") : null;
  if (!tmp) return [];
  tmp.innerHTML = html;
  const lis = Array.from(tmp.querySelectorAll("li")).map((n) => (n.textContent ?? "").trim()).filter(Boolean);
  if (lis.length) return lis;
  const text = (tmp.textContent ?? "")
    .split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
  return text;
}

export function benefitsToHtml(items: string[]): string {
  if (!items || items.length === 0) return "";
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

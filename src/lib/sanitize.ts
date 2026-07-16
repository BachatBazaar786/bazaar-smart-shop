import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "a", "b", "strong", "i", "em", "u", "s", "strike", "p", "br", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "span", "div",
  "hr", "img",
];
const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "title"];

// Server-safe: DOMPurify requires a DOM. On SSR we fall back to a naive strip
// of script/style/event handlers and dangerous URL schemes. The browser render
// will re-sanitize with full DOMPurify.
function serverStrip(html: string): string {
  return (html ?? "")
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof document === "undefined") {
    return serverStrip(html);
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

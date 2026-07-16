import { useSiteSettings } from "@/context/SiteContext";

const DEFAULT_NUMBER = "+923121007009";
const DEFAULT_MESSAGE = "Hi! I have a question about BachatAtBazaar.pk";

function sanitize(num: string) {
  return num.replace(/[^0-9]/g, "");
}

export function WhatsAppButton() {
  const settings = useSiteSettings();
  const raw = settings.whatsapp_number?.trim() || DEFAULT_NUMBER;
  const number = sanitize(raw);
  if (!number) return null;
  const msg = encodeURIComponent(settings.whatsapp_message?.trim() || DEFAULT_MESSAGE);
  const href = `https://wa.me/${number}?text=${msg}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 hover:scale-105 active:scale-95 transition-transform"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M20.52 3.48A11.86 11.86 0 0 0 12.02 0C5.4 0 .04 5.36.04 11.98c0 2.11.55 4.17 1.6 5.98L0 24l6.2-1.62a11.98 11.98 0 0 0 5.82 1.48h.01c6.62 0 11.98-5.36 11.98-11.98 0-3.2-1.25-6.21-3.49-8.4ZM12.03 21.3h-.01a9.3 9.3 0 0 1-4.74-1.3l-.34-.2-3.68.96.98-3.59-.22-.37a9.28 9.28 0 0 1-1.42-4.83c0-5.14 4.18-9.32 9.33-9.32 2.49 0 4.83.97 6.59 2.73a9.26 9.26 0 0 1 2.73 6.59c0 5.14-4.18 9.32-9.32 9.32Zm5.37-6.98c-.29-.14-1.74-.86-2.01-.96-.27-.1-.47-.14-.66.15-.2.29-.76.96-.94 1.16-.17.19-.35.22-.64.07-.29-.15-1.23-.45-2.35-1.44-.87-.77-1.46-1.72-1.63-2.01-.17-.29-.02-.44.13-.59.13-.13.29-.35.44-.52.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.66-1.58-.9-2.16-.24-.57-.48-.5-.66-.5l-.56-.01c-.19 0-.51.07-.78.36-.27.29-1.02 1-1.02 2.43 0 1.43 1.04 2.81 1.19 3 .15.19 2.06 3.14 5 4.41.7.3 1.24.48 1.66.62.7.22 1.33.19 1.83.11.56-.08 1.74-.71 1.98-1.4.24-.68.24-1.27.17-1.4-.07-.13-.27-.2-.56-.34Z" />
      </svg>
    </a>
  );
}

export type FaqCategory = { name: string; items: { q: string; a: string }[] };

export const faqCategories: FaqCategory[] = [
  {
    name: "Ordering",
    items: [
      { q: "How do I place an order?", a: "Browse products, add items to your cart, and proceed to checkout to enter your delivery details." },
      { q: "Can I change or cancel my order?", a: "Please contact our support team as soon as possible after placing your order to request changes or cancellation." },
    ],
  },
  {
    name: "Payments",
    items: [
      { q: "What payment methods are supported?", a: "We are preparing Cash on Delivery, Bank Transfer, EasyPaisa and JazzCash. Availability will be confirmed at checkout." },
      { q: "Is online payment secure?", a: "Payment integrations will use trusted providers with encrypted connections." },
    ],
  },
  {
    name: "Shipping",
    items: [
      { q: "Do you deliver across Pakistan?", a: "Yes, we deliver nationwide. Delivery timelines vary by region." },
      { q: "How long does delivery take?", a: "Typical delivery windows will be shown at checkout once shipping is finalized." },
    ],
  },
  {
    name: "Returns",
    items: [
      { q: "What is your return policy?", a: "Returns are accepted for damaged or incorrect items. See our Returns & Refunds page for details." },
      { q: "How do I request a return?", a: "Contact our customer support team with your order number and photos of the issue." },
    ],
  },
  {
    name: "Products",
    items: [
      { q: "Where do your products come from?", a: "Our launch collection is sourced from Gilgit-Baltistan, with more categories being added." },
      { q: "Are your products authentic?", a: "Yes — we carefully select trusted suppliers and inspect each batch." },
    ],
  },
  {
    name: "Account",
    items: [
      { q: "Do I need an account to shop?", a: "Account features will be available soon. You will be able to place orders as a guest." },
    ],
  },
];

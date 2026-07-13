export type CategoryItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number | null;
  stock: number;
  rating: number;
  reviewCount: number;
  image: string;
  category: { slug: string; name: string } | null;
  bestSeller: boolean;
  newArrival: boolean;
  onDeal: boolean;
  featured: boolean;
};

export type ProductDetail = ProductListItem & {
  sku: string;
  shortDescription: string;
  description: string;
  images: string[];
  benefits: string[];
  usage: string | null;
  tags: string[];
  specifications: { label: string; value: string }[];
};

export type CartSnapshot = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  salePrice: number | null;
  stock: number;
};

export type ShippingAddress = {
  full_name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
};

export type OrderSummary = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string;
  email: string;
  shipping_address: ShippingAddress;
  items: {
    id: string;
    name_snapshot: string;
    sku_snapshot: string;
    image_url: string | null;
    unit_price: number;
    quantity: number;
    subtotal: number;
  }[];
};

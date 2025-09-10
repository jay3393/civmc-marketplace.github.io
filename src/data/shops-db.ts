export type Currency = "diamond" | "emerald" | "essence";

export type DbShop = {
  id: string;
  owner_id: string;
  shop_name: string;
  world: string;
  x: number;
  y: number | null;
  z: number;
  settlement_id: number | null;
  description: string | null;
  is_active: boolean;
  last_updated: string;
  created_at: string;
  updated_at: string;
};

export type DbShopItem = {
  id: string;
  shop_id: string;
  item_id: string | null;
  item_name: string | null;
  price_per_unit: number;
  currency_id: string | null;
  currency_name: string | null;
  unit: string;
  stock_qty: number | null;
  is_listed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ShopExchange = {
  id: string;
  inputName: string;
  inputQty: number;
  outputName: string;
  outputQty: number;
  stock: number | null;
  is_listed?: boolean;
  notes?: string | null;
  updatedAt?: string;
};

export type DbShopReview = {
  id: string;
  shop_id: string;
  author_id: string;
  rating: number;
  content: string;
  created_at: string;
}; 
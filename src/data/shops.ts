export type Shop = {
  id: string;
  name: string;
  ownerUsername: string;
  nationName: string;
  coords: { x: number; y: number; z: number };
  imageUrl: string;
  updatedAt: string; // ISO string
  itemCount: number;
  reviewsCount: number;
  description: string; // short lore/what they sell; show snippet on marketplace and full on shop page
};

export type ShopItem = {
  id: string;
  shopId: string;
  name: string;
  imageUrl: string;
  price: number; // in diamonds for now
  currency: "diamond" | "emerald" | "essence";
  updatedAt: string; // ISO string
  stock: number; // how many available
  description?: string; // e.g., enchantments, potion effects, renamed notes, compacted info
};

export const shops: Shop[] = [
  {
    id: "shop-ir",
    name: "I_rs General Store",
    ownerUsername: "I_rs",
    nationName: "Mount Augusta",
    coords: { x: 123, y: 65, z: -420 },
    imageUrl: "https://images.unsplash.com/photo-1561715276-a2d087060f1b?q=80&w=1200&auto=format&fit=crop",
    updatedAt: new Date().toISOString(),
    itemCount: 8,
    reviewsCount: 5,
    description: "Enchanted tools, villager books, and general adventuring supplies. Established during the First Week; fair prices and honest trade.",
  },
  {
    id: "shop-physics",
    name: "Physics Emporium",
    ownerUsername: "Physics",
    nationName: "Icenia",
    coords: { x: -2033, y: 68, z: 910 },
    imageUrl: "https://images.unsplash.com/photo-1528458965990-428de4b1cbf3?q=80&w=1200&auto=format&fit=crop",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    itemCount: 12,
    reviewsCount: 9,
    description: "Bulk resources at wholesale rates — emeralds, food, and basic gear for growing settlements.",
  },
  {
    id: "shop-hakr",
    name: "Hakr_ Tools & More",
    ownerUsername: "Hakr_",
    nationName: "Yoahtl",
    coords: { x: 0, y: 64, z: 0 },
    imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop",
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    itemCount: 6,
    reviewsCount: 2,
    description: "High-quality tools and work gear. Custom orders accepted; ask about bulk discounts.",
  },
  {
    id: "shop-toon",
    name: "toontasker Trading Co.",
    ownerUsername: "toontasker",
    nationName: "Gabylon",
    coords: { x: 888, y: 70, z: -321 },
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    itemCount: 3,
    reviewsCount: 1,
    description: "Specialty goods, curiosities, and rare finds. If it’s odd, we probably stock it.",
  },
  {
    id: "shop-zekk",
    name: "The_Zekk Outfitters",
    ownerUsername: "The_Zekk",
    nationName: "Pacem",
    coords: { x: -740, y: 69, z: 1337 },
    imageUrl: "https://images.unsplash.com/photo-1521331250797-5c84f4639d35?q=80&w=1200&auto=format&fit=crop",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    itemCount: 10,
    reviewsCount: 7,
    description: "Armor and outfitting for expeditions. Trusted by explorers and mercenaries alike.",
  },
  {
    id: "shop-femboy",
    name: "femboysilly Bazaar",
    ownerUsername: "femboysilly",
    nationName: "Gabon",
    coords: { x: 512, y: 72, z: 512 },
    imageUrl: "https://images.unsplash.com/photo-1453834228092-01fd53f5d250?q=80&w=1200&auto=format&fit=crop",
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    itemCount: 4,
    reviewsCount: 3,
    description: "Building blocks, wood, and construction materials. Lore-rich stall with rotating stock.",
  },
];

export const shopItems: ShopItem[] = [
  // I_rs
  {
    id: "it-1",
    shopId: "shop-ir",
    name: "Enchanted Netherite Pickaxe",
    imageUrl: "https://minecraft.wiki/images/Enchanted_Netherite_Pickaxe.gif",
    price: 64,
    currency: "diamond",
    updatedAt: new Date().toISOString(),
    stock: 2,
    description: "Efficiency V, Unbreaking III, Mending (renamed \"Workhorse\").",
  },
  {
    id: "it-2",
    shopId: "shop-ir",
    name: "Mending Book",
    imageUrl: "https://minecraft.wiki/images/Book_JE2_BE2.png",
    price: 8,
    currency: "diamond",
    updatedAt: new Date().toISOString(),
    stock: 5,
    description: "Enchantment Book: Mending I.",
  },
  // Physics
  {
    id: "it-3",
    shopId: "shop-physics",
    name: "Emeralds (stack)",
    imageUrl: "https://minecraft.wiki/images/Emerald_JE3_BE3.png",
    price: 16,
    currency: "diamond",
    updatedAt: new Date().toISOString(),
    stock: 12,
    description: "64x Emeralds (compacted).",
  },
  {
    id: "it-4",
    shopId: "shop-physics",
    name: "Golden Carrots (stack)",
    imageUrl: "https://minecraft.wiki/images/Carrot_JE3_BE2.png",
    price: 6,
    currency: "diamond",
    updatedAt: new Date().toISOString(),
    stock: 9,
    description: "64x Golden Carrots — farmer fresh.",
  },
  // Hakr_
  {
    id: "it-5",
    shopId: "shop-hakr",
    name: "Diamond Pickaxe",
    imageUrl: "https://minecraft.wiki/images/Diamond_Pickaxe_JE3_BE3.png",
    price: 24,
    currency: "diamond",
    updatedAt: new Date().toISOString(),
    stock: 3,
    description: "Fresh tool, no enchants.",
  },
  // Toon
  {
    id: "it-6",
    shopId: "shop-toon",
    name: "Ender Eye",
    imageUrl: "https://minecraft.wiki/images/Eye_of_Ender_JE2_BE2.png",
    price: 2,
    currency: "diamond",
    updatedAt: new Date().toISOString(),
    stock: 10,
    description: "For locating strongholds; pairs well with pearls.",
  },
  // Zekk
  {
    id: "it-7",
    shopId: "shop-zekk",
    name: "Diamond Chestplate",
    imageUrl: "https://minecraft.wiki/images/Diamond_Chestplate_JE3_BE2.png",
    price: 48,
    currency: "diamond",
    updatedAt: new Date().toISOString(),
    stock: 1,
    description: "Protection IV, Unbreaking III, Mending.",
  },
  // femboysilly
  {
    id: "it-8",
    shopId: "shop-femboy",
    name: "Oak Logs (16x)",
    imageUrl: "https://minecraft.wiki/images/Oak_Log_(UD)_JE8_BE3.png",
    price: 4,
    currency: "diamond",
    updatedAt: new Date().toISOString(),
    stock: 16,
    description: "Compacted 16x oak logs for easy hauling.",
  },
]; 
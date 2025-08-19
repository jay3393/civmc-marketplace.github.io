export const dynamic = "force-dynamic";

const sellers = [
  {
    username: "I_rs",
    avatar: "https://minotar.net/avatar/I_rs.png",
    itemName: "Enchanted Netherite Pickaxe",
    itemImage: "https://minecraft.wiki/images/Enchanted_Netherite_Pickaxe.gif",
    price: 64,
    coords: { x: 123, y: 65, z: -420 },
    badge: "Tools",
  },
  {
    username: "Physics",
    avatar: "https://minotar.net/avatar/Physics.png",
    itemName: "Emeralds (stack)",
    itemImage: "https://minecraft.wiki/images/Emerald_JE3_BE3.png",
    price: 16,
    coords: { x: -2033, y: 68, z: 910 },
    badge: "Resources",
  },
  {
    username: "Hakr_",
    avatar: "https://minotar.net/avatar/Hakr_.png",
    itemName: "Diamond Pickaxe",
    itemImage: "https://minecraft.wiki/images/Carrot_JE3_BE2.png",
    price: 24,
    coords: { x: 0, y: 64, z: 0 },
    badge: "Tools",
  },
  {
    username: "toontasker",
    avatar: "https://minotar.net/avatar/toontasker.png",
    itemName: "Emerald (single)",
    itemImage: "https://minecraft.wiki/images/Eye_of_Ender_JE2_BE2.png",
    price: 1,
    coords: { x: 888, y: 70, z: -321 },
    badge: "Currency",
  },
  {
    username: "The_Zekk",
    avatar: "https://minotar.net/avatar/The_Zekk.png",
    itemName: "Ench. Netherite Pickaxe",
    itemImage: "https://minecraft.wiki/images/Diamond_Chestplate_JE3_BE2.png",
    price: 48,
    coords: { x: -740, y: 69, z: 1337 },
    badge: "Tools",
  },
  {
    username: "femboysilly",
    avatar: "https://minotar.net/avatar/femboysilly.png",
    itemName: "Emeralds (16x)",
    itemImage: "https://minecraft.wiki/images/Oak_Log_(UD)_JE8_BE3.png",
    price: 4,
    coords: { x: 512, y: 72, z: 512 },
    badge: "Currency",
  },
];

const diamondIcon = "https://minecraft.wiki/images/Emerald_JE3_BE3.png"; // placeholder icon if diamond blocked; replace with diamond icon link when finalizing screenshot

export default function MarketplacePage() {
  return (
    <div className="relative space-y-6">
      {/* Ambient page glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl"/>
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl"/>
      </div>
      {/* Hero (shorter) */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-blue-500/30 blur-3xl"/>
        <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-emerald-500/30 blur-3xl"/>
        <div className="relative grid gap-2 p-5 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Marketplace</h1>
          {/* <p className="text-white/70 max-w-2xl text-sm sm:text-base">Discover player shops across Civhub. This is a fully mocked design for preview/screenshot purposes only.</p> */}
        </div>
      </div>

      {/* Cards grid (denser) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sellers.map((s) => (
          <div key={`${s.username}-${s.itemName}-${s.coords.x}-${s.coords.z}`} className="group rounded-xl border bg-background overflow-hidden transition hover:shadow-lg">
            {/* Top banner with item image (shorter aspect) */}
            <div className="relative aspect-[16/8] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.itemImage}
                alt={s.itemName}
                className="absolute inset-0 h-full w-full object-contain p-5 transition group-hover:scale-105"
              />
              {/* Avatar + username pill overlay */}
              <div className="absolute top-2 left-2 inline-flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur px-2 py-1 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.avatar} alt={s.username} className="h-5 w-5 rounded border" />
                <span className="text-xs font-medium text-slate-900 truncate max-w-[140px]">{s.username}</span>
              </div>
            </div>
            <div className="p-2.5 space-y-2">
              <div className="space-y-0.5">
                <div className="text-sm sm:text-base font-semibold leading-tight truncate">{s.itemName}</div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className="inline-flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={diamondIcon} alt="diamond" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="font-medium">{s.price}</span>
                    <span className="text-muted-foreground">diamonds</span>
                  </div>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">XYZ: {s.coords.x}, {s.coords.y}, {s.coords.z}</span>
                </div>
              </div>

              <div className="pt-0.5">
                <button className="h-8 sm:h-9 rounded-md border px-2.5 sm:px-3 text-xs sm:text-sm">View shop</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="text-center text-[11px] sm:text-xs text-muted-foreground">All content above is mocked for a screenshot preview.</div>
    </div>
  );
} 
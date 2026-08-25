// Intrinsic sizes for the menu photography, used to reserve each card's box before the image
// loads. Moved here verbatim from Menu.jsx.
//
// These feed the static fallback only. When Supabase is reachable the dimensions come from
// menu_products.image_width/height, which scripts/extract-content.mjs measures from the files
// themselves — so the database is the accurate copy and this is the last-resort one.

export const categoryImageDimensions = {
  coffee: [1254, 1254],
  'specialty-coffee': [1254, 1254],
  'iced-drinks': [1198, 1313],
  'hot-drinks': [1254, 1254],
  // Tea no longer renders a section of its own, but the row survives to carry the homepage
  // tile, and extract-content.mjs reads a default size for every category in menuData.js.
  tea: [1402, 1122],
  'fresh-juices': [1122, 1402],
  smoothies: [1537, 1023],
  milkshakes: [1122, 1402],
  desserts: [1536, 1024],
  shisha: [1254, 1254],
}

export const productImageDimensionOverrides = {
  'fresh-juices/avocado-juice': [1086, 1448],
  'fresh-juices/watermelon-juice': [1086, 1448],
  'fresh-juices/guava-juice': [1145, 1373],
  'fresh-juices/layered-juice': [1149, 1369],
  'iced-drinks/iced-matcha-latte': [1086, 1448],
  'iced-drinks/iced-nutella': [1197, 1314],
  'iced-drinks/iced-lotus-latte': [1122, 1402],
  'iced-drinks/iced-white-mocha': [1086, 1448],
  'iced-drinks/iced-blue-latte': [1086, 1448],
  'milkshakes/vanilla-milkshake': [1179, 1334],
  'milkshakes/pistachio-milkshake': [1123, 1401],
  // The tea photographs are landscape where the rest of hot drinks is square, so each one
  // carries the size it had before the two categories were folded together.
  'hot-drinks/lipton-tea': [1402, 1122],
  'hot-drinks/mint-tea': [1402, 1122],
  'hot-drinks/green-tea': [1402, 1122],
  'hot-drinks/karak-tea': [1402, 1122],
  'hot-drinks/lemon-ginger-tea': [1402, 1122],
  'hot-drinks/red-tea-pot': [1402, 1122],
  'hot-drinks/hot-chocolate': [1402, 1122],
  'hot-drinks/hot-tiramisu': [1448, 1086],
  'shisha/shisha': [1122, 1402],
  'shisha/salloum-shisha': [1535, 1024],
}

// The menu page shows categories in this order; anything missing is not shown at all.
export const categoryOrder = [
  'coffee',
  'specialty-coffee',
  'iced-drinks',
  'hot-drinks',
  // Published, so the homepage tile stays readable; it holds no products, so it renders
  // no section. See CATEGORY_ALIASES in src/lib/content.js.
  'tea',
  'fresh-juices',
  'smoothies',
  'milkshakes',
  'desserts',
  'shisha',
]

// Category slug -> the key its subtitle lives under in copy.menu.categorySubtitles.
export const categorySubtitleKey = {
  coffee: 'coffee',
  'specialty-coffee': 'specialtyCoffee',
  'iced-drinks': 'icedCoffee',
  'hot-drinks': 'hotDrinks',
  tea: 'tea',
  'fresh-juices': 'freshJuices',
  smoothies: 'smoothies',
  milkshakes: 'milkshakes',
  desserts: 'desserts',
  shisha: 'shisha',
}

// Menu.jsx hid this product even though it has a photo.
export const hiddenProductSlugs = ['red-tea-pot']

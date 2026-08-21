-- Niola Lounge — content seed
--
-- GENERATED FILE. Do not edit by hand.
--   node scripts/extract-content.mjs   (reads src/data + src/pages into supabase/content-source.json)
--   node scripts/generate-seed.mjs     (writes this file)
--
-- Source: src/data/menuData.js, src/data/translations.js, src/data/imageDimensions.js, src/data/galleryData.js
-- Contents: 10 categories, 115 products
--           (66 published), 6 gallery items.
--
-- Safe to re-run: every statement upserts on slug.

begin;

insert into public.menu_categories (slug, name_ar, name_en, subtitle_ar, subtitle_en, sort_order, is_published, default_image_width, default_image_height, homepage_image_url, homepage_name_ar, homepage_name_en, homepage_sort_order)
select v.slug::text, v.name_ar::text, v.name_en::text, v.subtitle_ar::text, v.subtitle_en::text, v.sort_order::integer, v.is_published::boolean, v.default_image_width::integer, v.default_image_height::integer, v.homepage_image_url::text, v.homepage_name_ar::text, v.homepage_name_en::text, v.homepage_sort_order::integer
from (values
    ('desserts', 'الحلويات', 'Desserts', 'نهاية حلوة للحظة جميلة', 'A sweet finish to a beautiful moment', 8, true, 1536, 1024, '/images/dessert/moltin Cake.png', 'الحلويات', 'Desserts', 6),
    ('fresh-juices', 'العصائر الفريش', 'Fresh Juices', 'انتعاش بطعم الفاكهة', 'Freshness filled with fruit', 5, true, 1122, 1402, '/images/fresh jucies/Fresh Orange Juice.png', 'العصائر الفريش', 'Fresh Juices', 3),
    ('tea', 'الشاي', 'Tea', 'كوب يهدّئ المساء', 'A cup to ease into the evening', 4, true, 1402, 1122, '/images/tea/krak tea.png', 'الشاي', 'Tea', 2),
    ('coffee', 'القهوة', 'Coffee', 'دفء القهوة في كل رشفة', 'Warmth in every sip', 0, true, 1254, 1254, '/images/coffee/Cappuccino - Copy.png', 'القهوة', 'Coffee', 0),
    ('iced-drinks', 'القهوة الباردة', 'Iced Drinks', 'قهوة منعشة على مزاجك', 'Refreshing coffee, your way', 2, true, 1198, 1313, '/images/iced drinks/Iced Latte.png', 'القهوة الباردة', 'Iced Coffee', 1),
    ('milkshakes', 'الميلك شيك', 'Milkshakes', 'غني وكريمي', 'Rich and creamy', 7, true, 1122, 1402, '/images/milkshake/Pistachio Milkshake.png', 'الميلك شيك', 'Milkshakes', 4),
    ('hot-drinks', 'المشروبات الساخنة', 'Hot Drinks', 'لحظات دافئة', 'Moments of warmth', 3, true, 1254, 1254, '/images/hot drinks/Hot Chocolate.png', 'المشروبات الساخنة', 'Hot Drinks', 7),
    ('specialty-coffee', 'القهوة المختصة', 'Specialty Coffee', 'تحضير دقيق ونكهة استثنائية', 'Precise brewing, exceptional flavour', 1, true, 1254, 1254, null, null, null, null),
    ('smoothies', 'السموذي', 'Smoothies', 'نكهات خفيفة ومنعشة', 'Light, refreshing flavours', 6, true, 1537, 1023, '/images/smoothie/Strawberry Smoothie.png', 'السموذي', 'Smoothies', 5),
    ('shisha', 'الشيشة', 'Shisha', 'مزاج المساء في نيولا', 'Niola''s evening ritual', 9, true, 1254, 1254, '/images/shisha/Shisha.png', 'الشيشة', 'Shisha', 8)
) as v(slug, name_ar, name_en, subtitle_ar, subtitle_en, sort_order, is_published, default_image_width, default_image_height, homepage_image_url, homepage_name_ar, homepage_name_en, homepage_sort_order)
on conflict (slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  subtitle_ar = excluded.subtitle_ar,
  subtitle_en = excluded.subtitle_en,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  default_image_width = excluded.default_image_width,
  default_image_height = excluded.default_image_height,
  homepage_image_url = excluded.homepage_image_url,
  homepage_name_ar = excluded.homepage_name_ar,
  homepage_name_en = excluded.homepage_name_en,
  homepage_sort_order = excluded.homepage_sort_order;

insert into public.menu_products (category_id, slug, name_ar, name_en, price, image_url, image_width, image_height, sort_order, is_published)
select c.id, v.slug::text, v.name_ar::text, v.name_en::text, v.price::integer, v.image_url::text, v.image_width::integer, v.image_height::integer, v.sort_order::integer, v.is_published::boolean
from (values
    ('desserts', 'molten-cake', 'مولتن كيك', 'Molten Cake', 185, '/images/dessert/moltin Cake.png', 1536, 1024, 0, true),
    ('desserts', 'cheesecake', 'شيز كيك', 'Cheesecake', 175, '/images/dessert/Chessecake.jpeg', 1536, 1024, 1, true),
    ('desserts', 'red-velvet-cake', 'ريد فيلفت', 'Red Velvet Cake', 170, '/images/dessert/Redvelvet Cake.png', 1536, 1024, 2, true),
    ('desserts', 'brownies', 'براونيز', 'Brownies', 175, '/images/dessert/Brownies.png', 1536, 1024, 3, true),
    ('desserts', 'fudge', 'فادج', 'Fudge', 175, null, null, null, 4, false),
    ('desserts', 'ice-cream', 'آيس كريم', 'Ice Cream', 165, '/images/dessert/ice cream.png', 1536, 1024, 5, true),
    ('desserts', 'waffle', 'وافل', 'Waffle', 165, '/images/dessert/waffel.png', 1536, 1024, 6, true),
    ('desserts', 'niola-waffle', 'وافل نيولا', 'Niola Waffle', 220, '/images/dessert/waffel Niola.png', 1536, 1024, 7, true),
    ('desserts', 'plain-kunafa', 'كنافة عادي', 'Plain Kunafa', 170, '/images/dessert/Kunafa.png', 1536, 1024, 8, true),
    ('desserts', 'nutella-kunafa', 'كنافة نوتيلا', 'Nutella Kunafa', 200, null, null, null, 9, false),
    ('desserts', 'pistachio-kunafa', 'كنافة بالفستق', 'Pistachio Kunafa', 200, null, null, null, 10, false),
    ('desserts', 'tiramisu', 'تيراميسو', 'Tiramisu', 200, null, null, null, 11, false),
    ('fresh-juices', 'orange-juice', 'عصير برتقال', 'Orange Juice', 120, '/images/fresh jucies/Fresh Orange Juice.png', 1122, 1402, 0, true),
    ('fresh-juices', 'lemon-juice', 'عصير ليمون', 'Lemon Juice', 120, '/images/fresh jucies/Fresh Lemon Juice.png', 1122, 1402, 1, true),
    ('fresh-juices', 'lemon-mint-juice', 'عصير ليمون نعناع', 'Lemon Mint Juice', 130, '/images/fresh jucies/Lemon Mint Juice.png', 1122, 1402, 2, true),
    ('fresh-juices', 'lemon-juice-with-milk', 'عصير ليمون بالحليب', 'Lemon Juice with Milk', 130, null, null, null, 3, false),
    ('fresh-juices', 'avocado-juice', 'عصير أفوكادو', 'Avocado Juice', 160, '/images/fresh jucies/Avocado Juice.png', 1086, 1448, 4, true),
    ('fresh-juices', 'avocado-juice-with-milk', 'عصير أفوكادو بالحليب', 'Avocado Juice with Milk', 180, null, null, null, 5, false),
    ('fresh-juices', 'avocado-with-nuts', 'أفوكادو بالمكسرات', 'Avocado with Nuts', 220, null, null, null, 6, false),
    ('fresh-juices', 'melon-juice', 'عصير شمام', 'Melon Juice', 120, '/images/fresh jucies/Fresh Melon Juice.png', 1122, 1402, 7, true),
    ('fresh-juices', 'melon-juice-with-milk', 'عصير شمام بالحليب', 'Melon Juice with Milk', 140, null, null, null, 8, false),
    ('fresh-juices', 'watermelon-juice', 'عصير بطيخ', 'Watermelon Juice', 130, '/images/fresh jucies/Fresh Watermelon Juice.png', 1086, 1448, 9, true),
    ('fresh-juices', 'grape-juice', 'عصير عنب', 'Grape Juice', 130, '/images/fresh jucies/Fresh Grape Juice.png', 1122, 1402, 10, true),
    ('fresh-juices', 'strawberry-juice', 'عصير فراولة', 'Strawberry Juice', 120, null, null, null, 11, false),
    ('fresh-juices', 'strawberry-juice-with-milk', 'عصير فراولة بالحليب', 'Strawberry Juice with Milk', 130, '/images/fresh jucies/Strawberry with Milk.png', 1122, 1402, 12, true),
    ('fresh-juices', 'cocktail-juice', 'عصير كوكتيل', 'Cocktail Juice', 130, null, null, null, 13, false),
    ('fresh-juices', 'cocktail-juice-with-milk', 'عصير كوكتيل بالحليب', 'Cocktail Juice with Milk', 140, null, null, null, 14, false),
    ('fresh-juices', 'mango-juice', 'عصير مانجو', 'Mango Juice', 120, '/images/fresh jucies/Fresh Mango Juice.png', 1122, 1402, 15, true),
    ('fresh-juices', 'mango-juice-with-milk', 'عصير مانجو بالحليب', 'Mango Juice with Milk', 130, null, null, null, 16, false),
    ('fresh-juices', 'guava-juice', 'عصير جوافة', 'Guava Juice', 130, '/images/fresh jucies/Fresh Guava Juice.png', 1145, 1373, 17, true),
    ('fresh-juices', 'layered-juice', 'عصير طبقات', 'Layered Juice', 130, '/images/fresh jucies/Layered Juice.png', 1149, 1369, 18, true),
    ('fresh-juices', 'banana-with-milk', 'عصير موز بالحليب', 'Banana with Milk', 110, null, null, null, 19, false),
    ('fresh-juices', 'banana-milk-chocolate', 'عصير موز بالحليب وشوكولاتة', 'Banana Milk with Chocolate', 130, null, null, null, 20, false),
    ('fresh-juices', 'banana-milk-strawberry', 'عصير موز بالحليب وفراولة', 'Banana Milk with Strawberry', 130, null, null, null, 21, false),
    ('fresh-juices', 'kiwi-juice', 'عصير كيوي', 'Kiwi Juice', 150, '/images/fresh jucies/Fresh Kiwi Juice.png', 1122, 1402, 22, true),
    ('fresh-juices', 'kiwi-juice-with-milk', 'عصير كيوي بالحليب', 'Kiwi Juice with Milk', 160, null, null, null, 23, false),
    ('fresh-juices', 'apple-juice', 'عصير تفاح', 'Apple Juice', 120, null, null, null, 24, false),
    ('fresh-juices', 'pineapple-juice', 'عصير أناناس', 'Pineapple Juice', 120, null, null, null, 25, false),
    ('fresh-juices', 'pineapple-juice-with-milk', 'عصير أناناس بالحليب', 'Pineapple Juice with Milk', 130, null, null, null, 26, false),
    ('fresh-juices', 'medium-fruit-platter', 'طبق فواكه وسط', 'Medium Fruit Platter', 350, null, null, null, 27, false),
    ('fresh-juices', 'large-fruit-platter', 'طبق فواكه كبير', 'Large Fruit Platter', 450, null, null, null, 28, false),
    ('fresh-juices', 'florida-juice', 'عصير فلوريدا', 'Florida Juice', 150, null, null, null, 29, false),
    ('fresh-juices', 'niola-lounge-juice', 'عصير نيولا لاونج', 'Niola Lounge Juice', 160, null, null, null, 30, false),
    ('fresh-juices', 'watermelon-strawberry-juice', 'عصير بطيخ بالفراولة', 'Watermelon Strawberry Juice', 160, null, null, null, 31, false),
    ('tea', 'koshary-tea', 'شاي كشري', 'Koshary Tea', 45, null, null, null, 0, false),
    ('tea', 'lipton-tea', 'شاي ليبتون', 'Lipton Tea', 45, '/images/tea/liption tea.png', 1402, 1122, 1, true),
    ('tea', 'mint-tea', 'شاي نعناع', 'Mint Tea', 45, '/images/tea/mint tea.png', 1402, 1122, 2, true),
    ('tea', 'green-tea', 'شاي أخضر', 'Green Tea', 50, '/images/tea/green tea.png', 1402, 1122, 3, true),
    ('tea', 'karak-tea', 'شاي كرك', 'Karak Tea', 70, '/images/tea/krak tea.png', 1402, 1122, 4, true),
    ('tea', 'lemon-ginger-tea', 'شاي ليمون مع زنجبيل', 'Lemon Ginger Tea', 55, '/images/tea/lemon and ginger tea.png', 1402, 1122, 5, true),
    ('tea', 'lemon-tea', 'شاي ليمون', 'Lemon Tea', 55, null, null, null, 6, false),
    ('tea', 'red-tea-pot', 'براد شاي أحمر', 'Red Tea Pot', 150, '/images/tea/red tea.png', 1400, 1123, 7, false),
    ('tea', 'karak-tea-pot', 'براد شاي كرك', 'Karak Tea Pot', 200, null, null, null, 8, false),
    ('coffee', 'espresso', 'إسبريسو', 'Espresso', 85, '/images/coffee/Espresso - Copy.png', 1254, 1254, 0, true),
    ('coffee', 'double-espresso', 'إسبريسو دبل', 'Double Espresso', 100, null, null, null, 1, false),
    ('coffee', 'espresso-crema', 'إسبريسو كريمة', 'Espresso Crema', 105, null, null, null, 2, false),
    ('coffee', 'espresso-foam', 'إسبريسو فوم', 'Espresso Foam', 95, null, null, null, 3, false),
    ('coffee', 'double-espresso-foam', 'إسبريسو فوم دبل', 'Double Espresso Foam', 105, '/images/coffee/Double Espresso Foam - Copy.png', 1254, 1254, 4, true),
    ('coffee', 'turkish-coffee', 'قهوة تركي', 'Turkish Coffee', 75, null, null, null, 5, false),
    ('coffee', 'double-turkish-coffee', 'قهوة تركي دبل', 'Double Turkish Coffee', 90, '/images/coffee/Double Turkish Coffee - Copy.png', 1254, 1254, 6, true),
    ('coffee', 'french-coffee', 'قهوة فرنساوي', 'French Coffee', 90, null, null, null, 7, false),
    ('coffee', 'yemeni-coffee', 'قهوة يمني', 'Yemeni Coffee', 80, null, null, null, 8, false),
    ('coffee', 'mocha-coffee', 'قهوة موكا', 'Mocha Coffee', 130, null, null, null, 9, false),
    ('coffee', 'hazelnut-coffee', 'قهوة بندق', 'Hazelnut Coffee', 90, null, null, null, 10, false),
    ('coffee', 'americano', 'قهوة أمريكانو', 'Americano', 90, null, null, null, 11, false),
    ('coffee', 'black-nescafe', 'نسكافيه بلاك', 'Black Nescafé', 110, null, null, null, 12, false),
    ('coffee', 'nescafe-with-milk', 'نسكافيه حليب', 'Nescafé with Milk', 130, null, null, null, 13, false),
    ('coffee', 'cappuccino', 'كابتشينو', 'Cappuccino', 130, '/images/coffee/Cappuccino - Copy.png', 1254, 1254, 14, true),
    ('coffee', 'latte', 'لاتيه', 'Latte', 135, '/images/coffee/Latte - Copy.png', 1254, 1254, 15, true),
    ('coffee', 'flat-white', 'فلات وايت', 'Flat White', 140, null, null, null, 16, false),
    ('coffee', 'white-mocha', 'وايت موكا', 'White Mocha', 140, null, null, null, 17, false),
    ('coffee', 'caramel-latte', 'كراميل لاتيه', 'Caramel Latte', 150, null, null, null, 18, false),
    ('coffee', 'spanish-latte', 'سبانش لاتيه', 'Spanish Latte', 140, null, null, null, 19, false),
    ('coffee', 'pistachio-latte', 'لاتيه بيستاشيو', 'Pistachio Latte', 150, '/images/coffee/Pistachio Latte - Copy.png', 1254, 1254, 20, true),
    ('coffee', 'arabic-coffee-pot', 'دلة قهوة عربي', 'Arabic Coffee Pot', 200, null, null, null, 21, false),
    ('iced-drinks', 'iced-chocolate', 'آيس شوكليت', 'Iced Chocolate', 140, null, null, null, 0, false),
    ('iced-drinks', 'iced-matcha-latte', 'آيس ماتشا لاتيه', 'Iced Matcha Latte', 150, '/images/iced drinks/Iced Matcha Latte.png', 1086, 1448, 1, true),
    ('iced-drinks', 'iced-matcha', 'آيس ماتشا', 'Iced Matcha', 140, null, null, null, 2, false),
    ('iced-drinks', 'iced-latte', 'آيس لاتيه', 'Iced Latte', 150, '/images/iced drinks/Iced Latte.png', 1198, 1313, 3, true),
    ('iced-drinks', 'iced-nutella', 'آيس نوتيلا', 'Iced Nutella', 160, '/images/iced drinks/Iced Nutella.png', 1197, 1314, 4, true),
    ('iced-drinks', 'iced-pistachio-latte', 'آيس لاتيه بيستاشيو', 'Iced Pistachio Latte', 160, '/images/iced drinks/Iced Pistachio Latte.png', 1198, 1313, 5, true),
    ('iced-drinks', 'iced-lotus-latte', 'آيس لوتس لاتيه', 'Iced Lotus Latte', 160, '/images/iced drinks/Iced Lotus Latte.png', 1122, 1402, 6, true),
    ('iced-drinks', 'iced-mocha', 'آيس موكا', 'Iced Mocha', 160, null, null, null, 7, false),
    ('iced-drinks', 'iced-white-mocha', 'آيس وايت موكا', 'Iced White Mocha', 160, '/images/iced drinks/Iced White Mocha.png', 1086, 1448, 8, true),
    ('iced-drinks', 'iced-spanish-latte', 'آيس سبانيش لاتيه', 'Iced Spanish Latte', 160, null, null, null, 9, false),
    ('iced-drinks', 'iced-blue-latte', 'آيس بلو لاتيه', 'Iced Blue Latte', 170, '/images/iced drinks/Iced Blue Latte.png', 1086, 1448, 10, true),
    ('iced-drinks', 'iced-spanish-pistachio', 'آيس سبانيش بيستاشيو', 'Iced Spanish Pistachio', 170, '/images/iced drinks/Iced Spanish Pistachio.png', 1198, 1313, 11, true),
    ('iced-drinks', 'iced-strawberry-matcha', 'آيس ماتشا فراولة', 'Iced Strawberry Matcha', 160, '/images/iced drinks/Iced Strawberry Matcha.png', 1198, 1313, 12, true),
    ('milkshakes', 'vanilla-milkshake', 'فانيليا', 'Vanilla Milkshake', 190, '/images/milkshake/Vanilla Milkshake.png', 1179, 1334, 0, true),
    ('milkshakes', 'caramel-milkshake', 'كراميل', 'Caramel Milkshake', 190, '/images/milkshake/Caramel Milkshake.png', 1122, 1402, 1, true),
    ('milkshakes', 'lotus-milkshake', 'لوتس', 'Lotus Milkshake', 190, '/images/milkshake/Lotus Milkshake.png', 1122, 1402, 2, true),
    ('milkshakes', 'matcha-milkshake', 'ماتشا', 'Matcha Milkshake', 190, '/images/milkshake/Matcha Milkshake.png', 1122, 1402, 3, true),
    ('milkshakes', 'chocolate-milkshake', 'شوكليت', 'Chocolate Milkshake', 190, '/images/milkshake/Chocolate Milkshake.png', 1122, 1402, 4, true),
    ('milkshakes', 'strawberry-milkshake', 'فراولة', 'Strawberry Milkshake', 190, '/images/milkshake/Strawberry Milkshake.png', 1122, 1402, 5, true),
    ('milkshakes', 'oreo-milkshake', 'أوريو', 'Oreo Milkshake', 190, '/images/milkshake/Oreo Milkshake.png', 1122, 1402, 6, true),
    ('milkshakes', 'pistachio-milkshake', 'بيستاشيو', 'Pistachio Milkshake', 190, '/images/milkshake/Pistachio Milkshake.png', 1123, 1401, 7, true),
    ('hot-drinks', 'hot-cider', 'هوت سيدر', 'Hot Cider', 80, '/images/hot drinks/Hot Cider.png', 1254, 1254, 0, true),
    ('hot-drinks', 'hot-chocolate', 'هوت شوكليت', 'Hot Chocolate', 130, '/images/hot drinks/Hot Chocolate.png', 1402, 1122, 1, true),
    ('hot-drinks', 'hot-tiramisu', 'هوت تيراميسو', 'Hot Tiramisu', 150, '/images/hot drinks/Hot Tiramisu.png', 1448, 1086, 2, true),
    ('hot-drinks', 'anise', 'يانسون', 'Anise', 45, '/images/hot drinks/Anise.png', 1254, 1254, 3, true),
    ('hot-drinks', 'sahlab', 'سحلب', 'Sahlab', 130, '/images/hot drinks/Sahlab.png', 1254, 1254, 4, true),
    ('hot-drinks', 'special-sahlab', 'سحلب سبيشل', 'Special Sahlab', 150, '/images/hot drinks/Special Sahlab.png', 1254, 1254, 5, true),
    ('specialty-coffee', 'v60', 'V60', 'V60', 200, '/images/special coffee/200 v60.png', 1254, 1254, 0, true),
    ('specialty-coffee', 'aeropress', 'أيرو برس', 'AeroPress', 180, null, null, null, 1, false),
    ('specialty-coffee', 'siphon', 'سايفون', 'Siphon', 200, '/images/special coffee/200 سايفون.png', 1254, 1254, 2, true),
    ('specialty-coffee', 'cold-brew', 'كولد برو', 'Cold Brew', 200, '/images/special coffee/200 كولد برو.png', 1254, 1254, 3, true),
    ('smoothies', 'kiwi-smoothie', 'كيوي', 'Kiwi Smoothie', 200, '/images/smoothie/Kiwi Smoothie.png', 1537, 1023, 0, true),
    ('smoothies', 'mango-smoothie', 'مانجو', 'Mango Smoothie', 170, '/images/smoothie/Mango Smoothie.png', 1537, 1023, 1, true),
    ('smoothies', 'strawberry-smoothie', 'فراولة', 'Strawberry Smoothie', 170, '/images/smoothie/Strawberry Smoothie.png', 1537, 1023, 2, true),
    ('smoothies', 'watermelon-smoothie', 'بطيخ', 'Watermelon Smoothie', 170, '/images/smoothie/Watermelon Smoothie.png', 1537, 1023, 3, true),
    ('smoothies', 'blueberry-smoothie', 'بلو بيري', 'Blueberry Smoothie', 170, '/images/smoothie/Blueberry Smoothie.png', 1537, 1023, 4, true),
    ('smoothies', 'lemon-smoothie', 'ليمون', 'Lemon Smoothie', 170, '/images/smoothie/Lemon Smoothie.png', 1537, 1023, 5, true),
    ('shisha', 'shisha', 'شيشة', 'Shisha', 370, '/images/shisha/Shisha.png', 1122, 1402, 0, true),
    ('shisha', 'shisha-hose', 'لي', 'Shisha Hose', 50, '/images/shisha/shisha ly.png', 1254, 1254, 1, true),
    ('shisha', 'salloum-shisha', 'شيشة معسل (سلوم)', 'Salloum Shisha', 160, '/images/shisha/Shisha masul.png', 1535, 1024, 2, true)
) as v(category_slug, slug, name_ar, name_en, price, image_url, image_width, image_height, sort_order, is_published)
join public.menu_categories c on c.slug = v.category_slug::text
on conflict (slug) do update set
  category_id = excluded.category_id,
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  price = excluded.price,
  image_url = excluded.image_url,
  image_width = excluded.image_width,
  image_height = excluded.image_height,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.gallery_items (slug, label_ar, label_en, alt_ar, alt_en, image_url, image_width, image_height, layout, object_position, sort_order, is_published)
select v.slug::text, v.label_ar::text, v.label_en::text, v.alt_ar::text, v.alt_en::text, v.image_url::text, v.image_width::integer, v.image_height::integer, v.layout::text, v.object_position::text, v.sort_order::integer, v.is_published::boolean
from (values
    ('nile-view', 'إطلالة على النيل', 'A View of the Nile', 'إطلالة نيولا الليلية على النيل وأفق القاهرة', 'Niola''s nighttime view of the Nile and Cairo skyline', '/images/gallary/A view of the Nile.jpeg', 1536, 864, 'nile-view', '50% 50%', 0, true),
    ('luxurious-atmosphere', 'أجواء فاخرة', 'Refined Atmosphere', 'تفاصيل من أجواء نيولا الداخلية الفاخرة', 'Details of Niola''s refined interior atmosphere', '/images/gallary/luxurious_atmosphere.png', 1204, 1306, 'luxurious-atmosphere', '52% 58%', 1, true),
    ('niola-coffee', 'قهوة نيولا', 'Niola Coffee', 'قهوة مقدّمة في أجواء نيولا', 'Coffee served in the atmosphere of Niola', '/images/gallary/Niola_Coffee.png', 1220, 1289, 'niola-coffee', '49% 56%', 2, true),
    ('niola-day-out', 'يوم في نيولا', 'A Day at Niola', 'لحظة نهارية في نيولا لاونج', 'A daytime moment at Niola Lounge', '/images/gallary/Niola_DAYOUT.png', 941, 1672, 'niola-dayout', '50% 44%', 3, true),
    ('niola-nile', 'نيولا والنيل', 'Niola by the Nile', 'جلسة نيولا المطلة على نهر النيل', 'Niola''s lounge seating overlooking the River Nile', '/images/gallary/Niola_Nile.png', 941, 1672, 'niola-nile', '50% 48%', 4, true),
    ('special-times', 'أوقات خاصة', 'Special Moments', 'جلسة خاصة ودافئة في نيولا لاونج', 'A warm, private seating area at Niola Lounge', '/images/gallary/Special_Times.png', 1254, 1254, 'special-times', '56% 68%', 5, true)
) as v(slug, label_ar, label_en, alt_ar, alt_en, image_url, image_width, image_height, layout, object_position, sort_order, is_published)
on conflict (slug) do update set
  label_ar = excluded.label_ar,
  label_en = excluded.label_en,
  alt_ar = excluded.alt_ar,
  alt_en = excluded.alt_en,
  image_url = excluded.image_url,
  image_width = excluded.image_width,
  image_height = excluded.image_height,
  layout = excluded.layout,
  object_position = excluded.object_position,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

commit;

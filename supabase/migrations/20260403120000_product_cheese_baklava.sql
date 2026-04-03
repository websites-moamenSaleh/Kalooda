-- Product: Cheese Baklava (تشيز بقلاوة) under Baked Cheeses
insert into products (
  category_id, name, name_ar, description, description_ar,
  price, stock_quantity, ingredients, ingredients_ar, allergens
) values
  (
    (select id from categories where slug = 'baked-cheeses' limit 1),
    'Cheese Baklava',
    'تشيز بقلاوة',
    'Baked cheesecake with baklava dough and Aleppo pistachio',
    'كعكة جبنة مخبوزة مع عجينة البقلاوة والفستق الحلبي',
    100, 100,
    'Eggs, cheese blend, sugar, Aleppo pistachio',
    'بيض، خليط اجبان، سكر، فستق حلبي',
    '{"eggs","dairy","nuts"}'
  );

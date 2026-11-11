-- Sokal Bela / Phase 1 / safe starter products
-- IMPORTANT: all starter products are INACTIVE with ZERO stock and ZERO prices.
-- Owner must set actual prices/stock and enable items in the future admin UI.
-- These are STARTER ROWS, not an export of the real Firestore product records.
BEGIN;

INSERT INTO products (kind,name_en,name_bn,category,unit,pack_size,price,stock,emoji,active,sort_order) VALUES
('vegetable','Potato','আলু','Roots','kg','',0,0,'🥔',FALSE,10),
('vegetable','Onion','পেঁয়াজ','Roots','kg','',0,0,'🧅',FALSE,20),
('vegetable','Tomato','টমেটো','Vegetables','kg','',0,0,'🍅',FALSE,30),
('vegetable','Brinjal','বেগুন','Vegetables','kg','',0,0,'🍆',FALSE,40),
('vegetable','Cauliflower','ফুলকপি','Vegetables','piece','',0,0,'🥦',FALSE,50),
('vegetable','Cabbage','বাঁধাকপি','Vegetables','piece','',0,0,'🥬',FALSE,60),
('vegetable','Green Chilli','কাঁচা লঙ্কা','Vegetables','g','',0,0,'🌶️',FALSE,70),
('vegetable','Cucumber','শসা','Vegetables','kg','',0,0,'🥒',FALSE,80),
('vegetable','Carrot','গাজর','Roots','kg','',0,0,'🥕',FALSE,90),
('vegetable','Spinach','পালং শাক','Leafy','bunch','',0,0,'🥬',FALSE,100),
('vegetable','Garlic','রসুন','Essentials','kg','',0,0,'🧄',FALSE,110),
('vegetable','Ginger','আদা','Essentials','kg','',0,0,'🫚',FALSE,120),
('vegetable','Radish','মুলো','Roots','kg','',0,0,'🥬',FALSE,130),
('vegetable','Bottle Gourd','লাউ','Gourds','piece','',0,0,'🥒',FALSE,140),
('vegetable','Bitter Gourd','করলা','Gourds','kg','',0,0,'🥒',FALSE,150),
('vegetable','Okra','ঢেঁড়স','Vegetables','kg','',0,0,'🥬',FALSE,160),
('vegetable','Pumpkin','কুমড়ো','Gourds','kg','',0,0,'🎃',FALSE,170),
('vegetable','Lemon','লেবু','Essentials','piece','',0,0,'🍋',FALSE,180),
('vegetable','Capsicum','ক্যাপসিকাম','Vegetables','kg','',0,0,'🫑',FALSE,190),
('vegetable','Beetroot','বিট','Roots','kg','',0,0,'🥬',FALSE,200),
('dairy','Milk','দুধ','Milk','pack','500 ml',0,0,'🥛',FALSE,210),
('dairy','Milk','দুধ','Milk','pack','1 litre',0,0,'🥛',FALSE,220),
('dairy','Paneer','পনির','Paneer','pack','200 g',0,0,'🧀',FALSE,230),
('dairy','Paneer','পনির','Paneer','pack','500 g',0,0,'🧀',FALSE,240),
('dairy','Ghee','ঘি','Ghee','pack','200 ml',0,0,'🧈',FALSE,250),
('dairy','Ghee','ঘি','Ghee','pack','500 ml',0,0,'🧈',FALSE,260)
ON CONFLICT (kind,name_en,pack_size) DO NOTHING;

-- EDIT ME: Phase 1 draft shop settings. Confirm the contact number before
-- switching the storefront. These values are NOT yet used by the live website.
INSERT INTO settings (key,value) VALUES
('shop_phone',to_jsonb('7551858583'::text)),
('min_order','300'::jsonb),
('free_delivery_min','500'::jsonb),
('free_delivery_radius_km','5'::jsonb),
('delivery_pincodes','["731224"]'::jsonb),
('shop_hours','{"open":"07:00","close":"21:00","timezone":"Asia/Kolkata"}'::jsonb),
('subscription_slots','["06:00-08:00","07:00-09:00","08:00-10:00"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;

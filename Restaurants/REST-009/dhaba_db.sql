-- Table: menu_items
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    veg INTEGER DEFAULT 1,
    popular INTEGER DEFAULT 0,
    chef_special INTEGER DEFAULT 0,
    available INTEGER DEFAULT 1,
    image TEXT
);

-- Table: bookings
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    guests INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table: reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sample menu items
INSERT OR IGNORE INTO menu_items (name, category, description, price, veg, popular, chef_special, available, image) VALUES
('Chicken Biryani', 'Biryani', 'Spicy chicken biryani with saffron rice', 250, 0, 1, 1, 1, '🍗'),
('Chicken Noodles', 'Chinese', 'Stir-fried noodles with chicken', 180, 0, 0, 0, 1, '🍜'),
('Veg Noodles', 'Chinese', 'Fresh vegetables with Hakka noodles', 150, 1, 0, 0, 1, '🥗'),
('Chicken Manchuria', 'Chinese', 'Crispy chicken balls in tangy sauce', 220, 0, 1, 0, 1, '🍗'),
('Veg Manchurian', 'Chinese', 'Vegetable balls in spicy gravy', 180, 1, 0, 1, 1, '🥦'),
('Veg Spring Rolls', 'Fast Food', 'Crispy rolls with mixed vegetables', 120, 1, 1, 0, 1, '🌯'),
('Pizza', 'Fast Food', 'Cheesy pizza with your choice of toppings', 200, 0, 0, 0, 1, '🍕'),
('Burger', 'Fast Food', 'Juicy burger with fries', 150, 0, 0, 0, 1, '🍔'),
('Cool Cake', 'Cakes', 'Fresh cream cake with fruit topping', 350, 1, 1, 1, 1, '🍰'),
('Cake Pops', 'Cakes', 'Bite-sized cake on a stick', 80, 1, 0, 0, 1, '🍭'),
('Butterscotch Cake', 'Cakes', 'Rich butterscotch flavour', 400, 1, 0, 1, 1, '🧁'),
('Red Velvet Cake', 'Cakes', 'Classic red velvet with cream cheese', 450, 1, 1, 1, 1, '🎂'),
('Vanilla Pastry', 'Bakery', 'Light vanilla cream pastry', 60, 1, 0, 0, 1, '🥐'),
('Chocolate Muffin', 'Bakery', 'Soft chocolate muffin', 50, 1, 0, 0, 1, '🧁'),
('Cold Coffee', 'Beverages', 'Chilled coffee with ice cream', 100, 1, 0, 0, 1, '☕'),
('Fresh Lime Soda', 'Beverages', 'Refreshing lime soda', 60, 1, 0, 0, 1, '🥤');
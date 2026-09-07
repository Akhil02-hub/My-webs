PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- ----------------------------
-- Table: websites
-- ----------------------------
CREATE TABLE websites (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    live_url TEXT DEFAULT '',
    tech_stack TEXT DEFAULT '',
    price TEXT DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ----------------------------
-- Table: invitations (ALL 42 CARDS)
-- ----------------------------
CREATE TABLE invitations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    price TEXT DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO invitations (id, title, category, description, image_url, price, featured, created_at, updated_at) VALUES
('3353de395e1dfa', '✨ Home Sweet Home', 'Housewarming', 'Our dream home is finally ready, and we''d love to celebrate this special moment with you! Come share our happiness and bless our new beginning.', '/static/uploads/invitations/efdfb7c6d6b94668b5bcefc7597a98ed.png', '₹199', 0, '2026-09-03 19:15:29', '2026-09-03 19:15:29'),
('33de5739d581e7', '🪔 Blessings for Our New Home', 'Housewarming', 'A new home filled with new dreams and countless memories awaits. Please join us and shower our home with your love and blessings.', '/static/uploads/invitations/28a557359ff3443090139c01e35ba175.png', '₹249', 0, '2026-09-03 19:14:36', '2026-09-03 19:14:36'),
('33cf7ba6f89a41', '🌿 Welcome to Our New Abode', 'Housewarming', 'With grateful hearts, we invite you to our housewarming celebration. Join us for prayers, happiness, delicious food, and wonderful memories.', '/static/uploads/invitations/0c85291a6677450a98a2cbbc78422444.png', '₹199', 0, '2026-09-03 19:12:46', '2026-09-03 19:12:46'),
('33cd84e7c96026', '✨A Magical Birthday Celebration', 'Birthday', 'Join us as we celebrate another beautiful year of joy, laughter, and unforgettable memories. Your presence will make this birthday celebration even more special! Come celebrate, enjoy, and make wonderful memories with us.', '/static/uploads/invitations/cb6de1a48b8640c080ed66bc7babadc0.png', '₹99', 0, '2026-09-03 18:35:31', '2026-09-03 18:52:31'),
('3371c290a228e1', '🏡 A New Home, A New Beginning', 'Housewarming', 'Come celebrate the joy of our new home with us! Your presence and blessings will make this beautiful new beginning even more special.', '/static/uploads/invitations/15b7cecf00c347d799095eda5ecf8214.png', '₹199', 0, '2026-09-03 19:11:57', '2026-09-03 19:11:57'),
('33b4e9ab339c89', '✨ Forever Begins Today', 'Wedding', 'A new chapter of love is about to begin. Join us as we say "I do" and celebrate the start of our happily ever after with family and friends.', '/static/uploads/invitations/0326f7023afc45a88397d9fb8c6cdb43.png', '₹199', 0, '2026-09-03 18:49:29', '2026-09-03 18:49:29'),
('33e80df5dc8c21', '🌸 Together Forever Starts Here', 'Wedding', 'With love in our hearts and dreams in our eyes, we invite you to celebrate the beginning of our forever. Come share our joy as two hearts become one.', '/static/uploads/invitations/ffadcbb4cfae4591a9526da24b23ac23.png', '₹199', 0, '2026-09-03 18:48:33', '2026-09-03 18:48:33'),
('334ad053404cd3', '💍 Two Hearts, One Beautiful Journey', 'Wedding', 'Join us as we celebrate the beginning of a beautiful journey of love, togetherness, and forever. Your presence and blessings will make our special day even more memorable.', '/static/uploads/invitations/9e7d53f4be0c4fedacd82834775b1ce9.png', '₹199', 0, '2026-09-03 18:47:08', '2026-09-03 18:47:08'),
('33528c9a1834fc', '🕊️ A Celebration of Love', 'Engagement', 'Two souls, one heart, and a lifetime of beautiful memories ahead. We warmly invite you to be part of our wedding celebration and bless us on this special occasion.', '/static/uploads/invitations/e0e97d352b2f4b32b205b9067717eb04.png', '₹199', 0, '2026-09-03 18:51:35', '2026-09-03 18:54:32'),
('330b63e90812b4', '💫 Cheers to Another Wonderful Year!', 'Birthday', 'Let''s make this birthday unforgettable! Join us for an evening filled with happiness, laughter, delicious treats, and beautiful memories. Come celebrate this special day with us!', '/static/uploads/invitations/b340409972a542d0ab2bd9220a5b3eac.png', '₹99', 0, '2026-09-03 18:42:03', '2026-09-03 19:40:08'),
('33967c5d6135ca', '🎂 A Day Full of Smiles & Celebration', 'Birthday', 'Come celebrate a very special birthday filled with laughter, love, music, delicious food, and unforgettable moments. Your presence will make the celebration truly complete!', '/static/uploads/invitations/8178c34579094e3099b986206e5e5fd5.png', '₹99', 0, '2026-09-03 18:38:39', '2026-09-03 18:53:11'),
('334d82cbac7d57', '🎂 A Birthday Worth Celebrating', 'Birthday', 'A special day, a beautiful celebration, and memories waiting to be made. Join us to celebrate this wonderful birthday with love, laughter, music, and lots of happiness!', '/static/uploads/invitations/b268c17fd4c74b768a05794ef2ec6f4b.png', '₹99', 0, '2026-09-03 18:39:29', '2026-09-03 18:52:58'),
('3355d202ab0982', '🌸 United by Love', 'Wedding', 'With love in our hearts and happiness all around, we invite you to witness and celebrate the union of two souls.', '/static/uploads/invitations/f4807ad7287b41d2a7af39162c83caf4.png', '₹249', 0, '2026-09-03 19:55:08', '2026-09-03 19:55:08'),
('33a9f50e0a4676', '💍 A Love Story Begins', 'Wedding', 'Two hearts, one beautiful promise, and a lifetime of togetherness ahead. Join us as we celebrate the beginning of our forever.', '/static/uploads/invitations/25ff8350b61e4600b299271f202a80ae.png', '₹249', 0, '2026-09-03 19:54:16', '2026-09-03 19:54:16'),
('338a5e716c10e7', '❤️ Two Souls, One Promise', 'Engagement', 'Our hearts have chosen each other, and now we''re ready to begin our forever. Come celebrate our engagement with us.', '/static/uploads/invitations/723a21c706df456cad26e4993f8e862e.png', '₹249', 0, '2026-09-03 19:37:37', '2026-09-03 19:37:37'),
('33f65551b0b1c0', '🥂 Cheers to Love', 'Engagement', 'We said yes to forever! Join us for an evening of love, laughter, and celebration as we mark the beginning of our journey together.', '/static/uploads/invitations/02598542f07048829c15325e9f7a12d0.png', '₹199', 0, '2026-09-03 19:37:02', '2026-09-03 19:37:02'),
('336b9be65423b5', '🌸 Our Beautiful Beginning', 'Engagement', 'A new chapter of love begins today. Come celebrate this special moment with us and bless our journey together.', '/static/uploads/invitations/344400d931164681aee6bbd80c43688f.png', '₹249', 0, '2026-09-03 19:36:24', '2026-09-03 19:36:24'),
('33ea6cf53ca93f', '✨ A Ring, A Promise, A Lifetime', 'Engagement', 'With hearts full of love and dreams for tomorrow, we invite you to celebrate our engagement and share in our happiness.', '/static/uploads/invitations/f14536aaa56c4e4a8c1d9da7f8ca48c5.png', '₹499', 0, '2026-09-03 19:35:11', '2026-09-03 19:35:11'),
('3378d5382bfc1f', '💍 Forever Starts Here', 'Engagement', 'Two hearts, one promise, and a beautiful journey ahead. Join us as we celebrate the beginning of our forever.', '/static/uploads/invitations/178546940cd9477aa0e2ebaa8b189b7c.png', '₹199', 0, '2026-09-03 19:34:22', '2026-09-03 19:34:22'),
('33ef18c55d56ff', '🌿 Welcoming Our Little Blessing', 'Baby Shower', 'With happiness in our hearts, we invite you to celebrate the arrival of our little bundle of joy. Your presence and blessings mean so much to us.', '/static/uploads/invitations/a27385221b8b4a299e4d8e9d31cb0e1b.png', '₹99', 0, '2026-09-03 19:28:55', '2026-09-03 19:28:55'),
('3355935a861efe', '🎀 A Little Love Is on the Way', 'Baby Shower', 'Tiny hands, tiny feet, and a whole lot of love! Join us as we celebrate the sweetest new chapter in our lives.', '/static/uploads/invitations/076f04c080134239827ca0054b804034.png', '₹199', 0, '2026-09-03 19:28:04', '2026-09-03 19:28:04'),
('33b955d408f654', '💕 From Two Hearts to Three', 'Baby Shower', 'Our family is growing, and our hearts are overflowing with love! Come celebrate the upcoming arrival of our precious little baby with us.', '/static/uploads/invitations/92613d634415405a8b4fcff75bfd21fc.png', '₹99', 0, '2026-09-03 19:27:17', '2026-09-03 19:27:17'),
('333b4271767834', '👶 Waiting for Our Little Wonder', 'Baby Shower', 'Our hearts are filled with excitement as we await our little one. Join us for a joyful baby shower and share in this beautiful celebration.', '/static/uploads/invitations/5f1e0f6a858440fbac426e8ff3d71b33.png', '₹199', 0, '2026-09-03 19:26:29', '2026-09-03 19:26:29'),
('33058af35f97aa', '🌸 A Sweet Little Blessing', 'Baby Shower', 'A tiny bundle of joy is on the way! Come celebrate this beautiful moment with us, filled with love, laughter, and happiness.', '/static/uploads/invitations/ff5fe156d0d44b4ea261b2d586502482.png', '₹249', 0, '2026-09-03 19:24:20', '2026-09-03 19:24:20'),
('3359e66e22ec1f', '🍼 Little Miracle, Big Love', 'Baby Shower', 'Join us as we celebrate the beautiful journey of parenthood and welcome a precious little miracle into the world. Your love and blessings will make this day truly special.', '/static/uploads/invitations/311503440dca4baf88c2b7ab82de6f1d.png', '₹199', 0, '2026-09-03 19:23:09', '2026-09-03 19:23:09'),
('33f9a563b67ae2', '🪷 Celebrating a Sacred Union', 'Wedding', 'Surrounded by family, traditions, and blessings, we invite you to be part of this meaningful celebration of love and togetherness.', '/static/uploads/invitations/7de21a49f1d545c49b8752d762541d0e.png', '₹299', 0, '2026-09-03 20:19:54', '2026-09-03 20:19:54'),
('3318f5760dc208', '🌼 Hand in Hand, Heart to Heart', 'Wedding', 'With dreams to share and a lifetime to build, we invite you to celebrate the day our lives become beautifully intertwined.', '/static/uploads/invitations/09d83f4890ea477e9e15d43476ba812d.png', '₹299', 0, '2026-09-03 20:19:06', '2026-09-03 20:19:06'),
('330fcd88850b3e', '🕯️ An Evening of Love & Joy', 'Wedding', 'Come share in the warmth and happiness of our marriage celebration as we gather with loved ones to honor this beautiful beginning.', '/static/uploads/invitations/0c92f67f3a874c86973ca555aa679395.png', '₹299', 0, '2026-09-03 20:14:19', '2026-09-03 20:23:08'),
('332cef3afffff6', '🌷 A Journey of Two Souls', 'Wedding', 'A beautiful new chapter is unfolding, and we would be delighted to have you with us as we celebrate the union of two hearts and two families.', '/static/uploads/invitations/06d8bebd69cd4794a34682735b82f78e.png', '₹249', 0, '2026-09-03 20:13:46', '2026-09-03 20:13:46'),
('334e602fe51c7b', '🕯️ A Day to Remember', 'Wedding', 'A celebration of love, family, and new beginnings. Join us as we create memories that will last a lifetime.', '/static/uploads/invitations/3a875ccf05b547cea0e1bd8643249618.png', '₹99', 0, '2026-09-03 20:10:02', '2026-09-03 20:10:02'),
('33c7d0cb8067cb', '🌺 When Two Hearts Become One', 'Wedding', 'With love, joy, and the blessings of our families, we invite you to celebrate the union of two hearts and two beautiful lives.', '/static/uploads/invitations/75b3c89a58ac4972b4a7cc089460915f.png', '₹99', 0, '2026-09-03 20:09:36', '2026-09-03 20:09:36'),
('3320cc5dd02510', '💫 Our Forever Story', 'Wedding', 'Today marks the beginning of our forever. We invite you to share our happiness and bless us as we embark on this wonderful journey.', '/static/uploads/invitations/bcf50b6831ca4be7bd20cdb7a58b9fd9.png', '₹249', 0, '2026-09-03 20:08:44', '2026-09-03 20:08:44'),
('33788951eec089', '🥂 Love Takes Center Stage', 'Wedding', 'Come celebrate the love that brought us together and the beautiful future that awaits. Your presence will make our special day unforgettable.', '/static/uploads/invitations/c11bdb5d7241402cb28f8a12bc3f3160.png', '₹99', 0, '2026-09-03 20:08:11', '2026-09-03 20:08:11'),
('3392463c24c057', '🌹 A Promise of Forever', 'Wedding', 'Two hearts, one promise, and a lifetime of love ahead. Join us as we begin our beautiful journey together.', '/static/uploads/invitations/c6fb74cd22e549d18148667d1ae5b50c.png', '₹249', 0, '2026-09-03 20:04:54', '2026-09-03 20:04:54'),
('33d1b418579c16', '❤️ Made for Each Other', 'Wedding', 'From this day forward, we walk together hand in hand. We warmly invite you to celebrate our wedding and bless our journey of love.', '/static/uploads/invitations/ba33d67b706c4bb987b7d22540cd0fc2.png', '₹249', 0, '2026-09-03 20:00:46', '2026-09-03 20:00:46'),
('33c4ca0146e087', '🌿 Love, Laughter & Happily Ever After', 'Wedding', 'Our forever is about to begin! Join us for a joyful celebration as two hearts come together as one.', '/static/uploads/invitations/bdd180486a464d9bbe087be7ce2f4c1f.png', '₹199', 0, '2026-09-03 19:58:30', '2026-09-03 19:58:30'),
('33cb420892eaf3', '🕊️ Two Hearts, One Journey', 'Wedding', 'Together with our families, we invite you to celebrate a day filled with love, laughter, and cherished memories.', '/static/uploads/invitations/9fe087a700994daa8b759440d2545e32.png', '₹249', 0, '2026-09-03 19:57:56', '2026-09-03 19:57:56'),
('331285ecb22055', '✨ The Beginning of Forever', 'Wedding', 'A beautiful journey of love is about to begin. Come share our joy and bless us as we start this wonderful chapter together.', '/static/uploads/invitations/0211496b25da44bab065d605dca6a430.png', '₹199', 0, '2026-09-03 19:55:50', '2026-09-03 19:55:50'),
('33bcb9a7ae6d30', '🕊️ The Vows That Bind Us', 'Wedding', 'With heartfelt vows and joyful hearts, we begin our journey as life partners. Join us as we celebrate this meaningful and unforgettable day.', '/static/uploads/invitations/f983e42c85fb406db7059ed79dc87502.png', '₹499', 0, '2026-09-03 20:22:10', '2026-09-03 20:22:10'),
('33fce0b93b1d78', '🌻 A Lifetime Begins Together', 'Wedding', 'The next chapter of our story begins with a promise to walk through life together. We warmly invite you to celebrate this precious occasion.', '/static/uploads/invitations/a37118e504f749a08f25299db1243aca.png', '₹499', 0, '2026-09-03 20:21:38', '2026-09-03 20:21:38'),
('330cd5848ad47e', '🌙 Under One Beautiful Promise', 'Wedding', 'Two lives are coming together under one promise of love, trust, and companionship. Come celebrate this cherished milestone with us.', '/static/uploads/invitations/5964eefc6f1148f4b8a8d2ef69fd1922.png', '₹99', 0, '2026-09-03 20:21:01', '2026-09-03 20:21:01'),
('3390e96dbd1f44', '🎶 Love in Every Moment', 'Wedding', 'From heartfelt vows to joyful celebrations, every moment will be more memorable with you by our side. Join us on our special day.', '/static/uploads/invitations/c0519bc5c2014adca5e88a35d824fe17.png', '₹199', 0, '2026-09-03 20:20:31', '2026-09-03 20:20:31');

-- ----------------------------
-- Table: branding
-- ----------------------------
CREATE TABLE branding (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    brand_name TEXT NOT NULL,
    tagline TEXT DEFAULT '',
    hero_title TEXT DEFAULT '',
    hero_description TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    instagram_url TEXT NOT NULL DEFAULT 'https://ig.me/m/websbyakhil'
);

INSERT INTO branding (id, brand_name, tagline, hero_title, hero_description, logo_url, instagram_url) VALUES
(1, 'AkhilWebInvites', 'Invitations & Websites', 'Beautiful digital experiences, made for you.', 'Premium invitation designs and modern websites crafted by Akhil.', '/static/uploads/websites/598db0b1ede345adac23de6b4a8a4f5a.jpg', 'https://ig.me/m/websbyakhil');

-- ----------------------------
-- Table: admin_users
-- ----------------------------
CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin_users (id, username, password_hash, created_at, updated_at) VALUES
(1, 'admin', 'scrypt:32768:8:1$kLzIwBKAQYyQUZd8$2cdf1a6ce3190d0b97ea76ccd34dc9969867038505627dac7696a41c75accbd26b1046fff1bbcd82be5b99c3dce019af76944b2bfe9061d2dca2a887cbab23c3', '2026-09-03 15:31:55', '2026-09-03 15:31:55');

CREATE INDEX sqlite_autoindex_websites_1 ON websites (id);
CREATE INDEX sqlite_autoindex_invitations_1 ON invitations (id);
CREATE INDEX sqlite_autoindex_admin_users_1 ON admin_users (username);

COMMIT;
PRAGMA foreign_keys=ON;
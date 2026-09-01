const router = require('express').Router();
const SiteInfo = require('../models/SiteInfo');
const auth = require('../middleware/auth');
const { upload, processImage } = require('../middleware/upload');
const imageService = require('../services/imageService');
const { catchAsync } = require('../middleware/errorHandler');

function isValidMapEmbed(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'www.google.com' && parsed.pathname === '/maps/embed';
  } catch {
    return false;
  }
}

function validateSitePayload(body) {
  const stringLimits = {
    lodgeName: 100,
    tagline: 200,
    aboutText: 3000,
    phone: 20,
    address: 300,
    email: 254,
    mapEmbedUrl: 2000
  };
  for (const [key, max] of Object.entries(stringLimits)) {
    if (body[key] !== undefined && typeof body[key] !== 'string') return `${key} must be a string.`;
    if (typeof body[key] === 'string' && body[key].trim().length > max) return `${key} is too long.`;
  }
  if (body.email !== undefined && body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return 'Invalid email address.';
  if (body.amenities !== undefined) {
    if (!Array.isArray(body.amenities) || body.amenities.some(item => typeof item !== 'string')) return 'Amenities must be an array of strings.';
    if (body.amenities.length > 30) return 'Too many amenities.';
  }
  if (body.socialLinks !== undefined && (typeof body.socialLinks !== 'object' || Array.isArray(body.socialLinks) || body.socialLinks === null)) return 'Invalid social links.';
  if (body.mapEmbedUrl !== undefined && !isValidMapEmbed(body.mapEmbedUrl.trim())) return 'Invalid Google Maps embed URL.';
  return null;
}

function isManagedLocalImage(image) {
  return image?.url && !image.url.startsWith('/') && !/^https?:\/\//i.test(image.url);
}

router.get('/', catchAsync(async (req, res) => {
  let site = await SiteInfo.findOne();
  if (!site) site = await SiteInfo.create({});
  return res.json({ success: true, data: site });
}));

router.put('/', auth, catchAsync(async (req, res) => {
  const validationError = validateSitePayload(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  let site = await SiteInfo.findOne();
  if (!site) site = new SiteInfo();

  const allowed = ['lodgeName', 'tagline', 'aboutText', 'phone', 'address', 'email', 'mapEmbedUrl', 'amenities', 'socialLinks'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      site[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
    }
  }

  await site.save();
  return res.json({ success: true, data: site });
}));

router.post('/hero', auth, upload.single('image'), processImage, catchAsync(async (req, res) => {
  if (!req.file?.localPath) return res.status(400).json({ success: false, message: 'No image provided.' });

  let site = await SiteInfo.findOne();
  if (!site) site = new SiteInfo();

  if (isManagedLocalImage(site.heroImage)) await imageService.deleteImage(site.heroImage, 'hero');
  if (site.heroImage?.publicId) await imageService.deleteImage(site.heroImage, 'hero');

  const uploadResult = await imageService.uploadImage(req.file.localPath, 'hero');
  req.file.localPath = null;
  site.heroImage = uploadResult;
  await site.save();
  return res.json({ success: true, data: site });
}));

router.delete('/hero', auth, catchAsync(async (req, res) => {
  let site = await SiteInfo.findOne();
  if (!site) site = new SiteInfo();

  if (isManagedLocalImage(site.heroImage)) await imageService.deleteImage(site.heroImage, 'hero');
  if (site.heroImage?.publicId) await imageService.deleteImage(site.heroImage, 'hero');

  site.heroImage = { url: '/hero.svg', publicId: '' };
  await site.save();
  return res.json({ success: true, data: site });
}));

module.exports = router;

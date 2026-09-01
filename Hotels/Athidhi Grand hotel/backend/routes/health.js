const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: Math.floor(process.uptime()) });
});

module.exports = router;

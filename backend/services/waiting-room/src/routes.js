const express = require('express');
const jwt = require('jsonwebtoken');
const { body, param, validationResult } = require('express-validator');
const { join, getStatus } = require('./waitingRoomService');

const router = express.Router();

const requireUser = (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
  return next();
};

router.post('/join', requireUser, [
  body('eventIds').isArray({ min: 1, max: 10 }),
  body('eventIds.*').isMongoId(),
  body('deviceFingerprint').isString().isLength({ min: 8, max: 256 }),
  validate
], async (req, res, next) => {
  try {
    const data = await join({
      eventIds: req.body.eventIds,
      fingerprint: req.body.deviceFingerprint,
      userId: req.user.id || req.user._id || req.user.sub
    });
    res.status(202).json({ success: true, data });
  } catch (error) { next(error); }
});

router.get('/:entryToken/status', requireUser, [
  param('entryToken').isString().isLength({ min: 20, max: 128 }),
  validate
], async (req, res, next) => {
  try {
    const data = await getStatus(req.params.entryToken);
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
});

module.exports = router;

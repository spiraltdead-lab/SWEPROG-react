const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { sendContactEmail } = require('../services/email.service');

// POST /api/contact
router.post('/', [
  body('name').trim().notEmpty().withMessage('Namn krävs'),
  body('email').isEmail().normalizeEmail().withMessage('Ogiltig e-postadress'),
  body('message').trim().isLength({ min: 5 }).withMessage('Meddelandet är för kort'),
  body('offer').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { name, email, message, offer } = req.body;
  const db = req.app.locals.db;
  const ip = req.ip;

  // 1. Spara i databasen
  let dbOk = false;
  try {
    await db.promise().query(
      `INSERT INTO contact_messages (name, email, offer, message, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, offer || null, message, ip]
    );
    dbOk = true;
    console.log(`📨 Kontaktmeddelande sparat — ${name} <${email}>${offer ? ` [${offer}]` : ''}`);
  } catch (dbErr) {
    console.error('❌ Kunde inte spara kontaktmeddelande:', dbErr.message);
  }

  // 2. Skicka e-post
  let emailOk = false;
  try {
    await sendContactEmail({ name, email, message, offer });
    emailOk = true;
    console.log(`✅ Kontaktmejl skickat till ${process.env.EMAIL_USER}`);

    // Markera e-post som skickad i databasen
    if (dbOk) {
      await db.promise().query(
        `UPDATE contact_messages SET email_sent = 1
         WHERE email = ? AND name = ?
         ORDER BY sent_at DESC LIMIT 1`,
        [email, name]
      );
    }
  } catch (mailErr) {
    console.error('❌ E-postutskick misslyckades:', mailErr.message);
  }

  if (!dbOk && !emailOk) {
    return res.status(500).json({ success: false, message: 'Internt serverfel, försök igen.' });
  }

  res.json({ success: true, message: 'Meddelandet har skickats.' });
});

module.exports = router;

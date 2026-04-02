const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { User, Session, AuditLog } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

// Hjälpfunktion för att skapa JWT och session
const createSession = async (user, req) => {
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 dagar

  await Session.create({
    userId: user.id,
    token,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    expiresAt
  });

  return token;
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password, twoFactorToken } = req.body;

    // Hitta användare
    const user = await User.findOne({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
    }

    // Verifiera lösenord
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
    }

    // Kolla om 2FA är aktiverat
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(200).json({ 
          requiresTwoFactor: true,
          message: '2FA-kod krävs'
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 1
      });

      if (!verified) {
        return res.status(401).json({ error: 'Ogiltig 2FA-kod' });
      }
    }

    // Skapa session
    const token = await createSession(user, req);

    // Uppdatera senaste inloggning
    await user.update({
      lastLoginAt: new Date(),
      lastLoginIp: req.ip
    });

    // Audit log
    await AuditLog.create({
      userId: user.id,
      action: 'LOGIN',
      ipAddress: req.ip
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        languagePreference: user.languagePreference,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ett fel uppstod vid inloggning' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    // Revoke session
    await req.session.update({ isRevoked: true });

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      action: 'LOGOUT',
      ipAddress: req.ip
    });

    res.json({ message: 'Utloggning lyckades' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Ett fel uppstod vid utloggning' });
  }
};

// Logout från alla enheter
exports.logoutAll = async (req, res) => {
  try {
    await Session.update(
      { isRevoked: true },
      { where: { userId: req.user.id, isRevoked: false } }
    );

    await AuditLog.create({
      userId: req.user.id,
      action: 'LOGOUT_ALL',
      ipAddress: req.ip
    });

    res.json({ message: 'Utloggning från alla enheter lyckades' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
};

// Aktiva sessioner
exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.findAll({
      where: { 
        userId: req.user.id,
        isRevoked: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      attributes: ['id', 'ipAddress', 'userAgent', 'createdAt', 'expiresAt']
    });

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
};

// 2FA Setup
exports.setupTwoFactor = async (req, res) => {
  try {
    const user = req.user;

    // Generera hemlighet
    const secret = speakeasy.generateSecret({
      name: `SWEPROG:${user.email}`
    });

    // Spara temporärt (vi aktiverar först efter verifiering)
    req.session.tempTwoFactorSecret = secret.base32;

    // Generera QR-kod
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
};

// Verifiera och aktivera 2FA
exports.verifyAndEnableTwoFactor = async (req, res) => {
  try {
    const { token } = req.body;
    const tempSecret = req.session.tempTwoFactorSecret;

    if (!tempSecret) {
      return res.status(400).json({ error: 'Ingen 2FA-setup pågår' });
    }

    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ error: 'Ogiltig kod' });
    }

    // Aktivera 2FA för användaren
    await req.user.update({
      twoFactorSecret: tempSecret,
      twoFactorEnabled: true
    });

    delete req.session.tempTwoFactorSecret;

    await AuditLog.create({
      userId: req.user.id,
      action: 'ENABLE_2FA',
      ipAddress: req.ip
    });

    res.json({ message: '2FA aktiverat' });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
};

// Avaktivera 2FA
exports.disableTwoFactor = async (req, res) => {
  try {
    const { password } = req.body;

    // Verifiera lösenord
    const isValid = await req.user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Felaktigt lösenord' });
    }

    await req.user.update({
      twoFactorSecret: null,
      twoFactorEnabled: false
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'DISABLE_2FA',
      ipAddress: req.ip
    });

    res.json({ message: '2FA avaktiverat' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
};

// Glömt lösenord - skicka återställningsmail
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Av säkerhetsskäl, svara samma oavsett om användaren finns
      return res.json({ message: 'Om e-postadressen finns i vårt system, har ett återställningsmail skickats' });
    }

    // Generera reset-token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Giltig i 1 timme

    // Spara token i databas (vi behöver en tabell för detta)
    // För enkelhetens skull kan vi lägga till fält i User-modellen
    await user.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires
    });

    // Skicka mail (implementation med nodemailer)
    // const mailOptions = { ... }
    // await transporter.sendMail(mailOptions);

    await AuditLog.create({
      userId: user.id,
      action: 'FORGOT_PASSWORD',
      ipAddress: req.ip
    });

    res.json({ message: 'Om e-postadressen finns i vårt system, har ett återställningsmail skickats' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
};

// Återställ lösenord
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Ogiltig eller utgången återställningslänk' });
    }

    // Uppdatera lösenord
    user.passwordHash = newPassword; // Hashat av hook
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Revoke alla sessioner för användaren
    await Session.update(
      { isRevoked: true },
      { where: { userId: user.id } }
    );

    await AuditLog.create({
      userId: user.id,
      action: 'RESET_PASSWORD',
      ipAddress: req.ip
    });

    res.json({ message: 'Lösenordet har återställts' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Ett fel uppstod' });
  }
};
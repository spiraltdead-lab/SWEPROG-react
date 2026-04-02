'use strict';

/**
 * Centralized i18n for backend — email templates and API messages.
 *
 * All user-facing strings (emails, API error/success messages) live here.
 * Usage:
 *   const { tEmail, tApi, validateLang } = require('../i18n');
 *   const lang = validateLang(req.body.lang);
 *   res.json({ message: tApi(lang, 'password.genericForgot') });
 */

const SUPPORTED_LANGS = ['sv', 'en', 'ar'];
const DEFAULT_LANG    = 'sv';

/** Return lang if supported, else DEFAULT_LANG. */
function validateLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

/** Traverse object by dot-notation path. Returns null if not found. */
function get(obj, path) {
  return path.split('.').reduce(
    (o, k) => (o != null && o[k] !== undefined ? o[k] : null),
    obj
  );
}

// ─── EMAIL TRANSLATIONS ────────────────────────────────────────────────────────

const emailTranslations = {
  sv: {
    welcome: {
      subject:    'Välkommen till SWEPROG, {{name}}!',
      preheader:  'Ditt konto är skapat och redo att användas.',
      title:      'Välkommen!',
      greeting:   'Hej {{name}},',
      body:       'Ditt konto har skapats och är redo att användas. Du kan nu logga in och utforska våra tjänster.',
      loginButton: 'Logga in',
      spamNote:   'Fick du det här mejlet av misstag? Kontakta oss på hello@sweprog.se.',
      footer:     'Detta är ett automatgenererat meddelande. Svara inte på det.'
    },
    resetPassword: {
      subject:    'Återställ ditt lösenord – SWEPROG',
      preheader:  'Klicka på länken nedan för att välja ett nytt lösenord för ditt konto.',
      title:      'Återställ ditt lösenord',
      greeting:   'Hej,',
      body:       'Vi mottog en begäran om att återställa lösenordet för ditt konto. Klicka på knappen nedan för att välja ett nytt lösenord.',
      button:     'Återställ lösenord',
      expiry:     'Länken är giltig i 1 timme.',
      ignoreNote: 'Om du inte begärde denna återställning kan du ignorera det här mejlet — ditt lösenord förblir oförändrat.',
      spamNote:   'Hittar du inte mejlet? Kontrollera din skräppost- eller junk-mapp.',
      linkLabel:  'Eller klistra in länken direkt i webbläsaren:',
      footer:     'Detta är ett automatgenererat meddelande. Svara inte på det.'
    }
  },
  en: {
    welcome: {
      subject:     'Welcome to SWEPROG, {{name}}!',
      preheader:   'Your account is created and ready to use.',
      title:       'Welcome!',
      greeting:    'Hi {{name}},',
      body:        'Your account has been created and is ready to use. You can now log in and explore our services.',
      loginButton: 'Log in',
      spamNote:    'Received this by mistake? Contact us at hello@sweprog.se.',
      footer:      'This is an automated message. Please do not reply.'
    },
    resetPassword: {
      subject:    'Reset your password – SWEPROG',
      preheader:  'Click the link below to choose a new password for your account.',
      title:      'Reset your password',
      greeting:   'Hello,',
      body:       'We received a request to reset the password for your account. Click the button below to choose a new password.',
      button:     'Reset password',
      expiry:     'The link is valid for 1 hour.',
      ignoreNote: 'If you did not request this reset, you can ignore this email — your password remains unchanged.',
      spamNote:   "Can't find the email? Check your spam or junk folder.",
      linkLabel:  'Or paste the link directly in your browser:',
      footer:     'This is an automated message. Please do not reply.'
    }
  },
  ar: {
    welcome: {
      subject:     'مرحباً بك في SWEPROG، {{name}}!',
      preheader:   'تم إنشاء حسابك وهو جاهز للاستخدام.',
      title:       'مرحباً بك!',
      greeting:    'مرحباً {{name}}،',
      body:        'تم إنشاء حسابك وهو جاهز للاستخدام. يمكنك الآن تسجيل الدخول واستكشاف خدماتنا.',
      loginButton: 'تسجيل الدخول',
      spamNote:    'تلقيت هذا البريد عن طريق الخطأ؟ تواصل معنا على hello@sweprog.se.',
      footer:      'هذه رسالة تلقائية. يرجى عدم الرد عليها.'
    },
    resetPassword: {
      subject:    'إعادة تعيين كلمة المرور – SWEPROG',
      preheader:  'انقر على الرابط أدناه لاختيار كلمة مرور جديدة لحسابك.',
      title:      'إعادة تعيين كلمة المرور',
      greeting:   'مرحباً،',
      body:       'تلقينا طلباً لإعادة تعيين كلمة مرور حسابك. انقر على الزر أدناه لاختيار كلمة مرور جديدة.',
      button:     'إعادة تعيين كلمة المرور',
      expiry:     'الرابط صالح لمدة ساعة واحدة.',
      ignoreNote: 'إذا لم تطلب إعادة التعيين هذه، يمكنك تجاهل هذا البريد الإلكتروني — ستبقى كلمة مرورك دون تغيير.',
      spamNote:   'ألا تجد البريد؟ تحقق من مجلد البريد غير الهام أو البريد العشوائي.',
      linkLabel:  'أو الصق الرابط مباشرة في متصفحك:',
      footer:     'هذه رسالة تلقائية. يرجى عدم الرد عليها.'
    }
  }
};

// ─── API MESSAGE TRANSLATIONS ──────────────────────────────────────────────────

const apiTranslations = {
  sv: {
    password: {
      genericForgot:            'Om e-postadressen finns i systemet får du ett meddelande inom kort. Hittar du det inte — kontrollera skräppostmappen.',
      invalidEmail:             'Ogiltig e-postadress',
      tokenRequired:            'Token krävs',
      passwordTooShort:         'Lösenordet måste vara minst 8 tecken',
      currentPasswordRequired:  'Nuvarande lösenord krävs',
      currentPasswordWrong:     'Nuvarande lösenord är felaktigt',
      userNotFound:             'Användaren hittades inte',
      tokenInvalid:             'Länken är ogiltig eller har gått ut',
      updated:                  'Lösenordet har uppdaterats',
      reset:                    'Lösenordet har återställts. Du kan nu logga in.',
      accessDenied:             'Åtkomst nekad',
      noPermission:             'Du har inte behörighet att ändra det kontots lösenord',
      tooManyRequests:          'För många förfrågningar, försök igen om 15 minuter',
      serverError:              'Något gick fel. Försök igen.'
    }
  },
  en: {
    password: {
      genericForgot:            "If the email address exists in the system you will receive a message shortly. Can't find it — check your spam folder.",
      invalidEmail:             'Invalid email address',
      tokenRequired:            'Token is required',
      passwordTooShort:         'Password must be at least 8 characters',
      currentPasswordRequired:  'Current password is required',
      currentPasswordWrong:     'Current password is incorrect',
      userNotFound:             'User not found',
      tokenInvalid:             'The link is invalid or has expired',
      updated:                  'Password has been updated',
      reset:                    'Password has been reset. You can now log in.',
      accessDenied:             'Access denied',
      noPermission:             'You do not have permission to change that account\'s password',
      tooManyRequests:          'Too many requests, please try again in 15 minutes',
      serverError:              'Something went wrong. Please try again.'
    }
  },
  ar: {
    password: {
      genericForgot:            'إذا كان البريد الإلكتروني موجوداً في النظام ستتلقى رسالة قريباً. لا تجدها؟ تحقق من مجلد البريد غير الهام.',
      invalidEmail:             'عنوان بريد إلكتروني غير صالح',
      tokenRequired:            'الرمز مطلوب',
      passwordTooShort:         'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      currentPasswordRequired:  'كلمة المرور الحالية مطلوبة',
      currentPasswordWrong:     'كلمة المرور الحالية غير صحيحة',
      userNotFound:             'المستخدم غير موجود',
      tokenInvalid:             'الرابط غير صالح أو منتهي الصلاحية',
      updated:                  'تم تحديث كلمة المرور',
      reset:                    'تم إعادة تعيين كلمة المرور. يمكنك الآن تسجيل الدخول.',
      accessDenied:             'تم رفض الوصول',
      noPermission:             'ليس لديك صلاحية لتغيير كلمة مرور هذا الحساب',
      tooManyRequests:          'طلبات كثيرة جداً، يرجى المحاولة مرة أخرى بعد 15 دقيقة',
      serverError:              'حدث خطأ ما. يرجى المحاولة مرة أخرى.'
    }
  }
};

// ─── Translation helpers ────────────────────────────────────────────────────────

/**
 * Get an email translation string.
 * @param {string} lang
 * @param {string} path  Dot-notation key, e.g. 'resetPassword.subject'
 */
function tEmail(lang, path) {
  const l   = validateLang(lang);
  const val = get(emailTranslations[l], path) ?? get(emailTranslations[DEFAULT_LANG], path);
  return val ?? path;
}

/**
 * Get an API message translation string.
 * @param {string} lang
 * @param {string} path  Dot-notation key, e.g. 'password.genericForgot'
 */
function tApi(lang, path) {
  const l   = validateLang(lang);
  const val = get(apiTranslations[l], path) ?? get(apiTranslations[DEFAULT_LANG], path);
  return val ?? path;
}

module.exports = { validateLang, tEmail, tApi, SUPPORTED_LANGS, DEFAULT_LANG };

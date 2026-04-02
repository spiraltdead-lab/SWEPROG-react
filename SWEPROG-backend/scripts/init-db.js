/**
 * init-db.js — Skapar samtliga tabeller och en superadmin-användare.
 * Kör med: node scripts/init-db.js
 */
require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function main() {
  // Anslut utan att specificera databas först, så vi kan skapa den om den saknas
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const dbName = process.env.DB_NAME;
  if (!dbName) throw new Error('DB_NAME saknas i .env');

  console.log(`\n🗄️  Initierar databas: ${dbName}\n`);

  // Skapa databas om den inte finns
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${dbName}\``);

  // ─── TABELLER ─────────────────────────────────────────────────────────────

  // users
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                  INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name                VARCHAR(255) NOT NULL,
      email               VARCHAR(255) NOT NULL UNIQUE,
      password_hash       VARCHAR(255) NOT NULL,
      role                ENUM('super_admin','admin','user','guest') NOT NULL DEFAULT 'guest',
      two_factor_secret   VARCHAR(255)  DEFAULT NULL,
      two_factor_enabled  TINYINT(1)    NOT NULL DEFAULT 0,
      language_preference ENUM('sv','en','ar') NOT NULL DEFAULT 'sv',
      is_active           TINYINT(1)    NOT NULL DEFAULT 1,
      last_login_at       DATETIME      DEFAULT NULL,
      last_login_ip       VARCHAR(45)   DEFAULT NULL,
      created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: users');

  // sessions
  await conn.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id    INT          NOT NULL,
      token      VARCHAR(512) NOT NULL,
      ip_address VARCHAR(45)  DEFAULT NULL,
      user_agent TEXT         DEFAULT NULL,
      expires_at DATETIME     NOT NULL,
      is_revoked TINYINT(1)   NOT NULL DEFAULT 0,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: sessions');

  // audit_logs
  await conn.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id     INT          DEFAULT NULL,
      action      VARCHAR(255) NOT NULL,
      entity_type VARCHAR(100) DEFAULT NULL,
      entity_id   INT          DEFAULT NULL,
      old_values  JSON         DEFAULT NULL,
      new_values  JSON         DEFAULT NULL,
      ip_address  VARCHAR(45)  DEFAULT NULL,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: audit_logs');

  // projects
  await conn.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id               INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title_sv         VARCHAR(255)   NOT NULL,
      title_en         VARCHAR(255)   DEFAULT NULL,
      title_ar         VARCHAR(255)   DEFAULT NULL,
      description_sv   TEXT           DEFAULT NULL,
      description_en   TEXT           DEFAULT NULL,
      description_ar   TEXT           DEFAULT NULL,
      status           ENUM('new','ongoing','completed') NOT NULL DEFAULT 'new',
      price            DECIMAL(12,2)  DEFAULT NULL,
      start_date       DATE           DEFAULT NULL,
      deadline         DATE           DEFAULT NULL,
      contact_person   VARCHAR(255)   DEFAULT NULL,
      client_name      VARCHAR(255)   DEFAULT NULL,
      client_email     VARCHAR(255)   DEFAULT NULL,
      client_phone     VARCHAR(50)    DEFAULT NULL,
      internal_comment TEXT           DEFAULT NULL,
      is_demo          TINYINT(1)     NOT NULL DEFAULT 0,
      created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: projects');

  // project_technologies
  await conn.query(`
    CREATE TABLE IF NOT EXISTS project_technologies (
      id              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      project_id      INT          NOT NULL,
      technology_name VARCHAR(100) NOT NULL,
      CONSTRAINT fk_pt_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: project_technologies');

  // demo_projects — samma struktur som projects, separata data för gäster
  await conn.query(`
    CREATE TABLE IF NOT EXISTS demo_projects (
      id               INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title_sv         VARCHAR(255)   NOT NULL,
      title_en         VARCHAR(255)   DEFAULT NULL,
      title_ar         VARCHAR(255)   DEFAULT NULL,
      description_sv   TEXT           DEFAULT NULL,
      description_en   TEXT           DEFAULT NULL,
      description_ar   TEXT           DEFAULT NULL,
      status           ENUM('new','ongoing','completed') NOT NULL DEFAULT 'new',
      price            DECIMAL(12,2)  DEFAULT NULL,
      start_date       DATE           DEFAULT NULL,
      deadline         DATE           DEFAULT NULL,
      contact_person   VARCHAR(255)   DEFAULT NULL,
      client_name      VARCHAR(255)   DEFAULT NULL,
      client_email     VARCHAR(255)   DEFAULT NULL,
      client_phone     VARCHAR(50)    DEFAULT NULL,
      internal_comment TEXT           DEFAULT NULL,
      is_demo          TINYINT(1)     NOT NULL DEFAULT 1,
      created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: demo_projects');

  // demo_project_technologies
  await conn.query(`
    CREATE TABLE IF NOT EXISTS demo_project_technologies (
      id              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      project_id      INT          NOT NULL,
      technology_name VARCHAR(100) NOT NULL,
      CONSTRAINT fk_dpt_project FOREIGN KEY (project_id) REFERENCES demo_projects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: demo_project_technologies');

  // contact_messages
  await conn.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      email      VARCHAR(255) NOT NULL,
      offer      VARCHAR(255) DEFAULT NULL,
      message    TEXT         NOT NULL,
      ip_address VARCHAR(45)  DEFAULT NULL,
      email_sent TINYINT(1)   NOT NULL DEFAULT 0,
      sent_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: contact_messages');

  // Migrering: lägg till kolumner som kan saknas i befintliga installationer
  const migrations = [
    { col: 'offer',      sql: `ALTER TABLE contact_messages ADD COLUMN offer VARCHAR(255) DEFAULT NULL AFTER email` },
    { col: 'ip_address', sql: `ALTER TABLE contact_messages ADD COLUMN ip_address VARCHAR(45) DEFAULT NULL AFTER message` },
    { col: 'email_sent', sql: `ALTER TABLE contact_messages ADD COLUMN email_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER ip_address` },
    { col: 'sent_at',    sql: `ALTER TABLE contact_messages ADD COLUMN sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` },
  ];
  for (const m of migrations) {
    const [rows] = await conn.query(`SHOW COLUMNS FROM contact_messages LIKE '${m.col}'`);
    if (rows.length === 0) {
      await conn.query(m.sql);
      console.log(`🔧 Migrering: kolumn ${m.col} tillagd i contact_messages`);
    }
  }

  // password_reset_tokens
  await conn.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id    INT          NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME     NOT NULL,
      used_at    DATETIME     DEFAULT NULL,
      ip_address VARCHAR(45)  DEFAULT NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: password_reset_tokens');

  // password_change_log
  await conn.query(`
    CREATE TABLE IF NOT EXISTS password_change_log (
      id             INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      action         VARCHAR(100) NOT NULL,
      actor_user_id  INT          DEFAULT NULL,
      target_user_id INT          NOT NULL,
      ip_address     VARCHAR(45)  DEFAULT NULL,
      metadata       JSON         DEFAULT NULL,
      created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_pcl_actor  FOREIGN KEY (actor_user_id)  REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_pcl_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Tabell: password_change_log');

  // ─── SUPERADMIN ──────────────────────────────────────────────────────────

  const ADMIN_EMAIL = 'admin@sweprog.se';
  const ADMIN_NAME  = 'Super Admin';
  const ADMIN_PASS  = 'Admin123';

  const [existing] = await conn.query(
    'SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]
  );

  if (existing.length > 0) {
    console.log(`\nℹ️  Superadmin finns redan (${ADMIN_EMAIL}) — hoppar över.`);
  } else {
    const hash = await bcrypt.hash(ADMIN_PASS, 10);
    await conn.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, 'super_admin', 1)`,
      [ADMIN_NAME, ADMIN_EMAIL, hash]
    );
    console.log(`\n🔐 Superadmin skapad:`);
    console.log(`   E-post  : ${ADMIN_EMAIL}`);
    console.log(`   Lösenord: ${ADMIN_PASS}`);
  }

  // ─── DEMO-DATA ────────────────────────────────────────────────────────────

  const [demoCount] = await conn.query('SELECT COUNT(*) AS n FROM demo_projects');
  if (demoCount[0].n === 0) {
    const [p1] = await conn.query(`
      INSERT INTO demo_projects (title_sv, title_en, description_sv, status, price, start_date, deadline, client_name, contact_person)
      VALUES (
        'Bokningssystem för Städbolaget',
        'Booking system for Städbolaget',
        'Komplett bokningssystem med kalenderintegration, SMS-påminnelser och kundportal.',
        'completed', 85000, '2025-01-10', '2025-04-10',
        'Städbolaget AB', 'Anna Lindgren'
      )
    `);
    await conn.query(
      'INSERT INTO demo_project_technologies (project_id, technology_name) VALUES (?,?),(?,?),(?,?)',
      [p1.insertId,'React', p1.insertId,'Node.js', p1.insertId,'PostgreSQL']
    );

    const [p2] = await conn.query(`
      INSERT INTO demo_projects (title_sv, title_en, description_sv, status, price, start_date, deadline, client_name, contact_person)
      VALUES (
        'E-handelsplattform för Modehuset',
        'E-commerce platform for Modehuset',
        'Modern plattform med Klarna, Stripe och lagerhantering i realtid.',
        'ongoing', 140000, '2025-03-01', '2025-08-01',
        'Modehuset Sverige AB', 'Erik Svensson'
      )
    `);
    await conn.query(
      'INSERT INTO demo_project_technologies (project_id, technology_name) VALUES (?,?),(?,?),(?,?)',
      [p2.insertId,'Angular', p2.insertId,'NestJS', p2.insertId,'MongoDB']
    );

    const [p3] = await conn.query(`
      INSERT INTO demo_projects (title_sv, title_en, description_sv, status, price, start_date, deadline, client_name, contact_person)
      VALUES (
        'AI-kundtjänst för TeleSupport',
        'AI customer service for TeleSupport',
        'Chatbot med maskininlärning som automatiserar 80%% av alla kundärenden.',
        'new', 220000, '2025-06-01', '2025-12-01',
        'TeleSupport Nordic', 'Sara Karlsson'
      )
    `);
    await conn.query(
      'INSERT INTO demo_project_technologies (project_id, technology_name) VALUES (?,?),(?,?),(?,?)',
      [p3.insertId,'Python', p3.insertId,'TensorFlow', p3.insertId,'OpenAI']
    );

    console.log('\n✅ Demo-projekt seedade (3 st)');
  } else {
    console.log('\nℹ️  Demo-projekt finns redan — hoppar över.');
  }

  await conn.end();
  console.log('\n🚀 Databas initierad! Du kan nu starta servern med: npm run dev\n');
}

main().catch(err => {
  console.error('\n❌ Init misslyckades:', err.message);
  process.exit(1);
});

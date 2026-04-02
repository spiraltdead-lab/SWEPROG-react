const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');

// ─── Auth middleware ────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Ingen token angiven' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Ogiltig token' });
    req.user = user;
    next();
  });
};

// ─── GET /api/projects ──────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const db       = req.app.locals.db;
    const role     = req.user.role;
    const { status, search } = req.query;

    // Gäster ser demo-tabellen, alla andra ser riktiga projekt
    const table    = role === 'guest' ? 'demo_projects'            : 'projects';
    const techTbl  = role === 'guest' ? 'demo_project_technologies': 'project_technologies';

    let sql = `
      SELECT p.*,
             GROUP_CONCAT(DISTINCT pt.technology_name) AS technologies
      FROM ${table} p
      LEFT JOIN ${techTbl} pt ON p.id = pt.project_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'alla') {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (p.title_sv LIKE ? OR p.client_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const [rows] = await db.promise().query(sql, params);

    const projects = rows.map(p => ({
      ...p,
      technologies: p.technologies ? p.technologies.split(',') : []
    }));

    res.json(projects);
  } catch (err) {
    console.error('GET /projects fel:', err);
    res.status(500).json({ error: 'Kunde inte hämta projekt' });
  }
});

// ─── GET /api/projects/:id ──────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const db    = req.app.locals.db;
    const role  = req.user.role;
    const table = role === 'guest' ? 'demo_projects'             : 'projects';
    const techTbl = role === 'guest' ? 'demo_project_technologies': 'project_technologies';

    const [rows] = await db.promise().query(
      `SELECT p.*, GROUP_CONCAT(DISTINCT pt.technology_name) AS technologies
       FROM ${table} p
       LEFT JOIN ${techTbl} pt ON p.id = pt.project_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Projektet hittades inte' });
    }

    const project = rows[0];
    project.technologies = project.technologies ? project.technologies.split(',') : [];
    res.json(project);
  } catch (err) {
    console.error('GET /projects/:id fel:', err);
    res.status(500).json({ error: 'Kunde inte hämta projekt' });
  }
});

// ─── POST /api/projects ─────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  // Endast admin/super_admin får skapa projekt
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Inte behörig' });
  }

  try {
    const db = req.app.locals.db;
    const {
      title_sv, title_en, title_ar,
      description_sv, description_en, description_ar,
      status = 'new', price, start_date, deadline,
      contact_person, client_name, client_email, client_phone,
      internal_comment, technologies = []
    } = req.body;

    if (!title_sv) {
      return res.status(400).json({ error: 'title_sv är obligatoriskt' });
    }

    const [result] = await db.promise().query(
      `INSERT INTO projects
         (title_sv, title_en, title_ar,
          description_sv, description_en, description_ar,
          status, price, start_date, deadline,
          contact_person, client_name, client_email, client_phone,
          internal_comment)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title_sv, title_en || null, title_ar || null,
        description_sv || null, description_en || null, description_ar || null,
        status, price || null, start_date || null, deadline || null,
        contact_person || null, client_name || null,
        client_email || null, client_phone || null,
        internal_comment || null
      ]
    );

    const projectId = result.insertId;

    // Spara teknologier
    if (technologies.length > 0) {
      const techValues = technologies.map(t => [projectId, t]);
      await db.promise().query(
        'INSERT INTO project_technologies (project_id, technology_name) VALUES ?',
        [techValues]
      );
    }

    res.status(201).json({ id: projectId, message: 'Projekt skapat' });
  } catch (err) {
    console.error('POST /projects fel:', err);
    res.status(500).json({ error: 'Kunde inte skapa projekt' });
  }
});

// ─── PUT /api/projects/:id ──────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Inte behörig' });
  }

  try {
    const db = req.app.locals.db;
    const {
      title_sv, title_en, title_ar,
      description_sv, description_en, description_ar,
      status, price, start_date, deadline,
      contact_person, client_name, client_email, client_phone,
      internal_comment, technologies = []
    } = req.body;

    await db.promise().query(
      `UPDATE projects SET
         title_sv=?, title_en=?, title_ar=?,
         description_sv=?, description_en=?, description_ar=?,
         status=?, price=?, start_date=?, deadline=?,
         contact_person=?, client_name=?, client_email=?, client_phone=?,
         internal_comment=?, updated_at=NOW()
       WHERE id=?`,
      [
        title_sv, title_en || null, title_ar || null,
        description_sv || null, description_en || null, description_ar || null,
        status, price || null, start_date || null, deadline || null,
        contact_person || null, client_name || null,
        client_email || null, client_phone || null,
        internal_comment || null,
        req.params.id
      ]
    );

    // Uppdatera teknologier — ta bort gamla, lägg till nya
    await db.promise().query(
      'DELETE FROM project_technologies WHERE project_id = ?',
      [req.params.id]
    );

    if (technologies.length > 0) {
      const techValues = technologies.map(t => [req.params.id, t]);
      await db.promise().query(
        'INSERT INTO project_technologies (project_id, technology_name) VALUES ?',
        [techValues]
      );
    }

    res.json({ message: 'Projekt uppdaterat' });
  } catch (err) {
    console.error('PUT /projects/:id fel:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera projekt' });
  }
});

// ─── DELETE /api/projects/:id ───────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Inte behörig' });
  }

  try {
    const db = req.app.locals.db;

    // Ta bort teknologier först (foreign key)
    await db.promise().query(
      'DELETE FROM project_technologies WHERE project_id = ?',
      [req.params.id]
    );

    await db.promise().query(
      'DELETE FROM projects WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: 'Projekt borttaget' });
  } catch (err) {
    console.error('DELETE /projects/:id fel:', err);
    res.status(500).json({ error: 'Kunde inte ta bort projekt' });
  }
});

module.exports = router;

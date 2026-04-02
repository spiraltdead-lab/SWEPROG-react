const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Middleware för att verifiera JWT-token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Ingen token angiven' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-123', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Ogiltig token' });
        }
        req.user = user;
        next();
    });
};

// Hämta alla projekt (med filter)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { status, search } = req.query;
        
        let query = `
            SELECT p.*, 
                   GROUP_CONCAT(DISTINCT pt.technology_name) as technologies
            FROM projects p
            LEFT JOIN project_technologies pt ON p.id = pt.project_id
            WHERE 1=1
        `;
        let params = [];
        
        if (status && status !== 'alla') {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        if (search) {
            query += ' AND (p.title_sv LIKE ? OR p.client_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' GROUP BY p.id ORDER BY p.created_at DESC';
        
        const [projects] = await db.promise().query(query, params);
        
        // Formatera om technologies från sträng till array
        const formattedProjects = projects.map(p => ({
            ...p,
            technologies: p.technologies ? p.technologies.split(',') : []
        }));
        
        res.json(formattedProjects);
    } catch (error) {
        console.error('❌ Error fetching projects:', error);
        res.status(500).json({ error: 'Kunde inte hämta projekt' });
    }
});

// Hämta ett specifikt projekt
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const [projects] = await db.promise().query(
            `SELECT p.*, 
                    GROUP_CONCAT(DISTINCT pt.technology_name) as technologies
             FROM projects p
             LEFT JOIN project_technologies pt ON p.id = pt.project_id
             WHERE p.id = ?
             GROUP BY p.id`,
            [req.params.id]
        );
        
        if (projects.length === 0) {
            return res.status(404).json({ error: 'Projektet hittades inte' });
        }
        
        const project = projects[0];
        project.technologies = project.technologies ? project.technologies.split(',') : [];
        
        // Hämta media för projektet
        const [media] = await db.promise().query(
            'SELECT * FROM project_media WHERE project_id = ? ORDER BY is_primary DESC',
            [req.params.id]
        );
        
        project.media = media;
        
        res.json(project);
    } catch (error) {
        console.error('❌ Error fetching project:', error);
        res.status(500).json({ error: 'Kunde inte hämta projektet' });
    }
});

// Skapa nytt projekt
router.post('/', authenticateToken, [
    body('title_sv').notEmpty().withMessage('Titel krävs'),
    body('status').isIn(['new', 'Ongoing', 'Completed']),
    body('price').optional().isNumeric(),
    body('start_date').optional().isDate(),
    body('deadline').optional().isDate()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const db = req.app.locals.db;
        const {
            title_sv, title_en, title_ar,
            description_sv, description_en, description_ar,
            status, price, start_date, deadline,
            contact_person, client_name, client_email, client_phone,
            internal_comment, technologies
        } = req.body;

        // Börja transaktion
        await db.promise().beginTransaction();

        // Skapa projektet
        const [result] = await db.promise().query(
            `INSERT INTO projects (
                title_sv, title_en, title_ar,
                description_sv, description_en, description_ar,
                status, price, start_date, deadline,
                contact_person, client_name, client_email, client_phone,
                internal_comment, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title_sv, title_en || null, title_ar || null,
                description_sv || null, description_en || null, description_ar || null,
                status, price || null, start_date || null, deadline || null,
                contact_person || null, client_name || null, client_email || null, client_phone || null,
                internal_comment || null, req.user.userId
            ]
        );

        const projectId = result.insertId;

        // Lägg till teknologier
        if (technologies && technologies.length > 0) {
            for (const tech of technologies) {
                await db.promise().query(
                    'INSERT INTO project_technologies (project_id, technology_name, category) VALUES (?, ?, ?)',
                    [projectId, tech.name, tech.category || 'backend']
                );
            }
        }

        // Commit transaktion
        await db.promise().commit();

        res.status(201).json({
            message: 'Projekt skapat',
            projectId: projectId
        });

    } catch (error) {
        await db.promise().rollback();
        console.error('❌ Error creating project:', error);
        res.status(500).json({ error: 'Kunde inte skapa projekt' });
    }
});

// Uppdatera projekt
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const {
            title_sv, title_en, title_ar,
            description_sv, description_en, description_ar,
            status, price, start_date, deadline, completed_date,
            contact_person, client_name, client_email, client_phone,
            internal_comment
        } = req.body;

        await db.promise().query(
            `UPDATE projects SET
                title_sv = ?, title_en = ?, title_ar = ?,
                description_sv = ?, description_en = ?, description_ar = ?,
                status = ?, price = ?, start_date = ?, deadline = ?,
                completed_date = ?, contact_person = ?, client_name = ?,
                client_email = ?, client_phone = ?, internal_comment = ?
             WHERE id = ?`,
            [
                title_sv, title_en, title_ar,
                description_sv, description_en, description_ar,
                status, price, start_date, deadline,
                completed_date, contact_person, client_name,
                client_email, client_phone, internal_comment,
                req.params.id
            ]
        );

        res.json({ message: 'Projekt uppdaterat' });

    } catch (error) {
        console.error('❌ Error updating project:', error);
        res.status(500).json({ error: 'Kunde inte uppdatera projekt' });
    }
});

// Ta bort projekt (mjuk radering eller hård?)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Alternativ 1: Hård radering
        await db.promise().query('DELETE FROM projects WHERE id = ?', [req.params.id]);
        
        // Alternativ 2: Mjuk radering (om vi vill behålla data)
        // await db.promise().query('UPDATE projects SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Projekt borttaget' });

    } catch (error) {
        console.error('❌ Error deleting project:', error);
        res.status(500).json({ error: 'Kunde inte ta bort projekt' });
    }
});

module.exports = router;
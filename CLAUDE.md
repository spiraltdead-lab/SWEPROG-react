# SWEPROG — Projektöversikt för Claude

## Stack

**Backend** (`SWEPROG-backend/`)
- Node.js + Express 4.18
- MySQL via `mysql2`
- JWT-autentisering (`jsonwebtoken`)
- Lösenordshashning med `bcrypt`
- Validering med `express-validator`
- Startas med `npm run dev` (nodemon)

**Frontend** (`SWEPROG-frontend/`)
- Angular 20
- Angular Material + CDK
- Three.js, GSAP, Spline för 3D/animationer
- Chart.js + ng2-charts för diagram
- Startas med `npm start` (ng serve, port 4200)

## Mappstruktur

```
SWEPROG/
├── SWEPROG-backend/
│   ├── src/
│   │   ├── config/        # Databaskonfiguration
│   │   ├── controllers/   # Route-handlers
│   │   ├── middleware/    # Auth-middleware m.m.
│   │   ├── models/        # Databasmodeller
│   │   ├── routes/        # Express-rutter
│   │   └── services/      # Affärslogik
│   ├── server.js          # Entry point
│   └── .env               # Miljövariabler (ej i git)
└── SWEPROG-frontend/
    └── src/
        └── app/
            ├── auth/          # Inloggning/registrering
            ├── dashboard/     # Dashboardvy
            ├── admin/         # Adminpanel
            ├── projects/      # Projektvyer
            ├── profile/       # Profilsidor
            ├── services/      # Angular-tjänster (HTTP m.m.)
            └── guards/        # Route guards
```

## Starta projektet lokalt

```bash
# Backend
cd SWEPROG-backend
npm install
cp .env.example .env   # fyll i dina värden
npm run dev            # startar på port 3000 (eller vad .env säger)

# Frontend (nytt terminalfönster)
cd SWEPROG-frontend
npm install
npm start              # startar på http://localhost:4200
```

## Viktiga konventioner

### Säkerhet
- **Aldrig** hårdkodade JWT-fallbacks. `process.env.JWT_SECRET` måste alltid vara satt — kasta ett fel vid uppstart om den saknas, returnera aldrig en fallback-sträng.
- Alla hemliga värden (DB-lösenord, JWT-secret, API-nycklar) hör hemma i `.env` och ska aldrig committas.

### Databas
- Använd alltid `db.promise().query()` för databasanrop — aldrig callback-baserade `db.query()`.
- Håll SQL-queries i modeller eller services, inte direkt i controllers.

### API
- Alla endpoints returnerar `{ success: boolean, data/message }` som standardformat.
- Auth-skyddade rutter använder `authenticate`-middleware från `src/middleware/`.

### Frontend
- Kommunikation med backend sker uteslutande via Angular-services i `src/app/services/`.
- Route guards i `src/app/guards/` skyddar inloggade rutter.

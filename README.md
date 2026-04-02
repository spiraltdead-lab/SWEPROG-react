# SWEPROG

En plattform för att matcha studenter med företag inom mjukvaruutveckling. Hanterar projekt, profiler, ansökningar och admin-funktioner i ett monorepo med separat backend och frontend.

## Teknikstack

| Del | Teknologi |
|-----|-----------|
| Backend | Node.js, Express, MySQL |
| Frontend | Angular 20, Angular Material, Three.js |
| Auth | JWT + bcrypt |

## Kom igång lokalt

### Förutsättningar
- Node.js 18+
- MySQL-server

### Backend

```bash
cd SWEPROG-backend
npm install
cp .env.example .env    # Fyll i DB-uppgifter och JWT_SECRET
npm run dev             # Körs på http://localhost:3000
```

### Frontend

```bash
cd SWEPROG-frontend
npm install
npm start               # Körs på http://localhost:4200
```

## Projektstruktur

```
SWEPROG/
├── SWEPROG-backend/   # Express API
└── SWEPROG-frontend/  # Angular-app
```

Se [CLAUDE.md](./CLAUDE.md) för detaljerade konventioner och arkitekturinformation.

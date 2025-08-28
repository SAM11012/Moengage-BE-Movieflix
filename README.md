# MovieFlix Dashboard Backend

A comprehensive Node.js backend for a movie dashboard application. Features include authentication, movie search (TMDB/OMDB), analytics, caching, and integration with MongoDB Atlas. Easily deployable to Render.

## Features

- User authentication (JWT)
- Movie search via TMDB and OMDB APIs
- Trending movies endpoint
- Analytics endpoints
- Caching with MongoDB TTL
- Rate limiting and security middleware
- Health check and API documentation endpoints

## Technologies

- Node.js
- Express
- MongoDB Atlas (via Mongoose)
- TMDB & OMDB APIs
- JWT authentication
- Winston logging
- Helmet, CORS, Rate Limiting

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB Atlas account
- TMDB and OMDB API keys

### Installation

```bash
git clone https://github.com/SAM11012/Movie-Monengae-BE.git
cd Movie-Monengae-BE
npm install
```

### Environment Variables

Create a `.env` file in the root directory with the following:

```
NODE_ENV=development
PORT=5173
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
OMDB_API_KEY=your_omdb_api_key
TMDB_API_KEY=your_tmdb_api_key
CACHE_EXPIRE_HOURS=24
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

### Running Locally

```bash
npm start
```

The server will run on `http://localhost:5173` (or the port specified in `.env`).

## API Endpoints

### Auth

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Forgot password (reset via email)
- `POST /api/auth/change-password` - Change password (authenticated)
- `POST /api/auth/logout` - Logout

### Movies

- `GET /api/movies/search?search=...&page=...` - Search movies
- `GET /api/movies/trending` - Get trending movies (TMDB)
- `GET /api/movies/:id` - Get movie details

### Analytics

- `GET /api/analytics/...` - Analytics endpoints

### Health & Docs

- `GET /api/health` - Health check
- `GET /api` - API documentation

## Deployment (Render)

1. Push your code to GitHub.
2. Create a new Web Service on [Render](https://dashboard.render.com/).
3. Connect your repo and set build/start commands:
   - Build: `npm install`
   - Start: `npm start`
4. Add environment variables from your `.env`.
5. Ensure MongoDB Atlas allows connections from Render.
6. Deploy and monitor logs.

## Notes

- CORS is configured for both local and deployed frontend domains.
- Ensure your MongoDB URI specifies the correct database name.
- For production, update allowed origins in CORS config.

## License

ISC

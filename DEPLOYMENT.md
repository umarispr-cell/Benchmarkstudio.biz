# Deployment Guide

## Backend Deployment (Railway)

### Prerequisites
- GitHub account
- Railway account (https://railway.app)

### Step 1: Generate Application Key
```bash
cd backend
php artisan key:generate --show
```
Copy the output (starts with `base64:...`)

### Step 2: Deploy to Railway

1. Go to [Railway](https://railway.app) and login
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `umarispr-cell/Benchmarkstudio.biz`
4. Click **Add variables** and set:
   ```
   APP_NAME="Benchmark Studio"
   APP_ENV=production
   APP_KEY=base64:YOUR_KEY_FROM_STEP_1
   APP_DEBUG=false
   APP_URL=https://your-app.railway.app
   DB_CONNECTION=sqlite
   SESSION_DRIVER=database
   CACHE_STORE=database
   CORS_ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
   SANCTUM_STATEFUL_DOMAINS=your-frontend-url.vercel.app
   ```
5. Click **Settings** → **Root Directory** → Set to `backend`
6. Click **Deploy**

### Step 3: Get Backend URL
After deployment, Railway will provide a URL like:
`https://benchmarkstudio-production.railway.app`

Copy this URL for frontend configuration.

---

## Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and login
2. Click **Add New** → **Project**
3. Import `umarispr-cell/Benchmarkstudio.biz`
4. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
6. Click **Deploy**

### Step 2: Update Backend CORS

After frontend deployment, update Railway environment variables:
```
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
SANCTUM_STATEFUL_DOMAINS=your-frontend.vercel.app
```

---

## Post-Deployment

### Create Admin User (Optional)
Since database is seeded, you can login with:
- Email: `ceo@benchmark.com`
- Password: `password`

**IMPORTANT**: Change this password immediately in production!

### Test the Application
1. Visit your frontend URL
2. Login with test credentials
3. Verify all features work
4. Check API connectivity

---

## Deployment Checklist

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] Database migrated
- [ ] Test login working
- [ ] Change admin password
- [ ] SSL/HTTPS enabled (automatic on Railway/Vercel)

---

## Troubleshooting

### Backend Issues
- **500 Error**: Check Railway logs for errors
- **Database Error**: Ensure migrations ran (`php artisan migrate --force`)
- **CORS Error**: Update `CORS_ALLOWED_ORIGINS` in Railway

### Frontend Issues
- **API Connection Failed**: Check `VITE_API_URL` environment variable
- **Build Failed**: Ensure all dependencies installed
- **Routing Issues**: Vercel auto-configures SPA routing

---

## Environment Variables Reference

### Backend (Railway)
| Variable | Value | Required |
|----------|-------|----------|
| APP_KEY | From `php artisan key:generate --show` | ✅ |
| APP_ENV | production | ✅ |
| APP_DEBUG | false | ✅ |
| APP_URL | Your Railway URL | ✅ |
| CORS_ALLOWED_ORIGINS | Your Vercel URL | ✅ |
| SANCTUM_STATEFUL_DOMAINS | Your Vercel domain | ✅ |

### Frontend (Vercel)
| Variable | Value | Required |
|----------|-------|----------|
| VITE_API_URL | https://your-backend.railway.app/api | ✅ |

---

## Cost Estimation

### Free Tier Limits
- **Railway**: $5/month credit (sufficient for small apps)
- **Vercel**: Free for personal projects, unlimited bandwidth

### Expected Costs
- Small team (<10 users): **FREE**
- Medium team (10-50 users): **$5-10/month**
- Large team (50+ users): Consider paid plans

---

## Security Notes

1. ✅ HTTPS enabled by default (Railway + Vercel)
2. ✅ Rate limiting configured (5 login attempts/minute)
3. ✅ CORS restricted to frontend domain
4. ✅ Session encryption enabled
5. ✅ SQL injection protection (Eloquent ORM)
6. ✅ XSS protection (React auto-escapes)
7. ⚠️ Change default admin password immediately!

---

## Support

For issues or questions:
- Check Railway logs: Project → Deployments → View Logs
- Check Vercel logs: Project → Deployments → View Function Logs
- GitHub Issues: https://github.com/umarispr-cell/Benchmarkstudio.biz/issues

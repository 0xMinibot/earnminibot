# Deployment Guide - EarnMini Telegram Bot

This guide provides step-by-step instructions for deploying the EarnMini Telegram Bot to production.

## 🚀 Quick Start

### Option 1: Static Web Hosting (Recommended)

#### Netlify Deployment
1. Fork this repository to your GitHub account
2. Connect your GitHub account to Netlify
3. Select your forked repository
4. Set build settings:
   - Build command: `echo "Static site"`
   - Publish directory: `/`
5. Deploy the site
6. Enable HTTPS (automatic with Netlify)
7. Configure custom domain (optional)

#### Vercel Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to project directory
3. Run: `vercel --prod`
4. Follow the prompts
5. Your app will be deployed with HTTPS

#### GitHub Pages
1. Fork this repository
2. Go to repository Settings → Pages
3. Select source: Deploy from branch
4. Choose `main` branch and `/` (root) folder
5. Your site will be available at `https://yourusername.github.io/repository-name`

### Option 2: VPS/Server Deployment

#### Using Nginx
1. Connect to your server via SSH
2. Install Nginx: `sudo apt update && sudo apt install nginx`
3. Upload project files to `/var/www/earnmini/`
4. Create Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com www.your-domain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    root /var/www/earnmini;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    location /admin.html {
        auth_basic "Admin Access";
        auth_basic_user_file /etc/nginx/.htpasswd;
        try_files $uri =404;
    }
}
```

5. Enable the site: `sudo ln -s /etc/nginx/sites-available/earnmini /etc/nginx/sites-enabled/`
6. Test configuration: `sudo nginx -t`
7. Restart Nginx: `sudo systemctl restart nginx`

#### Using Apache
1. Upload files to `/var/www/html/earnmini/`
2. Create `.htaccess` file:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

<Files "admin.html">
    AuthType Basic
    AuthName "Admin Access"
    AuthUserFile /var/www/.htpasswd
    Require valid-user
</Files>
```

3. Enable SSL module: `sudo a2enmod ssl rewrite`
4. Restart Apache: `sudo systemctl restart apache2`

## 🔧 Configuration

### 1. Telegram Bot Setup

#### Create Bot (if needed)
1. Open @BotFather in Telegram
2. Send `/newbot`
3. Follow instructions to create your bot
4. Save the bot token

#### Configure Web App
1. Send `/setmenubutton` to @BotFather
2. Select your bot
3. Set button text: "Open EarnMini"
4. Set Web App URL: `https://your-domain.com`

#### Update Bot Configuration
If using a different bot token, update `js/firebase-config.js`:
```javascript
export const TELEGRAM_CONFIG = {
    BOT_TOKEN: 'YOUR_BOT_TOKEN',
    BOT_USERNAME: 'your_bot_username',
    API_URL: 'https://api.telegram.org/botYOUR_BOT_TOKEN'
};
```

### 2. Firebase Configuration

#### Using Existing Project
The app is pre-configured with Firebase project. No changes needed.

#### Using New Firebase Project
1. Create new Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Update configuration in `js/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

4. Set up Firestore security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Configure based on your security needs
    }
  }
}
```

### 3. Domain Configuration

#### SSL Certificate (Essential for Telegram Web Apps)
Using Let's Encrypt (Free):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Using Cloudflare (Recommended):
1. Add your domain to Cloudflare
2. Update nameservers
3. Enable "Always Use HTTPS"
4. Set SSL/TLS mode to "Full"

### 4. Admin Panel Security

#### Change Default Password
Update password in `js/admin.js`:
```javascript
const correctPassword = 'your-secure-password';
```

#### Add HTTP Basic Auth (Optional)
Create password file:
```bash
sudo htpasswd -c /etc/nginx/.htpasswd admin
```

## 🔒 Security Checklist

- [ ] HTTPS enabled and working
- [ ] Admin password changed from default
- [ ] Firebase security rules configured
- [ ] Server firewall configured
- [ ] Regular backups enabled
- [ ] Bot token kept secure
- [ ] Input validation tested
- [ ] Error handling implemented

## 📊 Environment Variables (Optional)

Create `.env` file for sensitive data:
```
FIREBASE_API_KEY=your-api-key
TELEGRAM_BOT_TOKEN=your-bot-token
ADMIN_PASSWORD=your-admin-password
```

Update JavaScript files to use environment variables if using a build process.

## 🧪 Testing Deployment

### Pre-deployment Checklist
- [ ] All files uploaded correctly
- [ ] HTTPS certificate working
- [ ] Firebase connection successful
- [ ] Telegram Web App loads properly
- [ ] Admin panel accessible
- [ ] All features working
- [ ] Mobile responsiveness tested

### Testing Process
1. Open bot in Telegram
2. Test user registration
3. Try watching ads
4. Test referral system
5. Attempt withdrawal
6. Access admin panel
7. Verify analytics

## 🚨 Troubleshooting

### Common Issues

#### "This site can't provide a secure connection"
- Check SSL certificate installation
- Verify domain DNS settings
- Ensure HTTPS redirect works

#### "Telegram Web App failed to load"
- Verify HTTPS is working
- Check Web App URL in BotFather
- Test in incognito/private mode

#### "Firebase connection failed"
- Verify API keys are correct
- Check Firestore security rules
- Ensure project is active

#### "Admin panel login not working"
- Check password in admin.js
- Clear browser cache
- Verify file permissions

## 📈 Performance Optimization

### CDN Configuration
Use Cloudflare or similar CDN to:
- Cache static assets
- Improve global loading times
- Add DDoS protection
- Optimize images

### Compression
Enable gzip compression:
```nginx
gzip on;
gzip_types text/css application/javascript application/json;
```

### Caching Headers
Set appropriate cache headers:
```nginx
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔄 Updates & Maintenance

### Regular Tasks
- Monitor Firebase usage
- Check admin panel logs
- Update dependencies
- Backup user data
- Monitor bot performance

### Update Process
1. Test changes locally
2. Deploy to staging environment
3. Run full test suite
4. Deploy to production
5. Monitor for issues

## 📞 Support

If you encounter issues during deployment:
1. Check this troubleshooting guide
2. Review browser console for errors
3. Check server logs
4. Verify all configuration steps

## 🎉 Post-Deployment

After successful deployment:
1. Share bot with test users
2. Monitor user registration
3. Track system performance
4. Collect user feedback
5. Plan feature updates

---

**Important**: Always test thoroughly in a staging environment before deploying to production. Keep backups of all configuration files and user data.

# EarnMini Bot - Telegram Mini App

A professional Telegram Mini App bot with comprehensive admin panel for managing user earnings, referrals, and withdrawals.

## 🚀 Features

### User Features
- **Earning System**: Watch monetized ads to earn points (15 ads/day, 1 point each)
- **Referral System**: Auto-generated referral links with 5 points bonus + commission
- **Withdrawal System**: Multiple payment methods (bKash, Nagad, Binance) with 1000 point minimum
- **Profile Management**: Complete user statistics and activity tracking
- **Responsive Design**: Modern UI with Bootstrap and smooth animations

### Admin Features
- **Dashboard**: Real-time analytics and system overview
- **User Management**: View, edit, and manage all users
- **Withdrawal Management**: Approve/reject withdrawal requests
- **Settings Control**: Adjust app parameters and payment methods
- **Analytics**: Detailed charts and data export capabilities

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Bootstrap 5.3, JavaScript ES6+
- **Database**: Firebase Cloud Firestore
- **API**: Telegram Bot API integration
- **Charts**: Chart.js for analytics visualization
- **Icons**: Bootstrap Icons

## 📁 Project Structure

```
TGbot/
├── index.html              # Main user interface
├── admin.html              # Admin panel interface
├── css/
│   ├── style.css          # Main app styles
│   └── admin.css          # Admin panel styles
├── js/
│   ├── firebase-config.js  # Firebase configuration
│   ├── app.js             # Main app logic
│   └── admin.js           # Admin panel logic
├── req.md                 # Project requirements
└── README.md              # Project documentation
```

## ⚙️ Configuration

### Firebase Setup
The app is configured with the following Firebase project:
- **Project ID**: earnminibot
- **Database**: Cloud Firestore
- **Authentication**: Telegram Web App integration

### Telegram Bot Configuration
- **Bot Token**: `8154822596:AAHA4jB7ZAhPb5-xB8KiMp6iNMjgC5K67B8`
- **Bot Username**: `@earnmini_bot`
- **API Integration**: User profile photos and data

## 🚀 Setup Instructions

### 1. Prerequisites
- Web server (Apache, Nginx, or any static file server)
- HTTPS enabled (required for Telegram Web Apps)
- Firebase project access

### 2. Installation
1. Clone or download the project files
2. Upload files to your web server
3. Ensure HTTPS is properly configured
4. Update Firebase configuration if needed

### 3. Telegram Bot Setup
1. Open BotFather in Telegram
2. Use the bot token: `8154822596:AAHA4jB7ZAhPb5-xB8KiMp6iNMjgC5K67B8`
3. Set the Web App URL to your hosted domain
4. Configure bot commands and menu

### 4. Admin Access
- Access admin panel at: `your-domain.com/admin.html`
- Default admin password: `admin123`
- Change password in production environment

## 📊 Database Schema

### Users Collection
```javascript
{
  telegramId: string,
  firstName: string,
  lastName: string,
  username: string,
  balance: number,
  totalEarned: number,
  adsWatchedToday: number,
  adsWatchedTotal: number,
  referralCode: string,
  referredBy: string,
  totalReferrals: number,
  commissionEarned: number,
  level: number,
  joinDate: timestamp,
  lastSeen: timestamp,
  lastAdReset: string
}
```

### Withdrawals Collection
```javascript
{
  userId: string,
  method: string,
  accountInfo: string,
  amount: number,
  status: string, // pending, completed, rejected
  requestDate: timestamp,
  processedDate: timestamp
}
```

### Activities Collection
```javascript
{
  userId: string,
  description: string,
  type: string, // earn, referral, withdraw, info
  timestamp: timestamp
}
```

## 💰 App Configuration

### Default Settings
- **Daily Ad Limit**: 15 ads per day
- **Points Per Ad**: 1 point
- **Referral Bonus**: 5 points
- **Minimum Withdrawal**: 1000 points
- **Referral Commission**: 10%

### Payment Methods
- bKash
- Nagad (formerly Nogod)
- Binance

## 🔧 Customization

### Modifying App Settings
1. Access admin panel
2. Go to Settings section
3. Adjust parameters as needed
4. Save changes

### Adding Payment Methods
1. Access admin panel
2. Go to Settings → Payment Methods
3. Click "Add Method" button
4. Enter method name and save

### Styling Customization
- Modify `css/style.css` for main app styling
- Modify `css/admin.css` for admin panel styling
- Update CSS variables for color scheme changes

## 🛡️ Security Features

- Password-protected admin panel
- Firebase security rules
- Input validation and sanitization
- Secure API communication
- Rate limiting on ad watching

## 📱 Mobile Optimization

- Fully responsive design
- Touch-friendly interface
- Optimized for Telegram mobile app
- Progressive Web App features

## 🔄 Development Workflow

### Testing
1. Test in Telegram Web App environment
2. Verify Firebase connectivity
3. Test all user flows
4. Validate admin panel functionality

### Deployment
1. Build and minify assets
2. Upload to production server
3. Configure HTTPS
4. Update Telegram bot settings
5. Test production environment

## 🐛 Troubleshooting

### Common Issues
1. **Telegram Web App not loading**: Check HTTPS configuration
2. **Firebase connection error**: Verify API keys and project settings
3. **Admin panel access denied**: Check password and network connectivity
4. **Charts not displaying**: Ensure Chart.js library loads properly

### Debug Mode
Enable console logging for development:
```javascript
// Add to app.js
const DEBUG_MODE = true;
if (DEBUG_MODE) console.log('Debug info:', data);
```

## 📈 Analytics & Monitoring

### Built-in Analytics
- User growth tracking
- Earnings monitoring
- Activity analytics
- Withdrawal statistics

### External Integration
- Google Analytics (optional)
- Firebase Analytics
- Custom event tracking

## 🔮 Future Enhancements

- [ ] Multi-language support
- [ ] Advanced reward system
- [ ] Social media integration
- [ ] Gamification features
- [ ] Push notifications
- [ ] Advanced analytics dashboard

## 📄 License

This project is for educational and commercial use. Ensure compliance with Telegram's Terms of Service and local regulations.

## 📞 Support

For technical support or questions:
- Bot Username: @earnmini_bot
- Developer Contact: [Add your contact information]

## 🎉 Credits

Built with modern web technologies and best practices for Telegram Mini Apps development.

---

**Note**: This is a production-ready application. Ensure proper testing and security measures before deploying to a live environment.

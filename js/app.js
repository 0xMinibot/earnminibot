// Main Application Logic
import { 
    db, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs,
    serverTimestamp,
    increment 
} from './firebase-config.js';

import { TELEGRAM_CONFIG, APP_CONFIG, COLLECTIONS } from './firebase-config.js';

class EarnMiniApp {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'home';
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            this.showLoading(true);
            
            // Initialize Telegram Web App
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
                
                // Get user data from Telegram
                const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
                if (tgUser) {
                    await this.initializeUser(tgUser);
                } else {
                    // Fallback for testing
                    await this.initializeUser({
                        id: 123456789,
                        first_name: 'Test',
                        last_name: 'User',
                        username: 'testuser'
                    });
                }
            } else {
                // Fallback for development
                await this.initializeUser({
                    id: 123456789,
                    first_name: 'Test',
                    last_name: 'User',
                    username: 'testuser'
                });
            }
            
            this.setupEventListeners();
            this.updateUI();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize app', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async initializeUser(tgUser) {
        try {
            const userId = tgUser.id.toString();
            const userRef = doc(db, COLLECTIONS.USERS, userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                this.currentUser = { id: userId, ...userSnap.data() };
                await this.updateUserLastSeen();
            } else {
                // Create new user
                const referralCode = this.generateReferralCode(userId);
                const newUser = {
                    telegramId: userId,
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name || '',
                    username: tgUser.username || '',
                    balance: 0,
                    totalEarned: 0,
                    adsWatchedToday: 0,
                    adsWatchedTotal: 0,
                    referralCode: referralCode,
                    referredBy: null,
                    totalReferrals: 0,
                    commissionEarned: 0,
                    level: 1,
                    joinDate: serverTimestamp(),
                    lastSeen: serverTimestamp(),
                    lastAdReset: new Date().toDateString()
                };
                
                // Check if user was referred
                const urlParams = new URLSearchParams(window.location.search);
                const referrer = urlParams.get('ref');
                if (referrer && referrer !== referralCode) {
                    newUser.referredBy = referrer;
                    await this.processReferral(referrer, userId);
                }
                
                await setDoc(userRef, newUser);
                this.currentUser = { id: userId, ...newUser };
                
                // Add welcome activity
                await this.addActivity('Welcome to EarnMini Bot! Start watching ads to earn points.', 'info');
            }
            
            await this.checkDailyReset();
            await this.loadUserProfilePhoto();
            
        } catch (error) {
            console.error('User initialization error:', error);
            throw error;
        }
    }

    async loadUserProfilePhoto() {
        try {
            const response = await fetch(
                `${TELEGRAM_CONFIG.API_URL}/getUserProfilePhotos?user_id=${this.currentUser.telegramId}&limit=1`
            );
            const data = await response.json();
            
            if (data.ok && data.result.photos.length > 0) {
                const fileId = data.result.photos[0][0].file_id;
                const fileResponse = await fetch(
                    `${TELEGRAM_CONFIG.API_URL}/getFile?file_id=${fileId}`
                );
                const fileData = await fileResponse.json();
                
                if (fileData.ok) {
                    const photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_CONFIG.BOT_TOKEN}/${fileData.result.file_path}`;
                    document.getElementById('userProfilePic').src = photoUrl;
                    document.getElementById('profilePicLarge').src = photoUrl;
                }
            }
        } catch (error) {
            console.warn('Could not load profile photo:', error);
        }
    }

    async checkDailyReset() {
        const today = new Date().toDateString();
        if (this.currentUser.lastAdReset !== today) {
            await updateDoc(doc(db, COLLECTIONS.USERS, this.currentUser.id), {
                adsWatchedToday: 0,
                lastAdReset: today
            });
            this.currentUser.adsWatchedToday = 0;
            this.currentUser.lastAdReset = today;
        }
    }

    async updateUserLastSeen() {
        await updateDoc(doc(db, COLLECTIONS.USERS, this.currentUser.id), {
            lastSeen: serverTimestamp()
        });
    }

    generateReferralCode(userId) {
        return `EM${userId.slice(-6)}`;
    }

    async processReferral(referrerCode, newUserId) {
        try {
            const usersQuery = query(
                collection(db, COLLECTIONS.USERS),
                where('referralCode', '==', referrerCode),
                limit(1)
            );
            const referrerSnap = await getDocs(usersQuery);
            
            if (!referrerSnap.empty) {
                const referrerDoc = referrerSnap.docs[0];
                const referrerId = referrerDoc.id;
                
                // Update referrer
                await updateDoc(doc(db, COLLECTIONS.USERS, referrerId), {
                    totalReferrals: increment(1),
                    balance: increment(APP_CONFIG.REFERRAL_BONUS)
                });
                
                // Record referral
                await addDoc(collection(db, COLLECTIONS.REFERRALS), {
                    referrerId: referrerId,
                    referredUserId: newUserId,
                    bonusAwarded: APP_CONFIG.REFERRAL_BONUS,
                    timestamp: serverTimestamp()
                });
                
                // Add activity for referrer
                await this.addActivity(
                    `New referral! Earned ${APP_CONFIG.REFERRAL_BONUS} points`,
                    'referral',
                    referrerId
                );
            }
        } catch (error) {
            console.error('Referral processing error:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Watch Ad Button
        document.getElementById('watchAdBtn').addEventListener('click', () => {
            this.watchAd();
        });

        // Withdrawal
        document.getElementById('withdrawBtn').addEventListener('click', () => {
            this.processWithdrawal();
        });

        // Referral
        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            this.copyReferralLink();
        });

        document.getElementById('shareReferralBtn').addEventListener('click', () => {
            this.shareReferralLink();
        });
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Show/hide content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(`${tabName}Tab`).style.display = 'block';

        this.currentTab = tabName;

        // Load tab-specific data
        if (tabName === 'withdraw') {
            this.loadWithdrawalHistory();
        } else if (tabName === 'home') {
            this.loadRecentActivity();
        }
    }

    async watchAd() {
        if (this.isLoading) return;
        
        try {
            if (this.currentUser.adsWatchedToday >= APP_CONFIG.DAILY_AD_LIMIT) {
                this.showToast('Daily ad limit reached! Come back tomorrow.', 'warning');
                return;
            }

            this.isLoading = true;
            const watchBtn = document.getElementById('watchAdBtn');
            watchBtn.disabled = true;
            watchBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Watching Ad...';

            // Simulate ad watching (3 seconds)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Update user data
            await updateDoc(doc(db, COLLECTIONS.USERS, this.currentUser.id), {
                balance: increment(APP_CONFIG.POINTS_PER_AD),
                totalEarned: increment(APP_CONFIG.POINTS_PER_AD),
                adsWatchedToday: increment(1),
                adsWatchedTotal: increment(1)
            });

            // Update local user data
            this.currentUser.balance += APP_CONFIG.POINTS_PER_AD;
            this.currentUser.totalEarned += APP_CONFIG.POINTS_PER_AD;
            this.currentUser.adsWatchedToday += 1;
            this.currentUser.adsWatchedTotal += 1;

            // Process referral commission
            if (this.currentUser.referredBy) {
                await this.processReferralCommission();
            }

            // Add activity
            await this.addActivity(`Watched ad and earned ${APP_CONFIG.POINTS_PER_AD} points`, 'earn');

            this.showToast(`Earned ${APP_CONFIG.POINTS_PER_AD} points!`, 'success');
            this.updateUI();

        } catch (error) {
            console.error('Watch ad error:', error);
            this.showToast('Failed to watch ad. Please try again.', 'error');
        } finally {
            this.isLoading = false;
            const watchBtn = document.getElementById('watchAdBtn');
            watchBtn.disabled = false;
            watchBtn.innerHTML = '<i class="bi bi-play-fill me-2"></i>Watch Ad to Earn';
        }
    }

    async processReferralCommission() {
        try {
            const commission = Math.floor(APP_CONFIG.POINTS_PER_AD * APP_CONFIG.REFERRAL_COMMISSION_RATE);
            if (commission > 0) {
                const usersQuery = query(
                    collection(db, COLLECTIONS.USERS),
                    where('referralCode', '==', this.currentUser.referredBy),
                    limit(1)
                );
                const referrerSnap = await getDocs(usersQuery);
                
                if (!referrerSnap.empty) {
                    const referrerId = referrerSnap.docs[0].id;
                    await updateDoc(doc(db, COLLECTIONS.USERS, referrerId), {
                        balance: increment(commission),
                        commissionEarned: increment(commission)
                    });

                    await this.addActivity(
                        `Earned ${commission} points from referral commission`,
                        'referral',
                        referrerId
                    );
                }
            }
        } catch (error) {
            console.error('Referral commission error:', error);
        }
    }

    async processWithdrawal() {
        try {
            const method = document.getElementById('withdrawMethod').value;
            const accountInfo = document.getElementById('accountInfo').value.trim();
            const amount = parseInt(document.getElementById('withdrawAmount').value);

            if (!method || !accountInfo || !amount) {
                this.showToast('Please fill all withdrawal fields', 'warning');
                return;
            }

            if (amount < APP_CONFIG.MIN_WITHDRAWAL) {
                this.showToast(`Minimum withdrawal is ${APP_CONFIG.MIN_WITHDRAWAL} points`, 'warning');
                return;
            }

            if (amount > this.currentUser.balance) {
                this.showToast('Insufficient balance', 'error');
                return;
            }

            this.showLoading(true);

            // Create withdrawal request
            await addDoc(collection(db, COLLECTIONS.WITHDRAWALS), {
                userId: this.currentUser.id,
                method: method,
                accountInfo: accountInfo,
                amount: amount,
                status: 'pending',
                requestDate: serverTimestamp()
            });

            // Update user balance
            await updateDoc(doc(db, COLLECTIONS.USERS, this.currentUser.id), {
                balance: increment(-amount)
            });

            this.currentUser.balance -= amount;

            // Add activity
            await this.addActivity(`Withdrawal request: ${amount} points via ${method}`, 'withdraw');

            // Clear form
            document.getElementById('withdrawMethod').value = '';
            document.getElementById('accountInfo').value = '';
            document.getElementById('withdrawAmount').value = '';

            this.showToast('Withdrawal request submitted successfully!', 'success');
            this.updateUI();
            this.loadWithdrawalHistory();

        } catch (error) {
            console.error('Withdrawal error:', error);
            this.showToast('Failed to process withdrawal. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadWithdrawalHistory() {
        try {
            const withdrawalsQuery = query(
                collection(db, COLLECTIONS.WITHDRAWALS),
                where('userId', '==', this.currentUser.id),
                orderBy('requestDate', 'desc'),
                limit(10)
            );
            
            const withdrawalsSnap = await getDocs(withdrawalsQuery);
            const historyContainer = document.getElementById('withdrawalHistory');
            
            if (withdrawalsSnap.empty) {
                historyContainer.innerHTML = '<p class="text-muted text-center">No withdrawals yet</p>';
                return;
            }

            let historyHTML = '';
            withdrawalsSnap.forEach(doc => {
                const withdrawal = doc.data();
                const date = withdrawal.requestDate?.toDate().toLocaleDateString() || 'N/A';
                const statusColor = withdrawal.status === 'completed' ? 'success' : 
                                   withdrawal.status === 'pending' ? 'warning' : 'danger';
                
                historyHTML += `
                    <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                        <div>
                            <strong>${withdrawal.amount} points</strong><br>
                            <small class="text-muted">${withdrawal.method.toUpperCase()} - ${date}</small>
                        </div>
                        <span class="badge bg-${statusColor}">${withdrawal.status}</span>
                    </div>
                `;
            });
            
            historyContainer.innerHTML = historyHTML;
            
        } catch (error) {
            console.error('Load withdrawal history error:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const activitiesQuery = query(
                collection(db, COLLECTIONS.ACTIVITIES),
                where('userId', '==', this.currentUser.id),
                orderBy('timestamp', 'desc'),
                limit(5)
            );
            
            const activitiesSnap = await getDocs(activitiesQuery);
            const activityContainer = document.getElementById('recentActivity');
            
            if (activitiesSnap.empty) {
                activityContainer.innerHTML = '<p class="text-muted text-center">No recent activity</p>';
                return;
            }

            let activityHTML = '';
            activitiesSnap.forEach(doc => {
                const activity = doc.data();
                const time = activity.timestamp?.toDate().toLocaleTimeString() || 'N/A';
                
                activityHTML += `
                    <div class="activity-item">
                        <div class="activity-icon ${activity.type}">
                            <i class="bi bi-${this.getActivityIcon(activity.type)}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <p class="mb-1">${activity.description}</p>
                            <small class="text-muted">${time}</small>
                        </div>
                    </div>
                `;
            });
            
            activityContainer.innerHTML = activityHTML;
            
        } catch (error) {
            console.error('Load recent activity error:', error);
        }
    }

    getActivityIcon(type) {
        switch(type) {
            case 'earn': return 'play-circle';
            case 'referral': return 'people';
            case 'withdraw': return 'cash-coin';
            default: return 'info-circle';
        }
    }

    async addActivity(description, type, userId = null) {
        try {
            await addDoc(collection(db, COLLECTIONS.ACTIVITIES), {
                userId: userId || this.currentUser.id,
                description: description,
                type: type,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('Add activity error:', error);
        }
    }

    copyReferralLink() {
        const referralLink = this.getReferralLink();
        navigator.clipboard.writeText(referralLink).then(() => {
            this.showToast('Referral link copied!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = referralLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Referral link copied!', 'success');
        });
    }

    shareReferralLink() {
        const referralLink = this.getReferralLink();
        const message = `🎉 Join EarnMini Bot and start earning points by watching ads!\n\n💰 Get 5 bonus points when you sign up with my link:\n${referralLink}\n\n✨ Features:\n• Watch ads to earn points\n• Refer friends for bonuses\n• Withdraw to bKash, Nagad, Binance\n\nStart earning now! 🚀`;
        
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`);
        } else {
            window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`, '_blank');
        }
    }

    getReferralLink() {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?ref=${this.currentUser.referralCode}`;
    }

    updateUI() {
        if (!this.currentUser) return;

        // Update user info
        document.getElementById('userName').textContent = this.currentUser.firstName;
        document.getElementById('profileName').textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        document.getElementById('profileUsername').textContent = `@${this.currentUser.username || 'username'}`;

        // Update balance and stats
        document.getElementById('userBalance').textContent = this.currentUser.balance;
        document.getElementById('todayEarnings').textContent = this.currentUser.adsWatchedToday * APP_CONFIG.POINTS_PER_AD;
        document.getElementById('adsWatched').textContent = this.currentUser.adsWatchedToday;
        document.getElementById('totalReferrals').textContent = this.currentUser.totalReferrals;
        document.getElementById('userLevel').textContent = this.currentUser.level;

        // Update earn tab
        document.getElementById('remainingAds').textContent = APP_CONFIG.DAILY_AD_LIMIT - this.currentUser.adsWatchedToday;
        const progress = (this.currentUser.adsWatchedToday / APP_CONFIG.DAILY_AD_LIMIT) * 100;
        document.getElementById('adProgress').style.width = `${progress}%`;

        // Update profile stats
        document.getElementById('totalEarned').textContent = this.currentUser.totalEarned;
        document.getElementById('profileReferrals').textContent = this.currentUser.totalReferrals;
        document.getElementById('statsAdsToday').textContent = this.currentUser.adsWatchedToday;
        document.getElementById('statsTotalAds').textContent = this.currentUser.adsWatchedTotal;
        document.getElementById('statsCommission').textContent = this.currentUser.commissionEarned || 0;
        document.getElementById('statsJoinDate').textContent = this.currentUser.joinDate?.toDate?.().toLocaleDateString() || 'N/A';

        // Update referral link
        document.getElementById('referralLink').value = this.getReferralLink();

        // Disable watch ad button if limit reached
        const watchBtn = document.getElementById('watchAdBtn');
        if (this.currentUser.adsWatchedToday >= APP_CONFIG.DAILY_AD_LIMIT) {
            watchBtn.disabled = true;
            watchBtn.innerHTML = '<i class="bi bi-clock me-2"></i>Daily Limit Reached';
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('d-none');
        } else {
            overlay.classList.add('d-none');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast_' + Date.now();
        
        const bgClass = type === 'success' ? 'bg-success' : 
                       type === 'error' ? 'bg-danger' : 
                       type === 'warning' ? 'bg-warning' : 'bg-info';
        
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert">
                <div class="toast-header ${bgClass} text-white">
                    <i class="bi bi-${this.getToastIcon(type)} me-2"></i>
                    <strong class="me-auto">EarnMini</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // Remove toast after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    getToastIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'x-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EarnMiniApp();
});

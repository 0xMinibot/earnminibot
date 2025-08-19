// Admin Panel Logic
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

class AdminPanel {
    constructor() {
        this.isAuthenticated = false;
        this.currentSection = 'dashboard';
        this.charts = {};
        
        this.init();
    }

    async init() {
        try {
            // Show login modal
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
            
            this.setupEventListeners();
            this.updateCurrentTime();
            
            // Update time every minute
            setInterval(() => this.updateCurrentTime(), 60000);
            
        } catch (error) {
            console.error('Admin initialization error:', error);
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            this.handleLogin(e);
        });

        // Sidebar navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if (section) {
                    this.switchSection(section);
                } else if (e.currentTarget.classList.contains('logout-btn')) {
                    this.logout();
                }
            });
        });

        // Refresh buttons
        document.getElementById('refreshUsers')?.addEventListener('click', () => {
            this.loadUsers();
        });

        document.getElementById('refreshWithdrawals')?.addEventListener('click', () => {
            this.loadWithdrawals();
        });

        // Settings form
        document.getElementById('appSettingsForm').addEventListener('submit', (e) => {
            this.saveSettings(e);
        });

        // Payment method management
        document.getElementById('addPaymentMethod')?.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('paymentMethodModal'));
            modal.show();
        });

        document.getElementById('paymentMethodForm').addEventListener('submit', (e) => {
            this.addPaymentMethod(e);
        });

        // Analytics
        document.getElementById('updateAnalytics')?.addEventListener('click', () => {
            this.updateAnalytics();
        });

        document.getElementById('exportData')?.addEventListener('click', () => {
            this.exportData();
        });

        // Search and filters
        document.getElementById('userSearch')?.addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        document.getElementById('withdrawalFilter')?.addEventListener('change', (e) => {
            this.filterWithdrawals(e.target.value);
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const password = document.getElementById('adminPassword').value;
        const correctPassword = 'admin123'; // In production, this should be hashed and stored securely
        
        if (password === correctPassword) {
            this.isAuthenticated = true;
            
            // Hide login modal and show admin content
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            loginModal.hide();
            
            document.getElementById('adminContent').classList.remove('d-none');
            
            // Load dashboard data
            await this.loadDashboard();
            
            this.showToast('Welcome to Admin Panel!', 'success');
        } else {
            this.showToast('Invalid password!', 'error');
        }
    }

    logout() {
        this.isAuthenticated = false;
        document.getElementById('adminContent').classList.add('d-none');
        
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
        
        document.getElementById('adminPassword').value = '';
        
        this.showToast('Logged out successfully', 'info');
    }

    switchSection(sectionName) {
        // Update sidebar
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Show/hide sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('d-none');
        });
        document.getElementById(`${sectionName}Section`).classList.remove('d-none');

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            users: 'User Management',
            withdrawals: 'Withdrawal Management',
            settings: 'Settings',
            analytics: 'Analytics'
        };
        document.getElementById('sectionTitle').textContent = titles[sectionName];

        this.currentSection = sectionName;

        // Load section data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(section) {
        switch(section) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'withdrawals':
                await this.loadWithdrawals();
                break;
            case 'settings':
                await this.loadSettings();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
        }
    }

    async loadDashboard() {
        try {
            // Load stats
            const stats = await this.getDashboardStats();
            
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalEarnings').textContent = stats.totalEarnings;
            document.getElementById('pendingWithdrawals').textContent = stats.pendingWithdrawals;
            document.getElementById('totalAds').textContent = stats.totalAdsToday;

            // Load charts
            await this.loadDashboardCharts();
            
            // Load recent activity
            await this.loadRecentSystemActivity();
            
        } catch (error) {
            console.error('Dashboard loading error:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }

    async getDashboardStats() {
        try {
            // Get total users
            const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
            const totalUsers = usersSnap.size;

            // Calculate total earnings
            let totalEarnings = 0;
            usersSnap.forEach(doc => {
                totalEarnings += doc.data().totalEarned || 0;
            });

            // Get pending withdrawals
            const pendingQuery = query(
                collection(db, COLLECTIONS.WITHDRAWALS),
                where('status', '==', 'pending')
            );
            const pendingSnap = await getDocs(pendingQuery);
            const pendingWithdrawals = pendingSnap.size;

            // Get today's ads
            const today = new Date().toDateString();
            let totalAdsToday = 0;
            usersSnap.forEach(doc => {
                const userData = doc.data();
                if (userData.lastAdReset === today) {
                    totalAdsToday += userData.adsWatchedToday || 0;
                }
            });

            return {
                totalUsers,
                totalEarnings,
                pendingWithdrawals,
                totalAdsToday
            };
        } catch (error) {
            console.error('Stats loading error:', error);
            return { totalUsers: 0, totalEarnings: 0, pendingWithdrawals: 0, totalAdsToday: 0 };
        }
    }

    async loadDashboardCharts() {
        // Earnings Chart
        const earningsCtx = document.getElementById('earningsChart').getContext('2d');
        if (this.charts.earnings) {
            this.charts.earnings.destroy();
        }
        
        this.charts.earnings = new Chart(earningsCtx, {
            type: 'line',
            data: {
                labels: this.getLast7Days(),
                datasets: [{
                    label: 'Daily Earnings',
                    data: await this.getDailyEarningsData(),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Activity Chart
        const activityCtx = document.getElementById('activityChart').getContext('2d');
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }
        
        this.charts.activity = new Chart(activityCtx, {
            type: 'doughnut',
            data: {
                labels: ['Ads Watched', 'Referrals', 'Withdrawals'],
                datasets: [{
                    data: await this.getActivityData(),
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return days;
    }

    async getDailyEarningsData() {
        // Mock data - in real implementation, query activities by date
        return [120, 190, 300, 500, 200, 300, 450];
    }

    async getActivityData() {
        // Mock data - in real implementation, query actual activities
        return [85, 45, 12];
    }

    async loadRecentSystemActivity() {
        try {
            const activitiesQuery = query(
                collection(db, COLLECTIONS.ACTIVITIES),
                orderBy('timestamp', 'desc'),
                limit(10)
            );
            
            const activitiesSnap = await getDocs(activitiesQuery);
            const activityContainer = document.getElementById('recentSystemActivity');
            
            if (activitiesSnap.empty) {
                activityContainer.innerHTML = '<p class="text-muted text-center">No recent activity</p>';
                return;
            }

            let activityHTML = '';
            activitiesSnap.forEach(doc => {
                const activity = doc.data();
                const time = activity.timestamp?.toDate().toLocaleString() || 'N/A';
                
                activityHTML += `
                    <div class="activity-item">
                        <div class="activity-icon ${this.getActivityClass(activity.type)}">
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
            console.error('Recent activity loading error:', error);
        }
    }

    getActivityClass(type) {
        switch(type) {
            case 'earn': return 'success';
            case 'referral': return 'info';
            case 'withdraw': return 'warning';
            default: return 'info';
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

    async loadUsers() {
        try {
            const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
            const tableBody = document.getElementById('usersTableBody');
            
            if (usersSnap.empty) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
                return;
            }

            let tableHTML = '';
            usersSnap.forEach(doc => {
                const user = doc.data();
                const joinDate = user.joinDate?.toDate().toLocaleDateString() || 'N/A';
                
                tableHTML += `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="https://via.placeholder.com/32" alt="Profile" class="rounded-circle me-2" style="width: 32px; height: 32px;">
                                <div>
                                    <strong>${user.firstName} ${user.lastName}</strong><br>
                                    <small class="text-muted">@${user.username || 'N/A'}</small>
                                </div>
                            </div>
                        </td>
                        <td><strong>${user.balance || 0}</strong> points</td>
                        <td>${user.totalEarned || 0} points</td>
                        <td>${user.totalReferrals || 0}</td>
                        <td>${joinDate}</td>
                        <td>
                            <button class="btn btn-info btn-sm me-1" onclick="adminPanel.viewUserDetails('${doc.id}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-warning btn-sm me-1" onclick="adminPanel.editUser('${doc.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="adminPanel.banUser('${doc.id}')">
                                <i class="bi bi-ban"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tableBody.innerHTML = tableHTML;
            
        } catch (error) {
            console.error('Users loading error:', error);
            this.showToast('Failed to load users', 'error');
        }
    }

    async viewUserDetails(userId) {
        try {
            const userRef = doc(db, COLLECTIONS.USERS, userId);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                this.showToast('User not found', 'error');
                return;
            }
            
            const user = userSnap.data();
            const modal = new bootstrap.Modal(document.getElementById('userDetailModal'));
            
            const detailHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Personal Information</h6>
                        <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
                        <p><strong>Username:</strong> @${user.username || 'N/A'}</p>
                        <p><strong>Telegram ID:</strong> ${user.telegramId}</p>
                        <p><strong>Join Date:</strong> ${user.joinDate?.toDate().toLocaleDateString() || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Earnings & Activity</h6>
                        <p><strong>Balance:</strong> ${user.balance || 0} points</p>
                        <p><strong>Total Earned:</strong> ${user.totalEarned || 0} points</p>
                        <p><strong>Ads Watched Today:</strong> ${user.adsWatchedToday || 0}</p>
                        <p><strong>Total Ads:</strong> ${user.adsWatchedTotal || 0}</p>
                        <p><strong>Referrals:</strong> ${user.totalReferrals || 0}</p>
                        <p><strong>Commission Earned:</strong> ${user.commissionEarned || 0} points</p>
                    </div>
                </div>
            `;
            
            document.getElementById('userDetailContent').innerHTML = detailHTML;
            modal.show();
            
        } catch (error) {
            console.error('User details error:', error);
            this.showToast('Failed to load user details', 'error');
        }
    }

    async loadWithdrawals() {
        try {
            const withdrawalsSnap = await getDocs(
                query(collection(db, COLLECTIONS.WITHDRAWALS), orderBy('requestDate', 'desc'))
            );
            const tableBody = document.getElementById('withdrawalsTableBody');
            
            if (withdrawalsSnap.empty) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No withdrawals found</td></tr>';
                return;
            }

            let tableHTML = '';
            
            for (const withdrawalDoc of withdrawalsSnap.docs) {
                const withdrawal = withdrawalDoc.data();
                
                // Get user data
                const userRef = doc(db, COLLECTIONS.USERS, withdrawal.userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : { firstName: 'Unknown', lastName: 'User' };
                
                const date = withdrawal.requestDate?.toDate().toLocaleDateString() || 'N/A';
                const statusClass = withdrawal.status === 'completed' ? 'success' : 
                                   withdrawal.status === 'pending' ? 'warning' : 'danger';
                
                tableHTML += `
                    <tr>
                        <td>${userData.firstName} ${userData.lastName}</td>
                        <td><span class="badge bg-secondary">${withdrawal.method.toUpperCase()}</span></td>
                        <td>${withdrawal.accountInfo}</td>
                        <td><strong>${withdrawal.amount}</strong> points</td>
                        <td>${date}</td>
                        <td><span class="badge bg-${statusClass}">${withdrawal.status}</span></td>
                        <td>
                            ${withdrawal.status === 'pending' ? `
                                <button class="btn btn-success btn-sm me-1" onclick="adminPanel.approveWithdrawal('${withdrawalDoc.id}')">
                                    <i class="bi bi-check-lg"></i>
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="adminPanel.rejectWithdrawal('${withdrawalDoc.id}')">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            ` : `
                                <span class="text-muted">No actions</span>
                            `}
                        </td>
                    </tr>
                `;
            }
            
            tableBody.innerHTML = tableHTML;
            
        } catch (error) {
            console.error('Withdrawals loading error:', error);
            this.showToast('Failed to load withdrawals', 'error');
        }
    }

    async approveWithdrawal(withdrawalId) {
        try {
            await updateDoc(doc(db, COLLECTIONS.WITHDRAWALS, withdrawalId), {
                status: 'completed',
                processedDate: serverTimestamp()
            });
            
            this.showToast('Withdrawal approved successfully', 'success');
            this.loadWithdrawals();
            
        } catch (error) {
            console.error('Withdrawal approval error:', error);
            this.showToast('Failed to approve withdrawal', 'error');
        }
    }

    async rejectWithdrawal(withdrawalId) {
        try {
            // Get withdrawal data to refund user
            const withdrawalRef = doc(db, COLLECTIONS.WITHDRAWALS, withdrawalId);
            const withdrawalSnap = await getDoc(withdrawalRef);
            
            if (withdrawalSnap.exists()) {
                const withdrawal = withdrawalSnap.data();
                
                // Refund user balance
                await updateDoc(doc(db, COLLECTIONS.USERS, withdrawal.userId), {
                    balance: increment(withdrawal.amount)
                });
                
                // Update withdrawal status
                await updateDoc(withdrawalRef, {
                    status: 'rejected',
                    processedDate: serverTimestamp()
                });
                
                this.showToast('Withdrawal rejected and amount refunded', 'info');
                this.loadWithdrawals();
            }
            
        } catch (error) {
            console.error('Withdrawal rejection error:', error);
            this.showToast('Failed to reject withdrawal', 'error');
        }
    }

    async loadSettings() {
        try {
            // Load current settings
            document.getElementById('dailyAdLimit').value = APP_CONFIG.DAILY_AD_LIMIT;
            document.getElementById('pointsPerAd').value = APP_CONFIG.POINTS_PER_AD;
            document.getElementById('referralBonus').value = APP_CONFIG.REFERRAL_BONUS;
            document.getElementById('minWithdrawal').value = APP_CONFIG.MIN_WITHDRAWAL;
            document.getElementById('referralCommission').value = APP_CONFIG.REFERRAL_COMMISSION_RATE * 100;
            
        } catch (error) {
            console.error('Settings loading error:', error);
        }
    }

    async saveSettings(e) {
        e.preventDefault();
        
        try {
            const settings = {
                dailyAdLimit: parseInt(document.getElementById('dailyAdLimit').value),
                pointsPerAd: parseInt(document.getElementById('pointsPerAd').value),
                referralBonus: parseInt(document.getElementById('referralBonus').value),
                minWithdrawal: parseInt(document.getElementById('minWithdrawal').value),
                referralCommissionRate: parseFloat(document.getElementById('referralCommission').value) / 100,
                updatedAt: serverTimestamp()
            };
            
            await setDoc(doc(db, COLLECTIONS.ADMIN_SETTINGS, 'app_config'), settings);
            
            this.showToast('Settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Settings save error:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }

    async addPaymentMethod(e) {
        e.preventDefault();
        
        const methodName = document.getElementById('methodName').value.trim();
        
        if (!methodName) {
            this.showToast('Please enter method name', 'warning');
            return;
        }
        
        // Add to UI (in real implementation, save to database)
        const methodsList = document.getElementById('paymentMethodsList');
        const methodHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <span>${methodName}</span>
                <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        methodsList.insertAdjacentHTML('beforeend', methodHTML);
        
        // Clear form and close modal
        document.getElementById('methodName').value = '';
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentMethodModal'));
        modal.hide();
        
        this.showToast('Payment method added successfully', 'success');
    }

    async loadAnalytics() {
        // Set default date range (last 30 days)
        const toDate = new Date();
        const fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        document.getElementById('fromDate').value = fromDate.toISOString().split('T')[0];
        document.getElementById('toDate').value = toDate.toISOString().split('T')[0];
        
        this.updateAnalytics();
    }

    async updateAnalytics() {
        try {
            // User Growth Chart
            const userGrowthCtx = document.getElementById('userGrowthChart').getContext('2d');
            if (this.charts.userGrowth) {
                this.charts.userGrowth.destroy();
            }
            
            this.charts.userGrowth = new Chart(userGrowthCtx, {
                type: 'line',
                data: {
                    labels: this.getLast30Days(),
                    datasets: [{
                        label: 'New Users',
                        data: await this.getUserGrowthData(),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            // Revenue Chart
            const revenueCtx = document.getElementById('revenueChart').getContext('2d');
            if (this.charts.revenue) {
                this.charts.revenue.destroy();
            }
            
            this.charts.revenue = new Chart(revenueCtx, {
                type: 'bar',
                data: {
                    labels: this.getLast30Days(),
                    datasets: [{
                        label: 'Revenue',
                        data: await this.getRevenueData(),
                        backgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Analytics update error:', error);
            this.showToast('Failed to update analytics', 'error');
        }
    }

    getLast30Days() {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return days;
    }

    async getUserGrowthData() {
        // Mock data - in real implementation, query users by join date
        return Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 1);
    }

    async getRevenueData() {
        // Mock data - in real implementation, calculate actual revenue
        return Array.from({ length: 30 }, () => Math.floor(Math.random() * 500) + 100);
    }

    async exportData() {
        try {
            // In real implementation, generate and download CSV/Excel file
            this.showToast('Data export feature coming soon', 'info');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Failed to export data', 'error');
        }
    }

    filterUsers(searchTerm) {
        const rows = document.querySelectorAll('#usersTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
        });
    }

    filterWithdrawals(status) {
        const rows = document.querySelectorAll('#withdrawalsTableBody tr');
        rows.forEach(row => {
            if (!status) {
                row.style.display = '';
            } else {
                const statusCell = row.querySelector('.badge');
                if (statusCell && statusCell.textContent.toLowerCase() === status) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    }

    updateCurrentTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleString();
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
                    <strong class="me-auto">Admin Panel</strong>
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

// Global reference for onclick handlers
let adminPanel;

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

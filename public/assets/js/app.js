import { initializeApp } from 'firebase-app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, orderBy, getDocs, addDoc } from 'firebase-firestore';

// Telegram WebApp init
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
}

// Firebase config from req.md (Note: for production, restrict keys and use security rules)
const firebaseConfig = {
  apiKey: "AIzaSyCv5bpFnvxR1gUXRoh4Td434BqfE8Cnqzc",
  authDomain: "earnminibot.firebaseapp.com",
  databaseURL: "https://earnminibot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "earnminibot",
  storageBucket: "earnminibot.firebasestorage.app",
  messagingSenderId: "693031433788",
  appId: "1:693031433788:web:04d1553a15f03df0ecf539",
  measurementId: "G-RL28PGB99W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Elements
const pages = {
  home: document.getElementById('page-home'),
  earn: document.getElementById('page-earn'),
  withdraw: document.getElementById('page-withdraw'),
  profile: document.getElementById('page-profile')
};
const navButtons = document.querySelectorAll('.nav-btn');
const toastContainer = document.getElementById('toastContainer');
const userAvatar = document.getElementById('userAvatar');
const profileAvatar = document.getElementById('profileAvatar');

// State
let currentUser = null; // { id, name }
let userDocRef = null;
let adminSettings = { dailyTaskLimit: 15, pointsPerTask: 1, referralPoints: 5, commissionRate: 0.1, paymentMethods: ["bKash","Nagad","Binance"] };
let userData = { points: 0, dailyTasksCompleted: 0, lastTaskDate: null };

function showToast(message, type = 'primary') {
  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${type}`;
  el.role = 'alert';
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  toastContainer.appendChild(el);
  const t = new bootstrap.Toast(el, { delay: 2500, autohide: true });
  t.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

function setActive(page) {
  Object.entries(pages).forEach(([k, v]) => v.classList.toggle('d-none', k !== page));
  navButtons.forEach(b => b.classList.toggle('active', b.dataset.target === page));
}

function initials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function updateHeaderProfile(name, photoUrl) {
  userAvatar.textContent = '';
  userAvatar.style.backgroundImage = '';
  if (photoUrl) {
    userAvatar.style.backgroundImage = `url(${photoUrl})`;
    userAvatar.style.backgroundSize = 'cover';
    userAvatar.style.backgroundPosition = 'center';
  } else {
    userAvatar.textContent = initials(name);
  }
  profileAvatar.textContent = initials(name);
}

async function loadAdminSettings() {
  try {
    const sRef = doc(db, 'adminSettings', 'global');
    const sSnap = await getDoc(sRef);
    if (sSnap.exists()) {
      adminSettings = { ...adminSettings, ...sSnap.data() };
    }
  } catch (e) { /* ignore, use defaults */ }
  document.getElementById('limitSpan').textContent = adminSettings.dailyTaskLimit;
  document.getElementById('pointsPerTaskSpan').textContent = adminSettings.pointsPerTask;
  // methods
  const methodSel = document.getElementById('method');
  methodSel.innerHTML = '';
  adminSettings.paymentMethods.forEach(m => methodSel.appendChild(new Option(m, m)));
}

function updateStatsUI() {
  document.getElementById('statPoints').textContent = userData.points ?? 0;
  document.getElementById('pPoints').textContent = userData.points ?? 0;
  const limit = adminSettings.dailyTaskLimit;
  const done = userData.dailyTasksCompleted ?? 0;
  document.getElementById('statTasks').textContent = `${done}/${limit}`;
  document.getElementById('pTasks').textContent = `${done}/${limit}`;
  const pct = Math.min(100, Math.round((done/Math.max(1,limit))*100));
  document.getElementById('taskProgress').style.width = pct + '%';
}

function updateReferralUI(count=0) {
  document.getElementById('statRefs').textContent = count;
  document.getElementById('pRefs').textContent = count;
}

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString().slice(0,10);
}

async function ensureUserDocument(u) {
  userDocRef = doc(db, 'users', String(u.id));
  const snap = await getDoc(userDocRef);
  const base = {
    name: u.name,
    profilePhoto: u.photo_url || null,
    points: 0,
    dailyTasksCompleted: 0,
    lastTaskDate: todayUTC(),
    createdAt: serverTimestamp()
  };
  if (!snap.exists()) {
    await setDoc(userDocRef, base, { merge: true });
    return base;
  }
  const data = snap.data() || {};
  // Reset daily if date changed
  const lastDate = data.lastTaskDate;
  const t = todayUTC();
  if (lastDate !== t) {
    await updateDoc(userDocRef, { dailyTasksCompleted: 0, lastTaskDate: t });
    data.dailyTasksCompleted = 0;
    data.lastTaskDate = t;
  }
  return { ...base, ...data };
}

function applyUserUI(u) {
  document.getElementById('welcomeName').textContent = `Hello, ${u.name}`;
  document.getElementById('profileName').textContent = u.name;
  document.getElementById('profileId').textContent = `ID: ${u.id}`;
  const refLink = `https://t.me/earnmini_bot?start=${u.id}`;
  const refInput = document.getElementById('refLink');
  refInput.value = refLink;
  document.getElementById('copyRef').onclick = async () => {
    try { await navigator.clipboard.writeText(refLink); showToast('Referral link copied', 'success'); } catch { showToast('Copy failed', 'danger'); }
  };
  updateHeaderProfile(u.name, u.photo_url);
}

async function loadReferralStats(u) {
  try {
    const rDoc = await getDoc(doc(db, 'referrals', String(u.id)));
    const count = rDoc.exists() ? (rDoc.data().referee_ids?.length || 0) : 0;
    updateReferralUI(count);
  } catch { updateReferralUI(0); }
}

async function loadWithdrawals(u) {
  const list = document.getElementById('withdrawList');
  list.innerHTML = '';
  try {
    const qy = query(collection(db, 'withdrawals'), where('userId','==', String(u.id)), orderBy('requestedAt','desc'));
    const qs = await getDocs(qy);
    qs.forEach(docSnap => {
      const w = docSnap.data();
      const item = document.createElement('div');
      item.className = 'border rounded p-2 d-flex justify-content-between align-items-center';
      item.innerHTML = `<div><div class="small text-muted">${w.method} • ${w.account}</div><div>${w.amount} pts</div></div><span class="badge text-bg-${w.status==='completed'?'success':w.status==='rejected'?'danger':'secondary'} text-capitalize">${w.status}</span>`;
      list.appendChild(item);
    });
  } catch {}
}

function bindNav() {
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      setActive(target);
    });
  });
}

function bindWithdrawForm() {
  const form = document.getElementById('withdrawForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const method = document.getElementById('method').value;
    const account = document.getElementById('account').value.trim();
    const amount = parseInt(document.getElementById('amount').value, 10);
    if ((userData.points||0) < Math.max(1000, amount)) {
      showToast('Insufficient points', 'warning');
      return;
    }
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: String(currentUser.id),
        method, account, amount,
        status: 'pending',
        requestedAt: serverTimestamp()
      });
      showToast('Withdrawal requested', 'success');
      await loadWithdrawals(currentUser);
    } catch (e) {
      showToast('Request failed', 'danger');
    }
  });
}

function bindReferShare() {
  document.getElementById('referBtn').addEventListener('click', async () => {
    const link = document.getElementById('refLink').value;
    if (tg?.shareURL) {
      tg.shareURL(link);
    } else if (navigator.share) {
      try { await navigator.share({ title: 'Join Earn Mini Bot', url: link }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(link); showToast('Link copied', 'success'); } catch { showToast('Copy failed', 'danger'); }
    }
  });
}

function bindEarn() {
  const btn = document.getElementById('startTask');
  const adBox = document.getElementById('adContainer');
  const timerEl = document.getElementById('adCountdown');
  let busy = false;
  btn.addEventListener('click', async () => {
    const limit = adminSettings.dailyTaskLimit;
    if ((userData.dailyTasksCompleted||0) >= limit) {
      showToast('Daily task limit reached', 'warning');
      return;
    }
    if (busy) return;
    busy = true;
    adBox.classList.remove('d-none');
    let t = 5;
    timerEl.textContent = String(t);
    const iv = setInterval(() => {
      t -= 1; timerEl.textContent = String(t);
      if (t <= 0) { clearInterval(iv); }
    }, 1000);
    setTimeout(async () => {
      try {
        const newPoints = (userData.points||0) + (adminSettings.pointsPerTask||1);
        const newDone = (userData.dailyTasksCompleted||0) + 1;
        await updateDoc(userDocRef, { points: newPoints, dailyTasksCompleted: newDone });
        userData.points = newPoints; userData.dailyTasksCompleted = newDone;
        updateStatsUI();
        showToast(`+${adminSettings.pointsPerTask} point`, 'success');
      } catch { showToast('Failed to record task', 'danger'); }
      adBox.classList.add('d-none');
      busy = false;
    }, 5200);
  });
}

async function init() {
  await loadAdminSettings();
  bindNav();
  bindReferShare();
  bindEarn();
  bindWithdrawForm();

  const tgUser = tg?.initDataUnsafe?.user;
  const user = tgUser ? { id: tgUser.id, name: `${tgUser.first_name||''} ${tgUser.last_name||''}`.trim() || tgUser.username || 'User', photo_url: tgUser.photo_url } : { id: 'demo-user', name: 'Demo User', photo_url: null };
  currentUser = user;
  applyUserUI(user);

  // Create or fetch user doc
  userData = await ensureUserDocument(user);
  updateStatsUI();
  await loadReferralStats(user);
  await loadWithdrawals(user);
}

// copy referral input on click
const refInput = document.getElementById('refLink');
refInput.addEventListener('click', async () => { try { await navigator.clipboard.writeText(refInput.value); showToast('Referral link copied', 'success'); } catch {} });

// start
init().catch(err => {
  console.error(err);
  showToast('Initialization failed', 'danger');
});

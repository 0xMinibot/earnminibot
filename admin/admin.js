import { initializeApp } from 'firebase-app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, getDocs } from 'firebase-firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase-auth';

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
const auth = getAuth(app);

const toastContainer = document.getElementById('toastContainer');
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

const authBox = document.getElementById('authBox');
const content = document.getElementById('adminContent');

onAuthStateChanged(auth, async (user) => {
  if (user) {
    authBox.classList.add('d-none');
    content.classList.remove('d-none');
    await loadSettings();
    await loadWithdrawals();
  } else {
    authBox.classList.remove('d-none');
    content.classList.add('d-none');
  }
});

// Login form
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    showToast('Login failed', 'danger');
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  await signOut(auth);
});

async function loadSettings() {
  const sRef = doc(db, 'adminSettings', 'global');
  const snap = await getDoc(sRef);
  const d = snap.exists()? snap.data() : { dailyTaskLimit: 15, pointsPerTask: 1, referralPoints: 5, commissionRate: 0.1, paymentMethods: ["bKash","Nagad","Binance"] };
  document.getElementById('dailyTaskLimit').value = d.dailyTaskLimit;
  document.getElementById('pointsPerTask').value = d.pointsPerTask;
  document.getElementById('referralPoints').value = d.referralPoints;
  document.getElementById('commissionRate').value = d.commissionRate;
  document.getElementById('paymentMethods').value = (d.paymentMethods||[]).join(', ');

  const form = document.getElementById('settingsForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
      dailyTaskLimit: Number(document.getElementById('dailyTaskLimit').value),
      pointsPerTask: Number(document.getElementById('pointsPerTask').value),
      referralPoints: Number(document.getElementById('referralPoints').value),
      commissionRate: Number(document.getElementById('commissionRate').value),
      paymentMethods: document.getElementById('paymentMethods').value.split(',').map(s => s.trim()).filter(Boolean)
    };
    try {
      await setDoc(sRef, payload, { merge: true });
      showToast('Settings saved', 'success');
    } catch(e) { showToast('Save failed', 'danger'); }
  };
}

async function loadWithdrawals() {
  const wrap = document.getElementById('withdrawals');
  wrap.innerHTML = '';
  const qy = query(collection(db, 'withdrawals'), orderBy('requestedAt','desc'));
  const qs = await getDocs(qy);
  qs.forEach(docSnap => {
    const id = docSnap.id; const w = docSnap.data();
    const row = document.createElement('div');
    row.className = 'border rounded p-2 d-flex justify-content-between align-items-center';
    row.innerHTML = `<div><div class="small text-muted">${w.userId} • ${w.method} • ${w.account}</div><div>${w.amount} pts</div></div>
    <div class="btn-group">
      <button class="btn btn-sm btn-outline-success">Approve</button>
      <button class="btn btn-sm btn-outline-danger">Reject</button>
    </div>`;
    const [approveBtn, rejectBtn] = row.querySelectorAll('button');
    approveBtn.addEventListener('click', async () => { await updateDoc(docSnap.ref, { status: 'completed' }); showToast('Approved', 'success'); await loadWithdrawals(); });
    rejectBtn.addEventListener('click', async () => { await updateDoc(docSnap.ref, { status: 'rejected' }); showToast('Rejected', 'warning'); await loadWithdrawals(); });
    wrap.appendChild(row);
  });
}

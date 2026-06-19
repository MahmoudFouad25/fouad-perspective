// booking-backend.js
// Shared backend for the coaching booking system.
// Primary store: the user's own Firebase Firestore project (fouad-perspective).
// Fallback: localStorage (used automatically in preview when Firestore/SDK is unreachable),
// so the design always demonstrates the full flow.

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
  authDomain: "fouad-perspective.firebaseapp.com",
  projectId: "fouad-perspective",
  storageBucket: "fouad-perspective.firebasestorage.app",
  messagingSenderId: "1068763865336",
  appId: "1:1068763865336:web:b791abcd22d536aedd5b0d",
  measurementId: "G-RY1FYVB3Q9"
};

export const COLLECTION = "coachingSlots";
export const ADMIN_EMAIL = "admin@fouad-academy.com";
const LS_KEY = "coaching_booking_fb_v1";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function getFirebase() {
  // Wait for the compat SDK injected via <helmet> to finish loading.
  for (let i = 0; i < 80 && !(window.firebase && window.firebase.firestore); i++) await wait(50);
  if (!(window.firebase && window.firebase.firestore)) throw new Error("firebase-sdk-missing");
  if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
  return window.firebase;
}

function sortSlots(list) {
  return list.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// ----------------------------- Firestore backend -----------------------------
class FirestoreBackend {
  constructor(fb) {
    this.fb = fb;
    this.db = fb.firestore();
    this.kind = "cloud";
  }

  async testRead() {
    await Promise.race([
      this.db.collection(COLLECTION).limit(1).get(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4500))
    ]);
    return true;
  }

  subscribe(cb) {
    return this.db.collection(COLLECTION).onSnapshot(
      (snap) => {
        const slots = [];
        snap.forEach((d) => slots.push({ id: d.id, ...d.data() }));
        cb(sortSlots(slots), null);
      },
      (err) => cb(null, err)
    );
  }

  async addSlot(s) {
    await this.db.collection(COLLECTION).add({
      date: s.date,
      time: s.time,
      duration: s.duration,
      booked: false,
      booking: null,
      createdAt: this.fb.firestore.FieldValue.serverTimestamp()
    });
  }

  async deleteSlot(id) {
    await this.db.collection(COLLECTION).doc(id).delete();
  }

  // Transaction guarantees no two clients book the same slot.
  async bookSlot(id, booking) {
    await this.db.runTransaction(async (tx) => {
      const ref = this.db.collection(COLLECTION).doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("gone");
      if (snap.data().booked) throw new Error("taken");
      tx.update(ref, {
        booked: true,
        booking: { name: booking.name, phone: booking.phone, note: booking.note || "", at: Date.now() },
        bookedAt: this.fb.firestore.FieldValue.serverTimestamp()
      });
    });
  }

  async cancelBooking(id) {
    await this.db.collection(COLLECTION).doc(id).update({ booked: false, booking: null });
  }

  onAuth(cb) {
    return this.fb.auth().onAuthStateChanged((u) => cb(u));
  }
  signIn(email, pass) {
    return this.fb.auth().signInWithEmailAndPassword(email, pass);
  }
  signOut() {
    return this.fb.auth().signOut();
  }
}

// ----------------------------- Local fallback backend -----------------------------
class LocalBackend {
  constructor() {
    this.kind = "local";
    this.subs = [];
    this._load();
    this._storageHandler = (e) => {
      if (e.key === LS_KEY) {
        this._load();
        this._emit();
      }
    };
    window.addEventListener("storage", this._storageHandler);
  }

  _load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) {}
    if (!Array.isArray(s) || !s.length) { s = seedSlots(); this._persist(s); }
    this.slots = s;
  }
  _persist(s) {
    this.slots = s;
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {}
  }
  _save(s) { this._persist(s); this._emit(); }
  _emit() { this.subs.forEach((cb) => cb(sortSlots(this.slots), null)); }

  async testRead() { return true; }

  subscribe(cb) {
    this.subs.push(cb);
    cb(sortSlots(this.slots), null);
    return () => { this.subs = this.subs.filter((x) => x !== cb); };
  }

  async addSlot(s) {
    const ns = { id: "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), date: s.date, time: s.time, duration: s.duration, booked: false, booking: null };
    this._save([...this.slots, ns]);
  }
  async deleteSlot(id) { this._save(this.slots.filter((x) => x.id !== id)); }
  async bookSlot(id, booking) {
    const cur = this.slots.find((x) => x.id === id);
    if (!cur) throw new Error("gone");
    if (cur.booked) throw new Error("taken");
    this._save(this.slots.map((x) => x.id === id ? { ...x, booked: true, booking: { name: booking.name, phone: booking.phone, note: booking.note || "", at: Date.now() } } : x));
  }
  async cancelBooking(id) { this._save(this.slots.map((x) => x.id === id ? { ...x, booked: false, booking: null } : x)); }

  // In local/demo mode the admin panel is open (no real auth available).
  onAuth(cb) { cb({ email: ADMIN_EMAIL, local: true }); return () => {}; }
  async signIn() { return { email: ADMIN_EMAIL }; }
  async signOut() {}
}

function iso(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function seedSlots() {
  const out = [];
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const plan = [
    { add: 1, times: ["11:00", "14:00", "16:00"] },
    { add: 2, times: ["10:00", "13:00"] },
    { add: 4, times: ["12:00", "15:00", "17:00", "19:00"] },
    { add: 5, times: ["11:00", "18:00"] },
    { add: 8, times: ["14:00", "16:00"] }
  ];
  let i = 0;
  plan.forEach((p) => {
    const d = new Date(base); d.setDate(d.getDate() + p.add);
    p.times.forEach((t) => out.push({ id: "s_seed_" + (i++), date: iso(d), time: t, duration: 60, booked: false, booking: null }));
  });
  if (out[1]) { out[1].booked = true; out[1].booking = { name: "مريم حسن", phone: "01001234567", note: "", at: Date.now() }; }
  if (out[6]) { out[6].booked = true; out[6].booking = { name: "أحمد سمير", phone: "01122334455", note: "حابب نركز على مرآة العلاقات", at: Date.now() }; }
  return out;
}

export function createLocalBackend() {
  return new LocalBackend();
}

// Returns a cloud backend when the Firebase SDK is present, else a local one.
// (Read-permission is verified separately via backend.testRead() by the caller.)
export async function createBackend() {
  try {
    const fb = await getFirebase();
    return new FirestoreBackend(fb);
  } catch (e) {
    console.warn("[booking] Firebase unavailable, using local fallback:", e && e.message);
    return new LocalBackend();
  }
}

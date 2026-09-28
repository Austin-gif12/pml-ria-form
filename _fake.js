// TEST ONLY — in-memory stand-in for the Firebase modules. Deleted before anything is uploaded.
const store = new Map();
const listeners = new Set();
let n = 0;
export const auth = { currentUser: { email: 'austin@pml.test' } };
export const db = {};
export const onAuthStateChanged = (a, cb) => setTimeout(() => cb(auth.currentUser), 0);
export const signOut = async () => {};
export const serverTimestamp = () => ({ __ts: true });
const ts = t => ({ __t: t, toMillis: () => t, toDate: () => new Date(t) });
const stamp = v => (v && v.__ts ? ts(Date.now()) : v);
const clean = d => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, stamp(v)]));
const val = v => (v && v.toMillis ? v.toMillis() : (v ?? 0));
export const collection = (a, ...s) => a.__doc ? { __col: 1, path: a.path + '/' + s.join('/') } : { __col: 1, path: s.join('/') };
export const doc = (a, ...s) => a.__col ? { __doc: 1, path: a.path + '/' + s[0], id: s[0] } : { __doc: 1, path: s.join('/'), id: s[s.length - 1] };
export const orderBy = (f, dir) => ({ __ord: f, dir });
export const query = (c, ...cs) => ({ ...c, ord: cs.find(x => x.__ord) });
const children = path => [...store.keys()].filter(k => k.startsWith(path + '/') && !k.slice(path.length + 1).includes('/'));
const mkDoc = path => ({ id: path.split('/').pop(), ref: { __doc: 1, path, id: path.split('/').pop() }, data: () => store.get(path), exists: () => store.has(path), metadata: { hasPendingWrites: false } });
function run(l) {
  const t = l.target;
  if (t.__doc) { l.cb({ id: t.id, exists: () => store.has(t.path), data: () => store.get(t.path), metadata: { hasPendingWrites: false, fromCache: false } }); return; }
  let paths = children(t.path);
  if (t.ord) { paths.sort((x, y) => val(store.get(x)[t.ord.__ord]) - val(store.get(y)[t.ord.__ord])); if (t.ord.dir === 'desc') paths.reverse(); }
  const docs = paths.map(mkDoc);
  const cur = new Map(paths.map(p => [p, JSON.stringify(store.get(p))]));
  const changes = [];
  docs.forEach((d, i) => { const p = d.ref.path; if (!l.prev.has(p)) changes.push({ type: 'added', doc: d, newIndex: i, oldIndex: -1 }); else if (l.prev.get(p) !== cur.get(p)) changes.push({ type: 'modified', doc: d, newIndex: i, oldIndex: i }); });
  l.prev.forEach((v, p) => { if (!cur.has(p)) changes.push({ type: 'removed', doc: { id: p.split('/').pop(), data: () => ({}) }, newIndex: -1, oldIndex: 0 }); });
  l.prev = cur;
  l.cb({ docs, empty: !docs.length, forEach: f => docs.forEach(f), docChanges: () => changes, metadata: { hasPendingWrites: false, fromCache: false } });
}
const notify = () => setTimeout(() => listeners.forEach(run), 0);
export function onSnapshot(target, a, b) { const cb = typeof a === 'function' ? a : b; const l = { target, cb, prev: new Map() }; listeners.add(l); run(l); return () => listeners.delete(l); }
export async function addDoc(col, data) { const id = 'id' + (++n); store.set(col.path + '/' + id, clean(data)); notify(); return { id }; }
// dotted paths ("pre.cType") update one nested value, like the real SDK
export async function updateDoc(ref, data) {
  if (!store.has(ref.path)) throw new Error('not found: ' + ref.path);
  const cur = JSON.parse(JSON.stringify(store.get(ref.path)));
  Object.entries(clean(data)).forEach(([k, v]) => {
    const parts = k.split('.'); let o = cur;
    parts.slice(0, -1).forEach(p => { o[p] = o[p] && typeof o[p] === 'object' ? o[p] : {}; o = o[p]; });
    o[parts[parts.length - 1]] = v;
  });
  store.set(ref.path, cur); notify();
}
export async function deleteDoc(ref) { store.delete(ref.path); notify(); }
export async function getDocs(col) { return { docs: children(col.path).map(mkDoc) }; }
export const __store = store;

// ── seed ──
function fakePhoto(w, h, hue, label) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, `hsl(${hue},45%,38%)`); grd.addColorStop(1, `hsl(${hue + 40},50%,62%)`);
  g.fillStyle = grd; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(w * .3, h * .12, w * .4, h * .76);
  g.fillStyle = '#0E0602'; g.font = 'bold 40px sans-serif'; g.fillText(label, 20, h - 24);
  return cv.toDataURL('image/jpeg', .6);
}
const now = Date.now();
store.set('jobs/job1', clean({ riaRef: 'RIA-2026-014', projRef: 'PML-2026-052', approvedPerson: 'Austin Leivers', approvedNum: 'AP-1042', siteAddress: 'Lady Margaret Boat Club\nBiggin Drive, Cambridge, CB4 1PG', sigName: 'Austin Leivers', sigDate: '2026-09-18', updatedAt: ts(now) }));
const surveyDone = { init: 'AL', sig: 'Austin Leivers', date: '2026-09-14', res: 'FD30S', exSit: 'Existing door & frame to be removed', cType: 'Concrete block', cBoards: 'Not applicable', cBoardT: 'Not applicable', thk: '100', cnd: 'Minor damage — to be made good', rep: 'Responsible Person', n_cond: 'Chipped reveal on hinge side, made good.', w: '926', h: '2040', d: '100', ffl: 'Yes', toC: '300', toD: '900', pen: 'None' };
const blank = { ref: '', loc: '— Select —', locFree: '', fp: '— Select —', date: '', init: '— —', initFree: '', plugMfr: '— Select —', plugInst: '— Select —', doorDoc: '— Select —', fsDoc: '— Select —', comments: '' };
// d1: survey complete, installation not started -> unlocked
store.set('jobs/job1/doors/d1', clean({ ...blank, ref: 'FD-01', loc: 'Front Entrance', pre: surveyDone, order: now + 1 }));
// d2: survey half done -> locked
store.set('jobs/job1/doors/d2', clean({ ...blank, ref: 'FD-02', loc: 'Flat Entrance - Flat 1', pre: { init: 'PB', res: 'FD30S', exSit: 'No existing door (new opening)' }, order: now + 2 }));
// d3: installed before the survey existed -> stays editable ("legacy")
store.set('jobs/job1/doors/d3', clean({ ...blank, ref: 'FD-03', loc: '— Select —', locFree: 'Bin store (west elevation)', fp: 'FD60', date: '2026-09-10', init: 'AL', plugMfr: 'Blue', plugInst: 'Q-Mark Label', doorDoc: 'Fire Test Report', fsDoc: 'Mineral Wool Cert', comments: 'Gap to frame packed and sealed.', pre: {}, order: now + 3 }));
const P = (door, slot, w, h, hue, label, k) => store.set(`jobs/job1/doors/${door}/photos/p_${door}_${slot}_${k}`, { slot, data: fakePhoto(w, h, hue, label), createdAt: ts(now + k) });
['existing', 'constr', 'thick', 'cond', 'size', 'prox'].forEach((a, i) => P('d1', 'pre_' + a, 900, 675, 30 + i * 45, a, i + 1));
P('d1', 'before', 900, 675, 20, 'FD-01 before', 10);
P('d2', 'pre_existing', 900, 675, 120, 'FD-02 existing', 11);
P('d3', 'before', 900, 675, 200, 'FD-03 before', 12);
P('d3', 'during', 675, 900, 260, 'FD-03 during', 13);

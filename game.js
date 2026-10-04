// =====================================================================
//  TRAP WORLD — 10 LEVELS TROLL v2
//  ← → di chuyển | SPACE/W/↑ nhảy | SHIFT/J dash | K/F bắn
// =====================================================================

// ==================== SUPABASE ====================
const SUPABASE_URL = 'https://arsjkllkuzzuirzwizbb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TEd2W1BMSQ6drePcwf_FyQ_FZ8dGVTj';
let supabaseClient = null, currentUser = null;
let isAdmin = false, godMode = false;
// =====================================================================
//  ÂM THANH — MP3 nhạc nền + SFX Web Audio
// =====================================================================
let audioCtx = null;
let sfxGain = null;
let sfxVolume = parseFloat(localStorage.getItem('tw_sfxVol') || '0.5');
let musicVolume = parseFloat(localStorage.getItem('tw_musicVol') || '0.4');
let currentBgm = null;

// ==================== SFX ====================
function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = sfxVolume;
        sfxGain.connect(audioCtx.destination);
    } catch(e) { console.warn('Audio không hỗ trợ'); }
}

function playTone(freq, dur, type = 'square', vol = 0.3, slide = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), audioCtx.currentTime + dur);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(g); g.connect(sfxGain);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
}

function sfxJump()       { playTone(400, 0.12, 'square', 0.25, 400); }
function sfxDoubleJump() { playTone(600, 0.15, 'square', 0.25, 500); }
function sfxDash()       { playTone(200, 0.15, 'sawtooth', 0.3, 600); }
function sfxCoin()       { playTone(880, 0.08, 'square', 0.3); setTimeout(() => playTone(1320, 0.12, 'square', 0.3), 60); }
function sfxStar()       { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 0.1, 'square', 0.3), i * 50)); }
function sfxHurt()       { playTone(300, 0.2, 'sawtooth', 0.35, -200); }
function sfxDie()        { [400, 350, 300, 250, 200, 150].forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'square', 0.3), i * 80)); }
function sfxBounce()     { playTone(500, 0.18, 'square', 0.3, 700); }
function sfxStomp()      { playTone(180, 0.1, 'square', 0.35, -80); }
function sfxFinish()     { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'square', 0.35), i * 100)); }
function sfxTrap()       { playTone(120, 0.4, 'sawtooth', 0.4, -80); }
function sfxTeleport()   { [1200, 900, 600, 300].forEach((f, i) => setTimeout(() => playTone(f, 0.06, 'sine', 0.3), i * 30)); }
function sfxShield()     { playTone(700, 0.15, 'sine', 0.3, 300); }
function sfxKill()       { playTone(80, 0.3, 'sawtooth', 0.4, -40); }
function sfxScore()      { playTone(660, 0.1, 'square', 0.28); setTimeout(() => playTone(990, 0.12, 'square', 0.28), 60); }
// ==================== NHẠC NỀN ====================
function playMusicForLevel(level) {
    let id;
    if (level <= 3) id = 'bgm1';
    else if (level <= 6) id = 'bgm2';
    else if (level <= 9) id = 'bgm3';
    else id = 'bgm4';

    // Dừng nhạc cũ
    document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; });

    const bgm = document.getElementById(id);
    if (!bgm) { console.warn('Thiếu file ' + id + '.mp3'); return; }
    bgm.volume = musicVolume;
    bgm.play().catch(e => console.warn('Không phát được nhạc:', e));
    currentBgm = bgm;
}

function stopMusic() {
    document.querySelectorAll('audio').forEach(a => a.pause());
    currentBgm = null;
}

function setMusicVolume(v) {
    musicVolume = v;
    localStorage.setItem('tw_musicVol', v);
    if (currentBgm) currentBgm.volume = v;
}
function setSfxVolume(v) {
    sfxVolume = v;
    localStorage.setItem('tw_sfxVol', v);
    if (sfxGain) sfxGain.gain.value = v;
}
try {
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase OK');
    }
} catch(e) { console.error('Supabase init:', e); }

// ==================== ADMIN / GOD ====================
function updateAdminButton() {
    const btn = document.getElementById('admin-toggle-btn');
    if (btn) btn.style.display = isAdmin ? 'inline-block' : 'none';
}
function updateGodButton() {
    const btn = document.getElementById('god-toggle-btn');
    if (!btn) return;
    btn.style.display = isAdmin ? 'inline-block' : 'none';
    if (godMode) {
        btn.style.background = 'linear-gradient(180deg,#ffd700,#b8860b)';
        btn.style.color = '#000';
        btn.innerText = '⚡ GOD: ON';
        btn.style.boxShadow = '0 0 25px rgba(255,215,0,0.9)';
    } else {
        btn.style.background = 'linear-gradient(180deg,#3f3f5f,#1e1e38)';
        btn.style.color = '#fff';
        btn.innerText = '⚡ GOD: OFF';
        btn.style.boxShadow = 'none';
    }
}
function toggleGodMode() {
    if (!isAdmin) { alert('Chỉ admin mới bật được God Mode!'); return; }
    godMode = !godMode;
    updateGodButton();
}
function updateUserBar() {
    const el = document.getElementById('user-info-bar');
    if (el) el.innerText = currentUser ? `👤 ${currentUser}` : '👤 KHÁCH';
}

// ==================== ADMIN PANEL ====================
function ensureAdminPanel() {
    if (document.getElementById('admin-panel')) return;
    const p = document.createElement('div');
    p.id = 'admin-panel'; p.className = 'hidden';
    p.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(5,5,15,0.97);backdrop-filter:blur(8px);overflow-y:auto;padding:20px;color:#fff;font-family:"Courier New",monospace;';
    p.innerHTML = `<div style="max-width:1400px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h1 style="color:#ffd700;font-size:36px;margin:0;">👑 ADMIN PANEL</h1>
            <button onclick="closeAdminPanel()" style="background:linear-gradient(180deg,#ff4757,#c23616);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-family:inherit;">✕ ĐÓNG</button>
        </div>
        <div id="admin-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;"></div>
        <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
            <button onclick="adminResetLeaderboard()" style="background:linear-gradient(180deg,#ff4757,#c23616);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:bold;cursor:pointer;font-family:inherit;">🗑 RESET BXH</button>
            <button onclick="refreshAdminData()" style="background:linear-gradient(180deg,#2ed573,#1e9e50);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:bold;cursor:pointer;font-family:inherit;">🔄 REFRESH</button>
            <input id="admin-search" placeholder="🔍 Tìm user..." oninput="adminFilterUsers()" style="padding:10px 14px;background:rgba(20,20,40,0.9);border:1px solid rgba(255,215,0,0.3);border-radius:8px;color:#fff;font-family:inherit;width:220px;">
        </div>
        <h2 style="color:#ffd700;font-size:20px;margin:20px 0 10px;">👥 USERS</h2>
        <div style="overflow-x:auto;background:rgba(0,0,0,0.4);border-radius:10px;padding:8px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead><tr style="background:rgba(255,215,0,0.15);">
                    <th style="padding:10px;text-align:left;color:#ffd700;">ID</th>
                    <th style="padding:10px;text-align:left;color:#ffd700;">USERNAME</th>
                    <th style="padding:10px;text-align:left;color:#ffd700;">VÍ</th>
                    <th style="padding:10px;text-align:left;color:#ffd700;">LOGIN CUỐI</th>
                    <th style="padding:10px;text-align:left;color:#ffd700;">HÀNH ĐỘNG</th>
                </tr></thead><tbody id="admin-users-body"></tbody>
            </table>
        </div>
        <h2 style="color:#ffd700;font-size:20px;margin:30px 0 10px;">🏆 TOP SCORES</h2>
        <div style="overflow-x:auto;background:rgba(0,0,0,0.4);border-radius:10px;padding:8px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead><tr style="background:rgba(255,215,0,0.15);">
                    <th style="padding:10px;text-align:left;color:#ffd700;">#</th>
                    <th style="padding:10px;text-align:left;color:#ffd700;">USER</th>
                    <th style="padding:10px;text-align:left;color:#ffd700;">SCORE</th>
                    <th style="padding:10px;text-align:left;color:#ffd700;">COIN</th>
                    <th style="padding:10px;text-align:left;color:#ffd700;">XÓA</th>
                </tr></thead><tbody id="admin-scores-body"></tbody>
            </table>
        </div>
    </div>`;
    document.body.appendChild(p);
    if (!document.getElementById('admin-css')) {
        const st = document.createElement('style');
        st.id = 'admin-css';
        st.textContent = `.adm-btn{background:linear-gradient(180deg,#3f3f5f,#1e1e38);color:#fff;border:none;padding:5px 9px;border-radius:6px;font-weight:bold;cursor:pointer;font-family:inherit;font-size:12px;margin:0 2px;}.adm-btn:hover{background:linear-gradient(180deg,#5f5f7f,#3f3f5f);}.adm-btn-danger{background:linear-gradient(180deg,#ff4757,#c23616);}.adm-stat{background:linear-gradient(180deg,rgba(20,20,40,0.9),rgba(10,10,25,0.9));border:1px solid rgba(255,215,0,0.3);border-radius:12px;padding:16px;text-align:center;}.adm-stat-val{font-size:28px;font-weight:bold;color:#fff;}.adm-stat-lbl{font-size:12px;color:#a8b2c8;margin-top:4px;}#admin-users-body td,#admin-scores-body td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.05);}`;
        document.head.appendChild(st);
    }
}
function openAdminPanel() {
    if (!isAdmin) return;
    ensureAdminPanel();
    document.getElementById('admin-panel').classList.remove('hidden');
    refreshAdminData();
}
function closeAdminPanel() {
    const p = document.getElementById('admin-panel');
    if (p) p.classList.add('hidden');
}
let adminFilter = '';
async function refreshAdminData() {
    if (!supabaseClient) return;
    const { data: users } = await supabaseClient.from('users').select('*');
    const { data: scores } = await supabaseClient.from('scores').select('*').order('score', { ascending: false }).limit(100);
    const stats = document.getElementById('admin-stats');
    if (stats && users && scores) {
        const banned = users.filter(u => u.is_banned).length;
        const totalCoins = scores.reduce((s, r) => s + (r.coins || 0), 0);
        const top = scores.reduce((m, r) => Math.max(m, r.score || 0), 0);
        stats.innerHTML = `
            <div class="adm-stat"><div class="adm-stat-val">${users.length}</div><div class="adm-stat-lbl">👥 USERS</div></div>
            <div class="adm-stat"><div class="adm-stat-val" style="color:#ff4757">${banned}</div><div class="adm-stat-lbl">🚫 BANNED</div></div>
            <div class="adm-stat"><div class="adm-stat-val">${scores.length}</div><div class="adm-stat-lbl">🎮 LƯỢT CHƠI</div></div>
            <div class="adm-stat"><div class="adm-stat-val" style="color:#ffd700">${totalCoins.toLocaleString()}</div><div class="adm-stat-lbl">🪙 COIN</div></div>
            <div class="adm-stat"><div class="adm-stat-val" style="color:#2ed573">${top.toLocaleString()}</div><div class="adm-stat-lbl">🏆 TOP</div></div>`;
    }
    const utb = document.getElementById('admin-users-body');
    if (utb && users) {
        const filtered = adminFilter ? users.filter(u => u.username.toLowerCase().includes(adminFilter.toLowerCase())) : users;
        utb.innerHTML = filtered.length ? '' : '<tr><td colspan="5" style="padding:20px;text-align:center;color:#888">Không có user</td></tr>';
        filtered.forEach(u => {
            utb.innerHTML += `<tr>
                <td>${u.id}</td>
                <td><b style="color:${u.is_admin ? '#ffd700' : '#fff'}">${u.is_admin ? '👑 ' : ''}${u.username}</b>${u.is_banned ? ' <span style="color:#ff4757">[BANNED]</span>' : ''}</td>
                <td>${(u.wallet || 0).toLocaleString()}</td>
                <td style="font-size:11px;color:#a8b2c8">${u.last_login ? new Date(u.last_login).toLocaleString('vi') : '—'}</td>
                <td style="white-space:nowrap">
                    <button class="adm-btn" onclick="admGiveCoin('${u.username}')">🪙</button>
                    <button class="adm-btn" onclick="admToggleBan('${u.username}',${u.is_banned})">${u.is_banned ? '✅' : '🚫'}</button>
                    <button class="adm-btn" onclick="admToggleAdmin('${u.username}',${u.is_admin})">${u.is_admin ? '👤' : '👑'}</button>
                    <button class="adm-btn adm-btn-danger" onclick="admDeleteUser('${u.username}')">🗑</button>
                </td></tr>`;
        });
    }
    const stb = document.getElementById('admin-scores-body');
    if (stb && scores) {
        stb.innerHTML = scores.length ? '' : '<tr><td colspan="5" style="padding:20px;text-align:center;color:#888">Chưa có điểm</td></tr>';
        scores.forEach((s, i) => {
            stb.innerHTML += `<tr>
                <td>${i + 1}</td><td>${s.username}</td>
                <td style="color:#ffd700;font-weight:bold">${s.score}</td>
                <td>🪙 ${s.coins}</td>
                <td><button class="adm-btn adm-btn-danger" onclick="admDeleteScore(${s.id})">🗑</button></td>
            </tr>`;
        });
    }
}
function adminFilterUsers() {
    const inp = document.getElementById('admin-search');
    adminFilter = inp ? inp.value : '';
    refreshAdminData();
}
async function admGiveCoin(username) {
    const n = prompt(`Cấp coin cho "${username}":`, '1000');
    if (!n || isNaN(parseInt(n))) return;
    const amt = parseInt(n);
    const { data } = await supabaseClient.from('users').select('wallet').eq('username', username).single();
    const newW = Math.max(0, (data?.wallet || 0) + amt);
    await supabaseClient.from('users').update({ wallet: newW }).eq('username', username);
    alert(`✅ Ví mới: ${newW}`);
    refreshAdminData();
}
async function admToggleBan(username, isBanned) {
    if (username === currentUser) return alert('Không tự ban chính mình!');
    if (!confirm(`${isBanned ? 'Bỏ ban' : 'Ban'} "${username}"?`)) return;
    await supabaseClient.from('users').update({ is_banned: !isBanned }).eq('username', username);
    refreshAdminData();
}
async function admToggleAdmin(username, isAdminNow) {
    if (username === currentUser) return alert('Không tự bỏ quyền!');
    if (!confirm(`${isAdminNow ? 'Bỏ' : 'Cấp'} quyền admin?`)) return;
    await supabaseClient.from('users').update({ is_admin: !isAdminNow }).eq('username', username);
    refreshAdminData();
}
async function admDeleteUser(username) {
    if (username === currentUser) return alert('Không tự xóa!');
    if (!confirm(`XÓA VĨNH VIỄN "${username}"?`)) return;
    await supabaseClient.from('users').delete().eq('username', username);
    await supabaseClient.from('scores').delete().eq('username', username);
    refreshAdminData();
}
async function admDeleteScore(id) {
    if (!confirm('Xóa bản ghi điểm này?')) return;
    await supabaseClient.from('scores').delete().eq('id', id);
    refreshAdminData();
}
async function adminResetLeaderboard() {
    if (!confirm('XÓA TOÀN BỘ bảng xếp hạng?')) return;
    if (!confirm('Chắc chắn chứ?')) return;
    await supabaseClient.from('scores').delete().neq('id', 0);
    alert('✅ Đã reset!');
    refreshAdminData();
}

// ==================== UPGRADES ====================
const UPGRADE_DEFS = {
    maxHp:     { icon:'❤️', name:'MÁU TỐI ĐA', desc:'+1 HP',   max:5, cost: lv => 500 + lv * 300 },
    dashCd:    { icon:'⚡', name:'HỒI DASH',   desc:'-15% CD', max:5, cost: lv => 600 + lv * 350 },
    jumpBoost: { icon:'🦘', name:'LỰC NHẢY',   desc:'+8%',    max:5, cost: lv => 400 + lv * 250 },
    magnet:    { icon:'🧲', name:'NAM CHÂM',   desc:'+50px',  max:3, cost: lv => 700 + lv * 400 },
    shield:    { icon:'🛡️', name:'KHIÊN ĐẦU',  desc:'+1',     max:3, cost: lv => 1000 + lv * 500 },
    luck:      { icon:'🍀', name:'MAY MẮN',    desc:'+10%',   max:3, cost: lv => 800 + lv * 450 }
};
let wallet = parseInt(localStorage.getItem('tw_wallet') || '0');
let upgrades = JSON.parse(localStorage.getItem('tw_upgrades') || '{}');
for (const k in UPGRADE_DEFS) if (!(k in upgrades)) upgrades[k] = 0;
let bestTime = parseFloat(localStorage.getItem('tw_bestTime') || '0');
function saveProgress() {
    localStorage.setItem('tw_wallet', wallet);
    localStorage.setItem('tw_upgrades', JSON.stringify(upgrades));
}
function ensureUpgradeScreen() {
    if (document.getElementById('upgrade-screen')) return;
    const s = document.createElement('div');
    s.id = 'upgrade-screen'; s.className = 'screen hidden';
    s.innerHTML = `<h1 style="font-size:46px">⚙ NÂNG CẤP</h1>
        <div style="color:#ffd700;font-size:22px;font-weight:bold;margin-bottom:14px">🪙 VÍ: <span id="up-wallet">0</span></div>
        <div id="up-list" style="display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:10px;max-width:720px;margin-bottom:18px"></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
            <button class="btn btn-secondary" onclick="resetUpgrades()">↺ RESET</button>
            <button class="btn" onclick="showScreen('menu-screen')">← QUAY LẠI</button>
        </div>`;
    document.getElementById('game-container').appendChild(s);
}
function openUpgradeScreen() { ensureUpgradeScreen(); showScreen('upgrade-screen'); renderUpgrades(); }
function renderUpgrades() {
    document.getElementById('up-wallet').innerText = wallet.toLocaleString();
    const list = document.getElementById('up-list');
    list.innerHTML = '';
    for (const key in UPGRADE_DEFS) {
        const def = UPGRADE_DEFS[key], lv = upgrades[key];
        const maxed = lv >= def.max, cost = maxed ? 0 : def.cost(lv), afford = wallet >= cost;
        const div = document.createElement('div');
        div.style.cssText = `background:linear-gradient(180deg,rgba(20,20,40,0.9),rgba(10,10,25,0.9));border:1px solid ${maxed?'#2ed573':'rgba(255,71,87,0.4)'};border-radius:12px;padding:12px 14px;text-align:left;`;
        div.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><div style="font-size:17px;font-weight:bold;color:#fff">${def.icon} ${def.name}</div><div style="font-size:13px;color:#a8b2c8">${'★'.repeat(lv)}${'☆'.repeat(def.max-lv)}</div></div><div style="font-size:12px;color:#a8b2c8;margin-bottom:8px">${def.desc}</div><button ${maxed||!afford?'disabled':''} onclick="buyUpgrade('${key}')" style="width:100%;padding:8px;border:none;border-radius:8px;font-weight:bold;cursor:${maxed||!afford?'not-allowed':'pointer'};background:${maxed?'linear-gradient(180deg,#2ed573,#1e9e50)':afford?'linear-gradient(180deg,#ff4757,#c23616)':'linear-gradient(180deg,#3f3f5f,#1e1e38)'};color:#fff;font-family:inherit;font-size:14px;">${maxed?'✓ TỐI ĐA':`🪙 ${cost.toLocaleString()}`}</button>`;
        list.appendChild(div);
    }
}
function buyUpgrade(key) {
    const def = UPGRADE_DEFS[key], lv = upgrades[key];
    if (lv >= def.max) return;
    const cost = def.cost(lv);
    if (wallet < cost) return;
    wallet -= cost; upgrades[key]++; saveProgress(); renderUpgrades();
}
function resetUpgrades() {
    if (!confirm('Reset toàn bộ nâng cấp?')) return;
    for (const k in UPGRADE_DEFS) upgrades[k] = 0;
    saveProgress(); renderUpgrades();
}

// ==================== UI ====================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (id) document.getElementById(id).classList.remove('hidden');
}
async function handleRegister() {
    const u = document.getElementById('username-input').value.trim();
    const p = document.getElementById('password-input').value.trim();
    const m = document.getElementById('auth-msg');
    if (!u || !p) return m.innerText = "Nhập đủ thông tin!";
    if (!supabaseClient) return m.innerText = "Chưa cấu hình Supabase!";
    const { error } = await supabaseClient.from('users').insert([{ username: u, password: p }]);
    m.style.color = error ? '#ff4757' : '#2ed573';
    m.innerText = error ? 'Đăng ký thất bại (trùng tên?)' : 'Đăng ký thành công!';
}
async function handleLogin() {
    const u = document.getElementById('username-input').value.trim();
    const p = document.getElementById('password-input').value.trim();
    const m = document.getElementById('auth-msg');
    if (!u || !p) { m.style.color = "#ff4757"; m.innerText = "Nhập đủ thông tin!"; return; }
    if (!supabaseClient) { m.style.color = "#ff4757"; m.innerText = "❌ supabaseClient = null"; return; }
    m.style.color = "#ffa502"; m.innerText = "Đang kiểm tra...";
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 8000));
    try {
        const r = await Promise.race([
            supabaseClient.from('users').select('*').eq('username', u).eq('password', p).maybeSingle(),
            timeout
        ]);
        if (r.error) { m.style.color = "#ff4757"; m.innerText = `❌ Lỗi: ${r.error.code}`; return; }
        if (!r.data) { m.style.color = "#ff4757"; m.innerText = "❌ Sai tài khoản hoặc mật khẩu!"; return; }
        if (r.data.is_banned) { m.style.color = "#ff4757"; m.innerText = "🚫 Tài khoản đã bị khóa!"; return; }
        currentUser = r.data.username;
        isAdmin = r.data.is_admin === true;
        updateUserBar(); updateAdminButton(); updateGodButton();
        supabaseClient.from('users').update({ last_login: new Date().toISOString() })
            .eq('username', currentUser).then(() => {}).catch(() => {});
        m.style.color = "#2ed573";
        m.innerText = isAdmin ? "✅ Đăng nhập ADMIN!" : "✅ Đăng nhập thành công!";
        setTimeout(() => showScreen('menu-screen'), 400);
    } catch(e) {
        m.style.color = "#ff4757";
        m.innerText = e.message === 'TIMEOUT' ? "⏱ Timeout — Key sai!" : "❌ " + e.message;
    }
}
async function saveScore() {
    if (!currentUser || !supabaseClient) return;
    try {
        await supabaseClient.from('scores').insert([{
            username: currentUser, score: player.score, coins: player.coins,
            stars: player.stars, level: `1-${currentLevel}`, date: new Date().toISOString()
        }]);
    } catch(e) {}
}
async function openLeaderboard() {
    showScreen('leaderboard-screen');
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '<tr><td colspan="5">Đang tải...</td></tr>';
    if (!supabaseClient) { tbody.innerHTML = '<tr><td colspan="5">Chưa kết nối!</td></tr>'; return; }
    try {
        const { data, error } = await supabaseClient.from('scores').select('*').order('score', { ascending: false }).limit(10);
        if (error || !data?.length) { tbody.innerHTML = '<tr><td colspan="5">Chưa có dữ liệu.</td></tr>'; return; }
        tbody.innerHTML = '';
        data.forEach((r, i) => {
            const md = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            tbody.innerHTML += `<tr><td>${md}</td><td>${r.username}</td><td style="color:#ffd700;font-weight:bold">${r.score}</td><td>🪙 ${r.coins}</td><td>⭐ ${r.stars}</td></tr>`;
        });
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5">Lỗi tải dữ liệu.</td></tr>'; }
}
// ==================== CANVAS ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; updateCamY(); }
addEventListener('resize', resize);

// ==================== STATE ====================
let state = 'MENU', currentLevel = 1, totalDeaths = 0;
let bgT = 0, bgTSlow = 0, shake = 0, flash = 0, flashColor = '#fff';
let finishLock = false, transT = 0, transText = '', alertQueued = false;
let hitStop = 0, deathSlowmo = 0, cameraZoom = 1, cameraZoomTarget = 1, runFrames = 0, redTint = 0;
let particles = [], dust = [], rings = [], deathMarkers = [], floatTexts = [], projectiles = [], popups = [];

const player = {
    x: 50, y: 200, w: 30, h: 38, vx: 0, vy: 0,
    speed: 5.5, jump: -12, grav: 0.55, maxFall: 18,
    grounded: false, canDouble: true, doubleUsed: false,
    hp: 3, maxHp: 3, shields: 0, score: 0, coins: 0, stars: 0,
    facing: 1, anim: 0, squash: 0,
    dashTimer: 0, dashCooldown: 0, dashCooldownMax: 45, dashDir: 0,
    lastTapDir: 0, lastTapTime: 0,
    wallCling: false, wallDir: 0, combo: 0, comboTimer: 0,
    invuln: 0, rageTimer: 0, speedTimer: 0, magnetRadius: 0,
    powerState: 0, powerStarTimer: 0, shootingCooldown: 0,
    transformTimer: 0, transformTarget: 0,
    trail: [], inPipe: 0, pipeTarget: null,
    ctrlFlip: 0, screenSpin: 0, timeWarp: 0, ghost: 0
};

const cam = { x: 0, y: 0, maxX: 2800 };
function updateCamY() { cam.y = canvas.height * 0.68 - 380; }

// ==================== INPUT ====================
let keys = { l: false, r: false, down: false };
let coyote = 0, jumpBuf = 0;
const COYOTE = 6, JBUF = 8;

addEventListener('keydown', e => {
    let code = e.code;
    if (player.ctrlFlip > 0) {
        if (code === 'ArrowLeft') code = 'ArrowRight';
        else if (code === 'ArrowRight') code = 'ArrowLeft';
        else if (code === 'KeyA') code = 'KeyD';
        else if (code === 'KeyD') code = 'KeyA';
    }
    const now = performance.now();
    if (code === 'ArrowLeft' || code === 'KeyA') {
        if (now - player.lastTapTime < 250 && player.lastTapDir === -1) tryDash(-1);
        player.lastTapDir = -1; player.lastTapTime = now;
        keys.l = true; player.facing = -1;
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
        if (now - player.lastTapTime < 250 && player.lastTapDir === 1) tryDash(1);
        player.lastTapDir = 1; player.lastTapTime = now;
        keys.r = true; player.facing = 1;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
    if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) { jumpBuf = JBUF; e.preventDefault(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyJ') { tryDash(player.facing); e.preventDefault(); }
    if (e.code === 'KeyK' || e.code === 'KeyF') { shootFireball(); e.preventDefault(); }
    if (e.code === 'KeyG' && isAdmin && state === 'PLAYING') toggleGodMode();
});
addEventListener('keyup', e => {
    let code = e.code;
    if (player.ctrlFlip > 0) {
        if (code === 'ArrowLeft') code = 'ArrowRight';
        else if (code === 'ArrowRight') code = 'ArrowLeft';
        else if (code === 'KeyA') code = 'KeyD';
        else if (code === 'KeyD') code = 'KeyA';
    }
    if (code === 'ArrowLeft' || code === 'KeyA') keys.l = false;
    if (code === 'ArrowRight' || code === 'KeyD') keys.r = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
});
canvas.addEventListener('touchstart', e => {
    const x = e.touches[0].clientX, y = e.touches[0].clientY;
    if (y > innerHeight * 0.75 && x > innerWidth / 3 && x < innerWidth * 2 / 3) shootFireball();
    else if (x < innerWidth / 3) { keys.l = true; tryDash(-1); }
    else if (x > innerWidth * 2 / 3) { keys.r = true; tryDash(1); }
    else jumpBuf = JBUF;
    e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', () => { keys.l = false; keys.r = false; });

function tryDash(dir) {
    if (player.dashCooldown > 0 || player.dashTimer > 0) return;
    const mult = player.rageTimer > 0 ? 1.5 : 1;
    player.dashTimer = 12; player.dashCooldown = player.dashCooldownMax;
    player.dashDir = dir; player.vx = dir * 16 * mult; player.vy = 0;
    player.invuln = Math.max(player.invuln, 14); shake = 4; sfxDash();
    for (let i = 0; i < 10; i++) particles.push({
        x: player.x + player.w / 2, y: player.y + player.h / 2,
        vx: -dir * (2 + Math.random() * 5), vy: (Math.random() - .5) * 3,
        r: 2 + Math.random() * 3, color: player.rageTimer > 0 ? '#ff4757' : '#00d2d3',
        life: 20, max: 20
    });
}
function shootFireball() {
    if (player.powerState < 2 && player.powerStarTimer <= 0) return;
    if (player.shootingCooldown > 0) return;
    if (player.rageTimer > 0 || player.powerState >= 2 || player.powerStarTimer > 0) {
        player.shootingCooldown = 20;
        const isIce = player.powerState === 3;
        projectiles.push({
            x: player.x + player.w / 2, y: player.y + player.h / 2,
            vx: player.facing * 10, vy: -2, r: 8, owner: 'player',
            type: isIce ? 'ice' : 'fire', life: 100
        });
        fx(player.x + player.w / 2, player.y + player.h / 2, isIce ? '#a5d8ff' : '#ff9f43', 8);
    }
}
const box = o => ({ x: o.x, y: o.y, w: o.w ?? o.width, h: o.h ?? o.height });
const overlap = (a, b) => { a = box(a); b = box(b);
    return a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h; };

// ==================== LEVEL HELPERS ====================
let plats = [], items = [], enemies = [], traps = [], hazards = [], triggers = [], bricks = [], pipes = [];

const N  = (x, y, w, h) => ({ x, y, w, h, type: 'normal' });
const SP = (x, y, w, h) => ({ x, y, w, h, type: 'spike' });
const FK = (x, y, w, h) => ({ x, y, w, h, type: 'fake', triggered: false, shakeT: 0 });

// BẪY KÍCH HOẠT KHI ĐỨNG LÊN
const TS = (x, y, w, h) => ({ x, y, w, h, type: 'standSpike',  standT: -1, spikeH: 0, drawShake: 0 });
const TC = (x, y, w, h) => ({ x, y, w, h, type: 'standCrush',  standT: -1, crusherY: -80, crusherVy: 0 });
const TSL= (x, y, w, h, dx) => ({ x, y, w, h, type: 'standSlide', standT: -1, slideX: 0, slideMax: dx });
const TB = (x, y, w, h) => ({ x, y, w, h, type: 'standBounce', standT: -1 });
const TF = (x, y, w, h) => ({ x, y, w, h, type: 'standFlip',   standT: -1, flipA: 0 });

const WL = (x, y, w, h) => ({ x, y, w, h, type: 'wall' });
const BN = (x, y, w, h) => ({ x, y, w, h, type: 'bounce' });
const MV = (x, y, w, h, sy, r, sp, d) => ({ x, y, w, h, type: 'moving', startY: sy, range: r, speed: sp, dir: d });
const FI = (x, y, w, h) => ({ x, y, w, h, type: 'finish' });
const BL = (x, y, w, h, cyc, on) => ({ x, y, w, h, type: 'blink', blinkT: 0, cycle: cyc, onTime: on, visible: true });
const CI = (x, y) => ({ x, y, w: 22, h: 22, type: 'coin', collected: false });
const ST = (x, y) => ({ x, y, w: 26, h: 26, type: 'star', collected: false });
const HR = (x, y) => ({ x, y, w: 26, h: 26, type: 'heart', collected: false });
const FC = (x, y) => ({ x, y, w: 22, h: 22, type: 'fake_coin', collected: false });
const BK = (x, y, t) => ({ x, y, w: 36, h: 36, type: t, broke: false });

// QUÁI — ĐẶT ĐÚNG TRÊN MẶT SÀN: sàn y=380, quái cao 34 → đỉnh = 346
const WK = (x, vx, a, b) => ({ type: 'walker', x, y: 346, w: 30, h: 34, vx, minX: a, maxX: b, alive: true });
const KP = (x, vx, a, b) => ({ type: 'koopa',  x, y: 340, w: 30, h: 40, vx, minX: a, maxX: b, alive: true, shell: false, shellT: 0 });
const SH = (x) =>            ({ type: 'shooter',x, y: 346, w: 30, h: 34, vx: 0, shootT: 0, alive: true });
const JP = (x, vx, a, b) => ({ type: 'jumper', x, y: 346, w: 30, h: 34, vx, vy: 0, minX: a, maxX: b, jumpT: 0, alive: true });
const FL = (x, by, a, sp, vx, a2, b) => ({ type: 'flyer', x, y: by, w: 30, h: 30, baseY: by, amp: a, speed: sp, phase: 0, vx, minX: a2, maxX: b, alive: true });

const TR = (x, y, tx) => ({ x, y, w: 34, h: 44, triggerX: tx, falling: false, vy: 0 });
const CR = (x, y, tx) => ({ type: 'crusher', x, y, w: 60, h: 60, triggerX: tx, slamming: false, vy: 0, delay: 0 });
const LA = (x, y, w, sy, r, sp, d) => ({ type: 'laser', x, y, w, h: 6, startY: sy, range: r, speed: sp, dir: d });
const PE = (ax, ay, len, sp, ma, r) => ({ type: 'pendulum', anchorX: ax, anchorY: ay, length: len, angle: 0, phase: 0, speed: sp, maxAngle: ma, r });
const SW = (x, y, w, h, sx, r, sp, d) => ({ type: 'spikewall', x, y, w, h, startX: sx, range: r, speed: sp, dir: d });
const WD = (x, y, w, h, d, f) => ({ x, y, w, h, type: 'wind', dir: d, force: f });
const MF = (x, y, w, h, effect, dur, extra) => Object.assign({ x, y, w, h, type: 'mindfuck', effect, duration: dur || 300, triggered: false }, extra || {});

// ==================== 10 LEVELS ====================

// LEVEL 1: BẪY BẤT NGỜ ĐẦU TIÊN
function loadLevel1() {
    currentLevel = 1; cam.maxX = 2600;
    plats = [
        N(0, 380, 180, 70),
        N(220, 380, 100, 70),
        N(400, 380, 120, 70),
        TS(560, 380, 100, 70),            // Đứng lên → spike trồi
        N(720, 380, 140, 70),
        FK(900, 380, 80, 70),             // Đứng lên → sập
        N(1020, 380, 120, 70),
        BN(1180, 300, 60, 12),
        TB(1300, 260, 100, 20),           // Đứng lên → bắn lên trời
        N(1460, 380, 120, 70),
        TC(1620, 380, 100, 70),           // Đứng lên → trần đè
        N(1760, 340, 120, 110),
        TSL(1920, 340, 100, 70, 60),      // Đứng lên → trượt
        N(2140, 340, 100, 70),
        FI(2300, 340, 240, 110)
    ];
    items = [ CI(140, 320), ST(340, 320), FC(760, 320), ST(1350, 200), HR(1820, 280) ];
    bricks = [ BK(280, 240, 'power_mushroom') ];
    enemies = [ WK(770, 1.8, 750, 850) ];
    traps = [ TR(1350, -80, 1250) ];
    hazards = [];
    triggers = [ MF(200, 300, 200, 150, 'ctrlflip', 400) ];
    pipes = []; projectiles = []; popups = [];
}

// LEVEL 2: NHIỀU BẪY ĐỨNG
function loadLevel2() {
    currentLevel = 2; cam.maxX = 3000;
    plats = [
        N(0, 380, 180, 70),
        SP(220, 380, 80, 70),
        FK(340, 380, 100, 70),
        TS(480, 340, 100, 70),            // spike trồi
        N(640, 300, 100, 70),
        TS(800, 300, 100, 70),            // spike #2
        N(960, 260, 100, 70),
        N(1120, 300, 100, 70),
        TC(1280, 340, 100, 70),           // trần đè
        N(1440, 380, 100, 70),
        BN(1600, 300, 60, 12),
        TF(1740, 200, 120, 20),           // lật
        N(1920, 340, 120, 110),
        FI(2100, 340, 240, 110)
    ];
    items = [ CI(120, 320), ST(420, 320), CI(700, 240), FC(1080, 240), HR(1960, 280) ];
    bricks = [ BK(560, 240, 'power_fire') ];
    enemies = [ WK(500, 2, 480, 580), FL(1880, 160, 40, 0.05, 2.5, 1860, 2020) ];
    traps = [ TR(1000, -80, 900) ];
    hazards = [];
    triggers = [ MF(700, 200, 200, 200, 'ctrlflip', 300) ];
    pipes = []; projectiles = []; popups = [];
}

// LEVEL 3: QUAY + TRƯỢT
function loadLevel3() {
    currentLevel = 3; cam.maxX = 3200;
    plats = [
        N(0, 380, 180, 70),
        TC(220, 380, 100, 70),
        SP(380, 380, 80, 70),
        FK(500, 380, 100, 70),
        TS(640, 300, 100, 70),
        N(800, 300, 100, 70),
        N(960, 300, 100, 70),
        TSL(1120, 300, 100, 70, 80),      // trượt xa
        N(1280, 380, 100, 70),
        SP(1420, 380, 80, 70),
        N(1540, 380, 100, 70),
        BN(1700, 300, 60, 12),
        TB(1840, 200, 120, 20),           // bắn lên trời
        N(2020, 340, 120, 110),
        FI(2200, 340, 240, 110)
    ];
    items = [ CI(120, 320), ST(300, 320), FC(700, 240), HR(1150, 240), ST(1900, 140) ];
    bricks = [ BK(380, 240, 'power_fire') ];
    enemies = [ WK(520, 2.2, 500, 600), FL(1300, 160, 40, 0.05, 2.5, 1280, 1420) ];
    traps = [];
    hazards = [ PE(880, 80, 140, 0.055, 1.1, 22) ];
    triggers = [ MF(560, 200, 200, 200, 'spin', 300) ];
    pipes = []; projectiles = []; popups = [];
}

// LEVEL 4: TELEPORT + SPAWN
function loadLevel4() {
    currentLevel = 4; cam.maxX = 3400;
    plats = [
        N(0, 380, 160, 70),
        N(200, 380, 100, 70),
        SP(340, 380, 80, 70),
        FK(460, 380, 100, 70),
        TS(620, 380, 100, 70),
        N(780, 300, 100, 70),
        TC(940, 300, 100, 70),
        SP(1100, 300, 80, 70),
        N(1220, 300, 100, 70),
        TSL(1380, 300, 100, 70, 60),
        N(1540, 300, 100, 70),
        BN(1700, 300, 60, 12),
        TB(1840, 200, 120, 20),
        N(2020, 340, 120, 110),
        FI(2200, 340, 240, 110)
    ];
    items = [ CI(100, 320), ST(280, 320), FC(660, 320), ST(1300, 240), HR(2100, 280) ];
    bricks = [ BK(380, 240, 'power_ice') ];
    enemies = [ WK(480, 2.2, 460, 560), WK(1420, 2.2, 1400, 1520) ];
    traps = [ TR(1000, -80, 900) ];
    hazards = [];
    triggers = [
        MF(400, 200, 150, 200, 'teleport', 0, { tx: 900, ty: 100 }),
        MF(1300, 200, 150, 200, 'spawnEnemies', 0, { count: 3 })
    ];
    pipes = []; projectiles = []; popups = [];
}

// LEVEL 5: NHẤP NHÁY + LẬT
function loadLevel5() {
    currentLevel = 5; cam.maxX = 3600;
    plats = [
        N(0, 380, 160, 70),
        TS(200, 380, 80, 70),
        BL(340, 380, 80, 20, 100, 55),
        BL(480, 340, 80, 20, 100, 55),
        TF(620, 300, 80, 20),
        BL(760, 260, 80, 20, 100, 55),
        N(920, 340, 100, 110),
        TS(1080, 300, 100, 70),
        BL(1240, 260, 80, 20, 100, 55),
        BL(1380, 220, 80, 20, 100, 55),
        N(1540, 300, 100, 70),
        FK(1700, 340, 100, 70),
        BN(1860, 300, 60, 12),
        TB(2000, 200, 100, 20),
        N(2160, 340, 120, 110),
        FI(2340, 340, 240, 110)
    ];
    items = [ CI(120, 320), ST(400, 320), FC(940, 240), ST(1300, 180), HR(2200, 280), ST(2420, 280) ];
    bricks = [ BK(940, 240, 'power_mushroom') ];
    enemies = [ WK(400, 2, 380, 480), WK(1600, 2, 1580, 1700) ];
    traps = [ TR(1200, -80, 1100), TR(2000, -80, 1900) ];
    hazards = [ PE(1700, 80, 140, 0.06, 1.2, 22) ];
    triggers = [ MF(300, 200, 150, 200, 'ctrlflip', 400), MF(1600, 200, 150, 200, 'ctrlflip', 500) ];
    pipes = []; projectiles = []; popups = [];
}
// LEVEL 6: ĐỦ LOẠI BẪY
function loadLevel6() {
    currentLevel = 6; cam.maxX = 3800;
    plats = [
        N(0, 380, 160, 70),
        TS(200, 380, 80, 70),
        SP(320, 380, 80, 70),
        FK(480, 340, 80, 70),
        TC(620, 340, 80, 70),
        TS(740, 340, 80, 70),
        N(900, 300, 80, 70),
        TSL(1060, 300, 80, 70, 60),
        TS(1220, 300, 80, 70),
        N(1340, 300, 80, 70),
        N(1500, 260, 80, 70),
        TC(1660, 260, 80, 70),
        FK(1820, 260, 80, 70),
        SP(1980, 260, 80, 70),
        N(2100, 300, 100, 70),
        BN(2260, 300, 60, 12),
        TB(2400, 200, 100, 20),
        N(2560, 340, 120, 110),
        FI(2740, 340, 240, 110)
    ];
    items = [ CI(120, 320), ST(400, 320), FC(800, 300), ST(1300, 260), HR(1700, 220), ST(2650, 280) ];
    bricks = [ BK(400, 240, 'power_fire'), BK(1600, 220, 'power_ice') ];
    enemies = [ WK(360, 2.4, 340, 440), WK(900, 2.4, 880, 960), SH(2600), FL(1800, 160, 40, 0.05, 2.5, 1780, 1900) ];
    traps = [ TR(1000, -80, 900), TR(2100, -80, 2000), TR(2700, -80, 2600) ];
    hazards = [ PE(1300, 80, 140, 0.06, 1.1, 22), CR(2400, -60, 2300) ];
    triggers = [ MF(400, 200, 150, 200, 'ctrlflip', 400), MF(1600, 200, 150, 200, 'spin', 250), MF(2600, 200, 150, 200, 'slow', 300) ];
    pipes = []; projectiles = []; popups = [];
}

// LEVEL 7: NHẤP NHÁY + ĐẢO PHÍM
function loadLevel7() {
    currentLevel = 7; cam.maxX = 4000;
    plats = [
        N(0, 380, 160, 70),
        BL(200, 380, 80, 20, 80, 45),
        BL(340, 340, 80, 20, 80, 45),
        BL(480, 300, 80, 20, 80, 45),
        TF(620, 260, 80, 20),
        BL(760, 220, 80, 20, 80, 45),
        N(900, 340, 100, 110),
        TS(1060, 300, 100, 70),
        BL(1220, 260, 80, 20, 90, 45),
        TSL(1360, 220, 80, 20, 50),
        BL(1500, 180, 80, 20, 90, 45),
        N(1660, 260, 100, 70),
        SP(1820, 260, 80, 70),
        FK(1940, 260, 100, 70),
        BL(2100, 220, 80, 20, 100, 40),
        TB(2240, 180, 80, 20),
        N(2380, 300, 100, 70),
        BN(2540, 300, 60, 12),
        N(2680, 200, 100, 20),
        N(2840, 340, 120, 110),
        FI(3020, 340, 240, 110)
    ];
    items = [ CI(120, 320), ST(400, 280), ST(660, 200), FC(1100, 240), ST(1420, 160), HR(1980, 200), ST(2900, 280) ];
    bricks = [ BK(400, 220, 'power_fire'), BK(1900, 200, 'power_mushroom') ];
    enemies = [ WK(1000, 2.4, 980, 1100), FL(2200, 140, 50, 0.06, 3, 2180, 2300), JP(2900, 2.5, 2880, 3000) ];
    traps = [ TR(1300, -80, 1200), TR(2400, -80, 2300) ];
    hazards = [ PE(1700, 80, 140, 0.06, 1.2, 22) ];
    triggers = [ MF(500, 200, 150, 200, 'ctrlflip', 500), MF(1400, 200, 150, 200, 'ctrlflip', 500), MF(2300, 200, 150, 200, 'ctrlflip', 600) ];
    pipes = []; projectiles = []; popups = [];
}

// LEVEL 8: TỔNG HỢP
function loadLevel8() {
    currentLevel = 8; cam.maxX = 4200;
    plats = [
        N(0, 380, 160, 70),
        SP(200, 380, 80, 70),
        FK(320, 380, 100, 70),
        TS(480, 340, 100, 70),
        TC(640, 300, 100, 70),
        TSL(800, 260, 100, 70, 70),
        N(960, 260, 100, 70),
        N(1120, 300, 100, 70),
        TB(1280, 340, 100, 70),
        N(1440, 340, 100, 70),
        FK(1600, 340, 100, 70),
        TS(1760, 340, 100, 70),
        N(1920, 380, 100, 70),
        SP(2080, 380, 80, 70),
        TC(2200, 340, 100, 70),
        N(2360, 340, 100, 70),
        BN(2520, 300, 60, 12),
        N(2660, 200, 120, 20),
        N(2840, 340, 120, 110),
        FI(3020, 340, 240, 110)
    ];
    items = [ CI(120, 320), ST(400, 320), FC(700, 260), ST(1000, 200), HR(2000, 320), ST(2900, 280) ];
    bricks = [ BK(400, 240, 'power_fire'), BK(1800, 240, 'power_ice') ];
    enemies = [ WK(360, 2.2, 340, 440), WK(1200, 2.2, 1180, 1300), FL(2300, 160, 40, 0.05, 2.5, 2280, 2400) ];
    traps = [ TR(1000, -80, 900), TR(2200, -80, 2100), TR(2900, -80, 2800) ];
    hazards = [ PE(1700, 80, 140, 0.06, 1.2, 22), CR(2800, -60, 2700) ];
    triggers = [ MF(700, 200, 150, 200, 'ctrlflip', 400), MF(1400, 200, 150, 200, 'spin', 300), MF(1900, 200, 150, 200, 'ctrlflip', 400), MF(2600, 200, 150, 200, 'teleport', 0, { tx: 2900, ty: 100 }) ];
    pipes = []; projectiles = []; popups = [];
}

// LEVEL 9: TROLL TỔNG HỢP
function loadLevel9() {
    currentLevel = 9; cam.maxX = 4400;
    plats = [
        N(0, 380, 160, 70),
        FK(200, 380, 80, 70),
        TS(320, 380, 60, 70),
        N(420, 380, 80, 70),
        BL(560, 340, 80, 20, 80, 45),
        TC(700, 300, 80, 70),
        BL(840, 260, 80, 20, 80, 45),
        N(1000, 340, 100, 110),
        TSL(1160, 300, 100, 70, 70),
        SP(1320, 300, 80, 70),
        N(1440, 300, 100, 70),
        TS(1600, 260, 80, 70),
        N(1760, 260, 80, 70),
        SP(1920, 260, 80, 70),
        N(2040, 300, 100, 70),
        N(2200, 340, 100, 70),
        FK(2360, 340, 100, 70),
        N(2520, 340, 100, 70),
        BN(2680, 300, 60, 12),
        TB(2820, 200, 120, 20),
        N(3000, 340, 120, 110),
        FI(3180, 340, 240, 110)
    ];
    items = [ CI(140, 320), FC(500, 320), ST(640, 260), FC(1000, 240), ST(1600, 220), HR(2400, 280), ST(3060, 280) ];
    bricks = [ BK(280, 240, 'power_fire'), BK(1500, 220, 'power_mushroom'), BK(2900, 240, 'power_star') ];
    enemies = [ WK(500, 2.4, 480, 600), WK(1200, 2.4, 1180, 1300), KP(2000, 2.5, 1980, 2100), SH(2500), JP(2800, 2.5, 2780, 2900) ];
    traps = [ TR(1000, -80, 900), TR(1800, -80, 1700), TR(2600, -80, 2500), TR(3050, -80, 2950) ];
    hazards = [ PE(1300, 80, 140, 0.06, 1.2, 22), CR(2400, -60, 2300), LA(2600, 240, 200, 240, 100, 4, 1), SW(2100, 200, 30, 180, 2100, 80, 5, 1) ];
    triggers = [ MF(200, 200, 150, 200, 'ctrlflip', 500), MF(1600, 200, 150, 200, 'spin', 250), MF(2200, 200, 150, 200, 'slow', 300), MF(3000, 200, 150, 200, 'teleport', 0, { tx: 3300, ty: 100 }) ];
    pipes = []; projectiles = []; popups = [];
}

// LEVEL 10: TRÙM CUỐI
function loadLevel10() {
    currentLevel = 10; cam.maxX = 5000;
    plats = [
        N(0, 380, 160, 70),
        BL(200, 380, 80, 20, 80, 45),
        TS(320, 380, 60, 70),
        N(420, 380, 80, 70),
        TC(560, 340, 80, 70),
        TF(700, 300, 80, 20),
        FK(840, 260, 80, 20),
        BL(980, 220, 80, 20, 80, 45),
        N(1120, 340, 100, 110),
        TSL(1280, 300, 100, 70, 70),
        SP(1440, 300, 80, 70),
        N(1560, 300, 100, 70),
        TS(1720, 260, 80, 70),
        TB(1860, 220, 80, 20),
        N(2000, 300, 100, 70),
        TC(2160, 300, 100, 70),
        SP(2320, 300, 80, 70),
        N(2440, 300, 100, 70),
        TS(2600, 300, 100, 70),
        BL(2760, 240, 80, 20, 100, 40),
        TC(2900, 200, 80, 70),
        N(3040, 300, 100, 70),
        SP(3200, 300, 80, 70),
        N(3320, 300, 100, 70),
        N(3480, 340, 100, 70),
        FK(3640, 340, 100, 70),
        TS(3800, 340, 100, 70),
        N(3960, 340, 100, 70),
        BN(4120, 300, 60, 12),
        TB(4260, 200, 120, 20),
        N(4440, 340, 120, 110),
        FI(4620, 340, 240, 110),
        FI(4880, 340, 100, 110)
    ];
    items = [ CI(140, 320), ST(400, 320), FC(600, 300), ST(800, 260), FC(1000, 180), ST(1200, 260), HR(1600, 260), ST(1900, 180), FC(2200, 260), ST(2500, 260), FC(2800, 160), ST(3100, 260), HR(3700, 300), ST(4500, 280), ST(4900, 280) ];
    bricks = [ BK(280, 240, 'power_fire'), BK(880, 220, 'power_mushroom'), BK(1900, 180, 'power_ice'), BK(3000, 240, 'power_star'), BK(4100, 240, 'power_fire'), BK(4600, 240, 'power_star') ];
    enemies = [ WK(360, 2.5, 340, 460), WK(1200, 2.5, 1180, 1300), FL(1500, 160, 50, 0.06, 3, 1480, 1620), KP(2100, 2.5, 2080, 2200), SH(3300), JP(3700, 2.8, 3680, 3800), WK(4400, 3, 4380, 4520) ];
    traps = [ TR(700, -80, 600), TR(1300, -80, 1200), TR(1900, -80, 1800), TR(2500, -80, 2400), TR(3100, -80, 3000), TR(3700, -80, 3600), TR(4300, -80, 4200) ];
    hazards = [ PE(500, 60, 160, 0.06, 1.3, 24), PE(760, 60, 160, 0.06, 1.3, 24), CR(2200, -60, 2100), CR(3000, -60, 2900), LA(3500, 240, 160, 240, 100, 4, 1), LA(3900, 240, 160, 240, 100, 4, -1), SW(2700, 200, 30, 180, 2700, 80, 5, 1), SW(4200, 200, 30, 180, 4200, 80, 5, -1) ];
    triggers = [ MF(400, 200, 150, 200, 'ctrlflip', 500), MF(1800, 200, 150, 200, 'spin', 300), MF(2300, 200, 150, 200, 'slow', 200), MF(2800, 200, 150, 200, 'shake', 0), MF(3400, 200, 150, 200, 'teleport', 0, { tx: 4000, ty: 100 }), MF(4400, 200, 150, 200, 'ctrlflip', 600), MF(4700, 200, 150, 200, 'spawnEnemies', 0, { count: 4 }) ];
    pipes = []; projectiles = []; popups = [];
}

// ==================== DISPATCHER ====================
const LEVELS = [null, loadLevel1, loadLevel2, loadLevel3, loadLevel4, loadLevel5, loadLevel6, loadLevel7, loadLevel8, loadLevel9, loadLevel10];


// ==================== PARTICLES ====================
function fx(x, y, color, n, spd = 6) {
    for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - .5) * spd, vy: (Math.random() - .5) * spd - 1, r: Math.random() * 3 + 1.5, color, life: 30, max: 30 });
}
function fs(x, y, n) {
    for (let i = 0; i < n; i++) dust.push({ x: x + (Math.random() - .5) * 20, y, vx: (Math.random() - .5) * 3, vy: -Math.random() * 2 - .5, r: Math.random() * 4 + 2, life: 25, max: 25 });
}
function ring(x, y, c, mr) { rings.push({ x, y, color: c, r: 4, maxR: mr, life: 25, max: 25 }); }
function floatText(x, y, txt, color, size = 18) { floatTexts.push({ x, y, txt, color, life: 60, max: 60, vy: -1.2, size }); }
function updateParticles() {
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .15; p.vx *= .98; p.life--; }); particles = particles.filter(p => p.life > 0);
    dust.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .08; p.vx *= .95; p.r *= .95; p.life--; }); dust = dust.filter(p => p.life > 0);
    rings.forEach(p => { p.r = 4 + (p.maxR - 4) * (1 - p.life / p.max); p.life--; }); rings = rings.filter(p => p.life > 0);
    deathMarkers.forEach(m => m.life--); deathMarkers = deathMarkers.filter(m => m.life > 0);
    floatTexts.forEach(t => { t.y += t.vy; t.vy *= .95; t.life--; }); floatTexts = floatTexts.filter(t => t.life > 0);
}

// ==================== FLOW ====================
function loadLevel(n) {
    if (n < 1) n = 1; if (n > 10) n = 10;
    particles = []; dust = []; rings = []; deathMarkers = []; floatTexts = [];
    popups = []; projectiles = []; finishLock = false;
    LEVELS[n]();
    updateCamY();
    if (state === 'PLAYING') playMusicForLevel(n);
}
function startGame() {
    if (!currentUser) {
        alert('⚠️ Vui lòng đăng nhập trước khi chơi!');
        showScreen('login-screen');
        return;
    }
    initAudio();
    showScreen('');
    totalDeaths = 0;
    runFrames = 0;
    reset();
    loadLevel(1);
    state = 'PLAYING';
    playMusicForLevel(1);
}
function restartGame() { showScreen(''); reset(); loadLevel(currentLevel); state = 'PLAYING'; runFrames = 0; playMusicForLevel(currentLevel);}
function returnToMenu() { showScreen('menu-screen'); state = 'MENU'; stopMusic(); }
function applyUpgrades() {
    player.maxHp = 3 + upgrades.maxHp;
    player.dashCooldownMax = Math.floor(45 * Math.pow(0.85, upgrades.dashCd));
    player.jump = -12 * (1 + upgrades.jumpBoost * 0.08);
    player.magnetRadius = upgrades.magnet * 50;
    player.shields = upgrades.shield;
}
function reset() {
    applyUpgrades();
    Object.assign(player, {
        x: 50, y: 200, vx: 0, vy: 0, hp: player.maxHp, score: 0, coins: 0, stars: 0,
        grounded: false, canDouble: true, doubleUsed: false, squash: 0, facing: 1,
        dashTimer: 0, dashCooldown: 0, dashDir: 0, wallCling: false, wallDir: 0,
        combo: 0, comboTimer: 0, invuln: 0, rageTimer: 0, speedTimer: 0,
        powerState: 0, powerStarTimer: 0, shootingCooldown: 0,
        transformTimer: 0, transformTarget: 0, inPipe: 0, pipeTarget: null, trail: [],
        ctrlFlip: 0, screenSpin: 0, timeWarp: 0, ghost: 0
    });
    cam.x = 0; coyote = 0; jumpBuf = 0; cameraZoom = 1; cameraZoomTarget = 1; redTint = 0;
    keys.l = false; keys.r = false; keys.down = false;
    projectiles = []; updateCamY();
}
function die(reason) {
    if (godMode) return;
    if (state === 'GAMEOVER') return;
    stopMusic(); sfxDie();
    state = 'GAMEOVER'; totalDeaths++;
    shake = 25; flash = 0.7; flashColor = '#ff4757'; deathSlowmo = 60;
    wallet += player.coins; saveProgress();
    for (let i = 0; i < 40; i++) {
        const a = Math.PI * 2 * i / 40, s = 4 + Math.random() * 7;
        particles.push({ x: player.x + 15, y: player.y + 19, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 2 + Math.random() * 4, color: ['#ffd700', '#ff4757', '#fff', '#00d2d3'][i % 4], life: 80, max: 80 });
    }
    ring(player.x + 15, player.y + 19, '#ff4757', 100);
    deathMarkers.push({ x: player.x + 15, y: player.y + 19, life: 120 });
    document.getElementById('death-reason').innerText = reason;
    document.getElementById('final-stats').innerText = `Score: ${player.score}  •  🪙 +${player.coins}  •  ⭐ ${player.stars}  •  💀 ${totalDeaths}`;
    showScreen('gameover-screen'); saveScore();
}
function finish() {
    if (finishLock) return; finishLock = true;
    shake = 20; flash = 0.7; flashColor = '#ffd700';
    ring(player.x + 15, player.y + 19, '#ffd700', 150);
    ring(player.x + 15, player.y + 19, '#ffffff', 100);
   state = 'TRANSITION'; cameraZoomTarget = 1.8; sfxFinish();
    if (currentLevel < 10) {
        transText = `LEVEL ${currentLevel + 1}`;
        transT = 90;
        player.score += 500 + currentLevel * 200;
    } else {
        transText = 'PHÁ ĐẢO!';
        transT = 120;
        player.score += 5000;
        wallet += player.coins; saveProgress();
        const curTime = runFrames / 60;
        if (bestTime === 0 || curTime < bestTime) {
            bestTime = curTime;
            localStorage.setItem('tw_bestTime', String(bestTime));
        }
        saveScore(); alertQueued = true;
    }
}
function takeDamage(reason) {
    if (godMode) return;
    if (player.invuln > 0 || player.powerStarTimer > 0) return;
    if (player.ghost > 0) return;
    if (player.powerState > 0) {
        player.transformTarget = player.powerState - 1; player.transformTimer = 30;
        player.invuln = 90; shake = 10; flash = 0.3; flashColor = '#ff4757';
        fx(player.x + 15, player.y + 19, '#ff4757', 20);
        floatText(player.x + 15, player.y - 5, 'MẤT FORM!', '#ff4757');
        return;
    }
    if (player.shields > 0) {
        player.shields--; player.invuln = 60;
        shake = 10; flash = 0.3; flashColor = '#00d2d3';
        sfxShield();
        fx(player.x + 15, player.y + 19, '#00d2d3', 20);
        floatText(player.x + 15, player.y - 5, '🛡 CHẶN!', '#00d2d3');
        return;
    }
    player.hp--;
    if (player.hp <= 0) { die(reason); return; }
    player.invuln = 60; shake = 12; flash = 0.3; flashColor = '#ff4757';
    sfxHurt();
    player.vy = -8; player.vx = -player.facing * 6;
    fx(player.x + 15, player.y + 19, '#ff4757', 15);
    floatText(player.x + 15, player.y, '-1 HP', '#ff4757');
    player.combo = 0; player.comboTimer = 0;
}
function formatTime(frames) {
    const total = frames / 60, m = Math.floor(total / 60), s = Math.floor(total % 60), ms = Math.floor((total % 1) * 100);
    return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}
// ==================== UPDATE ====================
function update() {
    if (hitStop > 0) { hitStop--; return; }
    bgT++;
    if (deathSlowmo > 0) { deathSlowmo--; bgTSlow = bgT * 0.3; } else { bgTSlow = bgT; }
    if (shake > 0.3) shake *= 0.88; else shake = 0;
    if (flash > 0) flash = Math.max(0, flash - 0.04);
    if (player.invuln > 0) player.invuln--;
    if (player.dashCooldown > 0) player.dashCooldown--;
    if (player.shootingCooldown > 0) player.shootingCooldown--;
    if (player.comboTimer > 0) { player.comboTimer--; if (player.comboTimer === 0) player.combo = 0; }
    if (player.rageTimer > 0) { player.rageTimer--; redTint = 0.15 + Math.sin(bgT * 0.3) * 0.05; } else redTint *= 0.9;
    if (player.speedTimer > 0) player.speedTimer--;
    if (player.powerStarTimer > 0) player.powerStarTimer--;
    if (player.transformTimer > 0) { player.transformTimer--; if (player.transformTimer === 0) player.powerState = player.transformTarget; }
    cameraZoom += (cameraZoomTarget - cameraZoom) * 0.1;
    updateParticles();

    if (godMode && state === 'PLAYING') {
        player.invuln = Math.max(player.invuln, 2);
        player.hp = player.maxHp;
        if (player.y > 500) { player.y = 100; player.vy = 0; }
    }

    // Popups từ gạch
    for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i]; p.vy += 0.4; p.y += p.vy; p.life--;
        if (p.life <= 0) { items.push({ x: p.x, y: p.y, w: 24, h: 24, type: p.type, collected: false }); popups.splice(i, 1); }
    }

    if (state === 'TRANSITION') {
        if (--transT <= 0) {
            cameraZoomTarget = 1;
            if (currentLevel < 10) { loadLevel(currentLevel + 1); reset(); state = 'PLAYING'; }
            else {
                if (alertQueued) { alertQueued = false;
                    setTimeout(() => alert(`🏆 PHÁ ĐẢO!\n\nScore: ${player.score}\n🪙 +${player.coins} → Ví: ${wallet}\n⭐ ${player.stars}\n💀 ${totalDeaths}\n⏱ ${formatTime(runFrames)}`), 100);
                }
                returnToMenu();
            }
        }
        return;
    }
    if (state !== 'PLAYING') return;
    runFrames++;

    // === TROLL EFFECTS ===
    if (player.ctrlFlip > 0) {
        player.ctrlFlip--;
        if (player.ctrlFlip === 0) { keys.l = false; keys.r = false; }
    }
    if (player.screenSpin > 0) player.screenSpin--;
    if (player.timeWarp > 0) player.timeWarp--;
    if (player.ghost > 0) player.ghost--;
    if (player.timeWarp > 0) {
        if (bgT % 3 !== 0) { updateParticles(); return; }
    }

    if (player.grounded) coyote = COYOTE; else coyote = Math.max(0, coyote - 1);
    if (jumpBuf > 0) jumpBuf--;

    // Wall detect
    player.wallCling = false; player.wallDir = 0;
    if (!player.grounded && player.vy > -2 && player.dashTimer === 0) {
        const probeL = { x: player.x - 4, y: player.y + 4, w: 4, h: player.h - 8 };
        const probeR = { x: player.x + player.w, y: player.y + 4, w: 4, h: player.h - 8 };
        for (const p of plats) {
            if (p.type === 'spike' || p.type === 'finish' || p.type === 'bounce' || p.type === 'moving') continue;
            if (p.type.startsWith('stand')) continue;
            if (overlap(probeL, p)) { player.wallCling = true; player.wallDir = -1; break; }
            if (overlap(probeR, p)) { player.wallCling = true; player.wallDir = 1; break; }
        }
    }

    // Triggers
    let windBoost = 0;
    for (const t of triggers) {
        if (!overlap(player, t)) continue;
        if (t.type === 'wind') {
            windBoost += t.force * t.dir;
        } else if (t.type === 'mindfuck' && !t.triggered) {
            t.triggered = true;
            if (t.effect === 'ctrlflip') {
                player.ctrlFlip = t.duration || 300;
                keys.l = false; keys.r = false;
                flash = 0.5; flashColor = '#ff00ff';
                floatText(player.x + 15, player.y - 40, '🔀 ĐẢO PHÍM!', '#ff00ff', 24);
            } else if (t.effect === 'spin') {
                player.screenSpin = t.duration || 180;
                flash = 0.5; flashColor = '#ffff00';
                floatText(player.x + 15, player.y - 40, '🌀 QUAY!', '#ffff00', 24);
            } else if (t.effect === 'slow') {
                player.timeWarp = t.duration || 180;
                floatText(player.x + 15, player.y - 40, '🐌 CHẬM!', '#a5d8ff', 24);
            } else if (t.effect === 'ghost') {
                player.ghost = t.duration || 180;
                floatText(player.x + 15, player.y - 40, '👻 VÔ HÌNH!', '#fff', 24);
            } else if (t.effect === 'shake') {
                shake = 40;
                floatText(player.x + 15, player.y - 40, '💥 RUNG!', '#ff3838', 24);
            } else if (t.effect === 'teleport') {
                player.x = t.tx; player.y = t.ty;
                player.vx = 0; player.vy = 0;
                sfxTeleport();
                flash = 0.7; flashColor = '#fff';
                floatText(player.x + 15, player.y - 40, '✨ TELEPORT!', '#fff', 24);
            } else if (t.effect === 'spawnEnemies') {
                for (let i = 0; i < (t.count || 3); i++) {
                    enemies.push(WK(player.x + 100 + i * 80, (i % 2 === 0 ? 3 : -3), player.x, player.x + 400));
                }
                floatText(player.x + 15, player.y - 40, '👹 QUÁI!', '#ff3838', 24);
            }
        }
    }
    const speedMul = (player.rageTimer > 0 ? 1.4 : 1) * (player.speedTimer > 0 ? 1.5 : 1);

    // Di chuyển
    if (player.dashTimer > 0) {
        player.dashTimer--;
        const mult = player.rageTimer > 0 ? 1.5 : 1;
        player.vx = player.dashDir * 16 * mult; player.vy = 0;
        player.trail.push({ x: player.x, y: player.y, life: 15 });
    } else {
        player.vx = 0;
        if (keys.l) player.vx = -player.speed * speedMul;
        if (keys.r) player.vx = player.speed * speedMul;
    }
    player.x += player.vx + windBoost;

    player.trail.forEach(t => t.life--);
    player.trail = player.trail.filter(t => t.life > 0);
    if (Math.abs(player.vx) > 7 && player.dashTimer === 0) player.trail.push({ x: player.x, y: player.y, life: 8 });

    // Nhảy
    if (jumpBuf > 0) {
        if (coyote > 0) {
            player.vy = player.jump;
            player.grounded = false;
            player.canDouble = true; player.doubleUsed = false;
            coyote = 0; jumpBuf = 0; player.squash = -0.3;
            sfxJump();
            fx(player.x + 15, player.y + 38, '#00d2d3', 6);
            fs(player.x + 15, player.y + 38, 8);
        } else if (player.wallCling) {
            player.vy = player.jump * 0.95;
            player.vx = -player.wallDir * 9;
            player.x += -player.wallDir * 4;
            player.canDouble = true; player.doubleUsed = false;
            player.facing = -player.wallDir; jumpBuf = 0; player.squash = -0.3;
            fx(player.x + 15, player.y + 19, '#fffa65', 12);
            ring(player.x + 15, player.y + 19, '#fffa65', 35);
        } else if (!player.grounded && player.canDouble && !player.doubleUsed) {
            player.vy = player.jump * 0.9;
            player.canDouble = false; player.doubleUsed = true;
            jumpBuf = 0; player.squash = -0.3;
            sfxDoubleJump();
            fx(player.x + 15, player.y + 19, '#ff4757', 12);
            ring(player.x + 15, player.y + 19, '#ff4757', 40);
        }
    }

    // Trọng lực
    player.vy += player.grav * (player.wallCling ? 0.4 : 1);
    if (player.wallCling && player.vy > 4) player.vy = 4;
    if (player.vy > player.maxFall) player.vy = player.maxFall;
    player.y += player.vy;

    if (!player.grounded && player.vy < -3) player.squash = -0.25;
    else if (!player.grounded && player.vy > 8) player.squash = 0.15;
    else player.squash *= 0.85;

    const wasGrounded = player.grounded;
    player.grounded = false;
    player.anim++;

    // ============ TRAPS RƠI ============
    for (const t of traps) {
        if (!t.falling && player.x + player.w > t.triggerX) t.falling = true;
        if (t.falling) {
            t.vy += 0.7; t.y += t.vy;
            if (overlap(player, t)) { if (!godMode) return die('Bị gai từ trần đâm thủng!'); }
            if (t.y > 500) t.falling = false;
        }
    }

    // ============ HAZARDS ============
    for (const h of hazards) {
        if (h.type === 'crusher') {
            if (!h.slamming && player.x + player.w > h.triggerX) { h.delay++; if (h.delay > 20) h.slamming = true; }
            if (h.slamming) {
                h.vy += 1.2; h.y += h.vy;
                if (h.y > 380 - h.h) { h.y = 380 - h.h; shake = 12; fs(h.x + h.w / 2, 380, 15);
                    setTimeout(() => { h.slamming = false; h.delay = 0; h.vy = 0; h.y = -60; }, 400);
                }
                if (overlap(player, h)) { if (!godMode) return die('Bị trần đè bẹp!'); }
            }
        }
        if (h.type === 'laser') {
            h.y += h.speed * h.dir;
            if (h.y > h.startY + h.range || h.y < h.startY - h.range) h.dir *= -1;
            if (overlap(player, h)) { if (!godMode) return die('Bị laser cắt đôi!'); }
        }
        if (h.type === 'pendulum') {
            h.phase += h.speed; h.angle = Math.sin(h.phase) * h.maxAngle;
            const bx = h.anchorX + Math.sin(h.angle) * h.length;
            const by = h.anchorY + Math.cos(h.angle) * h.length;
            if (overlap(player, { x: bx - h.r, y: by - h.r, w: h.r * 2, h: h.r * 2 })) { if (!godMode) return die('Bị lưỡi hái xập!'); }
        }
        if (h.type === 'spikewall') {
            h.x += h.speed * h.dir;
            if (h.x > h.startX + h.range || h.x < h.startX - h.range) h.dir *= -1;
            if (overlap(player, h)) { if (!godMode) return die('Bị tường gai nghiền!'); }
        }
    }

    // ============ BRICKS ============
    for (const b of bricks) {
        if (b.broke) continue;
        if (player.vy < 0 && overlap(player, b) && player.y + player.h - player.vy > b.y + b.h - 4) {
            player.vy = 2; shake = 6;
            fx(b.x + b.w / 2, b.y + b.h, '#ffa502', 12);
            ring(b.x + b.w / 2, b.y + b.h, '#ffa502', 30);
            if (b.type === 'coin') {
                b.broke = true; player.coins++; player.score += 200; wallet++;
                floatText(b.x + b.w / 2, b.y, '+200 🪙', '#ffd700');
                saveProgress();
            } else {
                b.broke = true;
                popups.push({ x: b.x + b.w / 2 - 12, y: b.y, vy: -6, life: 30, type: b.type });
            }
        }
    }

    // ============ PLATFORM COLLISION (BẪY ĐỨNG) ============
    for (const p of plats) {

        // ------- STANDSPIKE: đứng lên → spike trồi từ giữa -------
        if (p.type === 'standSpike') {
            const landing = player.x + player.w > p.x && player.x < p.x + p.w &&
                            player.y + player.h > p.y && player.y + player.h - player.vy <= p.y + 12;
            if (landing) {
                // Đứng lên → kích hoạt
                if (p.standT === -1) {
                    p.standT = 0;
                    sfxTrap();
                    shake = 18;
                    floatText(p.x + p.w / 2, p.y - 30, '⚠️ BẪY!', '#ff3838', 26);
                }
                if (!wasGrounded) { fs(player.x + 15, p.y, 6); player.squash = 0.2; }
                player.y = p.y - player.h; player.vy = 0;
                player.grounded = true; player.canDouble = true; player.doubleUsed = false;
            }
            // Trồi spike
            if (p.standT >= 0) {
                p.standT++;
                if (p.standT > 12 && p.spikeH < p.h) {
                    p.spikeH += 6;
                    if (p.spikeH > p.h) p.spikeH = p.h;
                    fx(p.x + Math.random() * p.w, p.y + p.h - p.spikeH, '#ff3838', 2);
                }
                if (p.standT < 12) p.drawShake = Math.sin(p.standT * 2) * 3;
                else p.drawShake = 0;
                // Va chạm khi spike trồi > 30%
                // Va chạm khi spike trồi > 30%
                if (p.spikeH > p.h * 0.3) {
    // Mở rộng hitbox lên trên để chạm tới player đang đứng trên platform
                    const spikeBox = {
                        x: p.x,
                        y: p.y + p.h - p.spikeH - player.h,   // mở rộng lên trên
                        w: p.w,
                        h: p.spikeH + player.h                  // cao thêm bằng player
                        };
                    if (overlap(player, spikeBox)) {
                    if (!godMode) return die('Bị gai trồi xuyên người!');
    }
}
            }
            continue;
        }

        // ------- STANDCRUSH: đứng lên → trần đè xuống -------
        if (p.type === 'standCrush') {
            const landing = player.x + player.w > p.x && player.x < p.x + p.w &&
                            player.y + player.h > p.y && player.y + player.h - player.vy <= p.y + 12;
            if (landing) {
                if (p.standT === -1) {
                    p.standT = 0;
                    shake = 20;
                    floatText(p.x + p.w / 2, p.y - 50, '⚠️ TRẦN ĐÈ!', '#ff3838', 26);
                }
                if (!wasGrounded) fs(player.x + 15, p.y, 6);
                player.y = p.y - player.h; player.vy = 0;
                player.grounded = true; player.canDouble = true; player.doubleUsed = false;
            }
            if (p.standT >= 0) {
                p.standT++;
                if (p.standT > 15) {
                    p.crusherVy += 1.5;
                    p.crusherY += p.crusherVy;
                    if (p.crusherY > p.y - 60) {
                        p.crusherY = p.y - 60;
                        shake = 15;
                        if (overlap(player, { x: p.x, y: p.crusherY, w: p.w, h: 60 })) {
                            if (!godMode) return die('Bị trần đè bẹp!');
                        }
                        setTimeout(() => { p.crusherY = -80; p.crusherVy = 0; }, 1000);
                    }
                    if (p.crusherVy > 0 && overlap(player, { x: p.x, y: p.crusherY, w: p.w, h: 60 })) {
                        if (!godMode) return die('Bị trần đè bẹp!');
                    }
                }
            }
            continue;
        }

        // ------- STANDSLIDE: đứng lên → trượt ngang kéo player theo -------
        if (p.type === 'standSlide') {
            const landing = player.x + player.w > p.x && player.x < p.x + p.w &&
                            player.y + player.h > p.y && player.y + player.h - player.vy <= p.y + 12;
            if (landing) {
                if (p.standT === -1) {
                    p.standT = 0;
                    shake = 10;
                    floatText(p.x + p.w / 2, p.y - 30, '⚠️ TRƯỢT!', '#ffa502', 24);
                }
                if (!wasGrounded) fs(player.x + 15, p.y, 6);
                player.y = p.y - player.h; player.vy = 0;
                player.grounded = true; player.canDouble = true; player.doubleUsed = false;
            }
            if (p.standT >= 0 && p.slideX < p.slideMax) {
                const step = 4;
                p.x += step; p.slideX += step;
                if (landing) player.x += step;
            }
            continue;
        }

        // ------- STANDBOUNCE: đứng lên → bắn lên trời -------
        if (p.type === 'standBounce') {
            const landing = player.x + player.w > p.x && player.x < p.x + p.w &&
                            player.y + player.h > p.y && player.y + player.h - player.vy <= p.y + 12;
            if (landing) {
                if (p.standT === -1) {
                    p.standT = 0;
                    shake = 8;
                    floatText(p.x + p.w / 2, p.y - 30, '⚠️ BAY LÊN!', '#a55eea', 24);
                }
                if (p.standT < 5) {
                    if (!wasGrounded) fs(player.x + 15, p.y, 6);
                    player.y = p.y - player.h; player.vy = 0;
                    player.grounded = true; player.canDouble = true; player.doubleUsed = false;
                }
            }
            if (p.standT >= 0) {
                p.standT++;
                if (p.standT === 5) {
                    player.vy = -22;
                    player.grounded = false;
                    player.canDouble = true; player.doubleUsed = false;
                    shake = 10;
                    fx(p.x + p.w / 2, p.y, '#a55eea', 20);
                    ring(p.x + p.w / 2, p.y, '#a55eea', 60);
                }
            }
            continue;
        }

        // ------- STANDFLIP: đứng lên → lật nghiêng → trượt xuống -------
        if (p.type === 'standFlip') {
            const landing = player.x + player.w > p.x && player.x < p.x + p.w &&
                            player.y + player.h > p.y && player.y + player.h - player.vy <= p.y + 12;
            if (landing && p.flipA < Math.PI / 4) {
                if (p.standT === -1) {
                    p.standT = 0;
                    shake = 12;
                    floatText(p.x + p.w / 2, p.y - 30, '⚠️ LẬT!', '#ff3838', 24);
                }
                if (!wasGrounded) fs(player.x + 15, p.y, 6);
                player.y = p.y - player.h; player.vy = 0;
                player.grounded = true; player.canDouble = true; player.doubleUsed = false;
            }
            if (p.standT >= 0) {
                p.standT++;
                p.flipA = Math.min(Math.PI / 2, p.standT * 0.1);
                if (p.flipA > Math.PI / 4 && landing) {
                    player.vy = 3;
                }
            }
            continue;
        }

        // ------- TRAP CŨ: spike trồi theo triggerX -------
        if (p.type === 'trap') {
            if (!p.fired && player.x + player.w > p.triggerX) {
                p.fired = true;
                shake = 15;
                fx(p.x + p.w / 2, p.y, '#ff3838', 20);
                floatText(p.x + p.w / 2, p.y - 30, '⚠️ BẪY!', '#ff3838', 24);
            }
            if (p.fired && p.spikeH < p.h) {
                p.spikeH += 5;
                if (p.spikeH > p.h) p.spikeH = p.h;
            }
            if (p.spikeH > p.h * 0.4) {
                const spikeBox = {
                    x: p.x,
                    y: p.y + p.h - p.spikeH - player.h,
                    w: p.w,
                    h: p.spikeH + player.h
    };
    if (overlap(player, spikeBox)) { if (!godMode) return die('Bị gai trồi lên đâm xuyên!'); }
}
            const landing = player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h > p.y && player.y + player.h - player.vy <= p.y + 12;
            if (landing && p.spikeH < p.h * 0.3) {
                if (!wasGrounded) fs(player.x + 15, p.y, 6);
                player.y = p.y - player.h; player.vy = 0;
                player.grounded = true; player.canDouble = true; player.doubleUsed = false;
            }
            continue;
        }

        // ------- BLINK -------
        if (p.type === 'blink') {
            p.blinkT = (p.blinkT || 0) + 1;
            const cycle = p.cycle || 120;
            const onTime = p.onTime || 60;
            p.visible = (p.blinkT % cycle) < onTime;
            if (!p.visible) continue;
        }

        // ------- FAKE: rung rồi sập -------
        if (p.type === 'fake') {
            if (p.triggered) {
                p.shakeT++;
                if (p.shakeT < 20) {
                    p.y += Math.sin(p.shakeT * 1.8) * 1.5;
                    continue;
                }
                p.y += 8;
                continue;
            }
        }

        // ------- Landing thường -------
        const landing = player.x + player.w > p.x && player.x < p.x + p.w &&
                        player.y + player.h > p.y && player.y + player.h - player.vy <= p.y + 12;
        if (!landing) continue;
        if (p.type === 'spike') { if (!godMode) return die('Đâm sầm vào bẫy gai!'); continue; }
        if (p.type === 'fake') { p.triggered = true; fx(p.x + p.w / 2, p.y, '#57606f', 12); continue; }
        if (p.type === 'finish') { finish(); return; }
        if (p.type === 'bounce') {
            player.vy = -20; player.grounded = false;
            player.canDouble = true; player.doubleUsed = false;
            player.squash = -0.5; shake = 6;
            fx(p.x + p.w / 2, p.y, '#a55eea', 15, 10);
            ring(p.x + p.w / 2, p.y, '#a55eea', 50);
            sfxBounce();
            floatText(p.x + p.w / 2, p.y - 20, 'BOUNCE!', '#a55eea');
            continue;
        }
        if (p.type === 'wall') continue;
        if (!wasGrounded) { fs(player.x + 15, p.y, 6); player.squash = 0.2; }
        player.y = p.y - player.h; player.vy = 0;
        player.grounded = true; player.canDouble = true; player.doubleUsed = false;
    }
    for (const p of plats) if (p.type === 'spike' && overlap(player, p)) { if (!godMode) return die('Đâm sầm vào bẫy gai!'); }

    // Moving platforms
    for (const p of plats) {
        if (p.type !== 'moving') continue;
        const oy = p.y;
        p.y += p.speed * p.dir;
        if (p.y > p.startY + p.range || p.y < p.startY - p.range) p.dir *= -1;
        if (player.x + player.w > p.x && player.x < p.x + p.w && player.vy >= 0 && player.y + player.h >= oy - 4 && player.y + player.h <= oy + 14) {
            player.y = p.y - player.h; player.vy = 0;
            player.grounded = true; player.canDouble = true; player.doubleUsed = false;
        }
    }

    if (player.y > 900) { if (!godMode) return die('Rơi tõm xuống vực!'); }

    // ============ ENEMIES ============
    for (const e of enemies) {
        if (!e.alive) continue;
        if (e.type === 'walker') { e.x += e.vx; if (e.x < e.minX || e.x > e.maxX) e.vx *= -1; }
        else if (e.type === 'flyer') { e.phase += e.speed; e.x += e.vx; if (e.x < e.minX || e.x > e.maxX) e.vx *= -1; e.y = e.baseY + Math.sin(e.phase) * e.amp; }
        else if (e.type === 'koopa') {
            if (e.shell) { e.shellT--; if (e.shellT <= 0) { e.shell = false; e.vx = e.vx > 0 ? 2 : -2; } }
            e.x += e.vx; if (e.x < e.minX || e.x > e.maxX) e.vx *= -1;
        } else if (e.type === 'shooter') {
            e.shootT++;
            if (e.shootT > 90 && Math.abs(player.x - e.x) < 500) {
                e.shootT = 0;
                const dir = player.x > e.x ? 1 : -1;
                projectiles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: dir * 5, vy: 0, r: 7, life: 200, owner: 'enemy' });
            }
        } else if (e.type === 'jumper') {
            e.jumpT++; e.x += e.vx;
            if (e.x < e.minX || e.x > e.maxX) e.vx *= -1;
            e.vy += 0.55; e.y += e.vy;
            if (e.y >= 346) { e.y = 346; e.vy = 0; if (e.jumpT > 60) { e.vy = -11; e.jumpT = 0; } }
        }

        if (overlap(player, e)) {
            if (player.powerStarTimer > 0 || player.rageTimer > 0) {
                e.alive = false; player.score += 500;
                fx(e.x + 15, e.y + 17, '#ff3838', 16);
                floatText(e.x + 15, e.y, '+500 💀', '#ffd700');
                continue;
            }
            if (player.powerState === 3) {
                e.alive = false; player.score += 400;
                floatText(e.x + 15, e.y, 'ĐÓNG BĂNG!', '#a5d8ff', 20);
                continue;
            }
            if (e.type === 'koopa') {
                if (!e.shell) {
                    if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 14) {
                        e.shell = true; e.shellT = 300; e.vx = player.facing * 6;
                        player.vy = -9; player.score += 400;
                        floatText(e.x + 15, e.y, 'SHELL!', '#2ed573');
                        continue;
                    }
                } else {
                    if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 14) { player.vy = -9; e.vx *= -1; continue; }
                    if (Math.abs(e.vx) < 0.5) e.vx = player.x < e.x ? 8 : -8;
                }
            }
            if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 14) {
                e.alive = false; player.vy = -10; player.squash = -0.3;
                player.canDouble = true; player.doubleUsed = false;
                player.combo++; player.comboTimer = 120;
                const gained = 300 * player.combo;
                player.score += gained;
                hitStop = 5; shake = 8; sfxStomp();
                fx(e.x + 15, e.y + 17, '#ff3838', 16);
                floatText(e.x + 15, e.y, `+${gained}${player.combo > 1 ? ` x${player.combo}` : ''}`, '#ffd700');
                continue;
            }
            takeDamage('Bị quái vật nhai!');
        }
    }

    // Projectiles
    for (const pr of projectiles) {
        pr.x += pr.vx; pr.y += pr.vy;
        if (pr.type === 'fire' || pr.type === 'ice') { pr.vy += 0.35; if (pr.y > 380) { pr.vy = -6; pr.y = 380; } }
        pr.life--;
        if (pr.owner === 'player') {
            for (const e of enemies) {
                if (!e.alive) continue;
                if (overlap(e, { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 })) {
                    e.alive = false; player.score += 400;
                    floatText(e.x + 15, e.y, pr.type === 'ice' ? 'ĐÓNG BĂNG!' : 'CHÁY!', pr.type === 'ice' ? '#a5d8ff' : '#ff9f43', 20);
                    fx(pr.x, pr.y, pr.type === 'ice' ? '#a5d8ff' : '#ff9f43', 20);
                    pr.life = 0; break;
                }
            }
        } else {
            if (overlap(player, { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 })) { pr.life = 0; takeDamage('Bị đạn bắn trúng!'); }
        }
    }
    projectiles = projectiles.filter(p => p.life > 0);

    // Items
    for (const it of items) {
        if (it.collected) continue;
        if (overlap(player, it)) {
            it.collected = true;
            if (it.type === 'coin') { player.coins++; player.score += 100; sfxCoin(); fx(it.x + 10, it.y + 10, '#ffd700', 8); ring(it.x + 11, it.y + 11, '#ffd700', 25); }
            else if (it.type === 'star') { player.stars++; player.score += 1000; sfxStar(); fx(it.x + 12, it.y + 12, '#fffa65', 16); ring(it.x + 13, it.y + 13, '#fffa65', 45); floatText(it.x + 12, it.y - 10, '+1000', '#fffa65'); }
            else if (it.type === 'heart') {
                if (player.hp < player.maxHp) { player.hp++; sfxScore(); floatText(it.x + 12, it.y - 10, '+1 HP', '#ff4757'); }
                else { player.score += 500; sfxScore(); floatText(it.x + 12, it.y - 10, '+500', '#ff4757'); }
                fx(it.x + 12, it.y + 12, '#ff4757', 16);
            }
            else if (it.type === 'fake_coin') {
                player.score += 500; flash = 0.4; flashColor = '#ff4757';
                for (let i = 0; i < 2; i++) enemies.push(WK(player.x + 180 + i * 120, (i % 2 === 0 ? 3 : -3), player.x + 60, player.x + 500));
                floatText(it.x + 10, it.y - 10, 'BẪY!', '#ff4757');
            }
            else if (it.type === 'power_mushroom') {
                player.powerState = Math.max(player.powerState, 1);
                player.transformTimer = 30; player.transformTarget = Math.max(player.powerState, 1);
                floatText(it.x + 15, it.y - 10, '🍄 LỚN!', '#ff4757', 22);
                fx(it.x + 15, it.y + 15, '#ff4757', 25); ring(it.x + 15, it.y + 15, '#ff4757', 80); shake = 8;
            }
            else if (it.type === 'power_fire') {
                player.powerState = 2; player.transformTimer = 30; player.transformTarget = 2;
                floatText(it.x + 15, it.y - 10, '🔥 HOA LỬA!', '#ff9f43', 22);
                fx(it.x + 15, it.y + 15, '#ff9f43', 25); ring(it.x + 15, it.y + 15, '#ff9f43', 80); shake = 8;
            }
            else if (it.type === 'power_ice') {
                player.powerState = 3; player.transformTimer = 30; player.transformTarget = 3;
                floatText(it.x + 15, it.y - 10, '❄️ HOA BĂNG!', '#a5d8ff', 22);
                fx(it.x + 15, it.y + 15, '#a5d8ff', 25); ring(it.x + 15, it.y + 15, '#a5d8ff', 80); shake = 8;
            }
            else if (it.type === 'power_star') {
                player.powerStarTimer = 480;
                floatText(it.x + 15, it.y - 10, '⭐ BẤT TỬ!', '#ffd700', 24);
                fx(it.x + 15, it.y + 15, '#ffd700', 30); ring(it.x + 15, it.y + 15, '#ffd700', 120);
                shake = 12; flash = 0.5; flashColor = '#ffd700';
            }
            else if (it.type === 'p_shield') { player.shields++; floatText(it.x + 15, it.y - 10, '🛡 +1 KHIÊN', '#00d2d3'); fx(it.x + 15, it.y + 15, '#00d2d3', 20); }
            else if (it.type === 'p_rage') { player.rageTimer = 480; floatText(it.x + 15, it.y - 10, '🔥 CUỒNG NỘ!', '#ff3838', 22); fx(it.x + 15, it.y + 15, '#ff3838', 25); shake = 14; flash = 0.5; }
            else if (it.type === 'p_speed') { player.speedTimer = 480; floatText(it.x + 15, it.y - 10, '⚡ TỐC ĐỘ!', '#fffa65', 22); fx(it.x + 15, it.y + 15, '#fffa65', 25); }
            else if (it.type === 'p_bomb') {
                floatText(it.x + 15, it.y - 10, '💥 BOM NỔ!', '#ff3838', 22);
                shake = 25; flash = 0.6; flashColor = '#ff3838'; ring(player.x + 15, player.y + 19, '#ff3838', 400);
                for (const e of enemies) { if (!e.alive) continue;
                    const dx = e.x - player.x, dy = e.y - player.y;
                    if (dx * dx + dy * dy < 400 * 400) { e.alive = false; player.score += 400; fx(e.x + 15, e.y + 17, '#ff3838', 20); }
                }
            }
        }
    }

    if (player.x < 0) player.x = 0;
    if (player.x + player.w > cam.maxX) player.x = cam.maxX - player.w;

    cam.x = Math.max(0, Math.min(player.x - canvas.width / 2, cam.maxX - canvas.width));
    updateCamY();

    // HUD
    document.getElementById('hud-score').innerText = `SCORE: ${player.score}`;
    document.getElementById('hud-coins').innerText = `🪙 ${player.coins}`;
    document.getElementById('hud-stars').innerText = `⭐ ${player.stars}`;
    document.getElementById('hud-level').innerText = `LVL ${currentLevel}/10`;
    let hpStr = '❤️'.repeat(Math.max(0, player.hp));
    if (player.shields > 0) hpStr += ' ' + '🛡️'.repeat(player.shields);
    if (godMode) hpStr = '⚡ ' + hpStr;
    document.getElementById('hud-hp').innerText = hpStr;
}
// ==================== DRAW BACKGROUND ====================
function drawBG() {
    const w = canvas.width, h = canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (currentLevel <= 3) { g.addColorStop(0, '#1a3a6a'); g.addColorStop(.5, '#2a5a8a'); g.addColorStop(1, '#1a2a4a'); }
    else if (currentLevel <= 7) { g.addColorStop(0, '#0a0212'); g.addColorStop(.5, '#1a0a2a'); g.addColorStop(1, '#0a020f'); }
    else { g.addColorStop(0, '#0a0202'); g.addColorStop(.5, '#3a0a08'); g.addColorStop(1, '#1a0505'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    if (currentLevel <= 3) {
        const cloudOff = (cam.x * .2) % 800;
        for (let i = 0; i < 8; i++) {
            const cx = ((i * 300 - cloudOff) % (w + 400) + w + 400) % (w + 400) - 200;
            const cy = 80 + (i % 3) * 60;
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(cx, cy, 30, 0, 7); ctx.arc(cx + 30, cy + 5, 24, 0, 7);
            ctx.arc(cx - 30, cy + 8, 22, 0, 7); ctx.arc(cx + 10, cy - 15, 22, 0, 7);
            ctx.fill();
        }
    }

    const so = (cam.x * .05) % 1400;
    for (let i = 0; i < 130; i++) {
        const sx = ((i * 97.3) % 1400) - so;
        if (sx < -10 || sx > w + 10) continue;
        const sy = (i * 43) % (h * .7);
        const tw = Math.sin(bgTSlow * .03 + i * 1.7) * .5 + .5;
        ctx.fillStyle = currentLevel <= 3 ? `rgba(255,255,200,${.2 + tw * .4})`
            : currentLevel <= 7 ? `rgba(220,180,255,${.25 + tw * .6})`
            : `rgba(255,200,170,${.25 + tw * .6})`;
        ctx.fillRect(sx, sy, .7 + (i % 3) * .6, .7 + (i % 3) * .6);
    }

    for (let L = 0; L < 2; L++) {
        const off = (cam.x * (L === 0 ? .15 : .3)) % 1000;
        ctx.fillStyle = L === 0
            ? (currentLevel <= 3 ? '#3a5a3a' : currentLevel <= 7 ? '#150a20' : '#150406')
            : (currentLevel <= 3 ? '#2a4a2a' : currentLevel <= 7 ? '#1e1030' : '#1e0808');
        ctx.beginPath(); ctx.moveTo(-200, h);
        const by = h * (L === 0 ? .75 : .82) + cam.y * (L === 0 ? .3 : .5);
        for (let x = -200; x <= w + 400; x += 50) {
            const wx = x + off;
            const y = by - (40 + L * 20 + Math.sin(wx * (L === 0 ? .008 : .012) + L) * 60 + Math.cos(wx * .02) * 40);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w + 400, h); ctx.closePath(); ctx.fill();
    }
}

// ==================== DRAW PLATFORMS ====================
function drawPlatforms() {
    for (const p of plats) {
        // Tất cả platform đều vẽ giống hệt nhau — không phân biệt được
        if (p.type === 'spike')          { drawSpikes(p); continue; }
        if (p.type === 'moving')         { drawMoving(p); continue; }
        if (p.type === 'bounce')         { drawBounce(p); continue; }
        if (p.type === 'wall')           { drawWall(p); continue; }
        if (p.type === 'finish')         { drawFinish(p); continue; }

        // blink khi tắt → outline mờ
        if (p.type === 'blink') {
            if (p.visible === false) {
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 6]);
                ctx.strokeRect(p.x, p.y, p.w, p.h);
                ctx.setLineDash([]);
                continue;
            }
            drawBlock(p);
            continue;
        }

        // fake đang rung → giữ rung
        if (p.type === 'fake' && p.triggered && p.shakeT < 20) {
            ctx.save();
            ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
            ctx.rotate(Math.sin(p.shakeT * 1.8) * 0.05);
            ctx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
            drawBlock(p);
            ctx.restore();
            continue;
        }

        // standFlip khi lật → vẽ nghiêng
        if (p.type === 'standFlip' && p.flipA > 0) {
            ctx.save();
            ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
            ctx.rotate(p.flipA);
            ctx.translate(-p.w / 2, -p.h / 2);
            drawBlock({ x: 0, y: 0, w: p.w, h: p.h });
            ctx.restore();
            continue;
        }

        // Mặc định: vẽ giống hệt platform thường
        drawBlock(p);
    }

    // Vẽ lớp phủ lên trên sau khi đã vẽ nền (spike trồi, trần đè...)
    for (const p of plats) {
        if (p.type === 'standSpike' && p.spikeH > 0) {
            drawStandSpikeOverlay(p);
        }
        if (p.type === 'standCrush' && p.standT >= 0) {
            drawStandCrushOverlay(p);
        }
        if (p.type === 'trap' && p.spikeH > 0) {
            drawTrapOverlay(p);
        }
    }
}
function drawStandSpikeOverlay(p) {
    // Vẽ spike đang trồi lên (không vẽ nền — đã vẽ như platform thường)
    const cnt = Math.ceil(p.w / 14);
    const aw = p.w / cnt;
    for (let i = 0; i < cnt; i++) {
        const sx = p.x + i * aw;
        const g = ctx.createLinearGradient(sx, p.y + p.h - p.spikeH, sx + aw, p.y + p.h);
        g.addColorStop(0, '#ff6b7a');
        g.addColorStop(.5, '#ff3838');
        g.addColorStop(1, '#8a1f2a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx, p.y + p.h);
        ctx.lineTo(sx + aw / 2, p.y + p.h - p.spikeH);
        ctx.lineTo(sx + aw, p.y + p.h);
        ctx.closePath();
        ctx.fill();
    }
    // Cảnh báo đỏ khi đang trồi
    if (p.spikeH < p.h) {
        ctx.fillStyle = `rgba(255,56,56,${0.3 + Math.sin(bgT * .5) * .2})`;
        ctx.fillRect(p.x, p.y + p.h - p.spikeH - 3, p.w, 3);
    }
}

function drawStandCrushOverlay(p) {
    // Dây xích + trần gai (không vẽ nền platform — đã vẽ như thường)
    ctx.strokeStyle = 'rgba(150,150,170,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2, 0);
    ctx.lineTo(p.x + p.w / 2, p.crusherY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p.x + 5, p.crusherY + 5, p.w, 60);
    const g = ctx.createLinearGradient(p.x, p.crusherY, p.x, p.crusherY + 60);
    g.addColorStop(0, '#666');
    g.addColorStop(.5, '#444');
    g.addColorStop(1, '#222');
    ctx.fillStyle = g;
    ctx.fillRect(p.x, p.crusherY, p.w, 60);

    ctx.fillStyle = '#ff4757';
    for (let i = 0; i < 4; i++) {
        const sx = p.x + i * (p.w / 4);
        ctx.beginPath();
        ctx.moveTo(sx, p.crusherY + 60);
        ctx.lineTo(sx + p.w / 8, p.crusherY + 72);
        ctx.lineTo(sx + p.w / 4, p.crusherY + 60);
        ctx.closePath();
        ctx.fill();
    }

    if (p.crusherVy === 0 && p.standT < 15) {
        ctx.fillStyle = `rgba(255,56,56,${0.4 + Math.sin(bgT * 0.8) * 0.4})`;
        ctx.fillRect(p.x, p.crusherY, p.w, 60);
    }
}

function drawTrapOverlay(p) {
    const cnt = Math.ceil(p.w / 14);
    const aw = p.w / cnt;
    for (let i = 0; i < cnt; i++) {
        const sx = p.x + i * aw;
        const g = ctx.createLinearGradient(sx, p.y + p.h - p.spikeH, sx + aw, p.y + p.h);
        g.addColorStop(0, '#ff6b7a');
        g.addColorStop(.5, '#ff3838');
        g.addColorStop(1, '#8a1f2a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx, p.y + p.h);
        ctx.lineTo(sx + aw / 2, p.y + p.h - p.spikeH);
        ctx.lineTo(sx + aw, p.y + p.h);
        ctx.closePath();
        ctx.fill();
    }
    if (p.fired && p.spikeH < p.h) {
        ctx.fillStyle = `rgba(255,56,56,${0.4 + Math.sin(bgT * .5) * .3})`;
        ctx.fillRect(p.x, p.y + p.h - p.spikeH - 3, p.w, 3);
    }
}
function drawStandSpike(p) {
    const shake = p.drawShake || 0;
    ctx.save();
    ctx.translate(shake, 0);
    // Nền platform
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p.x + 5, p.y + 5, p.w, p.h);
    const gr = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    gr.addColorStop(0, '#5a2525'); gr.addColorStop(1, '#1a0808');
    ctx.fillStyle = gr; ctx.fillRect(p.x, p.y, p.w, p.h);
    // Viền trên đỏ
    ctx.fillStyle = p.standT >= 0 ? '#ff3838' : '#ff6b7a';
    ctx.fillRect(p.x, p.y, p.w, 6);
    // Lỗ cảnh báo khi chưa trồi
    if (p.standT < 0) {
        ctx.fillStyle = 'rgba(255,56,56,0.3)';
        for (let i = 0; i < p.w; i += 20) ctx.fillRect(p.x + i + 5, p.y + 2, 3, 3);
    }
    // Spike trồi
    if (p.spikeH > 0) {
        const cnt = Math.ceil(p.w / 14);
        const aw = p.w / cnt;
        for (let i = 0; i < cnt; i++) {
            const sx = p.x + i * aw;
            const g = ctx.createLinearGradient(sx, p.y + p.h - p.spikeH, sx + aw, p.y + p.h);
            g.addColorStop(0, '#ff6b7a'); g.addColorStop(.5, '#ff3838'); g.addColorStop(1, '#8a1f2a');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(sx, p.y + p.h);
            ctx.lineTo(sx + aw / 2, p.y + p.h - p.spikeH);
            ctx.lineTo(sx + aw, p.y + p.h);
            ctx.closePath(); ctx.fill();
        }
    }
    ctx.restore();
}

function drawStandCrush(p) {
    drawBlock(p);
    if (p.standT >= 0) {
        // Dây xích
        ctx.strokeStyle = 'rgba(150,150,170,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x + p.w / 2, 0);
        ctx.lineTo(p.x + p.w / 2, p.crusherY);
        ctx.stroke();
        // Trần
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(p.x + 5, p.crusherY + 5, p.w, 60);
        const g = ctx.createLinearGradient(p.x, p.crusherY, p.x, p.crusherY + 60);
        g.addColorStop(0, '#666'); g.addColorStop(.5, '#444'); g.addColorStop(1, '#222');
        ctx.fillStyle = g;
        ctx.fillRect(p.x, p.crusherY, p.w, 60);
        // Gai dưới
        ctx.fillStyle = '#ff4757';
        for (let i = 0; i < 4; i++) {
            const sx = p.x + i * (p.w / 4);
            ctx.beginPath();
            ctx.moveTo(sx, p.crusherY + 60);
            ctx.lineTo(sx + p.w / 8, p.crusherY + 72);
            ctx.lineTo(sx + p.w / 4, p.crusherY + 60);
            ctx.closePath(); ctx.fill();
        }
        // Cảnh báo nhấp nháy
        if (p.crusherVy === 0 && p.standT < 15) {
            ctx.fillStyle = `rgba(255,56,56,${0.4 + Math.sin(bgT * 0.8) * 0.4})`;
            ctx.fillRect(p.x, p.crusherY, p.w, 60);
        }
    }
}

function drawStandSlide(p) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p.x + 5, p.y + 5, p.w, p.h);
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, '#8a5a2a'); g.addColorStop(1, '#5a3a1a');
    ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#ffa502';
    ctx.fillRect(p.x, p.y, p.w, 6);
    ctx.fillStyle = 'rgba(255,165,2,0.7)';
    for (let i = 0; i < 3; i++) {
        const ax = p.x + 15 + i * 20;
        ctx.beginPath();
        ctx.moveTo(ax, p.y + p.h / 2);
        ctx.lineTo(ax + 10, p.y + p.h / 2 - 5);
        ctx.lineTo(ax + 10, p.y + p.h / 2 + 5);
        ctx.closePath(); ctx.fill();
    }
}

function drawStandBounce(p) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p.x + 3, p.y + 3, p.w, p.h);
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, '#c99eff'); g.addColorStop(1, '#7a3eea');
    ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    for (let x = p.x + 6; x < p.x + p.w - 4; x += 6) {
        ctx.beginPath(); ctx.moveTo(x, p.y + 3); ctx.lineTo(x + 2, p.y + p.h - 3); ctx.stroke();
    }
    if (p.standT >= 0 && p.standT < 5) {
        ctx.fillStyle = `rgba(255,56,56,${0.5 + Math.sin(bgT * 1.5) * 0.4})`;
        ctx.fillRect(p.x, p.y, p.w, p.h);
    }
}

function drawStandFlip(p) {
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.flipA);
    const g = ctx.createLinearGradient(-p.w / 2, -p.h / 2, -p.w / 2, p.h / 2);
    g.addColorStop(0, '#5a2525'); g.addColorStop(1, '#1a0808');
    ctx.fillStyle = g;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.fillStyle = p.standT >= 0 ? '#ff3838' : '#ff6b7a';
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, 6);
    ctx.restore();
}

function drawTrap(p) {
    ctx.fillStyle = '#3a2525';
    ctx.fillRect(p.x, p.y + p.h - 6, p.w, 6);
    if (p.fired && p.spikeH < p.h) {
        ctx.fillStyle = `rgba(255,56,56,${0.4 + Math.sin(bgT * .5) * .3})`;
        ctx.fillRect(p.x, p.y + p.h - p.spikeH - 3, p.w, 3);
    }
    if (p.spikeH > 0) {
        const cnt = Math.ceil(p.w / 14);
        const aw = p.w / cnt;
        for (let i = 0; i < cnt; i++) {
            const sx = p.x + i * aw;
            const g = ctx.createLinearGradient(sx, p.y + p.h - p.spikeH, sx + aw, p.y + p.h);
            g.addColorStop(0, '#ff6b7a'); g.addColorStop(.5, '#ff3838'); g.addColorStop(1, '#8a1f2a');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(sx, p.y + p.h);
            ctx.lineTo(sx + aw / 2, p.y + p.h - p.spikeH);
            ctx.lineTo(sx + aw, p.y + p.h);
            ctx.closePath(); ctx.fill();
        }
    }
    if (!p.fired) {
        ctx.fillStyle = `rgba(255,71,87,${0.5 + Math.sin(bgT * .15) * .3})`;
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 5, 0, 7);
        ctx.fill();
    }
}

function drawBlock(p, customColor) {
    const lv = currentLevel;
    const topColor = customColor || (lv <= 3 ? '#4effa0' : lv <= 7 ? '#a55eea' : '#ff4757');
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x + 5, p.y + 5, p.w, p.h);
    const gr = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    gr.addColorStop(0, lv <= 3 ? '#8a5a2a' : lv <= 7 ? '#40305a' : '#5a2525');
    gr.addColorStop(.5, lv <= 3 ? '#6a4a1a' : lv <= 7 ? '#30204a' : '#3a1818');
    gr.addColorStop(1, lv <= 3 ? '#5a3a1a' : lv <= 7 ? '#1a1030' : '#1a0808');
    ctx.fillStyle = gr; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 8; i++) { ctx.fillRect(p.x + ((i * 137) % p.w), p.y + 15 + ((i * 89) % (p.h - 20)), 3, 3); }
    ctx.shadowColor = topColor; ctx.shadowBlur = 15;
    ctx.fillStyle = topColor; ctx.fillRect(p.x, p.y, p.w, 6);
    ctx.shadowBlur = 0;
}

function drawWall(p) {
    const g = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y);
    g.addColorStop(0, '#3a3a5a'); g.addColorStop(.5, '#4a4a6a'); g.addColorStop(1, '#3a3a5a');
    ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let y = p.y + 8; y < p.y + p.h; y += 12) { ctx.beginPath(); ctx.moveTo(p.x + 2, y); ctx.lineTo(p.x + p.w - 2, y); ctx.stroke(); }
    ctx.shadowColor = '#00d2d3'; ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(0,210,211,0.4)';
    ctx.fillRect(p.x, p.y, 2, p.h); ctx.fillRect(p.x + p.w - 2, p.y, 2, p.h);
    ctx.shadowBlur = 0;
}

function drawMoving(p) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x + 4, p.y + 4, p.w, p.h);
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, '#ffb84d'); g.addColorStop(.5, '#ffa502'); g.addColorStop(1, '#cc7f00');
    ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let x = p.x + 6; x < p.x + p.w - 6; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, p.y + 4); ctx.lineTo(x + 6, p.y + p.h / 2); ctx.lineTo(x, p.y + p.h - 4);
        ctx.lineTo(x + 3, p.y + p.h - 4); ctx.lineTo(x + 9, p.y + p.h / 2); ctx.lineTo(x + 3, p.y + 4);
        ctx.closePath(); ctx.fill();
    }
    ctx.shadowColor = '#ffa502'; ctx.shadowBlur = 20; ctx.fillRect(p.x, p.y, p.w, 2); ctx.shadowBlur = 0;
}

function drawBounce(p) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x + 3, p.y + 3, p.w, p.h);
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, '#c99eff'); g.addColorStop(1, '#7a3eea');
    ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    for (let x = p.x + 6; x < p.x + p.w - 4; x += 6) { ctx.beginPath(); ctx.moveTo(x, p.y + 3); ctx.lineTo(x + 2, p.y + p.h - 3); ctx.stroke(); }
    ctx.shadowColor = '#a55eea'; ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(200,150,255,0.7)'; ctx.fillRect(p.x, p.y, p.w, 2); ctx.shadowBlur = 0;
}

function drawSpikes(p) {
    const sw = 14, cnt = Math.ceil(p.w / sw), aw = p.w / cnt;
    for (let i = 0; i < cnt; i++) {
        const sx = p.x + i * aw;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.moveTo(sx + 2, p.y + p.h); ctx.lineTo(sx + aw / 2 + 2, p.y + 2); ctx.lineTo(sx + aw + 2, p.y + p.h); ctx.closePath(); ctx.fill();
        const g = ctx.createLinearGradient(sx, p.y, sx + aw, p.y + p.h);
        g.addColorStop(0, '#ff6b7a'); g.addColorStop(.5, '#ff4757'); g.addColorStop(1, '#8a1f2a');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(sx, p.y + p.h); ctx.lineTo(sx + aw / 2, p.y); ctx.lineTo(sx + aw, p.y + p.h); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#4a1515'; ctx.fillRect(p.x, p.y + p.h - 6, p.w, 6);
}

function drawFinish(p) {
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, '#ffe066'); g.addColorStop(1, '#b8860b');
    ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(p.x, p.y, p.w, 4);
    ctx.fillStyle = '#4a2a1a'; ctx.fillRect(p.x + p.w - 8, p.y - 200, 8, 200);
    const wave = Math.sin(bgTSlow * .1) * 6;
    const fg = ctx.createLinearGradient(p.x, p.y - 200, p.x, p.y - 100);
    fg.addColorStop(0, '#ff6b81'); fg.addColorStop(1, '#c23616');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(p.x + p.w - 4, p.y - 200);
    ctx.lineTo(p.x + p.w + 60 + wave, p.y - 170);
    ctx.lineTo(p.x + p.w - 4, p.y - 120);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x + p.w + 22, p.y - 160, 8, 0, 7); ctx.fill();
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(255,215,0,0.15)'; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.shadowBlur = 0;
}

// ==================== DRAW BRICKS / TRAPS / HAZARDS ====================
function drawBricks() {
    for (const b of bricks) {
        if (b.broke) continue;
        const isQ = b.type !== 'coin';
        const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        if (isQ) { g.addColorStop(0, '#ffb84d'); g.addColorStop(.5, '#ffa502'); g.addColorStop(1, '#c27000'); }
        else { g.addColorStop(0, '#c99eff'); g.addColorStop(.5, '#7a3eea'); g.addColorStop(1, '#5a1ec0'); }
        ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(b.x + 3, b.y + 3, 3, 3); ctx.fillRect(b.x + b.w - 6, b.y + 3, 3, 3);
        ctx.fillRect(b.x + 3, b.y + b.h - 6, 3, 3); ctx.fillRect(b.x + b.w - 6, b.y + b.h - 6, 3, 3);
        const sh = Math.sin(bgTSlow * .1) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255,255,255,${0.6 + sh * 0.4})`;
        ctx.font = 'bold 22px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isQ ? '?' : '🪙', b.x + b.w / 2, b.y + b.h / 2 + 1);
        ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }
}

function drawTraps() {
    for (const t of traps) {
        if (!t.falling || t.y < 20) {
            ctx.strokeStyle = 'rgba(120,120,140,0.6)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(t.x + t.w / 2, 0); ctx.lineTo(t.x + t.w / 2, t.y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.moveTo(t.x + 3, t.y); ctx.lineTo(t.x + t.w / 2 + 3, t.y + t.h + 3); ctx.lineTo(t.x + t.w + 3, t.y); ctx.closePath(); ctx.fill();
        const g = ctx.createLinearGradient(t.x, t.y, t.x + t.w, t.y + t.h);
        g.addColorStop(0, '#ff6b7a'); g.addColorStop(.5, '#ff3838'); g.addColorStop(1, '#7a1015');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + t.w / 2, t.y + t.h); ctx.lineTo(t.x + t.w, t.y); ctx.closePath(); ctx.fill();
    }
}

function drawHazards() {
    for (const h of hazards) {
        if (h.type === 'crusher') {
            ctx.strokeStyle = 'rgba(150,150,170,0.5)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(h.x + h.w / 2, 0); ctx.lineTo(h.x + h.w / 2, h.y); ctx.stroke();
            const g = ctx.createLinearGradient(h.x, h.y, h.x, h.y + h.h);
            g.addColorStop(0, '#666'); g.addColorStop(.5, '#444'); g.addColorStop(1, '#222');
            ctx.fillStyle = g; ctx.fillRect(h.x, h.y, h.w, h.h);
            ctx.fillStyle = '#ff4757';
            for (let i = 0; i < 4; i++) {
                const sx = h.x + i * (h.w / 4);
                ctx.beginPath(); ctx.moveTo(sx, h.y + h.h); ctx.lineTo(sx + h.w / 8, h.y + h.h + 12); ctx.lineTo(sx + h.w / 4, h.y + h.h); ctx.closePath(); ctx.fill();
            }
            if (h.delay > 10 && !h.slamming) { ctx.fillStyle = `rgba(255,71,87,${0.3 + Math.sin(bgTSlow * .5) * .3})`; ctx.fillRect(h.x, h.y, h.w, h.h); }
        }
        if (h.type === 'laser') {
            ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 25;
            const g = ctx.createLinearGradient(0, h.y, 0, h.y + h.h);
            g.addColorStop(0, 'rgba(255,0,85,0)'); g.addColorStop(.5, '#ff0055'); g.addColorStop(1, 'rgba(255,0,85,0)');
            ctx.fillStyle = g; ctx.fillRect(h.x, h.y, h.w, h.h);
            ctx.fillStyle = '#fff'; ctx.fillRect(h.x, h.y + h.h / 2 - 1, h.w, 2);
            ctx.shadowBlur = 0;
        }
        if (h.type === 'pendulum') {
            const bx = h.anchorX + Math.sin(h.angle) * h.length;
            const by = h.anchorY + Math.cos(h.angle) * h.length;
            ctx.strokeStyle = 'rgba(150,150,170,0.7)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(h.anchorX, h.anchorY); ctx.lineTo(bx, by); ctx.stroke();
            ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(h.anchorX, h.anchorY, 6, 0, 7); ctx.fill();
            const g = ctx.createRadialGradient(bx - h.r * .3, by - h.r * .3, 3, bx, by, h.r);
            g.addColorStop(0, '#ff6b7a'); g.addColorStop(1, '#5a1515');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, h.r, 0, 7); ctx.fill();
            ctx.fillStyle = '#ff3838';
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 * i / 8) + bgTSlow * 0.02;
                ctx.beginPath();
                ctx.moveTo(bx + Math.cos(a - .2) * h.r, by + Math.sin(a - .2) * h.r);
                ctx.lineTo(bx + Math.cos(a) * (h.r + 8), by + Math.sin(a) * (h.r + 8));
                ctx.lineTo(bx + Math.cos(a + .2) * h.r, by + Math.sin(a + .2) * h.r);
                ctx.closePath(); ctx.fill();
            }
        }
        if (h.type === 'spikewall') {
            ctx.shadowColor = '#ff3838'; ctx.shadowBlur = 15;
            const g = ctx.createLinearGradient(h.x, h.y, h.x + h.w, h.y);
            g.addColorStop(0, '#8a1f2a'); g.addColorStop(.5, '#ff3838'); g.addColorStop(1, '#8a1f2a');
            ctx.fillStyle = g; ctx.fillRect(h.x, h.y, h.w, h.h);
            ctx.fillStyle = '#ff6b7a';
            for (let y = h.y + 10; y < h.y + h.h; y += 20) {
                ctx.beginPath(); ctx.moveTo(h.x + h.w, y); ctx.lineTo(h.x + h.w + 12, y + 10); ctx.lineTo(h.x + h.w, y + 20); ctx.closePath(); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }
    }
}

function drawTriggers() {
    for (const t of triggers) {
        if (t.type !== 'wind') continue;
        ctx.globalAlpha = 0.12 + Math.sin(bgTSlow * .1) * .05;
        ctx.fillStyle = '#00d2d3'; ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.globalAlpha = 1;
    }
}

// ==================== DRAW ITEMS / ENEMIES ====================
function drawItems() {
    for (const it of items) {
        if (it.collected) continue;
        const bob = Math.sin(bgTSlow * .08 + it.x * .1) * 3;
        const cx = it.x + it.w / 2, cy = it.y + it.h / 2 + bob;
        if (it.type === 'coin' || it.type === 'fake_coin') {
            const isFake = it.type === 'fake_coin';
            ctx.shadowColor = isFake ? '#ff4757' : '#ffd700'; ctx.shadowBlur = 15;
            const g = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 12);
            g.addColorStop(0, isFake ? '#ff6b7a' : '#fffa65'); g.addColorStop(1, isFake ? '#c23616' : '#b8860b');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = isFake ? '#fff' : '#8a6000';
            ctx.font = `bold ${isFake ? 14 : 12}px Courier New`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(isFake ? '?' : '★', cx, cy + 1);
            ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
        } else if (it.type === 'star') {
            ctx.shadowColor = '#fffa65'; ctx.shadowBlur = 25;
            const g = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 15);
            g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffa502');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff'; ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
                ctx.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
                const a2 = a + Math.PI / 5;
                ctx.lineTo(cx + Math.cos(a2) * 4, cy + Math.sin(a2) * 4);
            }
            ctx.closePath(); ctx.fill();
        } else if (it.type === 'heart') {
            ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 25;
            const beat = 1 + Math.sin(bgTSlow * .15) * .1;
            ctx.save(); ctx.translate(cx, cy); ctx.scale(beat, beat);
            ctx.fillStyle = '#ff4757'; ctx.beginPath();
            ctx.moveTo(0, 6); ctx.bezierCurveTo(-12, -4, -8, -14, 0, -8); ctx.bezierCurveTo(8, -14, 12, -4, 0, 6);
            ctx.closePath(); ctx.fill(); ctx.restore(); ctx.shadowBlur = 0;
        } else {
            const colors = { power_mushroom: '#ff4757', power_fire: '#ff9f43', power_ice: '#a5d8ff', power_star: '#ffd700',
                p_shield: '#00d2d3', p_rage: '#ff3838', p_speed: '#fffa65', p_bomb: '#ffb84d' };
            const c = colors[it.type] || '#fff';
            ctx.shadowColor = c; ctx.shadowBlur = 25;
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const icon = { power_mushroom:'🍄', power_fire:'🔥', power_ice:'❄', power_star:'⭐',
                p_shield:'🛡', p_rage:'😡', p_speed:'⚡', p_bomb:'💥' }[it.type] || '?';
            ctx.fillText(icon, cx, cy + 1);
            ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
        }
    }
}

function drawPopups() {
    for (const p of popups) {
        const cx = p.x + 12, cy = p.y + 12;
        const colors = { power_mushroom:'#ff4757', power_fire:'#ff9f43', power_ice:'#a5d8ff', power_star:'#ffd700' };
        const c = colors[p.type] || '#fff';
        ctx.shadowColor = c; ctx.shadowBlur = 25;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    }
}

function drawEnemies() {
    for (const e of enemies) {
        if (!e.alive) continue;
        const cx = e.x + e.w / 2, cy = e.y + e.h / 2, wob = Math.sin(bgTSlow * .15) * 2;
        if (e.type === 'walker' || !e.type) {
            const g = ctx.createRadialGradient(cx - 5, cy - 5, 3, cx, cy, e.w);
            g.addColorStop(0, '#8a4a20'); g.addColorStop(1, '#3a1808');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx, cy - 3 + wob, e.w / 2 + 2, Math.PI, 0);
            ctx.lineTo(cx + e.w / 2 + 2, cy + e.h / 3); ctx.lineTo(cx - e.w / 2 - 2, cy + e.h / 3);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(cx - 6, cy - 3 + wob, 5, 0, 7); ctx.arc(cx + 6, cy - 3 + wob, 5, 0, 7); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(cx - 5, cy - 3 + wob, 2.5, 0, 7); ctx.arc(cx + 7, cy - 3 + wob, 2.5, 0, 7); ctx.fill();
        } else if (e.type === 'flyer') {
            ctx.shadowColor = '#a55eea'; ctx.shadowBlur = 12;
            ctx.fillStyle = '#c99eff'; ctx.beginPath(); ctx.arc(cx, cy, e.w / 2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 4, 0, 7); ctx.arc(cx + 5, cy - 2, 4, 0, 7); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 2, 0, 7); ctx.arc(cx + 5, cy - 2, 2, 0, 7); ctx.fill();
        } else if (e.type === 'koopa') {
            if (e.shell) {
                ctx.fillStyle = '#4effa0';
                ctx.beginPath(); ctx.arc(cx, cy, e.w / 2 + 2, 0, 7); ctx.fill();
            } else {
                ctx.fillStyle = '#4effa0';
                ctx.beginPath(); ctx.ellipse(cx, cy + 2, e.w / 2 + 2, e.h / 2 - 6, 0, 0, 7); ctx.fill();
                ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(cx, cy - e.h / 2 + 6, 9, 0, 7); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx + 3, cy - e.h / 2 + 5, 2.5, 0, 7); ctx.fill();
            }
        } else if (e.type === 'shooter') {
            ctx.fillStyle = '#3a3a3a'; ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = `rgba(255,71,87,${0.7 + Math.sin(bgTSlow * .3) * .3})`;
            ctx.beginPath(); ctx.arc(cx, cy - 2, 5, 0, 7); ctx.fill();
        } else if (e.type === 'jumper') {
            ctx.fillStyle = '#4effa0';
            ctx.beginPath(); ctx.ellipse(cx, cy, e.w / 2, e.h / 2, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(cx - 7, cy - 8, 4, 0, 7); ctx.arc(cx + 7, cy - 8, 4, 0, 7); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(cx - 7, cy - 8, 2, 0, 7); ctx.arc(cx + 7, cy - 8, 2, 0, 7); ctx.fill();
        }
    }
    for (const p of projectiles) {
        const c = p.type === 'fire' ? '#ff9f43' : p.type === 'ice' ? '#a5d8ff' : '#ff4757';
        ctx.shadowColor = c; ctx.shadowBlur = 15;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    }
}

// ==================== DRAW MARIO ====================
function drawMario() {
    if (godMode) {
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 35;
        ctx.fillStyle = `rgba(255,215,0,${0.35 + Math.sin(bgT * .25) * .15})`;
        ctx.beginPath(); ctx.arc(player.x + 15, player.y + 19, 40, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    }
    if (player.powerStarTimer > 0) {
        const t = bgT * 0.15;
        for (let i = 0; i < 6; i++) {
            const a = t + i * (Math.PI * 2 / 6);
            const col = ['#ffd700', '#fffa65', '#ff4757', '#a55eea', '#00d2d3', '#4effa0'][i];
            ctx.globalAlpha = 0.5; ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(player.x + 15 + Math.cos(a) * 25, player.y + 19 + Math.sin(a) * 25, 6, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    if (player.rageTimer > 0) {
        ctx.shadowColor = '#ff3838'; ctx.shadowBlur = 30;
        ctx.fillStyle = `rgba(255,56,56,${0.35 + Math.sin(bgT * .3) * .15})`;
        ctx.beginPath(); ctx.arc(player.x + 15, player.y + 19, 35, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    }
    if (player.shields > 0) {
        ctx.strokeStyle = `rgba(0,210,211,${0.6 + Math.sin(bgT * .15) * .3})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(player.x + 15, player.y + 19, 30, 0, 7); ctx.stroke();
    }
    for (const t of player.trail) {
        ctx.globalAlpha = t.life / 15 * 0.4;
        ctx.fillStyle = player.rageTimer > 0 ? '#ff4757' : '#00d2d3';
        ctx.fillRect(t.x, t.y, player.w, player.h);
    }
    ctx.globalAlpha = 1;

    let alpha = 1;
    if (player.transformTimer > 0 && Math.floor(player.transformTimer / 3) % 2 === 0) alpha = 0.4;
    if (player.invuln > 0 && !godMode && player.powerStarTimer <= 0 && Math.floor(player.invuln / 4) % 2 === 0) alpha = 0.4;
    if (player.ghost > 0) alpha = 0.35;
    ctx.globalAlpha = alpha;

    const sq = player.squash || 0;
    const w = player.w * (1 - sq), h = player.h * (1 + sq);
    const x = player.x + (player.w - w) / 2, y = player.y + (player.h - h);
    const face = player.facing;

    if (player.grounded) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(player.x + player.w / 2, player.y + player.h + 1, w * .6, 4, 0, 0, 7); ctx.fill();
    }

    ctx.save();
    if (face === -1) { ctx.translate(x + w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(x + w / 2), 0); }
    const bx = x, by = y, bw = w, bh = h;
    const running = Math.abs(player.vx) > .5, jumping = !player.grounded;
    const legS = running ? Math.sin(player.anim * .4) * 5 : 0;
    const armS = running ? Math.sin(player.anim * .4 + Math.PI) * 4 : 0;

    const isFire = player.powerState === 2, isIce = player.powerState === 3;
    const shirtCol = isFire ? '#ffffff' : isIce ? '#e0f0ff' : '#e52521';
    const overallCol = isFire ? '#e52521' : isIce ? '#4a8ad8' : '#1c3ecc';
    const overallCol2 = isFire ? '#a01515' : isIce ? '#2a5a9a' : '#152a99';

    if (player.wallCling) {
        ctx.fillStyle = 'rgba(0,210,211,0.5)';
        ctx.fillRect(bx + (player.wallDir > 0 ? bw - 3 : 0), by + 4, 3, bh - 8);
    }

    // Chân
    ctx.fillStyle = overallCol;
    ctx.fillRect(bx + bw * .18, by + bh * .72 + legS, bw * .25, bh * .2);
    ctx.fillRect(bx + bw * .57, by + bh * .72 - legS, bw * .25, bh * .2);
    // Giày
    ctx.fillStyle = '#5c2e16';
    ctx.beginPath();
    ctx.ellipse(bx + bw * .28, by + bh * .95 + legS, bw * .22, bh * .075, 0, 0, 7);
    ctx.ellipse(bx + bw * .72, by + bh * .95 - legS, bw * .22, bh * .075, 0, 0, 7);
    ctx.fill();
    // Thân
    const bgr = ctx.createLinearGradient(bx, by + bh * .45, bx, by + bh * .8);
    bgr.addColorStop(0, overallCol); bgr.addColorStop(1, overallCol2);
    ctx.fillStyle = bgr; ctx.fillRect(bx + bw * .2, by + bh * .45, bw * .6, bh * .3);
    // Áo sơ mi
    ctx.fillStyle = shirtCol; ctx.fillRect(bx + bw * .15, by + bh * .42, bw * .7, bh * .08);
    // Tay
    ctx.fillStyle = shirtCol;
    if (jumping) {
        ctx.fillRect(bx - bw * .05, by + bh * .18 - armS, bw * .22, bh * .28);
        ctx.fillRect(bx + bw * .83, by + bh * .18 + armS, bw * .22, bh * .28);
    } else {
        ctx.fillRect(bx - bw * .05, by + bh * .45, bw * .22, bh * .24);
        ctx.fillRect(bx + bw * .83, by + bh * .45, bw * .22, bh * .24);
    }
    // Găng
    ctx.fillStyle = '#f0f0f0';
    if (jumping) {
        ctx.beginPath();
        ctx.arc(bx + bw * .06, by + bh * .16 - armS, bw * .13, 0, 7);
        ctx.arc(bx + bw * .94, by + bh * .16 + armS, bw * .13, 0, 7);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.arc(bx + bw * .06, by + bh * .69, bw * .13, 0, 7);
        ctx.arc(bx + bw * .94, by + bh * .69, bw * .13, 0, 7);
        ctx.fill();
    }
    // Nút áo
    ctx.fillStyle = '#fbd000';
    ctx.beginPath(); ctx.arc(bx + bw * .35, by + bh * .55, 2.5, 0, 7); ctx.arc(bx + bw * .65, by + bh * .55, 2.5, 0, 7); ctx.fill();

    // Đầu
    const hY = by + bh * .28, hR = bw * .36;
    const hg = ctx.createRadialGradient(bx + bw * .45, hY - 4, 2, bx + bw * .5, hY, hR);
    hg.addColorStop(0, '#ffd9b8'); hg.addColorStop(1, '#e8a87c');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(bx + bw * .5, hY, hR, 0, 7); ctx.fill();

    // Mũ
    const capCol1 = isFire ? '#ffffff' : isIce ? '#a5d8ff' : '#ff3d3d';
    const capCol2 = isFire ? '#e0e0e0' : isIce ? '#4a8ad8' : '#b01515';
    const cg = ctx.createLinearGradient(bx, by, bx + bw, by + bh * .2);
    cg.addColorStop(0, capCol1); cg.addColorStop(1, capCol2);
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(bx + bw * .5, hY - hR * .15, hR * 1.05, Math.PI, 0); ctx.fill();
    ctx.fillStyle = capCol2;
    ctx.beginPath(); ctx.ellipse(bx + bw * .5, hY - hR * .15, hR * 1.3, hR * .22, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(bx + bw * .4, hY - hR * .7, hR * .4, hR * .15, -.3, 0, 7); ctx.fill();
    // Chữ M
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(bw * .35)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('M', bx + bw * .5, hY - hR * .35);

    // Mắt
    const eY = hY + hR * .1;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bx + bw * .38, eY, bw * .09, 0, 7); ctx.arc(bx + bw * .62, eY, bw * .09, 0, 7); ctx.fill();
    ctx.fillStyle = player.rageTimer > 0 ? '#ff0000' : '#1c3ecc';
    ctx.beginPath(); ctx.arc(bx + bw * .39, eY + 1, bw * .045, 0, 7); ctx.arc(bx + bw * .63, eY + 1, bw * .045, 0, 7); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(bx + bw * .39, eY + 1, bw * .022, 0, 7); ctx.arc(bx + bw * .63, eY + 1, bw * .022, 0, 7); ctx.fill();
    // Ria
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.ellipse(bx + bw * .5, hY + hR * .55, bw * .3, bw * .09, 0, 0, 7); ctx.fill();
    // Mũi
    ctx.fillStyle = '#e8a87c';
    ctx.beginPath(); ctx.arc(bx + bw * .5, hY + hR * .35, bw * .1, 0, 7); ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
}

// ==================== DRAW PARTICLES / OVERLAY ====================
function drawParticles() {
    for (const p of rings) {
        ctx.strokeStyle = p.color; ctx.globalAlpha = p.life / p.max; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of dust) {
        ctx.fillStyle = `rgba(200,200,220,${(p.life / p.max) * .6})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    for (const p of particles) {
        ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const t of floatTexts) {
        ctx.globalAlpha = Math.min(1, t.life / 30); ctx.fillStyle = t.color;
        ctx.font = `bold ${t.size}px Courier New`; ctx.textAlign = 'center';
        ctx.fillText(t.txt, t.x, t.y);
        ctx.textAlign = 'start';
    }
    ctx.globalAlpha = 1;
}

function drawOverlay() {
    const w = canvas.width, h = canvas.height;
    if (redTint > 0.01) { ctx.fillStyle = `rgba(255,56,56,${redTint})`; ctx.fillRect(0, 0, w, h); }
    if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
    if (godMode && state === 'PLAYING') {
        ctx.fillStyle = 'rgba(255,215,0,0.9)';
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ GOD MODE ⚡', w / 2, 70);
        ctx.textAlign = 'start';
    }
    if (state === 'PLAYING') {
        let by = 100;
        if (player.ctrlFlip > 0) {
            ctx.fillStyle = 'rgba(255,0,255,0.9)';
            ctx.font = 'bold 16px Courier New';
            ctx.fillText(`🔀 ĐẢO PHÍM: ${(player.ctrlFlip/60).toFixed(1)}s`, 20, by); by += 24;
        }
        if (player.screenSpin > 0) {
            ctx.fillStyle = 'rgba(255,255,0,0.9)';
            ctx.font = 'bold 16px Courier New';
            ctx.fillText(`🌀 QUAY: ${(player.screenSpin/60).toFixed(1)}s`, 20, by); by += 24;
        }
        if (player.timeWarp > 0) {
            ctx.fillStyle = 'rgba(165,216,255,0.9)';
            ctx.font = 'bold 16px Courier New';
            ctx.fillText(`🐌 SLOW-MO: ${(player.timeWarp/60).toFixed(1)}s`, 20, by); by += 24;
        }
        if (player.ghost > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 16px Courier New';
            ctx.fillText(`👻 VÔ HÌNH: ${(player.ghost/60).toFixed(1)}s`, 20, by);
        }
    }
}

function drawTransition() {
    if (state !== 'TRANSITION') return;
    const w = canvas.width, h = canvas.height;
    const a = Math.min(1, (120 - transT) / 30);
    ctx.fillStyle = `rgba(0,0,0,${a * .7})`; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 80px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(transText, w / 2, h / 2 - 20);
    ctx.font = 'bold 22px Courier New'; ctx.fillStyle = '#fff';
    ctx.fillText(`⏱ ${formatTime(runFrames)}  •  💀 ${totalDeaths}`, w / 2, h / 2 + 60);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
}

// ==================== MAIN DRAW ====================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state === 'MENU') { drawBG(); drawOverlay(); return; }
    drawBG();

    const sx = shake > .5 ? (Math.random() - .5) * shake : 0;
    const sy = shake > .5 ? (Math.random() - .5) * shake : 0;

    ctx.save();
    if (player.screenSpin > 0) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.sin(bgT * 0.05) * 0.15 + (player.screenSpin / 60) * Math.PI * 0.3);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    ctx.translate(-cam.x + sx, cam.y + sy);
    drawPlatforms();
    drawBricks();
    drawTraps();
    drawHazards();
    drawTriggers();
    drawItems();
    drawPopups();
    drawEnemies();
    if (state !== 'GAMEOVER') drawMario();
    drawParticles();
    ctx.restore();

    drawOverlay();
    drawTransition();
}

// ==================== LOOP ====================
function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
resize();
updateUserBar();

(function addButtons() {
    const menu = document.getElementById('menu-screen');
    if (!menu) return;
    const container = menu.querySelector('#auth-status-container');
    if (!container) return;
    if (!container.querySelector('.btn-upgrade')) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-upgrade';
        btn.innerHTML = '⚙ NÂNG CẤP';
        btn.onclick = openUpgradeScreen;
        container.insertBefore(btn, container.children[1] || null);
    }
})();
(function initVolumeUI() {
    const mv = document.getElementById('music-vol');
    const sv = document.getElementById('sfx-vol');
    if (mv) {
        mv.value = musicVolume;
        mv.addEventListener('input', () => setMusicVolume(parseFloat(mv.value)));
    }
    if (sv) {
        sv.value = sfxVolume;
        sv.addEventListener('input', () => setSfxVolume(parseFloat(sv.value)));
    }
})();
gameLoop();

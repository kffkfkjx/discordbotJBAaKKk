import express from 'express';

let isBotRunning = true; // Bot starts running by default in index.ts
let _startBotFn: () => void = () => {};
let _stopBotFn: () => void = () => {};
let _statsFn: () => any = () => ({ ping: 0, uptime: 0, servers: 0, users: 0 });

export function setBotFunctions(startFn: () => void, stopFn: () => void, statsFn: () => any) {
    _startBotFn = startFn;
    _stopBotFn = stopFn;
    _statsFn = statsFn;
}

export function startDashboard(startBotFn: () => void, stopBotFn: () => void) {
    const app = express();
    app.use(express.json());

    // Simple session storage in memory
    const sessions = new Set<string>();
    const PASSWORD = 'nexoBOT-S22MasO9099LnJoaNaluYUBw';

    app.get('/', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html lang="tr" class="dark">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>NexoBOT Yönetim Paneli</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&display=swap');
                    body {
                        font-family: 'Space Grotesk', sans-serif;
                        background: radial-gradient(circle at top, #1E1B4B, #0F172A);
                        color: #F8FAFC;
                        min-height: 100vh;
                    }
                    .glass {
                        background: rgba(30, 41, 59, 0.4);
                        backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
                    }
                    .neon-text {
                        text-shadow: 0 0 10px rgba(16, 185, 129, 0.8), 0 0 20px rgba(16, 185, 129, 0.4);
                    }
                    .fade-in { animation: fadeIn 0.6s ease-out; }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    #panel { display: none; }
                </style>
            </head>
            <body class="flex items-center justify-center p-4">

                <!-- Login Screen -->
                <div id="loginBox" class="glass rounded-2xl p-8 w-full max-w-md fade-in text-center">
                    <div class="mb-6">
                        <i class="fa-solid fa-robot text-6xl text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]"></i>
                    </div>
                    <h2 class="text-3xl font-bold mb-2 text-white">Nexo<span class="text-emerald-400">BOT</span></h2>
                    <p class="text-slate-400 mb-8">Yönetici paneline erişmek için giriş yapın.</p>
                    
                    <div class="relative mb-6">
                        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <i class="fa-solid fa-lock text-slate-400"></i>
                        </div>
                        <input type="password" id="password" placeholder="Şifrenizi Girin" class="bg-slate-800/50 border border-slate-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 p-3 outline-none transition-all">
                    </div>
                    <button onclick="login()" class="w-full text-slate-900 bg-emerald-400 hover:bg-emerald-300 focus:ring-4 focus:outline-none focus:ring-emerald-300/50 font-bold rounded-lg text-lg px-5 py-3 text-center transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]">
                        Giriş Yap <i class="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                    <div id="loginStatus" class="mt-4 text-sm font-semibold h-4"></div>
                </div>

                <!-- Dashboard Screen -->
                <div id="panel" class="w-full max-w-6xl fade-in hidden">
                    <header class="flex justify-between items-center mb-8 glass rounded-2xl p-6">
                        <div class="flex items-center gap-4">
                            <div class="bg-emerald-400/20 p-3 rounded-xl border border-emerald-400/30">
                                <i class="fa-solid fa-terminal text-2xl text-emerald-400"></i>
                            </div>
                            <div>
                                <h1 class="text-3xl font-bold">Nexo<span class="text-emerald-400">BOT</span> Kontrol Merkezi</h1>
                                <p class="text-slate-400">Canlı Sistem Durumu</p>
                            </div>
                        </div>
                        <div>
                            <button onclick="logout()" class="text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-600">
                                <i class="fa-solid fa-right-from-bracket mr-2"></i> Çıkış Yap
                            </button>
                        </div>
                    </header>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <!-- Stat Card 1 -->
                        <div class="glass p-6 rounded-2xl border-l-4 border-l-blue-500">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-slate-400 text-sm uppercase font-semibold">Gecikme (Ping)</p>
                                    <h3 class="text-3xl font-bold mt-1" id="statPing">-- ms</h3>
                                </div>
                                <div class="p-3 bg-blue-500/20 rounded-lg text-blue-400"><i class="fa-solid fa-wifi text-xl"></i></div>
                            </div>
                        </div>
                        <!-- Stat Card 2 -->
                        <div class="glass p-6 rounded-2xl border-l-4 border-l-purple-500">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-slate-400 text-sm uppercase font-semibold">Sunucu Sayısı</p>
                                    <h3 class="text-3xl font-bold mt-1" id="statServers">--</h3>
                                </div>
                                <div class="p-3 bg-purple-500/20 rounded-lg text-purple-400"><i class="fa-solid fa-server text-xl"></i></div>
                            </div>
                        </div>
                        <!-- Stat Card 3 -->
                        <div class="glass p-6 rounded-2xl border-l-4 border-l-pink-500">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-slate-400 text-sm uppercase font-semibold">Kullanıcı Sayısı</p>
                                    <h3 class="text-3xl font-bold mt-1" id="statUsers">--</h3>
                                </div>
                                <div class="p-3 bg-pink-500/20 rounded-lg text-pink-400"><i class="fa-solid fa-users text-xl"></i></div>
                            </div>
                        </div>
                        <!-- Stat Card 4 -->
                        <div class="glass p-6 rounded-2xl border-l-4 border-l-amber-500">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-slate-400 text-sm uppercase font-semibold">Uptime (Çalışma)</p>
                                    <h3 class="text-2xl font-bold mt-1" id="statUptime">--:--:--</h3>
                                </div>
                                <div class="p-3 bg-amber-500/20 rounded-lg text-amber-400"><i class="fa-solid fa-clock text-xl"></i></div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Control Panel -->
                        <div class="glass p-8 rounded-2xl lg:col-span-2 relative overflow-hidden">
                            <div class="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                            
                            <h2 class="text-2xl font-bold mb-6 flex items-center"><i class="fa-solid fa-power-off mr-3 text-slate-400"></i> Güç Kontrolü</h2>
                            
                            <div class="flex flex-col sm:flex-row items-center justify-between bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                                <div class="flex items-center mb-4 sm:mb-0">
                                    <div id="statusDot" class="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981] mr-4 animate-pulse"></div>
                                    <div>
                                        <p class="text-slate-400 text-sm">Mevcut Durum</p>
                                        <p id="botState" class="text-2xl font-bold text-emerald-400 neon-text">SİSTEM ÇEVRİMİÇİ</p>
                                    </div>
                                </div>
                                
                                <button id="toggleBtn" onclick="toggleBot()" class="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all flex items-center">
                                    <i class="fa-solid fa-power-off mr-2"></i> Sistemi Durdur
                                </button>
                            </div>
                            <div id="actionStatus" class="mt-4 text-emerald-400 font-semibold h-4 text-center"></div>
                        </div>

                        <!-- System Info -->
                        <div class="glass p-8 rounded-2xl">
                            <h2 class="text-xl font-bold mb-6 border-b border-slate-700 pb-2"><i class="fa-solid fa-microchip mr-2 text-slate-400"></i> Sistem Bilgisi</h2>
                            <ul class="space-y-4">
                                <li class="flex justify-between items-center">
                                    <span class="text-slate-400"><i class="fa-brands fa-node-js mr-2"></i> Çevre:</span>
                                    <span class="font-semibold text-emerald-300">Node.js</span>
                                </li>
                                <li class="flex justify-between items-center">
                                    <span class="text-slate-400"><i class="fa-brands fa-discord mr-2"></i> Kütüphane:</span>
                                    <span class="font-semibold text-blue-300">Discord.js v14</span>
                                </li>
                                <li class="flex justify-between items-center">
                                    <span class="text-slate-400"><i class="fa-solid fa-code mr-2"></i> Dil:</span>
                                    <span class="font-semibold text-blue-400">TypeScript</span>
                                </li>
                                <li class="flex justify-between items-center mt-6 pt-6 border-t border-slate-700">
                                    <span class="text-slate-400"><i class="fa-solid fa-shield-halved mr-2"></i> Panel Versiyonu:</span>
                                    <span class="font-mono text-sm bg-slate-800 px-2 py-1 rounded">v2.0.0 PRO</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <script>
                    let token = localStorage.getItem('bot_token') || '';
                    let statsInterval;

                    async function login() {
                        const pass = document.getElementById('password').value;
                        const res = await fetch('/api/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: pass })
                        });
                        const data = await res.json();
                        if (data.success) {
                            token = data.token;
                            localStorage.setItem('bot_token', token);
                            showPanel();
                        } else {
                            const statusObj = document.getElementById('loginStatus');
                            statusObj.innerText = '❌ Hatalı Şifre!';
                            statusObj.className = 'mt-4 text-sm font-semibold h-4 text-red-500';
                        }
                    }

                    function logout() {
                        localStorage.removeItem('bot_token');
                        token = '';
                        clearInterval(statsInterval);
                        document.getElementById('loginBox').style.display = 'block';
                        document.getElementById('panel').style.display = 'none';
                        document.getElementById('password').value = '';
                    }

                    async function showPanel() {
                        document.getElementById('loginBox').style.display = 'none';
                        document.getElementById('panel').style.display = 'block';
                        await checkStatus();
                        fetchStats();
                        statsInterval = setInterval(fetchStats, 5000); // Fetch stats every 5 seconds
                    }

                    function formatUptime(ms) {
                        if (!ms) return '00:00:00';
                        let totalSeconds = (ms / 1000);
                        let days = Math.floor(totalSeconds / 86400);
                        let hours = Math.floor(totalSeconds / 3600) % 24;
                        let minutes = Math.floor(totalSeconds / 60) % 60;
                        let seconds = Math.floor(totalSeconds % 60);
                        
                        let result = '';
                        if(days > 0) result += days + 'g ';
                        result += [hours, minutes, seconds].map(v => v < 10 ? "0" + v : v).join(":");
                        return result;
                    }

                    async function fetchStats() {
                        if (document.getElementById('panel').style.display !== 'block') return;
                        
                        try {
                            const res = await fetch('/api/stats', { headers: { 'Authorization': token } });
                            if(res.status === 401) { logout(); return; }
                            const data = await res.json();
                            
                            document.getElementById('statPing').innerText = data.ping ? data.ping + ' ms' : '-- ms';
                            document.getElementById('statServers').innerText = data.servers || '0';
                            document.getElementById('statUsers').innerText = data.users || '0';
                            document.getElementById('statUptime').innerText = formatUptime(data.uptime);
                        } catch (e) {
                            console.error('Stats fetch error:', e);
                        }
                    }

                    async function checkStatus() {
                        const res = await fetch('/api/status', { headers: { 'Authorization': token } });
                        if(res.status === 401) { logout(); return; }
                        const data = await res.json();
                        updateUI(data.running);
                    }

                    async function toggleBot() {
                        const btn = document.getElementById('toggleBtn');
                        const originalHtml = btn.innerHTML;
                        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> İşleniyor...';
                        btn.disabled = true;

                        try {
                            const res = await fetch('/api/toggle', {
                                method: 'POST',
                                headers: { 'Authorization': token }
                            });
                            const data = await res.json();
                            if (data.success) {
                                updateUI(data.running);
                                const actionStat = document.getElementById('actionStatus');
                                actionStat.innerText = data.running ? 'Sistem başarıyla başlatıldı!' : 'Sistem güvenli bir şekilde kapatıldı!';
                                actionStat.className = data.running ? 'mt-4 font-semibold h-4 text-center text-emerald-400' : 'mt-4 font-semibold h-4 text-center text-amber-400';
                                setTimeout(() => { actionStat.innerText = ''; }, 4000);
                            }
                        } finally {
                            btn.disabled = false;
                        }
                    }

                    function updateUI(running) {
                        const stateText = document.getElementById('botState');
                        const toggleBtn = document.getElementById('toggleBtn');
                        const statusDot = document.getElementById('statusDot');
                        
                        if (running) {
                            stateText.innerText = 'SİSTEM ÇEVRİMİÇİ';
                            stateText.className = 'text-2xl font-bold text-emerald-400 neon-text';
                            statusDot.className = 'w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981] mr-4 animate-pulse';
                            
                            toggleBtn.innerHTML = '<i class="fa-solid fa-power-off mr-2"></i> Sistemi Durdur';
                            toggleBtn.className = 'bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all flex items-center';
                        } else {
                            stateText.innerText = 'SİSTEM ÇEVRİMDIŞI';
                            stateText.className = 'text-2xl font-bold text-red-500';
                            statusDot.className = 'w-4 h-4 rounded-full bg-red-500 mr-4';
                            
                            toggleBtn.innerHTML = '<i class="fa-solid fa-bolt mr-2"></i> Sistemi Başlat';
                            toggleBtn.className = 'bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold py-3 px-8 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all flex items-center';
                            
                            // Clear stats
                            document.getElementById('statPing').innerText = '-- ms';
                            document.getElementById('statUptime').innerText = 'KAPALI';
                        }
                    }

                    // Check token on load
                    if (token) {
                        showPanel();
                    } else {
                        document.getElementById('loginBox').style.display = 'block';
                    }

                    // Handle enter key on password
                    document.getElementById('password').addEventListener('keypress', function (e) {
                        if (e.key === 'Enter') {
                            login();
                        }
                    });
                </script>
            </body>
            </html>
        `);
    });

    app.post('/api/login', (req, res) => {
        if (req.body.password === PASSWORD) {
            const token = Math.random().toString(36).substring(2);
            sessions.add(token);
            res.json({ success: true, token });
        } else {
            res.status(401).json({ success: false });
        }
    });

    app.get('/api/status', (req, res) => {
        const token = req.headers.authorization;
        if (!token || !sessions.has(token)) return res.status(401).json({ error: 'Unauthorized' });
        res.json({ running: isBotRunning });
    });

    app.get('/api/stats', (req, res) => {
        const token = req.headers.authorization;
        if (!token || !sessions.has(token)) return res.status(401).json({ error: 'Unauthorized' });
        res.json(_statsFn());
    });

    app.post('/api/toggle', (req, res) => {
        const token = req.headers.authorization;
        if (!token || !sessions.has(token)) return res.status(401).json({ error: 'Unauthorized' });

        if (isBotRunning) {
            _stopBotFn();
            isBotRunning = false;
        } else {
            _startBotFn();
            isBotRunning = true;
        }

        res.json({ success: true, running: isBotRunning });
    });

    // Health check endpoint for keep-alive pings
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', uptime: process.uptime(), botRunning: isBotRunning });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`[DASHBOARD] Yönetim paneli http://localhost:${PORT} adresinde çalışıyor.`);
    });
}

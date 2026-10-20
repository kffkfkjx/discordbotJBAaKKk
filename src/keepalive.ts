import { config } from 'dotenv';

config();

const PORT = process.env.PORT || 3000;

export function startKeepAlive(): void {
    // Render provides RENDER_EXTERNAL_URL (e.g. https://my-bot.onrender.com)
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.EXTERNAL_URL;
    const targetUrl = externalUrl 
        ? `${externalUrl.replace(/\/$/, '')}/health` 
        : `http://localhost:${PORT}/health`;

    console.log(`[KEEPALIVE] Hedef ping adresi: ${targetUrl}`);

    const ping = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                console.log(`[KEEPALIVE] Ping başarılı (${res.status}) -> ${targetUrl}`);
            } else {
                console.warn(`[KEEPALIVE] Ping hata kodu: ${res.status}`);
            }
        } catch (error) {
            console.warn(`[KEEPALIVE] Ping başarısız:`, (error as Error).message);
        }
    };

    // Ping every 3 minutes to keep the process alive
    setInterval(ping, 3 * 60 * 1000);

    // Initial ping after 10 seconds
    setTimeout(ping, 10000);

    console.log('[KEEPALIVE] Keep-alive servisi başlatıldı (her 3 dakikada bir ping).');
}

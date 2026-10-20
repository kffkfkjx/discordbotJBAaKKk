import { config } from 'dotenv';

config();

const PORT = process.env.PORT || 3000;

export function startKeepAlive(): void {
    const url = `http://localhost:${PORT}/health`;

    const ping = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                console.log(`[KEEPALIVE] Ping successful (${res.status})`);
            } else {
                console.warn(`[KEEPALIVE] Ping returned ${res.status}`);
            }
        } catch (error) {
            console.warn(`[KEEPALIVE] Ping failed:`, (error as Error).message);
        }
    };

    // Ping every 3 minutes to keep the process alive
    setInterval(ping, 3 * 60 * 1000);

    // Initial ping after 10 seconds
    setTimeout(ping, 10000);

    console.log('[KEEPALIVE] Keep-alive service started (ping every 3 minutes).');
}

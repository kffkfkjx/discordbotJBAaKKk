import { config } from 'dotenv';

config();

export function startKeepAlive(): void {
    // Render dış URL sağlarsa dış URL'e ping atar (böylece Render uykuya dalmaz)
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.EXTERNAL_URL;

    if (!externalUrl) {
        console.log('[KEEPALIVE] RENDER_EXTERNAL_URL tanımlı değil; yerel ping pasif bırakıldı (dışarıdan uptime robot veya Render Web URL ile tetiklenebilir).');
        return;
    }

    const targetUrl = `${externalUrl.replace(/\/$/, '')}/health`;
    console.log(`[KEEPALIVE] Hedef ping adresi: ${targetUrl}`);

    const ping = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(targetUrl, { 
                signal: controller.signal,
                headers: { 'User-Agent': 'NexoBot-KeepAlive/1.0' }
            });
            clearTimeout(timeout);
            if (res.ok) {
                console.log(`[KEEPALIVE] Ping başarılı (${res.status}) -> ${targetUrl}`);
            } else {
                console.warn(`[KEEPALIVE] Ping yanıt kodu: ${res.status}`);
            }
        } catch (error: any) {
            // Sessizce yakala, geçici ağ dalgalanmalarında bot çökmesin
            console.warn(`[KEEPALIVE] Ping geçici olarak ulaşılamadı: ${error?.message || error}`);
        }
    };

    // Bot ve Render build işlemi tamamen tamamlandıktan sonra (1 dakika sonra) ilk pingi at
    setTimeout(() => {
        ping();
        // Render 15 dakikada uykuya dalar; her 5 dakikada bir ping atmak idealdir.
        setInterval(ping, 5 * 60 * 1000);
    }, 60000);

    console.log('[KEEPALIVE] Keep-alive servisi optimize edildi (build sonrası ilk ping 60sn, periyot 5dk).');
}

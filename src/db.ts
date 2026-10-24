import * as fs from 'fs';
import * as path from 'path';

/**
 * Merkezi JSON veritabanı.
 * Dosya her zaman proje kökündeki db.json'dur (ts-node ile de, derlenmiş dist ile de aynı dosya).
 * İstenirse DB_PATH ortam değişkeniyle değiştirilebilir (örn. Render Persistent Disk: /var/data/db.json).
 */
export interface Database {
    welcomeChannel?: string | null;
    autoBanChannel?: string | null;
    swearFilterDisabledChannels?: string[];
    [key: string]: any;
}

export const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'db.json');

let cache: Database | null = null;

function load(): Database {
    if (cache) return cache;
    try {
        if (fs.existsSync(DB_PATH)) {
            cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as Database;
        }
    } catch (error) {
        console.error(`[DB] ${DB_PATH} okunamadı, boş veritabanı kullanılıyor:`, error);
    }
    if (!cache || typeof cache !== 'object') cache = {};
    return cache;
}

/** Veritabanının güncel halini döndürür (bellekten, disk okuması yapmaz). */
export function readDb(): Database {
    return load();
}

/** Veritabanını günceller ve diske atomik olarak yazar. */
export function updateDb(mutator: (db: Database) => void): Database {
    const db = load();
    mutator(db);
    try {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        const tmp = `${DB_PATH}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
        fs.renameSync(tmp, DB_PATH); // Yarım yazılmış/bozuk dosya oluşmasını engeller
    } catch (error) {
        console.error(`[DB] ${DB_PATH} yazılamadı:`, error);
    }
    return db;
}

/** Belirtilen kanalda küfür filtresi kapalı mı? */
export function isSwearFilterDisabled(channelId: string): boolean {
    return (load().swearFilterDisabledChannels ?? []).includes(channelId);
}

import { Events, Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { codeBlock, getSendableChannel } from '../utils';

const DEFAULT_AUTOBAN_CHANNEL = '1544500653571702864';
const DB_PATH = path.join(__dirname, '..', 'db.json');
const DB_CACHE_MS = 5000;

let cachedAutoBanChannel = DEFAULT_AUTOBAN_CHANNEL;
let lastDbRead = 0;

/** db.json'u her mesajda okumak yerine 5 saniyelik önbellekle okur. */
function getAutoBanChannel(): string {
    const now = Date.now();
    if (now - lastDbRead < DB_CACHE_MS) return cachedAutoBanChannel;
    lastDbRead = now;
    try {
        if (fs.existsSync(DB_PATH)) {
            const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            cachedAutoBanChannel = db.autoBanChannel || DEFAULT_AUTOBAN_CHANNEL;
        }
    } catch {
        // Bozuk JSON - son bilinen değeri kullan
    }
    return cachedAutoBanChannel;
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// JS'teki \b Türkçe karakterleri (ç, ş, ğ, ö, ü, ı) harf saymaz; bu yüzden "oç", "göt" gibi
// kelimeler yakalanmıyordu. Unicode harf sınırı kullanan regex'ler bir kez derlenir.
const SWEAR_REGEXES = CONFIG.AUTOMOD.SWEAR_WORDS.map(
    word => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(word.toLocaleLowerCase('tr-TR'))}(?![\\p{L}\\p{N}])`, 'iu')
);

module.exports = {
    name: Events.MessageCreate,
    async execute(message: Message, client: any) {
        // Bot mesajlarını ve DM'leri yoksay
        if (message.author.bot || !message.guild) return;

        // Yöneticileri ve yetkilileri yoksay (Adminler reklam/link atabilir)
        if (message.member?.permissions.has(PermissionFlagsBits.Administrator) || message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return;
        }

        
        // --- OTOMATİK BAN SİSTEMİ ---
        const autoBanChannel = getAutoBanChannel();

        if (message.channel.id === autoBanChannel) {
            try {
                await message.delete().catch(() => null);
                await message.member?.ban({ reason: 'Otomatik Ban Kanalına mesaj gönderdi.' });
                
                const logChannel = getSendableChannel(message.client, CONFIG.CHANNELS.LOG_CHANNEL);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🚫 Otomatik Ban (Yasaklı Kanal)')
                        .setColor('#8B0000') // Koyu Kırmızı
                        .addFields(
                            { name: 'Banlanan Kullanıcı', value: `${message.author} (${message.author.id})`, inline: true },
                            { name: 'Kanal', value: `<#${autoBanChannel}>`, inline: true },
                            { name: 'Sebep', value: 'Yasaklı (otomatik ban) kanalına mesaj gönderdi.', inline: false },
                            { name: 'Mesaj İçeriği', value: codeBlock(message.content), inline: false }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] }).catch(() => null);
                }
            } catch (err) {
                console.error('[ERROR] Auto-ban system failed:', err);
            }
            return; // Banlandıktan sonra automod'un çalışmasına gerek yok
        }

        
        // Ticket kanallarını es geç (Özel destek talebi odalarında küfür/reklam koruması kapatıldı)
        const channelName = (message.channel as any).name || '';
        if (channelName.startsWith('genel-sorular-') || 
            channelName.startsWith('teknik-destek-') || 
            channelName.startsWith('satin-alim-') || 
            channelName.startsWith('destek-')) {
            return;
        }

// 1. "Özellikle bu kanallarda" denilen kuralı veya tüm sunucu kuralını işletelim.
        // İstenirse SADECE belirlenen kanallarda çalışması için alttaki satırın yorumunu kaldırabilirsiniz:
        // if (!CONFIG.AUTOMOD.PROTECTED_CHANNELS.includes(message.channel.id)) return;

        // Türkçe büyük "İ" toLowerCase ile "i̇" (noktalı birleşik) olur; önce düz "i"ye çevrilir
        const content = message.content.replace(/İ/g, 'i').toLowerCase();
        let isViolation = false;
        let violationType = '';

        // 2. Küfür Kontrolü
        for (const regex of SWEAR_REGEXES) {
            // Kelimenin tam eşleşmesini bul (Örn: "amk" -> "amk", ama "pamuk" geçsin)
            if (regex.test(content)) {
                isViolation = true;
                violationType = 'Küfür / Kötü Söz';
                break;
            }
        }

        // 3. Reklam/Link Kontrolü (Küfür yoksa reklama bak)
        if (!isViolation) {
            // E-posta adreslerini mesajdan geçici olarak sil (davet olarak algılamasın)
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
            const contentWithoutEmails = content.replace(emailRegex, '');
            
            for (const pattern of CONFIG.AUTOMOD.AD_PATTERNS) {
                if (contentWithoutEmails.includes(pattern)) {
                    isViolation = true;
                    violationType = 'Reklam / İzinsiz Bağlantı';
                    break;
                }
            }
        }

        // 4. İhlal Varsa Mesajı Sil, Kullanıcıyı Uyar ve Logla
        if (isViolation) {
            try {
                // Mesajı sil
                await message.delete();

                // Kullanıcıya kanaldan (veya DM'den) geçici bir uyarı at
                const channel = message.channel as any;
                const warningMsg = await channel.send({
                    content: `⚠️ ${message.author}, bu kanalda **${violationType}** yasaktır! Lütfen kurallara uyun.`
                });
                
                // Uyarıyı 5 saniye sonra sil ki kanal kirlenmesin
                setTimeout(() => warningMsg.delete().catch(() => null), 5000);

                // Log kanalına detaylı rapor yolla
                const logChannel = getSendableChannel(message.client, CONFIG.CHANNELS.LOG_CHANNEL);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🚨 Otomatik Moderasyon (Auto-Mod)')
                        .setColor('#ff0000') // Kırmızı renk
                        .setThumbnail(message.author.displayAvatarURL())
                        .addFields(
                            { name: 'Kullanıcı', value: `${message.author} (${message.author.id})`, inline: true },
                            { name: 'Kanal', value: `${message.channel}`, inline: true },
                            { name: 'İhlal Türü', value: violationType, inline: false },
                            { name: 'Silinen Mesaj İçeriği', value: codeBlock(message.content), inline: false }
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
                }

            } catch (error) {
                console.error('[ERROR] Auto-mod mesaj silme/loglama hatası:', error);
            }
        }
    }
};

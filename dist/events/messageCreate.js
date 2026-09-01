"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    name: discord_js_1.Events.MessageCreate,
    async execute(message, client) {
        // Bot mesajlarını ve DM'leri yoksay
        if (message.author.bot || !message.guild)
            return;
        // Yöneticileri ve yetkilileri yoksay (Adminler reklam/link atabilir)
        if (message.member?.permissions.has(discord_js_1.PermissionFlagsBits.Administrator) || message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages)) {
            return;
        }
        // 1. "Özellikle bu kanallarda" denilen kuralı veya tüm sunucu kuralını işletelim.
        // İstenirse SADECE belirlenen kanallarda çalışması için alttaki satırın yorumunu kaldırabilirsiniz:
        // if (!CONFIG.AUTOMOD.PROTECTED_CHANNELS.includes(message.channel.id)) return;
        const content = message.content.toLowerCase();
        let isViolation = false;
        let violationType = '';
        // 2. Küfür Kontrolü
        for (const word of config_1.CONFIG.AUTOMOD.SWEAR_WORDS) {
            // Kelimenin tam eşleşmesini bul (Örn: "amk" -> "amk", ama "pamuk" geçsin)
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(content)) {
                isViolation = true;
                violationType = 'Küfür / Kötü Söz';
                break;
            }
        }
        // 3. Reklam/Link Kontrolü (Küfür yoksa reklama bak)
        if (!isViolation) {
            for (const pattern of config_1.CONFIG.AUTOMOD.AD_PATTERNS) {
                if (content.includes(pattern)) {
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
                const channel = message.channel;
                const warningMsg = await channel.send({
                    content: `⚠️ ${message.author}, bu kanalda **${violationType}** yasaktır! Lütfen kurallara uyun.`
                });
                // Uyarıyı 5 saniye sonra sil ki kanal kirlenmesin
                setTimeout(() => warningMsg.delete().catch(() => null), 5000);
                // Log kanalına detaylı rapor yolla
                const logChannel = message.client.channels.cache.get(config_1.CONFIG.CHANNELS.LOG_CHANNEL);
                if (logChannel) {
                    const logEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle('🚨 Otomatik Moderasyon (Auto-Mod)')
                        .setColor('#ff0000') // Kırmızı renk
                        .setThumbnail(message.author.displayAvatarURL())
                        .addFields({ name: 'Kullanıcı', value: `${message.author} (${message.author.id})`, inline: true }, { name: 'Kanal', value: `${message.channel}`, inline: true }, { name: 'İhlal Türü', value: violationType, inline: false }, { name: 'Silinen Mesaj İçeriği', value: `\`\`\`\n${message.content.substring(0, 1000)}\n\`\`\``, inline: false })
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            catch (error) {
                console.error('[ERROR] Auto-mod mesaj silme/loglama hatası:', error);
            }
        }
    }
};

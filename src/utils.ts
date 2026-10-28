import { Client, Interaction, MessageFlags, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder, User, GuildMember } from 'discord.js';
import { CONFIG } from './config';

/**
 * Metni belirtilen uzunlukta keser (Discord embed alan limiti 1024 karakterdir).
 */
export function truncate(text: string | null | undefined, max = 1000): string {
    if (!text) return '';
    return text.length > max ? `${text.substring(0, max - 3)}...` : text;
}

/**
 * İçeriği güvenli bir kod bloğuna sarar. İçerik boşsa fallback döner.
 * İçerideki ``` karakterleri bloğu bozmasın diye kaçışlanır.
 */
export function codeBlock(content: string | null | undefined, fallback = '*İçerik yok veya okunamadı*', max = 1000): string {
    if (!content || content.trim().length === 0) return fallback;
    const safe = truncate(content, max).replace(/```/g, '`\u200b``');
    return `\`\`\`\n${safe}\n\`\`\``;
}

/**
 * ID ile mesaj gönderilebilir bir kanal döndürür (önbellekten senkron).
 */
export function getSendableChannel(client: Client, channelId: string): any | null {
    if (!channelId) return null;
    const channel = client.channels.cache.get(channelId) as any;
    if (!channel || typeof channel.send !== 'function') return null;
    return channel;
}

/**
 * ID ile mesaj gönderilebilir bir kanal döndürür (önce cache, yoksa fetch ile asenkron).
 */
export async function fetchSendableChannel(client: Client, channelId: string): Promise<any | null> {
    if (!channelId) return null;
    let channel = client.channels.cache.get(channelId) as any;
    if (!channel) {
        channel = await client.channels.fetch(channelId).catch(() => null);
    }
    if (!channel || typeof channel.send !== 'function') return null;
    return channel;
}

/**
 * Etkileşime durumuna göre (reply / followUp) güvenli şekilde ephemeral yanıt verir.
 */
export async function safeReply(interaction: Interaction, content: string): Promise<void> {
    if (!interaction.isRepliable()) return;
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
    } catch {
        // Etkileşim süresi dolmuş olabilir - sessizce yoksay
    }
}

/**
 * Kullanıcı sunucuda yetkili mi? (Yönetici izni, Kanalları Yönet, Kurucu veya Ortak Kurucu rolü)
 */
export function isStaffMember(member: any): boolean {
    if (!member) return false;
    
    // Discord Administrator veya ManageChannels yetkisi
    if (member.permissions?.has?.(PermissionFlagsBits.Administrator) || 
        member.permissions?.has?.(PermissionFlagsBits.ManageChannels)) {
        return true;
    }

    // Rol kontrolleri: FOUNDER veya CO_FOUNDER
    if (member.roles?.cache) {
        if (member.roles.cache.has(CONFIG.ROLES.FOUNDER) || 
            member.roles.cache.has(CONFIG.ROLES.CO_FOUNDER)) {
            return true;
        }
    }

    return false;
}

/**
 * Kullanıcı bu ticket'ı kapatmaya yetkili mi? (Yetkili veya bileti açan kişi)
 */
export function canCloseTicket(channel: any, user: User, member: any): boolean {
    // 1. Yönetici veya yetkili ise kapatabilir
    if (isStaffMember(member)) return true;

    // 2. Ticket konusu içinde kullanıcının ID'si kayıtlı mı?
    if (channel.topic && channel.topic.includes(user.id)) return true;

    // 3. Kanal izinlerinde bu kullanıcıya özel izin verilmiş mi?
    if (channel.permissionOverwrites?.cache?.has(user.id)) {
        const overwrite = channel.permissionOverwrites.cache.get(user.id);
        if (overwrite?.allow?.has(PermissionFlagsBits.ViewChannel)) return true;
    }

    // 4. Kanal adında kullanıcının adı geçiyor mu?
    const sanitizedUsername = user.username.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const chName = (channel.name || '').toLowerCase();
    if (sanitizedUsername && chName.endsWith(sanitizedUsername)) return true;

    return false;
}

/**
 * Bir kanalın ticket kanalı olup olmadığını kontrol eder.
 */
export function isTicketChannel(channel: any): boolean {
    const chName = (channel?.name || '').toLowerCase();
    if (chName.startsWith('genel-sorular-') || 
        chName.startsWith('teknik-destek-') || 
        chName.startsWith('satin-alim-') || 
        chName.startsWith('destek-') ||
        chName.startsWith('ticket-')) {
        return true;
    }
    if (channel?.topic && channel.topic.includes('ticket-owner:')) {
        return true;
    }
    return false;
}

/**
 * Ortak ve hatasız Ticket Kapatma ve Arşivleme Fonksiyonu
 */
export async function handleCloseTicket(interaction: any): Promise<void> {
    const channel = interaction.channel;
    if (!channel || channel.isDMBased()) {
        await safeReply(interaction, '❌ Bu komut sadece sunucu kanallarında kullanılabilir.');
        return;
    }

    if (!isTicketChannel(channel)) {
        await safeReply(interaction, '❌ Bu işlem sadece destek talebi (ticket) kanallarında kullanılabilir!');
        return;
    }

    const member = interaction.member;
    const user = interaction.user;

    // Yetki kontrolü (Yetkili VEYA bileti açan kişi kapatabilir)
    if (!canCloseTicket(channel, user, member)) {
        await safeReply(interaction, '❌ Bu bileti sadece **bileti açan kişi** veya **yöneticiler** kapatabilir!');
        return;
    }

    // Yanıt ver
    if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '🔒 Ticket kapatılıyor... Arşiv (log) hazırlanıyor.' });
    } else {
        await interaction.followUp({ content: '🔒 Ticket kapatılıyor... Arşiv (log) hazırlanıyor.' });
    }

    // 1. Kanal mesajlarını çek
    let msgsArray: any[] = [];
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        msgsArray = Array.from(messages.values()).reverse();
    } catch (fetchErr) {
        console.error('[TICKET] Mesaj geçmişi alınamadı:', fetchErr);
    }

    // 2. Transkript oluştur
    let transcript = `========================================================\n`;
    transcript += `               NEXOGAMEST TICKET ARŞİVİ\n`;
    transcript += `========================================================\n`;
    transcript += `Kanal Adı     : #${channel.name}\n`;
    transcript += `Kapatan Kişi  : ${user.tag} (${user.id})\n`;
    transcript += `Kapanış Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
    transcript += `Toplam Mesaj  : ${msgsArray.length}\n`;
    transcript += `========================================================\n\n`;

    for (const m of msgsArray) {
        const date = new Date(m.createdTimestamp).toLocaleString('tr-TR');
        const author = m.author ? `${m.author.tag} (${m.author.id})` : 'Bilinmeyen Kullanıcı';
        const text = m.content ? m.content : '(Metin içeriği yok)';
        transcript += `[${date}] ${author}:\n${text}\n`;
        if (m.attachments && m.attachments.size > 0) {
            const atts = Array.from(m.attachments.values()).map((a: any) => a.url).join(' , ');
            transcript += `[Ekler]: ${atts}\n`;
        }
        transcript += `\n`;
    }

    // 3. Arşiv kanalına gönder
    try {
        const transcriptAttachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { 
            name: `${channel.name}-arsiv.txt` 
        });

        // TICKET_LOG_CHANNEL öncelikli, yoksa LOG_CHANNEL (fetch ile garanti edilir)
        let logChannel = await fetchSendableChannel(interaction.client, CONFIG.CHANNELS.TICKET_LOG_CHANNEL);
        if (!logChannel) {
            logChannel = await fetchSendableChannel(interaction.client, CONFIG.CHANNELS.LOG_CHANNEL);
        }

        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🎫 Destek Talebi Kapatıldı & Arşivlendi')
                .setColor('#E74C3C')
                .addFields(
                    { name: 'Kanal', value: `\`${channel.name}\``, inline: true },
                    { name: 'Kapatan', value: `<@${user.id}> (\`${user.id}\`)`, inline: true },
                    { name: 'Mesaj Sayısı', value: `${msgsArray.length} adet mesaj`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed], files: [transcriptAttachment] }).catch((e: any) => {
                console.error('[TICKET LOG] Arşiv kanalına dosya gönderilemedi:', e);
            });
            console.log(`[TICKET] ${channel.name} başarıyla arşivlendi.`);
        } else {
            console.warn('[TICKET LOG] Arşiv kanalı bulunamadı! ID:', CONFIG.CHANNELS.TICKET_LOG_CHANNEL);
        }
    } catch (archiveErr) {
        console.error('[TICKET] Arşivleme işlemi sırasında hata:', archiveErr);
    }

    // 4. Geri sayım ve kanalı silme
    try {
        await channel.send({ content: '🗑️ Ticket arşivlendi! Kanal **3 saniye** içinde kalıcı olarak siliniyor...' }).catch(() => null);
    } catch {}

    setTimeout(async () => {
        try {
            // En güncel kanal referansını al ve sil
            const ch = await interaction.guild?.channels.fetch(channel.id).catch(() => null);
            if (ch) {
                await ch.delete(`Ticket kapatıldı: ${user.tag}`);
                console.log(`[TICKET] Kanal silindi: #${channel.name}`);
            } else if (typeof channel.delete === 'function') {
                await channel.delete(`Ticket kapatıldı: ${user.tag}`);
            }
        } catch (delErr: any) {
            console.error('[ERROR] Ticket kanalı silinemedi:', delErr);
            await channel.send({
                content: `⚠️ **Kanal Silinemedi!** Botun sunucuda "Kanalları Yönet" (Manage Channels) yetkisi olduğundan emin olun.\nHata: \`${delErr?.message || delErr}\``
            }).catch(() => null);
        }
    }, 3000);
}

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

// Global lock to prevent race conditions when closing tickets
export const ticketClosingLocks = new Set<string>();

// Kullanıcıların aktif açık ticket kanallarını hafızada tutan harita (userId -> channelId)
export const userActiveTicketMap = new Map<string, string>();

/**
 * Kullanıcı sunucuda yetkili mi? (Yönetici izni, Kanalları Yönet, Kurucu, Ortak Kurucu veya Yetkili rolü)
 */
export function isStaffMember(member: any): boolean {
    if (!member) return false;
    
    // 1. PermissionsBitField veya raw permissions kontrolü
    try {
        if (typeof member.permissions?.has === 'function') {
            if (member.permissions.has(PermissionFlagsBits.Administrator) || 
                member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return true;
            }
        } else if (member.permissions) {
            const perms = BigInt(member.permissions);
            const adminBit = BigInt(PermissionFlagsBits.Administrator);
            const manageChannelsBit = BigInt(PermissionFlagsBits.ManageChannels);
            if ((perms & adminBit) === adminBit || (perms & manageChannelsBit) === manageChannelsBit) {
                return true;
            }
        }
    } catch {}

    // 2. Rol kontrolleri: FOUNDER, CO_FOUNDER veya YETKILI
    const staffRoleIds = [CONFIG.ROLES.FOUNDER, CONFIG.ROLES.CO_FOUNDER, CONFIG.ROLES.YETKILI].filter(Boolean);

    // GuildMember (roles.cache)
    if (member.roles?.cache) {
        for (const roleId of staffRoleIds) {
            if (member.roles.cache.has(roleId)) return true;
        }
    }

    // APIGuildMember (roles: string[])
    if (Array.isArray(member.roles)) {
        for (const roleId of staffRoleIds) {
            if (member.roles.includes(roleId)) return true;
        }
    }

    return false;
}

/**
 * Kullanıcı bu ticket'ı kapatmaya yetkili mi? (SADECE Yetkililer / Yöneticiler kapatabilir!)
 * Normal member üyeler ticket KAPATAMAZ.
 */
export function canCloseTicket(channel: any, user: User | any, member: any): boolean {
    if (!channel || !member) return false;
    return isStaffMember(member);
}

/**
 * Bir kanalın ticket kanalı olup olmadığını kontrol eder.
 */
export function isTicketChannel(channel: any): boolean {
    if (!channel) return false;
    const chName = (channel?.name || '').toLowerCase();
    if (chName.startsWith('genel-sorular-') || 
        chName.startsWith('teknik-destek-') || 
        chName.startsWith('satin-alim-') || 
        chName.startsWith('destek-') ||
        chName.startsWith('ticket-')) {
        return true;
    }
    if (channel?.topic && typeof channel.topic === 'string' && channel.topic.includes('ticket-owner:')) {
        return true;
    }
    return false;
}

/**
 * Kullanıcının sunucuda herhangi bir kategoride açık bir destek talebi var mı kontrol eder.
 * (Kategori fark etmeksizin aynı anda en fazla 1 adet açık ticket kuralı)
 */
export async function getUserActiveTicket(guild: any, userId: string, username: string): Promise<any | null> {
    if (!guild || !userId) return null;

    // 1. Önce hafıza haritasına bak
    const activeChId = userActiveTicketMap.get(userId);
    if (activeChId) {
        try {
            const ch = guild.channels.cache.get(activeChId) || await guild.channels.fetch(activeChId).catch(() => null);
            if (ch && !ch.deleted) {
                return ch;
            } else {
                userActiveTicketMap.delete(userId);
            }
        } catch {
            userActiveTicketMap.delete(userId);
        }
    }

    // 2. Sunucudaki tüm kanalları API'den taze olarak çek
    let allChannels: any;
    try {
        allChannels = await guild.channels.fetch();
    } catch {
        allChannels = guild.channels.cache;
    }

    if (!allChannels || allChannels.size === 0) {
        allChannels = guild.channels.cache;
    }

    const safeUsername = (username || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const [, c] of allChannels) {
        if (!c || c.type !== 0) continue; // Sadece text kanalları

        const chName = (c.name || '').toLowerCase();
        const topic = (c.topic || '').toLowerCase();

        // A) Konu kontrolü: "ticket-owner:USER_ID" veya direkt "USER_ID"
        if (topic.includes(userId)) {
            userActiveTicketMap.set(userId, c.id);
            return c;
        }

        // B) Kanal adı kontrolü
        const isTicketPrefix = chName.startsWith('genel-sorular-') || 
                               chName.startsWith('teknik-destek-') || 
                               chName.startsWith('satin-alim-') || 
                               chName.startsWith('destek-') || 
                               chName.startsWith('ticket-');

        if (isTicketPrefix) {
            // İsimde kullanıcı ID'si geçiyor mu?
            if (chName.includes(userId)) {
                userActiveTicketMap.set(userId, c.id);
                return c;
            }
            // İsimde kullanıcı adı geçiyor mu?
            if (safeUsername && safeUsername.length >= 2 && chName.includes(safeUsername)) {
                userActiveTicketMap.set(userId, c.id);
                return c;
            }
        }

        // C) Kanal izinleri kontrolü: Bu kullanıcıya özel ViewChannel verilmiş mi?
        try {
            const overwrite = c.permissionOverwrites?.cache?.get(userId);
            if (overwrite && overwrite.allow?.has(PermissionFlagsBits.ViewChannel)) {
                if (isTicketPrefix || topic.includes('ticket')) {
                    userActiveTicketMap.set(userId, c.id);
                    return c;
                }
            }
        } catch {}
    }

    return null;
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

    const channelId = channel.id;

    // Kilit kontrolü: Zaten kapanmakta olan bir kanala mükerrer işlem yapılmasını engelle
    if (ticketClosingLocks.has(channelId)) {
        await safeReply(interaction, '⏳ Bu ticket zaten kapatılıyor, lütfen bekleyin...');
        return;
    }
    ticketClosingLocks.add(channelId);

    try {
        if (!isTicketChannel(channel)) {
            ticketClosingLocks.delete(channelId);
            await safeReply(interaction, '❌ Bu işlem sadece destek talebi (ticket) kanallarında kullanılabilir!');
            return;
        }

        const member = interaction.member;
        const user = interaction.user;

        // Yetki kontrolü (SADECE YETKİLİLER kapatabilir)
        if (!canCloseTicket(channel, user, member)) {
            ticketClosingLocks.delete(channelId);
            await safeReply(interaction, '❌ Bu destek talebini sadece **yetkililer** kapatabilir!');
            return;
        }

        // 1. Yetkiliye hemen bildirim ver
        await safeReply(interaction, '🔒 **Ticket kapatılıyor...** Kanal kilitlendi ve arşiv hazırlanıyor.');

        // 2. Butonları hemen kaldır (Başka kimsenin basamaması için)
        try {
            if (interaction.message && typeof interaction.message.edit === 'function') {
                await interaction.message.edit({ components: [] }).catch(() => null);
            }
        } catch {}

        // 3. Kanalı anında kilitle: Normal üyelerin mesaj yazmasını engelle
        try {
            if (interaction.guild && channel.permissionOverwrites) {
                await channel.permissionOverwrites.edit(interaction.guild.id, {
                    SendMessages: false,
                    ViewChannel: false
                }).catch(() => null);

                // Varsa ticket açan kullanıcının da mesaj atmasını engelle
                if (channel.topic && typeof channel.topic === 'string') {
                    const match = channel.topic.match(/ticket-owner:(\d+)/);
                    if (match && match[1]) {
                        userActiveTicketMap.delete(match[1]);
                        await channel.permissionOverwrites.edit(match[1], {
                            SendMessages: false
                        }).catch(() => null);
                    }
                }
            }
        } catch {}

        // Kanala yetkili tarafından kilitlendiği bilgisini gönder
        await channel.send({
            content: `🔒 **Destek talebi ${user} tarafından sonlandırıldı.** Kanal kilitlendi, transkript oluşturuluyor...`
        }).catch(() => null);


        // 4. Kanal mesajlarını çek (Transkript için)
        let msgsArray: any[] = [];
        try {
            const messages = await channel.messages.fetch({ limit: 100 });
            msgsArray = Array.from(messages.values()).reverse();
        } catch (fetchErr) {
            console.error('[TICKET] Mesaj geçmişi alınamadı:', fetchErr);
        }

        // 5. Transkript oluştur
        let transcript = `========================================================\n`;
        transcript += `               NEXOGAME TICKET ARŞİVİ\n`;
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

        // 6. Arşiv kanalına gönder
        try {
            const transcriptAttachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { 
                name: `${channel.name}-arsiv.txt` 
            });

            // Ticket arşivleri SADECE TICKET_LOG_CHANNEL (1469781526387360038) kanalına gider
            const logChannel = await fetchSendableChannel(interaction.client, CONFIG.CHANNELS.TICKET_LOG_CHANNEL);

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🎫 Destek Talebi Kapatıldı & Arşivlendi')
                    .setColor('#E74C3C')
                    .addFields(
                        { name: 'Kanal', value: `\`#${channel.name}\``, inline: true },
                        { name: 'Kapatan', value: `<@${user.id}> (\`${user.id}\`)`, inline: true },
                        { name: 'Mesaj Sayısı', value: `${msgsArray.length} adet mesaj`, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed], files: [transcriptAttachment] }).catch((e: any) => {
                    console.error('[TICKET LOG] Arşiv kanalına dosya gönderilemedi:', e);
                });
                console.log(`[TICKET] #${channel.name} başarıyla arşivlendi.`);
            } else {
                console.warn('[TICKET LOG] Arşiv kanalı bulunamadı! ID:', CONFIG.CHANNELS.TICKET_LOG_CHANNEL);
            }
        } catch (archiveErr) {
            console.error('[TICKET] Arşivleme işlemi sırasında hata:', archiveErr);
        }

        // 7. Geri sayım bildirimi
        try {
            await channel.send({ content: '🗑️ Ticket arşivlendi! Kanal **3 saniye** içinde kalıcı olarak siliniyor...' }).catch(() => null);
        } catch {}

        // 3 saniye bekle
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 8. Kanalı sil
        try {
            let chToDelete = channel;
            if (interaction.guild) {
                chToDelete = await interaction.guild.channels.fetch(channelId).catch(() => channel);
            }
            if (chToDelete && typeof chToDelete.delete === 'function') {
                await chToDelete.delete(`Ticket kapatıldı: ${user.tag} (${user.id})`);
                console.log(`[TICKET] Kanal silindi: #${channel.name}`);
            }
        } catch (delErr: any) {
            console.error('[ERROR] Ticket kanalı silinemedi:', delErr);
            await channel.send({
                content: `⚠️ **Kanal Silinemedi!** Botun sunucuda "Kanalları Yönet" (Manage Channels) yetkisi olduğundan emin olun.\nHata: \`${delErr?.message || delErr}\``
            }).catch(() => null);
        }
    } finally {
        ticketClosingLocks.delete(channelId);
    }
}

import { Events, GuildMember, AttachmentBuilder, TextChannel } from 'discord.js';
import { readDb } from '../db';
const Jimp = require('jimp');

let cachedBackground: any = null;
let cachedFontTitle: any = null;
let cachedFontSub: any = null;

// Mükerrer çıkış loglarını engelleyen önbellek
const processedLeaves = new Map<string, number>();

setInterval(() => {
    const now = Date.now();
    for (const [key, time] of processedLeaves) {
        if (now - time > 60000) processedLeaves.delete(key);
    }
}, 5 * 60 * 1000);

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member: GuildMember, client: any) {
        if (member.user.bot) return;

        // 1. Process içi mükerrer çıkış engeli
        const now = Date.now();
        const lastLeave = processedLeaves.get(member.id);
        if (lastLeave && (now - lastLeave < 30000)) {
            return;
        }
        processedLeaves.set(member.id, now);

        const db = readDb();
        if (!db.welcomeChannel) return;

        const channel = member.guild.channels.cache.get(db.welcomeChannel) as TextChannel;
        if (!channel) return;

        // 2. Çift bot / çift instance engeli: Son 5 mesajda bu üyeye çıkış mesajı atılmış mı
        try {
            const recent = await channel.messages.fetch({ limit: 5 }).catch(() => null);
            if (recent) {
                const alreadySent = recent.some((m: any) => 
                    m.content?.includes(member.user.tag) && (now - m.createdTimestamp < 20000)
                );
                if (alreadySent) return;
            }
        } catch {}

        try {
            if (!cachedBackground) {
                const bgUrl = 'https://cdn.photoroom.com/v2/image-cache?path=gs://background-7ef44.appspot.com/backgrounds_v3/black/47_-_black.jpg';
                cachedBackground = await Jimp.read(bgUrl);
                cachedBackground.cover(1024, 450);
                cachedBackground.color([{ apply: 'darken', params: [50] }]); // Çıkış için biraz daha karanlık
            }
            if (!cachedFontTitle) {
                cachedFontTitle = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
            }
            if (!cachedFontSub) {
                cachedFontSub = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
            }

            const background = cachedBackground.clone();

            // Draw Avatar
            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await Jimp.read(avatarUrl);

            const avatarSize = 220;
            avatar.resize(avatarSize, avatarSize).circle();
            
            // Siyah beyaz yapıp (çıkış efekti) 
            avatar.greyscale();

            const avatarX = (background.bitmap.width / 2) - (avatarSize / 2);
            const avatarY = 40;

            background.composite(avatar, avatarX, avatarY);

            // Draw Texts
            const leaveText = 'ARAMIZDAN AYRILDI';
            const userName = member.user.tag;
            
            background.print(cachedFontTitle, 0, 280, {
                text: leaveText,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, background.bitmap.width);

            background.print(cachedFontSub, 0, 360, {
                text: userName,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, background.bitmap.width);

            const buffer = await background.getBufferAsync(Jimp.MIME_PNG);
            const attachment = new AttachmentBuilder(buffer, { name: 'goodbye-image.png' });
            
            const messageContent = `🌑 **Bir Yıldız Kaydı...**\n\n**${member.user.tag}** kütüphanesini topladı ve aramızdan ayrıldı. 🍂\nGidişiyle **${member.guild.memberCount}** kişi kaldık. Yolun açık olsun!`;

            await channel.send({ content: messageContent, files: [attachment] });
        } catch (error) {
            console.error('[GIRISCikis] Cikis resmi olusturulurken hata:', error);
            // Resim oluşturulamadıysa çıkış bildirimi yine de yazılı olarak gitsin
            await channel.send({
                content: `🌑 **${member.user?.tag ?? 'Bir üye'}** aramızdan ayrıldı. **${member.guild.memberCount}** kişi kaldık.`
            }).catch(() => null);
        }
    },
};

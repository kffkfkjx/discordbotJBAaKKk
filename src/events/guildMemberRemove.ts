import { Events, GuildMember, AttachmentBuilder, TextChannel } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
const Jimp = require('jimp');

let cachedBackground: any = null;
let cachedFontTitle: any = null;
let cachedFontSub: any = null;

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member: GuildMember, client: any) {
        if (member.user.bot) return;

        const dbPath = path.join(__dirname, '..', 'db.json');
        if (!fs.existsSync(dbPath)) return;

        let db: any;
        try {
            db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        } catch (e) {
            return;
        }

        if (!db.welcomeChannel) return;

        const channel = member.guild.channels.cache.get(db.welcomeChannel) as TextChannel;
        if (!channel) return;

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
        }
    },
};

import { Events, GuildMember, AttachmentBuilder, TextChannel } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
const Jimp = require('jimp');

let cachedBackground: any = null;
let cachedFontTitle: any = null;
let cachedFontSub: any = null;

module.exports = {
    name: Events.GuildMemberAdd,
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
            // Load and cache background globally to save Render CPU/Network time
            if (!cachedBackground) {
                const bgUrl = 'https://cdn.photoroom.com/v2/image-cache?path=gs://background-7ef44.appspot.com/backgrounds_v3/black/47_-_black.jpg';
                cachedBackground = await Jimp.read(bgUrl);
                cachedBackground.cover(1024, 450);
                cachedBackground.color([{ apply: 'darken', params: [25] }]);
            }
            if (!cachedFontTitle) {
                cachedFontTitle = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
            }
            if (!cachedFontSub) {
                cachedFontSub = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
            }

            // MUST CLONE SO WE DONT OVERWRITE THE CACHE
            const background = cachedBackground.clone();

            // Sadece avatarı okuyoruz, bu sayede işlem süresi 5-10 saniyeden < 1 saniyeye düşer
            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await Jimp.read(avatarUrl);

            const avatarSize = 220;
            avatar.resize(avatarSize, avatarSize).circle();

            const avatarX = (background.bitmap.width / 2) - (avatarSize / 2);
            const avatarY = 40; 

            background.composite(avatar, avatarX, avatarY);
            
            const welcomeText = 'SUNUCUYA HOS GELDIN';
            const userName = member.user.tag;
            
            background.print(cachedFontTitle, 0, 280, {
                text: welcomeText,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, background.bitmap.width);

            background.print(cachedFontSub, 0, 360, {
                text: userName,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, background.bitmap.width);

            const buffer = await background.getBufferAsync(Jimp.MIME_PNG);
            const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });
            
            const messageContent = `🌟 **Aramıza Hoş Geldin!** 🌟\n\nHoş geldin ${member.user}! Seninle birlikte kocaman bir aile oluyoruz, şu an tam **${member.guild.memberCount}** kişiyiz! 🥳\n\n🚀 **NexoGameST** ayrıcalığıyla kesintisiz oyun maceralarının ve sohbetin tadını çıkar. Kuralları okumayı unutma, iyi eğlenceler! 🎮`;

            await channel.send({ content: messageContent, files: [attachment] });
        } catch (error) {
            console.error('[GIRISCikis] Resim olusturulurken hata:', error);
        }
    },
};

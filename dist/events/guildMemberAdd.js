"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Jimp = require('jimp');
module.exports = {
    name: discord_js_1.Events.GuildMemberAdd,
    async execute(member, client) {
        if (member.user.bot)
            return;
        const dbPath = path.join(__dirname, '..', 'db.json');
        if (!fs.existsSync(dbPath))
            return;
        let db;
        try {
            db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        }
        catch (e) {
            return;
        }
        if (!db.welcomeChannel)
            return;
        const channel = member.guild.channels.cache.get(db.welcomeChannel);
        if (!channel)
            return;
        try {
            // Load background
            const bgUrl = 'https://cdn.photoroom.com/v2/image-cache?path=gs://background-7ef44.appspot.com/backgrounds_v3/black/47_-_black.jpg';
            const background = await Jimp.read(bgUrl);
            // USE COVER INSTEAD OF RESIZE TO PREVENT STRETCHING
            background.cover(1024, 450);
            background.color([{ apply: 'darken', params: [25] }]); // Hafif karartma (okunabilirlik icin)
            // Draw Avatar
            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await Jimp.read(avatarUrl);
            const avatarSize = 220;
            avatar.resize(avatarSize, avatarSize).circle();
            const avatarX = (background.bitmap.width / 2) - (avatarSize / 2);
            const avatarY = 40; // Biraz daha yukari alindi
            background.composite(avatar, avatarX, avatarY);
            // Draw Texts
            const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
            const fontSub = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
            // Isim ve mesaj
            const welcomeText = 'SUNUCUYA HOS GELDIN';
            const userName = member.user.tag;
            background.print(fontTitle, 0, 280, {
                text: welcomeText,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, background.bitmap.width);
            background.print(fontSub, 0, 360, {
                text: userName,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, background.bitmap.width);
            const buffer = await background.getBufferAsync(Jimp.MIME_PNG);
            const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: 'welcome-image.png' });
            const messageContent = `🌟 **Aramıza Hoş Geldin!** 🌟\n\nHoş geldin ${member.user}! Seninle birlikte kocaman bir aile oluyoruz, şu an tam **${member.guild.memberCount}** kişiyiz! 🥳\n\n🚀 **NexoGameST** ayrıcalığıyla kesintisiz oyun maceralarının ve sohbetin tadını çıkar. Kuralları okumayı unutma, iyi eğlenceler! 🎮`;
            await channel.send({ content: messageContent, files: [attachment] });
        }
        catch (error) {
            console.error('[GIRISCikis] Resim olusturulurken hata:', error);
        }
    },
};

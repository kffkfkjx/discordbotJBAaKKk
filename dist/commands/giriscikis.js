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
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('giriscikis')
        .setDescription('Resimli giriş/çıkış kanalını ayarlar (Sadece Yöneticiler).')
        .addChannelOption(option => option.setName('kanal')
        .setDescription('Giriş çıkış mesajlarının atılacağı kanal')
        .addChannelTypes(discord_js_1.ChannelType.GuildText)
        .setRequired(true))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const channel = interaction.options.getChannel('kanal');
        const dbPath = path.join(__dirname, '..', 'db.json');
        let db = {};
        if (fs.existsSync(dbPath)) {
            try {
                db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            }
            catch (e) { }
        }
        db.welcomeChannel = channel?.id;
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        await interaction.reply({ content: `✅ Resimli giriş/çıkış sistemi başarıyla <#${channel?.id}> kanalına kuruldu! Kapatmak için \`/giriscikiskapat\` kullanabilirsiniz.`, ephemeral: true });
    }
};

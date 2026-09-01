import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giriscikiskapat')
        .setDescription('Resimli giriş/çıkış sistemini tamamen kapatır (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const dbPath = path.join(__dirname, '..', 'db.json');
        let db: any = {};
        if (fs.existsSync(dbPath)) {
            try {
                db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            } catch (e) {}
        }

        db.welcomeChannel = null;
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        await interaction.reply({ content: '✅ Resimli giriş/çıkış sistemi başarıyla **KAPATILDI**.', ephemeral: true });
    }
};

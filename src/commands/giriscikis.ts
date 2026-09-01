import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giriscikis')
        .setDescription('Resimli giriş/çıkış kanalını ayarlar (Sadece Yöneticiler).')
        .addChannelOption(option => 
            option.setName('kanal')
                .setDescription('Giriş çıkış mesajlarının atılacağı kanal')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const channel = interaction.options.getChannel('kanal');
        
        const dbPath = path.join(__dirname, '..', 'db.json');
        let db: any = {};
        if (fs.existsSync(dbPath)) {
            try {
                db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            } catch (e) {}
        }

        db.welcomeChannel = channel?.id;
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        await interaction.reply({ content: `✅ Resimli giriş/çıkış sistemi başarıyla <#${channel?.id}> kanalına kuruldu! Kapatmak için \`/giriscikiskapat\` kullanabilirsiniz.`, ephemeral: true });
    }
};

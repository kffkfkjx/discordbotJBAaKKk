import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban-kanal-bilgi')
        .setDescription('Otomatik ban kanalını görüntüler veya değiştirir (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('yeni_kanal')
                .setDescription('Yeni ban kanalını seçin (Boş bırakırsanız mevcut kanalı gösterir).')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const yeniKanal = interaction.options.getChannel('yeni_kanal');
        
        const dbPath = path.join(__dirname, '..', 'db.json');
        let db: any = {};
        if (fs.existsSync(dbPath)) {
            try {
                db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            } catch (e) {}
        }

        if (yeniKanal) {
            db.autoBanChannel = yeniKanal.id;
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            return interaction.reply({ content: `✅ Otomatik ban sistemi güncellendi! Artık <#${yeniKanal.id}> kanalına mesaj atanlar anında sunucudan yasaklanacak.`, ephemeral: true });
        } else {
            const mevcut = db.autoBanChannel || '1544500653571702864';
            return interaction.reply({ content: `ℹ️ **Sistem Bilgisi:** Şu anda <#${mevcut}> kanalına mesaj atanlar otomatik olarak banlanmaktadır.\nDeğiştirmek için komutu kullanırken \`yeni_kanal\` seçeneğini kullanabilirsiniz.`, ephemeral: true });
        }
    }
};

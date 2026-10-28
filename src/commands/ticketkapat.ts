import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { handleCloseTicket } from '../utils';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketkapat')
        .setDescription('Mevcut destek talebini (ticket) kapatır ve loglar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        await handleCloseTicket(interaction);
    }
};

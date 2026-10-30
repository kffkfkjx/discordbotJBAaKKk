import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

const commands: any[] = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const missing = ['TOKEN', 'CLIENT_ID', 'GUILD_ID'].filter(key => !process.env[key]);
if (missing.length > 0) {
    console.warn(`[WARN] Komut deploy işlemi atlandı: Ortam değişkenleri eksik (${missing.join(', ')}). Bot mevcut kayıtlı komutlarla başlayacak.`);
    process.exit(0);
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN as string);

(async () => {
    try {
        console.log(`[INFO] Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID as string, 
                process.env.GUILD_ID as string
            ),
            { body: commands },
        ) as any[];

        console.log(`[SUCCESS] Successfully reloaded ${data.length} application (/) commands.`);
        process.exit(0);
    } catch (error) {
        // Discord geçici hata verirse deploy'u düşürmeyelim; eski komutlar çalışmaya devam eder
        console.error('[ERROR] Failed to deploy commands:', error);
        process.exit(0);
    }
})();

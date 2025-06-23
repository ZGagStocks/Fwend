const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const { REST } = require('@discordjs/rest');
const ytdl = require('ytdl-core');

const TOKEN = 'MTM4NjMyOTAxNDg1OTQ2ODgzMA.G0aL-w.fJ8gJBs0A_VAoF0kGC6xaczgprj9m8VmzaW0v4';
const CLIENT_ID = '1386329014859468830';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a YouTube video in your voice channel')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The YouTube video URL')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music and leaves the voice channel')
]
    .map(command => command.toJSON());

// Register globally (can take up to 1 hour to appear for all users)
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Registering global slash commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Global slash commands registered!');
    } catch (err) {
        console.error('Failed to register commands globally:', err);
    }
})();

client.on('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

const player = createAudioPlayer();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'play') {
        const url = interaction.options.getString('url');

        if (!ytdl.validateURL(url)) {
            return interaction.reply('❌ Invalid YouTube URL.');
        }

        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply('❌ You must be in a voice channel to use this command.');
        }

        try {
            const stream = ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 });
            const resource = createAudioResource(stream);

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            player.play(resource);
            connection.subscribe(player);

            interaction.reply(`▶️ Now playing: ${url}`);
        } catch (err) {
            console.error(err);
            interaction.reply('❌ Error playing the video.');
        }
    }

    if (commandName === 'stop') {
        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
            connection.destroy();
            interaction.reply('⏹️ Stopped and left the voice channel.');
        } else {
            interaction.reply('⚠️ I am not in a voice channel.');
        }
    }
});

client.login(TOKEN);

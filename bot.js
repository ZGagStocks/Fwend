require('dotenv').config();

const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
const { REST } = require('@discordjs/rest');
const ytdl = require('ytdl-core');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a YouTube video in your voice channel')
    .addStringOption(opt => opt.setName('url').setDescription('YouTube URL').setRequired(true)),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playing and leave voice channel')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registering slash commands globally...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
})();

const player = createAudioPlayer();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    const url = interaction.options.getString('url');

    if (!ytdl.validateURL(url)) {
      return interaction.reply('❌ Invalid YouTube URL.');
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply('❌ You need to be in a voice channel to play music.');
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false
      });

      const stream = ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 });

      const resource = createAudioResource(stream);

      player.play(resource);
      connection.subscribe(player);

      await interaction.reply(`▶️ Now playing: ${url}`);
    } catch (error) {
      console.error('Error playing audio:', error);
      interaction.reply('❌ Could not play that video.');
    }
  }

  if (interaction.commandName === 'stop') {
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
      connection.destroy();
      interaction.reply('⏹️ Stopped playback and left the voice channel.');
    } else {
      interaction.reply('⚠️ I am not connected to a voice channel.');
    }
  }
});

client.login(TOKEN);

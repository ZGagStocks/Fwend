require('dotenv').config();

const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection } = require('@discordjs/voice');
const { REST } = require('@discordjs/rest');
const ytdl = require('ytdl-core');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Slash commands
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
].map(command => command.toJSON());

// Register global slash commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registering global slash commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered globally.');
  } catch (err) {
    console.error('❌ Command registration failed:', err);
  }
})();

const player = createAudioPlayer();

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'play') {
    const url = interaction.options.getString('url');

    if (!ytdl.validateURL(url)) {
      return interaction.reply('❌ That is not a valid YouTube URL.');
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply('❌ You must be in a voice channel to use this.');
    }

    try {
      const stream = ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 });
      const resource = createAudioResource(stream);

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      connection.subscribe(player);
      player.play(resource);

      interaction.reply(`▶️ Now playing: ${url}`);
    } catch (err) {
      console.error(err);
      interaction.reply('❌ Error playing the video.');
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


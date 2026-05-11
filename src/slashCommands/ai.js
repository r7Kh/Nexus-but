const { SlashCommandBuilder } = require('discord.js');
const OpenAI = require('openai');

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('اسأل الذكاء الاصطناعي')
        .addStringOption(option =>
            option
                .setName('question')
                .setDescription('اكتب سؤالك')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const question = interaction.options.getString('question');

        try {
            const response = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'أنت مساعد عربي داخل بوت ديسكورد.'
                    },
                    {
                        role: 'user',
                        content: question
                    }
                ]
            });

            const answer = response.choices[0].message.content;

            await interaction.editReply({
                content: answer.slice(0, 2000)
            });

        } catch (error) {
            console.error(error);

            await interaction.editReply({
                content: '❌ صار خطأ مع نظام الذكاء الاصطناعي'
            });
        }
    }
};
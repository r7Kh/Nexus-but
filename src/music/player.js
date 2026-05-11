const { DisTube } = require('distube');
const ffmpeg = require('ffmpeg-static');

module.exports = (client) => {
    client.distube = new DisTube(client, {
        emitNewSongOnly: true,
        ffmpeg: {
            path: ffmpeg
        }
    });

    client.distube
        .on('playSong', (queue, song) => {
            queue.textChannel?.send({
                content: `
🎵 **يتم الآن تشغيل**
**${song.name}**

⏱ المدة: ${song.formattedDuration}
👤 الطلب بواسطة: ${song.user}
                `
            });
        })
        .on('addSong', (queue, song) => {
            queue.textChannel?.send({
                content: `➕ تمت إضافة **${song.name}** إلى قائمة التشغيل`
            });
        })
        .on('error', (error, queue) => {
            console.error('Music Error:', error);
            queue?.textChannel?.send('❌ حدث خطأ أثناء تشغيل الموسيقى').catch(() => {});
        });
};
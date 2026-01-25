const axios = require('axios');
const FormData = require('form-data');

async function uploadToCatbox(buffer) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename: 'image.png' });

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
    });

    if (!response.data || !response.data.includes('catbox')) {
        throw new Error('upload failed');
    }

    return response.data.trim();
}

module.exports = async (context) => {
    const { client, m, text } = context;

    try {
        await client.sendMessage(m.chat, { react: { text: '⌛', key: m.key } });

        if (!m.quoted) {
            return m.reply(`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤\n┋❥✿ quote an image first\n❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`);
        }

        const q = m.quoted || m;
        const mime = (q.msg || q).mimetype || "";

        if (!mime.startsWith("image/")) {
            return m.reply(`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤\n┋❥✿ that's not an image\n❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`);
        }

        const mediaBuffer = await q.download();
        const prompt = text || "describe this image";

        const uploadedURL = await uploadToCatbox(mediaBuffer);

        const api = `https://api.deline.web.id/ai/toprompt?url=${encodeURIComponent(uploadedURL)}`;
        const result = await axios.get(api);

        if (!result.data?.status || !result.data?.result?.original) {
            throw new Error('api returned invalid response');
        }

        const originalText = result.data.result.original;

        await client.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        await client.sendMessage(
            m.chat,
            {
                text: `❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤\n┋❥✿ image analysis\n┋❥✿ prompt: ${prompt}\n┋❥✿ \n┋❥✿ ${originalText}\n┋❥✿ 𝙁𝙀𝙀-𝙓𝙈𝘿\n❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`,
            },
            { quoted: m }
        );

    } catch (err) {
        console.error('image analysis error:', err);
        
        await client.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        
        let errorMessage = 'analysis failed';
        if (err.message.includes('upload failed')) errorMessage = 'upload failed';
        if (err.message.includes('invalid response')) errorMessage = 'api returned Invalid response';
        
        await m.reply(`❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤\n┋❥✿ ${errorMessage}\n┋❥✿ error: ${err.message}\n❥┈┈┈┈┈┈┈┈┈┈┈┈┈┈➤`);
    }
};
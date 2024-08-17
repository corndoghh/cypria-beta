//imports
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const bodyParser = require('body-parser');
const fs = require("fs").promises
const axios = require('axios');


app.use(bodyParser.json());
app.use('/hls', express.static(path.join(__dirname, 'public', 'hls')));
app.use('/', express.static(path.join(__dirname, 'public')));

//headers
const headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-us,en;q=0.5',
    'Connection': 'keep-alive',
    'Host': 'www.youtube.com',
    'Origin': 'https://www.youtube.com',
    'Sec-Fetch-Mode': 'navigate',
    'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)',
    'X-Youtube-Client-Name': '5',
    'X-Youtube-Client-Version': '19.29.1',
};

const jsonData = {
    context: {
        client: {
            clientName: 'IOS',
            clientVersion: '19.29.1',
            deviceMake: 'Apple',
            deviceModel: 'iPhone16,2',
            userAgent: 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)',
            osName: 'iPhone',
            osVersion: '17.5.1.21F90',
            hl: 'en',
            timeZone: 'UTC',
            utcOffsetMinutes: 0,
        },
    },
    playbackContext: {
        contentPlaybackContext: {
            html5Preference: 'HTML5_PREF_WANTS',
        },
    },
    contentCheckOk: true,
    racyCheckOk: true,
};

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

app.get('/', (req, res) => res.sendFile(__dirname + "/public/index.html"));

app.post("/rebuild", async (req, res) => {
    const { exec } = require('child_process');

    console.log("decoding")

    jsonData.videoId = req.body.id.split("?v=")[1].split("&")[0]

    const ytResponse = await axios.post("https://www.youtube.com/youtubei/v1/player", jsonData, { headers })

    if (ytResponse.status !== 200) { throw new Error(`A very specific bad thing happened. It wasn't 200, it was ${response.status}`); }

    slicedEncodes = null

    try {
        slicedEncodes = ytResponse.data.videoDetails.shortDescription.split("\n").filter(x => x.includes("ENCODED_SLICES")).join("").split("ENCODED_SLICES: ")[1].split(",")
    } catch {
        res.statusCode = 404
        res.send('None shall pass');
        return
    } 
    
    console.log(slicedEncodes)


    const streams = ytResponse.data.streamingData.adaptiveFormats
    const videoStream = streams[0].url
    const audioStream = streams[streams.length -1].url

    const ffmpegRebuild = [
        `ffmpeg -i "${videoStream}" -i "${audioStream}" `,
        '-filter_complex "',
        slicedEncodes.map((_, i) => `[0:v]crop=iw/30:ih:${i}*ow:0 [v${slicedEncodes[i]}]; `).join(''),
        slicedEncodes.map((_, i) => `[v${i + 1}]`).join(''),
        `hstack=inputs=${slicedEncodes.length}[v]; [1:a]apad=pad_dur=678.511[a]" `,
        '-map "[v]" -map "[a]" ',
        '-c:v libx264 -c:a aac -f hls -hls_time 4 -hls_list_size 0 ',
        '-hls_segment_filename "public/hls/segment_%03d.ts" ',
        '-hls_flags delete_segments public/hls/playlist.m3u8'
    ].join('');

    for (const file of await fs.readdir("public/hls")) { await fs.unlink(path.join("public/hls", file))}

    exec(ffmpegRebuild, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing ffmpeg: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`ffmpeg stderr: ${stderr}`);
            return;
        }
        console.log(`ffmpeg stdout: ${stdout}`);
    });
    res.statusCode = 200
    res.send('None shall pass');


})

app.post("/videoReady", async (req, res) => {

    while (true) { if ((await fs.readdir("public/hls")).length !== 0) { break } }

    res.json({ status: 'Rebuild ready' });
    
})


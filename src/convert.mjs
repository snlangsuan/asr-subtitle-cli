import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import chalk from 'chalk'
import ffmpeg from 'fluent-ffmpeg'
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import { path as ffprobePath } from '@ffprobe-installer/ffprobe'
import cliProgress from 'cli-progress'
import { getAppToken } from './libs/utils.mjs'
import WebSocket from 'ws'
import { ASR_WEBSOCKET_URL } from './constants.mjs'


ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

async function convertVideoToMp3(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(videoPath)) return reject(new Error(`Input video file not found: ${videoPath}`))

    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .on('end', () => resolve())
      .on('error', reject)
      .save(audioPath)
  })
}

async function chunkAudio(audioPath, outputDir, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) return reject(err)

      const totalDuration = metadata.format.duration
      if (!totalDuration || totalDuration === 'N/A') {
        return reject(new Error('Could not determine the duration of the audio file.'))
      }

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      let completedChunks = 0
      const totalChunks = Math.ceil(totalDuration / duration)

      if (totalChunks === 0) return resolve()

      const chunkPath = []
      for (let i = 0; i < totalDuration; i += duration) {
        const chunkIndex = Math.floor(i / duration) + 1
        const outputChunkPath = path.join(outputDir, `chunk_${chunkIndex}.mp3`)
        chunkPath.push(outputChunkPath)
        ffmpeg(audioPath)
          .setStartTime(i)
          .setDuration(duration)
          .output(outputChunkPath)
          .on('end', () => {
            completedChunks++
            if (completedChunks === totalChunks) {
              resolve(chunkPath)
            }
          })
          .on('error', reject)
          .run()
      }
    })
  })
}

function readFileBase64(filePath) {
  const buffer = fs.readFileSync(filePath)
  const base64String = buffer.toString('base64')
  return Buffer.from(base64String, 'base64')
}

async function generateSubtitle(files, chunkSize, language) {
  if (files.length < 1) throw new Error('No files to process')
  const token = await getAppToken()
  if (!token) throw new Error('No token found')
  console.log(token)
  const totalChunks = files.length
  let completedChunks = 0
  const subtitleData = []
  return new Promise((resolve, reject) => {
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
    bar1.start(totalChunks, 0)
    const socket = new WebSocket(`${ASR_WEBSOCKET_URL}?target_language=${language}`, { headers: { 'x-api-key': token } })
    socket.on('open', () => {
      console.log('connected')
      socket.send(readFileBase64(files.pop()), { binary: true })
    })
    socket.on('error', reject)

    socket.on('message', (data) => {
      const message = JSON.parse(data)
      console.log(message)
      const index = subtitleData.length
      const start = index * chunkSize
      const end = start + chunkSize
      subtitleData.push({
        start,
        end,
        text: message.text
      })
      completedChunks += 1
       bar1.increment()
      if (files.length > 0) socket.send(readFileBase64(files.pop()), { binary: true })
      if (completedChunks === totalChunks) {
        socket.close()
        bar1.stop()
        resolve(subtitleData)
      }
    })
  })
  // for (const file of files) {

  // }
}

export async function convertVideo(videoPath, options) {
  if (!fs.existsSync(videoPath)) {
    console.log(chalk.red(`[error] video not found: ${videoPath}`))
    return
  }
  const chunkDuration = 4
  const output = options.output ?? path.dirname(videoPath)
  const subFilename = `${path.basename(videoPath, path.extname(videoPath))}.${options.format}`
  const outputPath = path.join(output, subFilename)
  const outputChunkPath = path.join(os.tmpdir(), `video-chunks-${Date.now()}`)
  const tempAudioFile = path.join(os.tmpdir(), `temp_audio_${Date.now()}.mp3`)
  try {
    console.log('Reading video file...')
    await convertVideoToMp3(videoPath, tempAudioFile)
    console.log('Transcoding audio file...')
    const chunkPath = await chunkAudio(tempAudioFile, outputChunkPath, chunkDuration)
    const subtitleData = await generateSubtitle(chunkPath, chunkDuration, options.language)
    console.log(subtitleData)
  } catch (error) {
    console.log(chalk.red(`[error] convert error: ${error.message}`))
  } finally {
    if (fs.existsSync(tempAudioFile)) fs.unlinkSync(tempAudioFile)
    if (fs.existsSync(outputChunkPath)) fs.rmSync(outputChunkPath, { recursive: true, force: true })
  }
}

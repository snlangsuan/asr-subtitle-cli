import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import chalk from 'chalk'
import ffmpeg from 'fluent-ffmpeg'
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import { path as ffprobePath } from '@ffprobe-installer/ffprobe'
import cliProgress from 'cli-progress'

ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

async function convertVideoToMp3(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(videoPath)) {
      return reject(new Error(`Input video file not found: ${videoPath}`))
    }

    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .on('end', () => {
        console.log(`Conversion to MP3 finished. Saved to: ${audioPath}`)
        resolve()
      })
      .on('error', (err) => {
        console.error('Error during conversion:', err.message)
        reject(err)
      })
      .save(audioPath)
  })
}

async function chunkAudio(audioPath, outputDir, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        console.error('Error getting media metadata:', err.message)
        return reject(err)
      }
      const totalDuration = metadata.format.duration
      if (!totalDuration || totalDuration === 'N/A') {
        return reject(new Error('Could not determine the duration of the audio file.'))
      }

      console.log(`Total duration: ${totalDuration} seconds.`)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
        console.log(`Created temporary chunk folder: ${outputDir}`)
      }

      let completedChunks = 0
      const totalChunks = Math.ceil(totalDuration / duration)

      if (totalChunks === 0) {
        console.log('Audio is too short to be chunked.')
        return resolve()
      }

      console.log(`Splitting into ${totalChunks} chunks of ${duration} seconds each.`)

      const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
      bar1.start(totalChunks, 0)

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
            bar1.increment()
            if (completedChunks === totalChunks) {
              bar1.stop()
              console.log('All chunks have been created successfully!')
              resolve(chunkPath)
            }
          })
          .on('error', (err) => {
            console.error(`Error processing chunk ${chunkIndex}:`, err.message)
            reject(err)
          })
          .run()
      }
    })
  })
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
    await convertVideoToMp3(videoPath, tempAudioFile)
    const chunkPath = await chunkAudio(tempAudioFile, outputChunkPath, chunkDuration)
    console.log(chunkPath)    
  } catch (error) {
    console.log(chalk.red(`[error] convert error: ${error.message}`))
  } finally {
    if (fs.existsSync(tempAudioFile)) fs.unlinkSync(tempAudioFile)
    if (fs.existsSync(outputChunkPath)) fs.rmSync(outputChunkPath, { recursive: true, force: true })
  }
}

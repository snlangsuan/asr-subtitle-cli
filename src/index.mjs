#!/usr/bin/env node

import { Option, program } from 'commander'
import pckg from './../package.json' with { type: 'json' }
import auth from './auth.mjs'
import generate from './generate.mjs'
import convert from './convert.mjs'

program
  .version(pckg.version)

program
  .command('login <token>')
  .description('Login and save the App Token')
  .action(auth)

program
  .command('generate <video_path>')
  .description('Generate subtitles for a video')
  .addOption(new Option('-f --format <format>', 'Set output format (srt or vtt)').choices(['srt', 'vtt']).default('srt'))
  .addOption(new Option('-l --language <language>', 'Set output language').choices(['th', 'en']).default('th'))
  .option('-o --output <output_path>', 'Set output path')
  .action(generate)

program
  .command('convert <source>')
  .description('Convert SRT or VTT to SRT or VTT')
  .addOption(new Option('-f --format <format>', 'Set output format (srt or vtt)').choices(['srt', 'vtt']).default('srt'))
  .option('-o --output <output_path>', 'Set output path')
  .action(convert)

program.parse(process.argv)
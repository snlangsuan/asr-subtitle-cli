#!/usr/bin/env node

import { Option, program } from 'commander'
import pckg from './../package.json' with { type: 'json' }
import { setAuthToken } from './auth.mjs'
import { convertVideo } from './convert.mjs'

program
  .version(pckg.version)

program
  .command('login <token>')
  .description('Login and save the App Token')
  .action(setAuthToken)

program
  .command('convert <video_path>')
  .description('Convert video to subtitle')
  .addOption(new Option('-f --format <format>', 'Set output format (srt or vtt)').choices(['srt', 'vtt']).default('srt'))
  .addOption(new Option('-l --language <language>', 'Set output language').choices(['th', 'en']).default('th'))
  .option('-o --output <output_path>', 'Set output path')
  .action(convertVideo)

program.parse(process.argv)
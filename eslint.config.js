import fs from 'node:fs'
import js from '@eslint/js'
import globals from 'globals'
import { defineConfig } from 'eslint/config'

const prettierConf = JSON.parse(fs.readFileSync('./.prettierrc', 'utf-8'))

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      'prettier/prettier': [
        'error',
        {
          ...prettierConf,
        },
      ],
    },
  },
])
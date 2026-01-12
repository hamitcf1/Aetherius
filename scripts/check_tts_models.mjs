#!/usr/bin/env node
/*
  TTS Diagnostic Script
  - Scans environment for Gemini API keys (same names used in app)
  - For each key: lists available models (if supported) and attempts a small AUDIO `generateContent` request
  - Saves any returned inline audio to `./out/` for manual inspection

  Usage:
    npm install @google/genai mime
    node scripts/check_tts_models.mjs

  Set keys in your environment (example):
    export GEMINI_API_KEY=...   # or VITE_GEMINI_API_KEY, GEMINI_API_KEY_2, etc.

  Notes:
  - This runs locally and uses your API keys. It will write audio files to ./out when successful.
*/

import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { GoogleGenAI } from '@google/genai';

const OUT_DIR = path.resolve(process.cwd(), 'out');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Optionally load .env files if dotenv is available
(async () => {
  try {
    const dotenv = await import('dotenv');
    const envPath = path.resolve(process.cwd(), '.env');
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    dotenv.config({ path: envPath });
    dotenv.config({ path: envLocalPath });
    console.log('[TTS-DIAG] .env files loaded (if present)');
  } catch (e) {
    // dotenv not installed, that's fine; we support CLI and environment variables
  }
})();

const TTS_MODELS = [
  'gemini-2.5-flash-tts',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
  'gemini-2.5-flash-native-audio-dialog'
];

const collectKeys = () => {
  const env = process.env;
  const keys = new Set();
  const add = (k) => { if (k) keys.add(k); };

  // Support CLI arg: --key=KEY or --keys=key1,key2
  const argKey = process.argv.find(a => a.startsWith('--key='))?.split('=')[1];
  const argKeys = process.argv.find(a => a.startsWith('--keys='))?.split('=')[1];
  if (argKey) add(argKey);
  if (argKeys) argKeys.split(',').map(k => add(k.trim()));

  add(env.VITE_API_KEY || env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY);
  add(env.VITE_GEMINI_API_KEY_2 || env.GEMINI_API_KEY_2 || env.API_KEY_2);
  add(env.VITE_GEMINI_API_KEY_3 || env.GEMINI_API_KEY_3 || env.API_KEY_3);
  // Add generic enumerated keys
  for (let i = 4; i <= 20; i++) {
    add(env[`VITE_GEMINI_API_KEY_${i}`] || env[`GEMINI_API_KEY_${i}`] || env[`API_KEY_${i}`]);
  }
  return Array.from(keys).filter(Boolean);
};

const listModelsForClient = async (ai) => {
  if (typeof ai.models.list === 'function') {
    try {
      const res = await ai.models.list();
      return res?.models || res?.model || res;
    } catch (e) {
      console.warn('[TTS-DIAG] listModels failed:', e?.message || e);
      return null;
    }
  }
  return null;
};

const attemptTTS = async (ai, model, keySuffix) => {
  const sampleText = `Aetherius test: This is a short TTS test.`;
  // payload that requests AUDIO-only modality (some TTS models require this)
  const payload = {
    model,
    contents: [ { parts: [{ text: sampleText }] } ],
    config: { responseModalities: ['AUDIO'], audioConfig: { voice: 'Kore', format: 'wav' } }
  };

  try {
    const res = await ai.models.generateContent?.(payload);
    console.log(`[TTS-DIAG] model=${model} returned`, !!res ? 'non-empty' : 'empty');

    // Look for audio inlineData
    const candidates = res?.candidates || [];
    for (let i = 0; i < candidates.length; i++) {
      const parts = candidates[i]?.content?.parts || [];
      for (let j = 0; j < parts.length; j++) {
        const p = parts[j];
        if (p.inlineData && p.inlineData.data) {
          const mimeType = p.inlineData.mimeType || 'audio/wav';
          const ext = mime.getExtension(mimeType) || 'wav';
          const fileName = path.join(OUT_DIR, `tts_${keySuffix}_${model}_${i}_${j}.${ext}`);
          const buffer = Buffer.from(p.inlineData.data, 'base64');
          fs.writeFileSync(fileName, buffer);
          console.log(`[TTS-DIAG] saved audio: ${fileName} (mime=${mimeType})`);
          return true;
        }
        // Some models return base64 fields directly
        if (p.audio || p.data || p.base64) {
          const b64 = p.audio || p.data || p.base64;
          const fileName = path.join(OUT_DIR, `tts_${keySuffix}_${model}_${i}_${j}.mp3`);
          const buffer = Buffer.from(b64, 'base64');
          fs.writeFileSync(fileName, buffer);
          console.log(`[TTS-DIAG] saved audio (fallback): ${fileName}`);
          return true;
        }
      }
    }

    // Some SDKs supply audio at top-level
    if (res?.audio || res?.data || res?.base64 || res?.audioContent) {
      const b64 = res.audio || res.data || res.base64 || res.audioContent;
      const fileName = path.join(OUT_DIR, `tts_${keySuffix}_${model}_top.mp3`);
      fs.writeFileSync(fileName, Buffer.from(b64, 'base64'));
      console.log(`[TTS-DIAG] saved audio top-level: ${fileName}`);
      return true;
    }

    console.warn('[TTS-DIAG] No inline audio found in response for', model);
    return false;
  } catch (e) {
    const msg = e?.message || JSON.stringify(e?.response || e) || String(e);
    console.warn(`[TTS-DIAG] model=${model} error:`, msg);
    return false;
  }
};

(async () => {
  const keys = collectKeys();
  console.log('[TTS-DIAG] Found API keys:', keys.length, keys.map(k => `...${k.slice(-4)}`));

  if (!keys.length) {
    console.error('[TTS-DIAG] No API keys found in environment. Set GEMINI_API_KEY or VITE_GEMINI_API_KEY.');
    process.exit(1);
  }

  for (const key of keys) {
    const keySuffix = key.slice(-4);
    console.log('\n-----\n[TTS-DIAG] Testing key ...' + keySuffix);
    const ai = new GoogleGenAI({ apiKey: key });

    // List models if available
    const models = await listModelsForClient(ai);
    if (models) {
      // Normalize models into an array for safe iteration
      let modelsList = [];
      if (Array.isArray(models)) modelsList = models;
      else if (typeof models === 'object') modelsList = Object.values(models);
      else modelsList = [models];

      console.log(`[TTS-DIAG] key ...${keySuffix} models count: ${modelsList.length}`);
      // Show which of our interest models appear
      const available = [];
      for (const m of modelsList) {
        const name = m?.name || m?.model || m;
        if (!name) continue;
        for (const t of TTS_MODELS) {
          if (String(name).includes(t)) available.push(name);
        }
      }
      if (available.length) console.log(`[TTS-DIAG] key ...${keySuffix} TTS-related models:`, available.slice(0,10));
    } else {
      console.log('[TTS-DIAG] listModels not available or failed for this SDK version.');
    }

    // Attempt TTS on known models
    for (const model of TTS_MODELS) {
      console.log(`[TTS-DIAG] Trying model ${model} with key ...${keySuffix}`);
      const ok = await attemptTTS(ai, model, keySuffix);
      if (ok) break; // success for this key
    }
  }

  console.log('\n[TTS-DIAG] Finished. Check ./out for any saved audio files.');
})();

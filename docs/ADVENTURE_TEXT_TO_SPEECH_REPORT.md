# Adventure Text-to-Speech Report

## Files modified
- `components/AdventureChat.tsx` — added speaker icon UI and playback logic
- `services/geminiService.ts` — added TTS helper (`generateTextToSpeech`) and `sanitizeTextForTTS` helper
- `docs/ADVENTURE_TEXT_TO_SPEECH.md` — updated Status fields to reflect implementation
- `public/version.json` — (unchanged by this feature) existing support file present

## UI components added
- Speaker button beneath each Adventure AI (`gm`) message bubble
  - Shows loader during audio generation
  - Shows play/pause icon depending on playback state
  - Accessible button with `sr-only` label
  - Not rendered for player messages, system logs, or combat messages

## Playback logic
- On click:
  1. Sanitize visible narrative text with `sanitizeTextForTTS` (removes mechanical patterns, UI labels, code fences).
  2. Call `generateTextToSpeech(text, { preferredModel: 'gemini-2.5-flash-preview-tts' })` which returns a `{ buffer: ArrayBuffer, mimeType: string }` pair; the app constructs a Blob with the provided mime type and plays it.
  3. Create a temporary Blob URL and create an `HTMLAudioElement` to play it.
  4. Ensure only one playback exists at a time by stopping any current audio before starting a new one.
  5. Revoke Blob URL and clear audio references on end/error/stop.

- Clicking while playing stops playback.
- No autoplay and no caching/persistence of audio files (temporary in-memory blobs only).

## API usage details
- Uses existing `@google/genai` client via `services/geminiService.ts`.
- New TTS helper (`generateTextToSpeech`) implements a small fallback loop across allowed TTS models (`gemini-2.5-flash-tts`, `gemini-2.5-flash-preview-tts`) and available API keys (reuses existing key rotation and exhaustion handling in `geminiService`).
- The TTS helper attempts to parse multiple possible response shapes (base64 audio string, inlineData parts, ArrayBuffer, Uint8Array) to handle SDK variations.
- Voice default: `Kore` and format default: `mp3` (can be adjusted centrally in `generateTextToSpeech`).

## Known limitations / edge cases
- SDK variability: Different @google/genai SDK versions may expose TTS responses in several shapes — the helper contains heuristics to handle common shapes, but rare SDK shapes may require further handling.
- PCM / L16 responses: Some TTS models return raw linear PCM (`audio/L16;codec=pcm;rate=24000`) as inlineData — the helper detects this pattern and wraps raw PCM data into a WAV container so browsers can play the result.
- Model availability: If TTS models are not available or API keys lack TTS permissions, generation will fail; errors are logged and the user receives a small toast indicating the failure (quota or permission issues) and the loader stops.
- Combat/system detection: Implementation excludes messages with `updates.combatStart` or `updates.combatEnd` and basic content heuristics for `system|log|debug|combat` markers, but very unusual system messages embedded in narrative may need additional flagging.
- No UI to configure voice/model per user — this is intentionally fixed to reduce complexity and avoid consuming extra tokens.
- Retry UX: If TTS generation fails due to quota/permission, the user receives a brief toast; a more advanced retry or diagnostics UX can be added as an enhancement.

## Validation / Acceptance
- Speaker icon visible only on GM narrative replies (not on player messages, not on combat messages).
- Audio generation occurs only on click.
- Sanitized narrative is what is spoken (no mechanical deltas or UI labels expected in speech).
- Playback does not affect game state and is stateless and transient.

---

If you'd like, I can:
- Add a small user notification (toast) when TTS generation fails due to quota/permission.
- Add a test page to trigger edge cases for TTS response parsing.


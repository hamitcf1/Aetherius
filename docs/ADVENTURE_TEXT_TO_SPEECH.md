# Skyrim Aetherius – Adventure Text-to-Speech (TTS) Feature

## Overview

Adventure AI responses can be long and tiring to read.
This feature introduces **optional, user-triggered text-to-speech (TTS)** playback for Adventure AI messages.

Key principles:
- TTS is **opt-in per message**
- Triggered ONLY by user interaction
- Uses existing Google Gemini API keys
- No automatic playback
- No gameplay state changes

---

## Design Principles

### 1. User-Controlled Only
- No autoplay
- No background narration
- TTS starts ONLY when user clicks/taps a speaker icon

### 2. Narrative Layer Only
- TTS applies ONLY to:
  - Adventure AI responses
- NOT to:
  - Combat logs
  - System toasts
  - Inventory events
  - Stat changes

### 3. Stateless Playback
- No persistence needed
- Audio is generated on demand
- Playback does not affect game state

---

## Feature Requirements

### 1. Speaker Icon UI

**Requirements:**
- Add a **speaker / microphone icon** under every Adventure AI message bubble
- Icon must:
  - Be visually subtle
  - Clearly indicate audio playback
- Icon must NOT appear for:
  - Player messages
  - System messages
  - Combat logs

**Acceptance Criteria:**
- Every AI adventure reply has a speaker icon
- Icon is clickable/tappable
- No accidental auto-play

**Status:** ✅ DONE — Speaker icon added under GM messages; it toggles TTS play/stop and shows generation loader. (See /docs/ADVENTURE_TEXT_TO_SPEECH_REPORT.md)

---

### 2. On-Demand Text-to-Speech Generation

**Requirements:**
- On click:
  - Send AI message text to TTS model
  - Generate audio dynamically
  - Play audio for the user
- Use existing Google Gemini API keys
- Allowed models:
  - `gemini-2.5-flash-tts`
  - `gemini-2.5-flash-preview-tts`
- Voice can be fixed initially (e.g. `Kore`)

**Acceptance Criteria:**
- Audio plays only after click
- Correct text is spoken
- No UI blocking during generation

**Status:** ✅ DONE — TTS generated on-demand via Gemini TTS models (`gemini-2.5-flash-tts` default); generation is async and shows loader while producing audio. (See report)

---

### 3. API & Implementation Constraints

**Requirements:**
- Do NOT introduce new API keys
- Do NOT persist audio files
- Do NOT store audio in database
- Generate audio in-memory or temporary blob
- Handle async playback safely

**Acceptance Criteria:**
- Uses existing API configuration
- No backend persistence required
- No memory leaks or repeated playback bugs

**Status:** ✅ DONE — Audio is generated in-memory, played via Blob URLs and revoked after use; no persistence or DB storage used. API keys from existing config are reused via `geminiService` key rotation logic.

---

### 4. Playback Controls & UX

**Requirements:**
- Clicking speaker icon:
  - Starts playback
- Clicking again while playing:
  - Stops playback
- Only one TTS playback at a time

**Acceptance Criteria:**
- No overlapping voices
- Playback state is clear
- UX is predictable

**Status:** ✅ DONE — Icon toggles play/stop; only one playback is allowed via a single component-wide audio instance; loader indicates generation state.

---

### 5. Text Sanitization & Safety

**Requirements:**
- Strip:
  - UI labels
  - Choice buttons
  - Stat deltas
- Speak **only narrative text**
- Ensure profanity is not filtered (game tone applies)

**Acceptance Criteria:**
- Spoken text matches visible narrative
- No system noise read aloud

**Status:** ✅ DONE — Narrative text is sanitized via `sanitizeTextForTTS` (removes mechanical phrases, code fences, and UI labels) before sending to TTS.

---

## Technical Notes

### Suggested Flow
1. User clicks speaker icon
2. Extract clean narrative text
3. Send text to Gemini TTS model
4. Receive PCM / audio buffer
5. Play audio via browser audio API
6. Stop or dispose on replay or navigation

---

## Completion Tracking

AI Agent must:
1. Implement all features in this file
2. Update each section status:
   - ✅ DONE
   - ⚠️ PARTIAL
   - ❌ BLOCKED (with reason)
3. Create a report file:

   `/docs/ADVENTURE_TEXT_TO_SPEECH_REPORT.md`

Report must include:
- UI changes made
- TTS request flow
- Models used
- Playback handling
- Known limitations

---

## Definition of Done

- Speaker icon exists under every Adventure AI reply
- Audio is generated only on click
- Correct model is used
- No autoplay
- No state changes
- No duplicated or overlapping playback

# Workout Timer

An interval timer for a morning PT workout, built as a web app you can install on your iPhone. It runs fully offline once it's installed.

- Defaults: **60 s work / 5 s rest × 30 rounds**, plus a 5 s "Get ready". All of these can be changed in ⚙︎ Settings.
- A female voice says **"Work!"** and **"Rest!"** when each phase starts. It counts down **5‑4‑3‑2‑1** at the end of every work period and says "Workout complete" at the finish.
- Optional subtle **tick‑tock** every second (⚙︎ → Ticking sound). It stays quiet on seconds that already have a voice cue.
- Very large fluorescent‑green digits. The top bar is green for WORK, red for REST and amber for GET READY. The footer shows rounds left and what comes next.
- The layout fits on one screen in landscape on an iPhone, and also works in portrait.
- Controls: ▶/❚❚ pauses and resumes (tapping the digits does the same). ↻ restarts the workout. While a workout is running, tap ↻ twice so you can't restart by accident.
- Timing comes from the wall clock, so the timer doesn't drift.
- Settings are saved on the device.

## Put it on your iPhone

1. **Host it.** On GitHub go to *Settings → Pages*, set *Source: Deploy from a branch*, pick the branch and `/ (root)`, then click Save. After about a minute the app is live at `https://<user>.github.io/Workout-Timer/`.
   (GitHub Pages only works on a private repository if you have a paid plan. Otherwise make the repository public, or drag the folder onto Netlify Drop or Cloudflare Pages.)
2. On the iPhone, open that URL in **Safari**.
3. Tap **Share → Add to Home Screen**. Opening the app from its icon gives you a full‑screen view with no browser bars, and it keeps working offline.
4. Open it once, go to ⚙︎ and tap **Test voice**. You should hear "Work! 5, 4, 3, 2, 1, Rest!". A message also shows the audio status, which should read `Audio running · voice clips 14/14`.

The voice cues are short recordings that come with the app (`audio/<voice>/*.mp3`). They were made with the open-source Kokoro TTS model (Apache-2.0). There are three voices to choose from in ⚙︎ → Voice:
- **Coach – firm (US)**, the default: Kokoro `af_bella`, pitched down about 2 semitones and compressed so it sounds punchier.
- **Coach – firm (British)**: `bf_emma`, processed the same way.
- **Warm (US)**: `af_heart`, the original voice. They play through Web Audio, which works much more reliably on iOS than the browser's speech engine. You can switch to the iPhone's own voices in ⚙︎ → Voice.

## Tips for reliable audio on iOS

- **Keep the screen on and the app in front.** iOS pauses web apps when the phone locks or when you switch apps. The timer keeps correct time and catches up when you come back, but you won't hear the cues while it's paused. The app asks the screen to stay awake while a workout runs (iOS 16.4+). As a fallback, set *Settings → Display & Brightness → Auto‑Lock → Never* during workouts.
- **Tap ▶ to start.** iOS only allows sound after a tap, and the first tap turns the audio on. If iOS cuts the sound off (for example after a phone call or Siri), any tap on the screen turns it back on.
- **After an update**, close the app fully (swipe it away) and open it again. If you still get the old version, delete the Home Screen icon and add it again.
- **Silent switch / Focus modes.** On iOS 17+ the app asks to play like a media app, so the beeps should come through even when the phone is on silent. If you don't hear cues, flip the ring/silent switch off and turn up the **media** volume.
- If your music is playing, the voice cues will briefly play over it.

## Files

`index.html`, `style.css`, `app.js` (all logic), `sw.js` (offline cache), `manifest.webmanifest`, `icons/`, `fonts/` (Bebas Neue, OFL), `audio/` (voice clips). There's no build step. To run it locally: `python3 -m http.server`, then open http://localhost:8000.

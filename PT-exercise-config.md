# Morning PT — Workout Timer exercise configuration

Exported from the Workout Timer app (repo `ponteran/Workout-Timer`, file `routine.js` → `DEFAULT_TEXT`), for review.

## Summary

| Item | Value |
|---|---|
| Exercises | 26 |
| Total work time | 26:00 |
| Total rest/transition time | 02:34 (25 rests) |
| Get-ready before exercise 1 | 5 s |
| **Total session length** | **28:39** |

## Timing rules (app settings)

- **Work length:** "1" = 60 s, "2" = 120 s. Values written as `40s` are fixed seconds.
- **Rest between exercises:** 5 s, also 5 s on a position change. The exception is lines marked `rest before N`.
- **No rest after the last exercise.**
- **Countdown:** spoken 5‑4‑3‑2‑1 at the end of each exercise. Inside split exercises (intervals, switch) it's 3‑2‑1 before each change, except after parts shorter than 6 s (the 4 s PNF relax), which stay quiet.

## Voice cues

| When | You hear |
|---|---|
| Start | "Get ready. First up: [exercise]." |
| Start of each exercise | Beep, then "Work!" |
| Each rest | "Rest! Next: [exercise]." On a position change: "Rest! Next: [position]. [exercise]." |
| Hamstring PNF | "Contract!" / "Relax!" / "Extend!" at each part |
| Halfway on `switch` exercises | "Switch!" |
| Plank, alternating leg lift, at 0:30 | "Stretch!" |
| End | "Workout complete. Great job!" |

## Schedule

Times are measured from pressing Start.

| # | Start | End | Work | Rest before | Position | Exercise | Within-exercise cues |
|---|---|---|---|---|---|---|---|
| 1 | 00:05 | 01:05 | 60 s | 5 s (get ready) | Supine | Knee extension, roller under BOTH knees | — |
| 2 | 01:10 | 02:10 | 60 s | 5 s | Supine | Knee flexion gapping, towel, BOTH knees | — |
| 3 | 02:24 | 04:24 | 120 s | 14 s (custom) | Supine | Hamstring PNF — BILATERAL 3 cycles | 3 × (contract 6 s + relax 4 s + extend 30 s); cue at each part |
| 4 | 04:29 | 05:29 | 60 s | 5 s | Supine | Hollow body hold | — |
| 5 | 05:34 | 06:34 | 60 s | 5 s (position change) | Seated | End-range knee ext., roller under BOTH heels | — |
| 6 | 06:39 | 07:39 | 60 s | 5 s | Seated | 90-90 hip switches - 2x10 / side | — |
| 7 | 07:44 | 08:44 | 60 s | 5 s (position change) | Supine | Glute bridge LEFT | — |
| 8 | 08:49 | 09:49 | 60 s | 5 s | Supine | Glute bridge RIGHT | — |
| 9 | 09:54 | 10:54 | 60 s | 5 s (position change) | Side-lying | SLR lateral LEFT | — |
| 10 | 10:59 | 11:59 | 60 s | 5 s | Side-lying | Side plank LEFT | — |
| 11 | 12:04 | 13:04 | 60 s | 5 s | Side-lying | SLR lateral RIGHT | — |
| 12 | 13:09 | 14:09 | 60 s | 5 s | Side-lying | Side plank RIGHT | — |
| 13 | 14:14 | 15:14 | 60 s | 5 s (position change) | Prone | SLR prone LEFT | — |
| 14 | 15:19 | 16:19 | 60 s | 5 s | Prone | SLR prone RIGHT | — |
| 15 | 16:24 | 17:24 | 60 s | 5 s | Prone | Plank, alternating leg lift | "Stretch!" at 30 s (30 s + 30 s) |
| 16 | 17:29 | 18:09 | 40 s | 5 s (position change) | Quadruped | Bird dog | "Switch!" at 20 s (20 s + 20 s) |
| 17 | 18:14 | 18:54 | 40 s | 5 s | Quadruped | Cat-cow | — |
| 18 | 18:59 | 19:39 | 40 s | 5 s | Quadruped | World's greatest stretch | "Switch!" at 20 s (20 s + 20 s) |
| 19 | 19:44 | 20:44 | 60 s | 5 s (position change) | Kneeling | Pigeon LEFT | — |
| 20 | 20:49 | 21:49 | 60 s | 5 s | Kneeling | Pigeon RIGHT | — |
| 21 | 22:04 | 23:04 | 60 s | 15 s (custom) | Kneeling | Couch stretch LEFT | — |
| 22 | 23:09 | 24:09 | 60 s | 5 s | Kneeling | Couch stretch RIGHT | — |
| 23 | 24:24 | 25:24 | 60 s | 15 s (custom, position change) | Standing | Foam stance, eyes open LEFT | — |
| 24 | 25:29 | 26:29 | 60 s | 5 s | Standing | Foam stance, eyes open RIGHT | — |
| 25 | 26:34 | 27:34 | 60 s | 5 s | Standing | Stance eyes closed LEFT | — |
| 26 | 27:39 | 28:39 | 60 s | 5 s | Standing | Stance eyes closed RIGHT | — |

## Raw configuration (as entered in the app)

Format: `length | position | exercise | options`. Options: `contract 6, relax 4, extend 30` = repeating timed parts; `switch` = "Switch!" halfway; `stretch at 30` = "Stretch!" 30 s in; `rest before N` = custom rest before this exercise.

```
1 | Supine | Knee extension, roller under BOTH knees
1 | Supine | Knee flexion gapping, towel, BOTH knees
2 | Supine | Hamstring PNF — BILATERAL 3 cycles | contract 6, relax 4, extend 30, rest before 14
1 | Supine | Hollow body hold
1 | Seated | End-range knee ext., roller under BOTH heels
1 | Seated | 90-90 hip switches - 2x10 / side
1 | Supine | Glute bridge LEFT
1 | Supine | Glute bridge RIGHT
1 | Side-lying | SLR lateral LEFT
1 | Side-lying | Side plank LEFT
1 | Side-lying | SLR lateral RIGHT
1 | Side-lying | Side plank RIGHT
1 | Prone | SLR prone LEFT
1 | Prone | SLR prone RIGHT
1 | Prone | Plank, alternating leg lift | stretch at 30
40s | Quadruped | Bird dog | switch
40s | Quadruped | Cat-cow
40s | Quadruped | World's greatest stretch | switch
1 | Kneeling | Pigeon LEFT
1 | Kneeling | Pigeon RIGHT
1 | Kneeling | Couch stretch LEFT | rest before 15
1 | Kneeling | Couch stretch RIGHT
1 | Standing | Foam stance, eyes open LEFT | rest before 15
1 | Standing | Foam stance, eyes open RIGHT
1 | Standing | Stance eyes closed LEFT
1 | Standing | Stance eyes closed RIGHT
```

## Changes from the original PT list

| Original | In the app | Why |
|---|---|---|
| Hamstring PNF, minutes 3–4 (one 2‑min block, "3 cycles", contract‑relax) | 3 × (6 s contract + 4 s relax + 30 s extend) | Restores the contraction that makes it PNF (video review, Nov 23) |
| Bird dog, Cat‑cow, World's greatest stretch, 1 min each | 40 s each (2 min total) | Requested |
| Bird dog, World's greatest stretch | "Switch!" at the halfway point | Change sides. Removed from the alternating plank (it already changes legs every rep) |
| World's greatest stretch: Standing | Quadruped | It's done from all fours, with no standing up |
| All transitions 5 s | 14 s before Hamstring PNF; 15 s before Couch stretch LEFT; 15 s before Foam stance LEFT | Time to set up the PNF / get into position; stand up slowly before balance work |
| Plank, alternating leg lift | "Stretch!" at 30 s | Requested (Nov 24) |

## Form notes from the video review (Nov 23, 2026)

| Exercise | Seen on video | Do instead |
|---|---|---|
| Glute bridge L/R | Hips barely off the mat and sinking over the minute | Reps: drive up until knee–hip–shoulder line up, 2 s hold, lower (~10–12 per minute). Bend the free knee if it stops you reaching that line |
| Plank, alternating leg lift | Hips piked throughout | Glutes tight, hips level with shoulders. Lower lifts or knees down if form fails |
| Bird dog | ~1.2–1.5 s per rep, kicking | 5 per side with a 2 s hold at full extension |
| Hamstring PNF | Head and shoulders curl up during the stretch | Head on the towel, tailbone down. Light push (not maximal) on "Contract", breathe out, no breath‑hold |
| Stance eyes closed | Frequent touch‑downs, one large catch | Normal at this level. Do it next to a counter |
| 90‑90 hip switches | ~19 controlled switches a minute | Keep this pace (≈10 per side). The spoken "2 sets of 10" is just the old label |
| TKEs (outside the timer) | ~1.35 s per rep, no pause, in flip‑flops | 1 s squeeze at full straightening; barefoot or in shoes |

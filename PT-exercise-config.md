# Morning PT — Workout Timer exercise configuration

Exported from the Workout Timer app (repo `ponteran/Workout-Timer`, file `routine.js` → `DEFAULT_TEXT`), for review.

## Summary

| Item | Value |
|---|---|
| Exercises | 26 |
| Total work time | 26:00 |
| Total rest/transition time | 02:10 (25 rests) |
| Get-ready before exercise 1 | 5 s |
| **Total session length** | **28:15** |

## Timing rules (app settings)

- **Work length:** "1" = 60 s, "2" = 120 s. Values written as `40s` are fixed seconds.
- **Rest between exercises:** 5 s, also 5 s on a position change. The exception is lines marked `rest before N`.
- **No rest after the last exercise.**
- **Countdown:** spoken 5‑4‑3‑2‑1 at the end of each exercise. Inside split exercises (intervals, switch) it's 3‑2‑1 before each change.

## Voice cues

| When | You hear |
|---|---|
| Start | "Get ready. First up: [exercise]." |
| Start of each exercise | Beep, then "Work!" |
| Each rest | "Rest! Next: [exercise]." On a position change: "Rest! Next: [position]. [exercise]." |
| Hamstring PNF | "Relax." / "Extend!" at each part |
| Halfway on `switch` exercises | "Switch!" |
| End | "Workout complete. Great job!" |

## Schedule

Times are measured from pressing Start.

| # | Start | End | Work | Rest before | Position | Exercise | Within-exercise cues |
|---|---|---|---|---|---|---|---|
| 1 | 00:05 | 01:05 | 60 s | 5 s (get ready) | Supine | Knee extension, roller under BOTH knees | — |
| 2 | 01:10 | 02:10 | 60 s | 5 s | Supine | Knee flexion gapping, towel, BOTH knees | — |
| 3 | 02:15 | 04:15 | 120 s | 5 s | Supine | Hamstring PNF — BILATERAL 3 cycles | 3 × (relax 10 s + extend 30 s); cue at each part |
| 4 | 04:20 | 05:20 | 60 s | 5 s | Supine | Hollow body hold | — |
| 5 | 05:25 | 06:25 | 60 s | 5 s (position change) | Seated | End-range knee ext., roller under BOTH heels | — |
| 6 | 06:30 | 07:30 | 60 s | 5 s | Seated | 90-90 hip switches - 2x10 / side | — |
| 7 | 07:35 | 08:35 | 60 s | 5 s (position change) | Supine | Glute bridge LEFT | — |
| 8 | 08:40 | 09:40 | 60 s | 5 s | Supine | Glute bridge RIGHT | — |
| 9 | 09:45 | 10:45 | 60 s | 5 s (position change) | Side-lying | SLR lateral LEFT | — |
| 10 | 10:50 | 11:50 | 60 s | 5 s | Side-lying | Side plank LEFT | — |
| 11 | 11:55 | 12:55 | 60 s | 5 s | Side-lying | SLR lateral RIGHT | — |
| 12 | 13:00 | 14:00 | 60 s | 5 s | Side-lying | Side plank RIGHT | — |
| 13 | 14:05 | 15:05 | 60 s | 5 s (position change) | Prone | SLR prone LEFT | — |
| 14 | 15:10 | 16:10 | 60 s | 5 s | Prone | SLR prone RIGHT | — |
| 15 | 16:15 | 17:15 | 60 s | 5 s | Prone | Plank, alternating leg lift | "Switch!" at 30 s (30 s + 30 s) |
| 16 | 17:20 | 18:00 | 40 s | 5 s (position change) | Quadruped | Bird dog | "Switch!" at 20 s (20 s + 20 s) |
| 17 | 18:05 | 18:45 | 40 s | 5 s | Quadruped | Cat-cow | — |
| 18 | 18:50 | 19:30 | 40 s | 5 s (position change) | Standing | World's greatest stretch | "Switch!" at 20 s (20 s + 20 s) |
| 19 | 19:35 | 20:35 | 60 s | 5 s (position change) | Kneeling | Pigeon LEFT | — |
| 20 | 20:40 | 21:40 | 60 s | 5 s | Kneeling | Pigeon RIGHT | — |
| 21 | 21:50 | 22:50 | 60 s | 10 s (custom) | Kneeling | Couch stretch LEFT | — |
| 22 | 22:55 | 23:55 | 60 s | 5 s | Kneeling | Couch stretch RIGHT | — |
| 23 | 24:00 | 25:00 | 60 s | 5 s (position change) | Standing | Foam stance, eyes open LEFT | — |
| 24 | 25:05 | 26:05 | 60 s | 5 s | Standing | Foam stance, eyes open RIGHT | — |
| 25 | 26:10 | 27:10 | 60 s | 5 s | Standing | Stance eyes closed LEFT | — |
| 26 | 27:15 | 28:15 | 60 s | 5 s | Standing | Stance eyes closed RIGHT | — |

## Raw configuration (as entered in the app)

Format: `length | position | exercise | options`. Options: `relax 10, extend 30` = repeating timed parts; `switch` = "Switch!" halfway; `rest before N` = custom rest before this exercise.

```
1 | Supine | Knee extension, roller under BOTH knees
1 | Supine | Knee flexion gapping, towel, BOTH knees
2 | Supine | Hamstring PNF — BILATERAL 3 cycles | relax 10, extend 30
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
1 | Prone | Plank, alternating leg lift | switch
40s | Quadruped | Bird dog | switch
40s | Quadruped | Cat-cow
40s | Standing | World's greatest stretch | switch
1 | Kneeling | Pigeon LEFT
1 | Kneeling | Pigeon RIGHT
1 | Kneeling | Couch stretch LEFT | rest before 10
1 | Kneeling | Couch stretch RIGHT
1 | Standing | Foam stance, eyes open LEFT
1 | Standing | Foam stance, eyes open RIGHT
1 | Standing | Stance eyes closed LEFT
1 | Standing | Stance eyes closed RIGHT
```

## Changes from the original PT list

| Original | In the app | Why |
|---|---|---|
| Hamstring PNF, minutes 3–4 (one 2‑min block, "3 cycles") | 3 × (10 s relax + 30 s extend) | Requested cue timing |
| Bird dog, Cat‑cow, World's greatest stretch, 1 min each | 40 s each (2 min total) | Requested |
| Plank (alt. leg lift), Bird dog, World's greatest stretch | "Switch!" at the halfway point | Change sides |
| All transitions 5 s | 10 s before Couch stretch LEFT | Needs time to get into position |

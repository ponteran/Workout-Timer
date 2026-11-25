# Morning PT — Workout Timer exercise configuration

Exported from the Workout Timer app (repo `ponteran/Workout-Timer`, file `routine.js` → `DEFAULT_TEXT`), for review.

## Summary

| Item | Value |
|---|---|
| Exercises | 26 |
| Total work time | 26:20 |
| Total rest/transition time | 02:34 (25 rests) |
| Get-ready before exercise 1 | 5 s |
| **Total session length** | **28:59** |

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
| Halfway on `switch` exercises (Plank, Bird dog, World's greatest stretch) | "Switch!" |
| End | "Workout complete. Great job!" |

## Schedule

Times are measured from pressing Start.

| # | Start | End | Work | Rest before | Position | Exercise | Within-exercise cues |
|---|---|---|---|---|---|---|---|
| 1 | 00:05 | 01:05 | 60 s | 5 s (get ready) | Supine | Knee extension, roller under knees | — |
| 2 | 01:10 | 02:10 | 60 s | 5 s | Supine | Knee flexion gapping, towel under knees | — |
| 3 | 02:24 | 04:24 | 120 s | 14 s (custom) | Supine | Hamstring PNF — BILATERAL 3 cycles | 3 × (contract 6 s + relax 4 s + extend 30 s); cue at each part |
| 4 | 04:29 | 05:29 | 60 s | 5 s | Supine | Hollow body hold | — |
| 5 | 05:34 | 06:34 | 60 s | 5 s (position change) | Seated | End-range knee ext., roller under BOTH heels | — |
| 6 | 06:39 | 07:39 | 60 s | 5 s | Seated | 90-90 hip switches | — |
| 7 | 07:44 | 08:44 | 60 s | 5 s (position change) | Supine | Glute bridge LEFT | — |
| 8 | 08:49 | 09:49 | 60 s | 5 s | Supine | Glute bridge RIGHT | — |
| 9 | 09:54 | 10:54 | 60 s | 5 s (position change) | Side-lying | SLR lateral LEFT | — |
| 10 | 10:59 | 11:59 | 60 s | 5 s | Side-lying | Side plank RIGHT | — |
| 11 | 12:04 | 13:04 | 60 s | 5 s | Side-lying | SLR lateral RIGHT | — |
| 12 | 13:09 | 14:09 | 60 s | 5 s | Side-lying | Side plank LEFT | — |
| 13 | 14:14 | 15:14 | 60 s | 5 s (position change) | Prone | SLR prone LEFT | — |
| 14 | 15:19 | 16:19 | 60 s | 5 s | Prone | SLR prone RIGHT | — |
| 15 | 16:24 | 17:24 | 60 s | 5 s | Prone | Plank, alternating leg lift | "Switch!" at 30 s (30 s + 30 s) |
| 16 | 17:29 | 18:29 | 60 s | 5 s (position change) | Quadruped | Bird dog | "Switch!" at 30 s (30 s + 30 s) |
| 17 | 18:34 | 19:14 | 40 s | 5 s | Quadruped | Cat-cow | — |
| 18 | 19:19 | 19:59 | 40 s | 5 s | Quadruped | World's greatest stretch | "Switch!" at 20 s (20 s + 20 s) |
| 19 | 20:04 | 21:04 | 60 s | 5 s (position change) | Kneeling | Pigeon RIGHT | — |
| 20 | 21:09 | 22:09 | 60 s | 5 s | Kneeling | Pigeon LEFT | — |
| 21 | 22:24 | 23:24 | 60 s | 15 s (custom) | Kneeling | Couch stretch RIGHT | — |
| 22 | 23:29 | 24:29 | 60 s | 5 s | Kneeling | Couch stretch LEFT | — |
| 23 | 24:44 | 25:44 | 60 s | 15 s (custom, position change) | Standing | Foam stance, eyes open RIGHT | — |
| 24 | 25:49 | 26:49 | 60 s | 5 s | Standing | Foam stance, eyes open LEFT | — |
| 25 | 26:54 | 27:54 | 60 s | 5 s | Standing | Stance eyes closed RIGHT | — |
| 26 | 27:59 | 28:59 | 60 s | 5 s | Standing | Stance eyes closed LEFT | — |

## Raw configuration (as entered in the app)

Format: `length | position | exercise | options`. Options: `contract 6, relax 4, extend 30` = repeating timed parts; `switch` = "Switch!" halfway; `<word> at N` = say that word N s in; `rest before N` = custom rest before this exercise.

```
1 | Supine | Knee extension, roller under knees
1 | Supine | Knee flexion gapping, towel under knees
2 | Supine | Hamstring PNF — BILATERAL 3 cycles | contract 6, relax 4, extend 30, rest before 14
1 | Supine | Hollow body hold
1 | Seated | End-range knee ext., roller under BOTH heels
1 | Seated | 90-90 hip switches
1 | Supine | Glute bridge LEFT
1 | Supine | Glute bridge RIGHT
1 | Side-lying | SLR lateral LEFT
1 | Side-lying | Side plank RIGHT
1 | Side-lying | SLR lateral RIGHT
1 | Side-lying | Side plank LEFT
1 | Prone | SLR prone LEFT
1 | Prone | SLR prone RIGHT
1 | Prone | Plank, alternating leg lift | switch
1 | Quadruped | Bird dog | switch
40s | Quadruped | Cat-cow
40s | Quadruped | World's greatest stretch | switch
1 | Kneeling | Pigeon RIGHT
1 | Kneeling | Pigeon LEFT
1 | Kneeling | Couch stretch RIGHT | rest before 15
1 | Kneeling | Couch stretch LEFT
1 | Standing | Foam stance, eyes open RIGHT | rest before 15
1 | Standing | Foam stance, eyes open LEFT
1 | Standing | Stance eyes closed RIGHT
1 | Standing | Stance eyes closed LEFT
```

## Changes from the original PT list

| Original | In the app | Why |
|---|---|---|
| Hamstring PNF, minutes 3–4 (one 2‑min block, "3 cycles", contract‑relax) | 3 × (6 s contract + 4 s relax + 30 s extend) | Restores the contraction that makes it PNF (video review, Nov 23) |
| Bird dog, Cat‑cow, World's greatest stretch, 1 min each | Bird dog 1 min; Cat‑cow and World's greatest stretch 40 s each | 40 s each requested Nov 20; Bird dog back to 1 min (Nov 25 edit) |
| Bird dog, World's greatest stretch | "Switch!" at the halfway point | Change sides |
| World's greatest stretch: Standing | Quadruped | It's done from all fours, with no standing up |
| All transitions 5 s | 14 s before Hamstring PNF; 15 s before Couch stretch RIGHT; 15 s before Foam stance RIGHT | Time to set up the PNF / get into position; stand up slowly before balance work |
| Plank, alternating leg lift | "Switch!" at 30 s (halfway) | Requested (Nov 24), re-added after the Nov 23 review had removed it |
| Knee extension / knee flexion gapping, 90‑90 hip switches | Renamed ("roller under knees", "towel under knees", "90‑90 hip switches") | Nov 25 edit |
| Left/right order of side plank, pigeon, couch stretch, foam stance, eyes‑closed stance | Swapped as listed above | Nov 25 edit |

## Form notes from the video review (Nov 23, 2026)

| Exercise | Seen on video | Do instead |
|---|---|---|
| Glute bridge L/R | Hips barely off the mat and sinking over the minute | Reps: drive up until knee–hip–shoulder line up, 2 s hold, lower (~10–12 per minute). Bend the free knee if it stops you reaching that line |
| Plank, alternating leg lift | Hips piked throughout | Glutes tight, hips level with shoulders. Lower lifts or knees down if form fails |
| Bird dog | ~1.2–1.5 s per rep, kicking | 5 per side with a 2 s hold at full extension |
| Hamstring PNF | Head and shoulders curl up during the stretch | Head on the towel, tailbone down. Light push (not maximal) on "Contract", breathe out, no breath‑hold |
| Stance eyes closed | Frequent touch‑downs, one large catch | Normal at this level. Do it next to a counter |
| 90‑90 hip switches | ~19 controlled switches a minute | Keep this pace (≈10 per side). The "2x10 / side" label was removed from the name (Nov 25) |
| TKEs (outside the timer) | ~1.35 s per rep, no pause, in flip‑flops | 1 s squeeze at full straightening; barefoot or in shoes |

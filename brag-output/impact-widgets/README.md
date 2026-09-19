# Impact — new widgets

76-second, 1920×1080, 60 fps cut. The seven-second intro now starts with the complete “Let's talk about Homarr v2” title, logo and feature imagery visible. The poster is extracted from the actual first encoded frame. All three integration rows move at 70 px/s, down from about 285 px/s. The masonry columns also move more slowly. The 55-integration catalog is represented by a slower selection rather than forcing every icon across the screen in seven seconds.

A new eight-second chapter at 44 seconds presents the three new widgets identified in the release blog: Air Quality, Countdown and Timer. Air Quality and Countdown use fresh focused screenshots from the isolated local Homarr image. The Timer uses native 60 fps X11 video of genuine Start, Pause and Reset button actions, showing 25:00 → 24:57 → 25:00. Its tile was resized from 2×1 to 4×3 in the isolated demo board before recording so labels and controls fit. It remains reset. The primary Homarr instance and application source were not modified.

The chapter explains AQI and location trends, European/US AQI scales, event countdowns with progress, and timer/Pomodoro use. Weather and Clock are not mislabeled as new widgets: the release notes describe them as redesigns. Timer footage and action evidence: `../capture-evidence/new-timer-source.mp4`, `new-timer-events.json`, `record-new-timer.cjs`. Source screenshots and cropped footage: `../composition/assets/new-widgets/`.

The rest of the film retains the previous upgrade sequence, including its ending. The new chapter is inserted between Advanced Widgets and Assistant, and chapter links shift by eight seconds. Audio retains the intro and original feature score, with an eight-second musical insert and six synchronized TIKS accents. Prior capture limitations remain in the review page and `../impact-upgrade/README.md`.

Build: `../build-impact-widgets.py`, `soundtrack.py`, `finish.py`. Review: http://100.111.30.70:3019/impact-widgets/

Composition checks passed: zero lint/runtime/layout/motion findings; 238/238 intro and 56/56 widget contrast checks passed. Intentionally masked masonry captions are marked for clipped-content occlusion. Both renders used BeginFrame at 60 fps.

Final verification: 76 seconds, 4,560 frames, 1920×1080 at 60 fps. Browser measurements confirm all three marquee speeds are exactly 70 px/s and all headline lines are fully opaque at t=0. Intro and widget playback decoded 908 frames with no dropped frames or browser errors. The existing ending is retained: a corresponding frame comparison against the original ending scored SSIM 0.998880, with the small difference caused by re-encoding. Encoded audio measures −16.96 LUFS integrated and −2.37 dBFS true peak. Evidence is in `verification.json`, `ending-comparison.log` and `audio-verification.log`.

Taildrop delivered to Obsidian (100.105.184.54) as `homarr-v2-impact-widgets-60fps.mp4`. Receiver accepted all 26,859,413 bytes with HTTP 200; response headers and transfer log are saved alongside the video.

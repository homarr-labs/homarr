# Impact — refined

43-second Homarr 2.0 cut. New pointer capture, Shift-open advanced view, short explanatory subtitles, twin confetti emitters, and TIKS sound effects. Earlier cuts are preserved.

## Captures

The isolated `homarr-film-capture` demo at 127.0.0.1:7589 was recorded on a dedicated Xvfb display. FFmpeg captured the real browser at 60 fps; mouse movement used 60 successive real pointer inputs per gesture instead of 12 separate CLI steps. The sampled one-second drag segment contains 48 distinct captured frames. The final video is 60 fps, with no generated intermediate frames. Drag footage is accelerated 1.12× and cropped to the calendar/weather grid. Both shrinking and expanding the weather tile are real UI interactions.

The advanced scene records the Downloads widget opening while Shift is held and closing on release. The original Pomodoro screenshot collage was removed. The on-screen instruction tells viewers to hover a widget and hold Shift for one second. This is an instruction, not an exact activation threshold: the current source uses a 500 ms hover delay. Capture uses an older local demo image.

Custom Widgets, sidebar, Assistant, and onboarding assets retain the previous capture provenance. Header studio still uses the release screenshot because the available local image predates that feature. Assistant footage shows controls rather than a simulated tool conversation.

## Sound

The original music bed is mixed with 34 synchronized accents from `@rexa-developer/tiks` 0.3.0: crisp clicks, soft pops/toggles, crisp swooshes, glass success chime, and sparse hover ticks during the confetti. The actual package synthesis was rendered through OfflineAudioContext; seeded noise makes the generated WAV assets reproducible. Presets are panned and gain-matched, with the music lowered to give cues space. MIT license is preserved in the assets folder. No narration or licensed music is used.

`mix-sound.py` builds the mix; `sound-cues.json` records cue timestamps. Loudness normalization targets −17 LUFS. Render validation, stream metadata and final audio measurement live beside this README.

## Final verification

Export: 1920×1080, 60 fps, 2580 frames, 43 seconds, AAC stereo. Encoded mix: −17.0 LUFS integrated, −2.7 dBFS true peak. Frame inspection confirmed the real resize state, expanded Downloads view, readable subtitles and twin confetti burst. Composition checks passed with zero runtime/layout/motion errors and 22/22 contrast checks; one advisory remains about eight scenes sharing a timeline track. Audio was measured rather than subjectively auditioned. The Tailscale page and chapter playback were checked in a real browser with audio enabled.

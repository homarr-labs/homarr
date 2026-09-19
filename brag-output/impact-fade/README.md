# Homarr v2 — Alternating columns / fade reveal

Revision of `../impact-direct/`. Duration stays 112⅔ seconds, 1920 × 1080, 60 fps.

- Eight individual vertical columns cover the frame. Each has a different initial row offset. Adjacent columns move in opposite directions at 160 px/s. All 87 integrations pass through the frame; repeated copies keep the field filled. A two-second opacity fade from 4.4s to 6.4s reveals the opening. No split panels or sideways exit remain.
- Timer's actual video is inside its animated widget card, so its opacity and vertical entrance are inherited alongside the label and description. The visual wrapper is untimed; the video owns media timing. Air Quality and Countdown retain their original stagger.
- The seven-second outro explicitly announces the Workshop merch giveaway: our favorite submissions receive exclusive Homarr merch at year's end. It ends with the requested “Better get cooking if you want to wear some dope lobster merch.” Donation thanks remain.
- The revealed intro is used as the player poster. The video itself opens on the full integration marquee.

Go Funk and TIKS remain. Opening accents are softened to suit the fade. The focused Pokédex, grounded feature copy, 1.5× drag/drop and Cmd-click demos, and all other chapters are retained.

The favorite-submissions/year-end giveaway and CTA are the user's instructions. Earlier capture provenance and source references remain in `../impact-direct/README.md`.

Build: `../build-impact-fade.py`, `check-scenes.py`, `render-scenes.py`, `mix-music.py`, `finish.py`. Verification: `verify.cjs`, scene snapshots and logs.

Review: http://100.111.30.70:3019/impact-fade/

Taildrop delivered to Obsidian (100.105.184.54) as `homarr-v2-marquee-fade-workshop-giveaway-60fps.mp4`: HTTP 200, 37,692,872 bytes uploaded. See `taildrop.log` and `taildrop-response-headers.txt`.

Final verification: all three scene checks passed. Export has 6,760 frames at 60 fps. All 87 integrations become fully visible, eight offsets are distinct, adjacent columns move in opposite directions, and the overlay opacity reaches exactly zero. Timer is hidden at 0s and 0.2s, partially visible with its card at 0.5s, and fully visible at 1s; relative card/video position is constant. The encoded first widget frame was visually checked. Browser playback covered 5 chapters with 0 dropped frames among 1582 observed and no page errors. Encoded audio: −17.31 LUFS integrated, −2.53 dBTP.

# Game time is counted in fixed 60 TPS ticks

All game logic advances in fixed 1/60 s ticks: a `requestAnimationFrame` accumulator runs at most 5 catch-up ticks per frame and drops any backlog beyond that (D2). Input is sampled once per tick, and "just pressed" means pressed this tick but not the last (D3). Durations, speeds and animations are written in ticks, never in milliseconds or `Date.now()`. This keeps speed the same on 60 Hz and 120 Hz screens, and it makes every run replayable tick for tick, which the parity fixtures and the test hook depend on.

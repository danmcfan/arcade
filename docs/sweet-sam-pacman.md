# Sweet Sam follows Pac-Man

Sweet Sam plays as close to the arcade Pac-Man as it can. For any gameplay question (timings, counts, points, what a death resets), the answer is what Pac-Man does. The source is Jamey Pittman's **Pac-Man Dossier**: <https://pacman.holenet.info/>. Read the relevant section before you decide or change a rule, and cite it in the issue or PR.

Diverge only when the owner decides to, and record the divergence and its reason in the code comment beside the rule.

## Terms

| Pac-Man   | Sweet Sam      |
| --------- | -------------- |
| Pac-Man   | Sam (the bear) |
| Dot       | Honey drop     |
| Energizer | Honey pot      |
| Ghost     | Bee            |
| Fruit     | Bonus flower   |
| Round     | Level          |

## Bonus fruit (Dossier, "The Basics" and Table A.1)

- **When:** below the ghost pen, twice a round: after 70 dots and after 170 dots are eaten. The Dossier counts all 244 maze objects as dots, energizers included.
- **How long:** between 9 and 10 seconds; the exact time is not predictable.
- **Points by round:**

  | Round | Symbol     | Points |
  | ----- | ---------- | ------ |
  | 1     | Cherries   | 100    |
  | 2     | Strawberry | 300    |
  | 3–4   | Peach      | 500    |
  | 5–6   | Apple      | 700    |
  | 7–8   | Grapes     | 1,000  |
  | 9–10  | Galaxian   | 2,000  |
  | 11–12 | Bell       | 3,000  |
  | 13+   | Key        | 5,000  |

- **Level counter:** the bottom edge shows the symbols of the last six rounds completed plus the current round, seven at most.
- **On a death:** the Dossier does not say. In the arcade game, the fruit is removed when Pac-Man dies.

## Where Sweet Sam stays different

The Dossier audit (#206) checked every section and found these differences. We keep them on purpose:

- **No level 256 split screen** (Dossier, "Deciphering The Split Screen"). The split screen was caused by an 8-bit overflow, not a design choice. Sweet Sam keeps playing the top level's values for as long as you survive.
- **No Ghost Bug** (Appendix B, "Ghost Bug"). A bee never turns up at one of the four no-up junctions while chasing or scattering (`noUpTiles`, `src/sweet-sam/entity.ts`). The bug only appears with frame-exact arcade timing, which Sweet Sam does not reproduce.
- **No repeatable patterns** (Dossier, "Frightening Behavior"). A sleepy bee picks a random open exit from the game's seeded `rng`. It does not use the arcade's reseeded PRNG with its up, left, down, right fallback. Arcade patterns depend on the arcade's exact frame timings, which Sweet Sam does not reproduce, so copying the PRNG alone would not bring them back.
- **Bees decide at the junction, not one tile ahead** (Dossier, "Looking Ahead"). A bee picks its exit when it reaches a junction, measuring from the tiles next to it. That gives the same choice as the Dossier's look-ahead. The only change is that the bear's position is read up to one tile later.
- **One difficulty, no Namco easter egg** (Table A.2 and Appendix B). Sweet Sam plays the Dossier's "Normal" settings and has no DIP switches or service-mode tricks.

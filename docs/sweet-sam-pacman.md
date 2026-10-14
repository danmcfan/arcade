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

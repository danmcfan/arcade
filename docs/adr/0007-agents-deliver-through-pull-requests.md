# Agents deliver through pull requests; a person merges

Every change, small ones included, lands through a pull request from its own branch. The repo owner reviews it on GitHub and merges it. Agents never push to `main` or merge. Pushes to `main` deploy to GitHub Pages straight away, and CI (`.github/workflows/ci.yml`) only runs on pull requests, so a PR is the only path that gets checked before players see it. User-visible changes come with screenshots or a video in the PR, because the reviewer judges look and feel from those. The workflow is in `docs/agents/delivery.md`.

# CLAUDE.md

Shared context for every Claude session on this repo. Three teammates work in parallel, each with their own Claude account, so **Claude memory is not shared between us — this repo is the shared memory.** Read this file and `docs/STATUS.md` before doing anything. If this is your first session on the repo, also read `docs/PROJECT_HISTORY.md` (why every decision was made) and `docs/PROJECT_PLAN.md` (what we're building and who does what).

## Project

- **Event:** NASA Space Apps Challenge 2026, 14–15 November 2026 (48 hours).
- **Team:** 3TE (GitHub org `3TEngineers`), three computer engineering students.
- **Challenge:** *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars* — full brief in `docs/CHALLENGE.md`.
- **Our approach:** interactive website — pick a Moon/Mars landing site, fly to its Earth analogs, see where they match, where they don't and what could be tested there. Full plan in `docs/PROJECT_PLAN.md`; decisions in `docs/STATUS.md`.
- **Data contract:** `docs/DATA_CONTRACT.md`. The pipeline writes `app/public/data/*.json`; the app only reads them.

## Language

- Talk to teammates in **Turkish**.
- Write everything that goes into the repo in **English**: code, comments, docs, commit messages, PR titles and descriptions, UI text. Judges are international.

## Working rules

1. **Start every session** by reading `docs/STATUS.md` and pulling `main`.
2. **Record progress as you go.** When a piece of work is finished, update `docs/STATUS.md` (what was done, what's next, any decision made and why) in the same PR. If it isn't in STATUS.md, the other two don't know it happened.
3. **Branches:** never push to `main` directly and never force push. The repo is private on GitHub's free plan, so GitHub does **not** enforce this — a local hook does. Run `git config core.hooksPath .githooks` once after cloning; it then rejects any push to `main`. Branch from an up-to-date `main` as `feat/<short-name>`, `fix/<short-name>` or `docs/<short-name>`.
4. **Small PRs, merged often.** Open a PR into `main` as soon as something works. No approval is required (so nobody gets blocked overnight), but ask a teammate for a quick look when they're around, then squash-merge.
5. **The repo is private** until submission, so other teams can't copy the idea. Still no credentials or personal data in commits.
6. **No stacked PRs.** Always branch from `main`, never from another open PR's branch — if the first PR merges first, the second one merges into a dead branch and its code never reaches `main`.
7. **Stay in your area.** Each teammate owns a folder (see "Ownership" below). Editing someone else's area is fine when needed, but say so in the PR.
8. **Commit messages:** Conventional Commits, English, e.g. `feat(pipeline): add slope roughness for Earth grid`.

## Ownership

| Area | Folder | Owner |
|---|---|---|
| Backend: data, scoring, JSON output | `pipeline/`, `notebooks/` | Sadık (`SadikBoraErteni`) |
| Frontend: globes and animation | `app/src/globe/` | Deniz (`DenizASL4N`) |
| Frontend: panels, pages, content, slides | `app/src/panels/`, `app/src/pages/`, site text in `docs/` | Kmar (`kmarrabid-ai`) |
| Shared contract | `docs/DATA_CONTRACT.md`, `app/src/types/data.ts`, `pipeline/schema.py`, `app/public/data/` | Change only by agreement |

Each person's step-by-step tasks (B0–B9, D1–D7, K1–K8) are in `docs/PROJECT_PLAN.md`.

## Data rules

- **Never commit raw or large data.** Everything under `data/` is git-ignored except its README. Rasters (`.tif`, `.img`, `.nc`, `.h5`) are ignored everywhere.
- Small, final outputs the app needs (e.g. a few MB of JSON/Parquet) go in `app/public/data/` and are committed on purpose.
- Every dataset we use gets an entry in `docs/DATA_SOURCES.md`: name, link, resolution, coverage, access notes, and whether we actually downloaded and checked it.

## Secrets

- Credentials (Earthdata Login, API keys) go in a local `.env`, never in code or commits. `.env.example` lists the variable names without values.

## Scientific honesty

The challenge rewards explaining **where an analogy breaks down**, not only where it holds. Do not present a claim as fact unless it's backed by data or a cited source; label hypotheses as hypotheses. Earth cannot reproduce lunar/Martian gravity, vacuum, the thin Martian atmosphere or space radiation — say so explicitly in outputs.

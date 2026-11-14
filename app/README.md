# app/

Web application that presents the results. Owners: Deniz (`src/globe/`) and Kmar (`src/panels/`, `src/pages/`). Plan and steps: [`docs/PROJECT_PLAN.md`](../docs/PROJECT_PLAN.md).

## Already here

- `public/data/sites.json`, `public/data/analogs.json` — **mock** data in the agreed shape ([`docs/DATA_CONTRACT.md`](../docs/DATA_CONTRACT.md)). The pipeline replaces them with real output; keep reading them through the types below.
- `src/types/data.ts` — TypeScript types for those files.

## Scaffolding (step D1)

Scaffold Vite into this existing folder so the files above stay in place:

```bash
cd app
npm create vite@latest . -- --template react-ts
```

When Vite warns that the folder isn't empty, choose to **ignore existing files** (do not remove them). Then add Tailwind and `react-globe.gl`.

Stack: React + TypeScript + Vite, Tailwind CSS, `react-globe.gl`, deployed on Vercel.

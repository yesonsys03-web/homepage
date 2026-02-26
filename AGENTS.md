# AGENTS.md
Repository guide for autonomous coding agents working in `vibecoder-playground`.

## 1) Project Snapshot
- Python `>=3.12` (`pyproject.toml`)
- FastAPI app at `app/main.py`
- Package/env manager: `uv` only (`docs/UV_WORKFLOW.md`)
- App entrypoint: `app.main:app` with `/health`
- Lockfile present: `uv.lock`

## 2) Source of Truth (Read First)
1. `pyproject.toml` - runtime constraints and dependencies
2. `docs/UV_WORKFLOW.md` - required install/run workflow
3. `app/main.py` - coding style baseline
4. `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md` - branch/commit/PR process
5. `.github/pull_request_template.md` - PR content/checklist
6. `docs/IMPLEMENTATION_LEARNING_LOG.md` - mandatory change log cadence

## 3) Cursor/Copilot Rules Status
- `.cursorrules`: not found
- `.cursor/rules/`: not found
- `.github/copilot-instructions.md`: not found
- Use this file + docs above as the policy set.

## 4) Setup and Environment
Repo root: `/Users/usabatch/coding/vibecoder-playground`

Initial sync:
```bash
uv sync
```

Reproducible sync (lockfile-enforced):
```bash
uv sync --frozen
```

Repository-verified commands:
- `uv --version`
- `uv run python --version` (3.12.12 observed)
- `uv sync --frozen`

## 5) Run Commands (Dev / Build / Test / Lint)
### Development server
```bash
uv run uvicorn app.main:app --reload
```

### Build/health proxy
- No dedicated build script exists.
- Use `uv sync --frozen` plus app import/start checks as build health.

### Tests
Current status:
- No tests committed yet (`tests/` absent currently).
- `pytest` not installed by default.

Install dev tools (documented in `docs/UV_WORKFLOW.md`):
```bash
uv add --dev pytest ruff
```

Run full suite:
```bash
uv run pytest
```

Run one test file:
```bash
uv run pytest tests/test_health.py
```

Run one test function:
```bash
uv run pytest tests/test_health.py::test_health
```

If using `unittest` style tests:
```bash
uv run python -m unittest tests.test_health
```

### Lint / Typecheck / Format
Current status:
- `ruff` not installed by default
- `basedpyright` not installed by default
- No formatter/linter config committed yet

Suggested bootstrap:
```bash
uv add --dev ruff basedpyright
uv run ruff check .
uv run ruff format .
uv run basedpyright
```

## 6) Code Style Guidelines
Derived from `app/main.py` and project docs.

### Imports
- Use explicit imports (example: `from fastapi import FastAPI`)
- Keep imports at module top
- Prefer absolute imports
- Group order when needed: stdlib, third-party, local

### Formatting
- Follow PEP 8 defaults (4 spaces, no tabs)
- Keep functions concise and readable
- Avoid trailing whitespace and dead commented code
- Default to ASCII unless file already requires Unicode

### Types
- Add parameter and return type hints for new functions
- Follow current style (`dict[str, str]`)
- Avoid `Any` unless justified
- Do not suppress type errors with ignore comments

### Naming
- Files/modules: `snake_case.py`
- Variables/functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Route handlers should describe behavior (`health`, `create_project`, etc.)

### FastAPI Structure
- Keep `app = FastAPI(...)` at module scope
- Use explicit decorators (`@app.get`, `@app.post`, ...)
- Return JSON-serializable values with clear types
- Keep endpoints thin; move non-trivial logic into dedicated modules

### Error Handling
- Never use empty `except` blocks
- Return/raise actionable error messages
- API error payloads should align with design doc shape:
  - `code`
  - `message`
  - `field_errors`
- Validate inputs early and fail explicitly

## 7) Git and PR Conventions
From `docs/VIBECODER_PLAYGROUND_DESIGN_SYSTEM.md` and PR template:
- Branch naming: `feature/<scope>`
- One PR per user-value slice
- Commit message format: `type(scope): why`
- Example: `feat(comment): add report flow to prevent abusive feedback`
- PR should include: what changed, why, screenshots, validation, risks
- Update `docs/IMPLEMENTATION_LEARNING_LOG.md` the same day as changes

## 8) Definition of Done for Agent Changes
Before finishing:
1. Run `uv sync --frozen` when dependency-sensitive
2. Verify imports/startup for touched modules
3. Run relevant tests (or document missing test infra)
4. Run lint/type checks when tooling is present
5. Update docs/logs when workflow/process behavior changes

## 9) Practical Guidance for This Repo Stage
- Repo is early-stage scaffold: choose simple explicit solutions
- Add tooling incrementally and document each addition
- Start tests with `tests/test_health.py`, then extend by feature
- Keep all package instructions `uv`-first (`pip install` is out of policy)
- If adding CI, base installation on `uv sync --frozen`

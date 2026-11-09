---
name: safe-commit
description: Safe commit for this repo. Checks staged files (secrets, personal files, large binaries), runs the available checks, proposes a Conventional Commits message and commits only after the user confirms. Never pushes. Use when the user asks for "commit", "safe-commit" or "/safe-commit".
---

# safe-commit

Reply briefly, in the user's preferred language. Do nothing irreversible without confirmation.

## 1. Status
- `git status --short` and `git branch --show-current`.
- If nothing is staged: show modified/untracked files and ask what to add. Do not use `git add -A` / `git add .` without explicit consent; add files by name.
- One commit = one logical change. If the staged files mix unrelated changes, say so and suggest splitting.

## 2. Checks on staged files (`git diff --cached --name-only`)
Stop and report if you find:
- **Personal/ignored files**: `LEARNING.md`, `.DS_Store`, `node_modules/`, `.claude/settings.local.json`.
- **Secrets**: `.env*`, `*.pem`, `*.p12`, `*.keystore`, `*.jks`, `google-services.json`, `GoogleService-Info.plist`, or in the diff: `git diff --cached | grep -nEi '(api[_-]?key|secret|token|password|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|AKIA[0-9A-Z]{16})'`.
- **Large files** (> 1 MB) or build output (`build/`, `Pods/`, `.gradle/`, `DerivedData/`, `*.apk`, `*.ipa`).
- **Personal data** in code/tests: real phone numbers, emails (the package collects no data – see CLAUDE.md).
- **Conflict markers** (`<<<<<<<`, `>>>>>>>`) and leftover `console.log`/`debugger`.

## 3. Project checks (only if they exist)
- `package.json` → run the existing scripts among `lint`, `typecheck`, `test`.
- If none exist, say so in one line; do not invent commands.
- If a check fails: show the output and stop.

## 4. Commit message
- Propose a [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) message in English: `type(scope): subject` (≤ 72 characters), scope e.g. `ios`, `android`, `js`, `docs`, `plugin`.
- Body: 1–2 short lines in plain everyday English, *what* and *why* only.
  No technical detail (queues, threads, API names) unless it is the point of the change.
  Example: "From iOS 27 it needs a second code path, and iOS 26 can't be retested on a real iPhone after the upgrade."
- If the change is user-visible, mention `CHANGELOG.md`; if it is an architecture decision, mention `docs/adr/`.
- End with the attribution line required by the session (e.g. `Co-Authored-By: ...`).

## 5. Confirm and commit
- Show briefly: branch, files (one line each, what changed in a few words), proposed message.
- Wait for an explicit "yes". Only then `git commit` with the message via heredoc.
- After the commit: `git log -1 --stat`.

## Never
- `git push`, `--force`, `--no-verify`, `--amend` on existing commits, `git reset --hard`, `git config` — unless the user explicitly asks.
- Commit with failing checks or unresolved issues from step 2.

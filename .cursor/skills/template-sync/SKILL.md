---
name: template-sync
description: Sync an existing project with template changes. Use when the user asks about adding the template remote, merging template updates, or resolving template sync conflicts. When conflicts occur, the agent should resolve them and make reasonable changes based on context.
---

# Template sync

## One-time setup in the project that uses the template

Add the template repo as a second remote:

```bash
git remote add template https://github.com/YOUR_ORG/amplify-template.git
```

## Each time you pull template updates

```bash
git fetch template
git merge template/main
```

## Resolving merge conflicts

When merge conflicts appear, the agent should resolve them and make reasonable changes based on context. Prefer keeping project-specific code where it intentionally differs from the template; accept template changes for shared structure, tooling, and docs. If both sides changed the same area, combine intent (e.g. keep project config values but apply template structure). After resolving, the user should review and commit.

## First sync only (GitHub "Use this template" repos)

If merge reports "refusing to merge unrelated histories":

```bash
git merge template/main --allow-unrelated-histories
```

Resolve conflicts, commit. Later syncs use normal `git merge template/main`.

## Reducing merge conflicts

- Change only the template in the template repo; change only project-specific things in each project.
- When adding a feature in the template, touch as few files as possible and avoid editing the same lines as project-specific edits.
- Document in this repo (or in `.cursor` / `.docs`) what is "template" vs "per-project" so conflicts are easier to resolve.

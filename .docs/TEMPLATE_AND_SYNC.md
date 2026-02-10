# Using this repo as a template and syncing updates

This repo can be used as a template for new projects and kept in sync when you add features to the template.

## Creating a new project from this template

**Option A – GitHub (if this repo is on GitHub)**  
1. Open the template repo on GitHub.  
2. Click **Use this template** → **Create a new repository**.  
3. Clone your new repo and work there.

**Option B – Git clone**  
```bash
git clone <template-repo-url> my-new-project
cd my-new-project
git remote remove origin
git remote add origin <your-new-repo-url>
git push -u origin main
```

Then install deps, configure Amplify, env, etc. per the rest of the docs.

---

## Syncing an existing project with template changes

When you add a feature (or fix) in the template and want that change in a project that was created from it:

**One-time setup in the project that uses the template**

Add the template repo as a second remote (use the real template URL):

```bash
git remote add template https://github.com/YOUR_ORG/amplify-template.git
```

**Each time you want to pull template updates**

```bash
git fetch template
git merge template/main
```

Resolve any conflicts (keep project-specific code where it differs from the template), then commit.

**First sync only (if you used GitHub “Use this template”)**  
New repos created that way often have no shared history with the template. If the merge says “refusing to merge unrelated histories”:

```bash
git merge template/main --allow-unrelated-histories
```

Resolve conflicts, commit. Later syncs will have a common history and a normal `git merge template/main` is enough.

---

## Making merge conflicts easier

- Prefer changing only the template in the template repo, and only project-specific things in each project.  
- When you add a new feature in the template, touch as few files as possible and avoid changing the same lines as project-specific edits.  
- Document in this repo (or in `.cursor` / `.docs`) what is “template” vs “per-project” so everyone knows what to keep when resolving conflicts.

---

## Optional: mark this repo as a template on GitHub

In the template repo: **Settings** → **General** → check **Template repository**.  
Then others can use **Use this template** when creating a new repo.

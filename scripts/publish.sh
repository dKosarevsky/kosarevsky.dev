#!/usr/bin/env bash
set -euo pipefail

# Run only when ready to create/update the public repository and request deployment.
repo="dKosarevsky/kosarevsky.dev"
domain="kosarevsky.dev"
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

fail() { printf '%s\n' "$*" >&2; exit 1; }
command -v gh >/dev/null || fail "Install GitHub CLI before publishing."
command -v git >/dev/null || fail "Install Git before publishing."
gh auth status >/dev/null 2>&1 || fail "GitHub CLI authentication or network access is unavailable."
login="$(gh api user --jq .login)"
[[ "${login,,}" == "dkosarevsky" ]] || fail "Expected GitHub account dKosarevsky; authenticated as $login."

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Initialize this project as its own Git repository first."
[[ "$(git rev-parse --show-toplevel)" == "$root" ]] || fail "This project must have its own Git repository."
[[ "$(git branch --show-current)" == "main" ]] || fail "Check out the main branch before publishing."
git rev-parse --verify HEAD >/dev/null 2>&1 || fail "Commit the completed site before publishing."
[[ -z "$(git status --porcelain)" ]] || fail "Commit or remove pending changes before publishing."
npm run check
node scripts/build.mjs

origin="$(git remote get-url origin 2>/dev/null || true)"
if [[ -n "$origin" ]]; then
  case "$origin" in
    "https://github.com/$repo"|"https://github.com/$repo.git"|"git@github.com:$repo.git") ;;
    *) fail "Origin points to a different repository: $origin" ;;
  esac
fi

scratch="$(mktemp -d)"
trap 'rm -rf -- "$scratch"' EXIT

if gh api "repos/$repo" >"$scratch/repo.json" 2>"$scratch/error"; then
  # Existing repositories are accepted only when empty or connected to this history.
  remote_refs="$(git ls-remote --heads "https://github.com/$repo.git")"
  if [[ -n "$remote_refs" ]]; then
    [[ -n "$origin" ]] || fail "Existing repository contains branches. Refusing to adopt it without a matching origin."
    git fetch --no-tags origin refs/heads/main
    git merge-base --is-ancestor FETCH_HEAD HEAD ||
      fail "Remote main is not an ancestor of local main. Resolve the histories before publishing."
  fi
else
  if grep -q "HTTP 404" "$scratch/error"; then
    gh repo create "$repo" --public --description "Personal projects and games — kosarevsky.dev"
  else
    cat "$scratch/error" >&2
    fail "Could not determine repository state; no repository was created."
  fi
fi

if [[ -z "$origin" ]]; then
  git remote add origin "https://github.com/$repo.git"
fi
git push --set-upstream origin main

if gh api "repos/$repo/pages" >"$scratch/pages.json" 2>"$scratch/error"; then
  gh api --method PUT "repos/$repo/pages" -f build_type=workflow -f "cname=$domain"
else
  if grep -q "HTTP 404" "$scratch/error"; then
    gh api --method POST "repos/$repo/pages" -f build_type=workflow >/dev/null
    gh api --method PUT "repos/$repo/pages" -f "cname=$domain"
  else
    cat "$scratch/error" >&2
    fail "Could not determine GitHub Pages state; Pages settings were not changed."
  fi
fi

# A new site's initial push may precede Pages setup; explicitly start a fresh run.
gh workflow run pages.yml --repo "$repo" --ref main
printf 'Deployment requested. Follow its result: https://github.com/%s/actions\n' "$repo"
printf 'Configured domain: https://%s (DNS and certificate must also be ready).\n' "$domain"

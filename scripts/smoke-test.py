#!/usr/bin/env python3
"""Smoke test for Amber's Games.

Checks, for every game page:
  1. the HTML returns 200
  2. every inline <script> passes `node --check`
  3. every local <script src> resolves (200)
  4. the page mentions a shared module (hardening.js) unless it is the portal

Usage:  python3 scripts/smoke-test.py [--base https://game.ricky.study]
Exit code 0 = all pass, 1 = failures.
"""
import argparse
import glob
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # games/

SKIP_HTML = {"portal.html", "index.html", "404.html"}
SKIP_DIRS = {"burson-floor", "docs", "waterworks", "node_modules", "vendor",
             ".git", ".codex", ".loopx"}


def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 amber-smoke"})
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.getcode(), r.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return getattr(e, "code", 0) or str(e), ""


def game_pages():
    pages = []
    for f in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        name = os.path.basename(f)
        if name in SKIP_HTML:
            continue
        pages.append(name)
    for d in sorted(glob.glob(os.path.join(ROOT, "*/"))):
        name = os.path.basename(d.rstrip("/"))
        if name in SKIP_DIRS:
            continue
        if os.path.isfile(os.path.join(d, "index.html")):
            pages.append(name + "/index.html")
    return pages


def check_inline(page, html):
    fails = []
    for i, m in enumerate(re.finditer(r"<script([^>]*)>(.*?)</script>", html, re.S)):
        attrs, block = m.group(1), m.group(2)
        if re.search(r"\bsrc\s*=", attrs):
            continue
        if not block.strip():
            continue
        tm = re.search(r"\btype\s*=\s*[\"']([^\"']+)", attrs)
        typ = (tm.group(1) if tm else "").lower()
        if "babel" in typ or "jsx" in typ:
            continue  # JSX compiled in-browser by Babel; not plain JS
        suffix = ".mjs" if "module" in typ else ".js"
        fd, tmp = tempfile.mkstemp(suffix=suffix)
        try:
            with os.fdopen(fd, "w") as fh:
                fh.write(block)
            r = subprocess.run(["node", "--check", tmp], capture_output=True)
            if r.returncode != 0:
                err = r.stderr.decode("utf-8", "replace").strip().splitlines()
                fails.append(f"{page}: inline script #{i} syntax: {err[-1] if err else 'unknown'}")
        finally:
            os.unlink(tmp)
    return fails


def check_srcs(page, html, base):
    fails = []
    base_dir = page.rsplit("/", 1)[0] + "/" if "/" in page else ""
    for src in re.findall(r"<script[^>]*\bsrc=[\"']([^\"']+)[\"']", html):
        if src.startswith(("http://", "https://", "data:", "//")):
            continue
        rel = os.path.normpath(base_dir + src.split("?")[0].split("#")[0])
        code, _ = fetch(base + "/" + rel)
        if code != 200:
            fails.append(f"{page}: missing script {src} -> {code}")
    return fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://game.ricky.study")
    args = ap.parse_args()

    pages = game_pages()
    fails = []
    for page in pages:
        code, html = fetch(args.base + "/" + page)
        if code != 200:
            fails.append(f"{page}: HTTP {code}")
            continue
        fails += check_inline(page, html)
        fails += check_srcs(page, html, args.base)
        if "hardening.js" not in html and page != "portal.html":
            fails.append(f"{page}: no hardening.js (no home button / error overlay)")

    print(f"checked {len(pages)} pages against {args.base}")
    if fails:
        print(f"\nFAILURES ({len(fails)}):")
        for f in fails:
            print("  " + f)
        return 1
    print("ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())

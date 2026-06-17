---
name: Replit Python package install
description: How to install Python packages in this Replit NixOS environment; pip install is blocked.
---

Use `installLanguagePackages({ language: "python", packages: [...] })` via the code_execution sandbox.

`sentence-transformers` fails to resolve on Linux/Nix (platform marker conflict). It is already guarded with `try/except ImportError` in `engine.py` — do not attempt to install it. The app falls back to word-overlap (Jaccard) similarity when it's unavailable.

**Why:** NixOS immutable store blocks pip; Replit's package manager uses uv under the hood.

**How to apply:** Whenever adding a new Python dependency, use installLanguagePackages, not `pip install`. Never add sentence-transformers to the install list.

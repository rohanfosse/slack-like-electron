#!/usr/bin/env python3
"""
Migrate hardcoded `transition:` durations + easing to design tokens.

Mapping:
  .12s/.15s ease       -> var(--motion-fast) var(--ease-out)
  .18s ease            -> var(--motion-fast) var(--ease-in)
  .2s/.25s ease        -> var(--motion-base) var(--ease-out)
  .3s/.35s ease        -> var(--motion-slow) var(--ease-out)
  cubic-bezier(...)    -> kept as-is (custom, intentional)

Targets only `.vue` and `.css` files under src/renderer/src/.
Idempotent: re-running on already-migrated files is a no-op.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "renderer" / "src"

# Order matters: longer durations before shorter so '0.25' is consumed
# before '0.2' can match.
# Match a duration token (with optional leading 0) followed by `s`,
# space(s), then an easing keyword.
DURATION_RE = re.compile(
    r'(?<![\w.-])'                                       # left boundary
    r'(?P<dur>0?\.(?:35|25|18|15|12|4|3|2)s|'             # .25s 0.25s etc. (incl. .4s)
    r'(?:120|150|180|200|250|300|350|400)ms)'            # or N ms
    r'\s+'
    r'(?P<easing>ease(?:-in|-out|-in-out)?)'
    r'(?![\w-])'                                         # right boundary
)

DUR_TO_TOKEN = {
    '0.12s': 'var(--motion-fast)',  '.12s': 'var(--motion-fast)',  '120ms': 'var(--motion-fast)',
    '0.15s': 'var(--motion-fast)',  '.15s': 'var(--motion-fast)',  '150ms': 'var(--motion-fast)',
    '0.18s': 'var(--motion-fast)',  '.18s': 'var(--motion-fast)',  '180ms': 'var(--motion-fast)',
    '0.2s':  'var(--motion-base)',  '.2s':  'var(--motion-base)',  '200ms': 'var(--motion-base)',
    '0.25s': 'var(--motion-base)',  '.25s': 'var(--motion-base)',  '250ms': 'var(--motion-base)',
    '0.3s':  'var(--motion-slow)',  '.3s':  'var(--motion-slow)',  '300ms': 'var(--motion-slow)',
    '0.35s': 'var(--motion-slow)',  '.35s': 'var(--motion-slow)',  '350ms': 'var(--motion-slow)',
    '0.4s':  'var(--motion-slow)',  '.4s':  'var(--motion-slow)',  '400ms': 'var(--motion-slow)',
}

EASE_MAP = {
    'ease':        'var(--ease-out)',
    'ease-out':    'var(--ease-out)',
    'ease-in':     'var(--ease-in)',
    'ease-in-out': 'var(--ease-in-out)',
}

def repl(m: re.Match) -> str:
    dur = m.group('dur')
    ease = m.group('easing')
    return f"{DUR_TO_TOKEN[dur]} {EASE_MAP[ease]}"

def migrate(text: str) -> tuple[str, int]:
    return DURATION_RE.subn(repl, text)

def main() -> int:
    if not SRC.exists():
        print(f"src not found: {SRC}", file=sys.stderr)
        return 1
    files = list(SRC.rglob("*.vue")) + list(SRC.rglob("*.css"))
    total_files = 0
    total_subs = 0
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        new, n = migrate(text)
        if n > 0:
            f.write_text(new, encoding="utf-8")
            total_files += 1
            total_subs += n
            print(f"  {n:3d}  {f.relative_to(ROOT)}")
    print(f"\n{total_subs} substitutions across {total_files} files")
    return 0

if __name__ == "__main__":
    sys.exit(main())

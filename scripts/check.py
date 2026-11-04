"""Dependency-free source integrity checks. Behavior is tested in Chrome."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
errors = []
modules = list((ROOT / 'src').rglob('*.js'))
for path in modules:
    source = path.read_text()
    for reference in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]", source):
        if reference.startswith('.') and not (path.parent / reference).resolve().is_file():
            errors.append(f'{path.relative_to(ROOT)}: missing import {reference}')
    if not source.strip():
        errors.append(f'{path.relative_to(ROOT)} is empty')
for path in (ROOT / 'index.html', ROOT / 'src/styles.css', ROOT / 'public/favicon.svg'):
    if not path.is_file():
        errors.append(f'Missing {path.relative_to(ROOT)}')
for reference in re.findall(r"/public/[a-z]+\.(?:jpg|svg)", (ROOT / 'src/data.js').read_text()):
    if not (ROOT / reference.lstrip('/')).is_file():
        errors.append(f'Missing sample asset {reference}')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(modules)} application modules, imports, and referenced sample assets checked.')

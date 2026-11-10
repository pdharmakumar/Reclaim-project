"""Create a static, dependency-free distribution without Git or test artifacts."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
subprocess.run([sys.executable, str(ROOT / 'scripts/check.py')], check=True)
destination = ROOT / 'dist'
if destination.exists():
    shutil.rmtree(destination)
destination.mkdir(exist_ok=True)
shutil.copy2(ROOT / 'index.html', destination / 'index.html')
for name in ('src', 'public'):
    shutil.copytree(ROOT / name, destination / name, dirs_exist_ok=True)
print(f'Built static application in {destination}')

"""Create self-contained Python and website downloads; omit QA output and dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parents[1]
with ZipFile(ROOT / 'downloads/python-lab3.zip', 'w', ZIP_DEFLATED) as z:
    for name in ['histogram_lab.py', 'prior_histogram_lab.py', 'moon.png', 'requirements.txt', 'README.md']:
        z.write(ROOT / 'python' / name, 'python-lab3/' + name)
    z.write(ROOT / 'assets/NOTICE.md', 'python-lab3/NOTICE.md')
excluded = {'node_modules', 'test-results', 'playwright-report', 'artifacts', '__pycache__', '.git'}
target = ROOT.parent / 'CSST106-Lab03-Website.zip'
with ZipFile(target, 'w', ZIP_DEFLATED) as z:
    for file in sorted(ROOT.rglob('*')):
        relative = file.relative_to(ROOT)
        if not file.is_file() or any(part in excluded for part in relative.parts):
            continue
        if relative.parts[:2] == ('python', 'results') or file.suffix == '.pyc':
            continue
        z.write(file, relative.as_posix())
print(f'Website: {target}')
print(f'Python kit: {ROOT / "downloads/python-lab3.zip"}')

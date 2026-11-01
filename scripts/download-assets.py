"""Download the unmodified Figma image/vector assets referenced by design context.

Raw context and expiring source URLs are local working material, excluded from git.
"""
from pathlib import Path
import json, re, subprocess, hashlib
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / 'public' / 'assets'
assets.mkdir(parents=True, exist_ok=True)
originals = root / 'design' / 'source-assets'
originals.mkdir(parents=True, exist_ok=True)
manifest = {}
jobs = []
for context in sorted((root / 'design' / 'context').glob('*.txt')):
    for key, url in re.findall(r'const (img\w+) = "(https://www\.figma\.com/api/mcp/asset/[^\"]+)";', context.read_text()):
        extension = url.rsplit('.', 1)[-1]
        filename = f'{context.stem}-{key}.{extension}'
        jobs.append((context.stem, key, url, filename, extension))

def download(job):
    context, key, url, filename, extension = job
    source = originals / filename
    previous = assets / filename
    if previous.exists() and extension == 'png' and not source.exists():
        previous.replace(source)
    if not source.exists() or not source.stat().st_size:
        subprocess.run(['curl', '-fL', '--retry', '3', '--connect-timeout', '20', '--max-time', '120', url, '-o', str(source)], check=True, capture_output=True)
    metadata = {'sourceContext': context, 'sourceKey': key, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()}
    if extension == 'png':
        image = Image.open(source)
        metadata['sourceDimensions'] = list(image.size)
        # The unmodified source stays in the local provenance archive. This is
        # a format/size derivative only: no crop, retouch, or content change.
        image.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
        filename = filename.removesuffix('.png') + '.webp'
        destination = assets / filename
        if not destination.exists():
            image.save(destination, 'WEBP', quality=91, method=6)
        metadata['dimensions'] = list(image.size)
    else:
        destination = assets / filename
        if not destination.exists():
            destination.write_bytes(source.read_bytes())
    metadata['path'] = f'/assets/{filename}'
    metadata['bytes'] = destination.stat().st_size
    return f'{context}.{key}', metadata

with ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(download, jobs))
for key, metadata in results:
    manifest[key] = metadata['path']
(root / 'src' / 'data').mkdir(parents=True, exist_ok=True)
(root / 'src' / 'data' / 'assets.json').write_text(json.dumps(manifest, indent=2) + '\n')
(root / 'design' / 'asset-provenance.json').write_text(json.dumps({'figmaFile':'m3N3lJCoutaziEm4nt4CwO','figmaPage':'148:2','assets':dict(results)}, indent=2)+'\n')
print(json.dumps({'assets': len(manifest), 'bytes': sum(p.stat().st_size for p in assets.iterdir())}))

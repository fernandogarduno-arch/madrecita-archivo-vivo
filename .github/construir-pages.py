"""Publica el museo y carga las fotos de catálogo desde su revisión exacta de GitHub."""
from pathlib import Path
import json
import os
import re
import shutil
import sys

repo = Path(__file__).resolve().parent.parent
dest = Path(sys.argv[1]).resolve()
revision = os.environ['GITHUB_SHA']
owner_repo = os.environ['GITHUB_REPOSITORY']
if not re.fullmatch(r'[a-f0-9]{40}', revision):
    raise ValueError('Se requiere la revisión completa de Git.')
dest.mkdir(parents=True, exist_ok=False)

for src in repo.rglob('*'):
    relative = src.relative_to(repo)
    if relative.parts[0] in {'.git', '.github'} or not src.is_file():
        continue
    if relative.parts[:3] == ('archivo','datos','fotos'):
        continue
    out = dest / relative
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, out)

base = f'https://raw.githubusercontent.com/{owner_repo}/{revision}/archivo/datos/'
module = f"export const photoDirectory = {json.dumps(base)};\n"
module += "export const archivePhoto = reference => new URL(reference.src, photoDirectory).href;\n"
(dest/'archivo/medios.js').write_text(module, encoding='utf8')

def connect(file, imports, changes):
    path = dest/file
    code = path.read_text('utf8')
    for original, replacement in changes:
        if code.count(original) != 1:
            raise ValueError(f'No se reconoce la referencia en {file}: {original}')
        code = code.replace(original,replacement)
    path.write_text(imports+'\n'+code,encoding='utf8')

photo_import = "import {archivePhoto} from './medios.js';"
connect('archivo/archivo.js',photo_import,[
    (r"const photoURL=p=>'datos/'+p.src.replace(/^\.\//,'');", 'const photoURL = archivePhoto;')
])
connect('archivo/explorar.js',photo_import,[
    ("'datos/'+r.photos[0].src", 'archivePhoto(r.photos[0])')
])
connect('archivo/regional.js',photo_import,[
    ("'datos/'+photo.src", 'archivePhoto(photo)'),
    ("'datos/'+byId.get(imgId).photos[0].src", 'archivePhoto(byId.get(imgId).photos[0])')
])
connect('visita-atlas.js',"import {photoDirectory} from './archivo/medios.js';",[
    ("new URL('archivo/datos/',document.baseURI)",'photoDirectory')
])
connect('expositor-atlas.js','',[
    ('const image = new Image();',"const image = new Image();\n      image.crossOrigin = 'anonymous';")
])

# Las seis estaciones originales usan rutas locales. El resto de las vistas usa
# el directorio de fotografías de la misma revisión pública del repositorio.
catalog=json.loads((dest/'archivo/datos/catalogo.json').read_text('utf8'))
featured=set(catalog['featured'])
for record in catalog['records']:
    for photo in record['photos']:
        rel = Path('archivo/datos')/photo['src']
        assert rel.parts[:3] == ('archivo','datos','fotos') and (repo/rel).is_file(), rel
        if record['id'] in featured:
            (dest/rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(repo/rel,dest/rel)
print(f"{len(catalog['records'])} fichas y {sum(p.is_file() for p in dest.rglob('*'))} archivos de Pages.")

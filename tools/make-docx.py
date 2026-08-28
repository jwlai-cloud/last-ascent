#!/usr/bin/env python3
"""
Build the design-intent .docx from submission/design-intent.txt.

The competition asks for a text-only .docx of at most 500 words, and its
guidance says entries are judged without the creator's identity attached. So
this writes the minimum valid OOXML package and NOTHING else: no docProps, so
no dc:creator, no company, no revision history, no last-modified-by. The first
version of this file was produced ad hoc by a library that stamped all of that
in, which is also why the checklist says never to hand-edit the .docx — now
there is nothing to hand-edit, because it is generated.

Word count is enforced here rather than trusted: over 500 is a rules breach.

    python3 tools/make-docx.py
"""
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'submission' / 'design-intent.txt'
OUT = ROOT / 'submission' / 'last-ascent-design-intent.docx'
LIMIT = 500

# The template is explicit: "Use the sections below exactly as given. Do not
# rename, reorder, merge or add sections." So it is checked rather than
# trusted — a renamed heading is the kind of thing nobody notices until a judge
# does. Source: docs/source/design-intent-template.md.
REQUIRED_SECTIONS = [
    '1. Game title and genre',
    '2. Target player and pitch',
    '3. How to play (controls)',
    '4. Core loop',
    '5. What is in this prototype',
    '6. Progression and signature twist',
    '7. Future-state vision',
]

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def para(text):
    if not text:
        return '<w:p/>'
    # The seven numbered section headings carry the template's structure, so
    # they are bolded. Everything else is plain body text.
    bold = bool(re.match(r'^\d\.\s', text)) or text == 'Design-Intent Document'
    rpr = '<w:rPr><w:b/></w:rPr>' if bold else ''
    return (f'<w:p><w:r>{rpr}<w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>')


def main():
    text = SRC.read_text(encoding='utf-8')
    words = len(text.split())
    if words > LIMIT:
        sys.exit(f'design-intent.txt is {words} words, over the {LIMIT} limit')

    headings = [ln.strip() for ln in text.splitlines()
                if re.match(r'^\d\.\s', ln.strip())]
    if headings != REQUIRED_SECTIONS:
        sys.exit('design-intent.txt sections do not match the official template.\n'
                 f'  found:    {headings}\n'
                 f'  required: {REQUIRED_SECTIONS}')

    # Text only: no images, screenshots, diagrams, charts or tables.
    if any(ch in text for ch in ('|', '![')):
        sys.exit('design-intent.txt looks like it contains a table or image; the '
                 'template requires text only')

    body = ''.join(para(line.strip()) for line in text.splitlines())
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{W}"><w:body>{body}'
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>'
        '</w:sectPr></w:body></w:document>'
    )

    # Fixed timestamp: a build stamp is metadata too, and a reproducible file
    # lets `git status` show whether the text actually changed.
    stamp = (2026, 1, 1, 0, 0, 0)
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in (('[Content_Types].xml', CONTENT_TYPES),
                           ('_rels/.rels', RELS),
                           ('word/document.xml', document)):
            info = zipfile.ZipInfo(name, stamp)
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, data)

    print(f'{OUT.relative_to(ROOT)} — {words}/{LIMIT} words, '
          f'{OUT.stat().st_size} bytes, no creator metadata')


if __name__ == '__main__':
    main()

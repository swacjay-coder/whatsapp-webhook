from pathlib import Path
s = Path('server.js').read_text()
needles = [
    'function sendWhatsAppMessage',
    'async function sendWhatsAppMessage',
    'function sendWhatsAppButtonMessage',
    'async function sendWhatsAppButtonMessage',
    'function sendWhatsAppImageMessage',
    'async function sendWhatsAppImageMessage',
    'sendWhatsAppMessage(',
    'sendWhatsAppButtonMessage(',
    'sendWhatsAppFlow',
]
lines = s.splitlines()
out = ['# V60.2 Send Function Inspection', '']
for needle in needles:
    out.append(f'## {needle}')
    found = False
    for i, line in enumerate(lines):
        if needle in line:
            found = True
            start = max(0, i - 5)
            end = min(len(lines), i + 45)
            out.append(f'Found at line {i+1}')
            out.append('```js')
            out.extend(lines[start:end])
            out.append('```')
            out.append('')
            break
    if not found:
        out.append('Not found')
        out.append('')
Path('V602_SEND_FUNCTIONS.md').write_text('\n'.join(out))
print('Inspection written to V602_SEND_FUNCTIONS.md')

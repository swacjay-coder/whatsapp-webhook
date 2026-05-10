from pathlib import Path
s = Path('server.js').read_text()
lines = s.splitlines()
needles = [
    'function buildWhatsAppFlowConfirmationBody',
    'const confirmationBody = buildWhatsAppFlowConfirmationBody',
    'sendWhatsAppButtonMessage(from, confirmationBody',
    'getConsultActionButtons',
    'confirmationButtons',
    'BUSINESS_NAME_SPACED'
]
out = ['# V60.2 Flow Confirmation Inspection', '']
for needle in needles:
    out.append(f'## {needle}')
    hits = 0
    for i, line in enumerate(lines):
        if needle in line:
            hits += 1
            if hits > 5:
                break
            start = max(0, i - 12)
            end = min(len(lines), i + 70)
            out.append(f'Found at line {i+1}')
            out.append('```js')
            out.extend(lines[start:end])
            out.append('```')
            out.append('')
    if hits == 0:
        out.append('Not found')
        out.append('')
Path('V602_FLOW_CONFIRMATION.md').write_text('\n'.join(out))
print('Inspection written to V602_FLOW_CONFIRMATION.md')

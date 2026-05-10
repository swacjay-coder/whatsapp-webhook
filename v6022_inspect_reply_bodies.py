from pathlib import Path
s = Path('server.js').read_text()
lines = s.splitlines()
needles = [
    'Hello ${customerName}',
    'Hello ${cleanCustomerName',
    'مرحبا ${customerName}',
    'ok ${customerName}',
    'أكيد، اختر نوع الحجز المناسب لك',
    'Welcome to Iconic Hair Care',
    'أهلًا بك في Iconic Hair Care',
    'احجز موعد السيرفس خلال ثواني',
    'Book your service appointment',
    'flowBody =',
    'buildWhatsAppFlowConfirmationBody',
    'BUSINESS_NAME_SPACED'
]
out = ['# V60.2.2 Reply Body Inspection', '']
for needle in needles:
    out.append(f'## {needle}')
    hits = 0
    for i, line in enumerate(lines):
        if needle in line:
            hits += 1
            if hits > 8:
                break
            start = max(0, i - 18)
            end = min(len(lines), i + 65)
            out.append(f'Found at line {i+1}')
            out.append('```js')
            out.extend(lines[start:end])
            out.append('```')
            out.append('')
    if hits == 0:
        out.append('Not found')
        out.append('')
Path('V6022_REPLY_BODIES.md').write_text('\n'.join(out))
print('Inspection written to V6022_REPLY_BODIES.md')

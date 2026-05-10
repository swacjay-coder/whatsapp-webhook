from pathlib import Path

s = Path('server.js').read_text()

print('===== VERSION LINE =====')
idx = s.find('const BOT_VERSION')
print(s[idx:idx+180] if idx >= 0 else 'NOT FOUND')

print('\n===== MP4 URL SCAN =====')
pos = 0
seen = set()
while True:
    i = s.find('https://', pos)
    if i < 0:
        break
    j = s.find('.mp4', i)
    if j >= 0 and j < i + 500:
        url = s[i:j+4]
        if url not in seen:
            seen.add(url)
            print('\n--- URL ---')
            print(url)
            print('--- CONTEXT ---')
            print(s[max(0, i-700):min(len(s), j+700)])
        pos = j + 4
    else:
        pos = i + 8
if not seen:
    print('NO MP4 URLS FOUND')

print('\n===== VIDEO CALL SCAN =====')
pos = 0
while True:
    i = s.find('sendWhatsAppVideoByLink', pos)
    if i < 0:
        break
    print('\n--- CALL CONTEXT ---')
    print(s[max(0, i-700):min(len(s), i+1200)])
    pos = i + 1

needles = [
    'async function sendWhatsAppButtonMessage',
    'const iconicIsResultsRoute',
    'if (iconicIsResultsRoute)',
    'if (iconicIsHowItWorksRoute)',
    'buildResultsFollowupBody',
    'HOW_IT_WORKS_VIDEO_URL',
]
for needle in needles:
    i = s.find(needle)
    print('\n===== ' + needle + ' =====')
    if i < 0:
        print('NOT FOUND')
        continue
    print(s[max(0, i-900):min(len(s), i+2200)])

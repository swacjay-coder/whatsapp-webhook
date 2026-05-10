from pathlib import Path

s = Path('server.js').read_text()
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
    start = max(0, i - 900)
    end = min(len(s), i + 2200)
    print(s[start:end])

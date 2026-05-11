from pathlib import Path

s = Path('server.js').read_text()

print('===== CURRENT BOT_VERSION =====')
i = s.find('const BOT_VERSION')
print(s[i:i+220] if i >= 0 else 'NOT FOUND')

for needle in ['if (iconicIsResultsRoute)', 'if (iconicIsHowItWorksRoute)', 'Results Safe Fallback', 'Results Video Header', 'Results Nonblocking Video', 'Details Safe Fallback', 'Details Video Header', 'Details Nonblocking Video']:
    print('\n===== ' + needle + ' =====')
    i = s.find(needle)
    if i < 0:
        print('NOT FOUND')
    else:
        print(s[max(0, i-900):min(len(s), i+1800)])

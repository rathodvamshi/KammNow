import os
import re

SENTRY_IMPORT = "import * as Sentry from '@sentry/react-native';\n"

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    has_changes = False

    # Strip console.log and console.debug completely
    if 'console.log' in content or 'console.debug' in content:
        content = re.sub(r'console\.(log|debug)\(.*?\);?', '', content, flags=re.DOTALL)
        
    # Replace console.error and console.warn with Sentry.captureMessage or captureException
    if 'console.error' in content or 'console.warn' in content:
        # capture exceptions from variables properly
        content = re.sub(r'console\.error\((.*?)\);?', r'Sentry.captureException(\1);', content)
        content = re.sub(r'console\.warn\((.*?)\);?', r'Sentry.captureMessage(String(\1));', content)
        
        if 'Sentry' in content and 'import * as Sentry' not in content:
            # add import after the first import block
            content = re.sub(r'^(import .*?\n)', r'\1' + SENTRY_IMPORT, content, count=1, flags=re.MULTILINE)

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or 'backend' in root:
        continue
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            process_file(os.path.join(root, file))

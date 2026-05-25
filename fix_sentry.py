import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # Fix String(a, b, ...) inside Sentry.captureMessage
    def replacer(match):
        args = match.group(1)
        # Just wrap in template literal if there are multiple args
        if ',' in args:
            parts = [p.strip() for p in args.split(',')]
            return f"Sentry.captureMessage(`{' '.join(f'${{{p}}}' for p in parts)}`);"
        else:
            return f"Sentry.captureMessage(String({args}));"

    content = re.sub(r'Sentry\.captureMessage\(String\((.*?)\)\);', replacer, content)

    # Fix Sentry.captureException with multiple args
    def exc_replacer(match):
        args = match.group(1)
        if ',' in args:
            parts = [p.strip() for p in args.split(',')]
            # captureException takes an Error object or string, but usually 1 arg.
            return f"Sentry.captureException(new Error(`{' '.join(f'${{{p}}}' for p in parts)}`));"
        else:
            return f"Sentry.captureException({args});"

    content = re.sub(r'Sentry\.captureException\((.*?)\);', exc_replacer, content)

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

echo "=== PROOF OF ROUTES EXISTING ==="
ls -l app/search.tsx
ls -l app/job/\[id\].tsx
ls -l app/profile/\[id\].tsx
ls -l app/\(tabs\)/feedback.tsx
ls -l app/\(tabs\)/inbox.tsx

echo -e "\n=== PROOF OF DEFAULT EXPORTS ==="
grep -E 'export default' app/search.tsx
grep -E 'export default' app/job/\[id\].tsx
grep -E 'export default' app/profile/\[id\].tsx
grep -E 'export default' app/\(tabs\)/feedback.tsx
grep -E 'export default' app/\(tabs\)/inbox.tsx

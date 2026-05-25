const fs = require('fs');
const files = [
  'app/job/post.tsx',
  'app/job/edit/[id].tsx',
  'app/job/[id].tsx',
  'app/chat/[id].tsx',
  'app/location/address-form.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(/behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/g, "behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
  
  fs.writeFileSync(file, code);
  console.log(`Fixed behavior in ${file}`);
});

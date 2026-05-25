const fs = require('fs');
const path = '/Users/sainath.are/Documents/kammnow/app/location/map-picker.tsx';
let code = fs.readFileSync(path, 'utf8');

console.log("Imports check:", code.substring(0, 1000));

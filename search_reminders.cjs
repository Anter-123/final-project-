const fs = require('fs');
const content = fs.readFileSync('C:\\\\Users\\\\Anter\\\\.gemini\\\\antigravity\\\\scratch\\\\smart-clinic\\\\src\\\\pages\\\\PatientDashboard.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('reminder') || line.includes('Notification') || line.includes('alert') || line.includes('Interval') || line.includes('time')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

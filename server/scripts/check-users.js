// Quick check script for debugging users
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');

console.log('=== USER DATABASE CHECK ===\n');

try {
    const data = fs.readFileSync(usersPath, 'utf8');
    const db = JSON.parse(data);

    console.log(`Total users: ${db.users.length}`);
    console.log('\nUsers found:');
    db.users.forEach(user => {
        console.log(`- ${user.username} (${user.group}) - Created: ${user.createdAt}`);
    });

    if (db.users.length === 0) {
        console.log('\n⚠️  No users found!');
        console.log('👉 Run: node server/scripts/create-admin.js');
    }
} catch (error) {
    console.error('Error reading users database:', error.message);
}

const fs = require('fs');

// Read the current processed voices data
const data = JSON.parse(fs.readFileSync('processed-voices.json', 'utf8'));

console.log(`📊 Original: ${data.languages.length} languages`);

// Sort languages alphabetically by name
data.languages.sort((a, b) => {
    return a.name.localeCompare(b.name);
});

console.log('🔤 Sorted languages A-Z:');
data.languages.forEach((lang, index) => {
    console.log(`${(index + 1).toString().padStart(3, ' ')}. ${lang.name}`);
});

// Check voices per language
const voiceStats = {};
Object.keys(data.voiceDatabase).forEach(langCode => {
    const voices = data.voiceDatabase[langCode];
    const langName = data.languages.find(l => l.code === langCode)?.name || langCode;
    voiceStats[langName] = voices.length;
});

console.log('\n📊 Voice count per language:');
Object.entries(voiceStats).sort().forEach(([lang, count]) => {
    if (count < 2) {
        console.log(`⚠️  ${lang}: ${count} voice(s)`);
    }
});

// Write sorted data back
fs.writeFileSync('processed-voices.json', JSON.stringify(data, null, 2));
console.log(`\n✅ Updated processed-voices.json with ${data.languages.length} languages in A-Z order`);

// Generate language options for HTML
const languageOptions = data.languages.map(lang =>
    `                            <option value="${lang.code}">${lang.name}</option>`
).join('\n');

console.log('\n📝 HTML language options generated (first 10):');
data.languages.slice(0, 10).forEach(lang => {
    console.log(`  ${lang.name}`);
});

// Save HTML snippet for easy update
fs.writeFileSync('language-options.html', languageOptions);
console.log('💾 Saved language-options.html for easy HTML update');
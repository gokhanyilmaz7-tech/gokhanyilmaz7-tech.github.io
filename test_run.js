const fs = require('fs');

const normalize = (value) => value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const legData = JSON.parse(fs.readFileSync('./public/sections/mevzuat-15.json', 'utf8'));
const needle = normalize("sağlık");

let totalMatches = 0;
let legMatches = [];

for (const page of legData.pages) {
    if (!page.text) continue;
    const normalizedText = normalize(page.text);
    let idx = normalizedText.indexOf(needle);
    let searchPos = 0;
    while (idx !== -1 && legMatches.length < 50 && totalMatches < 200) {
        let start = page.text.lastIndexOf('\n', idx) + 1;
        if (start === -1 || idx - start > 200) start = Math.max(0, idx - 100);
        let end = page.text.indexOf('\n', idx);
        if (end === -1 || end - idx > 200) end = Math.min(page.text.length, idx + 200);
        
        let snippet = page.text.substring(start, end);
        let localIdx = idx - start;
        let matchLength = needle.length;
        if (localIdx >= 0 && localIdx < snippet.length) {
            let escape = (s) => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#039;'}[c]));
            let before = escape(snippet.substring(0, localIdx));
            let matchText = escape(snippet.substring(localIdx, localIdx + matchLength));
            let after = escape(snippet.substring(localIdx + matchLength));
            snippet = before + `<strong style="background:#fef08a; padding: 2px 4px; border-radius: 4px; color: #854d0e;">` + matchText + `</strong>` + after;
        } else {
            let escape = (s) => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#039;'}[c]));
            snippet = escape(snippet);
        }
        legMatches.push({snippet, page: page.page});
        totalMatches++;
        searchPos = idx + needle.length;
        idx = normalizedText.indexOf(needle, searchPos);
    }
}

console.log(`Found ${totalMatches} matches.`);
console.dir(legMatches[0]);

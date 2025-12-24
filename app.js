class Word {
    constructor(wordString, category) {
        this.wordString = wordString;
        this.category = category;
        this.entropy = 0;
    }

    getColorHex() {
        const colors = { 'A': '#6aaa64', 'O': '#538d4e', 'X': '#c9b458', 'Z': '#ff4d4d' };
        return colors[this.category] || '#ffffff';
    }
}

let allWords = [];
let possibleAnswers = [];

async function init() {
    try {
        const response = await fetch('all_words.json');
        const data = await response.json();
        allWords = Object.entries(data).map(([word, cat]) => new Word(word, cat));
        possibleAnswers = allWords.filter(w => w.category !== 'A');
        updateStats();
        renderTopWords(20);
    } catch (e) {
        document.getElementById('stats').innerText = "Error loading JSON file.";
    }
}

function generateColorPattern(answer, guess) {
    let answerArr = answer.split('');
    let guessArr = guess.split('');
    let pattern = Array(5).fill('-');
    let counts = {};

    for (let char of answerArr) { counts[char] = (counts[char] || 0) + 1; }

    for (let i = 0; i < 5; i++) {
        if (guessArr[i] === answerArr[i]) {
            pattern[i] = 'g';
            counts[guessArr[i]]--;
        }
    }
    for (let i = 0; i < 5; i++) {
        if (pattern[i] === '-' && counts[guessArr[i]] > 0) {
            pattern[i] = 'y';
            counts[guessArr[i]]--;
        }
    }
    return pattern.join('');
}

function assignEntropy(likelyAnswers) {
    allWords.forEach(guess => {
        let patternMap = {};
        likelyAnswers.forEach(answer => {
            let p = generateColorPattern(answer.wordString, guess.wordString);
            patternMap[p] = (patternMap[p] || 0) + 1;
        });

        let entropy = 0;
        const total = likelyAnswers.length;
        for (let count of Object.values(patternMap)) {
            let prob = count / total;
            entropy -= prob * Math.log2(prob);
        }
        guess.entropy = entropy;
    });
}

function getLikelyAnswers(possibles) {
    let likely = possibles.filter(w => w.category === 'O' || w.category === 'X');
    return likely.length > 0 ? likely : possibles;
}

function handleTurn() {
    const guessInput = document.getElementById('guessInput');
    const patternInput = document.getElementById('patternInput');
    const guessStr = guessInput.value.toLowerCase();
    const pattern = patternInput.value.toLowerCase();

    if (guessStr.length !== 5 || pattern.length !== 5) {
        alert("Please enter a 5-letter word and 5-letter pattern.");
        return;
    }

    // Dictionary validation check
    const isValid = allWords.some(w => w.wordString === guessStr);
    if (!isValid) {
        alert(`'${guessStr.toUpperCase()}' is not a valid word.`);
        guessInput.value = '';
        guessInput.focus();
        return;
    }

    if (pattern === 'ggggg') {
        alert("Solved!");
        return;
    }

    possibleAnswers = possibleAnswers.filter(w => 
        generateColorPattern(w.wordString, guessStr) === pattern
    );

    updateStats();
    renderTopWords(20);

    // Clear inputs and refocus
    guessInput.value = '';
    patternInput.value = '';
    guessInput.focus();
}

function updateStats() {
    const counts = { 'O': 0, 'X': 0, 'Z': 0 };
    possibleAnswers.forEach(w => counts[w.category]++);
    document.getElementById('stats').innerHTML = `
        <span>Original: ${counts.O}</span>
        <span>Extended: ${counts.X}</span>
        <span>Zero-Chance: ${counts.Z}</span>
    `;
}

function renderTopWords(num) {
    const likely = getLikelyAnswers(possibleAnswers);
    assignEntropy(likely);

    // Get the absolute best detector from allWords
    allWords.sort((a, b) => b.entropy - a.entropy);
    const absoluteBest = allWords[0];

    // Sort possibles: Category first, then entropy desc
    possibleAnswers.sort((a, b) => a.category.localeCompare(b.category) || b.entropy - a.entropy);

    let output = "TOP SUGGESTIONS:\n";
    
    // Line-cutter logic
    if (absoluteBest.wordString !== possibleAnswers[0].wordString) {
        output += `!!  ${absoluteBest.wordString.toUpperCase()} (${absoluteBest.category}) - ${absoluteBest.entropy.toFixed(2)} [MAX ENTROPY]\n`;
        output += "------------------------------\n";
    }

    possibleAnswers.slice(0, num).forEach((w, i) => {
        // Pad the index to keep 1-9 and 10-20 aligned
        const paddedIndex = (i + 1).toString().padStart(2, ' ');
        output += `${paddedIndex}. ${w.wordString.toUpperCase()} (${w.category}) - ${w.entropy.toFixed(2)}\n`;
    });
    document.getElementById('output').innerText = output;
}

// Initialize the app
init();

// --- KEYBOARD LISTENER GOES HERE ---
[document.getElementById('guessInput'), document.getElementById('patternInput')].forEach(el => {
    el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleTurn();
        }
    });
});

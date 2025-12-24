class Word {
    constructor(wordString, category) {
        this.wordString = wordString;
        this.category = category;
        this.entropy = 0;
    }
}

let allWords = [];
let possibleAnswers = [];
let guessCount = 0; // New: Track rounds for automation logic

async function init() {
    try {
        const response = await fetch('all_words.json');
        const data = await response.json();
        allWords = Object.entries(data).map(([word, cat]) => new Word(word, cat));
        possibleAnswers = allWords.filter(w => w.category !== 'A');
        updateStats();
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

    const guessObj = allWords.find(w => w.wordString === guessStr);
    if (!guessObj) {
        alert(`'${guessStr.toUpperCase()}' is not a valid word.`);
        return;
    }

    if (pattern === 'ggggg') {
        if (!possibleAnswers.some(w => w.wordString === guessStr)) {
            alert("This word is not in the list of possible answers.");
            return;
        }
        alert("Solved!");
        return;
    }

    const filteredResults = possibleAnswers.filter(w => 
        generateColorPattern(w.wordString, guessStr) === pattern
    );

    if (filteredResults.length === 0) {
        alert("No words match that pattern. Please check and try again.");
        return;
    }

    possibleAnswers = filteredResults;
    guessCount++; // Increment round count
    
    updateStats();
    
    // Automation Logic: After Round 1, hide button and run automatically
    const btn = document.getElementById('computeBtn');
    if (guessCount > 0) {
        btn.style.display = 'none'; // Hide the button permanently for this game
        runFullAnalysis(); // Auto-calculate because it is now fast
    }

    guessInput.value = '';
    patternInput.value = '';
    guessInput.focus();
}

function updateStats() {
    const counts = { 'O': 0, 'X': 0, 'Z': 0 };
    possibleAnswers.forEach(w => counts[w.category]++);
    document.getElementById('stats').innerHTML = `
        <span class="O">ORIGINAL: ${counts.O}</span>
        <span class="X">EXTENDED: ${counts.X}</span>
        <span class="Z">ZERO-CHANCE: ${counts.Z}</span>
    `;
}

function runFullAnalysis() {
    const btn = document.getElementById('computeBtn');
    const output = document.getElementById('output');
    
    // Round 1 Manual Handling: Hide button immediately when clicked
    if (guessCount === 0) {
        btn.style.display = 'none';
    }
    
    output.innerHTML = "<em>Calculating entropy...</em>";

    // Small delay to allow UI to hide button before heavy math starts
    setTimeout(() => {
        renderTopWords(20);
    }, 50);
}

function renderTopWords(num) {
    const likely = getLikelyAnswers(possibleAnswers);
    assignEntropy(likely);

    allWords.sort((a, b) => {
        if (Math.abs(b.entropy - a.entropy) < 0.0001) {
            if (a.category === 'O' && b.category !== 'O') return -1;
            if (b.category === 'O' && a.category !== 'O') return 1;
            return a.wordString.localeCompare(b.wordString);
        }
        return b.entropy - a.entropy;
    });

    possibleAnswers.sort((a, b) => a.category.localeCompare(b.category) || b.entropy - a.entropy);

    const bestPossibleEntropy = possibleAnswers[0].entropy;
    const absoluteMaxEntropy = allWords[0].entropy;

    let outputHTML = "";

    const betterDetectors = allWords.filter(w => 
        w.entropy > bestPossibleEntropy + 0.0001 && 
        Math.abs(w.entropy - absoluteMaxEntropy) < 0.0001
    ).slice(0, 5);

    if (betterDetectors.length > 0) {
        // Label updated to remove 'Strategic' per instructions
        outputHTML += "<span class='section-header'>Max Entropy</span>";
        betterDetectors.forEach(w => {
            outputHTML += `!!&nbsp;&nbsp;<span class="${w.category}">${w.wordString.toUpperCase()}</span> - ${w.entropy.toFixed(2)}<br>`;
        });
        outputHTML += "<hr>";
    }

    outputHTML += "<span class='section-header'>Possible Answers</span>";
    possibleAnswers.slice(0, num).forEach((w, i) => {
        const count = i + 1;
        const displayNum = count < 10 ? `&nbsp;${count}` : `${count}`;
        outputHTML += `${displayNum}. <span class="${w.category}">${w.wordString.toUpperCase()}</span> - ${w.entropy.toFixed(2)}<br>`;
    });

    document.getElementById('output').innerHTML = outputHTML;
}

// Add this to your existing reset function to restore Round 1 state
function resetGameUI() {
    guessCount = 0;
    const btn = document.getElementById('computeBtn');
    btn.style.display = 'block';
    btn.innerText = "Max Entropy";
    document.getElementById('output').innerHTML = "";
    init(); // Re-load data
}

init();

[document.getElementById('guessInput'), document.getElementById('patternInput')].forEach(el => {
    el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleTurn();
    });
});

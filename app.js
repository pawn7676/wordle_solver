class Word {
    constructor(wordString, category) {
        this.wordString = wordString;
        this.category = category;
        this.entropy = 0;
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

    // ggggg check (Logic from filter_by_color_pattern in Python)
    if (pattern === 'ggggg') {
        if (!possibleAnswers.some(w => w.wordString === guessStr)) {
            alert("This word is not in the list of possible answers. Please re-enter the pattern.");
            return;
        }
        alert("Solved!");
        return;
    }

    // Safety check for empty results (Logic from filter_by_color_pattern in Python)
    const filteredResults = possibleAnswers.filter(w => 
        generateColorPattern(w.wordString, guessStr) === pattern
    );

    if (filteredResults.length === 0) {
        alert("No words match that color pattern. Please check your pattern and try again.");
        return;
    }

    possibleAnswers = filteredResults;
    updateStats();
    document.getElementById('output').innerHTML = "<em>Stats updated. Click 'Compute Entropy' to see rankings.</em>";

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
    btn.innerText = "Computing...";
    btn.disabled = true;
    output.innerHTML = "<em>Calculating entropy...</em>";

    setTimeout(() => {
        renderTopWords(20);
        btn.innerText = "Compute Entropy";
        btn.disabled = false;
    }, 50);
}

function renderTopWords(num) {
    const likely = getLikelyAnswers(possibleAnswers);
    assignEntropy(likely);

    // Global sort for absolute max entropy
    allWords.sort((a, b) => {
        if (Math.abs(b.entropy - a.entropy) < 0.0001) {
            if (a.category === 'O' && b.category !== 'O') return -1;
            if (b.category === 'O' && a.category !== 'O') return 1;
            return a.wordString.localeCompare(b.wordString);
        }
        return b.entropy - a.entropy;
    });

    // Pool sort for possible answers
    possibleAnswers.sort((a, b) => a.category.localeCompare(b.category) || b.entropy - a.entropy);

    const bestPossibleEntropy = possibleAnswers[0].entropy;
    const absoluteMaxEntropy = allWords[0].entropy;

    let outputHTML = "";

    // Line-Cutter Logic
    const betterDetectors = allWords.filter(w => 
        w.entropy > bestPossibleEntropy + 0.0001 && 
        Math.abs(w.entropy - absoluteMaxEntropy) < 0.0001
    ).slice(0, 5);

    if (betterDetectors.length > 0) {
        outputHTML += "<span class='section-header'>Strategic Max Entropy</span>";
        betterDetectors.forEach(w => {
            outputHTML += `!!&nbsp;&nbsp;<span class="${w.category}">${w.wordString.toUpperCase()}</span> - ${w.entropy.toFixed(2)}<br>`;
        });
        outputHTML += "<hr>"; // THE RESPONSIVE SEPARATOR
    }

    outputHTML += "<span class='section-header'>Possible Answers</span>";
    possibleAnswers.slice(0, num).forEach((w, i) => {
        const count = i + 1;
        const displayNum = count < 10 ? `&nbsp;${count}` : `${count}`;
        outputHTML += `${displayNum}. <span class="${w.category}">${w.wordString.toUpperCase()}</span> - ${w.entropy.toFixed(2)}<br>`;
    });

    document.getElementById('output').innerHTML = outputHTML;
}


init();

[document.getElementById('guessInput'), document.getElementById('patternInput')].forEach(el => {
    el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleTurn();
    });
});

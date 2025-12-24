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

function renderTopWords(num) {
    const likely = getLikelyAnswers(possibleAnswers);
    assignEntropy(likely);

    // 1. Sort allWords to find the 5 best performers
    allWords.sort((a, b) => {
        if (Math.abs(b.entropy - a.entropy) < 0.0001) {
            // Tie-breaker: Prefer 'Original' words, then alphabetical
            if (a.category === 'O' && b.category !== 'O') return -1;
            if (b.category === 'O' && a.category !== 'O') return 1;
            return a.wordString.localeCompare(b.wordString);
        }
        return b.entropy - a.entropy;
    });

    const maxEntropyWords = allWords.slice(0, 5);

    // 2. Sort your possibleAnswers list normally (Category first, then Entropy)
    possibleAnswers.sort((a, b) => a.category.localeCompare(b.category) || b.entropy - a.entropy);

    let outputHTML = "<strong>MAX ENTROPY:</strong><br>";
    
    // 3. Display the top 5 Max Entropy words
    maxEntropyWords.forEach(w => {
        // Class will apply color: Blue (O), Yellow (X), Red (Z), or Green (A)
        outputHTML += `!!&nbsp;&nbsp;<span class="${w.category}">${w.wordString.toUpperCase()}</span> - ${w.entropy.toFixed(2)}<br>`;
    });

    outputHTML += "----------------------------------<br>";

    // 4. Print the standard list
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
        if (e.key === 'Enter') {
            handleTurn();
        }
    });
});

const fs = require('fs');
const process = require('process');
const axios = require('axios');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const API_URL = 'https://icanhazdadjoke.com/search';
const JOKES_FILE = 'jokes.txt';

function getRandomJoke(jokes) {
    const randomIndex = Math.floor(Math.random() * jokes.length);
    return jokes[randomIndex].joke;
}

function displayLeaderboard() {
    fs.readFile(JOKES_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading jokes.txt:', err);
            return;
        }

        const jokes = data.split('\n').filter(Boolean);
        if (jokes.length === 0) {
            console.log('No jokes in the leaderboard yet. Be the first one to make us laugh!');
        } else {
            const mostPopularJoke = jokes.reduce((acc, joke) => {
                const count = (joke.match(/👍/g) || []).length;
                return count > acc.count ? { joke, count } : acc;
            }, { joke: '', count: 0 }).joke;

            console.log('The most popular joke in the leaderboard is:');
            console.log(mostPopularJoke);
        }
    });
}

function getUserFeedback(joke) {
    return new Promise((resolve) => {
        rl.question(`Did you like the joke?\n1. Yes\n2. No\nEnter your choice: `, (answer) => {
            const liked = answer.trim().toLowerCase() === '1';
            resolve({ joke, liked });
        });
    });
}

function updateLeaderboard(joke, liked) {
    const feedbackSymbol = liked ? '👍' : '👎';
    fs.appendFile(JOKES_FILE, `${feedbackSymbol} ${joke}\n`, (err) => {
        if (err) throw err;
        console.log('Feedback recorded. Thanks for your response!');
        // rl.close();
    });
}

function askForMoreJokes(searchTerm) {
    rl.question('Do you have more jokes? (yes/no)\nEnter your choice: ', (answer) => {
        if (answer.trim().toLowerCase() === 'yes') {
            fetchJoke(searchTerm);
        } else {
            rl.close(); 
        }
    });
}

async function fetchJoke(searchTerm) {
    const options = {
        url: `${API_URL}?term=${encodeURIComponent(searchTerm)}`,
        headers: {
            'Accept': 'application/json',
        },
    };

    try {
        const response = await axios(options);
        const data = response.data;

        if (data.results && data.results.length > 0) {
            const joke = getRandomJoke(data.results);
            console.log('Here\'s a joke for you:');
            console.log(joke);

            const { liked } = await getUserFeedback(joke);
            updateLeaderboard(joke, liked);

            askForMoreJokes(searchTerm);

        } else {
            console.log('Sorry, no jokes found for the given search term. The joke gods are taking a day off!');
            rl.close();
        }
    } catch (error) {
        console.error('Failed to fetch jokes from the API:', error.message);
        rl.close();
    }
}

const command = process.argv[2];

(async () => {
    if (command === 'leaderboard') {
        displayLeaderboard();
        rl.close();
    } else if (command) {
        const searchTerm = process.argv.slice(3).join(' ');
        await fetchJoke(searchTerm);
    } else {
        console.log('Usage: node joke-cli.js <command> [searchTerm]');
        console.log('Available commands: "leaderboard"');
        rl.close();
    }
})();

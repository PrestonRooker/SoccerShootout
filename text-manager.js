let points = 0;

export function updateScore(value) {
    const scoreElement = document.getElementById('score-text');
    scoreElement.textContent = `Goals: ${value}`;
}

export function updatePoints(value){
    const pointElement = document.getElementById('point-text');
    pointElement.textContent = `Points: ${value}`;
}

export function updateGoalText(show) {
    const goalTextElement = document.getElementById('goal-text');
    goalTextElement.style.visibility = show ? "visible" : "hidden";
}

export function updateMisses(value) {
    const missElement = document.getElementById('miss-text');
    missElement.textContent = `Misses: ${value}`;
}

export function updateLifeCounter(lives) {
    const lifeContainer = document.getElementById('life-container');
    lifeContainer.innerHTML = ""; // Clear existing hearts

    for (let i = 0; i < 3-lives; i++) {
        const heartImg = document.createElement("img");
        heartImg.src = "assets/heart.png"; // Replace with the actual path to your heart image
        heartImg.alt = "Heart";
        lifeContainer.append(heartImg);
    }
}

// export function youLose(show,value) {
//     const missTextElement = document.getElementById('lose-text');
//     missTextElement.style.visibility = show ? "visible" : "hidden";
// }

export function youLose(show, value) {
    const loseTextElement = document.getElementById('lose-text');
    points = value; // Update the global points variable
    // loseTextElement.textContent = `Final Score: ${points}`;
    loseTextElement.style.visibility = show ? 'visible' : 'hidden';
}

// export function showFinalScore() {
//     const finalScoreElement = document.getElementById('final-score');
//     finalScoreElement.textContent = `Final Score: ${points}`;
// }

export function updateLevels(value){
    const levelElement = document.getElementById('level-text');
    levelElement.textContent = `Level: ${value}`;
}

export function displayTitleScreen(show){
    const titleElement = document.getElementById('title-text');
    titleElement.style.visibility = show ? "visible" : "hidden";
}
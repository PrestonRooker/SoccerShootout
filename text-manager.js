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

export function updateLifeCounter(misses) {
    const heart_elements = document.getElementsByClassName('heart');
    const totalHearts = heart_elements.length;

    for (let i = 0; i < totalHearts; i++) {
        const heart = heart_elements[i];
        const isVisible = i >= totalHearts - misses;

        if (isVisible) {
            heart.style.opacity = '0.3';
        } else {
            heart.style.opacity = '1';
        }
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
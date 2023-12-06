export function updateScore(value) {
    const scoreElement = document.getElementById('score-text');
    scoreElement.textContent = `Goals: ${value}`;
}

export function updateGoalText(show) {
    const goalTextElement = document.getElementById('goal-text');
    goalTextElement.style.visibility = show ? "visible" : "hidden";
}

export function updateMisses(value) {
    const missElement = document.getElementById('miss-text');
    missElement.textContent = `Misses: ${value}`;
}

export function youLose(show) {
    const missTextElement = document.getElementById('lose-text');
    missTextElement.style.visibility = show ? "visible" : "hidden";
}

export function updateLevels(value){
    const levelElement = document.getElementById('level-text');
    levelElement.textContent = `Level: ${value}`;
}
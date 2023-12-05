export function updateScore(value) {
    const scoreElement = document.getElementById('score-text');
    scoreElement.textContent = `Goals: ${value}`;
}

export function updateGoalText(show) {
    const goalTextElement = document.getElementById('goal-text');
    goalTextElement.style.visibility = show ? "visible" : "hidden";
}

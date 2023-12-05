export function updateScore(value) {
    const scoreElement = document.getElementById('score-text');
    scoreElement.textContent = `Goals: ${value}`;
}

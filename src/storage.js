/**
 * storage.js
 * Lightweight wrapper for HTML5 LocalStorage to handle persistence
 * for GRIDLOCK: SKYLINE.
 */

const STORAGE_KEY = 'gridlock_skyline_highscore';

/**
 * Retrieves the saved high score from local storage.
 * Returns 0 if no score exists or if localStorage is inaccessible.
 * @returns {number}
 */
export function getHighScore() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === null) return 0;

        const score = parseInt(saved, 10);
        return isNaN(score) ? 0 : score;
    } catch (e) {
        console.warn('LocalStorage is restricted or disabled:', e);
        return 0;
    }
}

/**
 * Saves a new score if it exceeds the current high score.
 * @param {number} newScore - The score achieved in the current session.
 * @returns {{ isNewHighScore: boolean, highScore: number }}
 */
export function saveScore(newScore) {
    const currentHigh = getHighScore();
    const isNewHighScore = newScore > currentHigh;

    if (isNewHighScore) {
        try {
            localStorage.setItem(STORAGE_KEY, newScore.toString());
        } catch (e) {
            console.error('Failed to save high score to LocalStorage:', e);
            // We still return true if it was a record, even if persistence failed,
            // to ensure the UI can still show the "New Record" banner.
        }
    }

    return {
        isNewHighScore: isNewHighScore,
        highScore: isNewHighScore ? newScore : currentHigh
    };
}

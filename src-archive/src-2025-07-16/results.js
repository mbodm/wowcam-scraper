/**
 * @param {string} error
 * @returns {object}
 */
export function createError(error) {
    return {
        success: false,
        result: null,
        error
    };
}

/**
 * @param {any} result
 * @returns {object}
 */
export function createSuccess(result) {
    return {
        success: true,
        result,
        error: ''
    };
}
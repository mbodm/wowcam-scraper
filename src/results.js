export function createError(error) {
    return {
        success: false,
        result: null,
        error
    };
}

export function createSuccess(result) {
    return {
        success: true,
        result,
        error: ''
    };
}
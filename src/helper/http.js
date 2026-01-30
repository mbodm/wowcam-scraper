export function createPrettyStatus(statusCode, statusText) {
    if (!statusCode) {
        throw new Error(`Missing "statusCode" argument.`);
    }
    if (statusText) {
        return `HTTP ${statusCode} (${statusText})`;
    }
    else {
        switch (statusCode) {
            case 200:
                return 'HTTP 200 (OK)';
            case 400:
                return 'HTTP 400 (Bad Request)';
            case 500:
                return 'HTTP 500 (Internal Server Error)';
            default:
                return `HTTP ${statusCode}`;
        }
    }
}
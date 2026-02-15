/**
 * Custom error class for upstream service failures (FlareSolverr API, Curse site, and so on).
 * This error type was added to distinguish external dependency failures from internal errors.
 */
export class UpstreamError extends Error {
	constructor(message) {
		super(message);
		this.name = 'UpstreamError';
	}
}
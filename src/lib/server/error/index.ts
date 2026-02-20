export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(code: string, message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ProviderError extends AppError {
  constructor(message: string, details?: unknown) {
    super('PROVIDER_ERROR', message, 502, details);
    this.name = 'ProviderError';
  }
}

export class NoProvidersAvailableError extends AppError {
  constructor() {
    super(
      'NO_PROVIDERS_AVAILABLE',
      'No active or healthy email providers available. Please configure a provider in the dashboard.',
      503
    );
    this.name = 'NoProvidersAvailableError';
  }
}

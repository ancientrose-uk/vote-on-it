interface AuthHandlerConfig {
  allowedUsersFromEnvVars?: string;
}

export class AuthHandler {
  private static instance: AuthHandler;
  private allowedUserTokens: string[] = [];

  public constructor(config:AuthHandlerConfig = {}) {
    if (config.allowedUsersFromEnvVars) {
      config.allowedUsersFromEnvVars.split(",").forEach((user) => {
        this.allowedUserTokens.push(user);
      });
    }
  }

  public createSession(username: string, password: string): string | undefined {
    const test = `${username}:${password}`;
    console.log('looking for %s in', test, this.allowedUserTokens);
    if (this.allowedUserTokens.includes(test)) {
      return 'the-token'
    }

    return undefined;
  }
}

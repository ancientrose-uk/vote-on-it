import { shaEncryptPassword } from "../system-tests/helpers/encryption.ts";
import { ensureDbExists, getSession, setSession } from "./database-access.ts";

await ensureDbExists();

interface AuthHandlerConfig {
  allowedUsersFromEnvVars?: string;
}

export class AuthHandler {
  private static instance: AuthHandler;
  private allowedUserTokens: string[] = [];

  public constructor(config: AuthHandlerConfig = {}) {
    if (config.allowedUsersFromEnvVars) {
      config.allowedUsersFromEnvVars.split(",").forEach((user) => {
        this.allowedUserTokens.push(user);
      });
    }
  }

  public getRequestContext(req: Request) {
    return new RequestContext(req, this);
  }

  public async validateCredentials(
    username: string,
    password: string,
  ): Promise<boolean> {
    const test = `${username}:${await shaEncryptPassword(password)}`;
    console.log("looking for %s in", test, this.allowedUserTokens);
    if (this.allowedUserTokens.includes(test)) {
      return true;
    }

    return false;
  }
}

type User = {
  username: string;
};

export class RequestContext {
  public constructor(
    public req: Request,
    public authHandler: AuthHandler,
  ) {}

  private setCookieResponse = "";

  public async validateCredentialsAndCreateSession(
    username: string,
    password: string,
  ): Promise<boolean> {
    if (await this.authHandler.validateCredentials(username, password)) {
      const token = crypto.randomUUID();
      setSession(token, username);
      this.setCookieResponse = `session=${token}; HttpOnly; Path=/; Max-Age=${
        24 * 60 * 60 * 1000
      }`;
      return true;
    }
    return false;
  }

  public getUser(): User | undefined {
    const cookie = this.req.headers.get("cookie");
    if (!cookie) {
      return undefined;
    }
    const match = cookie.match(/session=([^;]+)/);
    if (match) {
      const token = match[1];
      const username = getSession(token);
      if (username) {
        return { username };
      } else {
        this.setCookieResponse = `session=; HttpOnly; Path=/; Max-Age=0`;
      }
    }
    return undefined;
  }

  public setCookieOnResponse(res: Response) {
    if (this.setCookieResponse) {
      res.headers.set("Set-Cookie", this.setCookieResponse);
    }
    return res;
  }
}

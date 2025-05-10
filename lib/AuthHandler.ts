import { shaEncryptPassword } from "../system-tests/helpers/encryption.ts";
import {
  ensureDbExists,
  getSession,
  setSession,
} from "./db-functions/database-access.ts";
import { VoterId } from "./types.ts";

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

export type User = {
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
      this.setUuidToCookie(`session`, token, 24 * 7);
      return true;
    }
    return false;
  }

  private setUuidToCookie(
    cookieName: string,
    cookieValue: `${string}-${string}-${string}-${string}-${string}`,
    maxAgeInHours: number,
  ) {
    this.setCookieResponse +=
      `${cookieName}=${cookieValue}; HttpOnly; Path=/; Max-Age=${
        maxAgeInHours * 60 * 60 * 1000
      };`;
  }

  private getUuidFromCookie(cookieName: string) {
    const cookie = this.req.headers.get("cookie");
    if (!cookie) {
      return undefined;
    }
    const match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
    if (match && match[1].length === 36) {
      return match[1];
    }
    return undefined;
  }

  public setVoterId(voterId: VoterId) {
    this.setUuidToCookie(`voterId`, voterId, 365 * 24);
  }

  public getVoterId(): VoterId {
    const uuidFromCookie = this.getUuidFromCookie(`voterId`) as
      | VoterId
      | undefined;
    if (!uuidFromCookie) {
      const newVoterId = crypto.randomUUID() as VoterId;
      this.setVoterId(newVoterId);
      return newVoterId;
    }
    return uuidFromCookie;
  }

  public getUser(): User | undefined {
    const sessionId = this.getUuidFromCookie(`session`);
    if (sessionId) {
      const username = getSession(sessionId);
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

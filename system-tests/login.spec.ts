import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";
import { getBrowserPage, startServer } from "./helpers/test_utils.ts";
import { prepareUsernamesAndPasswords } from "./helpers/password-helpers.ts";

describe("Login Tests", () => {
  it("allowed user can log in", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([
          {
            username: "testuser",
            password: "testpassword",
          },
        ]),
      },
    });
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit("/login");
    expect(await browserFns.getHeading(1)).toBe("Log in to your account");

    await browserFns.fillFormWith({
      username: "testuser",
      password: "testpassword",
    });

    await browserFns.clickButton("Log In");

    expect(await browserFns.getCurrentUri()).toBe(`/account`);

    expect(await browserFns.getHeading()).toBe(
      "Welcome to your account testuser!",
    );
  });
  it("not allowed user can not log in", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([{
          username: "testuser",
          password: "not-test-password",
        }]),
      },
    });
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit("/login");
    expect(await browserFns.getHeading(1)).toBe("Log in to your account");

    await browserFns.fillFormWith({
      username: "testuser",
      password: "testpassword",
    });

    await browserFns.clickButton("Log In");

    expect(await browserFns.getHeading()).toBe("Log in to your account");
    expect(await browserFns.getErrorMessage()).toBe(
      "We couldn't find your account",
    );
  });
  it("helpful message when user doesn't enter password", async () => {
    const { baseUrl } = await startServer();
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit("/login");
    expect(await browserFns.getFieldValue("username")).toBe("");

    await browserFns.fillFormWith({
      username: "testuser",
    });

    await browserFns.clickButton("Log In");

    expect(await browserFns.getHeading()).toBe("Log in to your account");
    expect(await browserFns.getErrorMessage()).toBe(
      "Please enter your password",
    );
    expect(await browserFns.getFieldValue("username")).toBe("testuser");

    // make sure the username is still editable

    await browserFns.fillFormWith({
      username: "who-am-i",
    });
    expect(await browserFns.getFieldValue("username")).toBe("who-am-i");
  });
  it("helpful message when user doesn't enter username", async () => {
    const { baseUrl } = await startServer();
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit("/login");
    expect(await browserFns.getFieldValue("password")).toBe("");

    await browserFns.fillFormWith({
      password: "my-password",
    });

    await browserFns.clickButton("Log In");

    expect(await browserFns.getHeading()).toBe("Log in to your account");
    expect(await browserFns.getErrorMessage()).toBe(
      "Please enter your username",
    );
    expect(await browserFns.getFieldValue("password")).toBe("");
  });
  it("helpful message when user doesn't enter username and password", async () => {
    const { baseUrl } = await startServer();
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit("/login");

    await browserFns.clickButton("Log In");

    expect(await browserFns.getErrorMessage()).toBe(
      "Please enter your username and password",
    );
  });
  it("redirect users with no session to the login screen if they try to view the logged in page", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([{
          username: "testuser",
          password: "not-test-password",
        }]),
      },
    });
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit("/account");
    expect(await browserFns.getCurrentUri()).toBe("/login");
  });
  it("should allow multiple different users to be authenticated at once", async () => {
    const serverConfig = {
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([
          {
            username: "user1",
            password: "password1",
          },
          {
            username: "user2",
            password: "password2",
          },
          {
            username: "user3",
            password: "password3",
          },
        ]),
      },
    };
    const { baseUrl, port, dbFile, stopServer } = await startServer(
      serverConfig,
    );
    const sameConfigAsPreviousStart = {
      ...serverConfig,
      env: {
        ...serverConfig.env,
        VOI__SQLITE_LOCATION: dbFile,
        PORT: port,
      },
    };
    async function runScenario(userNumber: number) {
      const { browserFns } = await getBrowserPage(baseUrl);
      await browserFns.visit("/account");
      expect(await browserFns.getCurrentUri()).toBe("/login");
      await browserFns.fillFormWith({
        username: "user" + userNumber,
        password: "password" + userNumber,
      });
      await browserFns.clickButton("Log In");
      expect(await browserFns.getCurrentUri()).toBe("/account");
      return async () => {
        await browserFns.visit("/account");
        expect(await browserFns.getHeading()).toBe(
          "Welcome to your account user" + userNumber + "!",
        );
      };
    }

    const followUps: (() => Promise<void>)[] = [];
    for (let i = 1; i <= 3; i++) {
      followUps.push(await runScenario(i));
    }
    await stopServer();
    await startServer(sameConfigAsPreviousStart);
    await Promise.all(followUps.map((f) => f()));
  });
  it("should not use the real password for envvars", () => {
    const password = "not-test-password";
    const envvarstr = prepareUsernamesAndPasswords([{
      username: "testuser",
      password,
    }]);
    expect(envvarstr).not.toContain(password);
  });
});

import {expect} from "jsr:@std/expect";
import {afterAll, describe, it} from "jsr:@std/testing/bdd";
import { runCleanupTasks, startServer, getBrowserPage } from "./helpers/test_utils.ts";

function prepareUsernamesAndPasswords(array: { username: string, password: string }[]) {
  return array.map(({ username, password }) => {
    return [username, password].join(":");
  }).join(",");
}

describe("Login Tests", () => {
  it("user can log in", async () => {
    const { baseUrl } = await startServer({
      env: {
        ALLOWED_USERS: prepareUsernamesAndPasswords([
          {
            username: "testuser",
            password: "testpassword",
          }
        ]),
      }
    })
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/login');
    const heading = await browserFns.getHeading();

    expect(heading).toBe("Log in to your account");

    await browserFns.fillFormWith({
      username: 'testuser',
      password: 'testpassword',
    });

    await browserFns.clickButton('Log In');

    const headingAfterLogin = await browserFns.getHeading();
    expect(headingAfterLogin).toBe("Welcome to your account testuser!");
  });
});

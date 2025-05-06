import {expect} from "jsr:@std/expect";
import {describe, it} from "jsr:@std/testing/bdd";
import {getBrowserPage, startServer} from "./helpers/test_utils.ts";

function replacePasswordWithKnownShaValue(password:string) {
  switch(password) {
    case "testpassword":
      return "9f735e0df9a1ddc702bf0a1a7b83033f9f7153a00c29de82cedadc9957289b05";
    case "not-test-password":
      return "dd467bd47cbddf440fdd8fd7574ed55d1dca1809cdb15a885e6ac8a9b8ab3540";
  }
  throw new Error('Could not find known sha value for password: ' + password);
}

function prepareUsernamesAndPasswords(array: { username: string, password: string }[]) {
  return array.map(({ username, password }) => {
    return [username, replacePasswordWithKnownShaValue(password)].join(":");
  }).join(",");
}

describe("Login Tests", () => {
  it("allowed user can log in", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([
          {
            username: "testuser",
            password: "testpassword",
          }
        ]),
      }
    })
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/login');
    expect(await browserFns.getHeading()).toBe("Log in to your account");

    await browserFns.fillFormWith({
      username: 'testuser',
      password: 'testpassword',
    });

    await browserFns.clickButton('Log In');

    expect(await browserFns.getCurrentUri()).toBe(`/account`);

    expect(await browserFns.getHeading()).toBe("Welcome to your account testuser!");
  });
  it("not allowed user can not log in", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([{
          username: 'testuser',
          password: 'not-test-password',
        }]),
      }
    })
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/login');
    expect(await browserFns.getHeading()).toBe("Log in to your account");

    await browserFns.fillFormWith({
      username: 'testuser',
      password: 'testpassword',
    });

    await browserFns.clickButton('Log In');

    expect(await browserFns.getHeading()).toBe("Log in to your account");
    expect(await browserFns.getErrorMessage()).toBe("We couldn't find your account");
  });
  it("helpful message when user doesn't enter password", async () => {
    const { baseUrl } = await startServer()
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/login');
    expect(await browserFns.getFieldValue('username')).toBe('');

    await browserFns.fillFormWith({
      username: 'testuser',
    });

    await browserFns.clickButton('Log In');

    expect(await browserFns.getHeading()).toBe("Log in to your account");
    expect(await browserFns.getErrorMessage()).toBe("Please enter your password");
    expect(await browserFns.getFieldValue('username')).toBe('testuser');
  });
  it("helpful message when user doesn't enter username", async () => {
    const { baseUrl } = await startServer()
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/login');
    expect(await browserFns.getFieldValue('password')).toBe('');

    await browserFns.fillFormWith({
      password: 'my-password',
    });

    await browserFns.clickButton('Log In');

    expect(await browserFns.getHeading()).toBe("Log in to your account");
    expect(await browserFns.getErrorMessage()).toBe("Please enter your username");
    expect(await browserFns.getFieldValue('password')).toBe('');
  });
  it("helpful message when user doesn't enter username and password", async () => {
    const { baseUrl } = await startServer()
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/login');

    await browserFns.clickButton('Log In');

    expect(await browserFns.getErrorMessage()).toBe("Please enter your username and password");
  });
  it("redirect users with no session to the login screen if they try to view the logged in page", async () => {
    const { baseUrl } = await startServer({
      env: {
        VOI__ALLOWED_USERS: prepareUsernamesAndPasswords([{
          username: 'testuser',
          password: 'not-test-password',
        }]),
      }
    })
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/account');
    expect(await browserFns.getCurrentUri()).toBe('/login');
  });
  it("should not use the real password for envvars", async () => {
    const password = 'not-test-password';
    const envvarstr = prepareUsernamesAndPasswords([{
      username: 'testuser',
      password,
    }])
    expect(envvarstr).not.toContain(password);
  });
});

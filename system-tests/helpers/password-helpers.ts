function replacePasswordWithKnownShaValue(password: string) {
  switch (password) {
    case "testpassword":
      return "9f735e0df9a1ddc702bf0a1a7b83033f9f7153a00c29de82cedadc9957289b05";
    case "not-test-password":
      return "dd467bd47cbddf440fdd8fd7574ed55d1dca1809cdb15a885e6ac8a9b8ab3540";
    case "password1":
      return "0b14d501a594442a01c6859541bcb3e8164d183d32937b851835442f69d5c94e";
    case "password2":
      return "6cf615d5bcaac778352a8f1f3360d23f02f34ec182e259897fd6ce485d7870d4";
    case "password3":
      return "5906ac361a137e2d286465cd6588ebb5ac3f5ae955001100bc41577c3d751764";
  }
  throw new Error(
    `Could not find known sha value for password: [${password}], for the tests we only use known sha values.  You can generate these values using [./scripts/envrypt.ts ${password}]`,
  );
}

export function prepareUsernamesAndPasswords(
  array: { username: string; password: string }[],
) {
  return array.map(({ username, password }) => {
    return [username, replacePasswordWithKnownShaValue(password)].join(":");
  }).join(",");
}

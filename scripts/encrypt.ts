#!/usr/bin/env deno

import {shaEncryptPassword} from "../system-tests/helpers/encryption.ts";

const passwords = Deno.args

if (passwords.length === 0) {
  console.error("Please provide one or more passwords to encrypt as arguments.")
  Deno.exit(1)
}

console.log("Encrypting passwords...")

console.log(await Promise.all(passwords.map(async (password) => [password, '=>', await shaEncryptPassword(password)].join(' '))))

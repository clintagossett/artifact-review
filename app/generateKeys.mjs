import { generateKeyPair, exportJWK, exportPKCS8 } from "jose";

const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = await exportJWK(publicKey);
const privateKeyPKCS8 = await exportPKCS8(privateKey);

console.log(`JWT_PRIVATE_KEY="${privateKeyPKCS8.replace(/\n/g, "\\n")}"`);
console.log(`JWKS='{"keys":[${JSON.stringify(jwk)}]}'`);

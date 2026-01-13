
const { execSync } = require('child_process');

const CONVEX_SELF_HOSTED_URL = "http://127.0.0.1:3210";
const CONVEX_SELF_HOSTED_ADMIN_KEY = "artifact-review-local|01c54c6b7cfa68a0b3b152ef4c5adc7e8a36686d81f027d6cf2a224fee90bef056aeacf827";

const vars = {
    INTERNAL_API_KEY: "6bc98ddfccf54063dc0b512753a912971c5dd7b76a1b9358821028e932985d21",
    SITE_URL: "http://localhost:3000",
    RESEND_API_KEY: "re_test_dummy",
    RESEND_FROM_EMAIL: "auth@localhost",
    CONVEX_SELF_HOSTED_URL: CONVEX_SELF_HOSTED_URL,
    RESEND_TEST_MODE: "true",
    JWKS: '{"keys":[{"kty":"RSA","n":"4-QFpZfjXJVDCHD5I_ttBL9QwVvmKJY9E7HnvvuDhRiTcoE8DQJ9Qrv6GwZ1fcWzQN0RxGmYa4cD1eXq2boPtTAiw4IpIJ0CMRGNW-8AOnvPs-A1JlCinnDjc_DrRb7m3UsBhCrWQofJpYuAnxlDXaki5YoZ4U-D3rrrqqdb8xk9dHv3I3A64BirvyP0tilmwGhV37pOOZuDMJdriWX0wdIRwRAREePgTIqkmdmnfiybvOcfAjcEU9G9LWcv1hKtjk3yQEVol9KFacx4ABtNUrlh0fE7UCMmr1_SvNAsr3aKknMYNl-3BWV56h4urOh_Yc7rHWUnIZA0yJB3UxImUw","e":"AQAB"}]}',
    JWT_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDj5AWll+NclUMI
cPkj+20Ev1DBW+Yolj0Tsee++4OFGJNygTwNAn1Cu/obBnV9xbNA3RHEaZhrhwPV
5erZug+1MCLDgikgnQIxEY1b7wA6e8+z4DUmUKKecONz8OtFvubdSwGEKtZCh8ml
i4CfGUNdqSLlihnhT4Peuuuqp1vzGT10e/cjcDrgGKu/I/S2KWbAaFXfuk45m4Mw
l2uJZfTB0hHBEBER4+BMiqSZ2ad+LJu85x8CNwRT0b0tZy/WEq2OTfJARWiX0oVp
zHgAG01SuWHR8TtQIyavX9K80CyvdoqScxg2X7cFZXnqHi6s6H9hzusdZSchkDTI
kHdTEiZTAgMBAAECggEABhikTVzl+vo5NqwYVhiUlC3EAhrXFNs0BhIFHOGgj+UW
PgLBXFMRORb15qwtD3DETftmosZKYAdWwxg+nerGycuLBTI3BHApeK47WwFmlFSZ
5qTG9zVCrGdhBknPGWi1HKgJgdjILjPGC/99MNmy/iSXUjmis0QhHHUL9zQ5QaRX
HhVaY4LgQIArknxca7rBAqabiPjp1kqee5Yem/YhfQvpcehn48lga3ryxY9Odgix
aMvP6e3ynQfvzo+srWtlP0jsBvnOBmfBGg5k1ij+s61bXNs3lnD2p6hDDZkCiUtl
vap0UnpMSOJdxOq9rQyaeyKQ3q90QqjD4AYCGpHKoQKBgQD2kSTOM7UISC7EJeDq
tPLhSWjXKE0lFlAwkKrAmvFfjQi7G6eUykJ1n3eacZhxr6L9VBzySNK9SZClLYo1
fkHe3W5V44OjI+6bna20A09rgr7ZjOdqu7D0vwAk3YFmgnvetCfajScyNmcZIJJ0
nuCCt5VCFRAMxHuJUhU81Es/sIQKBgQDsm/bvkd+wXDoC24qBgpY6TVDmL3auD32J
1uk1Jz8+Xtrvb20jl6K/2hF4O19DYsBP5misubQ3zunenQJlxtq2ZpKQLzkFparL
ItuJ0HqqZX7+B3qG9j+oWEF+ulSrHgWLd3ddjWLZ3SK9Rl5M1fQbaU81Ni5AwcTY
Vd2IKNyj8wKBgQChqBfReeU/QNQolg0Y1PpI6rBqIGoz3qVEshTBotSOKRGIW2FM
FC/unlb0U3X3U4gxP2ybDVPd9tV29pye5eCaFeO5PCmaVHykWoUAeQshGd+3EsLH
H7etP20AvpmQdAxyvvtCNzlzmmeN+eUL0YzbdnWMakMNeYo6kAyWZ3cbAQKBgQCz
iZExri3fQ8wdGPubVDysFrjZQZC7eTOYIUQqOhKqQA2++30EMe6jx1PUOLELj+Y/
eqVY0zzl0BL0AY2tLtwM5f42fC63k0LrCxMtGs3JeGSJW6FkwXwCQJ3KDJdslMY+
UrN3gG5OxJa0qq2ffvRxPH+fZNRPfcg9N65j9AEcwKBgQCN2ybuW9ghAKTBfaGg
aEJGAWbn9PI8u7EMoppbCdTFMR7n2f4gGR1dfJ44HC5HMgaehX+tVSXsOjyZgcjp
hnxw91/WIc3Cr7sfT6Q88QLcAgMa9HlhDh9HPChBMTMf1W9j0d2l49VuLPjG8Mav
9EpDf1bJ3wHil5cqen8aaKUodQ==
-----END PRIVATE KEY-----`
};

const cleanEnv = { ...process.env };
delete cleanEnv.CONVEX_DEPLOYMENT;
cleanEnv.CONVEX_SELF_HOSTED_URL = CONVEX_SELF_HOSTED_URL;
cleanEnv.CONVEX_SELF_HOSTED_ADMIN_KEY = CONVEX_SELF_HOSTED_ADMIN_KEY;

for (const [key, value] of Object.entries(vars)) {
    console.log(`Setting ${key}...`);
    try {
        execSync(`npx convex env set ${key} -- "${value.replace(/"/g, '\\"')}"`, {
            env: cleanEnv,
            stdio: 'inherit'
        });
    } catch (e) {
        console.error(`Failed to set ${key}`);
    }
}

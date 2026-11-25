// Adresse e-mail et téléphone de LuxInterventions (même adresse protégée que le site : /assets/mail.js)
const ENC = '33343c351a362f2233342e3f282c3f342e3335342974393537';
export const luxMail = () => { let o = ''; for (let i = 0; i < ENC.length; i += 2) o += String.fromCharCode(parseInt(ENC.substr(i, 2), 16) ^ 0x5a); return o; };
export const LUX_TEL = '+352691423943';
export const LUX_TEL_TXT = '+352 691 423 943';

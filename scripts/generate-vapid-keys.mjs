import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Copia estas variables a Railway y .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=https://mundial-compas.up.railway.app`);

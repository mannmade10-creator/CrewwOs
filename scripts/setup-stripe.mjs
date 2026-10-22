import Stripe from "stripe";

const stripe = new Stripe("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");

const results = {};

const plans = [
  ["CrewwOS Starter", 9900, "starter", 3],
  ["CrewwOS Pro", 29900, "pro", 5],
  ["CrewwOS Enterprise", 99900, "enterprise", 10],
];
for (const [name, amount, key, agents] of plans) {
  const p = await stripe.products.create({ name, metadata: { plan: key, agents: String(agents) } });
  const pr = await stripe.prices.create({ product: p.id, unit_amount: amount, currency: "usd", recurring: { interval: "month" } });
  results[key] = pr.id;
  console.log(`${name}: ${pr.id}`);
}

const site = await stripe.products.create({ name: "CrewwOS Website + App Builder" });
for (const [label, amount] of [["basic", 15000], ["pro", 29900], ["elite", 49900]]) {
  const pr = await stripe.prices.create({ product: site.id, unit_amount: amount, currency: "usd", metadata: { tier: label } });
  results[`site_${label}`] = pr.id;
  console.log(`Site ${label}: ${pr.id}`);
}

const nia = await stripe.products.create({ name: "Nia AI Receptionist — Setup" });
const niaSetup = await stripe.prices.create({ product: nia.id, unit_amount: 9900, currency: "usd" });
results["nia_setup"] = niaSetup.id;
console.log(`Nia setup: ${niaSetup.id}`);

const cred = await stripe.products.create({ name: "Nia Credits" });
for (const [credits, amount] of [[500, 1900], [1500, 4900], [5000, 12900]]) {
  const pr = await stripe.prices.create({ product: cred.id, unit_amount: amount, currency: "usd", metadata: { credits: String(credits) } });
  results[`nia_credits_${credits}`] = pr.id;
  console.log(`Nia ${credits} credits: ${pr.id}`);
}

const biz = await stripe.products.create({ name: "Business Formation" });
for (const [label, amount] of [["registration", 14900], ["ein", 9900], ["bundle", 29900], ["registered_agent", 4900]]) {
  const pr = await stripe.prices.create({ product: biz.id, unit_amount: amount, currency: "usd", metadata: { service: label } });
  results[`biz_${label}`] = pr.id;
  console.log(`Biz ${label}: ${pr.id}`);
}

console.log("\n=== PRICE IDS ===");
for (const [k, v] of Object.entries(results)) console.log(`${k}=${v}`);
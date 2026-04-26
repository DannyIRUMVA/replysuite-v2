const apiKey = process.env.GEMINI_API_KEY;
async function test() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  const models = data.models.map(m => m.name).filter(n => n.includes('flash') || n.includes('pro'));
  console.log("Generative Models:", models);
}
test();

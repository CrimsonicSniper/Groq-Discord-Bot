const EventSource = require('eventsource');

function generateSessionHash() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomDigits() {
  return Math.floor(Math.random() * (999999999 - 100000000 + 1) + 100000000);
}

function generateImg(prompt, aspect_ratio) {
  let width, height;
  if (aspect_ratio == 'square') {
    width = 1024;
    height = 1024;
  } else if (aspect_ratio == 'landscape') {
    width = 1280;
    height = 768;
  } else if (aspect_ratio == 'portrait') {
    width = 768;
    height = 1280;
  }
  return new Promise(async (resolve, reject) => {
    try {
      const randomDigits = generateRandomDigits();
      const sessionHash = generateSessionHash();

      await fetch("https://bytedance-hyper-flux-8steps-lora.hf.space/queue/join?", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [width, height, 8, 3.5, prompt, randomDigits],
          event_data: null,
          fn_index: 0,
          trigger_id: 18,
          session_hash: sessionHash
        }),
      });

      const es = new EventSource(`https://bytedance-hyper-flux-8steps-lora.hf.space/queue/data?session_hash=${sessionHash}`);

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.msg === 'process_completed') {
          es.close();
          const outputUrl = data?.output?.data?.[0]?.[0]?.image?.url || data?.output?.data?.[0]?.url || data?.output?.data?.[1]?.url;
          if (!outputUrl) {
            reject(new Error("Output URL does not exist, path might be invalid."));
            console.dir(data);
          } else {
            resolve(outputUrl);
          }
        }
      };

      es.onerror = (error) => {
        es.close();
        reject(error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation(fn, maxRetries, delayMs = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      console.log(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        console.log(`Waiting ${delayMs}ms before next attempt...`);
        await delay(delayMs);
      } else {
        throw new Error(`Operation failed after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
}

module.exports = { generateImg, retryOperation };
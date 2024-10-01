function splitMessage(message, limit = 2000) {
  if (message.length <= limit) return [message];

  const parts = [];
  let index = 0;
  while (index < message.length) {
    let nextPart = message.slice(index, index + limit);
    const lastSpace = nextPart.lastIndexOf(' ');
    if (lastSpace > 0 && index + limit < message.length) {
      nextPart = message.slice(index, index + lastSpace);
      index += lastSpace + 1;
    } else {
      index += limit;
    }
    parts.push(nextPart);
  }
  return parts;
}

module.exports = { splitMessage };
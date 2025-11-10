// shuffledExpressionPrompts.js
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

const expressionPrompts = [
  {
      "id": 1,
      "prompt": "Show me the the face of someone who is happy and appears open to new experiences and shows a high level of imagination. This person should look like they are pondering creative ideas or engaging in a novel task.",
      "B5T": "Openness"
  },
  {
      "id": 2,
      "prompt": "Show me the the face of someone who is happy and appears extremely meticulous and organized. This individual should have  showing focus and attention to detail, possibly while organizing or planning something.",
      "B5T": "Conscientiousness"
  },
  {
      "id": 3,
      "prompt": "Show me the the face of someone who is happy and looks highly sociable and energetic. The expression should be lively  with an outgoing personality.",
      "B5T": "Extraversion"
  },
  {
      "id": 4,
      "prompt": "Show me the the face of someone who is happy and looks exceedingly warm and empathetic. This person should have a gentle, inviting smile and eyes that convey kindness and a cooperative nature.",
      "B5T": "Agreeableness"
  },
  {
      "id": 5,
      "prompt": "Show me the the face of someone who is happy and looks relaxed and unenvious. This person should have a relaxed demeanor, with a composed facial expression that suggests they are in control and unruffled by stress.",
      "B5T": "Emotional Stability"
  }
];

export default shuffleArray(expressionPrompts);


// useFeedback.js
// Custom React hook for managing temporary feedback messages (success/error) in UI components.
// Usage:
//   const [feedback, showFeedback] = useFeedback();
//   showFeedback('success', 'Operation réussie!');
//   // feedback will be an object { type, msg } for display, and auto-clears after 4 seconds.

import { useState } from "react";

const useFeedback = () => {
  const [feedback, setFeedback] = useState(null);
  const show = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };
  return [feedback, show];
};

export default useFeedback;

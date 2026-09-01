// FeedbackBadge.jsx
// Shows feedback messages in a reserved space to avoid layout shift

const FeedbackBadge = ({ feedback }) => (
  <div className="min-h-[36px]">
    {feedback && (
      <div className={`px-3 py-2 rounded-xl text-xs font-semibold ${
        feedback.type === "success"
          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
          : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
      }`}>
        {feedback.msg}
      </div>
    )}
  </div>
);

export default FeedbackBadge;

// Table.jsx
// Wrapper for table with horizontal scroll

const Table = ({ children }) => (
  <div className="overflow-x-auto">
    <table className="w-full">{children}</table>
  </div>
);

export default Table;

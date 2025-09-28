export function Button({ children, onClick, variant = "default", ...props }) {
  const styles =
    variant === "destructive"
      ? "bg-red-500 text-white px-3 py-1 rounded"
      : variant === "outline"
      ? "border px-3 py-1 rounded"
      : "bg-blue-500 text-white px-3 py-1 rounded";

  return (
    <button onClick={onClick} className={styles} {...props}>
      {children}
    </button>
  );
}
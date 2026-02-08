export function RowLabel({ label }: { label: string }) {
  return (
    <div className="border-b border-r border-gray-300 bg-gray-50 p-2 text-xs font-bold text-gray-500 flex items-start">
      {label}
    </div>
  );
}

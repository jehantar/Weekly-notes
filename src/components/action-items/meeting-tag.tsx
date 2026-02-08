export function MeetingTag({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0 bg-purple-100 text-purple-700 text-[10px] font-medium rounded-sm mx-0.5">
      #{title}
    </span>
  );
}

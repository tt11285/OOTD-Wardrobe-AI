import Link from "next/link";

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{copy}</p>
      <Link className="primary-button" href="/upload">
        去上传衣服
      </Link>
    </section>
  );
}

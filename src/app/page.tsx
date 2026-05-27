import Link from "next/link";

export default function HomePage() {
  return (
    <main className="app-page hero-page">
      <section className="hero">
        <p className="eyebrow">OOTD</p>
        <h1>今天穿什么，交给你的真实衣橱。</h1>
        <p className="hero-copy">
          上传衣服照片，AI 识别单品，再按通勤、面试、约会等场合生成可直接穿的搭配。
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href="/upload">
            开始建库
          </Link>
          <Link className="secondary-button" href="/outfits">
            今天穿什么
          </Link>
        </div>
      </section>
    </main>
  );
}

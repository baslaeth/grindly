import { load } from "cheerio";

const material =
  /airdrop|provision|eligib|claim|deadline|snapshot|fee|cost|lock|exclu|prerequi|wallet|deposit|guarante|point|discontinu|expire|reward/i;

// Scan the bounded document, including late FAQ sections; preserve exact normalized passages.
export function documentPassages(raw: string, focus = "") {
  const $ = load(raw);
  const title = $("title").text().trim().slice(0, 120);
  const published =
    $("meta[property='article:published_time']").attr("content") ??
    $("time[datetime]").first().attr("datetime");
  $(
    "script,style,nav,header,footer,form,button,noscript,svg,dialog,[role=dialog]",
  ).remove();
  const root = $("main").length
    ? $("main")
    : $("article").length
      ? $("article")
      : $("body");
  const terms = [
    ...new Set(focus.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []),
  ].slice(0, 40);
  const blocks = root
    .find("p,li,h1,h2,h3,h4,td")
    .toArray()
    .filter((el) => !$(el).find("p,li").length)
    .flatMap((el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      return text.length <= 1200
        ? [text]
        : text.split(/(?<=[.!?])\s+(?=[A-Z])/);
    })
    .map((s) => s.trim())
    .filter((s) => s.length >= 15 && s.length <= 1200);
  if (!blocks.length)
    blocks.push(
      ...(root
        .text()
        .replace(/\s+/g, " ")
        .trim()
        .match(/.{1,1000}(?:\s|$)/g) ?? []),
    );
  const unique = [...new Set(blocks)].slice(0, 1500);
  const scored = unique.map((text, index) => ({
    text,
    index,
    score:
      (material.test(text) ? 5 : 0) +
      (/discontinu|expire|no longer|closed|only|exclu|not guarantee/i.test(text)
        ? 8
        : 0) +
      terms.filter((t) => text.toLowerCase().includes(t)).length,
  }));
  const selected = scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 24)
    .sort((a, b) => a.index - b.index);
  let length = 0;
  const passages = selected
    .filter((p) => (length += p.text.length) <= 14000)
    .map((p) => ({ index: p.index, text: p.text }));
  return {
    title,
    published,
    passages,
    totalPassages: unique.length,
    excerpt: passages.map((p) => p.text).join("\n"),
    headings: root
      .find("h1,h2,h3")
      .map((_, el) => $(el).text().trim().slice(0, 160))
      .get()
      .slice(0, 24),
  };
}

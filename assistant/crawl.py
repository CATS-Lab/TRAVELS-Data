"""Crawl the TRAVELS center site, plus the external pages its content links to.

Scope
  * Every HTML page on travels.project.wiscweb.wisc.edu (breadth-first).
  * One hop out: external pages linked from the *main content* of those pages.
    Header/footer links (UW boilerplate: privacy notice, accessibility...) are
    ignored so that general UW questions do not look "on topic".
  * External sites' robots.txt is honoured. The TRAVELS site's robots.txt
    disallows all crawlers because it is not launched yet; it is crawled on
    the center's own authority (this is the center's own assistant).

Output: data/pages.jsonl, one {url, title, text, source, fetched_at} per line.
"""
import json, re, sys, time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag
from urllib import robotparser

import requests
from bs4 import BeautifulSoup

SEED = "https://travels.project.wiscweb.wisc.edu/"
HOME = urlparse(SEED).netloc
UA = "TRAVELS-assistant-crawler/0.1 (+https://cats-lab.github.io/TRAVELS-Data/)"
MAX_INTERNAL = 250
DELAY = 1.0  # seconds between requests to the same host
SKIP_EXT = re.compile(r"\.(pdf|jpe?g|png|gif|svg|webp|mp4|mov|zip|docx?|pptx?|xlsx?|ics|xml)$", re.I)
SKIP_PATH = re.compile(r"/(wp-admin|wp-json|wp-login|feed|xmlrpc|tag|author)(/|$)|[?&](s|replytocom|share)=", re.I)
SKIP_HOSTS = {"twitter.com", "x.com", "facebook.com", "www.facebook.com", "linkedin.com",
              "www.linkedin.com", "instagram.com", "www.instagram.com", "youtube.com",
              "www.youtube.com", "youtu.be", "accessible.wisc.edu", "uwtheme.brand.wisc.edu",
              "www.wisc.edu", "wisc.edu", "maps.google.com", "goo.gl"}
DROP_TAGS = ["script", "style", "noscript", "nav", "header", "footer", "aside", "form",
             "iframe", "svg", "button"]
BLOCKS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "td", "th", "dt", "dd",
          "blockquote", "figcaption", "pre"]

session = requests.Session()
session.headers["User-Agent"] = UA
last_hit = {}
robots = {}


def norm(url):
    url, _ = urldefrag(url)
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        return None
    path = p.path or "/"
    return f"{p.scheme}://{p.netloc.lower()}{path}" + (f"?{p.query}" if p.query else "")


def allowed(url):
    host = urlparse(url).netloc
    if host == HOME:
        return True  # see module docstring
    if host not in robots:
        rp = robotparser.RobotFileParser()
        try:
            r = session.get(f"https://{host}/robots.txt", timeout=15)
            rp.parse(r.text.splitlines() if r.status_code == 200 else [])
        except requests.RequestException:
            rp.parse([])
        robots[host] = rp
    return robots[host].can_fetch(UA, url)


def fetch(url):
    host = urlparse(url).netloc
    wait = DELAY - (time.time() - last_hit.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    last_hit[host] = time.time()
    r = session.get(url, timeout=25, allow_redirects=True)
    if r.status_code != 200 or "text/html" not in r.headers.get("content-type", ""):
        return None, r.url
    r.encoding = r.apparent_encoding if not r.encoding or r.encoding.lower() == "iso-8859-1" else r.encoding
    return r.text, r.url


def content_root(soup):
    for sel in ["main", "article", "[role=main]", "#content", ".entry-content", "body"]:
        el = soup.select_one(sel)
        if el and len(el.get_text(strip=True)) > 200:
            return el
    return soup.body or soup


def extract(html, url):
    soup = BeautifulSoup(html, "html.parser")
    title = (soup.title.get_text(" ", strip=True) if soup.title else url)
    title = re.sub(r"\s*[|–-]\s*(TRAVELS Center\s*[–-]\s*)?UW[–-]Madison\s*$", "", title).strip() or title
    root = content_root(soup)
    links = [a["href"] for a in root.find_all("a", href=True)]
    for t in root.find_all(DROP_TAGS):
        t.decompose()
    lines, seen = [], set()
    for el in root.find_all(BLOCKS):
        if el.find(BLOCKS):  # emit only innermost blocks, so text is not repeated
            continue
        txt = re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()
        if len(txt) < 3 or txt in seen:
            continue
        seen.add(txt)
        lines.append(("#" * int(el.name[1]) + " " + txt) if el.name[0] == "h" and el.name[1].isdigit() else txt)
    return title, "\n".join(lines), links


def main():
    out = Path(__file__).parent / "data" / "pages.jsonl"
    queue, queued = deque([SEED]), {SEED}
    external, pages, skipped = set(), [], []

    while queue and len([p for p in pages if p["source"] == "internal"]) < MAX_INTERNAL:
        url = queue.popleft()
        try:
            html, final = fetch(url)
        except requests.RequestException as e:
            skipped.append((url, f"error {type(e).__name__}")); continue
        if html is None:
            skipped.append((url, "not html / not 200")); continue
        final = norm(final) or url
        if urlparse(final).netloc != HOME:
            continue
        title, text, links = extract(html, final)
        if final not in {p["url"] for p in pages}:
            pages.append(dict(url=final, title=title, text=text, source="internal"))
            print(f"[in ] {len(text):6d} chars  {final}", flush=True)
        for href in links:
            u = norm(urljoin(final, href))
            if not u or SKIP_EXT.search(urlparse(u).path) or SKIP_PATH.search(u):
                continue
            host = urlparse(u).netloc
            if host == HOME:
                if u not in queued:
                    queued.add(u); queue.append(u)
            elif host not in SKIP_HOSTS:
                external.add(u)

    for u in sorted(external):
        if not allowed(u):
            skipped.append((u, "robots.txt disallows")); continue
        try:
            html, final = fetch(u)
        except requests.RequestException as e:
            skipped.append((u, f"error {type(e).__name__}")); continue
        if html is None:
            skipped.append((u, "not html / not 200")); continue
        title, text, _ = extract(html, norm(final) or u)
        if len(text) < 200:
            skipped.append((u, "too little text")); continue
        pages.append(dict(url=norm(final) or u, title=title, text=text, source="external"))
        print(f"[ext] {len(text):6d} chars  {u}", flush=True)

    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with out.open("w") as f:
        for p in pages:
            f.write(json.dumps({**p, "fetched_at": stamp}, ensure_ascii=False) + "\n")
    print(f"\n{len(pages)} pages written to {out}")
    print(f"  internal {sum(p['source']=='internal' for p in pages)}, external {sum(p['source']=='external' for p in pages)}")
    if skipped:
        print(f"{len(skipped)} skipped:")
        for u, why in skipped:
            print(f"  - {why:22} {u}")


if __name__ == "__main__":
    sys.exit(main())

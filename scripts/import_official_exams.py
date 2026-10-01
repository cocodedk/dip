"""Extract published Indfødsretsprøven questions and official answer keys."""

from __future__ import annotations

import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import urlopen

PREPARATION_URL = (
    "https://danskogproever.dk/borger/indfoedsretsproeve-statsborgerskab/"
    "forberedelse-til-indfoedsretsproeven/"
)
SOURCE_DIR = Path("/tmp/indfoedsretsproeve-src")
OUTPUT = Path("i/data/official-exams.json")
FILE_RE = re.compile(r"indfoedsretsproeven-(20\d\d-\d\d)(-retteark)?\.pdf$")
QUESTION_RE = re.compile(r"^(\d{1,2})\.\s+(.+)$")
OPTION_RE = re.compile(r"^[☐☒]?\s*([ABC]):\s*(.*)$")
ANSWER_RE = re.compile(r"^\s*(\d{1,2})\s+([ABC])\s*$", re.MULTILINE)


class PdfLinks(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.current_href: str | None = None
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            self.current_href = dict(attrs).get("href")

    def handle_endtag(self, tag: str) -> None:
        if tag == "a":
            self.current_href = None

    def handle_data(self, data: str) -> None:
        if self.current_href and "indfoedsretsproeven-20" in self.current_href:
            url = urljoin(PREPARATION_URL, self.current_href)
            if FILE_RE.search(url) and url not in self.links:
                self.links.append(url)


def pdf_text(path: Path) -> str:
    return subprocess.check_output(["pdftotext", "-layout", str(path), "-"], text=True)


def clean(line: str) -> str:
    return " ".join(line.replace("\f", " ").strip().split())


def is_noise(line: str) -> bool:
    return (
        not line
        or bool(re.match(r"^Spørgsmål \d{1,2}-\d{1,2}", line))
        or bool(re.match(r"^\d+\s*[· ]+Indfødsretsprøven", line))
    )


def parse_questions(text: str, answers: dict[int, str], source_url: str, key_url: str, term: str) -> list[dict]:
    questions: list[dict] = []
    expected = 1
    item: dict | None = None
    current_option: str | None = None
    for raw in text.splitlines():
        line = clean(raw)
        if is_noise(line):
            continue
        match = QUESTION_RE.match(line)
        if match and int(match.group(1)) == expected:
            item = {
                "id": f"{term}-{expected:02}",
                "term": term,
                "number": expected,
                "category": "values" if len(answers) == 45 and expected >= 41 else (
                    "current" if expected >= 36 else "material"
                ),
                "question": match.group(2),
                "options": {},
                "answer": answers[expected],
                "source": source_url,
                "answerSource": key_url,
            }
            questions.append(item)
            expected += 1
            current_option = None
            continue
        if item is None:
            continue
        option = OPTION_RE.match(line)
        if option:
            current_option = option.group(1)
            item["options"][current_option] = option.group(2)
        elif current_option:
            item["options"][current_option] += " " + line
        else:
            item["question"] += " " + line
    for question in questions:
        corrections = {
            "2021-06-18": ("1800- tallet", "1800-tallet"),
            "2021-06-22": ("hi- storie", "historie"),
            "2021-06-23": ("arbejds- marked", "arbejdsmarked"),
            "2021-06-36": ("mini- ster", "minister"),
            "2024-11-45": ("LGBTI- personer", "LGBTI-personer"),
        }
        if question["id"] in corrections:
            before, after = corrections[question["id"]]
            assert before in question["question"], question["id"]
            question["question"] = question["question"].replace(before, after)
        assert list(question["options"]) in (["A", "B"], ["A", "B", "C"]), question["id"]
        assert question["answer"] in question["options"], question["id"]
    assert len(questions) == len(answers), (term, len(questions), len(answers))
    return questions


def main() -> None:
    page = urlopen(PREPARATION_URL).read().decode("utf-8")
    links = PdfLinks()
    links.feed(page)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    by_file: dict[str, str] = {}
    for url in links.links:
        filename = url.rsplit("/", 1)[-1]
        by_file[filename] = url
        path = SOURCE_DIR / filename
        if not path.exists():
            path.write_bytes(urlopen(url).read())
    all_questions: list[dict] = []
    for filename in sorted(by_file):
        match = FILE_RE.fullmatch(filename)
        if not match or match.group(2):
            continue
        term = match.group(1)
        key_name = filename.removesuffix(".pdf") + "-retteark.pdf"
        assert key_name in by_file, key_name
        answers = {int(n): answer for n, answer in ANSWER_RE.findall(pdf_text(SOURCE_DIR / key_name))}
        assert list(answers) == list(range(1, len(answers) + 1)), term
        questions = parse_questions(
            pdf_text(SOURCE_DIR / filename), answers, by_file[filename], by_file[key_name], term
        )
        print(term, len(questions))
        all_questions.extend(questions)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(all_questions, ensure_ascii=False, indent=2) + "\n")
    print("total", len(all_questions))


if __name__ == "__main__":
    main()

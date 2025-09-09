import argparse
import json
import os
import re
import sys
from typing import List, Dict, Any

try:
    # 纯本地推理：使用 llama-cpp-python 直接加载 GGUF 模型（可在 Vulkan/CUDA/CPU 上运行）
    from llama_cpp import Llama
except Exception as e:
    print("[ERROR] 未找到 llama_cpp 库。请先安装: pip install llama-cpp-python", file=sys.stderr)
    raise


class LLMJapaneseSegmenter:
    def __init__(self, model_path: str, ctx_size: int = 4096, gpu_layers: int = 35, threads: int = 0):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"模型文件不存在: {model_path}")
        # 说明（不联网）：若已用 Vulkan/CUDA 编译的 llama.cpp/llama-cpp-python，本参数将启用 GPU 分层加速；
        # 在仅 CPU 环境下也可运行（但速度会慢）。
        self.llm = Llama(
            model_path=model_path,
            n_ctx=ctx_size,
            n_gpu_layers=gpu_layers,
            n_threads=threads if threads > 0 else None,
            use_mmap=True,
            use_mlock=False,
            verbose=False,
        )

    @staticmethod
    def _build_prompt(text: str) -> List[Dict[str, str]]:
        # 使用通用 Chat 格式，强约束输出为 JSON 数组，不要解释。
        system = (
            "あなたは日本語の形態素解析と語義付与に長けた日本語言語学の専門家です。"
            "以下の単一発話を、語単位に分割し、各語について厳密な JSON だけを出力してください。"
            "各要素は {\"surface\", \"lemma\", \"pos\", \"reading_kana\", \"gloss_zh\"} を含めます。"
            "制約: 説明・前後文・注釈を一切書かない。JSON 配列のみを返す。"
        )
        user = (
            "発話:\n" + text.strip() + "\n\n"
            "出力仕様(例):\n"
            "[\n"
            "  {\"surface\":\"食べて\",\"lemma\":\"食べる\",\"pos\":\"動詞-連用形\",\"reading_kana\":\"たべて\",\"gloss_zh\":\"吃（连用形）\"},\n"
            "  {\"surface\":\"しまう\",\"lemma\":\"しまう\",\"pos\":\"補助動詞-終止\",\"reading_kana\":\"しまう\",\"gloss_zh\":\"完了/遗憾语气\"}\n"
            "]\n"
            "注意: 動詞の活用は一語にまとめ、必要に応じ pos に活用情報を記す。固有名詞は結合したまま出す。"
        )
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    @staticmethod
    def _extract_json(s: str) -> Any:
        # 提取第一个 JSON 数组
        m = re.search(r"(\[.*\])", s, flags=re.S)
        if not m:
            raise ValueError("未找到 JSON 数组。原始输出:\n" + s)
        block = m.group(1).strip()
        # 清理尾随逗号等常见错误
        block = re.sub(r",\s*\]$", "]", block)
        data = json.loads(block)
        if not isinstance(data, list):
            raise ValueError("解析结果非数组。")
        return data

    def segment_once(self, text: str, max_tokens: int = 1536, temperature: float = 0.2) -> List[Dict[str, Any]]:
        messages = self._build_prompt(text)
        try:
            resp = self.llm.create_chat_completion(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=0.95,
                repeat_penalty=1.1,
            )
            content = resp["choices"][0]["message"]["content"]
        except Exception:
            # 某些非 chat 模型仅支持 completion 接口
            prompt = (messages[0]["content"] + "\n\n" + messages[1]["content"]) + "\n出力:"
            resp = self.llm.create_completion(
                prompt=prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=0.95,
                repeat_penalty=1.1,
                stop=["\n\n"],
            )
            content = resp["choices"][0]["text"]
        data = self._extract_json(content)
        # 规范化字段
        norm = []
        for t in data:
            if not isinstance(t, dict):
                continue
            norm.append({
                "surface": str(t.get("surface", "")),
                "lemma": str(t.get("lemma", "")),
                "pos": str(t.get("pos", "")),
                "reading_kana": str(t.get("reading_kana", "")),
                "gloss_zh": str(t.get("gloss_zh", "")),
            })
        return norm


def parse_srt(path: str) -> List[str]:
    # 简单 SRT 解析：仅返回台词文本行（合并同一块中的多行）
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        raw = f.read()
    blocks = re.split(r"\n\s*\n", raw.strip())
    lines = []
    for b in blocks:
        # 去掉编号与时间轴行
        b = re.sub(r"^\s*\d+\s*\n", "", b)
        b = re.sub(r"^\s*\d{2}:\d{2}:\d{2},\d{3}\s*-->.*\n", "", b, flags=re.M)
        text = " ".join([x.strip() for x in b.splitlines() if x.strip()])
        if text:
            lines.append(text)
    return lines


def main():
    ap = argparse.ArgumentParser(description="本地 LLM 日语分词+词义+发音 标注（纯离线，llama-cpp-python）")
    ap.add_argument("--model", required=True, help="GGUF 模型路径（例如: elyza-llama3-jp-8b.Q4_K_M.gguf）")
    ap.add_argument("--input", required=True, help="输入文件（.srt 或 .txt，每行一句）")
    ap.add_argument("--output", required=True, help="输出 JSONL 文件（每行对应一条发话的数组结果）")
    ap.add_argument("--ctx", type=int, default=4096)
    ap.add_argument("--gpu_layers", type=int, default=35)
    ap.add_argument("--threads", type=int, default=0)
    args = ap.parse_args()

    seg = LLMJapaneseSegmenter(args.model, ctx_size=args.ctx, gpu_layers=args.gpu_layers, threads=args.threads)

    if args.input.lower().endswith(".srt"):
        utterances = parse_srt(args.input)
    else:
        with open(args.input, "r", encoding="utf-8", errors="ignore") as f:
            utterances = [ln.strip() for ln in f if ln.strip()]

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as out:
        for i, utt in enumerate(utterances, 1):
            try:
                tokens = seg.segment_once(utt)
            except Exception as e:
                tokens = [{"error": str(e), "raw": utt}]
            out.write(json.dumps({"index": i, "text": utt, "tokens": tokens}, ensure_ascii=False) + "\n")

    print(f"完成：{len(utterances)} 条发话已写入 {args.output}")


if __name__ == "__main__":
    main()
#!/usr/bin/env node
/**
 * 使用LLM进行日语分词、翻译、分级、归纳的SRT处理脚本
 * 替代kuromoji.js和外部API依赖
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SRTProcessorLLM {
    constructor() {
        // 硅基流动的几个模型不要钱
        this.apiKey = process.env.SILICONFLOW_API_KEY || process.env.SILICONFLOW_TOKEN || '';
        this.model = process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B';
        this.llmUrl = 'https://api.siliconflow.cn/v1/chat/completions';
        this.vocabulary = {};
        this.jlptOrder = {
            '': 0,
            'N5': 1,
            'N4': 2,
            'N3': 3,
            'N2': 4,
            'N1': 5,
            'N0': 6
        };
        
        // 专有词列表
        this.priorityWords = [
            '春日影', 'MyGO', 'バンドリ', 'CRYCHIC',
        ];
    }
    
    parseSRT(srtContent) {
        console.log('\n=== 开始解析SRT文件 ===');
        
        const entries = [];
        const blocks = srtContent.trim().split(/\n\s*\n/);
        
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length >= 4) {
                // 提取时间范围
                const timeLine = lines[1];
                const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
                
                if (timeMatch) {
                    const [, startTime, endTime] = timeMatch;
                    const timeRange = `${startTime} --> ${endTime}`;
                    
                    // 按 srt 固定格式提取
                    const japanese = (lines[3] || '').trim();
                    const chinese = (lines[2] || '').trim();
                    
                    if (japanese) {
                        entries.push({
                            japanese,
                            chinese,
                            time_range: timeRange
                        });
                    }
                }
            }
        }
        
        console.log(`解析完成，共 ${entries.length} 个条目`);
        return entries;
    }
    
    async callLLM(prompt, maxRetries = 2) {
        if (!this.apiKey) {
            console.log('❌ 未检测到 API 密钥。请设置环境变量 SILICONFLOW_API_KEY。');
            return null;
        }
        console.log(`🔄 开始调用LLM API (模型: ${this.model})`);
        const agent = new https.Agent({ keepAlive: true });
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const payload = {
                    model: this.model,
                    messages: [
                        { role: 'system', content: '你是一个喜欢看番的老二次元，同时你是一名专业的日语分词与词汇分析助手。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1,
                    top_p: 0.9,
                    max_tokens: 600,
                    stream: false
                };
                
                console.log(`    📡 发送API请求 (尝试 ${attempt + 1}/${maxRetries})...`);
                const response = await fetch(this.llmUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(30000),
                    agent
                });
                
                console.log(`    📥 收到响应: ${response.status} ${response.statusText}`);
                if (response.ok) {
                    const result = await response.json();
                    const content = result?.choices?.[0]?.message?.content?.trim() || '';
                    console.log(`    ✅ API调用成功，响应长度: ${content.length}`);
                    return content;
                } else {
                    let text = '';
                    try { text = await response.text(); } catch {}
                    console.log(`    ❌ API请求失败: ${response.status} ${response.statusText}`);
                    console.log(`    错误详情: ${text?.slice(0, 200)}`);
                }
                
            } catch (error) {
                console.log(`    ❌ LLM调用失败 (尝试 ${attempt + 1}/${maxRetries}): ${error.message}`);
                if (attempt < maxRetries - 1) {
                    const delay = 2000 * (attempt + 1); // 线性退避：2s, 4s, 6s
                    console.log(`    ⏳ 等待 ${delay/1000}s 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        console.log(`    💥 所有重试失败，返回null`);
        return null;
    }
    
    async tokenizeAndAnalyzeText(text) {
        console.log('\n--- 开始LLM分词分析 ---');
        console.log(`原始文本: ${text}`);
        
        // 清理文本
        const cleanText = text.replace(/[「」『』（）()《》<>【】？！。、，]/g, '').trim();
        console.log(`清理后文本: ${cleanText}`);
        
        if (!cleanText) {
            return [];
        }
        
        // 构建LLM提示词
        const prompt = `请对以下日语文本进行详细的词汇分析。

文本：${cleanText}

请按照以下JSON格式输出每个有意义的词汇（跳过助词、助动词、标点符号等功能词）：

\`\`\`json
[
  {
    "word": "词汇原形（动词要转换成う型）",
    "meaning": "中文含义",
    "furigana": "假名读音",
    "romaji": "罗马音",
    "level": "JLPT等级(N1-N5，实在匹配不到结果的情况下进行逐字拆分推测，最后实在不知道难度的话再设为N0)",
    "pos": "词性"
  }
]
\`\`\`

注意事项：
0. 输出格式必须严格遵照给出的JSON格式；
1. 只输出有意义的实词（名词、动词、形容词、副词等）；
2. 跳过助词（は、が、を、に等）、助动词（だ、です、ます等）；
3. 对于专有名词（如人名、地名、品牌名等），level设为"N0"；
4. 对于英语单词，level留空；
5. 合并动词变位形式到原形（比如 終わらせて　-> 終わる）；
6. 优先识别这些专有词：${this.priorityWords.join(', ')}；
7. 只输出JSON数组，不要其他解释文字；
8. 如果遇到含义不明确或无法分辨的词汇/专有名词，请优先从日本动画作品领域进行匹配（如角色名、乐队/团体名、歌曲名、舞台名等），并采用业界常用中文译名；
9. 句子有一定可能性存在拼写错误等，必要时可以进行忽略或者修正；
`;
        
        const response = await this.callLLM(prompt);
        
        if (!response) {
            console.log('LLM分析失败');
            return [];
        }
        
        try {
            // 提取JSON部分
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
            let jsonStr;
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            } else {
                // 如果没有代码块，尝试直接解析
                jsonStr = response;
            }
            
            // 解析JSON
            const tokens = JSON.parse(jsonStr);
            
            if (Array.isArray(tokens)) {
                console.log(`LLM分词结果: ${tokens.map(token => token.word || '').join(', ')}`);
                return tokens;
            } else {
                console.log('    LLM返回格式错误：不是数组');
                return [];
            }
            
        } catch (error) {
            console.log(`JSON解析失败: ${error.message}`);
            console.log(`原始响应: ${response.substring(0, 200)}...`);
            return [];
        }
    }
    
    async buildVocabularyIndex(entries) {
        console.log('\n=== 开始构建词汇索引 (三线程并行) ===');
        console.log(`条目数量: ${entries.length}`);
        
        const vocabulary = {};
        const concurrency = 3; // 三线程并行
        
        // 将条目分成多个批次
        const chunks = [];
        const chunkSize = Math.ceil(entries.length / concurrency);
        for (let i = 0; i < entries.length; i += chunkSize) {
            chunks.push(entries.slice(i, i + chunkSize));
        }
        
        console.log(`分为 ${chunks.length} 个批次并行处理`);
        
        // 并行处理每个批次
        const processChunk = async (chunk, chunkIndex) => {
            const chunkVocab = {};
            
            for (let i = 0; i < chunk.length; i++) {
                const entry = chunk[i];
                const globalIndex = chunkIndex * chunkSize + i + 1;
                console.log(`\n[线程${chunkIndex + 1}] 处理第 ${globalIndex}/${entries.length} 个条目:`);
                console.log(`[线程${chunkIndex + 1}] 日文: ${entry.japanese}`);
                
                // 使用LLM进行分词和分析
                const tokens = await this.tokenizeAndAnalyzeText(entry.japanese);
                
                for (const tokenInfo of tokens) {
                    const word = tokenInfo.word;
                    if (!word) continue;
                    
                    if (!chunkVocab[word]) {
                        chunkVocab[word] = {
                            word: word,
                            count: 0,
                            sentences: [],
                            meaning: tokenInfo.meaning || '',
                            furigana: tokenInfo.furigana || '',
                            romaji: tokenInfo.romaji || '',
                            level: tokenInfo.level || ''
                        };
                        console.log(`[线程${chunkIndex + 1}] 新词汇: ${word} -> ${tokenInfo.level || ''} (${tokenInfo.meaning || ''})`);
                    } else {
                        // 更新词汇信息（如果当前信息更完整）
                        if (!chunkVocab[word].meaning && tokenInfo.meaning) {
                            chunkVocab[word].meaning = tokenInfo.meaning;
                        }
                        if (!chunkVocab[word].furigana && tokenInfo.furigana) {
                            chunkVocab[word].furigana = tokenInfo.furigana;
                        }
                        if (!chunkVocab[word].romaji && tokenInfo.romaji) {
                            chunkVocab[word].romaji = tokenInfo.romaji;
                        }
                        if (!chunkVocab[word].level && tokenInfo.level) {
                            chunkVocab[word].level = tokenInfo.level;
                        }
                    }
                    
                    chunkVocab[word].count++;
                    chunkVocab[word].sentences.push({
                        japanese: entry.japanese,
                        chinese: entry.chinese,
                        time_range: entry.time_range
                    });
                }
            }
            
            return chunkVocab;
        };
        
        // 并行执行所有批次
        const chunkPromises = chunks.map((chunk, index) => processChunk(chunk, index));
        const chunkResults = await Promise.all(chunkPromises);
        
        // 合并所有批次的结果
        console.log('\n=== 合并并行处理结果 ===');
        for (const chunkVocab of chunkResults) {
            for (const [word, wordInfo] of Object.entries(chunkVocab)) {
                if (!vocabulary[word]) {
                    vocabulary[word] = { ...wordInfo };
                } else {
                    // 合并词汇信息
                    vocabulary[word].count += wordInfo.count;
                    vocabulary[word].sentences.push(...wordInfo.sentences);
                    
                    // 更新词汇信息（如果当前信息更完整）
                    if (!vocabulary[word].meaning && wordInfo.meaning) {
                        vocabulary[word].meaning = wordInfo.meaning;
                    }
                    if (!vocabulary[word].furigana && wordInfo.furigana) {
                        vocabulary[word].furigana = wordInfo.furigana;
                    }
                    if (!vocabulary[word].romaji && wordInfo.romaji) {
                        vocabulary[word].romaji = wordInfo.romaji;
                    }
                    if (!vocabulary[word].level && wordInfo.level) {
                        vocabulary[word].level = wordInfo.level;
                    }
                }
            }
        }
        
        console.log(`词汇总数: ${Object.keys(vocabulary).length}`);
        return vocabulary;
    }
    
    sortVocabularyByJLPT(vocabulary) {
        console.log('\n=== 按JLPT等级排序 ===');
        
        const vocabItems = Object.entries(vocabulary);
        vocabItems.sort((a, b) => {
            const levelA = this.jlptOrder[a[1].level] || 0;
            const levelB = this.jlptOrder[b[1].level] || 0;
            return levelB - levelA; // 降序排列
        });
        
        const sortedVocab = {};
        for (const [word, data] of vocabItems) {
            sortedVocab[word] = data;
        }
        
        // 统计各等级数量
        const levelCounts = {};
        for (const [word, data] of vocabItems) {
            const level = data.level || '未匹配';
            levelCounts[level] = (levelCounts[level] || 0) + 1;
        }
        
        console.log('各等级词汇数量:');
        for (const level of ['N0', 'N1', 'N2', 'N3', 'N4', 'N5', '未匹配']) {
            const count = levelCounts[level] || 0;
            if (count > 0) {
                console.log(`  ${level}: ${count} 个`);
            }
        }
        
        return sortedVocab;
    }
    
    async processSRTFile(srtFilePath, outputPath) {
        try {
            console.log('🚀 开始处理SRT文件（LLM分词）');
            console.log(`输入文件: ${srtFilePath}`);
            console.log(`输出文件: ${outputPath}`);
            console.log(`LLM服务: SiliconFlow Chat Completions (${this.model})`);
            
            // 检查文件是否存在
            if (!await fs.pathExists(srtFilePath)) {
                throw new Error(`SRT文件不存在: ${srtFilePath}`);
            }
            
            // 读取SRT文件
            const srtContent = await fs.readFile(srtFilePath, 'utf-8');
            
            // 解析SRT内容
            const entries = this.parseSRT(srtContent);
            if (entries.length === 0) {
                console.log('❌ 没有解析出任何条目！');
                return null;
            }
            
            // 构建词汇索引
            const startTime = Date.now();
            const vocabulary = await this.buildVocabularyIndex(entries);
            const endTime = Date.now();
            
            if (Object.keys(vocabulary).length === 0) {
                console.log('❌ 没有提取出任何词汇！');
                return null;
            }
            
            console.log(`\n⏱️  LLM处理耗时: ${((endTime - startTime) / 1000).toFixed(2)} 秒`);
            
            // 按JLPT等级排序
            const sortedVocabulary = this.sortVocabularyByJLPT(vocabulary);
            
            // 确保输出目录存在
            await fs.ensureDir(path.dirname(outputPath));
            
            // 保存到文件
            await fs.writeFile(outputPath, JSON.stringify(sortedVocabulary, null, 2), 'utf-8');
            
            console.log('\n✅ 处理完成！');
            console.log(`词汇数量: ${Object.keys(sortedVocabulary).length}`);
            console.log(`输出文件: ${outputPath}`);
            
            return sortedVocabulary;
            
        } catch (error) {
            console.log(`\n❌ 处理失败: ${error.message}`);
            throw error;
        }
    }
}

// 主函数
async function main() {
    if (process.argv.length < 3) {
        console.log('使用方法: node serifu-llm.js <输入SRT文件>');
        console.log('示例: $env:SILICONFLOW_API_KEY = "sk-nmsl"; node serifu-llm.js D:\Project\Obilivionis\serifu\BanG-Dream\MyGO\S1\ep8.srt');
        console.log('输出文件将自动生成到 ../obilivionis-site/public/data/ 目录');
        process.exit(1);
    }
    
    const srtFile = process.argv[2];
    
    // 自动生成输出路径
    const baseName = path.basename(srtFile, path.extname(srtFile));
    const outputDir = './output';
    const outputFile = path.join(outputDir, `${baseName}.json`);
    
    // 检查API Key 与连接
    const processor = new SRTProcessorLLM();
    if (!processor.apiKey) {
        console.log('❌ 未检测到 API 密钥。请在运行前设置环境变量：');
        console.log('   PowerShell:  $env:SILICONFLOW_API_KEY = "<你的密钥>"');
        console.log('   或在 .env / 系统环境变量中设置 SILICONFLOW_API_KEY');
        process.exit(1);
    }
    try {
        const testResponse = await processor.callLLM('一生 バンドしてくれる');
        if (testResponse) {
            console.log('✅ 硅基流动 API 连接正常');
        } else {
            console.log('❌ API 调用失败，请检查网络与密钥权限');
            process.exit(1);
        }
    } catch (error) {
        console.log(`❌ API 调用异常: ${error.message}`);
        process.exit(1);
    }
    
    try {
        const result = await processor.processSRTFile(srtFile, outputFile);
        if (result) {
            console.log(`\n🎉 成功处理！生成了 ${Object.keys(result).length} 个词汇条目`);
        } else {
            console.log('\n😞 处理失败，请检查输入文件');
        }
    } catch (error) {
        console.log(`\n💥 程序异常: ${error.message}`);
        process.exit(1);
    }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('serifu-llm.js')) {
    main();
}

export default SRTProcessorLLM;
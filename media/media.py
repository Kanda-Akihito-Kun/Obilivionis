import os
import json
import subprocess
import re
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

def parse_srt_time(time_str):
    """将SRT时间格式转换为秒数"""
    # 格式: 00:00:02,753
    time_parts = time_str.replace(',', '.').split(':')
    hours = int(time_parts[0])
    minutes = int(time_parts[1])
    seconds = float(time_parts[2])
    return hours * 3600 + minutes * 60 + seconds

def format_timestamp_for_filename(time_str):
    """将时间戳格式化为文件名安全的格式"""
    # 00:00:02,753 -> 00-00-02-753
    return time_str.replace(':', '-').replace(',', '-')

def extract_frame_and_audio(video_path, start_time, end_time, output_dir, timestamp):
    """截取视频帧和音频片段"""
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 计算持续时间
    start_seconds = parse_srt_time(start_time)
    end_seconds = parse_srt_time(end_time)
    duration = end_seconds - start_seconds
    
    # 生成文件名
    timestamp_safe = format_timestamp_for_filename(start_time)
    
    # 截取视频帧（取中间时刻的帧）
    frame_time = start_seconds + duration / 2
    frame_output = os.path.join(output_dir, f"{timestamp_safe}.jpg")
    
    frame_cmd = [
        'ffmpeg',
        '-i', video_path,
        '-ss', str(frame_time),
        '-vframes', '1',
        '-q:v', '3',  # 稍微降低质量以提高速度
        '-preset', 'ultrafast',  # 最快预设
        '-y',  # 覆盖已存在的文件
        frame_output
    ]
    
    # 修改后的音频截取命令
    audio_output = os.path.join(output_dir, f"{timestamp_safe}.mp3")
    
    audio_cmd = [
        'ffmpeg',
        '-i', video_path,
        '-ss', str(start_seconds),
        '-t', str(duration),
        '-vn',  # 禁用视频
        '-acodec', 'libmp3lame',  # 使用正确的mp3编码器
        '-b:a', '96k',  # 降低音频比特率以提高速度
        '-ar', '22050',  # 降低采样率
        '-ac', '1',  # 单声道
        '-avoid_negative_ts', 'make_zero',  # 避免负时间戳
        '-y',  # 覆盖已存在的文件
        audio_output
    ]
    
    try:
        # 执行截取帧命令
        result = subprocess.run(frame_cmd, check=True, capture_output=True, text=True, encoding='utf-8', errors='ignore')
        print(f"✓ 截取帧: {frame_output}")
        
        # 执行截取音频命令
        result = subprocess.run(audio_cmd, check=True, capture_output=True, text=True, encoding='utf-8', errors='ignore')
        print(f"✓ 截取音频: {audio_output}")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"✗ 处理失败 {timestamp}:")
        print(f"  命令: {' '.join(e.cmd)}")
        print(f"  错误输出: {e.stderr}")
        return False

def process_single_timestamp(args):
    """处理单个时间戳的媒体提取"""
    video_path, start_time, end_time, media_output_dir = args
    return extract_frame_and_audio(video_path, start_time, end_time, media_output_dir, start_time)

def process_episode(video_path, json_path, output_base_dir, max_workers=2):
    """处理整集的台词截取（并发版本）"""
    
    # 读取词汇JSON文件
    with open(json_path, 'r', encoding='utf-8') as f:
        vocab_data = json.load(f)
    
    # 创建输出目录（基于JSON文件路径）
    json_relative_path = os.path.relpath(json_path, output_base_dir)
    episode_dir = os.path.dirname(json_relative_path)
    media_output_dir = os.path.join(output_base_dir, episode_dir, 'media')
    
    print(f"开始处理: {json_path}")
    print(f"输出目录: {media_output_dir}")
    print(f"使用 {max_workers} 个并发线程")
    
    # 收集所有时间戳
    timestamps = set()
    for word_data in vocab_data.values():
        for sentence in word_data.get('sentences', []):
            time_range = sentence.get('time_range', '')
            if ' --> ' in time_range:
                start_time, end_time = time_range.split(' --> ')
                timestamps.add((start_time.strip(), end_time.strip()))
    
    print(f"找到 {len(timestamps)} 个唯一时间戳")
    
    # 准备并发任务参数
    tasks = [(video_path, start_time, end_time, media_output_dir) 
             for start_time, end_time in timestamps]
    
    # 并发处理
    success_count = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_task = {executor.submit(process_single_timestamp, task): task for task in tasks}
        
        for future in as_completed(future_to_task):
            task = future_to_task[future]
            try:
                if future.result():
                    success_count += 1
                    print(f"✓ 完成: {task[1]} ({success_count}/{len(timestamps)})")
                else:
                    print(f"✗ 失败: {task[1]}")
            except Exception as e:
                print(f"✗ 异常: {task[1]} - {e}")
    
    print(f"完成! 成功处理 {success_count}/{len(timestamps)} 个片段")

if __name__ == "__main__":
    # 检查命令行参数
    if len(sys.argv) < 3:
        print("使用方法: python media.py <视频文件路径> <JSON文件路径> [线程数]")
        print("示例: python media.py ../video/p8.mp4 ../obilivionis-site/data/BanG-Dream/MyGO/S1/Ep8/ep8.json 2")
        exit(1)
    
    # 从命令行参数获取路径
    video_path = sys.argv[1]
    json_path = sys.argv[2]
    max_workers = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    output_base_dir = "../obilivionis-site/data"
    
    # 检查文件是否存在
    if not os.path.exists(video_path):
        print(f"错误: 视频文件不存在: {video_path}")
        exit(1)
    
    if not os.path.exists(json_path):
        print(f"错误: JSON文件不存在: {json_path}")
        exit(1)
    
    print(f"视频文件: {video_path}")
    print(f"JSON文件: {json_path}")
    print(f"线程数: {max_workers}")
    
    # 开始处理
    process_episode(video_path, json_path, output_base_dir, max_workers)
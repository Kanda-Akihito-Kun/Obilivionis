import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

// 支持的媒体文件类型
const MEDIA_TYPES: { [key: string]: string } = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4'
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 等待params解析
    const resolvedParams = await params;
    // 构建文件路径
    const filePath = path.join(process.cwd(), 'data', ...resolvedParams.path);
    
    console.log('Requested path:', resolvedParams.path);
    console.log('Full file path:', filePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return new NextResponse('File not found', { status: 404 });
    }
    
    // 检查是否为文件（不是目录）
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return new NextResponse('Not a file', { status: 400 });
    }
    
    // 获取文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MEDIA_TYPES[ext];
    
    if (!contentType) {
      return new NextResponse('Unsupported file type', { status: 415 });
    }
    
    // 读取文件
    const fileBuffer = fs.readFileSync(filePath);
    
    // 设置响应头
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable', // 缓存一年
      'Accept-Ranges': 'bytes'
    });
    
    // 处理Range请求（用于音频/视频流）
    const range = request.headers.get('range');
    if (range && (contentType.startsWith('audio/') || contentType.startsWith('video/'))) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      
      const fileStream = fs.createReadStream(filePath, { start, end });
      
      headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`);
      headers.set('Content-Length', chunksize.toString());
      
      return new NextResponse(fileStream as any, {
        status: 206,
        headers
      });
    }
    
    // 返回完整文件
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Error serving media file:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

// 支持HEAD请求（用于检查文件是否存在）
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 等待params解析
    const resolvedParams = await params;
    const filePath = path.join(process.cwd(), 'data', ...resolvedParams.path);
    
    if (!fs.existsSync(filePath)) {
      return new NextResponse(null, { status: 404 });
    }
    
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return new NextResponse(null, { status: 400 });
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MEDIA_TYPES[ext];
    
    if (!contentType) {
      return new NextResponse(null, { status: 415 });
    }
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString()
      }
    });
    
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}
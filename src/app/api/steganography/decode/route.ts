import { NextRequest, NextResponse } from 'next/server';
import { PNG } from 'pngjs';
import Steganography from '@/lib/steganography';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const mode = formData.get('mode') as string || 'text';
    const password = formData.get('password') as string;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // Parse PNG
    const png = PNG.sync.read(imageBuffer);
    const steganography = new Steganography(png);

    // Decode data
    let decodedData: string | Buffer;
    try {
      if (mode === 'text') {
        // For text mode, decode as string
        if (password) {
          decodedData = steganography.decodeWithEncryption(password, false) as string;
        } else {
          decodedData = steganography.decodeImage(false) as string;
        }
        return NextResponse.json({
          message: decodedData,
          success: true
        });
      } else {
        // For file mode, decode as binary
        if (password) {
          decodedData = steganography.decodeWithEncryption(password, true) as Buffer;
        } else {
          decodedData = steganography.decodeImage(true) as Buffer;
        }
      }
    } catch (decodeError) {
      return NextResponse.json(
        { error: 'Failed to decode data. The image may not contain hidden data or the password is incorrect.' },
        { status: 400 }
      );
    }

    // File mode handling
    if (mode === 'file') {
      try {
        const dataBuffer = decodedData as Buffer;
        
        const filenameLength = dataBuffer.readUInt32BE(0);
        const filename = dataBuffer.slice(4, 4 + filenameLength).toString('utf-8');
        const fileData = dataBuffer.slice(4 + filenameLength);

        // Return the file as a blob
        return new NextResponse(new Uint8Array(fileData), {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Original-Filename': filename,
          },
        });
      } catch (fileError) {
        return NextResponse.json(
          { error: 'Failed to extract file. The data may be corrupted or not a file.' },
          { status: 400 }
        );
      }
    }

  } catch (error) {
    console.error('Decoding error:', error);
    return NextResponse.json(
      { error: 'Failed to decode data from image' },
      { status: 500 }
    );
  }
}
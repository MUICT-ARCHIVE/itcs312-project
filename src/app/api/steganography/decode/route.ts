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
      if (password) {
        decodedData = steganography.decodeWithEncryption(password, true) as Buffer;
      } else {
        decodedData = steganography.decodeImage(true) as Buffer;
      }
    } catch (decodeError) {
      return NextResponse.json(
        { error: 'Failed to decode data. The image may not contain hidden data or the password is incorrect.' },
        { status: 400 }
      );
    }

    if (mode === 'text') {
      // Text mode - convert buffer to string
      const message = new TextDecoder().decode(decodedData);
      return NextResponse.json({
        message: message,
        success: true
      });
    } else {
      // File mode - extract filename and file data
      try {
        const dataBuffer = decodedData as Buffer;
        
        // Read filename length (first 4 bytes)
        const filenameLength = dataBuffer.readUInt32BE(0);
        
        // Extract filename
        const filename = dataBuffer.slice(4, 4 + filenameLength).toString('utf-8');
        
        // Extract file data
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
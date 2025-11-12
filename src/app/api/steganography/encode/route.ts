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

    let dataToEncode: string | Buffer;
    let dataSize: number;

    if (mode === 'text') {
      const message = formData.get('message') as string;
      if (!message) {
        return NextResponse.json(
          { error: 'Message is required for text mode' },
          { status: 400 }
        );
      }
      dataToEncode = message;
      dataSize = Buffer.from(message, 'utf-8').length;
    } else {
      // File mode
      const file = formData.get('file') as File;
      const filename = formData.get('filename') as string;
      
      if (!file) {
        return NextResponse.json(
          { error: 'File is required for file mode' },
          { status: 400 }
        );
      }

      // Encode filename and file data together
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const filenameBuffer = Buffer.from(filename, 'utf-8');
      const filenameLengthBuffer = Buffer.alloc(4);
      filenameLengthBuffer.writeUInt32BE(filenameBuffer.length, 0);
      
      dataToEncode = Buffer.concat([filenameLengthBuffer, filenameBuffer, fileBuffer]);
      dataSize = dataToEncode.length;
    }

    // Convert image file to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // Parse PNG
    const png = PNG.sync.read(imageBuffer);
    const steganography = new Steganography(png);

    // Check if data fits
    const availableSpace = steganography.getAvailableSpace();
    
    if (dataSize > availableSpace) {
      return NextResponse.json(
        { 
          error: `Data too large. Maximum size: ${availableSpace} bytes (${(availableSpace / 1024).toFixed(2)} KB), provided: ${dataSize} bytes (${(dataSize / 1024).toFixed(2)} KB)` 
        },
        { status: 400 }
      );
    }

    // Encode data
    let encodedSteganography;
    if (password) {
      encodedSteganography = steganography.encodeWithEncryption(password, dataToEncode);
    } else {
      encodedSteganography = steganography.encodeImage(dataToEncode);
    }

    // Convert back to buffer
    const outputBuffer = PNG.sync.write(encodedSteganography.png);

    // Return the encoded image
    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="encoded-image.png"',
      },
    });

  } catch (error) {
    console.error('Encoding error:', error);
    return NextResponse.json(
      { error: 'Failed to encode data into image' },
      { status: 500 }
    );
  }
}
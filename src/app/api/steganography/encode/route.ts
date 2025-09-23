import { NextRequest, NextResponse } from 'next/server';
import { PNG } from 'pngjs';
import Steganography from '@/lib/steganography';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const message = formData.get('message') as string;
    const password = formData.get('password') as string;

    if (!imageFile || !message) {
      return NextResponse.json(
        { error: 'Image file and message are required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // Parse PNG
    const png = PNG.sync.read(imageBuffer);
    const steganography = new Steganography(png);

    // Check if message fits
    const availableSpace = steganography.getAvailableSpace();
    const messageSize = Buffer.from(message, 'utf-8').length;
    
    if (messageSize > availableSpace) {
      return NextResponse.json(
        { 
          error: `Message too large. Maximum size: ${availableSpace} bytes, provided: ${messageSize} bytes` 
        },
        { status: 400 }
      );
    }

    // Encode message
    let encodedSteganography;
    if (password) {
      encodedSteganography = steganography.encodeWithEncryption(password, message);
    } else {
      encodedSteganography = steganography.encodeImage(message);
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
      { error: 'Failed to encode message into image' },
      { status: 500 }
    );
  }
}
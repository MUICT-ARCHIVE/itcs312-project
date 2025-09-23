import { NextRequest, NextResponse } from 'next/server';
import { PNG } from 'pngjs';
import Steganography from '@/lib/steganography';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
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

    // Decode message
    let decodedMessage: string;
    try {
      if (password) {
        decodedMessage = steganography.decodeWithEncryption(password) as string;
      } else {
        decodedMessage = steganography.decodeImage() as string;
      }
    } catch (decodeError) {
      return NextResponse.json(
        { error: 'Failed to decode message. The image may not contain hidden data or the password is incorrect.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: decodedMessage,
      success: true
    });

  } catch (error) {
    console.error('Decoding error:', error);
    return NextResponse.json(
      { error: 'Failed to decode message from image' },
      { status: 500 }
    );
  }
}
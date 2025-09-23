import { NextRequest, NextResponse } from 'next/server';
import { PNG } from 'pngjs';
import Steganography from '@/lib/steganography';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

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

    // Get capacity information
    const availableSpace = steganography.getAvailableSpace();
    const totalCapacity = Math.floor((png.data.length / 4) * 3) / 8;

    return NextResponse.json({
      availableSpace,
      totalCapacity,
      width: png.width,
      height: png.height,
      totalPixels: png.width * png.height,
      success: true
    });

  } catch (error) {
    console.error('Capacity check error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image capacity' },
      { status: 500 }
    );
  }
}
import crypto from 'node:crypto';
import fs from 'node:fs';
import * as process from 'node:process';
import { gunzipSync, gzipSync } from 'zlib';
import { PNG } from 'pngjs';

export default class Steganography {
  public png: PNG;

  public constructor(png: PNG) {
    if (png.data.length < 4) {
      throw new Error('Cannot use this PNG file.');
    }

    this.png = png;
  }

  protected computeHash(data: Buffer): Buffer {
    return crypto.createHash('sha256').update(data).digest();
  }

  protected generateAESKey(key: string): Buffer {
    return crypto.createHash('sha256').update(key).digest();
  }

  protected extractHiddenData(pixels: Buffer): Buffer {
    let bytes: number[] = [];
    let bitIndex = 0;
    let currentByte = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let bit = pixels[i + j] & 1;
        currentByte = (currentByte << 1) | bit;
        bitIndex++;

        if (bitIndex % 8 === 0) {
          bytes.push(currentByte);
          currentByte = 0;
        }
      }
    }

    return Buffer.from(bytes);
  }

  protected embedData(pixels: Buffer, data: Buffer): Buffer {
    let outputBuffer = Buffer.from(pixels);
    let bitIndex = 0;

    for (let i = 0; i < outputBuffer.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let bit =
          bitIndex < data.length * 8
            ? (data[Math.floor(bitIndex / 8)] >> (7 - (bitIndex % 8))) & 1
            : crypto.randomInt(2);
        // LSB Mask: 0xfe = 11111110
        outputBuffer[i + j] = (outputBuffer[i + j] & 0xfe) | bit;
        bitIndex++;
      }
    }

    return outputBuffer;
  }

  protected createClone(buffer: Buffer | null = null): Steganography {
    let newImage = new PNG({
      width: this.png.width,
      height: this.png.height,
    });
    if (!buffer) {
      buffer = this.png.data;
    }
    buffer.copy(newImage.data);

    return new Steganography(newImage);
  }

  protected getMaximumCapacity(): number {
    return (Math.floor(this.png.data.length / 4) * 3) / 8;
  }

  public static async loadPNG(path: string): Promise<Steganography> {
    return new Promise(resolve => {
      fs.createReadStream(path)
        .pipe(new PNG())
        .on('parsed', function () {
          resolve(new Steganography(this));
        });
    });
  }

  public getAvailableSpace(): number {
    return this.getMaximumCapacity() - 4 - 32;
  }

  public decodeImage(binary: boolean = false): string | Buffer {
    if (this.png.data.length < 96 * 4) {
      throw new Error('Cannot decode this container.');
    }
    let metadata = this.extractHiddenData(this.png.data.slice(0, 96 * 4));
    let length = metadata.readUInt32BE();
    let hash = metadata.slice(4, 36);
    let data = this.extractHiddenData(this.png.data).slice(36, 36 + length);
    if (!this.computeHash(data).equals(hash)) {
      throw new Error('Cannot decode this container.');
    }
    let decompressedData = gunzipSync(data);

    return binary
      ? decompressedData
      : new TextDecoder().decode(decompressedData);
  }

  public encodeImage(data: string | Buffer): Steganography {
    let binaryData =
      typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
    let compressedData = gzipSync(binaryData);
    let length = Buffer.alloc(4);
    length.writeUInt32BE(compressedData.length, 0);
    let hash = this.computeHash(compressedData);
    let serializedData = Buffer.concat([length, hash, compressedData]);
    if (serializedData.length > this.getMaximumCapacity()) {
      throw new Error('Message is too large to encode.');
    }

    return this.createClone(this.embedData(this.png.data, serializedData));
  }

  public async saveImage(path: string): Promise<void> {
    let stream = fs.createWriteStream(path);
    this.png.pack().pipe(stream);

    return new Promise(resolve => {
      stream.on('finish', resolve);
    });
  }

  public encodeWithEncryption(
    key: string,
    data: string | Buffer
  ): Steganography {
    let aesKey = this.generateAESKey(key);
    let binaryData =
      typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encryptedData = Buffer.concat([
      cipher.update(binaryData),
      cipher.final(),
    ]);
    let finalData = Buffer.concat([iv, encryptedData]);

    return this.encodeImage(finalData);
  }

  public decodeWithEncryption(
    key: string,
    binary: boolean = false
  ): string | Buffer {
    let aesKey = this.generateAESKey(key);
    let encodedData = <Buffer>this.decodeImage(true);
    let iv = encodedData.slice(0, 16);
    let encryptedData = encodedData.slice(16);
    let decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    let decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return binary ? decryptedData : new TextDecoder().decode(decryptedData);
  }

  public encodeFile(path: string): Steganography {
    let dataBuffer = fs.readFileSync(path);
    return this.encodeImage(dataBuffer);
  }

  public decodeFile(path: string): void {
    let decodedData = this.decodeImage(true);
    fs.writeFileSync(path, decodedData);
  }

  public encodeFileWithEncryption(key: string, path: string): Steganography {
    let dataBuffer = fs.readFileSync(path);
    return this.encodeWithEncryption(key, dataBuffer);
  }

  public decodeFileWithEncryption(key: string, path: string): void {
    let decodedData = this.decodeWithEncryption(key, true);
    fs.writeFileSync(path, decodedData);
  }
}
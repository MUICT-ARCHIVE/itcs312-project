"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'encode' | 'decode'>('encode');
  const [encodeImage, setEncodeImage] = useState<File | null>(null);
  const [decodeImage, setDecodeImage] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [decodedMessage, setDecodedMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageCapacity, setImageCapacity] = useState<{
    availableSpace: number;
    totalCapacity: number;
    width: number;
    height: number;
  } | null>(null);

  const checkImageCapacity = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/steganography/capacity', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setImageCapacity(data);
      }
    } catch (err) {
      console.error('Failed to check image capacity:', err);
    }
  };

  const handleTabChange = (tab: 'encode' | 'decode') => {
    setActiveTab(tab);
    setError('');
    setDecodedMessage('');
    setImageCapacity(null);
  };

  const handleImageChange = (file: File | null, isEncode: boolean) => {
    if (isEncode) {
      setEncodeImage(file);
      if (file) {
        checkImageCapacity(file);
      } else {
        setImageCapacity(null);
      }
    } else {
      setDecodeImage(file);
    }
  };
  
  const handleEncode = async () => {
    if (!encodeImage || !message) {
      setError('Please select an image and enter a message');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', encodeImage);
      formData.append('message', message);
      if (password) {
        formData.append('password', password);
      }

      const response = await fetch('/api/steganography/encode', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'encoded-image.png';
        a.click();
        URL.revokeObjectURL(url);
        
        setMessage('');
        setPassword('');
        setEncodeImage(null);
        alert('Message encoded successfully! Download started.');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to encode message');
      }
    } catch (err) {
      setError('An error occurred while encoding');
    } finally {
      setLoading(false);
    }
  };

  const handleDecode = async () => {
    if (!decodeImage) {
      setError('Please select an image to decode');
      return;
    }

    setLoading(true);
    setError('');
    setDecodedMessage('');

    try {
      const formData = new FormData();
      formData.append('image', decodeImage);
      if (password) {
        formData.append('password', password);
      }

      const response = await fetch('/api/steganography/decode', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setDecodedMessage(data.message);
        setPassword('');
      } else {
        setError(data.error || 'Failed to decode message');
      }
    } catch (err) {
      setError('An error occurred while decoding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            Digital Steganography Tool
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Hide and reveal secret messages in PNG images
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
            <button
              onClick={() => handleTabChange('encode')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'encode'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Encode Message
            </button>
            <button
              onClick={() => handleTabChange('decode')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'decode'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Decode Message
            </button>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Encode Tab */}
          {activeTab === 'encode' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select PNG Image
                </label>
                <input
                  type="file"
                  accept=".png"
                  onChange={(e) => handleImageChange(e.target.files?.[0] || null, true)}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900 dark:file:text-blue-200
                    dark:hover:file:bg-blue-800"
                />
              </div>

              {imageCapacity && (
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Image Capacity Information
                  </h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <p>• Dimensions: {imageCapacity.width} × {imageCapacity.height} pixels</p>
                    <p>• Available space: {imageCapacity.availableSpace} bytes</p>
                    <p>• Current message: {message.length} bytes</p>
                    <p>• Space remaining: {Math.max(0, imageCapacity.availableSpace - message.length)} bytes</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message to Hide
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your secret message here..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password (Optional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for encryption"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                onClick={handleEncode}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {loading ? 'Encoding...' : 'Encode & Download'}
              </button>
            </div>
          )}

          {/* Decode Tab */}
          {activeTab === 'decode' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Encoded PNG Image
                </label>
                <input
                  type="file"
                  accept=".png"
                  onChange={(e) => handleImageChange(e.target.files?.[0] || null, false)}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-green-50 file:text-green-700
                    hover:file:bg-green-100
                    dark:file:bg-green-900 dark:file:text-green-200
                    dark:hover:file:bg-green-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password (If encrypted)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password if message was encrypted"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                onClick={handleDecode}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {loading ? 'Decoding...' : 'Decode Message'}
              </button>

              {decodedMessage && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Decoded Message
                  </label>
                  <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md p-4">
                    <p className="text-green-800 dark:text-green-200 whitespace-pre-wrap">
                      {decodedMessage}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            How to Use
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Encoding (Hide Message)
              </h3>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>1. Select a PNG image file</li>
                <li>2. Enter your secret message</li>
                <li>3. Optionally add a password for encryption</li>
                <li>4. Click "Encode & Download" to get the image with hidden message</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Decoding (Reveal Message)
              </h3>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>1. Select the encoded PNG image</li>
                <li>2. Enter the password if the message was encrypted</li>
                <li>3. Click "Decode Message" to reveal the hidden text</li>
                <li>4. The secret message will appear below</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

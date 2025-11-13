"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { Download, FileIcon, Image as ImageIcon, AlertCircle, CheckCircle2, Moon, Sun, X, Lock, Unlock, Upload } from "lucide-react";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'encode' | 'decode'>('encode');
  const [encodeImage, setEncodeImage] = useState<File | null>(null);
  const [encodeImagePreview, setEncodeImagePreview] = useState<string | null>(null);
  const [decodeImage, setDecodeImage] = useState<File | null>(null);
  const [decodeImagePreview, setDecodeImagePreview] = useState<string | null>(null);
  const [fileToHide, setFileToHide] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [decodedMessage, setDecodedMessage] = useState('');
  const [decodedFile, setDecodedFile] = useState<{blob: Blob, filename: string} | null>(null);
  const [decodedImageUrl, setDecodedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [encodedBlob, setEncodedBlob] = useState<Blob | null>(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState('encoded-image');
  const [imageCapacity, setImageCapacity] = useState<{
    availableSpace: number;
    totalCapacity: number;
    width: number;
    height: number;
  } | null>(null);

  // Cleanup decoded image URL when component unmounts or decodedFile changes
  useEffect(() => {
    if (decodedFile?.blob.type.startsWith('image/')) {
      const url = URL.createObjectURL(decodedFile.blob);
      console.log('Created blob URL for image:', url, 'MIME type:', decodedFile.blob.type);
      setDecodedImageUrl(url);
      
      return () => {
        console.log('Cleaning up blob URL:', url);
        URL.revokeObjectURL(url);
        setDecodedImageUrl(null);
      };
    } else {
      setDecodedImageUrl(null);
    }
  }, [decodedFile]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

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
    setDecodedFile(null);
    setImageCapacity(null);
  };

  const handleImageChange = (file: File | null, isEncode: boolean) => {
    if (isEncode) {
      setEncodeImage(file);
      if (file) {
        checkImageCapacity(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setEncodeImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImageCapacity(null);
        setEncodeImagePreview(null);
      }
    } else {
      setDecodeImage(file);
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setDecodeImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setDecodeImagePreview(null);
      }
    }
  };
  
  const handleEncode = async () => {
    if (!encodeImage) {
      setError('Please select a PNG carrier image');
      return;
    }

    if (!message && !fileToHide) {
      setError('Please enter a message or select a file to hide');
      return;
    }

    if (message && fileToHide) {
      setError('Please choose either a message OR a file, not both');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', encodeImage);
      
      if (fileToHide) {
        formData.append('mode', 'file');
        formData.append('file', fileToHide);
        formData.append('filename', fileToHide.name);
      } else {
        formData.append('mode', 'text');
        formData.append('message', message);
      }
      
      if (password) {
        formData.append('password', password);
      }

      const response = await fetch('/api/steganography/encode', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        setEncodedBlob(blob);
        setDownloadFilename('encoded-image');
        setDownloadDialogOpen(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to encode');
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
    setDecodedFile(null);

    try {
      // Try file mode first (since files are more common)
      const fileFormData = new FormData();
      fileFormData.append('image', decodeImage);
      fileFormData.append('mode', 'file');
      if (password) {
        fileFormData.append('password', password);
      }

      let response = await fetch('/api/steganography/decode', {
        method: 'POST',
        body: fileFormData,
      });

      if (response.ok) {
        const contentType = response.headers.get('Content-Type');
        
        // If it's a file download
        if (contentType?.includes('application/octet-stream')) {
          const responseBlob = await response.blob();
          const filename = response.headers.get('X-Original-Filename') || 'decoded-file';
          
          // Infer MIME type from filename extension
          let mimeType = responseBlob.type || contentType || 'application/octet-stream';
          const ext = filename.toLowerCase().split('.').pop();
          const mimeMap: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'json': 'application/json',
            'xml': 'application/xml',
          };
          if (ext && mimeMap[ext]) {
            mimeType = mimeMap[ext];
          }
          
          // Create a new blob with the correct MIME type
          const blob = new Blob([responseBlob], { type: mimeType });
          console.log('Decoded file:', { filename, mimeType, size: blob.size, isImage: mimeType.startsWith('image/') });
          setDecodedFile({ blob, filename });
          setPassword('');
          setLoading(false);
          return;
        }
      }

      // If file mode didn't work, try text mode
      const textFormData = new FormData();
      textFormData.append('image', decodeImage);
      textFormData.append('mode', 'text');
      if (password) {
        textFormData.append('password', password);
      }

      response = await fetch('/api/steganography/decode', {
        method: 'POST',
        body: textFormData,
      });

      if (response.ok) {
        const contentType = response.headers.get('Content-Type');
        
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          setDecodedMessage(data.message);
          setPassword('');
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to decode');
      }
    } catch (err) {
      console.error('Decode error:', err);
      setError('An error occurred while decoding');
    } finally {
      setLoading(false);
    }
  };

  const downloadDecodedFile = () => {
    if (!decodedFile) return;
    
    const url = URL.createObjectURL(decodedFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = decodedFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadEncoded = () => {
    if (!encodedBlob) return;
    
    const url = URL.createObjectURL(encodedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${downloadFilename}.png`;
    a.click();
    URL.revokeObjectURL(url);
    
    setDownloadDialogOpen(false);
    setEncodedBlob(null);
    setMessage('');
    setPassword('');
    setEncodeImage(null);
    setEncodeImagePreview(null);
    setFileToHide(null);
    setImageCapacity(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Dark Mode Toggle */}
        <motion.div 
          className="flex justify-end mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div 
            className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full border shadow-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sun className="h-4 w-4" />
            <Switch
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
            />
            <Moon className="h-4 w-4" />
          </motion.div>
        </motion.div>

        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            Digital Steganography Tool
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Hide and reveal secret messages in PNG images
          </p>
        </motion.div>

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
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="h-5 w-5" />
              {error}
            </motion.div>
          )}

          {/* Encode Tab */}
          {activeTab === 'encode' && (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <Label className="block text-sm font-medium mb-2">
                  Carrier PNG Image
                </Label>
                <Input
                  type="file"
                  accept=".png"
                  onChange={(e) => handleImageChange(e.target.files?.[0] || null, true)}
                />
              </div>

              {encodeImagePreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden"
                >
                  <img
                    src={encodeImagePreview}
                    alt="Carrier preview"
                    className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-900"
                  />
                </motion.div>
              )}

              {imageCapacity && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md p-4"
                >
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Image Capacity Information
                  </h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <p>• Dimensions: {imageCapacity.width} × {imageCapacity.height} pixels</p>
                    <p>• Available space: {imageCapacity.availableSpace.toLocaleString()} bytes</p>
                    <p>• Current content: {(message.length || (fileToHide ? fileToHide.size : 0)).toLocaleString()} bytes</p>
                    <p>• Space remaining: {Math.max(0, imageCapacity.availableSpace - (message.length || (fileToHide ? fileToHide.size : 0))).toLocaleString()} bytes</p>
                  </div>
                </motion.div>
              )}

              <div>
                <Label className="block text-sm font-medium mb-2">
                  Message to Hide
                </Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your secret message here..."
                  className="min-h-[100px]"
                  disabled={!!fileToHide}
                />
                {fileToHide && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Message input disabled when file is attached
                  </p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    OR
                  </span>
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">
                  File or Image to Hide
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFileToHide(file);
                          setMessage(''); // Clear message when file is selected
                        }
                      }}
                      className="flex-1"
                      disabled={!!message}
                    />
                    {fileToHide && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFileToHide(null);
                          const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {message && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      File input disabled when message is entered
                    </p>
                  )}
                  {fileToHide && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md"
                    >
                      <FileIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                          {fileToHide.name}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {(fileToHide.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">
                  Password (Optional)
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for encryption"
                />
              </div>

              <Button
                onClick={handleEncode}
                disabled={loading || (!message && !fileToHide)}
                className="w-full"
                size="lg"
              >
                <Lock className="mr-2 h-4 w-4" />
                {loading ? 'Encoding...' : 'Encode & Download'}
              </Button>
            </motion.div>
          )}

          {/* Decode Tab */}
          {activeTab === 'decode' && (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <Label className="block text-sm font-medium mb-2">
                  Select Encoded PNG Image
                </Label>
                <Input
                  type="file"
                  accept=".png"
                  onChange={(e) => handleImageChange(e.target.files?.[0] || null, false)}
                />
              </div>

              {decodeImagePreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden"
                >
                  <img
                    src={decodeImagePreview}
                    alt="Encoded image preview"
                    className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-900"
                  />
                </motion.div>
              )}

              <div>
                <Label className="block text-sm font-medium mb-2">
                  Password (If encrypted)
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password if message was encrypted"
                />
              </div>

              <Button
                onClick={handleDecode}
                disabled={loading || !decodeImage}
                className="w-full"
                size="lg"
              >
                <Unlock className="mr-2 h-4 w-4" />
                {loading ? 'Decoding...' : 'Decode Message'}
              </Button>

              {decodedMessage && (
                <motion.div 
                  className="mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Label className="block text-sm font-medium mb-2">
                    Decoded Message
                  </Label>
                  <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <p className="text-green-800 dark:text-green-200 whitespace-pre-wrap flex-1">
                          {decodedMessage}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {decodedFile && (
                <motion.div
                  className="mt-6 space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Label className="block text-sm font-medium mb-2">
                    Decoded File
                  </Label>
                  
                  {/* Show image preview if file is an image */}
                  {decodedFile.blob.type.startsWith('image/') && decodedImageUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border border-green-300 dark:border-green-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 p-4"
                    >
                      <img
                        src={decodedImageUrl}
                        alt={decodedFile.filename}
                        className="w-full max-h-96 object-contain mx-auto"
                      />
                    </motion.div>
                  )}
                  
                  <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {decodedFile.blob.type.startsWith('image/') ? (
                            <ImageIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                          ) : (
                            <FileIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                          )}
                          <div>
                            <p className="font-medium text-green-900 dark:text-green-100">
                              {decodedFile.filename}
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400">
                              {decodedFile.blob.type || 'Unknown type'} • {(decodedFile.blob.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button onClick={downloadDecodedFile} variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        {/* Download Dialog */}
        <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Encoded Image</DialogTitle>
              <DialogDescription>
                Enter a filename for your encoded image
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="filename" className="mb-2 block">
                Filename
              </Label>
              <div className="flex gap-2">
                <Input
                  id="filename"
                  value={downloadFilename}
                  onChange={(e) => setDownloadFilename(e.target.value)}
                  placeholder="encoded-image"
                  className="flex-1"
                />
                <span className="flex items-center text-gray-500 dark:text-gray-400">.png</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDownloadEncoded} disabled={!downloadFilename.trim()}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Instructions */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            How to Use
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Encoding (Hide Data)
              </h3>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>1. Select a PNG carrier image</li>
                <li>2. Enter a text message OR attach a file/image to hide</li>
                <li>3. Optionally add a password for encryption</li>
                <li>4. Click "Encode & Download"</li>
                <li>5. Name your file and download the encoded image</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Decoding (Reveal Data)
              </h3>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>1. Select the encoded PNG image</li>
                <li>2. Enter the password if it was encrypted</li>
                <li>3. Click "Decode Message"</li>
                <li>4. The hidden message or file will appear below</li>
                <li>5. Download the file if a file was hidden</li>
              </ol>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
